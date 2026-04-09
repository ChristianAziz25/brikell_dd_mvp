import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject } from "@/api/client";
import { Upload, Check, Loader2 } from "lucide-react";

const ALL_MODULES = [
  { key: "M01", name: "Building Overview", track: "Technical & Building" },
  { key: "M02", name: "Planning Conditions", track: "Legal & Regulatory" },
  { key: "M03", name: "Development Potential", track: "Technical & Building" },
  { key: "M04", name: "Tenancy Law Structure", track: "Legal & Regulatory" },
  { key: "M05", name: "Estimated Rental Value", track: "Lease & Market Value" },
  { key: "M06", name: "OPEX Estimate", track: "Lease & Market Value" },
  { key: "M07", name: "Market Research", track: "Market & Location" },
  { key: "M08", name: "Infrastructure & Area", track: "Market & Location" },
  { key: "M09", name: "Supply Pipeline", track: "Market & Location" },
  { key: "M10", name: "Ownership & Title", track: "Legal & Regulatory" },
  { key: "M11", name: "Technical Condition", track: "Technical & Building" },
  { key: "M12", name: "Energy & ESG", track: "Operations & ESG" },
  { key: "M13", name: "Improvement Potential", track: "Operations & ESG" },
  { key: "M14", name: "Financial Model", track: "Financial" },
  { key: "M15", name: "Risk & Flag Summary", track: "Financial" },
  { key: "M16", name: "Transaction Summary", track: "Financial" },
];

const TRACKS = [
  "Technical & Building",
  "Legal & Regulatory",
  "Lease & Market Value",
  "Market & Location",
  "Operations & ESG",
  "Financial",
];

const DOC_MAP: Record<string, { required: string[]; optional: string[] }> = {
  "M01": { required: ["BBR extract — bbr.dk or OIS"], optional: ["Site drawings or floor plans"] },
  "M02": { required: ["Local plan PDF (lokalplan) — plandata.dk", "BBR extract"], optional: ["Municipal plan extract (kommuneplan)"] },
  "M03": { required: ["Local plan PDF", "Site plan showing footprint"], optional: ["Building drawings"] },
  "M04": { required: ["Rent roll (lejefortegnelse)", "Sample tenancy agreements (lejekontrakter)"], optional: ["BBR extract with unit classification"] },
  "M05": { required: ["Rent roll with current rents and unit areas"], optional: ["Market rent appraisal or broker opinion"] },
  "M06": { required: ["Annual accounts (driftsregnskab)", "Land tax statement (grundskyldsbillet)"], optional: ["Operating budget"] },
  "M07": { required: ["Market report or broker overview"], optional: ["Transaction comparables"] },
  "M08": { required: [], optional: ["Any known infrastructure plans"] },
  "M09": { required: [], optional: ["Competitor project information"] },
  "M10": { required: ["Land registry extract (tingbogsattest) — tinglysning.dk"], optional: ["Title deed (skøde)"] },
  "M11": { required: ["Technical inspection report (tilstandsrapport)"], optional: ["Energy performance certificate"] },
  "M12": { required: ["Energy certificate (energimærke) — Enerelsen"], optional: ["Utility consumption data"] },
  "M13": { required: ["Rent roll", "Local plan"], optional: ["Operating accounts"] },
  "M14": { required: ["Annual accounts (årsregnskab)", "Rent roll"], optional: ["Operating budget"] },
  "M15": { required: [], optional: ["Any flagged documents from other modules"] },
  "M16": { required: [], optional: ["Sale and purchase agreement draft (SPA)", "Indicative valuation or NBO"] },
};

const DEFAULT_SELECTED = new Set<string>();

