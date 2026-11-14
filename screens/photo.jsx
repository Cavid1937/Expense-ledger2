// Run 87 (owner's list, 14 Nov: "photo attachment is not done yet"): a receipt photo can be attached to a saved entry.
// Photos are NEVER stored in expense_ledger_v5. They live in their own IndexedDB database on this device, keyed by the entry id,
// as a downscaled JPEG (longest side 1280 px). Re-encoding drops the camera's hidden details (EXIF, including GPS location).
// They are not part of backups, CSV files or the account copy; the entry view says so in plain words, not behind a tip.
// Deleting an entry does not delete its photo at once (Undo, or bringing back an older backup, would otherwise lose it):
// a photo whose entry is gone is cleared only after it has been missing for 30 days, and only after a good load.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t } from "../i18n.js";
import { useBackStep } from "./motion.jsx";

export const PHOTO_DB = "expense_ledger_v5__photos";
const STORE = "photos";
export const PHOTO_MAX_SIDE = 1280;
export const PHOTO_MAX_BYTES = 25 * 1024 * 1024;
export const PHOTO_GRACE_DAYS = 30;
const DAY = 86400000;

let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    try {
      if (typeof indexedDB === "undefined" || !indexedDB) { rej(new Error("unavailable")); return; }
      const r = indexedDB.open(PHOTO_DB, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error || new Error("open"));
      r.onblocked = () => rej(new Error("blocked"));
    } catch (e) { rej(e); }
  });
  // a failed open may succeed later (private window closed, storage freed): try again next time
  dbp.catch(() => { dbp = null; });
  return dbp;
}
function run(mode, fn) {
  return db().then((d) => new Promise((res, rej) => {
    let out;
    const tx = d.transaction(STORE, mode), st = tx.objectStore(STORE);
    const req = fn(st);
    if (req) req.onsuccess = () => { out = req.result; };
    tx.oncomplete = () => res(out);
    tx.onerror = () => rej(tx.error || new Error("tx"));
    tx.onabort = () => rej(tx.error || new Error("abort"));
  }));
}
const key = (id) => String(id);

export const getPhoto = (id) => run("readonly", (st) => st.get(key(id))).then((v) => (v && v.blob ? v : null));
export const deletePhoto = (id) => run("readwrite", (st) => st.delete(key(id)));
export const photoKeys = () => run("readonly", (st) => st.getAllKeys()).then((k) => k || []);
export async function savePhotoBlob(id, blob, extra = {}) {
  return run("readwrite", (st) => st.put({ blob, at: new Date().toISOString(), ...extra }, key(id)));
}
// Split makes new entries; the photo goes with the first part (the original stays until it has been missing for 30 days).
export async function copyPhoto(from, to) {
  const v = await getPhoto(from); if (!v) return false;
  await run("readwrite", (st) => st.put({ blob: v.blob, at: v.at, w: v.w, h: v.h }, key(to)));
  return true;
}

// Downscale + re-encode. Errors: "big" (over 25 MB), "decode" (cannot read the picture, e.g. some HEIC files).
export async function shrinkImage(file, maxSide = PHOTO_MAX_SIDE) {
  if (!file || !(file.size > 0)) throw new Error("decode");
  if (file.size > PHOTO_MAX_BYTES) throw new Error("big");
  let src = null, w = 0, h = 0, url = null;
  try {
    if (typeof createImageBitmap === "function") {
      try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { src = null; }
    }
    if (!src) {
      url = URL.createObjectURL(file);
      src = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error("decode")); im.src = url; });
    }
    w = src.width || src.naturalWidth; h = src.height || src.naturalHeight;
    if (!(w > 0 && h > 0)) throw new Error("decode");
    const k = Math.min(1, maxSide / Math.max(w, h)), cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
    const c = document.createElement("canvas"); c.width = cw; c.height = ch;
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cw, ch); g.drawImage(src, 0, 0, cw, ch);
    const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.72));
    if (!blob) throw new Error("decode");
    return { blob, w: cw, h: ch };
  } catch (e) {
    throw new Error(e && (e.message === "big" || e.message === "decode") ? e.message : "decode");
  } finally {
    if (url) URL.revokeObjectURL(url);
    if (src && typeof src.close === "function") { try { src.close(); } catch { /* already closed */ } }
  }
}
export async function attachPhoto(id, file) {
  const r = await shrinkImage(file);
  try { await savePhotoBlob(id, r.blob, { w: r.w, h: r.h }); }
  catch (e) { throw new Error(/quota/i.test(String(e && (e.name || e.message))) ? "full" : "store"); }
  return r;
}

