import { useEffect, useState } from "react";
import { useProjectContext } from "@/features/projects/ProjectDetail";
import { getReports, generateReport, downloadReportUrl } from "@/api/client";
import { Download, FileText, Loader2, Plus } from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ReportTab() {
  const { project } = useProjectContext();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = () => {
    setLoading(true);
    getReports(project.id)
      .then(setReports)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [project.id]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateReport(project.id);
      load();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-navy">Reports</h3>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-navy font-semibold rounded-lg text-sm hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {generating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          Generate New Report
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold border-t-transparent" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-50" />
          <p>No reports generated yet</p>
          <p className="text-sm mt-1">
            Complete the DD modules and generate a report
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.report_id}
              className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <FileText size={20} className="text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-navy">
                    {report.filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(report.generated_at).toLocaleString()} —{" "}
                    {formatSize(report.size_bytes)}
                  </p>
                </div>
              </div>
              <a
                href={downloadReportUrl(project.id, report.report_id)}
                className="flex items-center gap-2 px-3 py-2 bg-navy text-white rounded-lg text-sm hover:bg-navy-light transition-colors"
              >
                <Download size={14} />
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
