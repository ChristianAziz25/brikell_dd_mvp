import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import ProjectDetail from "./features/projects/ProjectDetail";
import DocumentsTab from "./features/workflow/DocumentsTab";
import InputsTab from "./features/workflow/InputsTab";
import ModulesTab from "./features/workflow/ModulesTab";
import ReviewTab from "./features/workflow/ReviewTab";
import ReportTab from "./features/workflow/ReportTab";
import ProjectCreate from "./features/projects/ProjectCreate";
import VaultView from "./features/vault/VaultView";
import VaultDocuments from "./features/vault/VaultDocuments";
import AIAssistant from "./features/chat/AIAssistant";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-white">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-white p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/new" replace />} />
            <Route path="/new" element={<ProjectCreate />} />
            <Route path="/projects" element={<Navigate to="/new" replace />} />
            <Route path="/projects/:id" element={<ProjectDetail />}>
              <Route index element={<Navigate to="documents" replace />} />
              <Route path="documents" element={<DocumentsTab />} />
              <Route path="inputs" element={<InputsTab />} />
              <Route path="modules" element={<ModulesTab />} />
              <Route path="review" element={<ReviewTab />} />
              <Route path="report" element={<ReportTab />} />
            </Route>
            <Route path="/vault" element={<VaultView />} />
            <Route path="/vault/:id/documents" element={<VaultDocuments />} />
            <Route path="/chat" element={<AIAssistant />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
