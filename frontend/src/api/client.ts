const BASE = "/api/v1";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

// Projects
export const getProjects = () => request<any[]>("/projects");
export const createProject = (data: { name: string; address?: string; client_name?: string; selected_modules?: string[] }) =>
  request<any>("/projects", { method: "POST", body: JSON.stringify(data) });
export const getProject = (id: string) => request<any>(`/projects/${id}`);
export const updateProject = (id: string, data: any) =>
  request<any>(`/projects/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteProject = (id: string) =>
  request<any>(`/projects/${id}`, { method: "DELETE" });

// Documents
export const getDocuments = (projectId: string) =>
  request<any[]>(`/projects/${projectId}/documents`);
export const deleteDocument = (docId: string) =>
  request<any>(`/documents/${docId}`, { method: "DELETE" });
export const downloadDocumentUrl = (docId: string) =>
  `${BASE}/documents/${docId}/download`;
export const updateDocumentType = (docId: string, documentType: string) =>
  request<any>(`/documents/${docId}`, {
    method: "PUT",
    body: JSON.stringify({ document_type: documentType }),
  });

// Inputs
export const getInputs = (projectId: string) =>
  request<any>(`/projects/${projectId}/inputs`);
export const saveInput = (projectId: string, inputType: string, data: any) =>
  request<any>(`/projects/${projectId}/inputs`, {
    method: "POST",
    body: JSON.stringify({ input_type: inputType, data }),
  });

// Modules
export const getModules = (projectId: string) =>
  request<any[]>(`/projects/${projectId}/modules`);
export const runModules = (projectId: string) =>
  request<any>(`/projects/${projectId}/run-modules`, { method: "POST" });
export const getModuleProgress = (projectId: string) =>
  request<any>(`/projects/${projectId}/modules/progress`);

// Missing documents
export const getMissingDocuments = (projectId: string) =>
  request<any>(`/projects/${projectId}/missing-documents`);

// DD Gap analysis
export const getGapsSummary = (projectId: string) =>
  request<any>(`/projects/${projectId}/gaps/summary`);

// Reconciliation
export const runReconciliation = (projectId: string) =>
  request<any>(`/projects/${projectId}/reconcile`, { method: "POST" });

// Reports
export const generateReport = (projectId: string) =>
  request<any>(`/projects/${projectId}/reports`, { method: "POST" });
export const getReports = (projectId: string) =>
  request<any[]>(`/projects/${projectId}/reports`);
export const downloadReportUrl = (projectId: string, reportId: string) =>
  `${BASE}/projects/${projectId}/reports/${reportId}/download`;

// Chat
export const sendChatMessage = (data: {
  project_id: string;
  message: string;
  history: { role: string; content: string }[];
}) => request<any>("/chat", { method: "POST", body: JSON.stringify(data) });
