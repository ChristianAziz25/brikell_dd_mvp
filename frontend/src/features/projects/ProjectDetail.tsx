import { useEffect, useState } from 'react';
import { useParams, NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { getProject } from '../../api/client';

interface Project {
  id: string;
  property_name: string;
  address?: string;
  status: string;
  acquisition_price?: number;
  hold_period_years?: number;
  target_return_pct?: number;
  gba_sqm?: number;
  unit_count?: number;
  build_year?: number;
  energy_label?: string;
  heating_source?: string;
  lokalplan_ref?: string;
  created_at: string;
  updated_at?: string;
}

const TABS = [
  { path: 'overview', label: 'Overview' },
  { path: 'documents', label: 'Documents' },
  { path: 'inputs', label: 'Inputs' },
  { path: 'modules', label: 'Modules' },
  { path: 'review', label: 'Review' },
  { path: 'report', label: 'Report' },
];

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#E0E0E0', text: '#555' },
  processing: { bg: '#FFF3CD', text: '#856404' },
  review: { bg: '#CCE5FF', text: '#004085' },
  completed: { bg: '#D4EDDA', text: '#155724' },
  error: { bg: '#F8D7DA', text: '#721C24' },
};

const spinnerStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  border: '4px solid #E0E0E0',
  borderTopColor: '#C9A84C',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getProject(id)
      .then(setProject)
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <div style={spinnerStyle} />
      </div>
    );
  }

  if (!project) {
    return <div style={{ padding: 40, color: '#C0614A' }}>Project not found.</div>;
  }

  const colors = statusColors[project.status] ?? statusColors.draft;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ margin: 0, color: '#1A2B3C', fontSize: 26 }}>{project.property_name}</h1>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 12, background: colors.bg, color: colors.text, textTransform: 'capitalize' }}>
            {project.status}
          </span>
        </div>
        {project.address && <div style={{ color: '#666', fontSize: 15, marginTop: 4 }}>{project.address}</div>}
      </div>

      {/* Tab bar */}
      <nav style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E0E0E0', marginBottom: 24 }}>
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={`/projects/${id}/${tab.path}`}
            style={({ isActive }) => ({
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              color: isActive ? '#C9A84C' : '#888',
              borderBottom: isActive ? '2px solid #C9A84C' : '2px solid transparent',
              marginBottom: -2,
            })}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      {/* Tab content */}
      <Outlet context={{ project }} />
    </div>
  );
}

/* Overview tab — shown at /projects/:id/overview */
export function OverviewTab() {
  const { project } = useOutletContext<{ project: Project }>();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 40px', background: '#fff', border: '1px solid #E0E0E0', borderRadius: 10, padding: 24 }}>
      <KV label="Acquisition Price" value={project.acquisition_price != null ? `DKK ${project.acquisition_price.toLocaleString('da-DK')}` : '—'} />
      <KV label="Hold Period" value={project.hold_period_years != null ? `${project.hold_period_years} years` : '—'} />
      <KV label="Target Return" value={project.target_return_pct != null ? `${project.target_return_pct}%` : '—'} />
      <KV label="GBA" value={project.gba_sqm != null ? `${project.gba_sqm} m²` : '—'} />
      <KV label="Units" value={project.unit_count?.toString() ?? '—'} />
      <KV label="Build Year" value={project.build_year?.toString() ?? '—'} />
      <KV label="Energy Label" value={project.energy_label ?? '—'} />
      <KV label="Heating Source" value={project.heating_source ?? '—'} />
      <KV label="Lokalplan" value={project.lokalplan_ref ?? '—'} />
      <KV label="Created" value={new Date(project.created_at).toLocaleDateString('da-DK')} />
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid #F0F0F0' }}>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 15, color: '#1A2B3C', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

export function PlaceholderTab() {
  return (
    <div style={{ padding: '60px 0', textAlign: 'center', color: '#999', fontSize: 16 }}>
      Coming soon
    </div>
  );
}

