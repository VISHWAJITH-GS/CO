import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import StageUploadCard from "../components/layout/StageUploadCard";
import ParameterSection from "../components/layout/ParameterSection";
import { pageVariants, containerVariants, sectionVariants } from "../lib/animations";
import {
  ensureSubject,
  downloadReportFileByOutputId,
  clearReportProcess,
  getConfiguration,
  getSubjectReports,
  getSubjectStatus,
  getSubjects,
  processPhase1,
  processPhase2,
  processPhase3,
  previewTerminal,
  saveConfiguration,
} from "../lib/api";

const subjectCatalog = {
  CS301: { name: "Database Management Systems", semester: "Semester V" },
  CS302: { name: "Design and Analysis of Algorithms", semester: "Semester V" },
  CS401: { name: "Machine Learning", semester: "Semester VII" },
  CS403: { name: "Compiler Design", semester: "Semester VII" },
  IT305: { name: "Software Engineering", semester: "Semester V" },
  IT407: { name: "Cloud Computing", semester: "Semester VII" },
};

const workflowSteps = [
  { id: 1, label: "Early-sem" },
  { id: 2, label: "Mid-sem" },
  { id: 3, label: "End-sem" },
];

const stageFiles = {
  1: ["CAT1_MARKS", "ASS1"],
  2: ["CAT2_MARKS", "ASS2"],
  3: ["TERMINAL"],
};

