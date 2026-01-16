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
import AssessmentBuilder from "@/pages/AssessmentBuilder";
import AssessmentLaunch from "@/pages/AssessmentLaunch";
import AssessmentResponse from "@/pages/AssessmentResponse";
import AssessmentResults from "@/pages/AssessmentResults";
import AssessmentTake from "@/pages/AssessmentTake";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// App component
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public route for assessment responses - no AppLayout */}
          <Route path="/assess/:token" element={<AssessmentResponse />} />
          
          {/* App routes with layout */}
          <Route path="/*" element={
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/research" element={<Research />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:projectId" element={<ProjectDetail />} />
                <Route path="/projects/:projectId/outputs" element={<ProjectOutputs />} />
                <Route path="/projects/:projectId/status" element={<ProjectStatus />} />
                <Route path="/projects/:projectId/steps/:stepId" element={<StepPage />} />
                <Route path="/tools" element={<ToolLibrary />} />
                <Route path="/tools/:toolId" element={<ToolLibrary />} />
                <Route path="/runbooks" element={<Runbooks />} />
                <Route path="/runbooks/design/:id" element={<RunbookDesigner />} />
                <Route path="/assessments" element={<Assessments />} />
                <Route path="/assessments/:assessmentId/builder" element={<AssessmentBuilder />} />
                <Route path="/assessments/:assessmentId/launch" element={<AssessmentLaunch />} />
                <Route path="/assessments/:assessmentId/launch/:instanceId" element={<AssessmentLaunch />} />
                <Route path="/assessments/:assessmentId/take/:instanceId" element={<AssessmentTake />} />
                <Route path="/assessments/:assessmentId/results/:instanceId" element={<AssessmentResults />} />
                <Route path="/ai-chat" element={<ExpertAI />} />
                <Route path="/team" element={<Team />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
