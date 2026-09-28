import { CheckCircle2, CloudUpload, FileSpreadsheet, Loader2, Sparkles } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { uploadWorkspaceFile } from "../../lib/api";
import { cardVariants } from "../../lib/animations";

/** Map file keys → icon + accent colour */
function getFileStyle(key) {
  if (key.includes("MARKS") || key.includes("ASS") || key === "TERMINAL") {
    return { Icon: FileSpreadsheet, accent: "text-red-700", bg: "bg-red-50" };
  }
  return { Icon: CloudUpload, accent: "text-red-600", bg: "bg-red-50" };
}

export default function StageUploadCard({
  title,
  fields,
  uploadedFiles = {},
  onUploadChange,
  subjectId,
  subjectCode,
  user,
  onGenerate,
  generateLabel,
  isGenerating,
  canGenerate,
  isCompleted,
  children,
}) {
  const [uploadingKey, setUploadingKey] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [dragOverKey, setDragOverKey] = useState("");
  const inputRefs = useRef({});

  const uploadedCount = fields.filter((f) => uploadedFiles[f.key]).length;
  const progressPct = fields.length ? Math.round((uploadedCount / fields.length) * 100) : 0;

  const handleUpload = async (key, file) => {
    if (!file) return;
    if (!subjectId || !subjectCode || !user?.email) {
      setUploadError("Subject context is not ready. Please refresh and try again.");
      return;
    }

    setUploadingKey(key);
    setUploadMessage("");
    setUploadError("");

    try {
      const response = await uploadWorkspaceFile(subjectId, subjectCode, key, file);
      const nextFiles = { ...uploadedFiles, [key]: true };
      onUploadChange?.(nextFiles);
      setUploadMessage(response.message || `${key} uploaded successfully.`);
    } catch (error) {
      setUploadError(error.message || "Upload failed.");
    } finally {
      setUploadingKey(false);
      setUploadingKey("");
    }
  };

  useEffect(() => {
    if (uploadMessage || uploadError) {
      const timer = setTimeout(() => {
        setUploadMessage("");
        setUploadError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [uploadMessage, uploadError]);

  const handleDrop = (key, e) => {
    e.preventDefault();
    setDragOverKey("");
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(key, file);
  };

  return (
    <motion.div variants={cardVariants}>
      <Card className="border-slate-100 shadow-[0_8px_32px_-16px_rgba(15,23,42,0.12)] overflow-hidden">

        {/* ── Header ── */}
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="flex items-center gap-2.5 text-red-950 text-lg">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-700">
                <CloudUpload size={16} />
              </span>
              {title}
              <AnimatePresence>
                {isCompleted && (
                  <motion.span
                    className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-700"
                    initial={{ opacity: 0, scale: 0.7, x: -4 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  >
                    <CheckCircle2 size={11} />
                    All set
                  </motion.span>
                )}
              </AnimatePresence>
            </CardTitle>

            {/* Progress pill */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                {uploadedCount}/{fields.length} uploaded
              </span>
              <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${isCompleted ? "bg-red-700" : "bg-red-500"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">

          {/* ── Upload rows ── */}
          <div className="space-y-2.5">
            {fields.map((item, idx) => {
              const isDone = !!uploadedFiles[item.key];
              const isUploading = uploadingKey === item.key;
              const isDragOver = dragOverKey === item.key;
              const { Icon, accent, bg } = getFileStyle(item.key);

              return (
                <motion.div
                  key={item.key}
                  className={`upload-row relative flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer group
                    ${isDone
                      ? "border-red-200 bg-red-50/60"
                      : isDragOver
                        ? "border-red-400 bg-red-50/60 scale-[1.01]"
                        : "border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/30"
                    }`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.3, ease: "easeOut" }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverKey(item.key); }}
                  onDragLeave={() => setDragOverKey("")}
                  onDrop={(e) => handleDrop(item.key, e)}
                  onClick={() => !isUploading && inputRefs.current[item.key]?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && inputRefs.current[item.key]?.click()}
                  aria-label={`Upload ${item.label}`}
                >
                  {/* Icon badge */}
                  <span className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg ${isDone ? "bg-red-100" : bg} transition-colors duration-200`}>
                    {isUploading
                      ? <Loader2 size={16} className="spinner text-blue-500" />
                      : isDone
                        ? <CheckCircle2 size={16} className="text-red-700" />
                        : <Icon size={16} className={accent} />
                    }
                  </span>

                  {/* Label + sublabel */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-tight truncate ${isDone ? "text-red-900" : "text-slate-700"}`}>
                      {item.label}
                    </p>
                    <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                      {isUploading
                        ? "Uploading…"
                        : isDone
                          ? "File uploaded — click to replace"
                          : isDragOver
                            ? "Drop file here"
                            : "Click or drag & drop to upload"}
                    </p>
                  </div>

                  {/* Status badge */}
                  <AnimatePresence mode="wait">
                    {isUploading ? (
                      <motion.span
                        key="uploading"
                        className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-semibold text-blue-600"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Loader2 size={10} className="spinner" />
                        Uploading
                      </motion.span>
                    ) : isDone ? (
                      <motion.span
                        key="done"
                        className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-700"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18 }}
                      >
                        <CheckCircle2 size={10} />
                        Uploaded
                      </motion.span>
                    ) : (
                      <motion.span
                        key="pending"
                        className="flex-shrink-0 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-400"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        Pending
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Hidden file input */}
                  <input
                    ref={(el) => (inputRefs.current[item.key] = el)}
                    type="file"
                    className="sr-only"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(item.key, file);
                    }}
                  />
                </motion.div>
              );
            })}
          </div>

          {/* ── Children (e.g. ParameterSection) ── */}
          {children}

          {/* ── Generate button ── */}
          {generateLabel && onGenerate && (
            <div className="flex items-center gap-3 pt-4 mt-1 border-t border-slate-100">
              <Button
                className="btn-press inline-flex items-center gap-2 rounded-md bg-red-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 disabled:opacity-50"
                onClick={onGenerate}
                disabled={!canGenerate || isGenerating}
                isLoading={isGenerating}
              >
                {!isGenerating && <Sparkles size={14} />}
                {isGenerating ? "Generating…" : generateLabel}
              </Button>
              {!canGenerate && !isGenerating && (
                <p className="text-xs text-slate-400">
                  Upload all files to unlock
                </p>
              )}
            </div>
          )}

          {/* ── Feedback messages ── */}
          <AnimatePresence>
            {uploadMessage && (
              <motion.p
                key="msg"
                className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                ✓ {uploadMessage}
              </motion.p>
            )}
            {uploadError && (
              <motion.p
                key="err"
                className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                ✕ {uploadError}
              </motion.p>
            )}
          </AnimatePresence>

        </CardContent>
      </Card>
    </motion.div>
  );
}