// Photos whose entry is gone: remember when first seen missing; clear after the grace period. A photo whose entry is back
// (Undo, older backup restored) loses its mark. Callers must only run this after a good load with a non-empty list.
export async function sweepPhotos(liveIds, now = Date.now(), graceDays = PHOTO_GRACE_DAYS) {
  const live = new Set([...liveIds].map(key)), out = { kept: 0, marked: 0, removed: 0 };
  const keys = await photoKeys();
  for (const k of keys) {
    const v = await run("readonly", (st) => st.get(k));
    if (!v) continue;
    if (live.has(String(k))) {
      if (v.orphanSince) { const { orphanSince, ...rest } = v; await run("readwrite", (st) => st.put(rest, k)); }
      out.kept++;
    } else if (!v.orphanSince) { await run("readwrite", (st) => st.put({ ...v, orphanSince: now }, k)); out.marked++; }
    else if (now - v.orphanSince >= graceDays * DAY) { await run("readwrite", (st) => st.delete(k)); out.removed++; }
    else out.kept++;
  }
  return out;
}

const ERR = { big: "photo.errBig", decode: "photo.errDecode", full: "photo.errFull", store: "photo.errStore", unavailable: "photo.errStore" };

export function ReceiptPhoto({ id }) {
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [arm, setArm] = useState(false);
  const [big, setBig] = useState(false);
  const input = useRef(null), armTimer = useRef(null);
  const show = (blob) => setUrl((old) => { if (old) URL.revokeObjectURL(old); return blob ? URL.createObjectURL(blob) : null; });
  useEffect(() => {
    let live = true;
    getPhoto(id).then((v) => { if (live && v) show(v.blob); }).catch(() => {});
    return () => { live = false; clearTimeout(armTimer.current); setUrl((old) => { if (old) URL.revokeObjectURL(old); return null; }); };
  }, [id]);
  useBackStep(big, () => setBig(false));
  // Escape closes only the full view, not the entry sheet under it
  useEffect(() => { if (!big) return undefined; const k = (e) => { if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); setBig(false); } }; window.addEventListener("keydown", k, true); return () => window.removeEventListener("keydown", k, true); }, [big]);
  const pick = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = "";
    if (!f) return;
    setBusy(true); setErr("");
    try { const r = await attachPhoto(id, f); show(r.blob); }
    catch (x) { setErr(t(ERR[x && x.message] || "photo.errStore")); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!arm) { setArm(true); clearTimeout(armTimer.current); armTimer.current = setTimeout(() => setArm(false), 3000); return; }
    clearTimeout(armTimer.current); setArm(false);
    try { await deletePhoto(id); show(null); } catch { setErr(t("photo.errStore")); }
  };
  return (
    <div className="photo-box" data-section="photo">
      <input ref={input} type="file" accept="image/*" hidden data-section="photo-input" onChange={pick} />
      {url ? (
        <>
          <button type="button" className="photo-thumb" data-section="photo-open" aria-label={t("photo.open")} onClick={() => setBig(true)}>
            <img src={url} alt={t("photo.alt")} data-section="photo-img" />
          </button>
          <div className="photo-acts">
            <button type="button" className="btn btn-sm detail-action" disabled={busy} onClick={() => input.current && input.current.click()} data-section="photo-replace">{t("photo.replace")}</button>
            <button type="button" className={"btn btn-sm detail-action" + (arm ? " photo-arm" : "")} onClick={remove} data-section="photo-remove">{t(arm ? "photo.removeSure" : "photo.remove")}</button>
          </div>
        </>
      ) : (
        <button type="button" className="btn btn-sm btn-full detail-action" disabled={busy} onClick={() => input.current && input.current.click()} data-section="photo-add">
          {t(busy ? "photo.saving" : "photo.add")}
        </button>
      )}
      {err && <div className="photo-err" role="alert" data-section="photo-err">{err}</div>}
      <div className="photo-note" data-section="photo-note">{t("photo.note")}</div>
      {big && url && createPortal(
        <div className="photo-full" role="dialog" aria-modal="true" aria-label={t("photo.alt")} onClick={() => setBig(false)} data-section="photo-full">
          <img src={url} alt={t("photo.alt")} />
          <button type="button" className="photo-full-close" data-closer="1" aria-label={t("common.close")} onClick={() => setBig(false)}>×</button>
        </div>, document.body
      )}
    </div>
  );
}
