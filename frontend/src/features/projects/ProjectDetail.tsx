import { useEffect, useState } from "react";
import { useParams, Outlet, Navigate, useOutletContext } from "react-router-dom";
import { getProject } from "@/api/client";
import WorkflowStepper from "@/components/WorkflowStepper";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export type ProjectContext = { project: any; reload: () => void };

export function useProjectContext() {
  return useOutletContext<ProjectContext>();
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!id) return;
    setLoading(true);
    getProject(id)
      .then(setProject)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-gray-700" />
      </div>
    );
  }

  if (!project) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate("/projects")}
          style={{ color: "var(--color-text-tertiary)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}>{project.name}</h2>
          {project.address && (
            <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>{project.address}</p>
          )}
        </div>
      </div>
      <WorkflowStepper />
      <Outlet context={{ project, reload: load } satisfies ProjectContext} />
    </div>
  );
}
