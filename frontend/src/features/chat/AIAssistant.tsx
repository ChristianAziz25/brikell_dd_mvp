import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { getProjects, getDocuments, sendChatMessage } from "@/api/client";
import { FileText, Plus, ArrowUp, RotateCcw } from "lucide-react";
import { HARDCODED_DOCS } from "@/data/vaultDocuments";

const VAULT_DOCUMENTS = [
  "BBR Extract",
  "Local Plan (Lokalplan)",
  "Rent Roll",
  "Annual Accounts",
  "Energy Certificate",
  "Tingbogsattest",
];

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

function findRelevantDocs(query: string): typeof HARDCODED_DOCS {
  const q = query.toLowerCase();
  return HARDCODED_DOCS.filter((doc) => {
    return (
      doc.name.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q) ||
      doc.description.toLowerCase().includes(q) ||
      doc.source.toLowerCase().includes(q) ||
      q.includes(doc.name.toLowerCase()) ||
      q.includes(doc.category.toLowerCase())
    );
  });
}

function buildContextFromDocs(docs: typeof HARDCODED_DOCS): string {
  if (docs.length === 0) return "";
  const docTexts = docs
    .map(
      (doc) =>
        `DOCUMENT: ${doc.name}\n` +
        `Category: ${doc.category}\n` +
        `Source: ${doc.source}\n` +
        `Date: ${doc.date}\n` +
        `Content: ${doc.description}`
    )
    .join("\n\n---\n\n");
  return `The following documents are available in the vault for this property:\n\n${docTexts}\n\n---\n\nUsing only the document content above, answer the user's question. If the answer is not in the documents, say so clearly.`;
}

