// Native shell (Capacitor Android) — the file hand-over, written as a function of its plugins so it can be tested with fakes.
// Single source: this file is copied into the Android build folder as-is (the wiring file native-share.js imports it).
//
// Contract with the web app (window.__ledgerNativeShare(filename, text, mime)):
//   resolves "shared"    the share sheet was opened with the file. On Android this does NOT prove the destination received it;
//                        the web app's wording tells the user to check, and a backup only counts as confirmed when the user says so.
//   resolves "cancelled" the plugin reported that the user dismissed the sheet.
//   rejects              the cache write failed, or the share could not start: the web app tells the user, nothing is recorded.
export const EXPORT_FOLDER = "exports";

export function makeNativeShare({ Filesystem, Directory, Encoding, Share }) {
  // Leftovers of earlier exports are removed at the START of the next export, never right after sharing: the receiving app
  // may still be reading the file when the share call returns.
  async function removeOldExports() {
    try {
      const { files } = await Filesystem.readdir({ path: EXPORT_FOLDER, directory: Directory.Cache });
      for (const f of files || []) await Filesystem.deleteFile({ path: `${EXPORT_FOLDER}/${f.name}`, directory: Directory.Cache });
    } catch { /* no folder yet, or nothing to remove */ }
  }
  return async function nativeShare(filename, text, mime) {
    const name = String(filename).replace(/[^A-Za-z0-9._-]/g, "_");   // no path separators: the file always stays in the export folder
    await removeOldExports();
    const { uri } = await Filesystem.writeFile({ path: `${EXPORT_FOLDER}/${name}`, data: String(text), directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true });
    try {
      await Share.share({ title: name, dialogTitle: name, url: uri });
      return "shared";
    } catch (e) {
      if (/cancel/i.test(String((e && (e.message || e.errorMessage)) || e))) return "cancelled";
      throw e;
    }
  };
}
