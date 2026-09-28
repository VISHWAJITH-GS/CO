import { BookOpen, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
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
import { getSubjects } from "../lib/api";

export default function Dashboard() {
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    async function loadSubjects() {
      try {
        const data = await getSubjects();
        setSubjects(data || []);
      } catch (loadError) {
        setError(loadError.message || "Failed to load subjects.");
      }
    }

    loadSubjects();
  }, []);

  return (
    <motion.div
      className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div variants={sectionVariants} className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight text-red-950">Staff Dashboard</h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          Manage assigned subjects, assessment files, and attainment reports.
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
      </AnimatePresence>

      <motion.div
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {subjects.length === 0 && !error ? (
          <motion.div variants={cardVariants} className="col-span-full py-12 text-center text-slate-500 text-sm">
            No subjects assigned yet.
          </motion.div>
        ) : (
          subjects.map((subject) => (
            <motion.div
              key={subject.code}
              variants={cardVariants}
              whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
              className="h-full"
            >
              <Card className="h-full flex flex-col border border-red-100/50 bg-white/60 backdrop-blur-md transition-all duration-300 hover:border-red-200 hover:bg-white hover:shadow-xl hover:shadow-red-900/5 overflow-hidden group">
                <CardHeader className="space-y-3 pb-4">
                  <span className="w-fit inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10 transition-colors group-hover:bg-red-100/80">
                    {subject.code}
                  </span>
                  <CardTitle className="text-xl font-semibold leading-tight text-slate-900 group-hover:text-red-950 transition-colors">
                    {subject.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col gap-6">
                  <div className="flex items-center gap-2.5 text-[13px] text-slate-600">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100/80 text-slate-500 transition-colors group-hover:bg-red-50 group-hover:text-red-600">
                      <BookOpen size={13} />
                    </span>
                    <span className="font-medium text-slate-700">{subject.semester}</span>
                  </div>

                  <div className="mt-auto pt-2">
                    <Button asChild className="w-full group/btn transition-all duration-300 shadow-sm hover:shadow-md bg-red-900 hover:bg-red-800 text-white h-10">
                      <Link to={`/subjects/${subject.code}/workspace`}>
                        Open Workspace
                        <ArrowRight
                          size={15}
                          className="ml-2 transition-transform duration-300 group-hover/btn:translate-x-1"
                        />
                      </Link>
                    </Button>
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
