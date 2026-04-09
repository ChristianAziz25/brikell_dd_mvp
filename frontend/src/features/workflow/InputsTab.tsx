import { useEffect, useState } from "react";
import { useProjectContext } from "@/features/projects/ProjectDetail";
import { getInputs, saveInput, runReconciliation } from "@/api/client";
import { ChevronDown, ChevronRight, Plus, Trash2, Save, Zap } from "lucide-react";

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, defaultOpen = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 bg-navy text-white text-sm font-medium"
      >
        {title}
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold outline-none"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-gold focus:border-gold outline-none bg-white"
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface RentRollRow {
  unit_id: string;
  tenant: string;
  area_sqm: string;
  rent_per_sqm: string;
  lease_start: string;
  lease_end: string;
}

const emptyRow: RentRollRow = {
  unit_id: "",
  tenant: "",
  area_sqm: "",
  rent_per_sqm: "",
  lease_start: "",
  lease_end: "",
};

export default function InputsTab() {
  const { project } = useProjectContext();
  const [property, setProperty] = useState<Record<string, string>>({});
  const [planning, setPlanning] = useState<Record<string, string>>({});
  const [financial, setFinancial] = useState<Record<string, string>>({});
  const [rentRoll, setRentRoll] = useState<RentRollRow[]>([{ ...emptyRow }]);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    getInputs(project.id).then((data: any) => {
      if (data.property) setProperty(data.property.data);
      if (data.planning) setPlanning(data.planning.data);
      if (data.financial) setFinancial(data.financial.data);
      if (data.rent_roll) setRentRoll(data.rent_roll.data.rows || [{ ...emptyRow }]);
    });
  }, [project.id]);

  const handleSave = async (type: string, data: any) => {
    setSaving((p) => ({ ...p, [type]: true }));
    try {
      await saveInput(project.id, type, data);
      setSaved((p) => ({ ...p, [type]: true }));
      setTimeout(() => setSaved((p) => ({ ...p, [type]: false })), 2000);
    } finally {
      setSaving((p) => ({ ...p, [type]: false }));
    }
  };

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      await runReconciliation(project.id);
    } finally {
      setReconciling(false);
    }
  };

  const updateProperty = (key: string, val: string) =>
    setProperty((p) => ({ ...p, [key]: val }));
  const updatePlanning = (key: string, val: string) =>
    setPlanning((p) => ({ ...p, [key]: val }));
  const updateFinancial = (key: string, val: string) =>
    setFinancial((p) => ({ ...p, [key]: val }));

  const updateRentRow = (i: number, key: keyof RentRollRow, val: string) => {
    setRentRoll((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  };

  const SaveBtn = ({ type, data }: { type: string; data: any }) => (
    <div className="flex items-center gap-3 mt-4">
      <button
        onClick={() => handleSave(type, data)}
        disabled={saving[type]}
        className="flex items-center gap-2 px-4 py-2 bg-gold text-navy font-semibold rounded-lg text-sm hover:bg-gold-light transition-colors disabled:opacity-50"
      >
        <Save size={14} />
        {saving[type] ? "Saving..." : "Save"}
      </button>
      {saved[type] && <span className="text-sm text-success">Saved</span>}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-navy">Property Inputs</h3>
        <button
          onClick={handleReconcile}
          disabled={reconciling}
          className="flex items-center gap-2 px-4 py-2 bg-navy text-white font-semibold rounded-lg text-sm hover:bg-navy-light transition-colors disabled:opacity-50"
        >
          <Zap size={14} />
          {reconciling ? "Reconciling..." : "Reconcile Data"}
        </button>
      </div>

      <Section title="Property Facts" defaultOpen>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Total GBA (sqm)" value={property.gba_sqm || ""} onChange={(v) => updateProperty("gba_sqm", v)} type="number" />
          <Field label="Unit Count" value={property.unit_count || ""} onChange={(v) => updateProperty("unit_count", v)} type="number" />
          <Field label="Build Year" value={property.build_year || ""} onChange={(v) => updateProperty("build_year", v)} type="number" />
          <Field label="Construction Type" value={property.construction_type || ""} onChange={(v) => updateProperty("construction_type", v)} placeholder="e.g., Concrete, Brick" />
          <SelectField
            label="Energy Label"
            value={property.energy_label || ""}
            onChange={(v) => updateProperty("energy_label", v)}
            options={["A", "B", "C", "D", "E", "F", "G"].map((l) => ({ value: l, label: l }))}
          />
          <SelectField
            label="Heating Source"
            value={property.heating_source || ""}
            onChange={(v) => updateProperty("heating_source", v)}
            options={[
              { value: "fjernvarme", label: "Fjernvarme" },
              { value: "gas", label: "Gas" },
              { value: "electric", label: "Electric" },
              { value: "heat_pump", label: "Heat Pump" },
              { value: "oil", label: "Oil" },
            ]}
          />
        </div>
        <SaveBtn type="property" data={property} />
      </Section>

      <Section title="Planning Facts">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Lokalplan Reference" value={planning.lokalplan_ref || ""} onChange={(v) => updatePlanning("lokalplan_ref", v)} />
          <Field label="Bebyggelsesprocent" value={planning.bebyggelsesprocent || ""} onChange={(v) => updatePlanning("bebyggelsesprocent", v)} type="number" />
          <Field label="Max Etager" value={planning.max_etager || ""} onChange={(v) => updatePlanning("max_etager", v)} type="number" />
          <SelectField
            label="Formaal"
            value={planning.formaal || ""}
            onChange={(v) => updatePlanning("formaal", v)}
            options={[
              { value: "bolig", label: "Bolig (Residential)" },
              { value: "erhverv", label: "Erhverv (Commercial)" },
              { value: "blandet", label: "Blandet (Mixed Use)" },
            ]}
          />
          <Field label="Restrictions" value={planning.restrictions || ""} onChange={(v) => updatePlanning("restrictions", v)} placeholder="e.g., Listed building, Noise zone" />
        </div>
        <SaveBtn type="planning" data={planning} />
      </Section>

      <Section title="Financial Inputs">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Current Passing Rent (DKK '000)" value={financial.passing_rent || ""} onChange={(v) => updateFinancial("passing_rent", v)} type="number" />
          <Field label="Market Rent/sqm (DKK)" value={financial.market_rent_per_sqm || ""} onChange={(v) => updateFinancial("market_rent_per_sqm", v)} type="number" />
          <Field label="Vacancy %" value={financial.vacancy_pct || ""} onChange={(v) => updateFinancial("vacancy_pct", v)} type="number" />
          <Field label="Exit Yield %" value={financial.exit_yield_pct || ""} onChange={(v) => updateFinancial("exit_yield_pct", v)} type="number" />
          <Field label="LTV %" value={financial.ltv_pct || ""} onChange={(v) => updateFinancial("ltv_pct", v)} type="number" />
          <Field label="Interest Rate %" value={financial.interest_rate_pct || ""} onChange={(v) => updateFinancial("interest_rate_pct", v)} type="number" />
        </div>
        <SaveBtn type="financial" data={financial} />
      </Section>

      <Section title="Rent Roll">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 pr-2">Unit ID</th>
                <th className="pb-2 pr-2">Tenant</th>
                <th className="pb-2 pr-2">Area (sqm)</th>
                <th className="pb-2 pr-2">Rent/sqm</th>
                <th className="pb-2 pr-2">Lease Start</th>
                <th className="pb-2 pr-2">Lease End</th>
                <th className="pb-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rentRoll.map((row, i) => (
                <tr key={i} className="border-b">
                  {(Object.keys(emptyRow) as (keyof RentRollRow)[]).map((key) => (
                    <td key={key} className="py-2 pr-2">
                      <input
                        type={key.includes("date") || key.includes("lease") ? "date" : "text"}
                        value={row[key]}
                        onChange={(e) => updateRentRow(i, key, e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </td>
                  ))}
                  <td className="py-2">
                    <button
                      onClick={() => setRentRoll((r) => r.filter((_, idx) => idx !== i))}
                      className="text-gray-400 hover:text-error"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={() => setRentRoll((r) => [...r, { ...emptyRow }])}
          className="flex items-center gap-1 text-sm text-gold hover:text-gold-light mt-3"
        >
          <Plus size={14} /> Add Row
        </button>
        <SaveBtn type="rent_roll" data={{ rows: rentRoll }} />
      </Section>
    </div>
  );
}
