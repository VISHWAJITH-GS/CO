/**
 * Unified Processing Routes
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { Op } = require('sequelize');

const { Subject, File, Configuration, ProcessingLog, FacultyCourseAssignment, Report } = require('../models');
const { runStage3, runStage4, runPythonStage } = require('../utils/pythonExecutor');
const { fileExists } = require('../utils/fileManager');
const { logActivity } = require('../utils/activityLogger');
const { updateSubjectPhase } = require('../utils/phaseTracker');

function resolveOutputsDir() {
  const configured = process.env.OUTPUTS_DIR || 'outputs';
  return path.isAbsolute(configured) ? configured : path.resolve(__dirname, '..', configured);
}

async function checkCourseAssignment(userId, role, subjectId) {
  let isAssigned = false;
  if (role === 'admin') {
    isAssigned = true;
  } else {
    const assignment = await FacultyCourseAssignment.findOne({
      where: { faculty_id: userId, course_id: subjectId }
    });
    isAssigned = !!assignment;
  }
  if (!isAssigned) {
    throw new Error('Forbidden');
  }
  const subject = await Subject.findByPk(subjectId);
  if (!subject) {
    throw new Error('NotFound');
  }
  return subject;
}

const getFile = async (subject_id, file_type) => {
  return await File.findOne({
    where: { subject_id, file_type },
    order: [['created_at', 'DESC'], ['id', 'DESC']]
  });
};

router.post('/early-sem', async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { subject_id } = req.body;
    const userId = req.user.id;
    let subject = await checkCourseAssignment(userId, req.user.role, subject_id);

    const cat1 = await getFile(subject_id, 'CAT1_MARKS');
    const ass1 = await getFile(subject_id, 'ASS1');

    if (!cat1 || !ass1 || !fileExists(cat1.file_path) || !fileExists(ass1.file_path)) {
      return res.status(400).json({ error: 'CAT1 and ASS1 files required and must exist' });
    }

    const log = await ProcessingLog.create({
      subject_id, stage_number: 3, status: 'started',
      input_files: JSON.stringify([cat1.file_path, ass1.file_path])
    });

    const outputsDir = resolveOutputsDir();
    const stage3Path = path.join(outputsDir, `EARLY_SEM_STAGE3_${subject_id}_${Date.now()}.xlsx`);
    const reportPath = path.join(outputsDir, `EARLY_SEM_REPORT_${subject_id}_${Date.now()}.xlsx`);

    const stage3Result = await runStage3({
      phase: 'early',
      cat1Path: cat1.file_path,
      ass1Path: ass1.file_path,
      outputPath: stage3Path
    });

    if (stage3Result.status !== 'ok') throw new Error(stage3Result.message);

    const config = await Configuration.findOne({ where: { subject_id } });
    const ela = {
      CO1: config?.ela_co1 !== undefined && config?.ela_co1 !== null ? parseFloat(config.ela_co1) : 75,
      CO2: config?.ela_co2 !== undefined && config?.ela_co2 !== null ? parseFloat(config.ela_co2) : 75,
      CO3: config?.ela_co3 !== undefined && config?.ela_co3 !== null ? parseFloat(config.ela_co3) : 70,
      CO4: config?.ela_co4 !== undefined && config?.ela_co4 !== null ? parseFloat(config.ela_co4) : 85,
      CO5: config?.ela_co5 !== undefined && config?.ela_co5 !== null ? parseFloat(config.ela_co5) : 80,
      CO6: config?.ela_co6 !== undefined && config?.ela_co6 !== null ? parseFloat(config.ela_co6) : 78
    };

    const stage4Result = await runStage4({
      phase: 'early',
      coAttainmentPath: stage3Path,
      outputPath: reportPath,
      ep: config?.ep !== undefined && config?.ep !== null ? parseFloat(config.ep) : 80,
      constraint: config?.constraint_value !== undefined && config?.constraint_value !== null ? parseFloat(config.constraint_value) : 79.99,
      ela
    });

    if (stage4Result.status !== 'ok') throw new Error(stage4Result.message);

    await Report.create({
      faculty_id: userId, course_id: subject_id,
      report_file_path: reportPath, report_name: `${subject.subject_code}_EARLY_SEM_REPORT`,
      status: 'Generated', generated_at: new Date()
    });

    await updateSubjectPhase(subject_id, 1);
    await log.update({ status: 'completed', output_file: reportPath, execution_time_ms: Date.now() - startTime, completed_at: new Date() });

    res.json({ status: 'success', output_path: reportPath });
  } catch (err) {
    next(err);
  }
});

router.post('/mid-sem', async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { subject_id } = req.body;
    const userId = req.user.id;
    let subject = await checkCourseAssignment(userId, req.user.role, subject_id);

    const cat2 = await getFile(subject_id, 'CAT2_MARKS');
    const ass2 = await getFile(subject_id, 'ASS2');

    // Need previous early-sem report as template for mid-sem
    const previousReport = await Report.findOne({
      where: { course_id: subject_id, report_name: { [Op.like]: '%EARLY_SEM_REPORT%' } },
      order: [['generated_at', 'DESC']]
    });

    if (!cat2 || !ass2 || !previousReport || !fileExists(cat2.file_path) || !fileExists(ass2.file_path) || !fileExists(previousReport.report_file_path)) {
      return res.status(400).json({ error: 'CAT2, ASS2, and early sem report required' });
    }

    const log = await ProcessingLog.create({
      subject_id, stage_number: 3, status: 'started',
      input_files: JSON.stringify([cat2.file_path, ass2.file_path, previousReport.report_file_path])
    });

    const outputsDir = resolveOutputsDir();
    const stage3Path = path.join(outputsDir, `MID_SEM_STAGE3_${subject_id}_${Date.now()}.xlsx`);
    const reportPath = path.join(outputsDir, `MID_SEM_REPORT_${subject_id}_${Date.now()}.xlsx`);

    const stage3Result = await runStage3({
      phase: 'mid',
      templatePath: previousReport.report_file_path,
      cat2Path: cat2.file_path,
      ass2Path: ass2.file_path,
      outputPath: stage3Path
    });

    if (stage3Result.status !== 'ok') throw new Error(stage3Result.message);

    const config = await Configuration.findOne({ where: { subject_id } });
    const ela = {
      CO1: config?.ela_co1 !== undefined && config?.ela_co1 !== null ? parseFloat(config.ela_co1) : 75,
      CO2: config?.ela_co2 !== undefined && config?.ela_co2 !== null ? parseFloat(config.ela_co2) : 75,
      CO3: config?.ela_co3 !== undefined && config?.ela_co3 !== null ? parseFloat(config.ela_co3) : 70,
      CO4: config?.ela_co4 !== undefined && config?.ela_co4 !== null ? parseFloat(config.ela_co4) : 85,
      CO5: config?.ela_co5 !== undefined && config?.ela_co5 !== null ? parseFloat(config.ela_co5) : 80,
      CO6: config?.ela_co6 !== undefined && config?.ela_co6 !== null ? parseFloat(config.ela_co6) : 78
    };

    const stage4Result = await runStage4({
      phase: 'mid',
      coAttainmentPath: stage3Path,
      outputPath: reportPath,
      ep: config?.ep !== undefined && config?.ep !== null ? parseFloat(config.ep) : 80,
      constraint: config?.constraint_value !== undefined && config?.constraint_value !== null ? parseFloat(config.constraint_value) : 79.99,
      ela
    });

    if (stage4Result.status !== 'ok') throw new Error(stage4Result.message);

    await Report.create({
      faculty_id: userId, course_id: subject_id,
      report_file_path: reportPath, report_name: `${subject.subject_code}_MID_SEM_REPORT`,
      status: 'Generated', generated_at: new Date()
    });

    await updateSubjectPhase(subject_id, 2);
    await log.update({ status: 'completed', output_file: reportPath, execution_time_ms: Date.now() - startTime, completed_at: new Date() });

    res.json({ status: 'success', output_path: reportPath });
  } catch (err) {
    next(err);
  }
});

router.post('/terminal-preview', async (req, res, next) => {
  try {
    const { subject_id } = req.body;
    const userId = req.user.id;
    let subject = await checkCourseAssignment(userId, req.user.role, subject_id);

    const terminal = await getFile(subject_id, 'TERMINAL');
    if (!terminal || !fileExists(terminal.file_path)) {
      return res.status(400).json({ error: 'Terminal marks file required' });
    }

    const previewResult = await runPythonStage('terminal_preview.py', {
      file_path: terminal.file_path,
      subject_code: subject.subject_code
    });

    if (previewResult.status !== 'ok') {
      throw new Error(previewResult.message || 'Failed to generate preview');
    }

    res.json({ status: 'success', data: previewResult });
  } catch (err) {
    next(err);
  }
});

router.post('/terminal', async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { subject_id, selected_percentage } = req.body;
    const userId = req.user.id;
    let subject = await checkCourseAssignment(userId, req.user.role, subject_id);

    const terminal = await getFile(subject_id, 'TERMINAL');
    const previousReport = await Report.findOne({
      where: { course_id: subject_id, report_name: { [Op.like]: '%MID_SEM_REPORT%' } },
      order: [['generated_at', 'DESC']]
    });

    if (!terminal || !previousReport || !fileExists(terminal.file_path) || !fileExists(previousReport.report_file_path)) {
      return res.status(400).json({ error: 'Terminal marks and mid sem report required' });
    }

    const log = await ProcessingLog.create({
      subject_id, stage_number: 4, status: 'started',
      input_files: JSON.stringify([terminal.file_path, previousReport.report_file_path])
    });

    const outputsDir = resolveOutputsDir();
    const stage3Path = path.join(outputsDir, `TERMINAL_STAGE3_${subject_id}_${Date.now()}.xlsx`);
    const reportPath = path.join(outputsDir, `TERMINAL_REPORT_${subject_id}_${Date.now()}.xlsx`);

    const stage3Result = await runStage3({
      phase: 'terminal',
      templatePath: previousReport.report_file_path,
      outputPath: stage3Path
    });

    if (stage3Result.status !== 'ok') throw new Error(stage3Result.message);

    const config = await Configuration.findOne({ where: { subject_id } });
    const ela = {
      CO1: config?.ela_co1 !== undefined && config?.ela_co1 !== null ? parseFloat(config.ela_co1) : 75,
      CO2: config?.ela_co2 !== undefined && config?.ela_co2 !== null ? parseFloat(config.ela_co2) : 75,
      CO3: config?.ela_co3 !== undefined && config?.ela_co3 !== null ? parseFloat(config.ela_co3) : 70,
      CO4: config?.ela_co4 !== undefined && config?.ela_co4 !== null ? parseFloat(config.ela_co4) : 85,
      CO5: config?.ela_co5 !== undefined && config?.ela_co5 !== null ? parseFloat(config.ela_co5) : 80,
      CO6: config?.ela_co6 !== undefined && config?.ela_co6 !== null ? parseFloat(config.ela_co6) : 78
    };

    const stage4Result = await runStage4({
      phase: 'end',
      coAttainmentPath: stage3Path,
      terminalPath: terminal.file_path,
      outputPath: reportPath,
      ep: config?.ep !== undefined && config?.ep !== null ? parseFloat(config.ep) : 80,
      constraint: config?.constraint_value !== undefined && config?.constraint_value !== null ? parseFloat(config.constraint_value) : 79.99,
      ela,
      terminalPercentage: selected_percentage ? parseFloat(selected_percentage) : null
    });

    if (stage4Result.status !== 'ok') throw new Error(stage4Result.message);

    await Report.create({
      faculty_id: userId, course_id: subject_id,
      report_file_path: reportPath, report_name: `${subject.subject_code}_TERMINAL_REPORT`,
      status: 'Generated', generated_at: new Date()
    });

    await updateSubjectPhase(subject_id, 3);
    await log.update({ status: 'completed', output_file: reportPath, execution_time_ms: Date.now() - startTime, completed_at: new Date() });

    res.json({ status: 'success', output_path: reportPath });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
