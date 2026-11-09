// Run 50: pure merge rules for future two-device sync (item #7, step S2).
// NOT wired into the app yet: records are not stamped with updatedAt, deletions are not recorded as tombstones,
// and there is no transport (Drive/file). This module only defines and tests how two copies combine.
//
// A record is { id, updatedAt (ms number), deleted?: true, ...fields }.
// Rules, per id: the higher updatedAt wins; on an equal stamp a deletion wins; if still equal, the
// record whose JSON text sorts lower wins, so the answer never depends on which device merges.
// Result: commutative (merge(a,b) = merge(b,a)), idempotent (merge(a,a) = a), associative.

const stamp = (r) => (r && Number.isFinite(r.updatedAt) ? r.updatedAt : 0);

export function pickRecord(a, b) {
  if (!a) return b;
  if (!b) return a;
  const sa = stamp(a), sb = stamp(b);
  if (sa !== sb) return sa > sb ? a : b;
  const da = a.deleted === true, db = b.deleted === true;
  if (da !== db) return da ? a : b;
  return stableText(a) <= stableText(b) ? a : b;
}

function stableText(v) {
  if (Array.isArray(v)) return "[" + v.map(stableText).join(",") + "]";
  if (v && typeof v === "object") return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stableText(v[k])).join(",") + "}";
  return JSON.stringify(v === undefined ? null : v);
}

// Merges two lists of records. Records without a usable id are kept from both sides untouched (never silently dropped).
export function mergeRecords(localList, remoteList) {
  const byId = new Map();
  const loose = [];
  for (const r of [...(localList || []), ...(remoteList || [])]) {
    if (!r || typeof r !== "object" || r.id === undefined || r.id === null) { if (r) loose.push(r); continue; }
    const k = String(r.id);
    byId.set(k, pickRecord(byId.get(k), r));
  }
  const out = [...byId.values()];
  out.sort((x, y) => (String(x.id) < String(y.id) ? -1 : String(x.id) > String(y.id) ? 1 : 0));
  return out.concat(loose);
}

// Tombstones older than keepMs are dropped (default 90 days) so the file does not grow forever.
export function pruneTombstones(list, now, keepMs = 90 * 86400000) {
  return (list || []).filter((r) => !(r && r.deleted === true && now - stamp(r) > keepMs));
}

// The records a screen should show: everything that is not a tombstone.
export const liveRecords = (list) => (list || []).filter((r) => r && r.deleted !== true);

// Combines two whole data sets that hold named collections, e.g. { transactions, goals, bills }.
export function mergeCollections(local, remote, names) {
  const out = {};
  for (const n of names) out[n] = mergeRecords(local && local[n], remote && remote[n]);
  return out;
}
