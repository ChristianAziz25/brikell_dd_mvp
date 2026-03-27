import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ProjectList from './features/projects/ProjectList';
import VaultView from './features/vault/VaultView';
import AIAssistant from './features/chat/AIAssistant';

function Layout() {
  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectList />} />
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