export default function SubjectWorkspace({ user }) {
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [parameters, setParameters] = useState({});
  const [step, setStep] = useState(1);
  const [saveMessage, setSaveMessage] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState(null);
  
  const [generatingStage, setGeneratingStage] = useState("");
  const [clearingProcess, setClearingProcess] = useState(false);

  const [terminalPreviewData, setTerminalPreviewData] = useState(null);
  const [selectedPercentage, setSelectedPercentage] = useState(null);
  const [previewingTerminal, setPreviewingTerminal] = useState(false);

  const messageRef = useCallback((node) => {
    if (node !== null) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const { subjectCode } = useParams();
  const resolvedSubjectCode = subjectCode || "SUBJECT";
  const details =
    subjects.find((subject) => subject.code === resolvedSubjectCode) ||
    subjectCatalog[resolvedSubjectCode] || {
      name: "Subject Name",
      semester: "Semester",
    };

  const earlyReady = stageFiles[1].every((key) => uploadedFiles[key]);
  const midReady = stageFiles[2].every((key) => uploadedFiles[key]);
  const endReady = stageFiles[3].every((key) => uploadedFiles[key]);

  function getActiveStage(files = {}) {
    const earlyComplete = stageFiles[1].every((key) => files[key]);
    const midComplete = stageFiles[2].every((key) => files[key]);
    if (!earlyComplete) return 1;
    if (!midComplete) return 2;
    return 3;
  }

  const activeStage = getActiveStage(uploadedFiles);

  async function downloadLatestReportByType(outputType, fallbackName) {
    const reports = await getSubjectReports(subjectId);
    const target = reports.find((report) => report.type === outputType);

    if (!target?.id) {
      throw new Error(`No ${fallbackName} is available for download yet.`);
    }

    const { blob } = await downloadReportFileByOutputId(target.id, outputType);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${resolvedSubjectCode}_${fallbackName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleGenerateStage(stageName) {
    if (!subjectId) return;
    setGeneratingStage(stageName);
    setSaveMessage("");

    try {
      if (stageName === "Early-sem") {
        await processPhase1(subjectId);
        await downloadLatestReportByType("EARLY_SEM_REPORT", "EARLY_SEM_FEEDBACK");
        setSaveMessage("Early-sem feedback generated and downloaded.");
        setStep(Math.max(step, 2));
      } else if (stageName === "Mid-sem") {
        await processPhase2(subjectId);
        await downloadLatestReportByType("MID_SEM_REPORT", "MID_SEM_REPORT");
        setSaveMessage("Mid-sem report generated and downloaded.");
        setStep(Math.max(step, 3));
      } else if (stageName === "Final") {
        if (!selectedPercentage) throw new Error("Please select an End Sem percentage (B/A/S) before generating.");
        await processPhase3(subjectId, selectedPercentage);
        await downloadLatestReportByType("CO_ATTAINMENT_COMPLETE", "END_SEM_REPORT");
        setSaveMessage("End-sem final report generated and downloaded.");
        setStep(4);
      }
    } catch (error) {
      setSaveMessage(error.message || `Failed to generate ${stageName} report.`);
    } finally {
      setGeneratingStage("");
    }
  }

  async function handlePreviewTerminal() {
    if (!subjectId) return;
    setPreviewingTerminal(true);
    setSaveMessage("");
    try {
      const result = await previewTerminal(subjectId);
      setTerminalPreviewData(result.data);
    } catch (error) {
      setSaveMessage(error.message || "Failed to preview terminal file.");
    } finally {
      setPreviewingTerminal(false);
    }
  }

  async function handleClearProcess() {
    if (!subjectId) return;
    const confirmed = window.confirm(
      "Are you sure you want to clear the process for this subject? This will remove uploaded files, saved parameters, and generated outputs."
    );
    if (!confirmed) return;

    setClearingProcess(true);
    setSaveMessage("");

    try {
      await clearReportProcess(subjectId);
      setUploadedFiles({});
      setParameters({});
      setStep(1);
      setSaveMessage("Process cleared successfully.");
    } catch (error) {
      setSaveMessage(error.message || "Failed to clear the process.");
    } finally {
      setClearingProcess(false);
    }
  }

  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => {
        setSaveMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  useEffect(() => {
    async function loadSubjects() {
      try {
        const data = await getSubjects();
        setSubjects(data || []);
      } catch {
        setSubjects([]);
      }
    }
    loadSubjects();
  }, []);

  useEffect(() => {
    async function bootstrapSubjectWorkspace() {
      if (!subjectCode) return;
      try {
        const subject = await ensureSubject(subjectCode);
        setSubjectId(subject.id);

        const status = await getSubjectStatus(subject.id);
        const nextUploaded = {
          CAT1_QP: status.files?.some((f) => f.file_type === "CAT1_QP") || false,
          CAT1_MARKS: status.files?.some((f) => f.file_type === "CAT1_MARKS") || false,
          CAT2_QP: status.files?.some((f) => f.file_type === "CAT2_QP") || false,
          CAT2_MARKS: status.files?.some((f) => f.file_type === "CAT2_MARKS") || false,
          ASS1: status.files?.some((f) => f.file_type === "ASS1") || false,
          ASS2: status.files?.some((f) => f.file_type === "ASS2") || false,
          TERMINAL_QP: status.files?.some((f) => f.file_type === "TERMINAL_QP") || false,
          TERMINAL: status.files?.some((f) => f.file_type === "TERMINAL") || false,
        };
        setUploadedFiles(nextUploaded);

        let restoredStep = 1;
        if (status.current_phase >= 3) restoredStep = 4;
        else if (status.current_phase >= 2) restoredStep = 3;
        else if (status.current_phase >= 1) restoredStep = 2;

        try {
          const config = await getConfiguration(subject.id);
          setParameters({
            ep: String(config.ep ?? ""),
            constraint: String(config.constraint ?? ""),
            ela: {
              CO1: String(config?.ela?.CO1 ?? ""),
              CO2: String(config?.ela?.CO2 ?? ""),
              CO3: String(config?.ela?.CO3 ?? ""),
              CO4: String(config?.ela?.CO4 ?? ""),
              CO5: String(config?.ela?.CO5 ?? ""),
              CO6: String(config?.ela?.CO6 ?? ""),
            },
          });
        } catch {}

        setStep(restoredStep);
      } catch {
        setSaveMessage("Unable to load workspace state.");
      }
    }
    bootstrapSubjectWorkspace();
  }, [subjectCode]);

  const handleUploadChange = (files) => {
    setUploadedFiles(files);
  };

  return (
    <motion.div className="space-y-6 p-4 md:p-6" variants={pageVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="flex flex-wrap items-center justify-between gap-3" variants={sectionVariants}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Subject Workspace</p>
          <h1 className="mt-1 text-2xl font-semibold text-red-950">{resolvedSubjectCode} - {details.name}</h1>
          <p className="mt-1 text-sm font-medium text-slate-600">{details.semester}</p>
          <p className="mt-2 text-sm text-slate-600">
            Manage Early-sem, Mid-sem, and End-sem files, configure CO parameters, and download stage reports.
          </p>
        </div>
      </motion.div>

      <motion.div className="rounded-xl border border-red-100 bg-white p-3 shadow-[0_8px_20px_-20px_rgba(127,29,29,0.65)]" variants={sectionVariants}>
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {workflowSteps.map((item) => {
            const isActive = activeStage === item.id;
            const isCompleted = activeStage > item.id;
            return (
              <motion.li
                key={item.id}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors duration-300 ${
                  isCompleted ? "border-red-200 bg-red-100/70 text-red-900" : isActive ? "border-red-300 bg-white text-red-800 shadow-sm" : "border-slate-200 bg-white/70 text-slate-500"
                }`}
                layout
                transition={{ duration: 0.25 }}
              >
                <motion.span
                  className={`step-badge grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                    isCompleted || isActive ? "bg-red-700 text-white active" : "bg-slate-200 text-slate-600"
                  }`}
                  animate={{ scale: isActive ? 1.1 : 1, backgroundColor: isCompleted || isActive ? "#b91c1c" : "#e2e8f0" }}
                  transition={{ duration: 0.3 }}
                >
                  {isCompleted ? <Check size={14} strokeWidth={3} /> : item.id}
                </motion.span>
                <span className="font-medium leading-tight">{item.label}</span>
                {isActive && (
                  <motion.span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
                )}
              </motion.li>
            );
          })}
        </ol>
      </motion.div>

      <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
        
        <AnimatePresence>
          {saveMessage && (
            <motion.div
              ref={messageRef}
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 mb-2 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm font-medium shadow-[0_2px_10px_-4px_rgba(127,29,29,0.2)] flex items-center gap-2">
                <Check size={16} className="text-red-700" />
                {saveMessage}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Early Sem Group */}
        <StageUploadCard
          title="Early-sem"
          fields={[
            { key: "CAT1_MARKS", label: "CAT 1 Marksheet (.xlsx)" },
            { key: "ASS1", label: "Assignment 1 Marksheet (.xlsx)" }
          ]}
          uploadedFiles={uploadedFiles}
          onUploadChange={handleUploadChange}
          subjectId={subjectId}
          subjectCode={resolvedSubjectCode}
          user={user}
          isCompleted={earlyReady}
          onGenerate={() => handleGenerateStage("Early-sem")}
          generateLabel="Generate Early-sem Report"
          canGenerate={earlyReady && !!subjectId}
          isGenerating={generatingStage === "Early-sem"}
        />

        {/* Mid Sem Group */}
        <StageUploadCard
          title="Mid-sem"
          fields={[
            { key: "CAT2_MARKS", label: "CAT 2 Marksheet (.xlsx)" },
            { key: "ASS2", label: "Assignment 2 Marksheet (.xlsx)" }
          ]}
          uploadedFiles={uploadedFiles}
          onUploadChange={handleUploadChange}
          subjectId={subjectId}
          subjectCode={resolvedSubjectCode}
          user={user}
          isCompleted={midReady}
          onGenerate={() => handleGenerateStage("Mid-sem")}
          generateLabel="Generate Mid-sem Report"
          canGenerate={earlyReady && midReady && !!subjectId}
          isGenerating={generatingStage === "Mid-sem"}
        />

        {/* End Sem Group */}
        <StageUploadCard
          title="End-sem & Parameters"
          fields={[
            { key: "TERMINAL", label: "Terminal Marksheet (.xls)" }
          ]}
          uploadedFiles={uploadedFiles}
          onUploadChange={handleUploadChange}
          subjectId={subjectId}
          subjectCode={resolvedSubjectCode}
          user={user}
          isCompleted={endReady && step >= 3 && !!selectedPercentage}
          onGenerate={() => handleGenerateStage("Final")}
          generateLabel="Generate Final Report"
          canGenerate={earlyReady && midReady && endReady && step >= 3 && !!subjectId && !!selectedPercentage}
          isGenerating={generatingStage === "Final"}
        >
          {/* Parameter Section directly embedded in End-Sem group */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <ParameterSection
              isOpen={true}
              completed={step > 2}
              initialValues={parameters}
              onToggle={() => {}} // Always open since it's embedded
              canGenerateFinal={false} // Generation handled by StageUploadCard now
              isGeneratingFinal={false}
              hideGenerateButton={true} // New prop needed or just remove generation from ParameterSection
              onComplete={(values) => {
                if (!subjectId) {
                  setSaveMessage("Subject is not ready yet.");
                  return;
                }
                setParameters(values);
                setStep(3);
                saveConfiguration(subjectId, {
                  ep: values.ep,
                  constraint: values.constraint,
                  ela: values.ela,
                }).then(() => setSaveMessage("Parameters saved.")).catch(err => setSaveMessage(err.message));
              }}
            />
          </div>

          {endReady && step >= 3 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">End Sem Performance</h3>
              {!terminalPreviewData ? (
                <button
                  type="button"
                  onClick={handlePreviewTerminal}
                  disabled={previewingTerminal}
                  className="btn-press rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {previewingTerminal ? "Processing..." : "Process Terminal File"}
                </button>
              ) : (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-slate-600 mb-2">Grade Distribution</h4>
                    <div className="grid grid-cols-4 gap-4 sm:grid-cols-8">
                      {["O", "A+", "A", "B+", "B", "C", "U"].map((g) => (
                        <div key={g} className="text-center">
                          <div className="text-xs text-slate-500 font-semibold">{g}</div>
                          <div className="text-lg font-bold text-slate-800">{terminalPreviewData.grades[g] || 0}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-sm text-slate-600 font-medium">
                      Total Registered: <span className="font-bold text-slate-800">{terminalPreviewData.total_registered}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-slate-600 mb-3">Select Attainment Percentage</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {["B", "A", "S"].map((type) => {
                        const val = terminalPreviewData.percentages[type];
                        const isSelected = selectedPercentage === val;
                        return (
                          <div
                            key={type}
                            onClick={() => setSelectedPercentage(val)}
                            className={`cursor-pointer rounded-lg border p-4 transition-all ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600 shadow-sm"
                                : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm"
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className={`font-semibold ${isSelected ? "text-indigo-700" : "text-slate-700"}`}>
                                Percentage {type}
                              </span>
                              {isSelected && <Check className="w-5 h-5 text-indigo-600" />}
                            </div>
                            <div className={`text-2xl font-bold ${isSelected ? "text-indigo-700" : "text-slate-900"}`}>
                              {val.toFixed(2)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </StageUploadCard>

        <div>
          <button
            type="button"
            className="btn-press inline-flex items-center gap-2 rounded-md bg-red-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 disabled:opacity-50"
            onClick={handleClearProcess}
            disabled={clearingProcess || generatingStage !== ""}
          >
            {clearingProcess ? "Clearing..." : "Clear the process"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
