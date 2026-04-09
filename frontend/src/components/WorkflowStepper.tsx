import { NavLink, useParams } from "react-router-dom";
import { FileText, ClipboardList, Cpu, CheckCircle, FileDown } from "lucide-react";

const steps = [
  { key: "documents", label: "Documents", icon: FileText },
  { key: "inputs", label: "Inputs", icon: ClipboardList },
  { key: "modules", label: "Modules", icon: Cpu },
  { key: "review", label: "Review", icon: CheckCircle },
  { key: "report", label: "Report", icon: FileDown },
];

export default function WorkflowStepper() {
  const { id } = useParams();
  return (
    <div style={{ display: "flex", borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 28 }}>
      {steps.map(({ key, label, icon: Icon }) => (
        <NavLink
          key={key}
          to={`/projects/${id}/${key}`}
          style={({ isActive }) => ({
            display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
            fontSize: 13, textDecoration: "none", borderBottom: `2px solid ${isActive ? "var(--color-text-primary)" : "transparent"}`,
            marginBottom: -1, color: isActive ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
            transition: "color 0.15s",
          })}
        >
          <Icon size={14} strokeWidth={1.5} />
          {label}
        </NavLink>
      ))}
    </div>
  );
}
