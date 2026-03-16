import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { UserRoleProvider } from "@/hooks/useUserRole";
import { CurrencyProvider } from "@/hooks/useCurrency";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
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
import AssessmentTake from "@/pages/AssessmentTake";
import ProfileSettings from "@/pages/ProfileSettings";
import Documentation from "@/pages/Documentation";
import DataRoom from "@/pages/DataRoom";
import KnowledgeMining from "@/pages/KnowledgeMining";
import SmartBenchmarking from "@/pages/SmartBenchmarking";
import SkillGap from "@/pages/SkillGap";
import ClientPortal from "@/pages/ClientPortal";
import AutomotiveAIMaturity from "@/pages/AutomotiveAIMaturity";
import MaturityDashboards from "@/pages/MaturityDashboards";
import MaturityDashboard from "@/pages/MaturityDashboard";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <UserRoleProvider>
        <CurrencyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes - no layout */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/assess/:token" element={<AssessmentRespond />} />
                <Route path="/assessments/preview/:templateId" element={<AssessmentPreview />} />
                <Route path="/portal/:token" element={<ClientPortal />} />
                
                {/* Protected routes with layout */}
                <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
                <Route path="/research" element={<ProtectedRoute><AppLayout><Research /></AppLayout></ProtectedRoute>} />
                <Route path="/knowledge" element={<ProtectedRoute><AppLayout><KnowledgeMining /></AppLayout></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute><AppLayout><Projects /></AppLayout></ProtectedRoute>} />
                <Route path="/projects/:projectId" element={<ProtectedRoute><AppLayout><ProjectDetail /></AppLayout></ProtectedRoute>} />
                <Route path="/projects/:projectId/outputs" element={<ProtectedRoute><AppLayout><ProjectOutputs /></AppLayout></ProtectedRoute>} />
                <Route path="/projects/:projectId/status" element={<ProtectedRoute><AppLayout><ProjectStatus /></AppLayout></ProtectedRoute>} />
                <Route path="/projects/:projectId/steps/:stepId" element={<ProtectedRoute><AppLayout><StepPage /></AppLayout></ProtectedRoute>} />
                <Route path="/tools" element={<ProtectedRoute><AppLayout><ToolLibrary /></AppLayout></ProtectedRoute>} />
                <Route path="/tools/:toolId" element={<ProtectedRoute><AppLayout><ToolLibrary /></AppLayout></ProtectedRoute>} />
                <Route path="/runbooks" element={<ProtectedRoute><AppLayout><Runbooks /></AppLayout></ProtectedRoute>} />
                <Route path="/runbooks/design/:id" element={<ProtectedRoute><AppLayout><RunbookDesigner /></AppLayout></ProtectedRoute>} />
                <Route path="/ai-chat" element={<ProtectedRoute><AppLayout><ExpertAI /></AppLayout></ProtectedRoute>} />
                <Route path="/team" element={<ProtectedRoute><AppLayout><Team /></AppLayout></ProtectedRoute>} />
                <Route path="/assessments" element={<ProtectedRoute><AppLayout><Assessments /></AppLayout></ProtectedRoute>} />
                <Route path="/assessments/take/:token" element={<ProtectedRoute><AppLayout><AssessmentTake /></AppLayout></ProtectedRoute>} />
                <Route path="/data-room" element={<ProtectedRoute><AppLayout><DataRoom /></AppLayout></ProtectedRoute>} />
                <Route path="/benchmarking" element={<ProtectedRoute><AppLayout><SmartBenchmarking /></AppLayout></ProtectedRoute>} />
                <Route path="/assets/automotive-ai-maturity" element={<ProtectedRoute><AppLayout><AutomotiveAIMaturity /></AppLayout></ProtectedRoute>} />
                <Route path="/maturity-dashboards" element={<ProtectedRoute><AppLayout><MaturityDashboards /></AppLayout></ProtectedRoute>} />
                <Route path="/maturity-dashboards/:id" element={<ProtectedRoute><AppLayout><MaturityDashboard /></AppLayout></ProtectedRoute>} />
                <Route path="/skill-gap" element={<ProtectedRoute><AppLayout><SkillGap /></AppLayout></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AppLayout><Admin /></AppLayout></ProtectedRoute>} />
                <Route path="/documentation" element={<ProtectedRoute><AppLayout><Documentation /></AppLayout></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
                <Route path="*" element={<AppLayout><NotFound /></AppLayout>} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CurrencyProvider>
      </UserRoleProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
