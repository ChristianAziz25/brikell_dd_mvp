import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getInputs, saveInput } from '../../api/client';

/* ───── types ───── */

interface RentRow {
  unit_id: string;
  tenant: string;
  area_sqm: number | '';
  rent_per_sqm: number | '';
  lease_start: string;
  lease_end: string;
}

type SectionKey = 'property' | 'planning' | 'financial' | 'rent_roll';

/* ───── section config ───── */

const ENERGY_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const HEATING_SOURCES = ['Fjernvarme', 'Naturgas', 'Varmepumpe', 'El', 'Olie', 'Other'];
const FORMAAL = ['Bolig', 'Erhverv', 'Blandet'];
const RESTRICTION_OPTIONS = ['SAVE', 'V1', 'V2', 'Fredning'];

const emptyRentRow = (): RentRow => ({
  unit_id: '',
  tenant: '',
  area_sqm: '',
  rent_per_sqm: '',
  lease_start: '',
  lease_end: '',
});

/* ───── component ───── */

export default function InputsTab() {
  const { id: projectId } = useParams<{ id: string }>();

  /* state per section */
  const [property, setProperty] = useState({
    total_gba_sqm: '' as number | '',
    unit_mix: '',
    build_year: '' as number | '',
    construction_type: '',
    energy_label: '',
    heating_source: '',
  });

  const [planning, setPlanning] = useState({
    lokalplan_name: '',
    bebyggelsesprocent: '' as number | '',
    max_etager: '' as number | '',
    formaal: '',
    restrictions: [] as string[],
  });

  const [financial, setFinancial] = useState({
    passing_rent: '' as number | '',
    market_rent: '' as number | '',
    vacancy_pct: '' as number | '',
    exit_yield_pct: '' as number | '',
    ltv_pct: '' as number | '',
    interest_rate_pct: '' as number | '',
  });

  const [rentRoll, setRentRoll] = useState<RentRow[]>([emptyRentRow()]);

  /* ui state */
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    property: true,
    planning: true,
    financial: true,
    rent_roll: true,
  });
  const [saved, setSaved] = useState<Record<SectionKey, boolean>>({
    property: false,
    planning: false,
    financial: false,
    rent_roll: false,
  });
  const [errors, setErrors] = useState<Record<SectionKey, string>>({
    property: '',
    planning: '',
    financial: '',
    rent_roll: '',
  });
  const [loading, setLoading] = useState(true);

  /* ── load existing inputs ── */
  const fetchInputs = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    getInputs(projectId)
      .then((data: Record<string, Record<string, unknown>>) => {
        if (data.property) setProperty((prev) => ({ ...prev, ...data.property }));
        if (data.planning) {
          const p = data.planning as Record<string, unknown>;
          setPlanning((prev) => ({
            ...prev,
            ...p,
            restrictions: Array.isArray(p.restrictions) ? p.restrictions : [],
          }));
        }
        if (data.financial) setFinancial((prev) => ({ ...prev, ...data.financial }));
        if (data.rent_roll) {
          const rr = data.rent_roll as unknown;
          if (Array.isArray(rr) && rr.length > 0) setRentRoll(rr as RentRow[]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(fetchInputs, [fetchInputs]);

  /* ── save helper ── */
  async function handleSave(section: SectionKey) {
    if (!projectId) return;
    setErrors((prev) => ({ ...prev, [section]: '' }));
    try {
      const dataMap: Record<SectionKey, unknown> = {
        property,
        planning,
        financial,
        rent_roll: rentRoll,
      };
      await saveInput(projectId, section, dataMap[section] as Record<string, unknown>);
      setSaved((prev) => ({ ...prev, [section]: true }));
      setTimeout(() => setSaved((prev) => ({ ...prev, [section]: false })), 2000);
    } catch {
      setErrors((prev) => ({ ...prev, [section]: 'Failed to save. Please try again.' }));
    }
  }

  function toggle(key: SectionKey) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  /* ── rent roll helpers ── */
  function updateRow(idx: number, field: keyof RentRow, value: string | number) {
    setRentRoll((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }
  function addRow() {
    setRentRoll((prev) => [...prev, emptyRentRow()]);
  }
  function removeRow(idx: number) {
    setRentRoll((prev) => prev.filter((_, i) => i !== idx));
  }

  if (!projectId) return null;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <div style={spinnerStyle} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Section 1: Property Facts ── */}
      <Section title="Property Facts" sectionKey="property" expanded={expanded.property} saved={saved.property} error={errors.property} onToggle={toggle} onSave={handleSave}>
        <div style={gridStyle}>
          <Field label="Total GBA m²">
            <input type="number" style={inputStyle} value={property.total_gba_sqm} onChange={(e) => setProperty({ ...property, total_gba_sqm: e.target.value === '' ? '' : Number(e.target.value) })} />
          </Field>
          <Field label="Unit Mix">
            <input type="text" style={inputStyle} placeholder='e.g. "12 boliger, 2 erhverv"' value={property.unit_mix} onChange={(e) => setProperty({ ...property, unit_mix: e.target.value })} />
          </Field>
          <Field label="Build Year">
            <input type="number" style={inputStyle} value={property.build_year} onChange={(e) => setProperty({ ...property, build_year: e.target.value === '' ? '' : Number(e.target.value) })} />
          </Field>
          <Field label="Construction Type">
            <input type="text" style={inputStyle} placeholder='e.g. "Mursten"' value={property.construction_type} onChange={(e) => setProperty({ ...property, construction_type: e.target.value })} />
          </Field>
          <Field label="Energy Label">
            <select style={inputStyle} value={property.energy_label} onChange={(e) => setProperty({ ...property, energy_label: e.target.value })}>
              <option value="">Select…</option>
              {ENERGY_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Heating Source">
            <select style={inputStyle} value={property.heating_source} onChange={(e) => setProperty({ ...property, heating_source: e.target.value })}>
              <option value="">Select…</option>
              {HEATING_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      {/* ── Section 2: Planning Facts ── */}
      <Section title="Planning Facts" sectionKey="planning" expanded={expanded.planning} saved={saved.planning} error={errors.planning} onToggle={toggle} onSave={handleSave}>
        <div style={gridStyle}>
          <Field label="Lokalplan Name/Number">
            <input type="text" style={inputStyle} value={planning.lokalplan_name} onChange={(e) => setPlanning({ ...planning, lokalplan_name: e.target.value })} />
          </Field>
          <Field label="Bebyggelsesprocent Permitted %">
            <input type="number" style={inputStyle} value={planning.bebyggelsesprocent} onChange={(e) => setPlanning({ ...planning, bebyggelsesprocent: e.target.value === '' ? '' : Number(e.target.value) })} />
          </Field>
          <Field label="Max Etager">
            <input type="number" style={inputStyle} value={planning.max_etager} onChange={(e) => setPlanning({ ...planning, max_etager: e.target.value === '' ? '' : Number(e.target.value) })} />
          </Field>
          <Field label="Formål">
            <select style={inputStyle} value={planning.formaal} onChange={(e) => setPlanning({ ...planning, formaal: e.target.value })}>
              <option value="">Select…</option>
              {FORMAAL.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Known Restrictions" span={2}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingTop: 4 }}>
              {RESTRICTION_OPTIONS.map((r) => (
                <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#555', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={planning.restrictions.includes(r)}
                    onChange={(e) => {
                      setPlanning({
                        ...planning,
                        restrictions: e.target.checked
                          ? [...planning.restrictions, r]
                          : planning.restrictions.filter((x) => x !== r),
                      });
                    }}
                    style={{ accentColor: '#C9A84C' }}
                  />
                  {r}
                </label>
              ))}
            </div>
          </Field>
        </div>
      </Section>

      {/* ── Section 3: Financial Inputs ── */}
      <Section title="Financial Inputs" sectionKey="financial" expanded={expanded.financial} saved={saved.financial} error={errors.financial} onToggle={toggle} onSave={handleSave}>
        <div style={gridStyle}>
          <Field label="Current Passing Rent DKK/year">
            <input type="number" style={inputStyle} value={financial.passing_rent} onChange={(e) => setFinancial({ ...financial, passing_rent: e.target.value === '' ? '' : Number(e.target.value) })} />
          </Field>
          <Field label="Market Rent Estimate DKK/m²/year">
            <input type="number" style={inputStyle} value={financial.market_rent} onChange={(e) => setFinancial({ ...financial, market_rent: e.target.value === '' ? '' : Number(e.target.value) })} />
          </Field>
          <Field label="Vacancy Assumption %">
            <input type="number" style={inputStyle} value={financial.vacancy_pct} onChange={(e) => setFinancial({ ...financial, vacancy_pct: e.target.value === '' ? '' : Number(e.target.value) })} />
          </Field>
          <Field label="Exit Yield Assumption %">
            <input type="number" style={inputStyle} value={financial.exit_yield_pct} onChange={(e) => setFinancial({ ...financial, exit_yield_pct: e.target.value === '' ? '' : Number(e.target.value) })} />
          </Field>
          <Field label="LTV Assumption %">
            <input type="number" style={inputStyle} value={financial.ltv_pct} onChange={(e) => setFinancial({ ...financial, ltv_pct: e.target.value === '' ? '' : Number(e.target.value) })} />
          </Field>
          <Field label="Interest Rate Assumption %">
            <input type="number" style={inputStyle} value={financial.interest_rate_pct} onChange={(e) => setFinancial({ ...financial, interest_rate_pct: e.target.value === '' ? '' : Number(e.target.value) })} />
          </Field>
        </div>
      </Section>

      {/* ── Section 4: Rent Roll ── */}
      <Section title="Rent Roll" sectionKey="rent_roll" expanded={expanded.rent_roll} saved={saved.rent_roll} error={errors.rent_roll} onToggle={toggle} onSave={handleSave}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', border: '1px solid #E0E0E0' }}>
            <thead>
              <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E0E0E0' }}>
                {['Unit ID', 'Tenant', 'Area m²', 'Rent DKK/m²/year', 'Lease Start', 'Lease End', ''].map((h, i) => (
                  <th key={i} style={{ padding: '8px 10px', fontSize: 12, fontWeight: 600, color: '#888', textAlign: 'left', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rentRoll.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F0F0F0' }}>
                  <td style={cellStyle}><input type="text" style={tableCellInput} value={row.unit_id} onChange={(e) => updateRow(idx, 'unit_id', e.target.value)} /></td>
                  <td style={cellStyle}><input type="text" style={tableCellInput} value={row.tenant} onChange={(e) => updateRow(idx, 'tenant', e.target.value)} /></td>
                  <td style={cellStyle}><input type="number" style={tableCellInput} value={row.area_sqm} onChange={(e) => updateRow(idx, 'area_sqm', e.target.value === '' ? '' : Number(e.target.value))} /></td>
                  <td style={cellStyle}><input type="number" style={tableCellInput} value={row.rent_per_sqm} onChange={(e) => updateRow(idx, 'rent_per_sqm', e.target.value === '' ? '' : Number(e.target.value))} /></td>
                  <td style={cellStyle}><input type="date" style={tableCellInput} value={row.lease_start} onChange={(e) => updateRow(idx, 'lease_start', e.target.value)} /></td>
                  <td style={cellStyle}><input type="date" style={tableCellInput} value={row.lease_end} onChange={(e) => updateRow(idx, 'lease_end', e.target.value)} /></td>
                  <td style={{ ...cellStyle, width: 36 }}>
                    <button onClick={() => removeRow(idx)} style={deleteBtnStyle} title="Remove row">&times;</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addRow} style={addRowBtnStyle}>+ Add Row</button>
      </Section>
    </div>
  );
}

/* ───── reusable sub-components ───── */

function Section({
  title,
  sectionKey,
  expanded,
  saved,
  error,
  onToggle,
  onSave,
  children,
}: {
  title: string;
  sectionKey: SectionKey;
  expanded: boolean;
  saved: boolean;
  error: string;
  onToggle: (key: SectionKey) => void;
  onSave: (key: SectionKey) => void;
  children: React.ReactNode;
}) {
  const [hoverSave, setHoverSave] = useState(false);
  return (
    <div style={{ background: '#F5F5F5', borderRadius: 10, border: '1px solid #E0E0E0', overflow: 'hidden' }}>
      <div
        onClick={() => onToggle(sectionKey)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: 'pointer', background: '#1A2B3C', userSelect: 'none' }}
      >
        <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{title}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      {expanded && (
        <div style={{ padding: 20 }}>
          {children}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button
              onClick={() => onSave(sectionKey)}
              onMouseEnter={() => setHoverSave(true)}
              onMouseLeave={() => setHoverSave(false)}
              style={{
                padding: '8px 24px',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: hoverSave ? '#C9A84C' : '#1A2B3C',
                color: '#fff',
                transition: 'background 0.2s',
              }}
            >
              Save
            </button>
            {saved && <span style={{ fontSize: 13, color: '#155724', fontWeight: 600 }}>Saved</span>}
            {error && <span style={{ fontSize: 13, color: '#C0614A', fontWeight: 500 }}>{error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 4, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

/* ───── styles ───── */

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '14px 24px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 14,
  border: '1px solid #D0D0D0',
  borderRadius: 6,
  outline: 'none',
  background: '#fff',
  color: '#1A2B3C',
  boxSizing: 'border-box',
};

const cellStyle: React.CSSProperties = {
  padding: '6px 8px',
};

const tableCellInput: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  fontSize: 13,
  border: '1px solid #D0D0D0',
  borderRadius: 4,
  outline: 'none',
  background: '#fff',
  color: '#1A2B3C',
  boxSizing: 'border-box',
};

const deleteBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 20,
  color: '#C0614A',
  padding: '0 4px',
  lineHeight: 1,
};

const addRowBtnStyle: React.CSSProperties = {
  marginTop: 10,
  padding: '6px 16px',
  fontSize: 13,
  fontWeight: 600,
  border: '1px dashed #C9A84C',
  borderRadius: 6,
  background: 'transparent',
  color: '#C9A84C',
  cursor: 'pointer',
};

const spinnerStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  border: '3px solid #E0E0E0',
  borderTopColor: '#C9A84C',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};
