/**
 * Python Stage Execution Utility
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function buildPythonErrorMessage(code, stderr, stdout) {
  const stderrText = (stderr || '').trim();
  const stdoutText = (stdout || '').trim();

  if (stderrText) {
    return `Python exited with code ${code}: ${stderrText}`;
  }

  if (stdoutText) {
    return `Python exited with code ${code}: ${stdoutText}`;
  }

  return `Python exited with code ${code} without error details`;
}

/**
 * Execute a Python stage script
 * Returns a promise with the result
 */
function runPythonStage(stageName, args, timeout = 300000) {
  return new Promise((resolve, reject) => {
    const defaultPythonDir = path.resolve(__dirname, '..');
    const configuredPythonDir = process.env.PYTHON_STAGE_DIR
      ? path.resolve(process.env.PYTHON_STAGE_DIR)
      : defaultPythonDir;
    const configuredScriptPath = path.join(configuredPythonDir, stageName);
    const fallbackScriptPath = path.join(defaultPythonDir, stageName);
    const scriptPath = fs.existsSync(configuredScriptPath)
      ? configuredScriptPath
      : fallbackScriptPath;
    const platformCandidates = process.platform === 'win32'
      ? [
          { bin: 'python', prefixArgs: [] },
          { bin: 'py', prefixArgs: ['-3'] }
        ]
      : [
          { bin: 'python3', prefixArgs: [] },
          { bin: 'python', prefixArgs: [] }
        ];

    const pythonCandidates = [];
    if (process.env.PYTHON_BIN) {
      pythonCandidates.push({ bin: process.env.PYTHON_BIN, prefixArgs: [] });
    }

    for (const candidate of platformCandidates) {
      if (!pythonCandidates.some((existing) => existing.bin === candidate.bin)) {
        pythonCandidates.push(candidate);
      }
    }

    if (!fs.existsSync(scriptPath)) {
      return reject({
        error: `Python stage script not found. Checked: ${configuredScriptPath}, ${fallbackScriptPath}`
      });
    }

    const startTime = Date.now();

    const runWithCandidate = (candidateIndex) => {
      const candidate = pythonCandidates[candidateIndex];
      if (!candidate) {
        return reject({
          error: 'Failed to spawn Python process',
          message: `No Python interpreter available. Tried: ${pythonCandidates.map((item) => item.bin).join(', ')}`
        });
      }

      const py = spawn(candidate.bin, [...candidate.prefixArgs, scriptPath, JSON.stringify(args)], {
        env: {
          ...process.env,
          ...(process.env.TESSERACT_CMD ? { TESSERACT_CMD: process.env.TESSERACT_CMD } : {})
        }
      });

      let stdout = '';
      let stderr = '';
      let spawnErrorHandled = false;

      // Set timeout
      const timer = setTimeout(() => {
        py.kill();
        reject(new Error(`Python script timeout after ${timeout}ms`));
      }, timeout);

      py.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      py.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      py.on('close', (code) => {
        clearTimeout(timer);

        if (spawnErrorHandled) {
          return;
        }

        const executionTime = Date.now() - startTime;

        if (code !== 0) {
          const message = buildPythonErrorMessage(code, stderr, stdout);

          return reject({
            error: message,
            stderr,
            stdout,
            executionTime
          });
        }

        try {
          const result = JSON.parse(stdout);
          result.executionTime = executionTime;
          resolve(result);
        } catch (e) {
          reject({
            error: 'Failed to parse Python output',
            output: stdout,
            stderr,
            executionTime
          });
        }
      });

      py.on('error', (err) => {
        clearTimeout(timer);

        if (err.code === 'ENOENT') {
          spawnErrorHandled = true;
          return runWithCandidate(candidateIndex + 1);
        }

        reject({
          error: 'Failed to spawn Python process',
          message: `${candidate.bin}: ${err.message}`
        });
      });
    };

    runWithCandidate(0);
  });
}

/**
 * Run Stage 3: Master Template Consolidation
 */
async function runStage3(templatePath, cat1Path, cat2Path, ass1Path, ass2Path, outputPath, phase) {
  if (typeof templatePath === 'object' && templatePath !== null) {
    const options = templatePath;
    return runPythonStage('stage3_consolidate.py', {
      phase: options.phase,
      template_path: options.templatePath ?? options.template_path,
      cat1_path: options.cat1Path ?? options.cat1_path,
      cat2_path: options.cat2Path ?? options.cat2_path,
      ass1_path: options.ass1Path ?? options.ass1_path,
      ass2_path: options.ass2Path ?? options.ass2_path,
      output_path: options.outputPath ?? options.output_path,
    });
  }

  return runPythonStage('stage3_consolidate.py', {
    phase,
    template_path: templatePath,
    cat1_path: cat1Path,
    cat2_path: cat2Path,
    ass1_path: ass1Path,
    ass2_path: ass2Path,
    output_path: outputPath
  });
}

/**
 * Run Stage 4: Final CO Attainment Calculation
 */
async function runStage4(coAttainmentPath, terminalPath, outputPath, ep, constraint, ela, phase) {
  if (typeof coAttainmentPath === 'object' && coAttainmentPath !== null) {
    const options = coAttainmentPath;
    return runPythonStage('stage4_attainment.py', {
      phase: options.phase,
      co_attainment_path: options.coAttainmentPath ?? options.co_attainment_path,
      terminal_path: options.terminalPath ?? options.terminal_path,
      output_path: options.outputPath ?? options.output_path,
      ep: parseFloat(options.ep),
      constraint: parseFloat(options.constraint),
      ela: options.ela,
      terminal_percentage: options.terminalPercentage
    });
  }

  return runPythonStage('stage4_attainment.py', {
    phase,
    co_attainment_path: coAttainmentPath,
    terminal_path: terminalPath,
    output_path: outputPath,
    ep: parseFloat(ep),
    constraint: parseFloat(constraint),
    ela,
    terminal_percentage: phase === 'end' && arguments[7] ? parseFloat(arguments[7]) : null
  });
}

module.exports = {
  runPythonStage,
  runStage3,
  runStage4
};
