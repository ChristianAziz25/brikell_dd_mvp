import { useEffect, useState, useRef } from "react";
import { useProjectContext } from "@/features/projects/ProjectDetail";
import { getModules, runModules, getModuleProgress, getGapsSummary } from "@/api/client";
import {
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock size={16} className="text-gray-400" />,
  running: <Loader2 size={16} className="text-blue-500 animate-spin" />,
  complete: <CheckCircle size={16} className="text-success" />,
  failed: <XCircle size={16} className="text-error" />,
};

export default function ModulesTab() {
  const { project, reload } = useProjectContext();
  const [modules, setModules] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [readyToRun, setReadyToRun] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadModules = () => {
    getModules(project.id).then(setModules);
    getModuleProgress(project.id).then(setProgress);
    getGapsSummary(project.id)
      .then((g) => setReadyToRun(g.ready_to_run ?? true))
      .catch(() => {});
  };

  useEffect(() => {
    loadModules();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [project.id]);

  useEffect(() => {
    if (running || project.status === "running") {
      pollRef.current = setInterval(() => {
        loadModules();
      }, 3000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [running, project.status]);

  useEffect(() => {
    if (progress && progress.running === 0 && running) {
      setRunning(false);
      reload();
    }
  }, [progress]);

  const handleRun = async () => {
    setRunning(true);
    await runModules(project.id);
    reload();
  };

  const completePct = progress
    ? Math.round((progress.complete / progress.total) * 100)
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-navy">DD Modules</h3>
          {progress && (
            <p className="text-sm text-gray-500 mt-1">
              {progress.complete}/{progress.total} complete
              {progress.failed > 0 && (
                <span className="text-error ml-2">
                  ({progress.failed} failed)
                </span>
              )}
            </p>
          )}
        </div>
        <button
          onClick={handleRun}
          disabled={running || project.status === "running" || !readyToRun}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-navy font-semibold rounded-lg text-sm hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {running || project.status === "running" ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Running...
            </>
          ) : (
            <>
              <Play size={16} /> Run All Modules
            </>
          )}
        </button>
      </div>

      {/* Progress bar */}
      {progress && progress.total > 0 && (
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gold transition-all duration-500"
            style={{ width: `${completePct}%` }}
          />
        </div>
      )}

      {/* Module list */}
      <div className="space-y-2">
        {modules.length === 0 && !running ? (
          <div className="text-center py-12 text-gray-400">
            <p>No module results yet. Click "Run All Modules" to start.</p>
          </div>
        ) : (
          modules.map((mod) => (
            <div
              key={mod.module_key}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpanded(expanded === mod.module_key ? null : mod.module_key)
                }
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
              >
                {STATUS_ICON[mod.status] || STATUS_ICON.pending}
                <span className="text-xs text-gray-400 font-mono w-6">
                  {String(mod.module_number).padStart(2, "0")}
                </span>
                <span className="font-medium text-sm flex-1">
                  {mod.module_key.replace(/^mod_\d+_/, "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </span>
                {mod.status === "complete" && (
                  expanded === mod.module_key ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )
                )}
              </button>

              {expanded === mod.module_key && mod.status === "complete" && (
                <div className="px-4 pb-4 border-t">
                  {/* Executive Summary */}
                  {mod.executive_summary && (
                    <div className="mt-3">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                        Executive Summary
                      </h4>
                      <p className="text-sm text-gray-700">
                        {mod.executive_summary}
                      </p>
                    </div>
                  )}

                  {/* Key Metrics */}
                  {mod.key_metrics &&
                    Object.keys(mod.key_metrics).length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Key Metrics
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.entries(mod.key_metrics).map(
                            ([k, v]) => (
                              <div
                                key={k}
                                className="bg-gray-50 rounded px-3 py-2"
                              >
                                <p className="text-xs text-gray-500">
                                  {k.replace(/_/g, " ")}
                                </p>
                                <p className="text-sm font-medium">
                                  {String(v)}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Risk Flags */}
                  {mod.risk_flags && mod.risk_flags.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                        Risk Flags
                      </h4>
                      <div className="space-y-1">
                        {mod.risk_flags.map((flag: string, i: number) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-sm"
                          >
                            <AlertTriangle
                              size={14}
                              className="text-warning mt-0.5 shrink-0"
                            />
                            <span className="text-gray-700">{flag}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
