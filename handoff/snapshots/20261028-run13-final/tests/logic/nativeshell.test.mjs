// Run 13 (2026-10-28): the native shell's side of the Android backup export (handoff/native/native-share-core.js), tested with
// fake plugins. Written BEFORE the code was split out. What this CANNOT show: that the real Filesystem and Share plugins and the
// Android share chooser behave like these fakes (needs a device: NOT ASSESSED).
import { ok, section, finish } from "./lib.mjs";
const { makeNativeShare, EXPORT_FOLDER } = await import(new URL("../../handoff/native/native-share-core.js", import.meta.url).href);
const mk = (o = {}) => {
  const log = [];
  const fake = {
    Directory: { Cache: "CACHE" }, Encoding: { UTF8: "utf8" },
    Filesystem: {
      readdir: async (a) => { log.push(["readdir", a]); if (o.noFolder) throw new Error("does not exist"); return { files: (o.old || []).map((name) => ({ name })) }; },
      deleteFile: async (a) => { log.push(["delete", a.path]); if (o.deleteFails) throw new Error("busy"); },
      writeFile: async (a) => { log.push(["write", a]); if (o.writeFails) throw new Error("no space"); return { uri: "file:///cache/" + a.path }; },
    },
    Share: { share: async (a) => { log.push(["share", a]); if (o.shareError) throw o.shareError; return {}; } },
  };
  return { log, run: makeNativeShare(fake) };
};
const kinds = (log) => log.map((x) => x[0]).join(",");
const BOM = "﻿";

section("NS-1. A normal export");
{
  const { log, run } = mk({ old: ["ledger-backup-2026-10-27.json", "ledger-2026-10-27.csv"] });
  const r = await run("ledger-backup-2026-10-28.json", BOM + '{"version":10}', "application/json");
  const w = log.find((x) => x[0] === "write")[1], s = log.find((x) => x[0] === "share")[1];
  ok(r === "shared", "returns \"shared\" once the share sheet was opened");
  ok(w.path === EXPORT_FOLDER + "/ledger-backup-2026-10-28.json" && w.directory === "CACHE" && w.encoding === "utf8" && w.recursive === true && w.data === BOM + '{"version":10}', "writes the exact text (byte-order mark kept) to the app's cache folder, UTF-8");
  ok(s.url === "file:///cache/exports/ledger-backup-2026-10-28.json" && s.title === "ledger-backup-2026-10-28.json", "the share sheet receives the written file's address");
  ok(kinds(log) === "readdir,delete,delete,write,share" && log.filter((x) => x[0] === "delete").map((x) => x[1]).join() === "exports/ledger-backup-2026-10-27.json,exports/ledger-2026-10-27.csv", "earlier exports are removed BEFORE writing the new one, and nothing is removed after sharing (the receiving app may still be reading)");
}

section("NS-2. Names, cancel and failures");
{
  const { log, run } = mk();
  await run("../../evil/na me?.json", "x", "application/json");
  const p = log.find((x) => x[0] === "write")[1].path;
  ok(p.startsWith("exports/") && !p.slice(8).includes("/") && !p.includes("\\") && !/[ ?]/.test(p), "a file name with path separators or odd characters stays inside the export folder", p);
}
{
  const { log, run } = mk({ shareError: new Error("Share canceled") });
  ok(await run("a.json", "x", "application/json") === "cancelled", "the plugin's cancel is reported as cancelled, not as an error");
  const e2 = mk({ shareError: new Error("No Activity found to handle Intent") });
  let thrown = null; try { await e2.run("a.json", "x", "application/json"); } catch (e) { thrown = e; }
  ok(thrown && /No Activity/.test(thrown.message), "any other share error is passed on (the web app then tells the user it failed)");
}
{
  const { log, run } = mk({ writeFails: true });
  let thrown = null; try { await run("a.json", "x", "application/json"); } catch (e) { thrown = e; }
  ok(thrown && /no space/.test(thrown.message) && !log.some((x) => x[0] === "share"), "if the file cannot be written nothing is shared and the error is passed on");
}
{
  const a = mk({ noFolder: true }), b = mk({ old: ["old.json"], deleteFails: true });
  ok(await a.run("a.json", "x", "application/json") === "shared" && await b.run("a.json", "x", "application/json") === "shared", "a missing export folder, or an old file that cannot be removed, does not stop the export");
}

finish("nativeshell");
