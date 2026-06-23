import { useState } from "react";

const KEYS = [
  "expense_ledger_v4",
  "expense_ledger_v3",
  "expense_ledger_v2",
  "expense_ledger_v1",
  "expense_ledger",
];

export default function App() {
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [found,  setFound]  = useState(null); // key name that had data

  function exportData() {
    // Try every known key, use whichever has data
    let raw = null;
    let foundKey = null;
    for (const key of KEYS) {
      const val = localStorage.getItem(key);
      if (val) { raw = val; foundKey = key; break; }
    }

    if (!raw) {
      setOutput("Nothing found in localStorage under any known key.\n\nKnown keys tried:\n" + KEYS.join("\n"));
      setFound(null);
      return;
    }

    // Pretty-print if valid JSON, otherwise dump raw
    try {
      const parsed = JSON.parse(raw);
      setOutput(JSON.stringify(parsed, null, 2));
    } catch {
      setOutput(raw);
    }
    setFound(foundKey);
  }

  function copyToClipboard() {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function selectAll(e) {
    e.target.select();
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Expense Ledger</h1>
        <p style={s.sub}>Data exporter — open this on your phone, tap Export, then copy the text.</p>

        <button style={s.exportBtn} onClick={exportData}>
          Export data from this device
        </button>

        {found && (
          <p style={s.foundNote}>Found data under key: <strong>{found}</strong></p>
        )}

        {output && (
          <>
            <div style={s.textareaWrap}>
              <textarea
                style={s.textarea}
                value={output}
                readOnly
                onClick={selectAll}
                spellCheck={false}
              />
            </div>
            <button style={s.copyBtn} onClick={copyToClipboard}>
              {copied ? "Copied ✓" : "Copy all to clipboard"}
            </button>
            <p style={s.hint}>
              Tap inside the box to select all, or use the Copy button above.
              Paste this text somewhere safe (Notes, email to yourself, etc.)
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#F7F4EE",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "40px 20px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: "32px 28px",
    width: "100%",
    maxWidth: 600,
    boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#141414",
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    color: "#6B6B6B",
    marginBottom: 28,
    lineHeight: 1.5,
  },
  exportBtn: {
    width: "100%",
    background: "#141414",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "16px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 16,
  },
  foundNote: {
    fontSize: 12,
    color: "#6B6B6B",
    marginBottom: 16,
  },
  textareaWrap: {
    marginBottom: 12,
  },
  textarea: {
    width: "100%",
    height: 320,
    background: "#F7F4EE",
    border: "1px solid #E5E5E5",
    borderRadius: 8,
    padding: 14,
    fontSize: 12,
    fontFamily: "monospace",
    color: "#141414",
    resize: "vertical",
    lineHeight: 1.5,
    boxSizing: "border-box",
  },
  copyBtn: {
    width: "100%",
    background: "#2D6A4F",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "14px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 12,
    transition: "opacity 0.15s",
  },
  hint: {
    fontSize: 12,
    color: "#A8A8A8",
    lineHeight: 1.6,
    textAlign: "center",
  },
};
