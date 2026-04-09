import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/features/projects/ProjectDetail";
import { getModules, generateReport } from "@/api/client";
import { AlertTriangle, FileDown, Loader2 } from "lucide-react";

export default function ReviewTab() {
  const { project } = useProjectContext();
  const navigate = useNavigate();
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    getModules(project.id)
      .then(setModules)
      .finally(() => setLoading(false));
  }, [project.id]);

  const completedModules = modules.filter((m) => m.status === "complete");
  const execSummary = completedModules.find(
    (m) => m.module_key === "mod_20_executive_summary"
  );
  const allRiskFlags = completedModules.flatMap((m) => m.risk_flags || []);
  const allMetrics = completedModules.reduce((acc, m) => {
    if (m.key_metrics) Object.assign(acc, m.key_metrics);
    return acc;
  }, {} as Record<string, any>);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateReport(project.id);
      navigate(`/projects/${project.id}/report`);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (completedModules.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>No completed modules to review.</p>
        <p className="text-sm mt-1">Run the DD modules first.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-navy">
          Review ({completedModules.length}/20 modules complete)
        </h3>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-navy font-semibold rounded-lg text-sm hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {generating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <FileDown size={16} />
          )}
          Generate PDF Report
        </button>
      </div>

      {/* Executive Summary */}
      {execSummary && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">
            Executive Summary
          </h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            {execSummary.executive_summary}
          </p>
          {execSummary.output_data?.recommendation && (
            <div className="mt-3">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  execSummary.output_data.recommendation === "PROCEED"
                    ? "bg-green-100 text-green-700"
                    : execSummary.output_data.recommendation === "PROCEED_WITH_CONDITIONS"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {execSummary.output_data.recommendation.replace(/_/g, " ")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Key Metrics */}
      {Object.keys(allMetrics).length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Key Metrics
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(allMetrics)
              .slice(0, 12)
              .map(([key, val]) => (
                <div key={key} className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="text-lg font-semibold text-navy">{String(val)}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Risk Flags */}
      {allRiskFlags.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Risk Flags ({allRiskFlags.length})
          </h4>
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
            {allRiskFlags.map((flag, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
                <span className="text-gray-700">{flag}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Module Summaries */}
      <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">
        Module Summaries
      </h4>
      <div className="space-y-3">
        {completedModules
          .filter((m) => m.module_key !== "mod_20_executive_summary")
          .map((mod) => (
            <div key={mod.module_key} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400 font-mono">
                  {String(mod.module_number).padStart(2, "0")}
                </span>
                <span className="text-sm font-medium text-navy">
                  {mod.module_key
                    .replace(/^mod_\d+_/, "")
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </span>
              </div>
              <p className="text-sm text-gray-600">{mod.executive_summary}</p>
            </div>
          ))}
      </div>
    </div>
  );
}
