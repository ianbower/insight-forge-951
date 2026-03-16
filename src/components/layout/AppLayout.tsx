import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((value) => !value)} />
      <div className={`transition-all duration-300 ${collapsed ? "lg:ml-[88px]" : "lg:ml-72"}`}>
        <TopBar />
        <main className="px-4 pb-8 pt-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
