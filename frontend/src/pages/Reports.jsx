import { CalendarDays, CircleCheck, Clock3, Download, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  pageVariants,
  containerVariants,
  cardVariants,
  sectionVariants,
} from "../lib/animations";
import { downloadReportFile, getFacultyReports, submitReportToAdmin, unsubmitReport } from "../lib/api";

const statusStyles = {
  Generated: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Submitted: "border-blue-200 bg-blue-50 text-blue-700",
  Approved: "border-emerald-300 bg-emerald-100 text-emerald-800",
  Rejected: "border-rose-300 bg-rose-50 text-rose-700",
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
};

export default function Reports({ user }) {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [downloadingId, setDownloadingId] = useState("");
  const [submittingId, setSubmittingId] = useState("");

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadReports = async () => {
    if (!user) return;
    try {
      const data = await getFacultyReports();
      setReports(data || []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load reports.");
    }
  };

  useEffect(() => {
    loadReports();
  }, [user]);

  const handleDownload = async (report) => {
    setDownloadingId(report.id);
    try {
      const { blob } = await downloadReportFile(report.id, report.report_name);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.report_name}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.message || "Failed to download report.");
    } finally {
      setDownloadingId("");
    }
  };

  const handleSubmit = async (reportId) => {
    setSubmittingId(reportId);
    try {
      await submitReportToAdmin(reportId);
      setSuccess("Report submitted to admin successfully.");
      loadReports();
    } catch (submitError) {
      setError(submitError.message || "Failed to submit report.");
    } finally {
      setSubmittingId("");
    }
  };

  const handleUnsubmit = async (reportId) => {
    setSubmittingId(reportId);
    try {
      await unsubmitReport(reportId);
      setSuccess("Report unsubmitted successfully.");
      loadReports();
    } catch (unsubmitError) {
      setError(unsubmitError.message || "Failed to unsubmit report.");
    } finally {
      setSubmittingId("");
    }
  };

  return (
    <motion.div
      className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div variants={sectionVariants} className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight text-red-950">Reports</h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          View outcome attainment reports and submit for review.
        </p>
      </motion.div>

      <AnimatePresence mode="popLayout">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-700 px-4 py-3 rounded-xl flex justify-between items-center shadow-sm"
          >
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError("")} className="font-bold text-red-400 hover:text-red-700 transition-colors p-1">&times;</button>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-emerald-50/80 backdrop-blur-sm border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex justify-between items-center shadow-sm"
          >
            <span className="text-sm font-medium">{success}</span>
            <button onClick={() => setSuccess("")} className="font-bold text-emerald-400 hover:text-emerald-700 transition-colors p-1">&times;</button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {reports.length === 0 ? (
          <motion.div variants={cardVariants} className="col-span-full py-12 text-center text-slate-500 text-sm">
            No reports found.
          </motion.div>
        ) : (
          reports.map((report) => (
            <motion.div
              key={report.id}
              variants={cardVariants}
              whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
              className="h-full"
            >
              <Card className="h-full flex flex-col border border-red-100/50 bg-white/60 backdrop-blur-md transition-all duration-300 hover:border-red-200 hover:bg-white hover:shadow-xl hover:shadow-red-900/5 overflow-hidden group">
                <CardHeader className="space-y-3 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10 transition-colors group-hover:bg-red-100/80">
                      {report.course?.subject_code}
                    </span>
                    <span
                      className={`status-badge inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${statusStyles[report.status] || statusStyles.Pending}`}
                    >
                      <CircleCheck size={12} className={report.status === "Approved" ? "text-emerald-600" : "opacity-70"} />
                      {report.status}
                    </span>
                  </div>

                  <div>
                    <CardTitle className="text-lg font-semibold leading-tight text-slate-900 group-hover:text-red-950 transition-colors">
                      {report.course?.subject_name}
                    </CardTitle>
                    <p className="text-sm font-medium text-slate-500 mt-1.5">
                      {report.report_name?.includes('EARLY_SEM') ? 'Early Sem Report' : 
                       report.report_name?.includes('MID_SEM') ? 'Mid Sem Report' : 
                       report.report_name?.includes('FINAL') ? 'End Sem Report' : 
                       'Course Report'}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col gap-5">
                  <div className="space-y-2.5 text-[13px] text-slate-600">
                    <p className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      <span className="font-medium text-slate-700">Semester {report.course?.semester}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <CalendarDays size={14} className="text-slate-400" />
                      Generated: {new Date(report.generated_at).toLocaleDateString()}
                    </p>
                    {report.submitted_at && (
                      <p className="flex items-center gap-2">
                        <Clock3 size={14} className="text-slate-400" />
                        Submitted: {new Date(report.submitted_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="mt-auto flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1 group/btn transition-all duration-300 hover:bg-slate-50 hover:border-slate-300 text-slate-700 shadow-sm h-9 px-3 text-xs"
                      disabled={downloadingId === report.id}
                      onClick={() => handleDownload(report)}
                    >
                      {downloadingId === report.id ? (
                        <Loader2 size={14} className="mr-1.5 animate-spin" />
                      ) : (
                        <Download size={14} className="mr-1.5 transition-transform group-hover/btn:-translate-y-0.5 text-slate-500" />
                      )}
                      Download
                    </Button>

                    {report.status === "Generated" && (
                      <Button
                        className="flex-1 group/btn transition-all duration-300 shadow-sm hover:shadow-md bg-red-900 hover:bg-red-800 text-white h-9 px-3 text-xs"
                        disabled={submittingId === report.id}
                        onClick={() => handleSubmit(report.id)}
                      >
                        {submittingId === report.id ? (
                          <Loader2 size={14} className="mr-1.5 animate-spin" />
                        ) : (
                          <Send size={14} className="mr-1.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                        )}
                        Submit
                      </Button>
                    )}

                    {report.status === "Submitted" && (
                      <Button
                        variant="outline"
                        className="flex-1 group/btn transition-all duration-300 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 shadow-sm h-9 px-3 text-xs"
                        disabled={submittingId === report.id}
                        onClick={() => handleUnsubmit(report.id)}
                      >
                        {submittingId === report.id ? (
                          <Loader2 size={14} className="mr-1.5 animate-spin" />
                        ) : (
                          <span className="mr-1.5">&times;</span>
                        )}
                        Unsubmit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>
    </motion.div>
  );
}
