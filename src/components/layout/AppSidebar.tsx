import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Briefcase, BookOpen, FolderKanban, Bot, Settings, ChevronLeft, ChevronRight, Search, Users, ClipboardList } from "lucide-react";
import axetLogo from "@/assets/axet-consult-logo.png";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
const navItems = [{
  icon: LayoutDashboard,
  label: "Dashboard",
  path: "/"
}, {
  icon: Bot,
  label: "Expert AI",
  path: "/ai-chat"
}, {
  icon: Search,
  label: "Research",
  path: "/research"
}, {
  icon: Briefcase,
  label: "Tool Library",
  path: "/tools"
}, {
  icon: ClipboardList,
  label: "Assessments",
  path: "/assessments"
}, {
  icon: BookOpen,
  label: "Runbooks",
  path: "/runbooks"
}, {
  icon: FolderKanban,
  label: "Projects",
  path: "/projects"
}, {
  icon: Users,
  label: "Team",
  path: "/team"
}, {
  icon: Settings,
  label: "Admin",
  path: "/admin"
}];
export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  return <aside className={cn("fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar transition-all duration-300", collapsed ? "w-[72px]" : "w-64")}>
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        {collapsed ? <div className="flex h-9 w-9 items-center justify-center">
            <span className="text-lg font-bold text-sidebar-accent-foreground">aX</span>
          </div> : <img alt="aXet consult" className="h-8" src="/lovable-uploads/3719f63a-7253-4d1d-9213-327c9940cd39.png" />}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(item => {
        const isActive = location.pathname === item.path;
        return <NavLink key={item.path} to={item.path} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200", isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground")}>
              <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-sidebar-primary")} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>;
      })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-sidebar-border p-3">
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="w-full justify-center text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>}
        </Button>
      </div>
    </aside>;
}