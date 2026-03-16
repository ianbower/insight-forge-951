import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, BookOpen, FolderKanban, Bot,
  ChevronDown, Search, Users, ClipboardList, Database,
  Brain, Radar, GraduationCap, ChevronLeft, ChevronRight, GaugeCircle, BarChart3,
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
      { icon: BarChart3, label: "Maturity Dashboards", path: "/maturity-dashboards" },
      { icon: GaugeCircle, label: "Auto AI Maturity", path: "/assets/automotive-ai-maturity" },
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
          className="group mb-1 flex w-full items-center justify-between px-3 py-1"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sidebar-foreground/35 transition-colors group-hover:text-sidebar-foreground/55">
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
                  "group relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-white text-sidebar-background shadow-[0_20px_40px_-28px_rgba(0,0,0,0.8)]"
                    : "text-sidebar-foreground hover:bg-white/8 hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", collapsed && "h-[18px] w-[18px]", isActive && "text-primary")} />
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

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function AppSidebar({ collapsed, onToggleCollapsed }: AppSidebarProps) {
  const { hasGlobalAccess } = useUserRole();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border navy-panel transition-all duration-300 lg:flex",
        collapsed ? "w-[88px]" : "w-72",
      )}
    >
      <div className="hero-grid absolute inset-0 opacity-40" />
      <div className="relative flex h-20 items-center border-b border-sidebar-border px-5">
        {collapsed ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <span className="text-sm font-semibold tracking-[0.24em] text-sidebar-accent-foreground">IF</span>
          </div>
        ) : (
          <div className="space-y-1">
            
            <img alt="aXet Consult" className="h-9" src="/lovable-uploads/3719f63a-7253-4d1d-9213-327c9940cd39.png" />
          </div>
        )}
      </div>

      <nav className="relative flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {navGroups.map((group) => (
          <SidebarNavGroup key={group.label} group={group} collapsed={collapsed} hasGlobalAccess={hasGlobalAccess} />
        ))}
      </nav>

      <div className="relative border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapsed}
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
