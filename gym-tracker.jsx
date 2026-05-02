import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "gym_tracker_data_v1";

const EXERCISES = [
  "Bench Press", "Squat", "Deadlift", "Overhead Press",
  "Barbell Row", "Pull-Up", "Dip", "Incline Press",
  "Leg Press", "Romanian Deadlift", "Bicep Curl", "Tricep Pushdown",
  "Lateral Raise", "Cable Fly", "Hip Thrust", "Calf Raise"
];

const MUSCLE_GROUPS = {
  "Bench Press": "Chest", "Squat": "Legs", "Deadlift": "Back",
  "Overhead Press": "Shoulders", "Barbell Row": "Back", "Pull-Up": "Back",
  "Dip": "Chest", "Incline Press": "Chest", "Leg Press": "Legs",
  "Romanian Deadlift": "Legs", "Bicep Curl": "Arms", "Tricep Pushdown": "Arms",
  "Lateral Raise": "Shoulders", "Cable Fly": "Chest", "Hip Thrust": "Legs",
  "Calf Raise": "Legs"
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function GymTracker() {
  const [view, setView] = useState("log"); // log | history | progress
  const [logs, setLogs] = useState([]);
  const [exercise, setExercise] = useState(EXERCISES[0]);
  const [sets, setSets] = useState([{ reps: "", weight: "" }]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0]);
  const [customExercise, setCustomExercise] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLogs(JSON.parse(raw));
    } catch {}
  }, []);

  const saveLogs = (updated) => {
    setLogs(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  };

  const addSet = () => setSets([...sets, { reps: "", weight: "" }]);
  const removeSet = (i) => setSets(sets.filter((_, idx) => idx !== i));
  const updateSet = (i, field, val) => {
    const next = [...sets];
    next[i] = { ...next[i], [field]: val };
    setSets(next);
  };

  const handleLog = () => {
    const ex = useCustom ? customExercise.trim() : exercise;
    if (!ex) return;
    const validSets = sets.filter(s => s.reps && s.weight);
    if (!validSets.length) return;
    const entry = {
      id: Date.now(),
      date: todayISO(),
      exercise: ex,
      sets: validSets.map(s => ({ reps: Number(s.reps), weight: Number(s.weight) })),
      note: note.trim(),
    };
    saveLogs([entry, ...logs]);
    setSets([{ reps: "", weight: "" }]);
    setNote("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const deleteLog = (id) => saveLogs(logs.filter(l => l.id !== id));

  // Progress: best set per exercise over time
  const getProgressData = (ex) => {
    return logs
      .filter(l => l.exercise === ex)
      .map(l => ({
        date: l.date,
        best: Math.max(...l.sets.map(s => s.weight)),
        volume: l.sets.reduce((sum, s) => sum + s.reps * s.weight, 0),
      }))
      .reverse();
  };

  const progressData = getProgressData(selectedExercise);
  const maxWeight = progressData.length ? Math.max(...progressData.map(d => d.best)) : 0;

  const exerciseList = [...new Set(logs.map(l => l.exercise))];

  const grouped = logs.reduce((acc, l) => {
    if (!acc[l.date]) acc[l.date] = [];
    acc[l.date].push(l);
    return acc;
  }, {});

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#e8e8e8",
      fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif",
      letterSpacing: "0.02em",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        borderBottom: "3px solid #e8e8e8",
        padding: "20px 24px 16px",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        background: "#0a0a0a",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "#ff3c00", textTransform: "uppercase" }}>
            Iron Log
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Gym Tracker
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#666", fontFamily: "'Barlow', sans-serif", textAlign: "right" }}>
          {logs.length} entries<br />
          {Object.keys(grouped).length} sessions
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", borderBottom: "1px solid #222" }}>
        {[["log", "LOG WORKOUT"], ["history", "HISTORY"], ["progress", "PROGRESS"]].map(([key, label]) => (
          <button key={key} onClick={() => setView(key)} style={{
            flex: 1,
            padding: "14px 0",
            background: view === key ? "#ff3c00" : "transparent",
            color: view === key ? "#fff" : "#666",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.12em",
            fontFamily: "'Barlow Condensed', sans-serif",
            transition: "all 0.15s",
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: "24px 20px", maxWidth: 600, margin: "0 auto" }}>

        {/* LOG VIEW */}
        {view === "log" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <Label>Exercise</Label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <ToggleButton active={!useCustom} onClick={() => setUseCustom(false)}>Preset</ToggleButton>
                <ToggleButton active={useCustom} onClick={() => setUseCustom(true)}>Custom</ToggleButton>
              </div>
              {useCustom ? (
                <StyledInput
                  placeholder="e.g. Hack Squat"
                  value={customExercise}
                  onChange={e => setCustomExercise(e.target.value)}
                />
              ) : (
                <StyledSelect value={exercise} onChange={e => setExercise(e.target.value)}>
                  {EXERCISES.map(ex => (
                    <option key={ex} value={ex}>{ex} — {MUSCLE_GROUPS[ex]}</option>
                  ))}
                </StyledSelect>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Label>Sets</Label>
                <button onClick={addSet} style={{
                  background: "transparent", border: "1px solid #444", color: "#ff3c00",
                  padding: "4px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  letterSpacing: "0.1em", fontFamily: "'Barlow Condensed', sans-serif",
                }}>+ ADD SET</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 32px", gap: "6px 8px", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: "0.1em" }}>#</span>
                <span style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: "0.1em" }}>REPS</span>
                <span style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: "0.1em" }}>WEIGHT (lbs)</span>
                <span />
              </div>

              {sets.map((s, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 32px", gap: "6px 8px", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ color: "#ff3c00", fontWeight: 800, fontSize: 15 }}>{i + 1}</span>
                  <StyledInput
                    type="number"
                    placeholder="0"
                    value={s.reps}
                    onChange={e => updateSet(i, "reps", e.target.value)}
                    style={{ textAlign: "center" }}
                  />
                  <StyledInput
                    type="number"
                    placeholder="0"
                    value={s.weight}
                    onChange={e => updateSet(i, "weight", e.target.value)}
                    style={{ textAlign: "center" }}
                  />
                  <button onClick={() => removeSet(i)} style={{
                    background: "transparent", border: "none", color: "#444", cursor: "pointer",
                    fontSize: 18, lineHeight: 1, padding: 0,
                  }} disabled={sets.length === 1}>×</button>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 24 }}>
              <Label>Note (optional)</Label>
              <StyledInput
                placeholder="How it felt, PR attempt, etc."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            <button onClick={handleLog} style={{
              width: "100%",
              padding: "16px",
              background: saved ? "#1a5c1a" : "#ff3c00",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: "0.15em",
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: "uppercase",
              transition: "background 0.3s",
            }}>
              {saved ? "✓ LOGGED" : "LOG SET"}
            </button>
          </div>
        )}

        {/* HISTORY VIEW */}
        {view === "history" && (
          <div>
            {Object.keys(grouped).length === 0 && (
              <Empty>No workouts logged yet. Start grinding!</Empty>
            )}
            {Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([date, entries]) => (
              <div key={date} style={{ marginBottom: 28 }}>
                <div style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: "0.2em",
                  color: "#ff3c00", textTransform: "uppercase", marginBottom: 10,
                  borderBottom: "1px solid #222", paddingBottom: 6,
                }}>
                  {formatDate(date)}
                </div>
                {entries.map(entry => (
                  <div key={entry.id} style={{
                    background: "#111",
                    border: "1px solid #222",
                    padding: "12px 14px",
                    marginBottom: 8,
                    position: "relative",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 18, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {entry.exercise}
                        </div>
                        <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                          {entry.sets.map((s, i) => `${s.reps}×${s.weight}lbs`).join("  |  ")}
                        </div>
                        {entry.note && <div style={{ fontSize: 12, color: "#888", marginTop: 4, fontStyle: "italic" }}>{entry.note}</div>}
                      </div>
                      <button onClick={() => deleteLog(entry.id)} style={{
                        background: "transparent", border: "none", color: "#333",
                        cursor: "pointer", fontSize: 16, padding: "0 0 0 12px",
                      }}>✕</button>
                    </div>
                    <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
                      <Stat label="SETS" value={entry.sets.length} />
                      <Stat label="BEST" value={`${Math.max(...entry.sets.map(s => s.weight))}lbs`} />
                      <Stat label="VOL" value={`${entry.sets.reduce((sum, s) => sum + s.reps * s.weight, 0).toLocaleString()}lbs`} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* PROGRESS VIEW */}
        {view === "progress" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <Label>Track Exercise</Label>
              <StyledSelect value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)}>
                {[...EXERCISES, ...exerciseList.filter(ex => !EXERCISES.includes(ex))].map(ex => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </StyledSelect>
            </div>

            {progressData.length === 0 ? (
              <Empty>No data for {selectedExercise} yet.</Empty>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
                  <BigStat label="SESSIONS" value={progressData.length} />
                  <BigStat label="BEST WEIGHT" value={`${maxWeight}lbs`} />
                  <BigStat label="LAST SESSION" value={formatDate(progressData[progressData.length - 1].date)} small />
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", color: "#666", marginBottom: 10 }}>
                    WEIGHT PROGRESSION
                  </div>
                  <div style={{ position: "relative", height: 140, background: "#0d0d0d", border: "1px solid #1a1a1a", padding: "12px 8px 24px" }}>
                    {progressData.map((d, i) => {
                      const x = progressData.length === 1 ? 50 : (i / (progressData.length - 1)) * 100;
                      const y = maxWeight ? (1 - d.best / maxWeight) * 100 : 50;
                      return (
                        <div key={i} title={`${formatDate(d.date)}: ${d.best}lbs`} style={{
                          position: "absolute",
                          left: `calc(${x}% - 5px)`,
                          top: `calc(${y}% - 5px)`,
                          width: 10, height: 10,
                          background: "#ff3c00",
                          borderRadius: "50%",
                          cursor: "pointer",
                        }} />
                      );
                    })}
                    {progressData.length > 1 && (
                      <svg style={{ position: "absolute", inset: "12px 8px 24px", width: "calc(100% - 16px)", height: "calc(100% - 36px)", overflow: "visible" }}>
                        <polyline
                          points={progressData.map((d, i) => {
                            const x = (i / (progressData.length - 1)) * 100;
                            const y = maxWeight ? (1 - d.best / maxWeight) * 100 : 50;
                            return `${x}%,${y}%`;
                          }).join(" ")}
                          fill="none"
                          stroke="#ff3c0055"
                          strokeWidth="2"
                        />
                      </svg>
                    )}
                    <div style={{ position: "absolute", bottom: 4, left: 8, right: 8, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 9, color: "#333" }}>{formatDate(progressData[0].date)}</span>
                      <span style={{ fontSize: 9, color: "#333" }}>{formatDate(progressData[progressData.length - 1].date)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", color: "#666", marginBottom: 10 }}>SESSION LOG</div>
                  {[...progressData].reverse().map((d, i) => (
                    <div key={i} style={{
                      display: "grid", gridTemplateColumns: "1fr auto auto",
                      gap: 12, padding: "10px 0",
                      borderBottom: "1px solid #1a1a1a",
                      alignItems: "center",
                    }}>
                      <span style={{ fontSize: 13, color: "#888" }}>{formatDate(d.date)}</span>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{d.best}lbs</span>
                      <span style={{ fontSize: 12, color: "#555" }}>{d.volume.toLocaleString()}lbs vol</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", color: "#666", textTransform: "uppercase", marginBottom: 6 }}>{children}</div>;
}

function StyledInput({ style, ...props }) {
  return (
    <input {...props} style={{
      width: "100%", background: "#111", border: "1px solid #2a2a2a",
      color: "#e8e8e8", padding: "10px 12px", fontSize: 15,
      fontFamily: "'Barlow', sans-serif", outline: "none",
      boxSizing: "border-box",
      ...style,
    }} />
  );
}

function StyledSelect({ children, ...props }) {
  return (
    <select {...props} style={{
      width: "100%", background: "#111", border: "1px solid #2a2a2a",
      color: "#e8e8e8", padding: "10px 12px", fontSize: 15,
      fontFamily: "'Barlow', sans-serif", outline: "none", cursor: "pointer",
      appearance: "none", boxSizing: "border-box",
    }}>{children}</select>
  );
}

function ToggleButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px",
      background: active ? "#ff3c00" : "transparent",
      border: `1px solid ${active ? "#ff3c00" : "#333"}`,
      color: active ? "#fff" : "#555",
      cursor: "pointer",
      fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
      fontFamily: "'Barlow Condensed', sans-serif",
    }}>{children}</button>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: "#444", fontWeight: 800, letterSpacing: "0.15em" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#ccc" }}>{value}</div>
    </div>
  );
}

function BigStat({ label, value, small }) {
  return (
    <div style={{ background: "#111", border: "1px solid #1a1a1a", padding: "12px 10px" }}>
      <div style={{ fontSize: 9, color: "#555", fontWeight: 800, letterSpacing: "0.15em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: small ? 13 : 20, fontWeight: 800, color: "#ff3c00", lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function Empty({ children }) {
  return (
    <div style={{ color: "#333", fontSize: 16, fontWeight: 700, textAlign: "center", padding: "60px 0", letterSpacing: "0.05em", textTransform: "uppercase" }}>
      {children}
    </div>
  );
}
