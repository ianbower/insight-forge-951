import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import ProjectOutputs from "@/pages/ProjectOutputs";
import ProjectStatus from "@/pages/ProjectStatus";
import StepPage from "@/pages/StepPage";
import ToolLibrary from "@/pages/ToolLibrary";
import Runbooks from "@/pages/Runbooks";
import RunbookDesigner from "@/pages/RunbookDesigner";
import ExpertAI from "@/pages/ExpertAI";
import Research from "@/pages/Research";
import Team from "@/pages/Team";
import Admin from "@/pages/Admin";
import Assessments from "@/pages/Assessments";
import AssessmentRespond from "@/pages/AssessmentRespond";
import AssessmentPreview from "@/pages/AssessmentPreview";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes - no layout */}
          <Route path="/assess/:token" element={<AssessmentRespond />} />
          <Route path="/assessments/preview/:templateId" element={<AssessmentPreview />} />
          
          {/* App routes with layout */}
          <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/research" element={<AppLayout><Research /></AppLayout>} />
          <Route path="/projects" element={<AppLayout><Projects /></AppLayout>} />
          <Route path="/projects/:projectId" element={<AppLayout><ProjectDetail /></AppLayout>} />
          <Route path="/projects/:projectId/outputs" element={<AppLayout><ProjectOutputs /></AppLayout>} />
          <Route path="/projects/:projectId/status" element={<AppLayout><ProjectStatus /></AppLayout>} />
          <Route path="/projects/:projectId/steps/:stepId" element={<AppLayout><StepPage /></AppLayout>} />
          <Route path="/tools" element={<AppLayout><ToolLibrary /></AppLayout>} />
          <Route path="/tools/:toolId" element={<AppLayout><ToolLibrary /></AppLayout>} />
          <Route path="/runbooks" element={<AppLayout><Runbooks /></AppLayout>} />
          <Route path="/runbooks/design/:id" element={<AppLayout><RunbookDesigner /></AppLayout>} />
          <Route path="/ai-chat" element={<AppLayout><ExpertAI /></AppLayout>} />
          <Route path="/team" element={<AppLayout><Team /></AppLayout>} />
          <Route path="/assessments" element={<AppLayout><Assessments /></AppLayout>} />
          <Route path="/admin" element={<AppLayout><Admin /></AppLayout>} />
          <Route path="*" element={<AppLayout><NotFound /></AppLayout>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
