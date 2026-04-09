import { useEffect, useState } from "react";
import { useProjectContext } from "@/features/projects/ProjectDetail";
import {
  getDocuments,
  deleteDocument,
  downloadDocumentUrl,
  updateDocumentType,
} from "@/api/client";
import FileUpload from "@/components/FileUpload";
import MissingDocsChecklist from "@/components/MissingDocsChecklist";
import { Download, Trash2, FileText } from "lucide-react";

const DOC_TYPES = [
  { value: "", label: "Select type..." },
  { value: "bbr_extract", label: "BBR Extract" },
  { value: "floor_plans", label: "Floor Plans" },
  { value: "energy_certificate", label: "Energy Certificate" },
  { value: "lokalplan", label: "Lokalplan" },
  { value: "kommuneplan", label: "Kommuneplan" },
  { value: "occupation_permit", label: "Occupation Permit" },
  { value: "building_permit", label: "Building Permit" },
  { value: "rent_roll", label: "Rent Roll" },
  { value: "lease_agreements", label: "Lease Agreements" },
  { value: "financial_model", label: "Financial Model" },
  { value: "valuation_report", label: "Valuation Report" },
  { value: "dgnb_certificate", label: "DGNB Certificate" },
  { value: "environmental_report", label: "Environmental Report" },
  { value: "title_deed", label: "Title Deed" },
  { value: "cadastral_map", label: "Cadastral Map" },
  { value: "market_report", label: "Market Report" },
  { value: "structural_survey", label: "Structural Survey" },
  { value: "insurance_policy", label: "Insurance Policy" },
  { value: "tax_assessment", label: "Tax Assessment" },
  { value: "ownership_structure", label: "Ownership Structure" },
];

const STATUS_COLORS: Record<string, string> = {
  pending:  "bg-gray-100 text-gray-500",
  parsing:  "bg-gray-100 text-gray-600",
  parsed:   "bg-gray-800 text-white",
  failed:   "bg-red-50 text-red-500",
};

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsTab() {
  const { project } = useProjectContext();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getDocuments(project.id)
      .then(setDocs)
      .finally(() => {
        setLoading(false);
        window.dispatchEvent(new Event("dd-docs-changed"));
      });
  };

  useEffect(() => {
    load();
  }, [project.id]);

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
    load();
  };

  const handleTypeChange = async (docId: string, type: string) => {
    if (!type) return;
    await updateDocumentType(docId, type);
    load();
  };

  return (
    <div>
      <FileUpload projectId={project.id} onUploaded={load} />

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-gray-600" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-50" />
          <p>No documents uploaded yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden mt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Filename</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Document Category</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Size</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-normal text-gray-700 truncate max-w-[200px]">
                    {doc.original_filename}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 uppercase tracking-wide">
                    {doc.file_type}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={doc.document_type || ""}
                      onChange={(e) => handleTypeChange(doc.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600 outline-none focus:border-gray-400"
                    >
                      {DOC_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {formatSize(doc.file_size_bytes)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[doc.parse_status] || ""}`}
                    >
                      {doc.parse_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <a
                        href={downloadDocumentUrl(doc.id)}
                        className="text-gray-300 hover:text-gray-600 transition-colors"
                        title="Download"
                      >
                        <Download size={16} />
                      </a>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MissingDocsChecklist projectId={project.id} />
    </div>
  );
}
