// Run 108 (release readiness): the dates a repeating payment is due on feed every "what is still to pay" figure. Hand-picked cases
// are covered in bills.test / finance.test; this compares the app's dates for 300 random bills (weekly, every two weeks, monthly
// on days 1-31, yearly including 29 February, some with a last date) over 60 months against an independent calculation, in four
// time zones: Baku (no clock change), Berlin and New York (clock changes) and Lord Howe (a 30-minute change). Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { buildSchedules, scheduleMonthStatus } = H;
reset();
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const r = rng(31108);
const pad = (n) => String(n).padStart(2, "0");
// the independent calculation works on plain calendar numbers (day counts from 1 Jan 1970 by the civil-date formula), never Date
const daysFromCivil = (y, m, d) => { y -= m <= 2 ? 1 : 0; const era = Math.floor(y / 400), yoe = y - era * 400, mp = (m + 9) % 12, doy = Math.floor((153 * mp + 2) / 5) + d - 1, doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy; return era * 146097 + doe - 719468; };
const civilFromDays = (z) => { z += 719468; const era = Math.floor(z / 146097), doe = z - era * 146097, yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365), y = yoe + era * 400, doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)), mp = Math.floor((5 * doy + 2) / 153), d = doy - Math.floor((153 * mp + 2) / 5) + 1, m = mp < 10 ? mp + 3 : mp - 9; return [y + (m <= 2 ? 1 : 0), m, d]; };
const monthLen = (y, m) => [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
const str = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const expected = (b, y, m) => {
  const [ay, am, ad] = b.anchorDate.split("-").map(Number), mon = str(y, m, 1).slice(0, 7);
  if (mon < b.anchorDate.slice(0, 7)) return [];
  let out = [];
  if (b.freq === "weekly" || b.freq === "biweekly") {
    const step = b.freq === "weekly" ? 7 : 14, a = daysFromCivil(ay, am, ad), f = daysFromCivil(y, m, 1), l = daysFromCivil(y, m, monthLen(y, m));
    for (let k = Math.max(0, Math.ceil((f - a) / step)); a + k * step <= l; k++) out.push(str(...civilFromDays(a + k * step)));
  } else {
    const day = Math.min(b.dueDay || ad, monthLen(y, m));
    if (b.freq === "monthly" || am === m) out.push(str(y, m, day));
  }
  return b.endDate ? out.filter((d) => d <= b.endDate) : out;
};
const FREQS = ["weekly", "biweekly", "monthly", "monthly", "yearly"];
const bills = [];
for (let i = 0; i < 300; i++) {
  const freq = FREQS[Math.floor(r() * FREQS.length)];
  const y = 2023 + Math.floor(r() * 4), m = 1 + Math.floor(r() * 12);
  const leap = freq === "yearly" && r() < 0.3;
  const d = leap ? 29 : 1 + Math.floor(r() * monthLen(y, m));
  const ya = leap ? 2024 : y, ma = leap ? 2 : m;
  // as the app's forms make them: a later intended day only where the start day was clamped (30 Nov for "the 31st")
  const dueDay = (freq === "monthly" || freq === "yearly") && d === monthLen(ya, ma) && d < 31 && r() < 0.5 ? d + 1 + Math.floor(r() * (31 - d)) : undefined;
  const endDate = r() < 0.2 ? str(ya + 1 + Math.floor(r() * 3), 1 + Math.floor(r() * 12), 1 + Math.floor(r() * 28)) : undefined;
  bills.push({ id: "b" + i, name: "Bill " + i, type: "expense", category: "housing", amount: 10 + i, freq, anchorDate: str(ya, ma, d), ...(dueDay ? { dueDay } : {}), ...(endDate ? { endDate } : {}), active: true, createdAt: "2023-01-01T00:00:00.000Z" });
}

for (const tz of ["Asia/Baku", "Europe/Berlin", "America/New_York", "Australia/Lord_Howe"]) {
  process.env.TZ = tz;
  section(`R108-BD (${tz}). 300 bills x 60 months: the app's due dates equal the independent calculation`);
  const sch = buildSchedules([], bills), problems = [];
  let dates = 0;
  for (const b of bills) {
    const s = sch.find((x) => x.billId === b.id);
    if (!s) { problems.push(`${b.id} has no schedule`); continue; }
    for (let k = 0; k < 60; k++) {
      const y = 2023 + Math.floor(k / 12), m = 1 + (k % 12), mon = str(y, m, 1).slice(0, 7);
      const got = scheduleMonthStatus(s, [], mon, new Date(2030, 0, 1)).expected, want = expected(b, y, m);
      dates += want.length;
      if (got.join() !== want.join()) { problems.push(`${b.id} ${b.freq} from ${b.anchorDate}${b.dueDay ? " due " + b.dueDay : ""}${b.endDate ? " until " + b.endDate : ""} in ${mon}: app ${got.join(" ") || "-"} / expected ${want.join(" ") || "-"}`); break; }
    }
  }
  ok(problems.length === 0 && dates > 5000, `${dates} due dates checked, all equal`, problems.slice(0, 5));
}
process.env.TZ = "Asia/Baku";
finish("run108billdates");
