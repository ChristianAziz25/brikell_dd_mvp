const BASE = '/api/v1';

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function getProjects() {
  return request('/projects');
}

export function createProject(data: Record<string, unknown>) {
  return request('/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function getProject(id: string) {
  return request(`/projects/${id}`);
}

export function updateProject(id: string, data: Record<string, unknown>) {
  return request(`/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function deleteProject(id: string) {
  return request(`/projects/${id}`, {
    method: 'DELETE',
  });
}
