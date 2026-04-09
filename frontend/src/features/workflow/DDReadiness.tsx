import { useEffect, useState } from "react";
import { useProjectContext } from "@/features/projects/ProjectDetail";
import { getGapsSummary } from "@/api/client";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Minus,
  FileQuestion,
} from "lucide-react";

const STATUS_BADGE: Record<
  string,
  { bg: string; text: string; icon: React.ReactNode }
> = {
  sufficient: {
    bg: "bg-green-100",
    text: "text-green-700",
    icon: <CheckCircle size={14} />,
  },
  partial: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    icon: <AlertTriangle size={14} />,
  },
  missing: {
    bg: "bg-red-100",
    text: "text-red-700",
    icon: <XCircle size={14} />,
  },
  auto: {
    bg: "bg-gray-100",
    text: "text-gray-500",
    icon: <Minus size={14} />,
  },
};

function barColor(pct: number) {
  if (pct >= 75) return "bg-success";
  if (pct >= 40) return "bg-warning";
  return "bg-error";
}

export default function DDReadiness() {
  const { project } = useProjectContext();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getGapsSummary(project.id)
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();

    // Listen for custom event so DocumentsTab can trigger a refresh
    const handler = () => load();
    window.addEventListener("dd-docs-changed", handler);
    return () => window.removeEventListener("dd-docs-changed", handler);
  }, [project.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const pct = data.completeness_pct ?? 0;
  const modules: Record<string, any> = data.modules ?? {};
  const missingSummary: any[] = data.missing_summary ?? [];
  const suggestions: string[] = data.document_suggestions ?? [];
  const totalSufficient = (data.sufficient_count ?? 0) + (data.auto_count ?? 0);

  return (
    <div className="space-y-6">
      {/* Ready / Not Ready banner */}
      {data.ready_to_run ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm font-medium">
          <CheckCircle size={18} />
          Ready — you have enough data to run the full analysis.
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm font-medium">
          <AlertTriangle size={18} />
          Not ready — upload missing documents below before running analysis.
        </div>
      )}

      {/* Completeness bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-navy">
            DD Readiness
          </span>
          <span className="text-sm font-bold text-navy">{pct}%</span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor(pct)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {totalSufficient} of 16 modules have sufficient data
        </p>
      </div>

      {/* Module status grid */}
      {Object.keys(modules).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(modules).map(([key, mod]: [string, any]) => {
            const badge = STATUS_BADGE[mod.status] || STATUS_BADGE.auto;
            return (
              <div
                key={key}
                className="bg-white rounded-lg border border-gray-200 p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`${badge.text}`}>{badge.icon}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}
                  >
                    {mod.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-navy leading-tight">
                  {mod.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{mod.track}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Missing documents section */}
      {!data.ready_to_run && suggestions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileQuestion size={18} className="text-warning" />
            <h4 className="text-sm font-semibold text-navy">
              Upload these documents to complete the analysis
            </h4>
          </div>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 mb-4">
            {suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>

          {missingSummary.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              {missingSummary.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 text-sm"
                >
                  <span
                    className={`shrink-0 mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.priority === "high"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {item.priority}
                  </span>
                  <div>
                    <span className="font-medium text-navy">
                      {item.label}
                    </span>
                    {item.recommendation && (
                      <p className="text-gray-500 text-xs mt-0.5">
                        {item.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
