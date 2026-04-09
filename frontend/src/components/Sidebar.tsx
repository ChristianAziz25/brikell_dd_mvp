import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { MessageSquare, Plus, Archive, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { getProjects } from "@/api/client";

const VAULT_DOCUMENTS = [
  "BBR Extract",
  "Local Plan (Lokalplan)",
  "Rent Roll",
  "Annual Accounts",
  "Energy Certificate",
  "Tingbogsattest",
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const projectMatch = location.pathname.match(/^\/projects\/([^/]+)/);
  const activeProjectId = projectMatch ? projectMatch[1] : null;
  const [projects, setProjects] = useState<any[]>([]);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [openProperties, setOpenProperties] = useState<Record<string, boolean>>({});

  const vaultActive = useMemo(() => location.pathname.startsWith("/vault"), [location.pathname]);

  useEffect(() => {
    if (vaultOpen) {
      getProjects().then(setProjects).catch(() => {});
    }
  }, [vaultOpen]);

  const toggleProperty = (projectId: string) => {
    setOpenProperties((prev) => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);

  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--color-border-tertiary, #e5e7eb)",
        background: "var(--color-background-primary, #ffffff)",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--color-border-tertiary, #e5e7eb)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-primary, #111827)" }}>
          Brikell
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary, #9ca3af)", marginTop: 2 }}>
          Due Diligence Platform
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: 8, overflowY: "auto" }}>
        {/* AI Assistant */}
        <NavLink
          to="/chat"
          style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 20px",
            fontSize: 13,
            textDecoration: "none",
            color: isActive ? "var(--color-text-primary, #111827)" : "var(--color-text-tertiary, #9ca3af)",
            background: isActive ? "var(--color-background-secondary, #f3f4f6)" : "transparent",
            borderRight: isActive ? "2px solid var(--color-text-primary, #111827)" : "2px solid transparent",
          })}
        >
          <MessageSquare size={15} strokeWidth={1.5} />
          <span>AI Assistant</span>
        </NavLink>

        {/* Workflows — goes to /new */}
        <NavLink
          to="/new"
          style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 20px",
            fontSize: 13,
            textDecoration: "none",
            color: isActive ? "var(--color-text-primary, #111827)" : "var(--color-text-tertiary, #9ca3af)",
            background: isActive ? "var(--color-background-secondary, #f3f4f6)" : "transparent",
            borderRight: isActive ? "2px solid var(--color-text-primary, #111827)" : "2px solid transparent",
          })}
        >
          <Plus size={15} strokeWidth={1.5} />
          <span>Workflows</span>
        </NavLink>

        {/* Vault (expandable) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 20px",
            fontSize: 13,
            color: vaultActive ? "var(--color-text-primary, #111827)" : "var(--color-text-tertiary, #9ca3af)",
            background: vaultActive ? "var(--color-background-secondary, #f3f4f6)" : "transparent",
            borderRight: vaultActive ? "2px solid var(--color-text-primary, #111827)" : "2px solid transparent",
            cursor: "pointer",
            userSelect: "none",
          }}
          onClick={() => {
            setVaultOpen((v) => !v);
            navigate("/vault");
          }}
        >
          <Archive size={15} strokeWidth={1.5} />
          <span>Vault</span>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
            {vaultOpen ? <ChevronDown size={12} strokeWidth={1.5} /> : <ChevronRight size={12} strokeWidth={1.5} />}
          </span>
        </div>

        {/* Vault sub-items */}
        <div
          style={{
            maxHeight: vaultOpen ? 600 : 0,
            opacity: vaultOpen ? 1 : 0,
            overflow: "hidden",
            transition: "max-height 180ms ease, opacity 180ms ease",
          }}
        >
          <div
            style={{
              marginLeft: 20,
              borderLeft: "0.5px solid var(--color-border-tertiary, #e5e7eb)",
              paddingLeft: 20,
              paddingTop: 4,
              paddingBottom: 4,
            }}
          >
            {vaultOpen && projects.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 20px",
                  paddingLeft: 20,
                  fontSize: 12,
                  color: "var(--color-text-tertiary, #9ca3af)",
                }}
              >
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "var(--color-text-tertiary, #9ca3af)",
                    flexShrink: 0,
                  }}
                />
                <span>No projects yet</span>
              </div>
            ) : (
              projects.map((project) => {
                const displayName = project?.address || project?.name || "Untitled";
                const label = truncate(displayName, 26);
                const isPropertyOpen = openProperties[project.id] ?? false;

                return (
                  <div key={project.id}>
                    {/* Property row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "9px 20px",
                        paddingLeft: 20,
                        fontSize: 13,
                        cursor: "pointer",
                        userSelect: "none",
                        color: activeProjectId === project.id
                          ? "var(--color-text-secondary, #6b7280)"
                          : "var(--color-text-tertiary, #9ca3af)",
                        background: activeProjectId === project.id
                          ? "var(--color-background-secondary, #f3f4f6)"
                          : "transparent",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProperty(project.id);
                      }}
                    >
                      <span
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background: "var(--color-text-tertiary, #9ca3af)",
                          flexShrink: 0,
                        }}
                      />
                      <NavLink
                        to={`/vault/${project.id}/documents`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          textDecoration: "none",
                          color: "inherit",
                          flex: 1,
                        }}
                        title={displayName}
                      >
                        {label}
                      </NavLink>
                      <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                        {isPropertyOpen
                          ? <ChevronDown size={10} strokeWidth={1.5} />
                          : <ChevronRight size={10} strokeWidth={1.5} />}
                      </span>
                    </div>

                    {/* Document sub-items */}
                    {isPropertyOpen && (
                      <div style={{ paddingLeft: 32 }}>
                        {VAULT_DOCUMENTS.map((docName) => (
                          <div
                            key={docName}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "4px 12px",
                              fontSize: 11,
                              color: "var(--color-text-tertiary, #9ca3af)",
                              cursor: "default",
                            }}
                          >
                            <FileText size={10} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                            <span>{docName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-border-tertiary, #e5e7eb)", fontSize: 11, color: "var(--color-text-tertiary, #9ca3af)" }}>
        v0.1.0
      </div>
    </aside>
  );
}
