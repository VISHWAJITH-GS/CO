import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  BarChart3,
  Settings,
  UserRound,
  ChevronsLeft,
  ChevronsRight,
  X,
  ChevronDown,
  ChevronRight,
  Users,
  Activity,
  BookOpen,
  UserCheck,
  FileSpreadsheet
} from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { SidebarItem } from "./SidebarItem";

function SidebarContent({ user, collapsed = false, onClose, onToggleCollapse, desktop = false }) {
  const isAdmin = user?.role === "admin";
  const location = useLocation();
  const [facultyOpen, setFacultyOpen] = useState(true);
  const [courseOpen, setCourseOpen] = useState(true);

  const isLinkActive = (toPath, tabName) => {
    if (tabName) {
      return location.pathname === toPath && location.search.includes(`tab=${tabName}`);
    }
    if (toPath === "/admin/dashboard") {
      return location.pathname === toPath && (!location.search || location.search.includes("tab=overview"));
    }
    return location.pathname === toPath;
  };

  const renderSubItem = (to, Icon, label, tab) => {
    const active = isLinkActive(to, tab);
    return (
      <Link
        key={label}
        to={to + (tab ? `?tab=${tab}` : "")}
        onClick={onClose}
        title={collapsed ? label : undefined}
        className={cn(
          "sidebar-link group relative flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 outline-none",
          collapsed ? "justify-center" : "pl-8 gap-3",
          active
            ? "bg-red-100 text-red-900"
            : "text-slate-700 hover:bg-red-50 hover:text-red-900"
        )}
      >

        <motion.span
          animate={{ scale: active ? 1.08 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="shrink-0"
        >
          <Icon size={18} />
        </motion.span>

        <span
          className={cn(
            "overflow-hidden whitespace-nowrap transition-all duration-300",
            collapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"
          )}
        >
          {label}
        </span>
      </Link>
    );
  };

  const renderGroupHeader = (label, Icon, isOpen, setIsOpen) => {
    if (collapsed) return null;
    return (
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-900 hover:text-slate-700 mt-4 mb-1"
      >
        <div className="flex items-center gap-2">
          <Icon size={14} />
          <span>{label}</span>
        </div>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className={cn("group border-b border-red-100 px-4 py-3", collapsed && "px-2")}>
        {collapsed ? (
          <div className="flex items-center justify-center py-2">
            <div className="group relative grid h-10 w-10 place-items-center">
              <img
                src="/tce-logov2.png"
                alt="TCE ICON"
                className="h-9 w-auto transition-opacity duration-200 group-hover:opacity-0 group-focus-within:opacity-0"
              />
              {desktop && (
                <Button
                  variant="ghost"
                  className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 bg-transparent p-0 text-slate-700 opacity-0 transition-all duration-200 hover:bg-red-50 hover:text-red-900 focus-visible:bg-red-50 focus-visible:text-red-900 group-hover:opacity-100 group-focus-within:opacity-100"
                  onClick={onToggleCollapse}
                  aria-label="Expand sidebar"
                >
                  <ChevronsRight size={16} />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <img src="/tce-logov2.png" alt="TCE ICON" className="h-12 w-auto" />
              <p className="mt-1 truncate text-xs font-semibold uppercase tracking-[0.18em] text-red-700/80">TCE COAS</p>
            </div>
            {desktop && (
              <Button
                variant="ghost"
                className="h-8 w-8 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
              >
                <ChevronsLeft size={16} />
              </Button>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 no-scrollbar">
        {isAdmin ? (
          <>
            {/* Overview / Dashboard */}
            <SidebarItem
              to="/admin/dashboard?tab=overview"
              icon={Home}
              label="Dashboard"
              collapsed={collapsed}
              onNavigate={onClose}
            />

            {/* Faculty Group */}
            {renderGroupHeader("Faculty", Users, facultyOpen, setFacultyOpen)}
            {(facultyOpen || collapsed) && (
              <div className={cn("space-y-1", !collapsed && "mt-1")}>
                {renderSubItem("/admin/dashboard", Users, "Faculty Management", "faculty_mgmt")}
                {renderSubItem("/admin/dashboard", Activity, "Activity Audit", "logs")}
              </div>
            )}

            {/* Course Group */}
            {renderGroupHeader("Course", BookOpen, courseOpen, setCourseOpen)}
            {(courseOpen || collapsed) && (
              <div className={cn("space-y-1", !collapsed && "mt-1")}>
                {renderSubItem("/admin/dashboard", BookOpen, "Course Management", "courses")}
                {renderSubItem("/admin/dashboard", UserCheck, "Course Assignment", "assignments")}
              </div>
            )}

            {/* Reports Link */}
            <SidebarItem
              to="/admin/dashboard?tab=reports"
              icon={FileSpreadsheet}
              label="Reports"
              collapsed={collapsed}
              onNavigate={onClose}
            />

            {/* General Links */}
            {!collapsed && <div className="border-t border-slate-100 my-4 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-400 px-3">General</div>}
            <SidebarItem
              to="/profile"
              icon={UserRound}
              label="Profile"
              collapsed={collapsed}
              onNavigate={onClose}
            />
            <SidebarItem
              to="/settings"
              icon={Settings}
              label="Settings"
              collapsed={collapsed}
              onNavigate={onClose}
            />
          </>
        ) : (
          // Faculty Navigation
          <>
            <SidebarItem
              to="/faculty/dashboard"
              icon={Home}
              label="Dashboard"
              collapsed={collapsed}
              onNavigate={onClose}
            />
            <SidebarItem
              to="/profile"
              icon={UserRound}
              label="Profile"
              collapsed={collapsed}
              onNavigate={onClose}
            />
            <SidebarItem
              to="/reports"
              icon={BarChart3}
              label="Reports"
              collapsed={collapsed}
              onNavigate={onClose}
            />
            <SidebarItem
              to="/settings"
              icon={Settings}
              label="Settings"
              collapsed={collapsed}
              onNavigate={onClose}
            />
          </>
        )}
      </nav>
    </div>
  );
}

export function Sidebar({ user, open, onClose, collapsed = false, onToggleCollapse }) {
  return (
    <>
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-24 z-30 hidden border-r border-red-100 bg-white transition-[width] duration-300 md:top-20 md:block",
          collapsed ? "w-[70px]" : "w-[240px]"
        )}
      >
        <SidebarContent user={user} collapsed={collapsed} onToggleCollapse={onToggleCollapse} desktop />
      </aside>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 top-24 z-40 bg-black/30 transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed bottom-0 left-0 top-24 z-50 w-[280px] border-r border-red-100 bg-white shadow-xl transition-transform md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-end px-3 py-3">
          <Button variant="ghost" size="default" onClick={onClose} aria-label="Close sidebar">
            <X size={18} />
          </Button>
        </div>
        <SidebarContent user={user} onClose={onClose} />
      </aside>
    </>
  );
}