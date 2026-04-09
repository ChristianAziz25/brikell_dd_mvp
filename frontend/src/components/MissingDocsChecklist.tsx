import { useEffect, useState } from "react";
import { getMissingDocuments } from "@/api/client";
import { CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  projectId: string;
}

function formatType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MissingDocsChecklist({ projectId }: Props) {
  const [data, setData] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getMissingDocuments(projectId).then(setData);
  }, [projectId]);

  if (!data) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-navy">Document Completeness</h4>
        <span className="text-sm font-medium text-gray-600">
          {data.overall_completeness_pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-success transition-all duration-500"
          style={{ width: `${data.overall_completeness_pct}%` }}
        />
      </div>

      <div className="space-y-1">
        {data.modules.map((mod: any) => (
          <div key={mod.module_key} className="bg-white rounded border border-gray-200">
            <button
              onClick={() =>
                setExpanded(expanded === mod.module_key ? null : mod.module_key)
              }
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              {mod.complete ? (
                <CheckCircle size={14} className="text-success shrink-0" />
              ) : (
                <XCircle size={14} className="text-error shrink-0" />
              )}
              <span className="flex-1 truncate">
                <span className="text-gray-400 font-mono mr-1">
                  {String(mod.module_number).padStart(2, "0")}
                </span>
                {mod.module_name}
              </span>
              <span className="text-xs text-gray-400">
                {mod.uploaded_types.length}/{mod.required_types.length}
              </span>
              {expanded === mod.module_key ? (
                <ChevronDown size={14} className="text-gray-400" />
              ) : (
                <ChevronRight size={14} className="text-gray-400" />
              )}
            </button>

            {expanded === mod.module_key && (
              <div className="px-3 pb-2 border-t">
                <div className="mt-2 space-y-1">
                  {mod.required_types.map((type: string) => {
                    const uploaded = mod.uploaded_types.includes(type);
                    return (
                      <div key={type} className="flex items-center gap-2 text-xs">
                        {uploaded ? (
                          <CheckCircle size={12} className="text-success" />
                        ) : (
                          <XCircle size={12} className="text-error" />
                        )}
                        <span className={uploaded ? "text-gray-600" : "text-gray-800 font-medium"}>
                          {formatType(type)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
