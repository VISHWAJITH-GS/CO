import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Navbar } from "./components/layout/Navbar";
import { Sidebar } from "./components/layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import SubjectWorkspace from "./pages/SubjectWorkspace";
import AdminDashboard from "./pages/AdminDashboard";
import { logout, getMe } from "./lib/api";

/** Wraps the nested Outlet with AnimatePresence keyed on location */
function AnimatedOutlet() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      {/* Outlet is re-mounted when the key (pathname) changes */}
      <Outlet key={location.pathname} />
    </AnimatePresence>
  );
}

function DashboardLayout({ user, onLogout }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        user={user}
        onMenuClick={() => setSidebarOpen(true)}
        onOpenProfile={() => navigate("/profile")}
        onOpenSettings={() => navigate("/settings")}
        onLogout={onLogout}
      />

      <div className="pt-24 md:pt-20">
        <Sidebar
          user={user}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />

        <main
          className={
            `h-[calc(100vh-6rem)] md:h-[calc(100vh-5rem)] min-w-0 overflow-y-auto transition-[margin] duration-300 ${
              sidebarCollapsed ? "md:ml-[70px]" : "md:ml-[240px]"
            }`
          }
        >
          {/* AnimatedOutlet handles page transitions within the dashboard shell */}
          <AnimatedOutlet />
        </main>
      </div>
    </div>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const cachedUser = localStorage.getItem("coas-user");
    if (cachedUser) {
      try {
        return JSON.parse(cachedUser);
      } catch {
        localStorage.removeItem("coas-user");
      }
    }
    return null;
  });

  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("coas-token");
    if (token) {
      getMe()
        .then((user) => {
          setCurrentUser(user);
          localStorage.setItem("coas-user", JSON.stringify(user));
          localStorage.setItem("role", user.role);
          localStorage.setItem("userId", user.id);
          localStorage.setItem("userName", user.full_name || "");
        })
        .catch(() => {
          handleLogout();
        });
    } else {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      setCurrentUser(null);
      logout();
    };

    window.addEventListener("coas-auth-expired", handleAuthExpired);
    return () => window.removeEventListener("coas-auth-expired", handleAuthExpired);
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem("coas-user", JSON.stringify(user));
    localStorage.setItem("role", user.role);
    localStorage.setItem("userId", user.id);
    localStorage.setItem("userName", user.full_name || "");
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          currentUser ? (
            currentUser.role === "admin" ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <Navigate to="/faculty/dashboard" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route
        element={
          <DashboardLayout
            user={currentUser}
            onLogout={handleLogout}
          />
        }
      >
        <Route
          path="/admin/dashboard"
          element={
            currentUser?.role === "admin" ? (
              <AdminDashboard user={currentUser} />
            ) : (
              <Navigate to="/faculty/dashboard" replace />
            )
          }
        />
        <Route
          path="/faculty/dashboard"
          element={
            currentUser?.role === "faculty" ? (
              <Dashboard user={currentUser} />
            ) : (
              <Navigate to="/admin/dashboard" replace />
            )
          }
        />
        <Route path="/subjects" element={<SubjectWorkspace user={currentUser} />} />
        <Route path="/subjects/:subjectCode/workspace" element={<SubjectWorkspace user={currentUser} />} />
        <Route path="/profile" element={<Profile user={currentUser} />} />
        <Route path="/reports" element={<Reports user={currentUser} />} />
        <Route path="/settings" element={<Settings user={currentUser} />} />
      </Route>
    </Routes>
  );
}

export default App;
