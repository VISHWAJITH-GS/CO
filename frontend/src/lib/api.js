const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000`;

const TOKEN_KEY = "coas-token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem("token");
}

function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem("token", token);
  }
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("token");
}

async function request(path, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const errorPayload = await response.json();
      if (errorPayload?.error) {
        message = errorPayload.error;
      }
    } catch {
      // Preserve default message when backend response is not JSON.
    }

    if (response.status === 401) {
      clearToken();
      localStorage.removeItem("coas-user");
      window.dispatchEvent(new CustomEvent("coas-auth-expired"));
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function devLogin(email, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
    .catch(async (error) => {
      if (password !== "tce123") {
        throw error;
      }

      await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          full_name: email.split("@")[0],
        }),
      });

      return request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    })
    .then((data) => {
      setToken(data.token);
      return data.user;
    });
}

export function getSubjects() {
  return request("/api/subjects").then((data) =>
    (data.subjects || []).map((subject) => ({
      id: subject.id,
      code: subject.subject_code,
      name: subject.subject_name,
      semester: subject.semester ? `Semester ${subject.semester}` : "Semester",
      currentPhase: subject.current_phase,
      status: subject.status,
      raw: subject,
    }))
  );
}

export async function ensureSubject(subjectCode) {
  const subjects = await getSubjects();
  const existing = subjects.find((subject) => subject.code === subjectCode);
  if (existing) {
    return existing;
  }

  const created = await request("/api/subjects", {
    method: "POST",
    body: JSON.stringify({
      subject_code: subjectCode,
      subject_name: subjectCode,
      semester: 1,
    }),
  });

  const subject = created.subject;
  return {
    id: subject.id,
    code: subject.subject_code,
    name: subject.subject_name,
    semester: subject.semester ? `Semester ${subject.semester}` : "Semester",
    currentPhase: subject.current_phase,
    status: "active",
    raw: subject,
  };
}

export function getSubjectStatus(subjectId) {
  return request(`/api/subjects/${subjectId}`).then((data) => data.subject);
}

function mapUploadRoute(fileType) {
  if (fileType === "CAT1_MARKS") return "/api/uploads/cat1";
  if (fileType === "CAT2_MARKS") return "/api/uploads/cat2";
  if (fileType === "ASS1") return "/api/uploads/ass1";
  if (fileType === "ASS2") return "/api/uploads/ass2";
  if (fileType === "TERMINAL") return "/api/uploads/terminal";
  return "/api/uploads/unknown";
}

export async function uploadWorkspaceFile(subjectId, subjectCode, fileType, file) {
  const token = getToken();
  const formData = new FormData();
  formData.append("subject_id", String(subjectId));
  formData.append("subject_code", subjectCode);
    if (!["CAT1_MARKS", "CAT2_MARKS", "ASS1", "ASS2", "TERMINAL"].includes(fileType)) {
    formData.append("file_type", fileType);
  }
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}${mapUploadRoute(fileType)}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    let message = `Upload failed (${response.status})`;
    try {
      const errorPayload = await response.json();
      if (errorPayload?.error) {
        message = errorPayload.error;
      }
    } catch {
      // Keep default when response is not JSON.
    }

    if (response.status === 401) {
      clearToken();
      localStorage.removeItem("coas-user");
      window.dispatchEvent(new CustomEvent("coas-auth-expired"));
    }

    throw new Error(message);
  }

  return response.json();
}

export function saveConfiguration(subjectId, payload) {
  return request(`/api/configuration/${subjectId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getConfiguration(subjectId) {
  return request(`/api/configuration/${subjectId}`)
    .then((data) => data.configuration)
    .catch((error) => {
      if (error.message.includes("404")) {
        return null;
      }

      throw error;
    });
}

export function processPhase1(subjectId) {
  return request("/api/processing/early-sem", {
    method: "POST",
    body: JSON.stringify({ subject_id: subjectId }),
  });
}

export function processPhase2(subjectId, templatePath) {
  const body = { subject_id: subjectId };
  if (templatePath) {
    body.template_path = templatePath;
  }

  return request("/api/processing/mid-sem", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function processPhase3(subjectId, selectedPercentage) {
  return request("/api/processing/terminal", {
    method: "POST",
    body: JSON.stringify({ subject_id: subjectId, selected_percentage: selectedPercentage }),
  });
}

export function previewTerminal(subjectId) {
  return request("/api/processing/terminal-preview", {
    method: "POST",
    body: JSON.stringify({ subject_id: subjectId }),
  });
}

export function clearReportProcess(subjectId) {
  return request(`/api/reports/clear-process/${subjectId}`, {
    method: "POST",
  });
}

export async function downloadReportFileByOutputId(outputId, outputType = "report") {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/reports/download/${outputId}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let message = `Download failed (${response.status})`;
    try {
      const errorPayload = await response.json();
      if (errorPayload?.error) {
        message = errorPayload.error;
      }
    } catch {
      // Keep default when response is not JSON.
    }

    if (response.status === 401) {
      clearToken();
      localStorage.removeItem("coas-user");
      window.dispatchEvent(new CustomEvent("coas-auth-expired"));
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  return { blob, suggestedName: `${outputType}.xlsx` };
}

export function getProfile(email) {
  const userRaw = localStorage.getItem("coas-user");
  const user = userRaw ? JSON.parse(userRaw) : null;

  return Promise.resolve({
    name: user?.full_name || user?.email?.split("@")[0] || "Staff User",
    email: email || user?.email || "",
    department: "Computer Science and Engineering",
    role: user?.role || "faculty",
    employeeId: "TCE-FAC-0000",
  });
}

export function updatePassword(payload) {
  return request("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getReports() {
  const subjects = await getSubjects();
  const reportRows = [];

  for (const subject of subjects) {
    const data = await request(`/api/reports/${subject.id}`);
    const reports = data.reports || [];
    const final = reports.find((report) => report.type === "CO_ATTAINMENT_COMPLETE");

    reportRows.push({
      id: String(subject.id),
      subjectId: subject.id,
      subjectCode: subject.code,
      subjectName: subject.name,
      semester: subject.semester,
      status: final ? "Generated" : "Pending",
      generatedOn: final ? new Date(final.generated_at).toLocaleString() : "",
      outputId: final ? final.id : null,
      outputType: final ? final.type : null,
    });
  }

  return reportRows;
}

export function getSubjectReports(subjectId) {
  return request(`/api/reports/${subjectId}`).then((data) => data.reports || []);
}

export function getFaculty() {
  return request("/api/admin/faculty").then((data) => data.faculty || []);
}

export function addFaculty(name, email, password) {
  return request("/api/admin/faculty", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function editFaculty(id, payload) {
  return request(`/api/admin/faculty/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function resetFacultyPassword(id, password) {
  return request(`/api/admin/faculty/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function getAdminCourses() {
  return request("/api/admin/courses").then((data) => data.courses || []);
}

export function addCourse(payload) {
  return request("/api/admin/courses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function editCourse(id, payload) {
  return request(`/api/admin/courses/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function archiveCourse(id) {
  return request(`/api/admin/courses/${id}`, {
    method: "DELETE",
  });
}

export function getAssignments() {
  return request("/api/admin/assignments").then((data) => data.assignments || []);
}

export function addAssignment(faculty_id, course_id) {
  return request("/api/admin/assignments", {
    method: "POST",
    body: JSON.stringify({ faculty_id, course_id }),
  });
}

export function removeAssignment(id) {
  return request(`/api/admin/assignments/${id}`, {
    method: "DELETE",
  });
}

export function getAllReports() {
  return request("/api/admin/reports").then((data) => data.reports || []);
}

export function reviewReport(id, action) {
  return request(`/api/admin/reports/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export function getActivityLogs() {
  return request("/api/admin/activity-logs").then((data) => data.logs || []);
}

export function submitReportToAdmin(id) {
  return request(`/api/reports/${id}/submit`, {
    method: "POST",
  });
}

export function unsubmitReport(id) {
  return request(`/api/reports/${id}/unsubmit`, {
    method: "POST",
  });
}

export function getFacultyReports() {
  return request("/api/reports/faculty/my-reports").then((data) => data.reports || []);
}

export function updateFacultyProfile(name) {
  return request("/api/auth/update-profile", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function downloadReportFile(reportId, reportName = "report") {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/reports/download-file/${reportId}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error("Download failed");
  }
  const blob = await response.blob();
  return { blob, suggestedName: `${reportName}.xlsx` };
}

export function logout() {
  clearToken();
  localStorage.removeItem("coas-user");
  localStorage.removeItem("role");
  localStorage.removeItem("userId");
  localStorage.removeItem("userName");
}

export function getMe() {
  return request("/api/auth/me").then((data) => data.user);
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
