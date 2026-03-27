import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects } from '../../api/client';

interface Project {
  id: string;
  property_name: string;
  address?: string;
  status: string;
  acquisition_price?: number;
  created_at: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#E0E0E0', text: '#555' },
  processing: { bg: '#FFF3CD', text: '#856404' },
  review: { bg: '#CCE5FF', text: '#004085' },
  completed: { bg: '#D4EDDA', text: '#155724' },
  error: { bg: '#F8D7DA', text: '#721C24' },
};

function formatDKK(amount: number): string {
  return 'DKK ' + amount.toLocaleString('da-DK');
}

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getProjects()
      .then((data) => setProjects(data))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <div style={spinnerStyle} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: '#1A2B3C', fontSize: 28 }}>Workflows</h1>
        <button style={newProjectBtn} onClick={() => navigate('/projects/new')}>
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#888' }}>
          <p style={{ fontSize: 18, marginBottom: 16 }}>No projects yet</p>
          <button style={newProjectBtn} onClick={() => navigate('/projects/new')}>
            Create your first project
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {projects.map((p) => {
            const colors = statusColors[p.status] ?? statusColors.draft;
            return (
              <div key={p.id} style={cardStyle}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 17, color: '#1A2B3C' }}>{p.property_name}</span>
                    <span style={{ ...badgeStyle, background: colors.bg, color: colors.text }}>{p.status}</span>
                  </div>
                  {p.address && <div style={{ color: '#666', fontSize: 14 }}>{p.address}</div>}
                </div>
                {p.acquisition_price != null && (
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1A2B3C', marginBottom: 4 }}>
                    {formatDKK(p.acquisition_price)}
                  </div>
                )}
                <div style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>
                  Created {new Date(p.created_at).toLocaleDateString('da-DK')}
                </div>
                <button
                  style={{ ...openBtn }}
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  Open
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const newProjectBtn: React.CSSProperties = {
  background: '#C9A84C',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '10px 20px',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E0E0E0',
  borderRadius: 10,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
};

const badgeStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  padding: '3px 10px',
  borderRadius: 12,
  textTransform: 'capitalize',
};

const openBtn: React.CSSProperties = {
  marginTop: 'auto',
  background: 'transparent',
  color: '#C9A84C',
  border: '1px solid #C9A84C',
  borderRadius: 6,
  padding: '6px 16px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  alignSelf: 'flex-start',
};

const spinnerStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  border: '4px solid #E0E0E0',
  borderTopColor: '#C9A84C',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};