/* Normalize a doc name to its core phrase for dedup/grouping */
function normalizeDoc(doc: string) {
  return doc.split(/\s*[—(]/)[0].replace(/\s+with\s+.*/, "").trim().toLowerCase();
}

export default function ProjectCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_SELECTED));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [addressFocused, setAddressFocused] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Record<string, File>>({});
  const [extracting, setExtracting] = useState<Record<string, boolean>>({});
  const [extracted, setExtracted] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  const toggleModule = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === ALL_MODULES.length) setSelected(new Set());
    else setSelected(new Set(ALL_MODULES.map(m => m.key)));
  };

  const steps = useMemo(
    () => [
      { n: 1, label: "Property" },
      { n: 2, label: "DD scope" },
      { n: 3, label: "Documents" },
    ],
    [],
  );

  /* Group selected modules by shared documents using union-find */
  const getDocGroups = () => {
    const selectedMods = ALL_MODULES.filter(m => selected.has(m.key));
    if (selectedMods.length === 0) return [];

    // Collect normalized doc → set of module keys
    const normToModules = new Map<string, Set<string>>();
    selectedMods.forEach(mod => {
      const docs = DOC_MAP[mod.key];
      if (!docs) return;
      [...docs.required, ...docs.optional].forEach(doc => {
        const n = normalizeDoc(doc);
        if (!normToModules.has(n)) normToModules.set(n, new Set());
        normToModules.get(n)!.add(mod.key);
      });
    });

    // Union-find
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      if (!parent.has(x)) parent.set(x, x);
      if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
      return parent.get(x)!;
    };
    const union = (a: string, b: string) => { parent.set(find(a), find(b)); };
    selectedMods.forEach(mod => find(mod.key));
    normToModules.forEach(mods => {
      const arr = Array.from(mods);
      for (let i = 1; i < arr.length; i++) union(arr[0], arr[i]);
    });

    // Build clusters
    const clusters = new Map<string, string[]>();
    selectedMods.forEach(mod => {
      const root = find(mod.key);
      if (!clusters.has(root)) clusters.set(root, []);
      clusters.get(root)!.push(mod.key);
    });

    return Array.from(clusters.values()).map(keys => {
      const mods = keys.map(k => ALL_MODULES.find(m => m.key === k)!);
      const seenNorm = new Set<string>();
      const required: string[] = [];
      const optional: string[] = [];
      keys.forEach(k => {
        const docs = DOC_MAP[k];
        if (!docs) return;
        docs.required.forEach(d => {
          const n = normalizeDoc(d);
          if (!seenNorm.has(n)) { seenNorm.add(n); required.push(d); }
        });
        docs.optional.forEach(d => {
          const n = normalizeDoc(d);
          if (!seenNorm.has(n)) { seenNorm.add(n); optional.push(d); }
        });
      });
      const tracks = [...new Set(mods.map(m => m.track))];
      return {
        title: mods.map(m => m.name).join(" · "),
        subtitle: tracks.join(" · "),
        required,
        optional,
      };
    });
  };

  const handleFinish = async () => {
    if (!address.trim()) return;
    setSaving(true);
    setError("");
    try {
      const project = await createProject({
        name: address.trim(),
        address: address.trim(),
        selected_modules: Array.from(selected),
      });
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create assignment");
      setSaving(false);
    }
  };

  const canContinue = step === 1
    ? address.trim().length > 2 && confirmed
    : step === 2
    ? selected.size > 0
    : true;

  return (
    <div>
      {/* Page heading */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary, #111827)" }}>
          New assignment
        </div>
        <div style={{ marginTop: 3, fontSize: 12, color: "var(--color-text-tertiary, #9ca3af)" }}>
          Define the property, scope the DD, upload documents
        </div>
      </div>

      {/* Content panel */}
      <div
        style={{
          border: "1px solid var(--color-border-tertiary, #e5e7eb)",
          borderRadius: 14,
          padding: "28px 28px 0",
          background: "var(--color-background-primary, #ffffff)",
        }}
      >
        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
          {steps.map((s, i) => {
            const isActive = step === s.n;
            return (
              <div key={s.n} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 600,
                      flexShrink: 0,
                      background: isActive ? "var(--color-text-primary, #111827)" : "transparent",
                      color: isActive ? "var(--color-background-primary, #ffffff)" : "var(--color-text-tertiary, #9ca3af)",
                      border: `1px solid ${
                        isActive ? "var(--color-text-primary, #111827)" : "var(--color-border-secondary, #d1d5db)"
                      }`,
                    }}
                  >
                    {s.n}
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: isActive
                        ? "var(--color-text-primary, #111827)"
                        : "var(--color-text-tertiary, #9ca3af)",
                    }}
                  >
                    {s.label}
                  </span>
                </div>
                {i < 2 && (
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background: "var(--color-border-tertiary, #e5e7eb)",
                      margin: "0 14px",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div style={{ minHeight: 260, display: "flex", flexDirection: "column" }}>
          {/* Step 1 — Property */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "var(--color-text-secondary, #6b7280)",
                    marginBottom: 6,
                  }}
                >
                  Property address
                </label>
                <input
                  autoFocus
                  value={address}
                  onChange={e => {
                    setAddress(e.target.value);
                    setConfirmed(false);
                  }}
                  onFocus={() => setAddressFocused(true)}
                  onBlur={() => setAddressFocused(false)}
                  placeholder="e.g. Frederiksdalsvej 80–82, 2830 Virum"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: `1px solid ${
                      addressFocused ? "var(--color-text-primary, #111827)" : "var(--color-border-secondary, #d1d5db)"
                    }`,
                    borderRadius: 12,
                    fontSize: 14,
                    color: "var(--color-text-primary, #111827)",
                    background: "var(--color-background-primary, #ffffff)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {address.trim().length > 2 && (
                <div
                  style={{
                    background: "var(--color-background-secondary, #f3f4f6)",
                    borderRadius: 12,
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--color-text-primary, #111827)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {address.trim()}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-tertiary, #9ca3af)", marginTop: 4 }}>
                      Danmark
                    </div>
                  </div>

                  {!confirmed ? (
                    <button
                      onClick={() => setConfirmed(true)}
                      style={{
                        fontSize: 12,
                        padding: "6px 12px",
                        borderRadius: 999,
                        border: "1px solid var(--color-border-secondary, #d1d5db)",
                        background: "var(--color-background-primary, #ffffff)",
                        color: "var(--color-text-primary, #111827)",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Confirm address
                    </button>
                  ) : (
                    <span
                      style={{
                        fontSize: 12,
                        padding: "6px 12px",
                        borderRadius: 999,
                        border: "1px solid var(--color-border-tertiary, #e5e7eb)",
                        background: "var(--color-background-primary, #ffffff)",
                        color: "var(--color-text-secondary, #6b7280)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Confirmed
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2 — DD scope */}
          {step === 2 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: "var(--color-text-secondary, #6b7280)" }}>
                  Select the modules to include
                </span>
                <button
                  type="button"
                  onClick={toggleAll}
                  style={{
                    fontSize: 12,
                    color: "var(--color-text-secondary, #6b7280)",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  {selected.size === ALL_MODULES.length ? "Deselect all" : "Select all"}
                </button>
              </div>

              {TRACKS.map((track) => {
                const mods = ALL_MODULES.filter(m => m.track === track);
                if (mods.length === 0) return null;
                return (
                  <div key={track} style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--color-text-tertiary, #9ca3af)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 16,
                      }}
                    >
                      {track}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                      {mods.map(mod => {
                        const isSelected = selected.has(mod.key);
                        return (
                          <div
                            key={mod.key}
                            onClick={() => toggleModule(mod.key)}
                            style={{
                              border: `1px solid ${
                                isSelected
                                  ? "var(--color-text-primary, #111827)"
                                  : "var(--color-border-tertiary, #e5e7eb)"
                              }`,
                              borderRadius: 12,
                              padding: "12px 14px",
                              cursor: "pointer",
                              background: "var(--color-background-primary, #ffffff)",
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 12,
                              userSelect: "none",
                            }}
                          >
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: 4,
                                flexShrink: 0,
                                marginTop: 2,
                                border: `1px solid ${
                                  isSelected
                                    ? "var(--color-text-primary, #111827)"
                                    : "var(--color-border-secondary, #d1d5db)"
                                }`,
                                background: isSelected ? "var(--color-text-primary, #111827)" : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {isSelected && (
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                  <path
                                    d="M2 5l2.5 2.5L8 3"
                                    stroke="white"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "var(--color-text-primary, #111827)",
                                  lineHeight: 1.25,
                                }}
                              >
                                {mod.name}
                              </div>
                              <div style={{ fontSize: 12, color: "var(--color-text-tertiary, #9ca3af)", marginTop: 3 }}>
                                {mod.key}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 3 — Documents */}
          {step === 3 && (
            <div>
              {getDocGroups().map(group => {
                if (group.required.length === 0 && group.optional.length === 0) return null;
                return (
                  <div key={group.title} style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary, #111827)" }}>
                      {group.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-tertiary, #9ca3af)", marginTop: 2, marginBottom: 12 }}>
                      {group.subtitle}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {group.required.map(doc => {
                        const hasFile = !!attachedFiles[doc];
                        const isExtracting = !!extracting[doc];
                        const isExtracted = !!extracted[doc];
                        return (
                          <div
                            key={doc}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "10px 14px",
                              borderRadius: 12,
                              fontSize: 13,
                              color: "var(--color-text-secondary, #6b7280)",
                              background: "var(--color-background-secondary, #f3f4f6)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#16a34a", flexShrink: 0 }} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                              {/* Attach */}
                              <input
                                type="file"
                                accept="*"
                                ref={el => { fileInputRefs.current[doc] = el; }}
                                onChange={e => {
                                  const f = e.target.files?.[0];
                                  if (f) setAttachedFiles(prev => ({ ...prev, [doc]: f }));
                                }}
                                style={{ display: "none" }}
                              />
                              <button
                                type="button"
                                onClick={() => fileInputRefs.current[doc]?.click()}
                                onMouseEnter={() => setHoveredBtn(`${doc}-attach`)}
                                onMouseLeave={() => setHoveredBtn(null)}
                                style={{
                                  fontSize: 12,
                                  padding: "6px 14px",
                                  borderRadius: 8,
                                  border: "none",
                                  background: hasFile
                                    ? "#16a34a"
                                    : hoveredBtn === `${doc}-attach`
                                    ? "#1f2937"
                                    : "var(--color-text-primary, #111827)",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  fontWeight: 500,
                                  color: "#ffffff",
                                  transition: "background 150ms",
                                }}
                              >
                                {hasFile ? <Check size={13} /> : <Upload size={13} />}
                                {hasFile ? (attachedFiles[doc].name.length > 18 ? attachedFiles[doc].name.slice(0, 18) + "…" : attachedFiles[doc].name) : "Attach"}
                              </button>
                              {/* Extract */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isExtracting || isExtracted) return;
                                  setExtracting(prev => ({ ...prev, [doc]: true }));
                                  setTimeout(() => {
                                    setExtracting(prev => ({ ...prev, [doc]: false }));
                                    setExtracted(prev => ({ ...prev, [doc]: true }));
                                  }, 2000);
                                }}
                                onMouseEnter={() => setHoveredBtn(`${doc}-extract`)}
                                onMouseLeave={() => setHoveredBtn(null)}
                                style={{
                                  fontSize: 12,
                                  padding: "6px 14px",
                                  borderRadius: 8,
                                  border: isExtracted
                                    ? "1.5px solid #16a34a"
                                    : "1.5px solid var(--color-border-secondary, #d1d5db)",
                                  background: isExtracted
                                    ? "#f0fdf4"
                                    : isExtracting
                                    ? "var(--color-background-primary, #ffffff)"
                                    : hoveredBtn === `${doc}-extract`
                                    ? "var(--color-background-secondary, #f3f4f6)"
                                    : "var(--color-background-primary, #ffffff)",
                                  cursor: isExtracting || isExtracted ? "default" : "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  fontWeight: 500,
                                  color: isExtracted
                                    ? "#16a34a"
                                    : isExtracting
                                    ? "var(--color-text-secondary, #6b7280)"
                                    : hoveredBtn === `${doc}-extract`
                                    ? "var(--color-text-primary, #111827)"
                                    : "var(--color-text-secondary, #6b7280)",
                                  opacity: isExtracting ? 0.5 : 1,
                                  transition: "background 150ms, border-color 150ms, color 150ms",
                                }}
                              >
                                {isExtracting ? <Loader2 size={13} className="animate-spin" /> : isExtracted ? <Check size={13} /> : <Upload size={13} />}
                                {isExtracting ? "Extracting..." : isExtracted ? "Extracted" : "Extract"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {group.optional.map(doc => {
                        const hasFile = !!attachedFiles[doc];
                        const isExtracting = !!extracting[doc];
                        const isExtracted = !!extracted[doc];
                        return (
                          <div
                            key={doc}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "10px 14px",
                              borderRadius: 12,
                              fontSize: 13,
                              color: "var(--color-text-secondary, #6b7280)",
                              background: "var(--color-background-secondary, #f3f4f6)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: "50%",
                                  border: "2px solid var(--color-border-secondary, #d1d5db)",
                                  background: "transparent",
                                  flexShrink: 0,
                                  boxSizing: "border-box",
                                }}
                              />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                              {/* Attach */}
                              <input
                                type="file"
                                accept="*"
                                ref={el => { fileInputRefs.current[doc] = el; }}
                                onChange={e => {
                                  const f = e.target.files?.[0];
                                  if (f) setAttachedFiles(prev => ({ ...prev, [doc]: f }));
                                }}
                                style={{ display: "none" }}
                              />
                              <button
                                type="button"
                                onClick={() => fileInputRefs.current[doc]?.click()}
                                onMouseEnter={() => setHoveredBtn(`${doc}-attach`)}
                                onMouseLeave={() => setHoveredBtn(null)}
                                style={{
                                  fontSize: 12,
                                  padding: "6px 14px",
                                  borderRadius: 8,
                                  border: "none",
                                  background: hasFile
                                    ? "#16a34a"
                                    : hoveredBtn === `${doc}-attach`
                                    ? "#1f2937"
                                    : "var(--color-text-primary, #111827)",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  fontWeight: 500,
                                  color: "#ffffff",
                                  transition: "background 150ms",
                                }}
                              >
                                {hasFile ? <Check size={13} /> : <Upload size={13} />}
                                {hasFile ? (attachedFiles[doc].name.length > 18 ? attachedFiles[doc].name.slice(0, 18) + "…" : attachedFiles[doc].name) : "Attach"}
                              </button>
                              {/* Extract */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isExtracting || isExtracted) return;
                                  setExtracting(prev => ({ ...prev, [doc]: true }));
                                  setTimeout(() => {
                                    setExtracting(prev => ({ ...prev, [doc]: false }));
                                    setExtracted(prev => ({ ...prev, [doc]: true }));
                                  }, 2000);
                                }}
                                onMouseEnter={() => setHoveredBtn(`${doc}-extract`)}
                                onMouseLeave={() => setHoveredBtn(null)}
                                style={{
                                  fontSize: 12,
                                  padding: "6px 14px",
                                  borderRadius: 8,
                                  border: isExtracted
                                    ? "1.5px solid #16a34a"
                                    : "1.5px solid var(--color-border-secondary, #d1d5db)",
                                  background: isExtracted
                                    ? "#f0fdf4"
                                    : isExtracting
                                    ? "var(--color-background-primary, #ffffff)"
                                    : hoveredBtn === `${doc}-extract`
                                    ? "var(--color-background-secondary, #f3f4f6)"
                                    : "var(--color-background-primary, #ffffff)",
                                  cursor: isExtracting || isExtracted ? "default" : "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  fontWeight: 500,
                                  color: isExtracted
                                    ? "#16a34a"
                                    : isExtracting
                                    ? "var(--color-text-secondary, #6b7280)"
                                    : hoveredBtn === `${doc}-extract`
                                    ? "var(--color-text-primary, #111827)"
                                    : "var(--color-text-secondary, #6b7280)",
                                  opacity: isExtracting ? 0.5 : 1,
                                  transition: "background 150ms, border-color 150ms, color 150ms",
                                }}
                              >
                                {isExtracting ? <Loader2 size={13} className="animate-spin" /> : isExtracted ? <Check size={13} /> : <Upload size={13} />}
                                {isExtracting ? "Extracting..." : isExtracted ? "Extracted" : "Extract"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div
                style={{
                  marginTop: 10,
                  padding: 16,
                  border: "1px dashed var(--color-border-secondary, #d1d5db)",
                  borderRadius: 12,
                  background: "var(--color-background-primary, #ffffff)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  textAlign: "center",
                  color: "var(--color-text-tertiary, #9ca3af)",
                  cursor: "pointer",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 3v8M5 6l3-3 3 3" />
                  <path d="M3 13h10" />
                </svg>
                <div style={{ fontSize: 12 }}>Drop files here or click to upload</div>
              </div>

              {error && <p style={{ fontSize: 12, color: "var(--color-text-danger, #b91c1c)", marginTop: 10 }}>{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 28,
            padding: "16px 0",
            borderTop: "1px solid var(--color-border-tertiary, #e5e7eb)",
          }}
        >
          <button
            type="button"
            onClick={() => setStep(s => s - 1)}
            style={{
              visibility: step > 1 ? "visible" : "hidden",
              padding: "10px 14px",
              background: "transparent",
              color: "var(--color-text-primary, #111827)",
              border: "1px solid var(--color-border-tertiary, #e5e7eb)",
              borderRadius: 12,
              fontSize: 13,
              cursor: step > 1 ? "pointer" : "default",
            }}
          >
            Back
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {step === 2 && (
              <span style={{ fontSize: 12, color: "var(--color-text-tertiary, #9ca3af)" }}>
                {selected.size} module{selected.size !== 1 ? "s" : ""} selected
              </span>
            )}
            <button
              type="button"
              onClick={() => (step < 3 ? setStep(s => s + 1) : handleFinish())}
              disabled={!canContinue || saving}
              style={{
                padding: "10px 16px",
                background: canContinue && !saving ? "var(--color-text-primary, #111827)" : "var(--color-border-tertiary, #e5e7eb)",
                color: canContinue && !saving ? "var(--color-background-primary, #ffffff)" : "var(--color-text-tertiary, #9ca3af)",
                border: "none",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                cursor: canContinue && !saving ? "pointer" : "default",
              }}
            >
              {step === 3 ? (saving ? "Creating..." : "Start analysis →") : "Continue →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
