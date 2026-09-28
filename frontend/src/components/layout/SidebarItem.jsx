import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export function SidebarItem({ to, icon: Icon, label, collapsed = false, onNavigate }) {
  const location = useLocation();
  
  const active = (() => {
    try {
      const toUrl = new URL(to, window.location.origin);
      if (location.pathname !== toUrl.pathname) return false;
      
      const targetTab = toUrl.searchParams.get("tab");
      const currentTab = new URLSearchParams(location.search).get("tab");
      
      if (targetTab) {
        return currentTab === targetTab;
      }
      return !currentTab || currentTab === "overview";
    } catch {
      return location.pathname === to;
    }
  })();

  return (
    <Link
      to={to}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={cn(
        "sidebar-link group relative flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium outline-none",
        collapsed ? "justify-center" : "gap-3",
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
}
