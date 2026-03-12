import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, BookOpen, FolderKanban, Bot,
  ChevronDown, Search, Users, ClipboardList, Database,
  Brain, Radar, GraduationCap, Building2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  requiredPermission?: "hasGlobalAccess";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { icon: Bot, label: "Expert AI", path: "/ai-chat" },
      { icon: Search, label: "Research", path: "/research" },
      { icon: Brain, label: "Knowledge", path: "/knowledge" },
    ],
  },
  {
    label: "Toolkit",
    items: [
      { icon: Briefcase, label: "Tool Library", path: "/tools" },
      { icon: ClipboardList, label: "Assessments", path: "/assessments" },
      { icon: Database, label: "Data Room", path: "/data-room" },
      { icon: BookOpen, label: "Runbooks", path: "/runbooks" },
    ],
  },
  {
    label: "Delivery",
    items: [
      { icon: FolderKanban, label: "Projects", path: "/projects" },
    ],
  },
  {
    label: "Health & Insights",
    items: [
      { icon: Radar, label: "Benchmarking", path: "/benchmarking" },
      { icon: GraduationCap, label: "Skill Gap", path: "/skill-gap", requiredPermission: "hasGlobalAccess" },
      { icon: Users, label: "Team", path: "/team", requiredPermission: "hasGlobalAccess" },
    ],
  },
];

function SidebarNavGroup({
  group, collapsed, hasGlobalAccess,
}: { group: NavGroup; collapsed: boolean; hasGlobalAccess: boolean }) {
  const [open, setOpen] = useState(true);
  const location = useLocation();

  const filteredItems = group.items.filter((item) => {
    if (!item.requiredPermission) return true;
    if (item.requiredPermission === "hasGlobalAccess") return hasGlobalAccess;
    return true;
  });

  if (filteredItems.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {!collapsed && (
        <button
          onClick={() => setOpen(!open)}
          className="group flex w-full items-center justify-between px-3 py-1 mb-0.5"
        >
          <span className="text-[10px] font-semibold tracking-widest uppercase text-sidebar-foreground/35 group-hover:text-sidebar-foreground/55 transition-colors">
            {group.label}
          </span>
          <ChevronDown className={cn("h-3 w-3 text-sidebar-foreground/25 transition-transform duration-200", !open && "-rotate-90")} />
        </button>
      )}
      {(open || collapsed) && (
        <div className="space-y-0.5">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-md px-3 py-[7px] text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-full bg-sidebar-primary" />
                )}
                <item.icon className={cn("h-[15px] w-[15px] shrink-0", collapsed && "h-[18px] w-[18px]", isActive && "text-sidebar-primary")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs font-medium rounded-md border border-border shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { hasGlobalAccess } = useUserRole();

  return (
    <aside className={cn("fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar transition-all duration-300", collapsed ? "w-[72px]" : "w-64")}>
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        {collapsed ? (
          <div className="flex h-9 w-9 items-center justify-center">
            <span className="text-lg font-bold text-sidebar-accent-foreground">aX</span>
          </div>
        ) : (
          <img alt="aXet consult" className="h-8" src="/lovable-uploads/3719f63a-7253-4d1d-9213-327c9940cd39.png" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <SidebarNavGroup key={group.label} group={group} collapsed={collapsed} hasGlobalAccess={hasGlobalAccess} />
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}