export default function AIAssistant() {
  const location = useLocation();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (location.state?.prefillMessage && selectedProject) {
      handleSendWithMessage(location.state.prefillMessage);
    } else if (location.state?.prefillMessage) {
      setInput(location.state.prefillMessage);
    }
  }, [location.state, selectedProject]);

  useEffect(() => {
    getProjects().then(setProjects).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedProject) {
      getDocuments(selectedProject).then(setDocuments).catch(() => setDocuments([]));
    } else {
      setDocuments([]);
    }
  }, [selectedProject]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  const handleSendWithMessage = async (msg: string) => {
    if (!selectedProject || loading) return;
    const userMsg: Message = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const relevantDocs = findRelevantDocs(msg);
      const docContext = buildContextFromDocs(relevantDocs);
      const messageToSend = docContext
        ? `${docContext}\n\nUser question: ${msg}`
        : msg;

      const res = await sendChatMessage({
        project_id: selectedProject,
        message: messageToSend,
        history,
      });

      const assistantMsg: Message = {
        role: "assistant",
        content: res.answer,
        sources: relevantDocs.length > 0
          ? [...relevantDocs.map((d) => d.name), ...(res.sources || [])]
          : res.sources,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    const userMsg: Message = { role: "user", content: userText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const relevantDocs = findRelevantDocs(userText);
      const docContext = buildContextFromDocs(relevantDocs);
      const messageToSend = docContext
        ? `${docContext}\n\nUser question: ${userText}`
        : userText;

      const res = await sendChatMessage({
        project_id: selectedProject,
        message: messageToSend,
        history,
      });

      const assistantMsg: Message = {
        role: "assistant",
        content: res.answer,
        sources: relevantDocs.length > 0
          ? [...relevantDocs.map((d) => d.name), ...(res.sources || [])]
          : res.sources,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setSelectedProject("");
    setDocuments([]);
    setInput("");
  };

  const hasMessages = messages.length > 0;
  const canSend = input.trim().length > 0 && !loading;

  const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);

  // Determine which pills to show: real documents or hardcoded fallback
  const documentPills = documents.length > 0
    ? documents.map((doc) => ({ id: doc.id, name: doc.filename || doc.name || "file" }))
    : VAULT_DOCUMENTS.map((name) => ({ id: name, name }));

  /* ── Shared input box ── */
  const inputBox = (
    <div style={{ width: "100%", maxWidth: 820, margin: "0 auto" }}>
      {/* Document pills */}
      {selectedProject && (
        <div>
          <div
            style={{
              fontSize: 11,
              color: "var(--color-text-tertiary, #9ca3af)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 6,
            }}
          >
            Documents in vault
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              overflowX: "auto",
              paddingBottom: 8,
              scrollbarWidth: "none",
            }}
          >
            {documentPills.map((doc) => (
              <span
                key={doc.id}
                onClick={() =>
                  handleSendWithMessage(
                    `What does the ${doc.name} say about this property?`
                  )
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 20,
                  border: "0.5px solid var(--color-border-tertiary, #e5e7eb)",
                  background: "var(--color-background-secondary, #f9fafb)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  cursor: "pointer",
                }}
              >
                <FileText size={10} style={{ flexShrink: 0 }} />
                {truncate(doc.name, 24)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Input container */}
      <div
        style={{
          border: "0.5px solid var(--color-border-secondary, #d1d5db)",
          borderRadius: 16,
          background: "#fff",
          overflow: "hidden",
        }}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your properties..."
          rows={1}
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            resize: "none",
            padding: "26px 16px 20px",
            fontSize: 15,
            lineHeight: 1.5,
            color: "var(--color-text-primary, #111827)",
            background: "transparent",
            fontFamily: "inherit",
          }}
        />

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 10px",
            borderTop: "0.5px solid var(--color-border-tertiary, #f3f4f6)",
          }}
        >
          {/* Left: attach button */}
          <button
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "0.5px solid var(--color-border-tertiary, #e5e7eb)",
              background: "transparent",
              cursor: "pointer",
              color: "var(--color-text-tertiary, #9ca3af)",
            }}
          >
            <Plus size={14} />
          </button>

          {/* Right: project selector + send */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                fontSize: 13,
                color: "var(--color-text-secondary, #6b7280)",
                outline: "none",
                cursor: "pointer",
                maxWidth: 180,
              }}
            >
              <option value="">Select property...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address || p.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: 10,
                border: "none",
                background: canSend ? "var(--color-text-primary, #111827)" : "var(--color-border-tertiary, #e5e7eb)",
                color: canSend ? "#fff" : "var(--color-text-tertiary, #9ca3af)",
                cursor: canSend ? "pointer" : "default",
                transition: "background 150ms, color 150ms",
              }}
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── Empty state ── */
  if (!hasMessages) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          width: "100%",
          background: "#fff",
          padding: "0 24px",
        }}
      >
        <h1
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: "var(--color-text-primary, #111827)",
            margin: 0,
          }}
        >
          Welcome David
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "var(--color-text-tertiary, #9ca3af)",
            marginTop: 8,
            marginBottom: 32,
          }}
        >
          Ask anything about your properties and documents
        </p>
          {inputBox}
      </div>
    );
  }

  /* ── Chat state ── */
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "#fff",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 13, color: "var(--color-text-tertiary, #9ca3af)" }}>
          Brikell Intelligence
        </span>
        <button
          type="button"
          onClick={handleNewConversation}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--color-text-secondary, #6b7280)",
            background: "transparent",
            border: "0.5px solid var(--color-border-tertiary, #e5e7eb)",
            borderRadius: 8,
            padding: "5px 12px",
            cursor: "pointer",
          }}
        >
          <RotateCcw size={12} />
          New conversation
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 24px 16px",
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {messages.map((msg, i) => {
            const nextMsg = messages[i + 1];
            const showVaultIndicator =
              msg.role === "user" &&
              nextMsg?.role === "assistant" &&
              nextMsg.sources &&
              nextMsg.sources.length > 0;

            return (
              <div key={i}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                    marginBottom: showVaultIndicator ? 0 : 16,
                  }}
                >
                  <div
                    style={{
                      maxWidth: "70%",
                      ...(msg.role === "user"
                        ? {
                            background: "var(--color-text-primary, #111827)",
                            color: "#fff",
                            borderRadius: 12,
                            padding: "12px 16px",
                            fontSize: 14,
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                          }
                        : {
                            color: "var(--color-text-primary, #111827)",
                            fontSize: 14,
                            lineHeight: 1.7,
                            whiteSpace: "pre-wrap",
                          }),
                    }}
                  >
                    {msg.content}
                    {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          marginTop: 10,
                        }}
                      >
                        {msg.sources.map((s, j) => (
                          <span
                            key={j}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              padding: "4px 10px",
                              borderRadius: 20,
                              border: "0.5px solid var(--color-border-tertiary, #e5e7eb)",
                              background: "var(--color-background-secondary, #f9fafb)",
                              color: "var(--color-text-secondary, #6b7280)",
                            }}
                          >
                            <FileText size={10} />
                            {truncate(s, 24)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Vault search indicator between user msg and assistant response */}
                {showVaultIndicator && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 0 8px",
                      justifyContent: "flex-end",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: 11, color: "var(--color-text-tertiary, #9ca3af)" }}>
                      Searching vault:
                    </span>
                    {nextMsg.sources!.map((source, si) => (
                      <span
                        key={si}
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 20,
                          border: "0.5px solid var(--color-border-tertiary, #e5e7eb)",
                          color: "var(--color-text-tertiary, #9ca3af)",
                          background: "var(--color-background-secondary, #f9fafb)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M4 4h8M4 8h5M4 12h3" />
                          <rect x="2" y="2" width="12" height="12" rx="2" />
                        </svg>
                        {source}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading dots */}
          {loading && (
            <div style={{ display: "flex", gap: 5, padding: "8px 0" }}>
              {[0, 1, 2].map((n) => (
                <span
                  key={n}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--color-text-tertiary, #9ca3af)",
                    animation: "brikell-dot 1.2s ease-in-out infinite",
                    animationDelay: `${n * 0.2}s`,
                  }}
                />
              ))}
              <style>{`
                @keyframes brikell-dot {
                  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
                  40% { opacity: 1; transform: scale(1); }
                }
              `}</style>
            </div>
          )}
        </div>
      </div>

      {/* Bottom input */}
      <div style={{ padding: "0 24px 20px", flexShrink: 0 }}>
        {inputBox}
      </div>
    </div>
  );
}
