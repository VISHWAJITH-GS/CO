const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

function getLibreOfficeCommand() {
  if (process.platform === 'win32') {
    // Typical Windows installation path for LibreOffice
    const winPath = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
    if (fs.existsSync(winPath)) {
      return `"${winPath}"`;
    }
    return 'soffice'; // Fallback if in PATH
  }
  return 'libreoffice'; // Default on Linux/Mac
}

async function recalculateExcelFormulas(filePath) {
  return new Promise((resolve, reject) => {
    const cmd = getLibreOfficeCommand();
    const outDir = path.dirname(filePath);
    const fileName = path.basename(filePath);
    
    // Create a temporary directory to avoid conflicts
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'excel-recalc-'));
    
    // LibreOffice command to convert to xlsx, which implicitly recalculates formulas
    const command = `${cmd} --headless --convert-to xlsx --outdir "${tmpDir}" "${filePath}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        
        // Provide a clearer error if LibreOffice is not installed
        const isMissingCommand = error.message.includes('not recognized as an internal or external command') || error.message.includes('ENOENT') || error.message.includes('command not found');
        
        if (isMissingCommand) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('LibreOffice is not installed locally. Bypassing Excel recalculation for local development. Open the file in Excel to calculate formulas.');
            return resolve(filePath);
          }
          return reject(new Error('LibreOffice is required but not installed or not found in PATH. Server-side Excel recalculation cannot proceed.'));
        }
        
        console.error(`LibreOffice recalculation failed: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        return reject(new Error('LibreOffice recalculation failed: ' + error.message));
      }
      
      const newFilePath = path.join(tmpDir, fileName);
      if (fs.existsSync(newFilePath)) {
        // Overwrite the original file with the recalculated one
        fs.copyFileSync(newFilePath, filePath);
        fs.rmSync(tmpDir, { recursive: true, force: true });
        resolve(filePath);
      } else {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        reject(new Error('LibreOffice failed to generate the recalculated file.'));
      }
    });
  });
}

module.exports = { recalculateExcelFormulas };
