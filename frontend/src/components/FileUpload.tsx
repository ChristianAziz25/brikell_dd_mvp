import { useState, useRef, useCallback } from "react";
import { Upload, X } from "lucide-react";

interface Props {
  projectId: string;
  onUploaded: () => void;
}

interface UploadingFile {
  name: string;
  progress: number;
  error?: string;
}

const ACCEPTED = ".pdf,.docx,.csv,.xlsx,.xls,.txt";

export default function FileUpload({ projectId, onUploaded }: Props) {
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    (files: FileList) => {
      const items: UploadingFile[] = Array.from(files).map((f) => ({
        name: f.name,
        progress: 0,
      }));
      setUploading(items);

      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploading((prev) => prev.map((f) => ({ ...f, progress: pct })));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploading([]);
          onUploaded();
        } else {
          setUploading((prev) =>
            prev.map((f) => ({ ...f, error: "Upload failed" }))
          );
        }
      };
      xhr.onerror = () => {
        setUploading((prev) =>
          prev.map((f) => ({ ...f, error: "Network error" }))
        );
      };
      xhr.open("POST", `/api/v1/projects/${projectId}/documents`);
      xhr.send(formData);
    },
    [projectId, onUploaded]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
  };

  return (
    <div className="mb-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-gold bg-gold/5"
            : "border-gray-300 hover:border-gold/50"
        }`}
      >
        <Upload size={32} className="mx-auto mb-3 text-gray-400" />
        <p className="text-sm text-gray-600">
          Drag & drop files here, or <span className="text-gold font-medium">browse</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          PDF, DOCX, CSV, XLSX, TXT
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          onChange={(e) => e.target.files && upload(e.target.files)}
          className="hidden"
        />
      </div>

      {uploading.length > 0 && (
        <div className="mt-3 space-y-2">
          {uploading.map((f, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="truncate flex-1">{f.name}</span>
              {f.error ? (
                <span className="text-error text-xs">{f.error}</span>
              ) : (
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold transition-all"
                    style={{ width: `${f.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
