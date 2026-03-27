import { useRef, useState, useCallback, type DragEvent, type ChangeEvent } from 'react';

const ACCEPTED = '.pdf,.csv,.docx,.xlsx,.xls,.txt';
const ACCEPT_SET = new Set(['pdf', 'csv', 'docx', 'xlsx', 'xls', 'txt']);

interface FileEntry {
  file: File;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

interface FileUploadProps {
  projectId: string;
  onUploadComplete: () => void;
}

export default function FileUpload({ projectId, onUploadComplete }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(0);

  const uploadFile = useCallback((file: File, index: number) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/v1/projects/${projectId}/documents`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setEntries((prev) => prev.map((en, i) => i === index ? { ...en, progress: pct } : en));
      }
    };

    xhr.onload = () => {
      const ok = xhr.status >= 200 && xhr.status < 300;
      setEntries((prev) => prev.map((en, i) =>
        i === index ? { ...en, status: ok ? 'done' : 'error', progress: ok ? 100 : en.progress, error: ok ? undefined : `${xhr.status} ${xhr.statusText}` } : en
      ));
      pendingRef.current--;
      if (pendingRef.current === 0) onUploadComplete();
    };

    xhr.onerror = () => {
      setEntries((prev) => prev.map((en, i) =>
        i === index ? { ...en, status: 'error', error: 'Network error' } : en
      ));
      pendingRef.current--;
      if (pendingRef.current === 0) onUploadComplete();
    };

    const fd = new FormData();
    fd.append('files', file);
    xhr.send(fd);
  }, [projectId, onUploadComplete]);

  const processFiles = useCallback((files: FileList | File[]) => {
    const valid = Array.from(files).filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      return ACCEPT_SET.has(ext);
    });
    if (valid.length === 0) return;

    const startIndex = entries.length;
    const newEntries: FileEntry[] = valid.map((file) => ({ file, progress: 0, status: 'uploading' }));
    setEntries((prev) => [...prev, ...newEntries]);
    pendingRef.current += valid.length;
    valid.forEach((file, i) => uploadFile(file, startIndex + i));
  }, [entries.length, uploadFile]);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const onFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = '';
  }, [processFiles]);

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragOver ? '#C9A84C' : '#CCC'}`,
          borderRadius: 10,
          padding: '40px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? '#FDF8EC' : '#FAFAFA',
          transition: 'border-color 0.2s, background 0.2s',
          marginBottom: 20,
        }}
      >
        {/* Cloud icon */}
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={dragOver ? '#C9A84C' : '#AAA'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
          <path d="M12 16V8m0 0l-3 3m3-3l3 3" />
          <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
        </svg>
        <div style={{ color: '#666', fontSize: 15 }}>Drag files here or click to browse</div>
        <div style={{ color: '#AAA', fontSize: 13, marginTop: 4 }}>PDF, CSV, DOCX, XLSX, XLS, TXT</div>
        <input ref={inputRef} type="file" accept={ACCEPTED} multiple onChange={onFileChange} style={{ display: 'none' }} />
      </div>

      {/* File list */}
      {entries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map((entry, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #E0E0E0', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1A2B3C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.file.name}
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>{formatSize(entry.file.size)}</div>
              </div>
              {/* Progress bar */}
              <div style={{ width: 120, height: 6, background: '#E0E0E0', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  borderRadius: 3,
                  width: `${entry.progress}%`,
                  background: entry.status === 'error' ? '#C0614A' : entry.status === 'done' ? '#4CAF50' : '#C9A84C',
                  transition: 'width 0.2s',
                }} />
              </div>
              {/* Status icon */}
              {entry.status === 'done' && (
                <svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="#4CAF50" /><path d="M6 10l3 3 5-6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
              {entry.status === 'error' && (
                <svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="#C0614A" /><path d="M7 7l6 6M13 7l-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
              )}
              {entry.status === 'uploading' && (
                <div style={{ width: 20, height: 20, border: '2px solid #E0E0E0', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
