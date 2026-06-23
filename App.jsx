import { useState } from "react";

export default function App() {
  const [entries, setEntries] = useState(null); // array of { key, size, preview, full, copied }
  const [copiedAll, setCopiedAll] = useState(false);
  const [expandedKey, setExpandedKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  function dump() {
    const keys = Object.keys(localStorage);
    if (keys.length === 0) {
      setEntries([]);
      return;
    }
    const result = keys.map(key => {
      const raw = localStorage.getItem(key);
      let pretty = raw;
      try { pretty = JSON.stringify(JSON.parse(raw), null, 2); } catch {}
      return {
        key,
        size: new Blob([raw]).size,
        full: pretty,
        preview: pretty.slice(0, 120).replace(/\n/g, " ") + (pretty.length > 120 ? "…" : ""),
      };
    // Largest first — most likely to be the real data
    }).sort((a, b) => b.size - a.size);
    setEntries(result);
    setExpandedKey(result[0]?.key ?? null); // auto-expand the biggest
  }

  function copyOne(key, text) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  }

  function copyAll() {
    if (!entries) return;
    const blob = entries.map(e => `=== KEY: ${e.key} (${fmt(e.size)}) ===\n${e.full}`).join("\n\n");
    navigator.clipboard.writeText(blob).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    });
  }

  function fmt(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>localStorage Inspector</h1>
        <p style={s.sub}>
          Open this on your phone. Tap Scan — every key in storage appears, sorted largest first.
          Expand the one that looks like your transaction history and copy it.
        </p>

        <button style={s.scanBtn} onClick={dump}>
          Scan all localStorage
        </button>

        {/* Empty storage */}
        {entries !== null && entries.length === 0 && (
          <div style={s.empty}>
            localStorage is completely empty on this device / browser.
          </div>
        )}

        {/* Results */}
        {entries && entries.length > 0 && (
          <>
            <div style={s.summary}>
              Found <strong>{entries.length}</strong> key{entries.length !== 1 ? "s" : ""} —
              sorted by size, largest first.
            </div>

            <button style={s.copyAllBtn} onClick={copyAll}>
              {copiedAll ? "Copied ✓" : `Copy everything (all ${entries.length} keys)`}
            </button>

            {entries.map(entry => (
              <div key={entry.key} style={s.entry}>
                {/* Key header row */}
                <div style={s.entryHeader} onClick={() => setExpandedKey(expandedKey === entry.key ? null : entry.key)}>
                  <div style={s.entryMeta}>
                    <span style={s.keyName}>{entry.key}</span>
                    <span style={s.keySize}>{fmt(entry.size)}</span>
                  </div>
                  <span style={s.chevron}>{expandedKey === entry.key ? "▲" : "▼"}</span>
                </div>

                {/* Preview always visible */}
                <p style={s.preview}>{entry.preview}</p>

                {/* Full content when expanded */}
                {expandedKey === entry.key && (
                  <>
                    <textarea
                      style={s.textarea}
                      value={entry.full}
                      readOnly
                      onClick={e => e.target.select()}
                      spellCheck={false}
                    />
                    <button style={s.copyOneBtn} onClick={() => copyOne(entry.key, entry.full)}>
                      {copiedKey === entry.key ? "Copied ✓" : `Copy "${entry.key}"`}
                    </button>
                  </>
                )}
              </div>
            ))}
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
    justifyContent: "center",
    padding: "32px 16px 80px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 620,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#141414",
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    color: "#6B6B6B",
    lineHeight: 1.6,
    marginBottom: 24,
  },
  scanBtn: {
    width: "100%",
    background: "#141414",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "15px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: 20,
  },
  empty: {
    background: "#fff",
    borderRadius: 10,
    padding: "24px",
    fontSize: 14,
    color: "#6B6B6B",
    textAlign: "center",
  },
  summary: {
    fontSize: 13,
    color: "#6B6B6B",
    marginBottom: 10,
  },
  copyAllBtn: {
    width: "100%",
    background: "#2D6A4F",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "13px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 20,
  },
  entry: {
    background: "#fff",
    borderRadius: 10,
    padding: "14px 16px",
    marginBottom: 12,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  entryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    marginBottom: 6,
  },
  entryMeta: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  keyName: {
    fontFamily: "monospace",
    fontSize: 13,
    fontWeight: 700,
    color: "#141414",
    wordBreak: "break-all",
  },
  keySize: {
    fontSize: 11,
    background: "#F0EDE7",
    color: "#6B6B6B",
    padding: "2px 7px",
    borderRadius: 4,
    fontWeight: 600,
  },
  chevron: {
    fontSize: 10,
    color: "#A8A8A8",
    flexShrink: 0,
    marginLeft: 8,
  },
  preview: {
    fontSize: 11,
    color: "#A8A8A8",
    fontFamily: "monospace",
    lineHeight: 1.4,
    wordBreak: "break-all",
    marginBottom: 0,
  },
  textarea: {
    width: "100%",
    height: 260,
    background: "#F7F4EE",
    border: "1px solid #E5E5E5",
    borderRadius: 6,
    padding: 12,
    fontSize: 11,
    fontFamily: "monospace",
    color: "#141414",
    resize: "vertical",
    lineHeight: 1.5,
    boxSizing: "border-box",
    marginTop: 10,
  },
  copyOneBtn: {
    width: "100%",
    background: "#141414",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "11px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 8,
  },
};
