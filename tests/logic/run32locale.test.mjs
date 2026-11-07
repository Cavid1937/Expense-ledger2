// Run 32 (backlog item 11): locale correctness. Azerbaijani "İ" must not make two spellings of one name look different, and Russian plural forms
// must be chosen by the CLDR rules. Expected values worked out by hand from the CLDR plural rules. Synthetic data only.
import { H, ok, section, reset, finish } from "./lib.mjs";
const { lc, norm, memKey, subKey, addAccount, tn, setLang, MESSAGES } = H;
reset();
section("R32-L1. Azerbaijani İ / i: one name, one spelling for comparisons");
ok("İzmir".toLowerCase() !== "izmir", "premise: the plain lower-casing of İzmir leaves a combining dot (that is the bug being guarded)", [..."İzmir".toLowerCase()].length);
ok(lc("İzmir") === "izmir" && lc("İZMİR") === "izmir" && lc("izmir") === "izmir", "lc() makes İzmir, İZMİR and izmir the same", [lc("İzmir"), lc("İZMİR")]);
ok(lc("Şəki Bazarı") === "şəki bazarı", "other Azerbaijani letters (Ş ə ı) lower-case as before", lc("Şəki Bazarı"));
ok(norm("  İzmir   Kart ") === "izmir kart", "norm() (duplicate and bill matching) collapses spaces and treats İ as i", norm("  İzmir   Kart "));
ok(memKey("expense", "İzmir") === memKey("expense", "izmir") && subKey(" İş ") === subKey("iş"), "merchant memory and subcategory keys agree for İ and i", [memKey("expense", "İzmir"), subKey(" İş ")]);
const a = addAccount({ accounts: [], transfers: [] }, "İş Bank", "card", 0, "");
const b = addAccount(a.data, "iş bank", "card", 0, "");
ok(a.added && !b.added && b.reason === "dup", "an account named 'iş bank' is refused as a duplicate of 'İş Bank'", [a.added, b.added, b.reason]);
section("R32-L2. Russian plural forms (CLDR: one 1,21,101; few 2-4,22-24; many 0,5-20,25-30,111; other fractions)");
const key = Object.keys(MESSAGES).find((k) => ["en", "az", "ru"].every((l) => typeof MESSAGES[k][l] === "object" && JSON.stringify(MESSAGES[k][l]).includes("{n}")));   // a key with plural forms in all three languages
ok(!!key, "premise: the catalog has a message with plural forms in en, az and ru", key);
const ru = MESSAGES[key].ru, forms = (n) => ({ one: ru.one, few: ru.few, many: ru.many }[ {1:"one",21:"one",101:"one",2:"few",3:"few",4:"few",22:"few",24:"few",0:"many",5:"many",11:"many",12:"many",14:"many",20:"many",25:"many",111:"many" }[n] ].replace("{n}", n));
setLang("ru");
const bad = [1, 2, 3, 4, 5, 11, 12, 14, 20, 21, 22, 24, 25, 101, 111, 0].filter((n) => tn(key, n) !== forms(n));
ok(bad.length === 0, "tn() picks one/few/many correctly for 0,1,2,3,4,5,11,12,14,20,21,22,24,25,101,111", bad.map((n) => [n, tn(key, n), forms(n)]));
ok(new Set([tn(key, 1), tn(key, 2), tn(key, 5)].map((s) => s.replace(/\d+/, "N"))).size === 3, "the three forms are really different words (1 / 2 / 5)", [tn(key, 1), tn(key, 2), tn(key, 5)]);
section("R32-L3. English and Azerbaijani: one for 1, other for everything else (including 0)");
for (const l of ["en", "az"]) {
  setLang(l);
  const m = MESSAGES[key][l];
  ok(tn(key, 1) === m.one.replace("{n}", 1) && tn(key, 0) === m.other.replace("{n}", 0) && tn(key, 2) === m.other.replace("{n}", 2) && tn(key, 21) === m.other.replace("{n}", 21), `${l}: 1 uses the one form; 0, 2 and 21 use the other form`);
}
setLang("en");
finish("run32locale");
