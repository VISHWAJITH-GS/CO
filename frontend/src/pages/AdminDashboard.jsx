import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  BookOpen,
  FileSpreadsheet,
  Activity,
  Plus,
  UserCheck,
  UserX,
  Trash2,
  CheckCircle,
  XCircle,
  Download,
  Search,
  Key,
  MoreVertical
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Pagination } from "../components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  getFaculty,
  addFaculty,
  editFaculty,
  resetFacultyPassword,
  getAdminCourses,
  addCourse,
  editCourse,
  archiveCourse,
  getAssignments,
  addAssignment,
  removeAssignment,
  getAllReports,
  reviewReport,
  getActivityLogs,
  downloadReportFileByOutputId
} from "../lib/api";
import { pageVariants, containerVariants, cardVariants } from "../lib/animations";

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = (tab) => setSearchParams({ tab });
  const [stats, setStats] = useState({
    totalFaculty: 0,
    totalCourses: 0,
    assignedCourses: 0,
    generatedReports: 0,
    submittedReports: 0,
    pendingReports: 0
  });

  const [faculty, setFaculty] = useState([]);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);

  // Search/Filters
  const [searchFaculty, setSearchFaculty] = useState("");
  const [searchCourse, setSearchCourse] = useState("");
  const [filterReportStatus, setFilterReportStatus] = useState("All");
  const [searchReport, setSearchReport] = useState("");
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState("All");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("All");

  // Pagination States
  const ITEMS_PER_PAGE = 10;
  const [facultyPage, setFacultyPage] = useState(1);
  const [coursePage, setCoursePage] = useState(1);
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [reportPage, setReportPage] = useState(1);
  const [logPage, setLogPage] = useState(1);

  // Form States
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [facultyForm, setFacultyForm] = useState({ name: "", email: "", password: "" });
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetForm, setResetForm] = useState({ id: "", name: "", password: "" });

  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseForm, setCourseForm] = useState({
    id: null,
    course_code: "",
    course_name: "",
    semester: 1,
    academic_year: "2025-26",
    regulation: "2022"
  });

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ faculty_id: "", course_id: "" });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const loadData = async () => {
    try {
      const facultyData = await getFaculty();
      const coursesData = await getAdminCourses();
      const assignmentsData = await getAssignments();
      const reportsData = await getAllReports();
      const logsData = await getActivityLogs();

      setFaculty(facultyData);
      setCourses(coursesData);
      setAssignments(assignmentsData);
      setReports(reportsData);
      setLogs(logsData);

      // Compute stats
      const activeFac = facultyData.filter(f => f.is_active).length;
      const activeCourses = coursesData.filter(c => c.status === "active").length;
      const uniqueAssignedCourses = new Set(assignmentsData.map(a => a.course_id)).size;
      const genRep = reportsData.filter(r => r.status === "Generated").length;
      const subRep = reportsData.filter(r => r.status === "Submitted").length;
      const pendingRep = reportsData.filter(r => r.status === "Submitted").length;

      // Compute today's work
      const todayString = new Date().toDateString();
      const todayLogs = logsData.filter(log => new Date(log.created_at).toDateString() === todayString);
      const todayReports = reportsData.filter(rep => new Date(rep.updated_at || rep.created_at || rep.generated_at).toDateString() === todayString);

      const reportsSubmittedToday = todayReports.filter(rep => rep.status === "Submitted").length;
      const actionsLoggedToday = todayLogs.length;
      const activeFacultyToday = new Set(todayLogs.filter(l => l.user?.role === "faculty").map(l => l.user_id)).size;
      const newCoursesToday = coursesData.filter(c => new Date(c.created_at).toDateString() === todayString).length;

      setStats({
        totalFaculty: facultyData.length,
        activeFaculty: activeFac,
        totalCourses: coursesData.length,
        activeCourses: activeCourses,
        assignedCourses: uniqueAssignedCourses,
        generatedReports: genRep,
        submittedReports: subRep,
        pendingReports: pendingRep,
        reportsSubmittedToday,
        actionsLoggedToday,
        activeFacultyToday,
        newCoursesToday
      });
    } catch (err) {
      setError("Failed to load admin dashboard data: " + err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddFacultySubmit = async (e) => {
    e.preventDefault();
    try {
      await addFaculty(facultyForm.name, facultyForm.email, facultyForm.password);
      setSuccess("Faculty account created successfully.");
      setShowFacultyModal(false);
      setFacultyForm({ name: "", email: "", password: "" });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleFaculty = async (id, currentStatus) => {
    try {
      await editFaculty(id, { is_active: !currentStatus });
      setSuccess("Faculty status updated.");
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      await resetFacultyPassword(resetForm.id, resetForm.password);
      setSuccess("Faculty password updated successfully.");
      setShowResetModal(false);
      setResetForm({ id: "", name: "", password: "" });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    try {
      if (courseForm.id) {
        await editCourse(courseForm.id, courseForm);
        setSuccess("Course updated successfully.");
      } else {
        await addCourse(courseForm);
        setSuccess("Course created successfully.");
      }
      setShowCourseModal(false);
      setCourseForm({ id: null, course_code: "", course_name: "", semester: 1, academic_year: "2025-26", regulation: "2022" });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleArchiveCourse = async (id) => {
    if (!confirm("Are you sure you want to archive this course?")) return;
    try {
      await archiveCourse(id);
      setSuccess("Course archived successfully.");
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      await addAssignment(assignForm.faculty_id, assignForm.course_id);
      setSuccess("Course assigned to faculty.");
      setShowAssignModal(false);
      setAssignForm({ faculty_id: "", course_id: "" });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveAssignment = async (id) => {
    if (!confirm("Remove this course assignment?")) return;
    try {
      await removeAssignment(id);
      setSuccess("Assignment removed.");
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReviewReport = async (id, action) => {
    try {
      await reviewReport(id, action);
      setSuccess(`Report ${action === "Approve" ? "Approved" : "Rejected"} successfully.`);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDownload = async (reportId, reportName) => {
    try {
      const { blob } = await downloadReportFileByOutputId(reportId, reportName);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${reportName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError("Download failed: " + err.message);
    }
  };

  // Pagination logic
  const filteredFaculty = faculty.filter(f => f.full_name.toLowerCase().includes(searchFaculty.toLowerCase()) || f.email.toLowerCase().includes(searchFaculty.toLowerCase()));
  const paginatedFaculty = filteredFaculty.slice((facultyPage - 1) * ITEMS_PER_PAGE, facultyPage * ITEMS_PER_PAGE);

  const filteredCourses = courses.filter(c => c.subject_name.toLowerCase().includes(searchCourse.toLowerCase()) || c.subject_code.toLowerCase().includes(searchCourse.toLowerCase()));
  const paginatedCourses = filteredCourses.slice((coursePage - 1) * ITEMS_PER_PAGE, coursePage * ITEMS_PER_PAGE);

  const filteredReports = reports.filter(r => filterReportStatus === "All" || r.status === filterReportStatus)
    .filter(r => (r.subjectName || "").toLowerCase().includes(searchReport.toLowerCase()) || (r.subjectCode || "").toLowerCase().includes(searchReport.toLowerCase()));
  const paginatedReports = filteredReports.slice((reportPage - 1) * ITEMS_PER_PAGE, reportPage * ITEMS_PER_PAGE);

  return (
    <motion.div
      className="p-4 md:p-6 space-y-6"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Staff Dashboard</h1>
          <p className="text-sm text-slate-500">Manage courses, faculty assignments, and reports.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="font-bold">&times;</button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess("")} className="font-bold">&times;</button>
        </div>
      )}

      {/* TABS CONTAINER */}
      <div className="mt-4">
        {/* OVERVIEW TAB (Dashboard - Today's Work Overview) */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm md:text-sm font-medium text-slate-500">Reports Submitted Today</CardTitle>
                  <FileSpreadsheet size={20} className="text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-950">{stats.reportsSubmittedToday}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm md:text-sm font-medium text-slate-500">Actions Logged Today</CardTitle>
                  <Activity size={20} className="text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-950">{stats.actionsLoggedToday}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm md:text-sm font-medium text-slate-500">Active Faculty Today</CardTitle>
                  <Users size={20} className="text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-950">{stats.activeFacultyToday}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm md:text-sm font-medium text-slate-500">New Courses Added Today</CardTitle>
                  <BookOpen size={20} className="text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-950">{stats.newCoursesToday}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Today's Pending Reviews */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-900">Today's Pending Report Reviews</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-y-auto max-h-[400px]">
                  {reports.filter(r => r.status === "Submitted" && new Date(r.updated_at || r.created_at || r.generated_at).toDateString() === new Date().toDateString()).length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500">No reports submitted today.</div>
                  ) : (
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-3 font-semibold text-slate-700">Faculty</th>
                          <th className="p-3 font-semibold text-slate-700">Course</th>
                          <th className="p-3 font-semibold text-slate-700 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports
                          .filter(r => r.status === "Submitted" && new Date(r.updated_at || r.created_at || r.generated_at).toDateString() === new Date().toDateString())
                          .map(r => (
                            <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="p-3 font-medium text-slate-900">{r.faculty?.full_name}</td>
                              <td className="p-3 text-slate-600 truncate max-w-[120px]">{r.course?.subject_code}</td>
                              <td className="p-3 text-right space-x-1 whitespace-nowrap">
                                <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => handleDownload(r.id, r.report_name)}>
                                  <Download size={12} />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                  onClick={() => handleReviewReport(r.id, "Approve")}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-rose-700 border-rose-200 hover:bg-rose-50"
                                  onClick={() => handleReviewReport(r.id, "Reject")}
                                >
                                  Reject
                                </Button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

              {/* Today's Activity Log */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-900">Today's Activity Feed</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-y-auto max-h-[400px]">
                  {logs.filter(log => new Date(log.created_at).toDateString() === new Date().toDateString()).length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500">No activities recorded today.</div>
                  ) : (
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-3 font-semibold text-slate-700">User</th>
                          <th className="p-3 font-semibold text-slate-700">Action</th>
                          <th className="p-3 font-semibold text-slate-700">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs
                          .filter(log => new Date(log.created_at).toDateString() === new Date().toDateString())
                          .map(log => (
                            <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="p-3 font-medium text-slate-900 truncate max-w-[150px]">{log.user?.full_name}</td>
                              <td className="p-3 text-red-800 font-bold">{log.action}</td>
                              <td className="p-3 text-slate-500 text-xs">{new Date(log.created_at).toLocaleTimeString()}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* FACULTY MANAGEMENT */}
        {activeTab === "faculty_mgmt" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center gap-4">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search Faculty..."
                  className="pl-9"
                  value={searchFaculty}
                  onChange={e => setSearchFaculty(e.target.value)}
                />
              </div>
              <Button onClick={() => setShowFacultyModal(true)} className="flex items-center gap-1.5">
                <Plus size={16} /> Add Faculty
              </Button>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 font-semibold text-slate-700">Name</th>
                      <th className="p-4 font-semibold text-slate-700">Email</th>
                      <th className="p-4 font-semibold text-slate-700">Status</th>
                      <th className="p-4 font-semibold text-slate-700">Created At</th>
                      <th className="p-4 font-semibold text-slate-700 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFaculty.map(f => (
                        <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-4 font-medium text-slate-900">{f.full_name}</td>
                          <td className="p-4 text-slate-600">{f.email}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${f.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                              }`}>
                              {f.is_active ? "Active" : "Deactivated"}
                            </span>
                          </td>
                          <td className="p-4 text-slate-500">{new Date(f.created_at).toLocaleDateString()}</td>
                          <td className="p-4 text-right space-x-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreVertical className="h-4 w-4 text-slate-500" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setResetForm({ id: f.id, name: f.full_name, password: "" }); setShowResetModal(true); }}>
                                  <Key className="mr-2 h-4 w-4" /> Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleFaculty(f.id, f.is_active)} className={f.is_active ? "text-red-600 focus:bg-red-50" : "text-emerald-600 focus:bg-emerald-50"}>
                                  {f.is_active ? "Deactivate Account" : "Activate Account"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    {paginatedFaculty.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-500">
                          No faculty found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
              <Pagination 
                currentPage={facultyPage} 
                totalPages={Math.ceil(filteredFaculty.length / ITEMS_PER_PAGE)} 
                onPageChange={setFacultyPage} 
              />
            </Card>
          </div>
        )}

        {/* COURSE MANAGEMENT */}
        {activeTab === "courses" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center gap-4">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search Courses..."
                  className="pl-9"
                  value={searchCourse}
                  onChange={e => setSearchCourse(e.target.value)}
                />
              </div>
              <Button onClick={() => setShowCourseModal(true)} className="flex items-center gap-1.5">
                <Plus size={16} /> Create Course
              </Button>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 font-semibold text-slate-700">Code</th>
                      <th className="p-4 font-semibold text-slate-700">Course Name</th>
                      <th className="p-4 font-semibold text-slate-700">Sem</th>
                      <th className="p-4 font-semibold text-slate-700">Regulation</th>
                      <th className="p-4 font-semibold text-slate-700">Status</th>
                      <th className="p-4 font-semibold text-slate-700 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses
                      .filter(c => c.subject_name.toLowerCase().includes(searchCourse.toLowerCase()) || c.subject_code.toLowerCase().includes(searchCourse.toLowerCase()))
                      .map(c => (
                        <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-4 font-bold text-slate-900">{c.subject_code}</td>
                          <td className="p-4 text-slate-800">{c.subject_name}</td>
                          <td className="p-4 text-slate-600">Semester {c.semester}</td>
                          <td className="p-4 text-slate-500">{c.regulation || "NA"}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                              }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCourseForm({
                                  ...c,
                                  course_code: c.subject_code,
                                  course_name: c.subject_name
                                });
                                setShowCourseModal(true);
                              }}
                            >
                              Edit
                            </Button>
                            {c.status !== "archived" && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleArchiveCourse(c.id)}
                              >
                                Archive
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* COURSE ASSIGNMENTS */}
        {activeTab === "assignments" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowAssignModal(true)} className="flex items-center gap-1.5">
                <UserCheck size={16} /> Assign Course
              </Button>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 font-semibold text-slate-700">Faculty Name</th>
                      <th className="p-4 font-semibold text-slate-700">Email</th>
                      <th className="p-4 font-semibold text-slate-700">Course Code</th>
                      <th className="p-4 font-semibold text-slate-700">Course Name</th>
                      <th className="p-4 font-semibold text-slate-700 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(a => (
                      <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-4 font-medium text-slate-900">{a.faculty?.full_name}</td>
                        <td className="p-4 text-slate-600">{a.faculty?.email}</td>
                        <td className="p-4 font-bold text-slate-700">{a.course?.subject_code}</td>
                        <td className="p-4 text-slate-600">{a.course?.subject_name}</td>
                        <td className="p-4 text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="inline-flex items-center gap-1"
                            onClick={() => handleRemoveAssignment(a.id)}
                          >
                            <Trash2 size={14} /> Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* REPORT REVIEWS */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex gap-2">
                {["All", "Submitted", "Approved", "Rejected"].map(st => (
                  <Button
                    key={st}
                    variant={filterReportStatus === st ? "default" : "outline"}
                    onClick={() => setFilterReportStatus(st)}
                  >
                    {st}
                  </Button>
                ))}
              </div>
              <div className="relative max-w-sm flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search Reports..."
                  className="pl-9"
                  value={searchReport}
                  onChange={e => setSearchReport(e.target.value)}
                />
              </div>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 font-semibold text-slate-700">Faculty</th>
                      <th className="p-4 font-semibold text-slate-700">Course</th>
                      <th className="p-4 font-semibold text-slate-700">Report Name</th>
                      <th className="p-4 font-semibold text-slate-700">Generated Date</th>
                      <th className="p-4 font-semibold text-slate-700">Status</th>
                      <th className="p-4 font-semibold text-slate-700 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports
                      .filter(r => filterReportStatus === "All" || r.status === filterReportStatus)
                      .filter(r => {
                        const query = searchReport.toLowerCase();
                        return (
                          (r.faculty?.full_name || "").toLowerCase().includes(query) ||
                          (r.course?.subject_code || "").toLowerCase().includes(query) ||
                          (r.course?.subject_name || "").toLowerCase().includes(query) ||
                          (r.report_name || "").toLowerCase().includes(query)
                        );
                      })
                      .map(r => (
                        <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-4 font-medium text-slate-900">{r.faculty?.full_name}</td>
                          <td className="p-4 text-slate-600">{r.course?.subject_code} - {r.course?.subject_name}</td>
                          <td className="p-4 text-slate-800 font-mono">{r.report_name}</td>
                          <td className="p-4 text-slate-500">{new Date(r.generated_at).toLocaleString()}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${r.status === "Approved" ? "bg-emerald-50 text-emerald-700" :
                              r.status === "Submitted" ? "bg-amber-50 text-amber-700" :
                                r.status === "Rejected" ? "bg-rose-50 text-rose-700" :
                                  "bg-slate-100 text-slate-700"
                              }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2 whitespace-nowrap">
                            <Button variant="outline" size="sm" onClick={() => handleDownload(r.id, r.report_name)}>
                              <Download size={14} /> Download
                            </Button>
                            {r.status === "Submitted" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                  onClick={() => handleReviewReport(r.id, "Approve")}
                                >
                                  <CheckCircle size={14} className="mr-1" /> Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-rose-700 border-rose-200 hover:bg-rose-50"
                                  onClick={() => handleReviewReport(r.id, "Reject")}
                                >
                                  <XCircle size={14} className="mr-1" /> Reject
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* AUDIT LOGS */}
        {activeTab === "logs" && (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 font-semibold text-slate-700">User</th>
                    <th className="p-4 font-semibold text-slate-700">Action</th>
                    <th className="p-4 font-semibold text-slate-700">Details</th>
                    <th className="p-4 font-semibold text-slate-700">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-4 font-medium text-slate-900">{log.user?.full_name} <span className="text-xs text-slate-500 font-normal">({log.user?.role})</span></td>
                      <td className="p-4 font-bold text-red-800">{log.action}</td>
                      <td className="p-4 text-slate-600 font-mono text-xs max-w-xs truncate">{log.metadata || "-"}</td>
                      <td className="p-4 text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* MODALS */}
      {/* 1. Add Faculty Modal */}
      {showFacultyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add New Faculty Member</CardTitle>
            </CardHeader>
            <form onSubmit={handleAddFacultySubmit}>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="fac-name">Full Name</Label>
                  <Input
                    id="fac-name"
                    required
                    value={facultyForm.name}
                    onChange={e => setFacultyForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="fac-email">Email Address</Label>
                  <Input
                    id="fac-email"
                    type="email"
                    required
                    value={facultyForm.email}
                    onChange={e => setFacultyForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="fac-pass">Initial Password</Label>
                  <Input
                    id="fac-pass"
                    type="password"
                    required
                    value={facultyForm.password}
                    onChange={e => setFacultyForm(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 p-4 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setShowFacultyModal(false)}>Cancel</Button>
                <Button type="submit">Create Account</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 2. Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Reset Password for {resetForm.name}</CardTitle>
            </CardHeader>
            <form onSubmit={handleResetPasswordSubmit}>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="reset-pass">New Password</Label>
                  <Input
                    id="reset-pass"
                    type="password"
                    required
                    value={resetForm.password}
                    onChange={e => setResetForm(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 p-4 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setShowResetModal(false)}>Cancel</Button>
                <Button type="submit">Update Password</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 3. Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{courseForm.id ? "Edit Course" : "Create New Course"}</CardTitle>
            </CardHeader>
            <form onSubmit={handleCourseSubmit}>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="c-code">Course Code</Label>
                  <Input
                    id="c-code"
                    required
                    value={courseForm.course_code}
                    onChange={e => setCourseForm(prev => ({ ...prev, course_code: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="c-name">Course Name</Label>
                  <Input
                    id="c-name"
                    required
                    value={courseForm.course_name}
                    onChange={e => setCourseForm(prev => ({ ...prev, course_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="c-sem">Semester</Label>
                  <Input
                    id="c-sem"
                    type="number"
                    min="1"
                    max="8"
                    required
                    value={courseForm.semester}
                    onChange={e => setCourseForm(prev => ({ ...prev, semester: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="c-year">Academic Year</Label>
                  <Input
                    id="c-year"
                    placeholder="e.g. 2025-26"
                    required
                    value={courseForm.academic_year}
                    onChange={e => setCourseForm(prev => ({ ...prev, academic_year: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="c-reg">Regulation</Label>
                  <Input
                    id="c-reg"
                    placeholder="e.g. 2022"
                    value={courseForm.regulation}
                    onChange={e => setCourseForm(prev => ({ ...prev, regulation: e.target.value }))}
                  />
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 p-4 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setShowCourseModal(false)}>Cancel</Button>
                <Button type="submit">{courseForm.id ? "Update Course" : "Create Course"}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 4. Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Assign Course to Faculty</CardTitle>
            </CardHeader>
            <form onSubmit={handleAssignSubmit}>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="assign-fac">Select Faculty Member</Label>
                  <select
                    id="assign-fac"
                    required
                    className="w-full mt-1.5 p-2 rounded-md border border-slate-200 text-sm"
                    value={assignForm.faculty_id}
                    onChange={e => setAssignForm(prev => ({ ...prev, faculty_id: e.target.value }))}
                  >
                    <option value="">-- Choose Faculty --</option>
                    {faculty.filter(f => f.is_active).map(f => (
                      <option key={f.id} value={f.id}>{f.full_name} ({f.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="assign-course">Select Course</Label>
                  <select
                    id="assign-course"
                    required
                    className="w-full mt-1.5 p-2 rounded-md border border-slate-200 text-sm"
                    value={assignForm.course_id}
                    onChange={e => setAssignForm(prev => ({ ...prev, course_id: e.target.value }))}
                  >
                    <option value="">-- Choose Course --</option>
                    {courses.filter(c => c.status === "active").map(c => (
                      <option key={c.id} value={c.id}>{c.subject_code} - {c.subject_name}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 p-4 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setShowAssignModal(false)}>Cancel</Button>
                <Button type="submit">Assign</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </motion.div>
  );
}
