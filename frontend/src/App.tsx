import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ProjectList from './features/projects/ProjectList';
import ProjectCreate from './features/projects/ProjectCreate';
import ProjectDetail, { OverviewTab, PlaceholderTab } from './features/projects/ProjectDetail';
import DocumentsTab from './features/workflow/DocumentsTab';
import InputsTab from './features/workflow/InputsTab';
import VaultView from './features/vault/VaultView';
import AIAssistant from './features/chat/AIAssistant';

function Layout() {
  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#FFFFFF' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/new" element={<ProjectCreate />} />
          <Route path="/projects/:id" element={<ProjectDetail />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<OverviewTab />} />
            <Route path="documents" element={<DocumentsTab />} />
            <Route path="inputs" element={<InputsTab />} />
            <Route path="modules" element={<PlaceholderTab />} />
            <Route path="review" element={<PlaceholderTab />} />
            <Route path="report" element={<PlaceholderTab />} />
          </Route>
          <Route path="/vault" element={<VaultView />} />
          <Route path="/chat" element={<AIAssistant />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
