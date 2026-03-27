import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../../api/client';

const ENERGY_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const HEATING_SOURCES = ['Fjernvarme', 'Naturgas', 'Varmepumpe', 'El', 'Olie', 'Other'];

export default function ProjectCreate() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {};

    for (const [key, value] of fd.entries()) {
      const str = (value as string).trim();
      if (str === '') continue;
      if (['acquisition_price', 'hold_period_years', 'target_return_pct', 'gba_sqm', 'unit_count', 'build_year'].includes(key)) {
        data[key] = Number(str);
      } else {
        data[key] = str;
      }
    }

    try {
      const project = await createProject(data);
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: '#1A2B3C', fontSize: 28, marginBottom: 24 }}>New Project</h1>

      {error && (
        <div style={{ background: '#FDE8E4', color: '#C0614A', padding: '12px 16px', borderRadius: 6, marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Deal Parameters */}
        <fieldset style={sectionStyle}>
          <legend style={legendStyle}>Deal Parameters</legend>

          <label style={labelStyle}>
            Property Name <span style={{ color: '#C0614A' }}>*</span>
            <input name="property_name" required style={inputStyle} />
          </label>

          <label style={labelStyle}>
            Address
            <input name="address" style={inputStyle} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <label style={labelStyle}>
              Acquisition Price DKK
              <input name="acquisition_price" type="number" min="0" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Hold Period Years
              <input name="hold_period_years" type="number" min="0" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Target Return %
              <input name="target_return_pct" type="number" min="0" step="0.1" style={inputStyle} />
            </label>
          </div>
        </fieldset>

        {/* Property Details */}
        <fieldset style={sectionStyle}>
          <legend style={legendStyle}>Property Details</legend>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <label style={labelStyle}>
              GBA m²
              <input name="gba_sqm" type="number" min="0" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Unit Count
              <input name="unit_count" type="number" min="0" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Build Year
              <input name="build_year" type="number" min="1800" max="2030" style={inputStyle} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <label style={labelStyle}>
              Energy Label
              <select name="energy_label" style={inputStyle} defaultValue="">
                <option value="">—</option>
                {ENERGY_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <label style={labelStyle}>
              Heating Source
              <select name="heating_source" style={inputStyle} defaultValue="">
                <option value="">—</option>
                {HEATING_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>

          <label style={labelStyle}>
            Lokalplan Reference
            <input name="lokalplan_ref" style={inputStyle} />
          </label>
        </fieldset>

        <button type="submit" disabled={submitting} style={{ ...submitBtn, opacity: submitting ? 0.7 : 1 }}>
          {submitting ? 'Creating…' : 'Create Project'}
        </button>
      </form>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E0E0E0',
  borderRadius: 10,
  padding: '24px 24px 8px',
  marginBottom: 24,
};

const legendStyle: React.CSSProperties = {
  color: '#1A2B3C',
  fontWeight: 700,
  fontSize: 16,
  padding: '0 8px',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  fontSize: 14,
  fontWeight: 500,
  color: '#555',
  marginBottom: 16,
  gap: 6,
};

const inputStyle: React.CSSProperties = {
  padding: '9px 12px',
  fontSize: 15,
  border: '1px solid #D0D0D0',
  borderRadius: 6,
  outline: 'none',
  background: '#FAFAFA',
};

const submitBtn: React.CSSProperties = {
  background: '#C9A84C',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '12px 32px',
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
};
