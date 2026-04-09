import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProjects } from "@/api/client";
import { Plus, Building2 } from "lucide-react";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:     { bg: "#f3f4f6", text: "#6b7280" },
  running:   { bg: "#f3f4f6", text: "#374151" },
  review:    { bg: "#f3f4f6", text: "#374151" },
  completed: { bg: "#111827", text: "#ffffff" },
  error:     { bg: "#fef2f2", text: "#ef4444" },
};

export default function ProjectList() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getProjects().then(setProjects).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 256 }}>
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-gray-800" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 500 }}>Workflows</h2>
        <button
          onClick={() => navigate("/new")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 13, cursor: "pointer" }}
        >
          <Plus size={15} />
          New assignment
        </button>
      </div>

      {projects.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "var(--color-text-tertiary)" }}>
          <Building2 size={40} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>No assignments yet</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Create your first due diligence assignment</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {projects.map(p => {
            const sc = STATUS_COLORS[p.status] || STATUS_COLORS.draft;
            return (
              <div
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "18px 20px", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", flex: 1, marginRight: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.address || p.name}</div>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: sc.bg, color: sc.text, flexShrink: 0 }}>{p.status}</span>
                </div>
                {p.address && p.name !== p.address && <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>}
                <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 10 }}>{new Date(p.created_at).toLocaleDateString("da-DK")}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
