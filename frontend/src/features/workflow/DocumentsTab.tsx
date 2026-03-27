import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import FileUpload from '../../components/FileUpload';
import { getDocuments, deleteDocument, downloadDocumentUrl } from '../../api/client';

interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  status: string;
  uploaded_at: string;
}

const statusBadge: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#E0E0E0', text: '#555' },
  parsing: { bg: '#CCE5FF', text: '#004085' },
  parsed: { bg: '#D4EDDA', text: '#155724' },
  failed: { bg: '#F8D7DA', text: '#721C24' },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsTab() {
  const { id: projectId } = useParams<{ id: string }>();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    getDocuments(projectId)
      .then(setDocs)
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(fetchDocs, [fetchDocs]);

  async function handleDelete(doc: Document) {
    if (!confirm(`Delete "${doc.filename}"?`)) return;
    try {
      await deleteDocument(doc.id);
      fetchDocs();
    } catch {
      // silently fail — user can retry
    }
  }

  function handleDownload(doc: Document) {
    window.open(downloadDocumentUrl(doc.id), '_blank');
  }

  if (!projectId) return null;

  return (
    <div>
      <FileUpload projectId={projectId} onUploadComplete={fetchDocs} />

      <h3 style={{ color: '#1A2B3C', fontSize: 17, marginBottom: 12, marginTop: 8 }}>Uploaded Documents</h3>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 28, height: 28, border: '3px solid #E0E0E0', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#999', fontSize: 15 }}>
          No documents uploaded yet
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', border: '1px solid #E0E0E0' }}>
            <thead>
              <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E0E0E0' }}>
                {['Filename', 'Type', 'Size', 'Status', 'Uploaded', '', ''].map((h, i) => (
                  <th key={i} style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#888', textAlign: 'left', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => {
                const badge = statusBadge[doc.status] ?? statusBadge.pending;
                return (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                    <td style={cellStyle}>
                      <span style={{ fontWeight: 500, color: '#1A2B3C' }}>{doc.filename}</span>
                    </td>
                    <td style={cellStyle}>
                      <span style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>{doc.file_type}</span>
                    </td>
                    <td style={cellStyle}>{formatSize(doc.file_size_bytes)}</td>
                    <td style={cellStyle}>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 10, background: badge.bg, color: badge.text, textTransform: 'capitalize' }}>
                        {doc.status}
                      </span>
                    </td>
                    <td style={cellStyle}>{new Date(doc.uploaded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td style={{ ...cellStyle, width: 40 }}>
                      <button onClick={() => handleDownload(doc)} style={iconBtnStyle} title="Download">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5v14m0 0l-4-4m4 4l4-4" />
                          <path d="M5 19h14" />
                        </svg>
                      </button>
                    </td>
                    <td style={{ ...cellStyle, width: 40 }}>
                      <button onClick={() => handleDelete(doc)} style={iconBtnStyle} title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C0614A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 14,
  color: '#555',
};

const iconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 4,
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
