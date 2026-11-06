
const RealDate=Date;
globalThis.__NOW=new RealDate(2026,9,13,12,0,0).getTime();
class FakeDate extends RealDate{ constructor(...a){ if(a.length===0) super(globalThis.__NOW); else super(...a);} static now(){return globalThis.__NOW;} }
globalThis.Date=FakeDate;
const __store=new Map(); globalThis.__failKeys=[]; globalThis.__throwAll=false; globalThis.__throwGetKeys=[];
globalThis.localStorage={ getItem:k=>{ if(globalThis.__throwAll||globalThis.__throwGetKeys.includes(k)) throw new Error("SecurityError"); return __store.has(k)?__store.get(k):null; },
  setItem:(k,v)=>{ if(globalThis.__throwAll||globalThis.__failKeys.some(f=>k.includes(f))) throw new Error("QuotaExceededError"); __store.set(k,String(v)); },
  removeItem:k=>__store.delete(k), clear:()=>__store.clear(), key:i=>[...__store.keys()][i], get length(){return __store.size;} };
globalThis.__store=__store;
// ─── Interface language: Azərbaycan dili · English · Русский ─────────────────
// One entry per key with all three languages, so a missing translation is visible in review and caught by
// tests/logic/i18n.test.mjs. Plural entries hold Intl.PluralRules forms: en/az use one/other, ru uses one/few/many/other.
// Placeholders are written {name} and filled by t()/tn() with plain text (never evaluated).
// The Azerbaijani and Russian wording is a DRAFT: it must be reviewed by competent native speakers before release.
// User data is never translated: merchants, notes, template names, goal names and custom subcategories stay as typed.
// Stored identifiers (category ids, the English names used in CSV files) never change with the language.

const LANGS = ["az", "en", "ru"];
const LANG_NAMES = { az: "Azərbaycan dili", en: "English", ru: "Русский" };
const LOCALES = { az: "az-Latn-AZ", en: "en-GB", ru: "ru-RU" };

let I18N_LANG = "en";
function setLang(l) { I18N_LANG = LANGS.includes(l) ? l : "en"; }
function getLang() { return I18N_LANG; }
function locale() { return LOCALES[I18N_LANG]; }

const fill = (s, vars) => vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;

// Text for a key in the current language (English if the current language lacks it, the key itself if unknown).
function t(key, vars) {
  const e = MESSAGES[key];
  if (!e) return key;
  const s = e[I18N_LANG] ?? e.en;
  return fill(typeof s === "string" ? s : (s.other ?? ""), vars);
}
// Run 29: inside the Android app (window.LedgerNative exists) a few privacy / safety texts differ, because Android's automatic Google backup may keep an
// older copy of the data. A text with the same key plus "A" is used there when it exists; the website and every other case keep the plain text.
function tShell(key, vars) {
  const native = typeof window !== "undefined" && !!window.LedgerNative;
  return native && MESSAGES[key + "A"] ? t(key + "A", vars) : t(key, vars);
}
// Text in a specific language, whatever the current one is (used where all three languages are shown together).
function tIn(lang, key) { const e = MESSAGES[key]; return e ? (e[lang] ?? e.en) : key; }
// Count-dependent text: picks the plural form for n in the current language; {n} is the count.
function tn(key, n, vars) {
  const e = MESSAGES[key];
  if (!e) return key;
  const v = e[I18N_LANG] ?? e.en;
  const s = typeof v === "string" ? v : (v[new Intl.PluralRules(LOCALES[I18N_LANG]).select(n)] ?? v.other);
  return fill(s, { ...vars, n });
}

const MESSAGES = {
  // ── First launch: language chooser (shown in all three languages at once)
  "lang.title":        { en: "Choose your language", az: "Dilinizi seçin", ru: "Выберите язык" },
  "lang.continue":     { en: "Continue", az: "Davam et", ru: "Продолжить" },
  "lang.hint":         { en: "You can change it later in Settings.", az: "Sonradan Parametrlərdə dəyişə bilərsiniz.", ru: "Позже его можно изменить в настройках." },
  "lang.setting":      { en: "Language", az: "Dil", ru: "Язык" },
  "lang.settingSub":   { en: "Changes the interface text only — amounts, currency and your entries stay the same", az: "Yalnız interfeys mətnini dəyişir — məbləğlər, valyuta və qeydləriniz dəyişmir", ru: "Меняет только текст интерфейса — суммы, валюта и ваши записи не меняются" },
  "lang.changed":      { en: "Language: English", az: "Dil: Azərbaycan dili", ru: "Язык: русский" },
  // Names of the starter quick-fill templates, applied once when the language is first chosen (then they are user data)
  "tpl.t1": { en: "Bus / Metro", az: "Avtobus / metro", ru: "Автобус / метро" },
  "tpl.t3": { en: "Groceries", az: "Ərzaq", ru: "Продукты" },
  "tpl.t4": { en: "Coffee", az: "Qəhvə", ru: "Кофе" },
  "tpl.t5": { en: "Football Pitch", az: "Futbol meydançası", ru: "Футбольное поле" },

  // ── Why a record was set aside or skipped (checkRawTxn codes). Shown as "count reason" in English, "reason: count" otherwise.
  "reason.not a transaction record": { en: "{n} not a transaction record", az: "əməliyyat qeydi deyil: {n}", ru: "не является записью операции: {n}" },
  "reason.missing date":     { en: "{n} missing date", az: "tarix yoxdur: {n}", ru: "нет даты: {n}" },
  "reason.invalid date":     { en: "{n} invalid date", az: "tarix yanlışdır: {n}", ru: "некорректная дата: {n}" },
  "reason.missing amount":   { en: "{n} missing amount", az: "məbləğ yoxdur: {n}", ru: "нет суммы: {n}" },
  "reason.invalid amount":   { en: "{n} invalid amount", az: "məbləğ yanlışdır: {n}", ru: "некорректная сумма: {n}" },
  "reason.negative amount":  { en: "{n} negative amount", az: "mənfi məbləğ: {n}", ru: "отрицательная сумма: {n}" },
  "reason.zero amount":      { en: "{n} zero amount", az: "sıfır məbləğ: {n}", ru: "нулевая сумма: {n}" },
  "reason.amount too large": { en: "{n} amount too large", az: "məbləğ çox böyükdür: {n}", ru: "слишком большая сумма: {n}" },
  "reason.unsupported type": { en: "{n} unsupported type", az: "dəstəklənməyən növ: {n}", ru: "неподдерживаемый тип: {n}" },
  "reason.invalid recurrence": { en: "{n} invalid recurrence", az: "təkrarlanma yanlışdır: {n}", ru: "некорректная периодичность: {n}" },
  "reason.invalid active flag":     { en: "{n} unreadable active/paused flag", az: "aktiv/dayandırılmış işarəsi oxunmur: {n}", ru: "нечитаемый признак «активно/приостановлено»: {n}" },
  "reason.invalid recurrence flag": { en: "{n} unreadable recurring flag", az: "təkrarlanma işarəsi oxunmur: {n}", ru: "нечитаемый признак повторения: {n}" },
  "reason.more than 2 decimal places": { en: "{n} more than 2 decimal places", az: "2-dən çox onluq rəqəm: {n}", ru: "больше 2 знаков после запятой: {n}" },

  // ── Loading saved data
  "load.setAside": {
    en: { one: "{n} unreadable record set aside{why} — the rest of your data is intact", other: "{n} unreadable records set aside{why} — the rest of your data is intact" },
    az: { one: "{n} oxunmayan qeyd kənara qoyuldu{why} — qalan məlumatlarınız toxunulmazdır", other: "{n} oxunmayan qeyd kənara qoyuldu{why} — qalan məlumatlarınız toxunulmazdır" },
    ru: { one: "{n} нечитаемая запись отложена{why} — остальные данные не затронуты", few: "{n} нечитаемые записи отложены{why} — остальные данные не затронуты", many: "{n} нечитаемых записей отложено{why} — остальные данные не затронуты", other: "{n} нечитаемой записи отложено{why} — остальные данные не затронуты" } },
  "load.setAsideBlocked": {
    en: { one: "{n} unreadable record{why} found but a recovery copy could not be made (storage may be full) — saving is paused so nothing is overwritten", other: "{n} unreadable records{why} found but a recovery copy could not be made (storage may be full) — saving is paused so nothing is overwritten" },
    az: "{n} oxunmayan qeyd tapıldı{why}, lakin bərpa surəti yaradıla bilmədi (yaddaş dolu ola bilər) — heç nəyin üzərinə yazılmaması üçün yadda saxlama dayandırıldı",
    ru: "Найдено нечитаемых записей: {n}{why}, но копию для восстановления создать не удалось (возможно, хранилище заполнено) — сохранение приостановлено, чтобы ничего не перезаписать" },
  "load.rekeyed": {
    en: { one: "{n} duplicate id re-assigned", other: "{n} duplicate ids re-assigned" },
    az: "{n} təkrarlanan identifikator yenidən təyin edildi",
    ru: "Повторяющихся идентификаторов заменено: {n}" },
  "load.settingsResetKept": { en: "Some saved settings were not valid and were reset (the originals were kept)", az: "Bəzi saxlanmış parametrlər yanlış idi və sıfırlandı (orijinallar saxlanıldı)", ru: "Некоторые сохранённые настройки были некорректны и сброшены (исходные значения сохранены)" },
  "load.settingsResetBlocked": { en: "Some saved settings were not valid and were reset — saving is paused because they could not be copied", az: "Bəzi saxlanmış parametrlər yanlış idi və sıfırlandı — onların surəti çıxarıla bilmədiyi üçün yadda saxlama dayandırıldı", ru: "Некоторые сохранённые настройки были некорректны и сброшены — сохранение приостановлено, так как их не удалось скопировать" },
  "load.corruptKept":    { en: "Saved data could not be read — a recovery copy was kept", az: "Saxlanmış məlumatları oxumaq mümkün olmadı — bərpa surəti saxlanıldı", ru: "Не удалось прочитать сохранённые данные — копия для восстановления сохранена" },
  "load.readFailed":     { en: "Your saved data could not be read right now — saving is paused so nothing is overwritten. Close and reopen the app; if this keeps happening, check the browser's storage settings", az: "Saxlanmış məlumatlarınızı hazırda oxumaq mümkün olmadı — heç nəyin üzərinə yazılmaması üçün yadda saxlama dayandırıldı. Tətbiqi bağlayıb yenidən açın; bu təkrarlanarsa, brauzerin yaddaş parametrlərini yoxlayın", ru: "Сейчас не удалось прочитать сохранённые данные — сохранение приостановлено, чтобы ничего не перезаписать. Закройте и снова откройте приложение; если это повторяется, проверьте настройки хранилища браузера" },
  "load.legacyReadFailed": { en: "Data from an older version of the app could not be read — saving is paused so it is not hidden or overwritten", az: "Tətbiqin köhnə versiyasının məlumatlarını oxumaq mümkün olmadı — gizlənməməsi və üzərinə yazılmaması üçün yadda saxlama dayandırıldı", ru: "Не удалось прочитать данные из старой версии приложения — сохранение приостановлено, чтобы они не были скрыты или перезаписаны" },
  "load.legacyCorruptKept": { en: "Data from an older version of the app could not be read — a recovery copy was kept", az: "Tətbiqin köhnə versiyasının məlumatlarını oxumaq mümkün olmadı — bərpa surəti saxlanıldı", ru: "Не удалось прочитать данные из старой версии приложения — копия для восстановления сохранена" },
  "load.corruptBlocked": { en: "Saved data could not be read and a recovery copy could not be made (storage may be full) — saving is paused so nothing is overwritten", az: "Saxlanmış məlumatları oxumaq və bərpa surəti yaratmaq mümkün olmadı (yaddaş dolu ola bilər) — heç nəyin üzərinə yazılmaması üçün yadda saxlama dayandırıldı", ru: "Не удалось прочитать сохранённые данные и создать копию для восстановления (возможно, хранилище заполнено) — сохранение приостановлено, чтобы ничего не перезаписать" },

  // ── Settings found in stored data or a backup file
  "settings.budgetsNotList":   { en: "Budgets are not a valid list — your current budgets were kept.", az: "Büdcələr düzgün siyahı deyil — cari büdcələriniz saxlanıldı.", ru: "Бюджеты не являются корректным списком — текущие бюджеты сохранены." },
  "settings.budgetsAllBad":    { en: "All {n} budget entries were invalid — your current budgets were kept.", az: "Büdcə qeydlərinin hamısı ({n}) yanlış idi — cari büdcələriniz saxlanıldı.", ru: "Все записи бюджета ({n}) некорректны — текущие бюджеты сохранены." },
  "settings.budgetsSomeBad":   { en: { one: "{n} invalid budget entry was skipped.", other: "{n} invalid budget entries were skipped." }, az: "{n} yanlış büdcə qeydi buraxıldı.", ru: "Пропущено некорректных записей бюджета: {n}." },
  "settings.templatesNotList": { en: "Templates are not a valid list — your current templates were kept.", az: "Şablonlar düzgün siyahı deyil — cari şablonlarınız saxlanıldı.", ru: "Шаблоны не являются корректным списком — текущие шаблоны сохранены." },
  "settings.templatesAllBad":  { en: "All {n} templates were invalid — your current templates were kept.", az: "Şablonların hamısı ({n}) yanlış idi — cari şablonlarınız saxlanıldı.", ru: "Все шаблоны ({n}) некорректны — текущие шаблоны сохранены." },
  "settings.templatesSomeBad": { en: { one: "{n} invalid template was skipped.", other: "{n} invalid templates were skipped." }, az: "{n} yanlış şablon buraxıldı.", ru: "Пропущено некорректных шаблонов: {n}." },
  "settings.goalsNotList":     { en: "Goals are not a valid list — your current goals were kept.", az: "Məqsədlər düzgün siyahı deyil — cari məqsədləriniz saxlanıldı.", ru: "Цели не являются корректным списком — текущие цели сохранены." },
  "settings.goalsAllBad":      { en: "All {n} goals were invalid — your current goals were kept.", az: "Məqsədlərin hamısı ({n}) yanlış idi — cari məqsədləriniz saxlanıldı.", ru: "Все цели ({n}) некорректны — текущие цели сохранены." },
  "settings.goalsSomeBad":     { en: { one: "{n} invalid goal was skipped.", other: "{n} invalid goals were skipped." }, az: "{n} yanlış məqsəd buraxıldı.", ru: "Пропущено некорректных целей: {n}." },
  "settings.currencyBad":      { en: "The currency symbol was not valid — your current symbol was kept.", az: "Valyuta işarəsi yanlış idi — cari işarəniz saxlanıldı.", ru: "Символ валюты некорректен — текущий символ сохранён." },
  "settings.safeBad":          { en: "The Safe to Spend settings were not valid — your current settings were kept.", az: "«Xərcləmək olar» parametrləri yanlış idi — cari parametrləriniz saxlanıldı.", ru: "Настройки «Можно потратить» некорректны — текущие настройки сохранены." },

  // ── Import (CSV / JSON)
  "csv.unterminated":     { en: "This CSV has an opening quote that is never closed, so rows could be merged or lost. Nothing was imported.", az: "Bu CSV faylında açılan dırnaq bağlanmayıb, ona görə sətirlər birləşə və ya itə bilər. Heç nə idxal edilmədi.", ru: "В этом CSV есть открывающая кавычка без закрывающей, поэтому строки могли бы слиться или потеряться. Ничего не импортировано." },
  "csv.noRows":           { en: "No data rows were found in the CSV.", az: "CSV faylında məlumat sətri tapılmadı.", ru: "В CSV не найдено строк с данными." },
  "csv.needDateAmount":   { en: "The CSV needs a date and amount column. Found: {found}. Nothing was imported.", az: "CSV faylında tarix və məbləğ sütunları olmalıdır. Tapıldı: {found}. Heç nə idxal edilmədi.", ru: "В CSV нужны столбцы даты и суммы. Найдено: {found}. Ничего не импортировано." },
  "csv.needDate":         { en: "The CSV needs a date column. Found: {found}. Nothing was imported.", az: "CSV faylında tarix sütunu olmalıdır. Tapıldı: {found}. Heç nə idxal edilmədi.", ru: "В CSV нужен столбец даты. Найдено: {found}. Ничего не импортировано." },
  "csv.needAmount":       { en: "The CSV needs an amount column. Found: {found}. Nothing was imported.", az: "CSV faylında məbləğ sütunu olmalıdır. Tapıldı: {found}. Heç nə idxal edilmədi.", ru: "В CSV нужен столбец суммы. Найдено: {found}. Ничего не импортировано." },
  "csv.noHeaders":        { en: "no headers", az: "başlıq yoxdur", ru: "заголовков нет" },
  "import.notJsonCsv":    { en: "This file is not valid JSON or CSV, so nothing was imported.", az: "Bu fayl düzgün JSON və ya CSV deyil, ona görə heç nə idxal edilmədi.", ru: "Этот файл не является корректным JSON или CSV, поэтому ничего не импортировано." },
  "import.badVersion":    { en: "The backup's version number is not valid, so it was not imported.", az: "Ehtiyat nüsxənin versiya nömrəsi yanlışdır, ona görə idxal edilmədi.", ru: "Номер версии резервной копии некорректен, поэтому она не импортирована." },
  "import.newerVersion":  { en: "This backup was made by a newer version of the app (v{v}). Update the app before importing it.", az: "Bu ehtiyat nüsxə tətbiqin daha yeni versiyası ilə yaradılıb (v{v}). İdxal etməzdən əvvəl tətbiqi yeniləyin.", ru: "Эта резервная копия создана более новой версией приложения (v{v}). Обновите приложение перед импортом." },
  "import.badExportDate": { en: "The backup's export date is not valid and was ignored.", az: "Ehtiyat nüsxənin ixrac tarixi yanlışdır və nəzərə alınmadı.", ru: "Дата экспорта в резервной копии некорректна и была проигнорирована." },
  "import.countMismatch": { en: "The file says it holds {said} transactions but contains {has} — it may be incomplete.", az: "Faylda {said} əməliyyat olduğu göstərilib, lakin {has} əməliyyat var — fayl natamam ola bilər.", ru: "В файле указано операций: {said}, а фактически: {has} — возможно, файл неполный." },
  "import.notBackup":     { en: "This file does not look like a ledger backup.", az: "Bu fayl ehtiyat nüsxə faylına bənzəmir.", ru: "Этот файл не похож на резервную копию журнала." },
  "import.nothing":       { en: "Nothing could be imported — {summary}.", az: "Heç nə idxal edilə bilmədi — {summary}.", ru: "Ничего не удалось импортировать — {summary}." },
  "import.empty":         { en: "No transactions or settings were found in this file.", az: "Bu faylda əməliyyat və ya parametr tapılmadı.", ru: "В этом файле не найдено ни операций, ни настроек." },
  "import.unknownCat":    { en: { one: "{n} transaction has a category the app does not recognise and was filed under Other.", other: "{n} transactions have a category the app does not recognise and were filed under Other." }, az: "Tətbiqin tanımadığı kateqoriyası olan {n} əməliyyat «Digər» bölməsinə əlavə edildi.", ru: "Операций с нераспознанной категорией: {n}, они отнесены к категории «Другое»." },
  "import.sameFileDup":   { en: { one: "{n} row is identical to another row in this file (same date, amount, category and text). Both will be imported — check the file if that is not expected.", other: "{n} rows are identical to another row in this file (same date, amount, category and text). All will be imported — check the file if that is not expected." }, az: "Bu faylda {n} sətir başqa sətirlə eynidir (eyni tarix, məbləğ, kateqoriya və mətn). Hamısı idxal ediləcək — gözlənilmirsə, faylı yoxlayın.", ru: "Строк, совпадающих с другой строкой этого файла (та же дата, сумма, категория и текст): {n}. Все будут импортированы — проверьте файл, если это неожиданно." },
  "import.rekeyed":       { en: { one: "{n} duplicate id was re-assigned.", other: "{n} duplicate ids were re-assigned." }, az: "{n} təkrarlanan identifikator yenidən təyin edildi.", ru: "Повторяющихся идентификаторов заменено: {n}." },

  // ── Insights (Analytics, Smart Helper). Each variant is a whole sentence so no language has to glue fragments.
  "ins.weekendMore":  { en: "Per day, you spend {pct}% more on weekends than on weekdays ({we} vs {wd} a day, last {days} days)", az: "Həftəsonları gündəlik xərciniz iş günlərindən {pct}% çoxdur (gündə {we} və {wd}, son {days} gün)", ru: "В выходные вы тратите в день на {pct}% больше, чем в будни ({we} против {wd} в день, за последние {days} дн.)" },
  "ins.weekendLess":  { en: "Per day, you spend {pct}% less on weekends than on weekdays ({we} vs {wd} a day, last {days} days)", az: "Həftəsonları gündəlik xərciniz iş günlərindən {pct}% azdır (gündə {we} və {wd}, son {days} gün)", ru: "В выходные вы тратите в день на {pct}% меньше, чем в будни ({we} против {wd} в день, за последние {days} дн.)" },
  "ins.catConc":      { en: "{cat} accounts for {pct}% of spending this month", az: "Bu ay xərclərin {pct}%-i «{cat}» kateqoriyasına düşür", ru: "На категорию «{cat}» приходится {pct}% расходов в этом месяце" },
  "ins.merchantConc": { en: "{names} account for {pct}% of spending this month", az: "Bu ay xərclərin {pct}%-i bu satıcıların payına düşür: {names}", ru: "На этих продавцов приходится {pct}% расходов в этом месяце: {names}" },
  "ins.avgHigher":    { en: "A typical transaction this month is {pct}% larger than last month (median of {a} vs {b} transactions)", az: "Bu ay tipik əməliyyat məbləği keçən aya nisbətən {pct}% çoxdur ({a} və {b} əməliyyatın medianı)", ru: "Типичная сумма операции в этом месяце на {pct}% выше, чем в прошлом (медиана {a} и {b} операций)" },
  "ins.avgLower":     { en: "A typical transaction this month is {pct}% smaller than last month (median of {a} vs {b} transactions)", az: "Bu ay tipik əməliyyat məbləği keçən aya nisbətən {pct}% azdır ({a} və {b} əməliyyatın medianı)", ru: "Типичная сумма операции в этом месяце на {pct}% ниже, чем в прошлом (медиана {a} и {b} операций)" },
  "ins.dayOfWeek":    { en: "This month a typical transaction on {hi} is {pct}% larger than on {lo} (median of {a} vs {b} transactions)", az: "Bu ay {hi} tipik əməliyyat məbləği {lo} {pct}% çoxdur ({a} və {b} əməliyyatın medianı)", ru: "В этом месяце типичная сумма операции {hi} на {pct}% выше, чем {lo} (медиана {a} и {b} операций)" },
  "ins.dayOfWeekX":   { en: "This month a typical transaction on {hi} is {x}× the size of one on {lo} (median of {a} vs {b} transactions)", az: "Bu ay {hi} tipik əməliyyat məbləği {lo} {x} dəfə çoxdur ({a} və {b} əməliyyatın medianı)", ru: "В этом месяце типичная сумма операции {hi} в {x} раза выше, чем {lo} (медиана {a} и {b} операций)" },
  "ins.trendUp":      { en: "{cat} spending has been increasing over recent months ({pct}% last month vs the month before)", az: "«{cat}» üzrə xərclər son aylarda artır (keçən ay əvvəlki aya nisbətən {pct}%)", ru: "Расходы в категории «{cat}» в последние месяцы растут ({pct}% в прошлом месяце по сравнению с позапрошлым)" },
  "ins.lastMonthChange": { en: "{cat} spending last month: {pct}% compared with the month before", az: "«{cat}» üzrə keçən ayın xərcləri: əvvəlki aya nisbətən {pct}%", ru: "Расходы в категории «{cat}» в прошлом месяце: {pct}% по сравнению с позапрошлым" },
  "ins.trendDown":    { en: "{cat} spending has been decreasing over recent months ({pct}% last month vs the month before)", az: "«{cat}» üzrə xərclər son aylarda azalır (keçən ay əvvəlki aya nisbətən {pct}%)", ru: "Расходы в категории «{cat}» в последние месяцы снижаются ({pct}% в прошлом месяце по сравнению с позапрошлым)" },
  "ins.anomalyReason": { en: "{x}× the usual {cat} amount (median {med})", az: "«{cat}» üçün adi məbləğdən {x} dəfə çox (median {med})", ru: "в {x} раза больше обычной суммы в категории «{cat}» (медиана {med})" },
  "ins.anomalies":    { en: { one: "{n} unusually large transaction this month", other: "{n} unusually large transactions this month" }, az: "Bu ay {n} qeyri-adi böyük əməliyyat", ru: { one: "{n} необычно крупная операция в этом месяце", few: "{n} необычно крупные операции в этом месяце", many: "{n} необычно крупных операций в этом месяце", other: "{n} необычно крупной операции в этом месяце" } },
  "ins.sameDay":      { en: "{a} and {b} are often recorded on the same day ({pct}% of spending days this month)", az: "«{a}» və «{b}» tez-tez eyni gündə qeyd olunur (bu ay xərc günlərinin {pct}%-i)", ru: "«{a}» и «{b}» часто записываются в один и тот же день ({pct}% дней с расходами в этом месяце)" },
  // Weekday names: "pl" starts the day-of-week sentence ("Sundays …"), "cmp" is the compared day ("… than Fridays")
  "dow.pl.Sunday":    { en: "Sundays", az: "bazar günləri", ru: "по воскресеньям" },
  "dow.pl.Monday":    { en: "Mondays", az: "bazar ertəsi günləri", ru: "по понедельникам" },
  "dow.pl.Tuesday":   { en: "Tuesdays", az: "çərşənbə axşamı günləri", ru: "по вторникам" },
  "dow.pl.Wednesday": { en: "Wednesdays", az: "çərşənbə günləri", ru: "по средам" },
  "dow.pl.Thursday":  { en: "Thursdays", az: "cümə axşamı günləri", ru: "по четвергам" },
  "dow.pl.Friday":    { en: "Fridays", az: "cümə günləri", ru: "по пятницам" },
  "dow.pl.Saturday":  { en: "Saturdays", az: "şənbə günləri", ru: "по субботам" },
  "dow.cmp.Sunday":    { en: "Sundays", az: "bazar günlərindən", ru: "по воскресеньям" },
  "dow.cmp.Monday":    { en: "Mondays", az: "bazar ertəsi günlərindən", ru: "по понедельникам" },
  "dow.cmp.Tuesday":   { en: "Tuesdays", az: "çərşənbə axşamı günlərindən", ru: "по вторникам" },
  "dow.cmp.Wednesday": { en: "Wednesdays", az: "çərşənbə günlərindən", ru: "по средам" },
  "dow.cmp.Thursday":  { en: "Thursdays", az: "cümə axşamı günlərindən", ru: "по четвергам" },
  "dow.cmp.Friday":    { en: "Fridays", az: "cümə günlərindən", ru: "по пятницам" },
  "dow.cmp.Saturday":  { en: "Saturdays", az: "şənbə günlərindən", ru: "по субботам" },
  // A single weekday, as in "usually on Saturday"
  "dow.Sunday":    { en: "Sunday", az: "bazar", ru: "воскресенье" },
  "dow.Monday":    { en: "Monday", az: "bazar ertəsi", ru: "понедельник" },
  "dow.Tuesday":   { en: "Tuesday", az: "çərşənbə axşamı", ru: "вторник" },
  "dow.Wednesday": { en: "Wednesday", az: "çərşənbə", ru: "среда" },
  "dow.Thursday":  { en: "Thursday", az: "cümə axşamı", ru: "четверг" },
  "dow.Friday":    { en: "Friday", az: "cümə", ru: "пятница" },
  "dow.Saturday":  { en: "Saturday", az: "şənbə", ru: "суббота" },
  // Short weekday names (Analytics) — CLDR abbreviations; narrow forms for the small heat-map headers
  "wdShort.Monday":    { en: "Mon", az: "B.e.", ru: "Пн" },
  "wdShort.Tuesday":   { en: "Tue", az: "Ç.a.", ru: "Вт" },
  "wdShort.Wednesday": { en: "Wed", az: "Ç.", ru: "Ср" },
  "wdShort.Thursday":  { en: "Thu", az: "C.a.", ru: "Чт" },
  "wdShort.Friday":    { en: "Fri", az: "C.", ru: "Пт" },
  "wdShort.Saturday":  { en: "Sat", az: "Ş.", ru: "Сб" },
  "wdShort.Sunday":    { en: "Sun", az: "B.", ru: "Вс" },
  "wdNarrow.Monday":    { en: "M", az: "Be", ru: "П" },
  "wdNarrow.Tuesday":   { en: "T", az: "Ça", ru: "В" },
  "wdNarrow.Wednesday": { en: "W", az: "Ç", ru: "С" },
  "wdNarrow.Thursday":  { en: "T", az: "Ca", ru: "Ч" },
  "wdNarrow.Friday":    { en: "F", az: "C", ru: "П" },
  "wdNarrow.Saturday":  { en: "S", az: "Ş", ru: "С" },
  "wdNarrow.Sunday":    { en: "S", az: "B", ru: "В" },
  // Months: "mon" stands alone ("October 2026"), "monGen" sits inside a date ("13 October 2026"), "monShort" is abbreviated
  "mon.1":  { en: "January", az: "Yanvar", ru: "Январь" },
  "mon.2":  { en: "February", az: "Fevral", ru: "Февраль" },
  "mon.3":  { en: "March", az: "Mart", ru: "Март" },
  "mon.4":  { en: "April", az: "Aprel", ru: "Апрель" },
  "mon.5":  { en: "May", az: "May", ru: "Май" },
  "mon.6":  { en: "June", az: "İyun", ru: "Июнь" },
  "mon.7":  { en: "July", az: "İyul", ru: "Июль" },
  "mon.8":  { en: "August", az: "Avqust", ru: "Август" },
  "mon.9":  { en: "September", az: "Sentyabr", ru: "Сентябрь" },
  "mon.10": { en: "October", az: "Oktyabr", ru: "Октябрь" },
  "mon.11": { en: "November", az: "Noyabr", ru: "Ноябрь" },
  "mon.12": { en: "December", az: "Dekabr", ru: "Декабрь" },
  "monGen.1":  { en: "January", az: "yanvar", ru: "января" },
  "monGen.2":  { en: "February", az: "fevral", ru: "февраля" },
  "monGen.3":  { en: "March", az: "mart", ru: "марта" },
  "monGen.4":  { en: "April", az: "aprel", ru: "апреля" },
  "monGen.5":  { en: "May", az: "may", ru: "мая" },
  "monGen.6":  { en: "June", az: "iyun", ru: "июня" },
  "monGen.7":  { en: "July", az: "iyul", ru: "июля" },
  "monGen.8":  { en: "August", az: "avqust", ru: "августа" },
  "monGen.9":  { en: "September", az: "sentyabr", ru: "сентября" },
  "monGen.10": { en: "October", az: "oktyabr", ru: "октября" },
  "monGen.11": { en: "November", az: "noyabr", ru: "ноября" },
  "monGen.12": { en: "December", az: "dekabr", ru: "декабря" },
  "monShort.1":  { en: "Jan", az: "yan", ru: "янв." },
  "monShort.2":  { en: "Feb", az: "fev", ru: "февр." },
  "monShort.3":  { en: "Mar", az: "mar", ru: "мар." },
  "monShort.4":  { en: "Apr", az: "apr", ru: "апр." },
  "monShort.5":  { en: "May", az: "may", ru: "мая" },
  "monShort.6":  { en: "Jun", az: "iyn", ru: "июн." },
  "monShort.7":  { en: "Jul", az: "iyl", ru: "июл." },
  "monShort.8":  { en: "Aug", az: "avq", ru: "авг." },
  "monShort.9":  { en: "Sep", az: "sen", ru: "сент." },
  "monShort.10": { en: "Oct", az: "okt", ru: "окт." },
  "monShort.11": { en: "Nov", az: "noy", ru: "нояб." },
  "monShort.12": { en: "Dec", az: "dek", ru: "дек." },
  "date.dayMonth":  { en: "{d} {m}", az: "{d} {m}", ru: "{d} {m}" },
  "date.long":      { en: "{d} {m} {y}", az: "{d} {m} {y}", ru: "{d} {m} {y} г." },
  "date.monthYear": { en: "{m} {y}", az: "{m} {y}", ru: "{m} {y}" },
  "date.today":     { en: "Today", az: "Bu gün", ru: "Сегодня" },
  "date.yesterday": { en: "Yesterday", az: "Dünən", ru: "Вчера" },

  // ── Categories (display names; the stored id and the English CSV name never change)
  "cat.food":      { en: "Food & Dining", az: "Qida və restoranlar", ru: "Еда и рестораны" },
  "cat.transport": { en: "Transport", az: "Nəqliyyat", ru: "Транспорт" },
  "cat.shopping":  { en: "Shopping", az: "Alış-veriş", ru: "Покупки" },
  "cat.gifts":     { en: "Gifts & Personal", az: "Hədiyyələr və şəxsi xərclər", ru: "Подарки и личное" },
  "cat.entertain": { en: "Entertainment", az: "Əyləncə", ru: "Развлечения" },
  "cat.digital":   { en: "Bills & Subscriptions", az: "Kommunal ödənişlər və abunəliklər", ru: "Счета и подписки" },
  "cat.health":    { en: "Health & Fitness", az: "Sağlamlıq və idman", ru: "Здоровье и спорт" },
  "cat.edu":       { en: "Education", az: "Təhsil", ru: "Образование" },
  "cat.travel":    { en: "Travel", az: "Səyahət", ru: "Путешествия" },
  "cat.housing":   { en: "Home", az: "Ev", ru: "Дом" },
  "cat.finance":   { en: "Finance", az: "Maliyyə", ru: "Финансы" },
  "cat.other":     { en: "Other", az: "Digər", ru: "Другое" },
  "cat.salary":    { en: "Salary", az: "Maaş", ru: "Зарплата" },
  "cat.freelance": { en: "Freelance", az: "Frilans", ru: "Фриланс" },
  "cat.income":    { en: "Other Income", az: "Digər gəlir", ru: "Другой доход" },
  // Short names on the category tiles of the add form
  "tile.food":      { en: "Food", az: "Qida", ru: "Еда" },
  "tile.transport": { en: "Transport", az: "Nəqliyyat", ru: "Транспорт" },
  "tile.shopping":  { en: "Shopping", az: "Alış-veriş", ru: "Покупки" },
  "tile.gifts":     { en: "Gifts", az: "Hədiyyələr", ru: "Подарки" },
  "tile.entertain": { en: "Entertainment", az: "Əyləncə", ru: "Развлечения" },
  "tile.digital":   { en: "Bills & subs", az: "Ödənişlər", ru: "Счета" },
  "tile.health":    { en: "Health", az: "Sağlamlıq", ru: "Здоровье" },
  "tile.edu":       { en: "Education", az: "Təhsil", ru: "Учёба" },
  "tile.travel":    { en: "Travel", az: "Səyahət", ru: "Поездки" },
  "tile.housing":   { en: "Home", az: "Ev", ru: "Дом" },
  "tile.finance":   { en: "Finance", az: "Maliyyə", ru: "Финансы" },
  "tile.other":     { en: "Other", az: "Digər", ru: "Другое" },
  "tile.salary":    { en: "Salary", az: "Maaş", ru: "Зарплата" },
  "tile.freelance": { en: "Freelance", az: "Frilans", ru: "Фриланс" },
  "tile.income":    { en: "Other income", az: "Digər gəlir", ru: "Другой доход" },
  // Built-in subcategories (stored in English; a subcategory the user typed is never translated)
  "sub.Restaurants": { en: "Restaurants", az: "Restoranlar", ru: "Рестораны" },
  "sub.Fast Food":   { en: "Fast Food", az: "Fast food", ru: "Фастфуд" },
  "sub.Coffee":      { en: "Coffee", az: "Qəhvə", ru: "Кофе" },
  "sub.Groceries":   { en: "Groceries", az: "Ərzaq", ru: "Продукты" },
  "sub.Delivery":    { en: "Delivery", az: "Çatdırılma", ru: "Доставка" },
  "sub.Snacks":      { en: "Snacks", az: "Qəlyanaltı", ru: "Перекусы" },
  "sub.Other":       { en: "Other", az: "Digər", ru: "Другое" },
  "sub.Metro":       { en: "Metro", az: "Metro", ru: "Метро" },
  "sub.Bus":         { en: "Bus", az: "Avtobus", ru: "Автобус" },
  "sub.Taxi / Ride-hailing": { en: "Taxi / Ride-hailing", az: "Taksi", ru: "Такси" },
  "sub.Fuel":        { en: "Fuel", az: "Yanacaq", ru: "Топливо" },
  "sub.Parking":     { en: "Parking", az: "Dayanacaq", ru: "Парковка" },
  "sub.Car Maintenance": { en: "Car Maintenance", az: "Avtomobil xidməti", ru: "Обслуживание авто" },
  "sub.Intercity":   { en: "Intercity", az: "Şəhərlərarası", ru: "Междугородний" },
  "sub.Clothing":    { en: "Clothing", az: "Geyim", ru: "Одежда" },
  "sub.Electronics": { en: "Electronics", az: "Elektronika", ru: "Электроника" },
  "sub.Personal Items": { en: "Personal Items", az: "Şəxsi əşyalar", ru: "Личные вещи" },
  "sub.Home":        { en: "Home", az: "Ev", ru: "Дом" },
  "sub.Accessories": { en: "Accessories", az: "Aksesuarlar", ru: "Аксессуары" },
  "sub.Online Shopping": { en: "Online Shopping", az: "Onlayn alış-veriş", ru: "Онлайн-покупки" },
  "sub.Gifts":       { en: "Gifts", az: "Hədiyyələr", ru: "Подарки" },
  "sub.Donations":   { en: "Donations", az: "İanələr", ru: "Пожертвования" },
  "sub.Personal Care": { en: "Personal Care", az: "Şəxsi qulluq", ru: "Уход за собой" },
  "sub.Barber / Hair": { en: "Barber / Hair", az: "Bərbər", ru: "Парикмахерская" },
  "sub.Cosmetics":   { en: "Cosmetics", az: "Kosmetika", ru: "Косметика" },
  "sub.Cinema":      { en: "Cinema", az: "Kino", ru: "Кино" },
  "sub.Games":       { en: "Games", az: "Oyunlar", ru: "Игры" },
  "sub.Events":      { en: "Events", az: "Tədbirlər", ru: "Мероприятия" },
  "sub.Sports":      { en: "Sports", az: "İdman", ru: "Спорт" },
  "sub.Hobbies":     { en: "Hobbies", az: "Hobbilər", ru: "Хобби" },
  "sub.Mobile":      { en: "Mobile", az: "Mobil rabitə", ru: "Мобильная связь" },
  "sub.Internet":    { en: "Internet", az: "İnternet", ru: "Интернет" },
  "sub.Streaming":   { en: "Streaming", az: "Strim xidmətləri", ru: "Стриминг" },
  "sub.Software":    { en: "Software", az: "Proqram təminatı", ru: "Программы" },
  "sub.Cloud Storage": { en: "Cloud Storage", az: "Bulud yaddaşı", ru: "Облачное хранилище" },
  "sub.Other Subs":  { en: "Other Subs", az: "Digər abunəliklər", ru: "Другие подписки" },
  "sub.Gym":         { en: "Gym", az: "İdman zalı", ru: "Спортзал" },
  "sub.Sports Equipment": { en: "Sports Equipment", az: "İdman avadanlığı", ru: "Спортинвентарь" },
  "sub.Pharmacy":    { en: "Pharmacy", az: "Aptek", ru: "Аптека" },
  "sub.Doctor / Dentist": { en: "Doctor / Dentist", az: "Həkim / stomatoloq", ru: "Врач / стоматолог" },
  "sub.Supplements": { en: "Supplements", az: "Qida əlavələri", ru: "БАДы" },
  "sub.University":  { en: "University", az: "Universitet", ru: "Университет" },
  "sub.Books":       { en: "Books", az: "Kitablar", ru: "Книги" },
  "sub.Courses":     { en: "Courses", az: "Kurslar", ru: "Курсы" },
  "sub.Exams":       { en: "Exams", az: "İmtahanlar", ru: "Экзамены" },
  "sub.Stationery":  { en: "Stationery", az: "Dəftərxana", ru: "Канцтовары" },
  "sub.Flights":     { en: "Flights", az: "Aviabiletlər", ru: "Авиабилеты" },
  "sub.Hotels":      { en: "Hotels", az: "Otellər", ru: "Отели" },
  "sub.Visa":        { en: "Visa", az: "Viza", ru: "Виза" },
  "sub.Travel Food": { en: "Travel Food", az: "Səfərdə qida", ru: "Еда в поездке" },
  "sub.Travel Transport": { en: "Travel Transport", az: "Səfərdə nəqliyyat", ru: "Транспорт в поездке" },
  "sub.Activities":  { en: "Activities", az: "Fəaliyyətlər", ru: "Развлечения в поездке" },
  "sub.Rent":        { en: "Rent", az: "İcarə haqqı", ru: "Аренда" },
  "sub.Utilities":   { en: "Utilities", az: "Kommunal xidmətlər", ru: "Коммунальные услуги" },
  "sub.Household":   { en: "Household", az: "Məişət", ru: "Хозтовары" },
  "sub.Repairs":     { en: "Repairs", az: "Təmir", ru: "Ремонт" },
  "sub.Bank Fees":   { en: "Bank Fees", az: "Bank komissiyaları", ru: "Банковские комиссии" },
  "sub.Transfers":   { en: "Transfers", az: "Köçürmələr", ru: "Переводы" },
  "sub.Taxes":       { en: "Taxes", az: "Vergilər", ru: "Налоги" },
  "sub.Insurance":   { en: "Insurance", az: "Sığorta", ru: "Страхование" },
  "sub.Bakery":{ en: "Bakery", az: "Çörək və çörək məmulatı", ru: "Выпечка" },
  "sub.Market / Bazaar":{ en: "Market / Bazaar", az: "Bazar", ru: "Рынок" },
  "sub.Public transport card":{ en: "Public transport card", az: "Nəqliyyat kartı", ru: "Транспортная карта" },
  "sub.Furniture":{ en: "Furniture", az: "Mebel", ru: "Мебель" },
  "sub.Appliances":{ en: "Appliances", az: "Məişət texnikası", ru: "Бытовая техника" },
  "sub.Music":{ en: "Music", az: "Musiqi", ru: "Музыка" },
  "sub.Eye care":{ en: "Eye care", az: "Göz sağlamlığı", ru: "Зрение" },
  "sub.Tests / Lab":{ en: "Tests / Lab", az: "Analizlər", ru: "Анализы" },
  "sub.Tutoring":{ en: "Tutoring", az: "Repetitor", ru: "Репетитор" },
  "sub.School / Kindergarten":{ en: "School / Kindergarten", az: "Məktəb / Uşaq bağçası", ru: "Школа / Детский сад" },
  "sub.Gas":{ en: "Gas", az: "Qaz", ru: "Газ" },
  "sub.Electricity":{ en: "Electricity", az: "Elektrik", ru: "Электричество" },
  "sub.Water":{ en: "Water", az: "Su", ru: "Вода" },
  "sub.Building fees":{ en: "Building fees", az: "Binanın idarəetmə haqqı", ru: "Взносы за дом" },
  "sub.Loan payment":{ en: "Loan payment", az: "Kredit ödənişi", ru: "Платёж по кредиту" },
  "sub.Interest":{ en: "Interest", az: "Faiz", ru: "Проценты" },
  "sub.Pets":{ en: "Pets", az: "Ev heyvanları", ru: "Питомцы" },
  "sub.Children":{ en: "Children", az: "Uşaqlar", ru: "Дети" },
  "sub.Investments": { en: "Investments", az: "İnvestisiyalar", ru: "Инвестиции" },
  "sub.Miscellaneous": { en: "Miscellaneous", az: "Müxtəlif", ru: "Разное" },

  // ── App shell: navigation, toasts, banners
  "nav.home":      { en: "Home", az: "Ana səhifə", ru: "Главная" },
  "nav.ledger":    { en: "Transactions", az: "Əməliyyatlar", ru: "Операции" },
  "nav.monthly":   { en: "Analytics", az: "Analitika", ru: "Аналитика" },
  "nav.goals":     { en: "Goals", az: "Məqsədlər", ru: "Цели" },
  "nav.more":      { en: "Settings", az: "Parametrlər", ru: "Настройки" },
  "nav.addTxn":    { en: "Add transaction", az: "Əməliyyat əlavə et", ru: "Добавить операцию" },
  "common.back":   { en: "Back", az: "Geri", ru: "Назад" },
  "add.moreDetails": { en: "More details", az: "Daha çox təfərrüat", ru: "Подробнее" },
  "add.lessDetails": { en: "Fewer details", az: "Daha az təfərrüat", ru: "Скрыть подробности" },
  "add.moreHint":    { en: "Merchant, note, date, wallet, repeat", az: "Satıcı, qeyd, tarix, ödəniş vasitəsi, təkrar", ru: "Продавец, заметка, дата, способ оплаты, повтор" },
  "add.kindPrompt":  { en: "What do you want to record?", az: "Nəyi qeyd etmək istəyirsiniz?", ru: "Что вы хотите записать?" },
  "add.loan":        { en: "Loan", az: "Kredit", ru: "Кредит" },
  "add.debt":        { en: "Debt", az: "Borc", ru: "Долг" },
  "crash.title":  { en: "Something went wrong", az: "Gözlənilməz xəta baş verdi", ru: "Что-то пошло не так" },
  "crash.body":    { en: "Your records are safe: they are stored on this phone and were not changed. Reload the app to carry on.", az: "Qeydləriniz təhlükəsizdir: onlar bu telefonda saxlanılır və dəyişdirilməyib. Davam etmək üçün tətbiqi yenidən yükləyin.", ru: "Ваши записи в безопасности: они хранятся на этом телефоне и не изменились. Перезагрузите приложение, чтобы продолжить." },
  "crash.reload":  { en: "Reload the app", az: "Tətbiqi yenidən yüklə", ru: "Перезагрузить приложение" },
  // ── Redesign (2026-10-27): page titles, Home cards, Budgets & Goals, More, Import / Export
  "home.greet.morning":   { en: "Good morning", az: "Sabahınız xeyir", ru: "Доброе утро" },
  "home.greet.afternoon": { en: "Good afternoon", az: "Günortanız xeyir", ru: "Добрый день" },
  "home.greet.evening":   { en: "Good evening", az: "Axşamınız xeyir", ru: "Добрый вечер" },
  "home.thisMonth":  { en: "This month", az: "Bu ay", ru: "Этот месяц" },
  "home.breakdown":  { en: "Spending breakdown", az: "Xərclərin bölgüsü", ru: "Структура расходов" },
  "home.otherCats":  { en: "All other", az: "Qalan hamısı", ru: "Все остальные" },
  "goals.pageTitle": { en: "Budgets & Goals", az: "Büdcələr və məqsədlər", ru: "Бюджеты и цели" },
  "budgets.monthTotal": { en: "Monthly budget · {month}", az: "Aylıq büdcə · {month}", ru: "Бюджет на месяц · {month}" },
  "budgets.spentOf":  { en: "{spent} spent of {limit}", az: "{limit} məbləğdən {spent} xərclənib", ru: "Потрачено {spent} из {limit}" },
  "budgets.byCategory": { en: "Category budgets", az: "Kateqoriya büdcələri", ru: "Бюджеты по категориям" },
  "budgets.none":     { en: "No category has a monthly limit yet. Set one below.", az: "Hələ heç bir kateqoriyaya aylıq limit qoyulmayıb. Aşağıda təyin edin.", ru: "Пока ни для одной категории не задан месячный лимит. Задайте его ниже." },
  "budgets.notSet":   { en: "Without a budget", az: "Büdcəsiz kateqoriyalar", ru: "Без бюджета" },
  "more.localData":   { en: "Your data is stored only on this device", az: "Məlumatlarınız yalnız bu cihazda saxlanılır", ru: "Ваши данные хранятся только на этом устройстве" },
  "more.recurringSub": { en: "Bills, subscriptions and regular income", az: "Hesablar, abunəliklər və müntəzəm gəlir", ru: "Счета, подписки и регулярный доход" },
  "more.ioSub":       { en: "Backups, CSV and JSON files", az: "Ehtiyat nüsxələr, CSV və JSON faylları", ru: "Резервные копии, файлы CSV и JSON" },
  "st.profile":       { en: "Profile", az: "Profil", ru: "Профиль" },
  "st.profileName":   { en: "Your name", az: "Adınız", ru: "Ваше имя" },
  "st.profileSub":    { en: "Used in the greeting on Home. It stays on this phone.", az: "Ana səhifədəki salamlaşmada istifadə olunur. Yalnız bu telefonda qalır.", ru: "Используется в приветствии на главной. Остаётся на этом телефоне." },
  "st.profilePh":     { en: "Optional", az: "İstəyə görə", ru: "Необязательно" },
  "st.profileSaved":  { en: "Name saved", az: "Ad saxlanıldı", ru: "Имя сохранено" },
  "st.profileRemoved": { en: "Name removed", az: "Ad silindi", ru: "Имя удалено" },
  "set.noSubcat":     { en: "None", az: "Yoxdur", ru: "Нет" },
  // ── Debts and loans (Run 17). az / ru are drafts: they need a native reader before release.
  "debt.title":       { en: "Debts & loans", az: "Borclar və kreditlər", ru: "Долги и кредиты" },
  "debt.corrupt":     { en: "The saved debts and loans data cannot be read, so it is protected: nothing can be added or changed until it is restored. A safe copy has been kept. Restore a backup in Settings, or contact support before adding anything.", az: "Saxlanmış borc və kredit məlumatları oxunmur, ona görə qorunur: bərpa olunana qədər heç nə əlavə etmək və ya dəyişmək olmaz. Təhlükəsiz nüsxə saxlanılıb. Ayarlarda ehtiyat nüsxəni bərpa edin.", ru: "Сохранённые данные о долгах и кредитах не читаются, поэтому они защищены: пока их не восстановят, ничего нельзя добавить или изменить. Безопасная копия сохранена. Восстановите резервную копию в Настройках." },
  "debt.unreadable":  { en: "The browser did not let the app read the saved debts and loans, so nothing can be added or changed right now. Your stored data was not touched. Reload the app; if this repeats, check the browser's storage settings.", az: "Brauzer tətbiqə saxlanmış borc və kredit məlumatlarını oxumağa icazə vermədi, ona görə indi heç nə əlavə etmək və ya dəyişmək olmaz. Saxlanmış məlumatlara toxunulmayıb. Tətbiqi yenidən yükləyin.", ru: "Браузер не дал приложению прочитать сохранённые долги и кредиты, поэтому сейчас ничего нельзя добавить или изменить. Сохранённые данные не тронуты. Перезагрузите приложение." },
  "debt.partial":     { en: "{n} saved debt or loan record could not be read and is not shown. A copy of the original data is kept before your next change.", az: "{n} saxlanmış borc və ya kredit qeydi oxunmadı və göstərilmir. Növbəti dəyişiklikdən əvvəl ilkin məlumatın nüsxəsi saxlanılır.", ru: "Не удалось прочитать записей о долгах или кредитах: {n}. Они не показаны. Перед следующим изменением сохраняется копия исходных данных." },
  "debt.blockedToast":{ en: "Not saved: the stored debts data is protected", az: "Saxlanmadı: saxlanmış borc məlumatları qorunur", ru: "Не сохранено: данные о долгах защищены" },
  "debt.askTitle":    { en: "Record in transactions?", az: "Əməliyyatlarda qeyd edilsin?", ru: "Записать в операции?" },
  "debt.askOwe":      { en: "Also record this {amount} as money you paid out in your transactions?", az: "Bu {amount} əməliyyatlarda sizin ödədiyiniz pul kimi də qeyd edilsin?", ru: "Записать эти {amount} в операции как выплаченные вами деньги?" },
  "debt.askOwed":     { en: "Also record this {amount} as money you received in your transactions?", az: "Bu {amount} əməliyyatlarda sizin aldığınız pul kimi də qeyd edilsin?", ru: "Записать эти {amount} в операции как полученные вами деньги?" },
  "debt.askHint":     { en: "Only the part that reduces the debt. It is not counted as spending or income. Interest or fees: add them separately as a normal entry.", az: "Yalnız borcu azaldan hissə. Xərc və ya gəlir sayılmır. Faiz və ya komissiya varsa, onu ayrıca adi qeyd kimi əlavə edin.", ru: "Только часть, уменьшающая долг. Она не считается расходом или доходом. Проценты или комиссии добавьте отдельной обычной записью." },
  "debt.askYes":      { en: "Yes, record it", az: "Bəli, qeyd et", ru: "Да, записать" },
  "debt.askNo":       { en: "No, debt only", az: "Xeyr, yalnız borc", ru: "Нет, только долг" },
  "debt.entryNoteOwe":{ en: "Debt repayment (paid)", az: "Borc ödənişi (ödənilib)", ru: "Погашение долга (выплачено)" },
  "debt.entryNoteOwed":{ en: "Debt repayment (received)", az: "Borc ödənişi (alınıb)", ru: "Погашение долга (получено)" },
  "debt.linkedTag":   { en: "in transactions", az: "əməliyyatlarda", ru: "в операциях" },
  "debt.recorded":    { en: "Repayment recorded", az: "Ödəniş qeyd edildi", ru: "Погашение записано" },
  "debt.payRemoved":  { en: "Repayment removed", az: "Ödəniş silindi", ru: "Погашение удалено" },
  "debt.linkedLocked":{ en: "This entry belongs to a debt repayment. Change or remove it on the Debts & loans page.", az: "Bu qeyd borc ödənişinə aiddir. Onu Borclar və kreditlər səhifəsində dəyişin və ya silin.", ru: "Эта запись относится к погашению долга. Измените или удалите её на странице «Долги и кредиты»." },
  "debt.confirmDeleteLinked":{ en: "Delete this record, its payments and the transactions linked to them?", az: "Bu qeyd, onun ödənişləri və onlara bağlı əməliyyatlar silinsin?", ru: "Удалить эту запись, её платежи и связанные с ними операции?" },
  "an.debtCash":      { en: "Debt repayments this month: {out} paid out, {inn} received. These are not counted as spending or income.", az: "Bu ay borc ödənişləri: {out} ödənilib, {inn} alınıb. Bunlar xərc və ya gəlir sayılmır.", ru: "Погашения долгов в этом месяце: выплачено {out}, получено {inn}. Они не считаются расходом или доходом." },
  "home.latest":     { en: "Latest transactions", az: "Son əməliyyatlar", ru: "Последние операции" },
  "home.seeAllTxns": { en: "See all", az: "Hamısına bax", ru: "Все" },
  "debt.rowSub":      { en: "People you owe, people who owe you, loan payments", az: "Borcunuz olanlar, sizə borclu olanlar, kredit ödənişləri", ru: "Кому вы должны, кто должен вам, платежи по кредитам" },
  "debt.segDebts":    { en: "Debts", az: "Borclar", ru: "Долги" },
  "debt.segLoans":    { en: "Loans", az: "Kreditlər", ru: "Кредиты" },
  "debt.totalOwe":    { en: "You owe", az: "Sizin borcunuz", ru: "Вы должны" },
  "debt.totalOwed":   { en: "Owed to you", az: "Sizə borclular", ru: "Вам должны" },
  "debt.totalLoans":  { en: "Loans left (estimate)", az: "Kreditlərin qalığı (təxmini)", ru: "Остаток по кредитам (оценка)" },
  "debt.none":        { en: "No debts yet. Add one to keep track of what you owe or are owed.", az: "Hələ borc yoxdur. Kimə borclu olduğunuzu və ya kimin sizə borclu olduğunu izləmək üçün əlavə edin.", ru: "Долгов пока нет. Добавьте, чтобы следить, кому вы должны и кто должен вам." },
  "debt.dirLabel":    { en: "Who owes whom", az: "Kim kimə borcludur", ru: "Кто кому должен" },
  "debt.dirOwe":      { en: "I owe them", az: "Mən borcluyam", ru: "Я должен" },
  "debt.dirOwed":     { en: "They owe me", az: "Mənə borcludur", ru: "Мне должны" },
  "debt.badgeOwe":    { en: "You owe", az: "Siz borclusunuz", ru: "Вы должны" },
  "debt.badgeOwed":   { en: "Owes you", az: "Sizə borcludur", ru: "Вам должны" },
  "debt.person":      { en: "Person", az: "Şəxs", ru: "Человек" },
  "debt.amount":      { en: "Amount", az: "Məbləğ", ru: "Сумма" },
  "debt.due":         { en: "Due date (optional)", az: "Son tarix (istəyə görə)", ru: "Срок (необязательно)" },
  "debt.invalid":     { en: "Enter a name and an amount above zero.", az: "Ad və sıfırdan böyük məbləğ daxil edin.", ru: "Введите имя и сумму больше нуля." },
  "debt.remaining":   { en: "Remaining", az: "Qalıq", ru: "Остаток" },
  "debt.of":          { en: "of {total}", az: "{total} məbləğindən", ru: "из {total}" },
  "debt.settled":     { en: "Settled", az: "Bağlanıb", ru: "Погашено" },
  "debt.dueOn":       { en: "Due {date}", az: "Son tarix: {date}", ru: "Срок: {date}" },
  "debt.payAmount":   { en: "Payment amount", az: "Ödəniş məbləği", ru: "Сумма платежа" },
  "debt.pay":         { en: "Add payment", az: "Ödəniş əlavə et", ru: "Добавить платёж" },
  "debt.tooMuch":     { en: "That is more than what is left ({left}).", az: "Bu, qalan məbləğdən ({left}) çoxdur.", ru: "Это больше остатка ({left})." },
  "debt.deletePay":   { en: "Delete payment of {amount}", az: "{amount} məbləğində ödənişi sil", ru: "Удалить платёж на {amount}" },
  "debt.delete":      { en: "Delete {name}", az: "{name} qeydini sil", ru: "Удалить: {name}" },
  "debt.confirmDelete": { en: "Delete this record and its payments?", az: "Bu qeyd və onun ödənişləri silinsin?", ru: "Удалить эту запись и её платежи?" },
  "loan.none":        { en: "No loans yet. Add one to see its payments and what it costs.", az: "Hələ kredit əlavə edilməyib. Ödəniş cədvəlini və təxmini faiz məbləğini görmək üçün kredit əlavə edin.", ru: "Пока кредитов нет. Добавьте кредит, чтобы увидеть график платежей и примерную сумму процентов." },
  "loan.lender":      { en: "Lender", az: "Kreditor", ru: "Кредитор" },
  "debt.addedToast":  { en: "Debt added", az: "Borc əlavə olundu", ru: "Долг добавлен" },
  "debt.removedToast": { en: "Debt removed", az: "Borc silindi", ru: "Долг удалён" },
  "loan.addedToast":  { en: "Loan added", az: "Kredit əlavə olundu", ru: "Кредит добавлен" },
  "loan.removedToast": { en: "Loan removed", az: "Kredit silindi", ru: "Кредит удалён" },
  "loan.payRemovedToast": { en: "Payment removed", az: "Ödəniş silindi", ru: "Платёж удалён" },
  "loan.kind":        { en: "Kind", az: "Növ", ru: "Вид" },
  "loan.kind.cash":   { en: "Cash loan", az: "Nağd kredit", ru: "Кредит наличными" },
  "loan.kind.card":   { en: "Credit card", az: "Kredit kartı", ru: "Кредитная карта" },
  "loan.kind.taksit": { en: "Instalments (taksit)", az: "Taksit", ru: "Рассрочка (таксит)" },
  "loan.kind.other":  { en: "Other", az: "Digər", ru: "Другое" },
  "loan.amount":      { en: "Amount borrowed", az: "Götürülən məbləğ", ru: "Взятая сумма" },
  "loan.rate":        { en: "Yearly rate, %", az: "İllik faiz, %", ru: "Годовая ставка, %" },
  "loan.rateType":    { en: "How the rate works", az: "Faiz necə hesablanır", ru: "Как считается ставка" },
  "loan.rt.annuity":  { en: "Equal monthly payments (annuity)", az: "Bərabər aylıq ödənişlər (annuitet)", ru: "Равные ежемесячные платежи (аннуитет)" },
  "loan.rt.equal":    { en: "Same principal each month", az: "Əsas borcun hər ay eyni məbləğdə ödənilməsi", ru: "Ежемесячно погашается одинаковая часть основного долга" },
  "loan.rt.flat":     { en: "Flat rate on the original amount", az: "İlkin məbləğə sabit faiz", ru: "Фиксированная ставка на исходную сумму" },
  "loan.rt.none":     { en: "No interest", az: "Faizsiz", ru: "Без процентов" },
  "loan.months":      { en: "Number of monthly payments", az: "Aylıq ödənişlərin sayı", ru: "Число ежемесячных платежей" },
  "loan.first":       { en: "First payment date", az: "İlk ödəniş tarixi", ru: "Дата первого платежа" },
  "loan.bank":        { en: "Monthly payment from your bank (optional)", az: "Bankın bildirdiyi aylıq ödəniş (istəyə görə)", ru: "Ежемесячный платёж, указанный банком (необязательно)" },
  "loan.bankHint":    { en: "If your bank gave you the exact payment, type it: it replaces our estimate.", az: "Bank dəqiq aylıq ödəniş məbləğini bildiribdisə, onu daxil edin. Bu məbləğ bizim təxminimizi əvəz edəcək.", ru: "Если банк сообщил точную сумму ежемесячного платежа, введите её. Она заменит наш расчёт." },
  "loan.invalid":     { en: "Check the amount, rate, number of payments and first payment date.", az: "Məbləği, faizi, ödənişlərin sayını və ilk ödəniş tarixini yoxlayın.", ru: "Проверьте сумму, ставку, число платежей и дату первого платежа." },
  "loan.monthly":     { en: "Monthly payment", az: "Aylıq ödəniş", ru: "Ежемесячный платёж" },
  "loan.next":        { en: "Next: {amount} on {date}", az: "Növbəti ödəniş: {date} — {amount}", ru: "Следующий платёж: {amount} — {date}" },
  "loan.allPaid":     { en: "All payments recorded", az: "Bütün ödənişlər qeyd edilib", ru: "Все платежи отмечены" },
  "loan.balance":     { en: "Balance left (estimate)", az: "Qalıq borc (təxmini)", ru: "Остаток долга (оценка)" },
  "loan.totalInterest": { en: "Interest over the whole loan (estimate)", az: "Kreditin bütün müddətində faiz (təxmini)", ru: "Проценты за весь срок (оценка)" },
  "loan.flatReal":    { en: "A flat rate costs about {pct}% a year on the balance that is really still owed.", az: "Sabit faizli kreditdə faktiki qalıq borca düşən illik faiz yükü təxminən {pct}%-dir.", ru: "Фактическая годовая стоимость кредита относительно оставшегося долга при фиксированной ставке составляет примерно {pct}%." },
  "loan.estimate":    { en: "This is an estimate from the terms you typed. Your bank's contract, its fees and its way of counting days are what apply.", az: "Bu, daxil etdiyiniz şərtlərə əsaslanan təxmini hesablamadır. Dəqiq şərtləri bankla müqaviləniz, komissiyalar və günlərin hesablanma qaydası müəyyən edir.", ru: "Это приблизительный расчёт по введённым вами условиям. Точные условия определяются договором с банком, комиссиями и правилами расчёта дней." },
  "loan.markPaid":    { en: "Mark next payment as paid", az: "Növbəti ödənişi ödənilmiş kimi qeyd et", ru: "Отметить следующий платёж оплаченным" },
  "loan.paidToast":   { en: "Payment recorded in your transactions", az: "Ödəniş əməliyyatlarınızda qeyd edildi", ru: "Платёж записан в ваши операции" },
  "loan.entryNote":   { en: "Loan payment", az: "Kredit ödənişi", ru: "Платёж по кредиту" },
  "loan.paymentsTitle": { en: "Payments made", az: "Edilmiş ödənişlər", ru: "Внесённые платежи" },
  "loan.deletePay":   { en: "Delete payment record of {amount}", az: "{amount} məbləğində ödəniş qeydini sil", ru: "Удалить запись о платеже на {amount}" },
  "loan.confirmDeletePay": { en: "Delete this payment record? Its entry in Transactions is removed too.", az: "Bu ödəniş qeydi silinsin? Əməliyyatlardakı müvafiq yazı da silinəcək.", ru: "Удалить эту запись о платеже? Связанная операция тоже будет удалена." },
  "coach.title": { en: "Your numbers", az: "Rəqəmləriniz", ru: "Ваши цифры" },
  "coach.window": { en: "Facts from what you recorded in the last 30 days. Not advice.", az: "Son 30 gündə qeyd etdiklərinizə əsaslanan faktlar. Məsləhət deyil.", ru: "Факты по записям за последние 30 дней. Это не совет." },
  "coach.incomplete": { en: "You logged on {days} of the last 30 days, so the numbers may be incomplete.", az: "Son 30 günün {days} günündə qeydlər aparmısınız; buna görə göstəricilər tam olmaya bilər.", ru: "Записи есть за {days} из последних 30 дней, поэтому данные могут быть неполными." },
  "coach.noIncome": { en: "Add your income to see how much of it you keep.", az: "Gəlirin nə qədərini saxladığınızı görmək üçün gəlirinizi əlavə edin.", ru: "Добавьте доход, чтобы увидеть, какая его часть остаётся у вас." },
  "coach.spent": { en: "You spent {pct}% of the income you recorded and kept {kept}%.", az: "Qeydə aldığınız gəlirin {pct}%-ni xərcləmisiniz, {kept}%-i qalıb.", ru: "Вы потратили {pct}% записанного дохода, {kept}% осталось." },
  "coach.over": { en: "You spent more than the income you recorded ({pct}% of it).", az: "Qeydə aldığınız gəlirdən çox xərcləmisiniz (onun {pct}%-i).", ru: "Вы потратили больше записанного дохода ({pct}% от него)." },
  "coach.welcome":      { en: "Welcome back. Add what you remember. Rough amounts are fine.", az: "Yenidən xoş gəlmisiniz. Yadınızda qalanları əlavə edin. Təxmini məbləğlər də yaxşıdır.", ru: "С возвращением. Добавьте то, что помните. Приблизительные суммы подойдут." },
  "coach.incomeDip":    { en: "You recorded income in {have} of the last {of} months. The lowest month was {pct}% of your average.", az: "Son {of} ayın {have} ayında gəlir qeyd etmisiniz. Ən aşağı ay orta göstəricinizin {pct}%-i olub.", ru: "Вы записывали доход в {have} из последних {of} месяцев. Самый низкий месяц составил {pct}% от вашего среднего." },
  "coach.loanShare":    { en: "About {pct}% of your recorded income goes to loan payments you entered.", az: "Qeydə aldığınız gəlirin təxminən {pct}%-i daxil etdiyiniz kredit ödənişlərinə gedir.", ru: "Около {pct}% записанного дохода уходит на введённые вами платежи по кредитам." },
  "coach.loanShareHigh":{ en: "About {pct}% of your recorded income goes to loan payments you entered. This leaves less room for unexpected costs.", az: "Qeydə aldığınız gəlirin təxminən {pct}%-i daxil etdiyiniz kredit ödənişlərinə gedir. Bu, gözlənilməz xərclər üçün daha az yer qoyur.", ru: "Около {pct}% записанного дохода уходит на введённые вами платежи по кредитам. Это оставляет меньше запаса на непредвиденные расходы." },
  "an.sixSpent":        { en: "Spent", az: "Xərc", ru: "Расходы" },
  "an.sixIncome":       { en: "Income", az: "Gəlir", ru: "Доходы" },
  "an.sixNet":          { en: "Net", az: "Fərq", ru: "Итог" },
  "coach.hide":        { en: "Hide this tip", az: "Bu məsləhəti gizlət", ru: "Скрыть этот совет" },
  "coach.showHidden":   { en: "Show hidden tips ({n})", az: "Gizlədilmiş məsləhətləri göstər ({n})", ru: "Показать скрытые советы ({n})" },
  "coach.billsShare":  { en: "Your regular bills take about {pct}% of your recorded income, which leaves less room to adjust quickly.", az: "Müntəzəm ödənişləriniz qeydə aldığınız gəlirin təxminən {pct}%-ni təşkil edir, bu da tez dəyişiklik etmək üçün imkanı azaldır.", ru: "Ваши регулярные платежи занимают около {pct}% записанного дохода, поэтому быстро что-то изменить сложнее." },
  "coach.catUp":       { en: "{cat} is {pct}% above your usual so far this month (average of the last three months).", az: "«{cat}» bu ay indiyədək adi səviyyənizdən {pct}% yuxarıdır (son üç ayın ortalaması).", ru: "Расходы на «{cat}» в этом месяце уже на {pct}% выше обычного (среднее за последние три месяца)." },
  "coach.loanInterest": { en: "If you pay {lender} exactly as scheduled, about {amount} of what you pay will be interest.", az: "{lender} üzrə ödənişləri cədvəl üzrə etsəniz, ödədiyinizin təxminən {amount} məbləği faiz olacaq.", ru: "Если платить {lender} точно по графику, около {amount} из выплаченного составят проценты." },
  "coach.noCover":     { en: "At the payment you entered for {lender}, the balance will not go down: it is about the same as the monthly interest.", az: "{lender} üçün daxil etdiyiniz ödənişlə borc azalmayacaq: ödəniş aylıq faizə təxminən bərabərdir.", ru: "При введённом платеже по {lender} долг не уменьшится: платёж примерно равен месячным процентам." },
  "coach.future": { en: "{n} entries are dated in the future and are not counted here.", az: "Gələcək tarixə aid {n} qeyd var; onlar bu hesablamaya daxil edilmir.", ru: "Записей с будущими датами: {n}. Они не учитываются в этой сводке." },
  "coach.loanDue": { en: "{lender}: {amount} is due on {date}.", az: "{lender}: {amount} məbləğində ödəniş {date} tarixindədir.", ru: "{lender}: платёж {amount} — {date}." },
  "coach.loanOverdue": { en: "{lender}: the payment of {amount} was due on {date}. Mark it paid on the Debts page once you have paid it.", az: "{lender}: {amount} məbləğində ödəniş {date} tarixində olmalı idi. Ödədikdən sonra Borclar səhifəsində qeyd edin.", ru: "{lender}: платёж {amount} был назначен на {date}. Отметьте его оплаченным на странице «Долги и кредиты», когда оплатите." },
  "coach.owedLate": { en: "{name} was due to pay you {amount} by {date}.", az: "{name} {date} tarixinədək sizə {amount} qaytarmalı idi.", ru: "От {name} ожидался возврат {amount} до {date}." },
  "setup.title": { en: "Get set up", az: "Başlanğıc", ru: "Начало работы" },
  "setup.sub": { en: "Four small steps. Skip any you do not need.", az: "Dörd kiçik addım. Lazım olmayanları keçin.", ru: "Четыре небольших шага. Ненужные можно пропустить." },
  "setup.s1": { en: "Add your first transaction", az: "İlk əməliyyatınızı əlavə edin", ru: "Добавьте первую операцию" },
  "setup.s2": { en: "Record an income", az: "Gəlir qeyd edin", ru: "Запишите доход" },
  "setup.s3": { en: "Set a budget or a goal", az: "Büdcə və ya məqsəd təyin edin", ru: "Задайте бюджет или цель" },
  "setup.s4": { en: "Save a backup file", az: "Ehtiyat nüsxə faylı saxlayın", ru: "Сохраните файл резервной копии" },
  "setup.stepDone": { en: "done", az: "tamamlandı", ru: "готово" },
  "setup.hide": { en: "Hide this list", az: "Bu siyahını gizlət", ru: "Скрыть этот список" },
  "loan.interestPart": { en: "Interest part of this payment", az: "Bu ödənişin faiz hissəsi", ru: "Часть платежа — проценты" },
  "loan.interestHint": { en: "Estimated from the terms you typed; correct it from your bank statement. Clear it if you do not know. The full payment is always recorded as money paid out; only the interest counts as spending.", az: "Məbləğ daxil etdiyiniz şərtlərə əsasən təxmin edilir. Bank çıxarışınızdakı məlumatla dəqiqləşdirin; bilmirsinizsə, sahəni boş saxlayın. Ödənişin tam məbləği çıxan pul kimi, yalnız faiz hissəsi isə xərc kimi qeyd olunur.", ru: "Сумма рассчитана приблизительно по введённым условиям. Сверьте её с банковской выпиской; если точная сумма неизвестна, оставьте поле пустым. Вся сумма платежа учитывается как выплата, а расходом считается только процентная часть." },
  "loan.interestInvalid": { en: "Check the interest amount: a number from 0 up to the payment.", az: "Faiz məbləği 0 ilə ödənişin tam məbləği arasında olmalıdır.", ru: "Сумма процентов должна быть от 0 до полной суммы платежа." },
  "an.loanCash": { en: "Loan payments this month: {paid} paid out, of which {interest} is interest and counts as spending. The rest repays the loan and is not spending.", az: "Bu ay kredit ödənişləri: {paid} ödənilib, bunun {interest} faizdir və xərc sayılır. Qalanı krediti azaldır və xərc deyil.", ru: "Платежи по кредитам в этом месяце: выплачено {paid}, из них {interest} — проценты, они считаются расходом. Остальное погашает кредит и расходом не является." },
  "an.loanCashUnknown": { en: "Payments without an interest amount entered ({n}) are not counted as spending.", az: "Faiz məbləği daxil edilməyən ödənişlər ({n}) xərc sayılmır.", ru: "Платежи без указанной суммы процентов ({n}) расходом не считаются." },
  "an.trendTitle":    { en: "Spending trend", az: "Xərclərin gedişi", ru: "Динамика расходов" },
  "an.trendSub":      { en: "Spent so far, day by day · dashed line: {month}", az: "Gün-gün indiyədək xərclənən · qırıq xətt: {month}", ru: "Потрачено с начала месяца по дням · пунктир: {month}" },
  "an.trendAria":     { en: "Spending trend: {amount} spent; previous month in total {prev}", az: "Xərclərin gedişi: {amount} xərclənib; əvvəlki ay cəmi {prev}", ru: "Динамика расходов: потрачено {amount}; в предыдущем месяце всего {prev}" },
  // ── Run 9: privacy mode and screen-specific "+" actions
  "privacy.hide":     { en: "Hide amounts", az: "Məbləğləri gizlət", ru: "Скрыть суммы" },
  "privacy.show":     { en: "Show amounts", az: "Məbləğləri göstər", ru: "Показать суммы" },
  "privacy.onToast":  { en: "Privacy mode on — amounts and names are hidden", az: "Məxfilik rejimi açıqdır — məbləğlər və adlar gizlədilib", ru: "Режим конфиденциальности включён — суммы и названия скрыты" },
  "privacy.offToast": { en: "Privacy mode off", az: "Məxfilik rejimi bağlıdır", ru: "Режим конфиденциальности выключен" },
  "privacy.hiddenText": { en: "Hidden while privacy mode is on", az: "Məxfilik rejimində gizlədilib", ru: "Скрыто в режиме конфиденциальности" },
  "safe.showHow":     { en: "How is this calculated?", az: "Bu necə hesablanır?", ru: "Как это рассчитано?" },
  "safe.hideHow":     { en: "Hide the calculation", az: "Hesablamanı gizlət", ru: "Скрыть расчёт" },
  "detail.linkBill":  { en: "This was a payment of a recurring bill", az: "Bu, təkrarlanan hesabın ödənişi idi", ru: "Это был платёж по регулярному счёту" },
  "detail.linkIncome": { en: "This was a payment of a recurring income", az: "Bu, təkrarlanan gəlirin ödənişi idi", ru: "Это было поступление регулярного дохода" },
  "detail.linkHint":  { en: "Choose the bill this entry paid. It then counts as that bill's payment, so Safe to Spend stops setting the bill aside. The entry takes the bill's name, category and frequency; its amount and date stay as they are.", az: "Bu qeydin ödədiyi hesabı seçin. Qeyd həmin hesabın ödənişi sayılacaq və «Xərcləmək olar» bu hesab üçün pul ayırmayacaq. Qeyd hesabın adını, kateqoriyasını və tezliyini alır; məbləği və tarixi dəyişmir.", ru: "Выберите счёт, который оплачен этой записью. Тогда она будет считаться платежом по этому счёту, и «Можно потратить» перестанет откладывать на него деньги. Запись получит название, категорию и периодичность счёта; сумма и дата не изменятся." },
  "detail.linkedToast": { en: "Recorded as the payment of {name}", az: "{name} üzrə ödəniş kimi qeyd edildi", ru: "Записано как платёж: {name}" },
  "goals.addBudget":  { en: "Add budget", az: "Büdcə əlavə et", ru: "Добавить бюджет" },
  "goals.addGoal":    { en: "Add goal", az: "Məqsəd əlavə et", ru: "Добавить цель" },
  // ── Run 12: explicit bills (screens)
  "bill.add":          { en: "Add bill", az: "Hesab əlavə et", ru: "Добавить счёт" },
  "bill.edit":         { en: "Edit bill", az: "Hesabı redaktə et", ru: "Изменить счёт" },
  "bill.name":         { en: "Name", az: "Ad", ru: "Название" },
  "bill.namePh":       { en: "e.g. Rent, Azercell, Electricity", az: "məs., İcarə, Azercell, İşıq", ru: "напр., Аренда, Azercell, Электричество" },
  "bill.firstDue":     { en: "Next due date", az: "Növbəti ödəniş tarixi", ru: "Следующая дата оплаты" },
  "bill.dueFrom":      { en: "Due from (date)", az: "Ödəniş tarixi (başlanğıc)", ru: "Оплата начиная с (даты)" },
  "bill.active":       { en: "Active", az: "Aktiv", ru: "Активен" },
  "bill.endDate":      { en: "Last payment date (optional)", az: "Son ödəniş tarixi (könüllü)", ru: "Дата последнего платежа (необязательно)" },
  "bill.endDateSub":   { en: "For a credit or instalments that finish. After this date nothing is set aside for it.", az: "Bitən kredit və ya hissə-hissə ödəniş üçün. Bu tarixdən sonra bunun üçün pul ayrılmır.", ru: "Для кредита или рассрочки, которые заканчиваются. После этой даты деньги на это не откладываются." },
  "bill.endDateBad":   { en: "The last payment date cannot be before the first due date.", az: "Son ödəniş tarixi ilk ödəniş tarixindən əvvəl ola bilməz.", ru: "Дата последнего платежа не может быть раньше первой даты оплаты." },
  "bill.paymentsLeft": { en: { one: "{n} payment left", other: "{n} payments left" }, az: "{n} ödəniş qalıb", ru: { one: "остался {n} платёж", few: "осталось {n} платежа", many: "осталось {n} платежей", other: "осталось {n} платежа" } },
  "bill.endedOn":      { en: "Finished on {date}", az: "{date} tarixində bitib", ru: "Закончился {date}" },
  "bill.activeSub":   { en: "Paused bills are not set aside in Safe to Spend", az: "Dayandırılmış hesablar üçün «Xərcləmək olar»da pul ayrılmır", ru: "На приостановленные счета в «Можно потратить» деньги не откладываются" },
  "bill.delete":       { en: "Delete bill (payments are kept)", az: "Hesabı sil (ödənişlər qalır)", ru: "Удалить счёт (платежи сохранятся)" },
  "bill.deleted":      { en: "Bill deleted — its payments stay in your history as ordinary entries", az: "Hesab silindi — ödənişləri tarixçədə adi qeyd kimi qalır", ru: "Счёт удалён — его платежи остаются в истории как обычные записи" },
  "bill.autoGroup":   { en: "Not linked to a bill (grouped by name)", az: "Hesaba bağlı deyil (adına görə qruplaşdırılır)", ru: "Не привязан к счёту (группировка по названию)" },
  "bill.askTitle":    { en: "You already have a bill called {name}", az: "«{name}» adlı hesabınız artıq var", ru: "Счёт «{name}» у вас уже есть" },
  "bill.askText":     { en: "{amount}, {freq}. Is this entry a payment of that bill, or a separate bill with the same name?", az: "{amount}, {freq}. Bu qeyd həmin hesabın ödənişidir, yoxsa eyni adlı ayrı hesabdır?", ru: "{amount}, {freq}. Эта запись — платёж по этому счёту или отдельный счёт с таким же названием?" },
  "bill.askPay":      { en: "It is a payment of {name}", az: "Bu, «{name}» hesabının ödənişidir", ru: "Это платёж по счёту «{name}»" },
  "bill.askNew":      { en: "It is a separate, new bill", az: "Bu, ayrı, yeni hesabdır", ru: "Это отдельный новый счёт" },
  "bill.saved":        { en: "Bill saved", az: "Hesab yadda saxlanıldı", ru: "Счёт сохранён" },
  "bill.invalid":      { en: "Enter a name, an amount above 0 and a valid date", az: "Ad, 0-dan böyük məbləğ və düzgün tarix daxil edin", ru: "Введите название, сумму больше 0 и корректную дату" },
  "bill.noPayments":   { en: "no payments yet", az: "hələ ödəniş yoxdur", ru: "платежей пока нет" },
  "bill.which":        { en: "Bill", az: "Hesab", ru: "Счёт" },
  "bill.newFromEntry": { en: "A new bill (from this entry)", az: "Yeni hesab (bu qeyddən)", ru: "Новый счёт (из этой записи)" },
  "bill.convertFirst": { en: "Your recurring payments are still grouped the old way. Convert them to bills on the Recurring payments page to choose the bill here.", az: "Təkrarlanan ödənişləriniz hələ köhnə qaydada qruplaşdırılır. Burada hesabı seçmək üçün onları «Təkrarlanan ödənişlər» səhifəsində hesablara çevirin.", ru: "Ваши регулярные платежи пока сгруппированы по-старому. Чтобы выбирать счёт здесь, преобразуйте их в счета на странице «Регулярные платежи»." },
  "bill.legacyTitle":  { en: "Turn your recurring payments into bills", az: "Təkrarlanan ödənişlərinizi hesablara çevirin", ru: "Преобразуйте регулярные платежи в счета" },
  "bill.legacyText":   { en: { one: "{n} recurring payment group is recognised only by its name and category, so two different bills with the same name can be counted as one. As bills, each one is tracked separately with its own amount and due date. Your entries are not changed, and you can undo.", other: "{n} recurring payment groups are recognised only by their name and category, so two different bills with the same name can be counted as one. As bills, each one is tracked separately with its own amount and due date. Your entries are not changed, and you can undo." }, az: "{n} təkrarlanan ödəniş qrupu yalnız adı və kateqoriyası ilə tanınır, ona görə də eyni adlı iki fərqli hesab bir hesab kimi sayıla bilər. Hesab kimi hər biri öz məbləği və ödəniş tarixi ilə ayrıca izlənir. Qeydləriniz dəyişmir və geri qaytara bilərsiniz.", ru: { one: "{n} группа регулярных платежей распознаётся только по названию и категории, поэтому два разных счёта с одним названием могут считаться одним. Как счета каждый учитывается отдельно, со своей суммой и датой оплаты. Ваши записи не меняются, действие можно отменить.", few: "{n} группы регулярных платежей распознаются только по названию и категории, поэтому два разных счёта с одним названием могут считаться одним. Как счета каждый учитывается отдельно, со своей суммой и датой оплаты. Ваши записи не меняются, действие можно отменить.", many: "{n} групп регулярных платежей распознаются только по названию и категории, поэтому два разных счёта с одним названием могут считаться одним. Как счета каждый учитывается отдельно, со своей суммой и датой оплаты. Ваши записи не меняются, действие можно отменить.", other: "{n} группы регулярных платежей распознаются только по названию и категории, поэтому два разных счёта с одним названием могут считаться одним. Как счета каждый учитывается отдельно, со своей суммой и датой оплаты. Ваши записи не меняются, действие можно отменить." } },
  "bill.convertBtn":   { en: "Convert to bills", az: "Hesablara çevir", ru: "Преобразовать в счета" },
  "bill.converted":    { en: { one: "{n} bill created", other: "{n} bills created" }, az: "{n} hesab yaradıldı", ru: { one: "Создан {n} счёт", few: "Создано {n} счёта", many: "Создано {n} счетов", other: "Создано {n} счёта" } },
  "bill.restoreAsk":   { en: { one: "An older version of the app removed {n} of your bills. Restore it, with its payment links?", other: "An older version of the app removed {n} of your bills. Restore them, with their payment links?" }, az: "Tətbiqin köhnə versiyası hesablarınızdan {n}-ni sildi. Ödəniş əlaqələri ilə birlikdə bərpa edilsin?", ru: { one: "Старая версия приложения удалила {n} ваш счёт. Восстановить его вместе со связанными платежами?", few: "Старая версия приложения удалила {n} ваших счёта. Восстановить их вместе со связанными платежами?", many: "Старая версия приложения удалила {n} ваших счетов. Восстановить их вместе со связанными платежами?", other: "Старая версия приложения удалила {n} ваших счёта. Восстановить их вместе со связанными платежами?" } },
  "bill.restoreBtn":   { en: "Restore", az: "Bərpa et", ru: "Восстановить" },
  "bill.restoreNo":    { en: "No thanks", az: "Xeyr, təşəkkürlər", ru: "Нет, спасибо" },
  "bill.restored":     { en: { one: "{n} bill restored", other: "{n} bills restored" }, az: "{n} hesab bərpa edildi", ru: { one: "Восстановлен {n} счёт", few: "Восстановлено {n} счёта", many: "Восстановлено {n} счетов", other: "Восстановлено {n} счёта" } },
  "bill.paymentOf":    { en: "Payment of: {name}", az: "Ödəniş: {name}", ru: "Платёж по счёту: {name}" },
  "bill.change":       { en: "Move to another bill", az: "Başqa hesaba köçür", ru: "Перенести на другой счёт" },
  "bill.newFromThis":  { en: "A new bill from this payment", az: "Bu ödənişdən yeni hesab", ru: "Новый счёт из этого платежа" },
  "bill.linkHint":     { en: "Choose the bill this entry paid. It then counts as that bill's payment, so Safe to Spend stops setting the bill aside. The entry itself (amount, date, name, category) does not change.", az: "Bu qeydin ödədiyi hesabı seçin. Qeyd həmin hesabın ödənişi sayılacaq və «Xərcləmək olar» bu hesab üçün pul ayırmayacaq. Qeydin özü (məbləğ, tarix, ad, kateqoriya) dəyişmir.", ru: "Выберите счёт, который оплачен этой записью. Тогда она будет считаться платежом по этому счёту, и «Можно потратить» перестанет откладывать на него деньги. Сама запись (сумма, дата, название, категория) не меняется." },
  // ── Run 12: explicit bills (validation and import messages)
  "settings.billsNotList": { en: "Bills are not a valid list — your current bills were kept.", az: "Hesablar düzgün siyahı deyil — mövcud hesablarınız saxlanıldı.", ru: "Счета — не корректный список: ваши текущие счета сохранены." },
  "settings.billsAllBad":  { en: { one: "The {n} bill was invalid — your current bills were kept.", other: "All {n} bills were invalid — your current bills were kept." }, az: "{n} hesabın hamısı yanlışdır — mövcud hesablarınız saxlanıldı.", ru: { one: "{n} счёт некорректен — ваши текущие счета сохранены.", few: "Все {n} счёта некорректны — ваши текущие счета сохранены.", many: "Все {n} счетов некорректны — ваши текущие счета сохранены.", other: "Все {n} счёта некорректны — ваши текущие счета сохранены." } },
  "settings.billsSomeBad": { en: { one: "{n} bill was invalid and was skipped.", other: "{n} bills were invalid and were skipped." }, az: "{n} hesab yanlış olduğu üçün buraxıldı.", ru: { one: "{n} счёт некорректен и пропущен.", few: "{n} счёта некорректны и пропущены.", many: "{n} счетов некорректны и пропущены.", other: "{n} счёта некорректны и пропущены." } },
  "import.billUnlinked":   { en: { one: "{n} payment points to a bill this file does not contain; it is imported as a recurring payment without that link.", other: "{n} payments point to a bill this file does not contain; they are imported as recurring payments without that link." }, az: "{n} ödəniş bu faylda olmayan hesaba bağlıdır; həmin əlaqə olmadan təkrarlanan ödəniş kimi idxal edilir.", ru: { one: "{n} платёж ссылается на счёт, которого нет в файле; он импортируется как регулярный платёж без этой связи.", few: "{n} платежа ссылаются на счёт, которого нет в файле; они импортируются как регулярные платежи без этой связи.", many: "{n} платежей ссылаются на счёт, которого нет в файле; они импортируются как регулярные платежи без этой связи.", other: "{n} платежа ссылаются на счёт, которого нет в файле; они импортируются как регулярные платежи без этой связи." } },
  // ── Run 11: new-version notice and version label
  "update.ready":     { en: "A new version of the app is ready", az: "Tətbiqin yeni versiyası hazırdır", ru: "Готова новая версия приложения" },
  "update.now":       { en: "Update", az: "Yenilə", ru: "Обновить" },
  "more.version":     { en: "Version {v}", az: "Versiya {v}", ru: "Версия {v}" },
  // ── Run 10: keeping the data safe
  "io.safety":        { en: "Data safety", az: "Məlumatların təhlükəsizliyi", ru: "Сохранность данных" },
  "io.protectTitle":  { en: "Storage protection", az: "Yaddaşın qorunması", ru: "Защита хранилища" },
  "io.protectOn":     { en: "On — the browser has agreed not to clear the app's data by itself (for example when the phone runs low on space).", az: "Açıqdır — brauzer tətbiqin məlumatlarını özbaşına (məsələn, telefonda yer azalanda) silməyəcəyinə razılaşıb.", ru: "Включена — браузер согласился не удалять данные приложения сам (например, когда на телефоне мало места)." },
  "io.protectOff":    { en: "Off — the browser may clear the app's data if the phone runs low on space. Installing the app on the Home Screen usually turns this on. Keep backups either way.", az: "Bağlıdır — telefonda yer azalanda brauzer tətbiqin məlumatlarını silə bilər. Tətbiqi ana ekrana quraşdırmaq adətən bunu açır. Hər halda ehtiyat nüsxə saxlayın.", ru: "Выключена — браузер может удалить данные приложения, если на телефоне мало места. Обычно её включает установка приложения на главный экран. В любом случае храните резервные копии." },
  "io.protectUnsupported": { en: "This browser does not say whether it keeps the app's data. Keep backups.", az: "Bu brauzer tətbiqin məlumatlarını saxlayıb-saxlamadığını bildirmir. Ehtiyat nüsxə saxlayın.", ru: "Этот браузер не сообщает, сохраняет ли он данные приложения. Храните резервные копии." },
  "io.protectBtn":    { en: "Ask the browser again", az: "Brauzerdən yenidən soruş", ru: "Запросить у браузера ещё раз" },
  "io.on":            { en: "On", az: "Açıq", ru: "Вкл." },
  "io.off":           { en: "Off", az: "Bağlı", ru: "Выкл." },
  "io.installTitle":  { en: "Install on the Home Screen", az: "Ana ekrana quraşdırın", ru: "Установите на главный экран" },
  "io.installHow":    { en: "It then opens like an app, works without internet, and its data is better protected. Android (Chrome): menu ⋮ → Add to Home screen. iPhone (Safari): Share → Add to Home Screen.", az: "Belə olduqda o, tətbiq kimi açılır, internetsiz işləyir və məlumatları daha yaxşı qorunur. Android (Chrome): menyu ⋮ → Ana ekrana əlavə et. iPhone (Safari): Paylaş → Ana ekrana əlavə et.", ru: "Тогда оно открывается как приложение, работает без интернета, а его данные лучше защищены. Android (Chrome): меню ⋮ → Добавить на главный экран. iPhone (Safari): Поделиться → На экран «Домой»." },
  "io.installBtn":    { en: "Install the app", az: "Tətbiqi quraşdır", ru: "Установить приложение" },
  "io.shareBackup":   { en: "Save a backup to Google Drive, Telegram…", az: "Ehtiyat nüsxəni Google Drive, Telegram… yerinə saxla", ru: "Сохранить копию в Google Drive, Telegram…" },
  "io.shareHint":     { en: "Choose where to keep a copy outside this phone. If the phone is lost or reset, you can import that file on a new one.", az: "Bu telefondan kənarda nüsxənin saxlanacağı yeri seçin. Telefon itsə və ya sıfırlansa, həmin faylı yeni telefona idxal edə bilərsiniz.", ru: "Выберите, где хранить копию вне этого телефона. Если телефон потеряется или будет сброшен, этот файл можно импортировать на новом." },
  "io.shareFailed":   { en: "Couldn't save the backup — nothing was sent. Try again, or choose another app in the share menu.", az: "Ehtiyat nüsxəni saxlamaq mümkün olmadı — heç nə göndərilmədi. Yenidən cəhd edin və ya paylaşma menyusunda başqa tətbiq seçin.", ru: "Не удалось сохранить копию — ничего не отправлено. Повторите попытку или выберите другое приложение в меню «Поделиться»." },
  "io.sharedToast":   { en: "Backup sent — check that it arrived where you chose", az: "Ehtiyat nüsxə göndərildi — seçdiyiniz yerə çatdığını yoxlayın", ru: "Копия отправлена — проверьте, что она дошла туда, куда вы выбрали" },
  "io.title":         { en: "Import / Export", az: "İdxal / ixrac", ru: "Импорт и экспорт" },
  "io.import":        { en: "Import", az: "İdxal", ru: "Импорт" },
  "io.importSub":     { en: "A CSV file or a JSON backup", az: "CSV faylı və ya JSON ehtiyat nüsxəsi", ru: "Файл CSV или резервная копия JSON" },
  "io.export":        { en: "Export", az: "İxrac", ru: "Экспорт" },
  "io.exportCsv":     { en: "Export CSV", az: "CSV ixrac et", ru: "Экспорт в CSV" },
  "io.backups":       { en: "Backups", az: "Ehtiyat nüsxələr", ru: "Резервные копии" },
  "io.confirmed":     { en: "You have it", az: "Sizdə var", ru: "Файл у вас" },
  "io.unconfirmed":   { en: "Not confirmed", az: "Təsdiqlənməyib", ru: "Не подтверждено" },
  "io.createBackup":  { en: "Create backup file", az: "Ehtiyat faylı yarat", ru: "Создать файл резервной копии" },
  "nav.backAgain": { en: "Press Back again to exit", az: "Çıxmaq üçün yenidən «Geri» düyməsini basın", ru: "Нажмите «Назад» ещё раз, чтобы выйти" },
  "common.undo":   { en: "Undo", az: "Geri qaytar", ru: "Отменить" },
  "common.dismiss": { en: "Dismiss", az: "Bağla", ru: "Закрыть" },
  "common.dismissNotice": { en: "Dismiss notice", az: "Bildirişi bağla", ru: "Закрыть уведомление" },
  "common.ok":     { en: "OK", az: "Oldu", ru: "ОК" },
  "common.cancel": { en: "Cancel", az: "Ləğv et", ru: "Отмена" },
  "common.close":  { en: "Close", az: "Bağla", ru: "Закрыть" },
  "common.save":   { en: "Save", az: "Yadda saxla", ru: "Сохранить" },
  "common.edit":   { en: "Edit", az: "Redaktə et", ru: "Изменить" },
  "common.delete": { en: "Delete", az: "Sil", ru: "Удалить" },
  "import.bankSkipped": { en: "{n} rows of the bank statement were skipped because their date or amount could not be read.", az: "Bank çıxarışının {n} sətri tarixi və ya məbləği oxunmadığı üçün buraxıldı.", ru: "Строк банковской выписки пропущено: {n} — не удалось прочитать дату или сумму." },
  "acc.title":  { en: "Accounts and balances", az: "Hesablar və qalıqlar", ru: "Счета и остатки" },
  "acc.sub":    { en: "Add your cards, cash and bank accounts. A balance is worked out from the opening balance and the entries you mark with that account; entries without an account are not counted.", az: "Kartlarınızı, nağd pulunuzu və bank hesablarınızı əlavə edin. Qalıq açılış qalığından və həmin hesabla işarələdiyiniz qeydlərdən hesablanır; hesabsız qeydlər nəzərə alınmır.", ru: "Добавьте карты, наличные и банковские счета. Остаток считается из начального остатка и операций, отмеченных этим счётом; операции без счёта не учитываются." },
  "acc.field":  { en: "Account", az: "Hesab", ru: "Счёт" },
  "acc.none":   { en: "No account", az: "Hesabsız", ru: "Без счёта" },
  "acc.name":   { en: "Account name", az: "Hesabın adı", ru: "Название счёта" },
  "acc.kind":   { en: "Account type", az: "Hesab növü", ru: "Тип счёта" },
  "acc.kind.cash":  { en: "Cash", az: "Nağd", ru: "Наличные" },
  "acc.kind.card":  { en: "Card", az: "Kart", ru: "Карта" },
  "acc.kind.wallet": { en: "Mobile wallet", az: "Mobil pul kisəsi", ru: "Мобильный кошелёк" },
  "acc.kind.bank":  { en: "Bank account", az: "Bank hesabı", ru: "Банковский счёт" },
  "budgets.showAll": { en: "Show all {n}", az: "Hamısını göstər ({n})", ru: "Показать все ({n})" },
  "budgets.showFewer": { en: "Show fewer", az: "Daha az göstər", ru: "Свернуть" },
  "st.foldMoney": { en: "Currency and Safe to Spend", az: "Valyuta və «Xərcləmək olar»", ru: "Валюта и «Можно потратить»" },
  "st.foldLook": { en: "Appearance", az: "Görünüş", ru: "Внешний вид" },
  // Run 30 (Android app only): reminders. az / ru written by Claude, NOT yet reviewed by a native speaker.
  "remind.title":      { en: "Reminders", az: "Xatırlatmalar", ru: "Напоминания" },
  "remind.sub":        { en: "Get a nudge before a bill or a recurring payment is due. Nothing leaves your phone.", az: "Ödəniş vaxtı çatmamış xəbər alın. Heç nə telefondan çıxmır.", ru: "Напомним до срока платежа. Ничего не покидает ваш телефон." },
  "remind.bills":      { en: "Bills due", az: "Ödəniş günü", ru: "Срок счетов" },
  "remind.billsSub":   { en: "On the due day", az: "Ödəniş günü", ru: "В день платежа" },
  "remind.recurring":  { en: "Recurring payments", az: "Təkrarlanan ödənişlər", ru: "Регулярные платежи" },
  "remind.recurringSub": { en: "The day before", az: "Bir gün əvvəl", ru: "За день до срока" },
  "remind.daily":      { en: "Daily check-in", az: "Gündəlik xatırlatma", ru: "Ежедневное напоминание" },
  "remind.dailySub":   { en: "At 21:00, if nothing is recorded today", az: "Bu gün heç nə qeyd olunmayıbsa, 21:00-da", ru: "В 21:00, если сегодня ничего не записано" },
  "remind.time":       { en: "Reminder time", az: "Xatırlatma vaxtı", ru: "Время напоминания" },
  "remind.hide":       { en: "Hide amounts in notifications", az: "Bildirişlərdə məbləği gizlət", ru: "Скрывать суммы в уведомлениях" },
  "remind.hideSub":    { en: "Others who see your lock screen will not see what you pay", az: "Kilid ekranını görənlər nə ödədiyinizi görməyəcək", ru: "Те, кто видит экран блокировки, не увидят, за что вы платите" },
  "remind.denied":     { en: "Notifications are blocked for this app. Allow them in the phone's settings to get reminders.", az: "Bu tətbiq üçün bildirişlər bloklanıb. Xatırlatmalar üçün telefonun ayarlarında icazə verin.", ru: "Уведомления для приложения запрещены. Разрешите их в настройках телефона." },
  "remind.battery":    { en: "If a reminder arrives late, allow Expense Ledger to run in the background in your phone's battery settings.", az: "Xatırlatma gec gəlirsə, telefonun batareya ayarlarında Expense Ledger üçün fonda işləməyə icazə verin.", ru: "Если напоминание приходит с опозданием, разрешите Expense Ledger работать в фоне в настройках батареи." },
  "remind.billTitle":  { en: "{name} is due today", az: "{name} — ödəniş günüdür", ru: "{name}: срок платежа сегодня" },
  "remind.recurTitle": { en: "{name} is due tomorrow", az: "{name} — sabah ödəniş günüdür", ru: "{name}: срок платежа завтра" },
  "remind.body":       { en: "{amount} · open the app to record it", az: "{amount} · qeyd etmək üçün tətbiqi açın", ru: "{amount} · откройте приложение, чтобы записать" },
  "remind.bodyHidden": { en: "Open the app to record it", az: "Qeyd etmək üçün tətbiqi açın", ru: "Откройте приложение, чтобы записать" },
  "remind.aPayment":   { en: "A payment", az: "Bir ödəniş", ru: "Платёж" },
  "remind.dailyTitle": { en: "Anything to add today?", az: "Bu gün əlavə ediləcək nə isə var?", ru: "Есть что записать сегодня?" },
  "remind.dailyBody":  { en: "A few seconds now keeps your ledger accurate.", az: "İndi bir neçə saniyə dəftəri dəqiq saxlayır.", ru: "Несколько секунд сейчас сохранят учёт точным." },
  "st.groupMoney": { en: "Money", az: "Pul", ru: "Деньги" },
  "st.groupLook": { en: "Look and language", az: "Görünüş və dil", ru: "Вид и язык" },
  "st.sumAcc": { en: "Total {amount}", az: "Cəmi {amount}", ru: "Всего {amount}" },
  "st.sumAccNone": { en: "Add your first account", az: "İlk hesabınızı əlavə edin", ru: "Добавьте первый счёт" },
  "st.sumCat": { en: "Your own: {n}", az: "Sizin: {n}", ru: "Ваши: {n}" },
  "st.sumCatNone": { en: "Using the built-in set", az: "Hazır siyahıdan istifadə olunur", ru: "Используется стандартный набор" },
  "st.sumMoneyOn": { en: "{c} · Safe to Spend on", az: "{c} · «Xərcləmək olar» aktivdir", ru: "{c} · «Можно потратить» включено" },
  "st.sumMoneyOff": { en: "{c} · Safe to Spend off", az: "{c} · «Xərcləmək olar» söndürülüb", ru: "{c} · «Можно потратить» выключено" },
  "st.sumLookFx": { en: "{theme} · fewer effects", az: "{theme} · effektlər azaldılıb", ru: "{theme} · меньше эффектов" },
  "st.sumRem": { en: "{n} on", az: "{n} aktiv", ru: "Включено: {n}" },
  "st.sumRemNone": { en: "All off", az: "Hamısı söndürülüb", ru: "Всё выключено" },
  "st.groupData": { en: "Data and safety", az: "Məlumat və təhlükəsizlik", ru: "Данные и безопасность" },
  "st.groupApp": { en: "App", az: "Tətbiq", ru: "Приложение" },
  "acc.homeTitle": { en: "Accounts", az: "Hesablar", ru: "Счета" },
  "acc.manage": { en: "Manage", az: "İdarə et", ru: "Управлять" },
  "acc.preset.cash":    { en: "Cash", az: "Nağd pul", ru: "Наличные" },
  "acc.preset.card":    { en: "Bank card", az: "Bank kartı", ru: "Банковская карта" },
  "acc.preset.wallet":  { en: "Mobile wallet", az: "Mobil pul kisəsi", ru: "Мобильный кошелёк" },
  "acc.preset.savings": { en: "Savings", az: "Yığım", ru: "Накопления" },
  "acc.presetHint": { en: "Quick start: tap one to fill the name and type", az: "Tez başlanğıc: ada və növə toxunun, avtomatik dolsun", ru: "Быстрый старт: нажмите, чтобы подставить название и тип" },
  "acc.kind.other": { en: "Other", az: "Digər", ru: "Другое" },
  "acc.opening": { en: "Balance today (optional)", az: "Bu günkü qalıq (istəyə bağlı)", ru: "Остаток сегодня (необязательно)" },
  "acc.add":    { en: "Add account", az: "Hesab əlavə et", ru: "Добавить счёт" },
  "acc.added":  { en: "Account added", az: "Hesab əlavə edildi", ru: "Счёт добавлен" },
  "acc.removed": { en: "Account removed", az: "Hesab silindi", ru: "Счёт удалён" },
  "acc.remove": { en: "Remove account {name}", az: "{name} hesabını sil", ru: "Удалить счёт {name}" },
  "acc.hidden": { en: "hidden", az: "gizlədilib", ru: "скрыт" },
  "acc.edit":   { en: "Edit", az: "Dəyiş", ru: "Изменить" },
  "acc.edited": { en: "Account updated", az: "Hesab yeniləndi", ru: "Счёт обновлён" },
  "acc.hide":   { en: "Hide", az: "Gizlət", ru: "Скрыть" },
  "acc.show":   { en: "Show", az: "Göstər", ru: "Показать" },
  "acc.inUse":  { en: "Entries or transfers use this account, so it cannot be removed. Hide it instead.", az: "Bu hesabdan qeydlər və ya köçürmələr istifadə edir, buna görə silinə bilməz. Əvəzinə gizlədin.", ru: "Этот счёт используется в операциях или переводах, удалить его нельзя. Скройте его." },
  "acc.saveFailed": { en: "Could not save. Free some storage and try again.", az: "Saxlamaq mümkün olmadı. Yaddaşı boşaldıb yenidən cəhd edin.", ru: "Не удалось сохранить. Освободите память и повторите." },
  "acc.total":  { en: "Total in shown accounts: {amount}", az: "Göstərilən hesablarda cəmi: {amount}", ru: "Всего на показанных счетах: {amount}" },
  "acc.net":  { en: "Net position: {amount}", az: "Xalis vəziyyət: {amount}", ru: "Чистая позиция: {amount}" },
  "acc.netNote": { en: "Accounts, plus money owed to you, minus what you owe and what is left on your loans (loan balances are estimates).", az: "Hesablar, üstəgəl sizə borclu olunan pul, çıx öz borcunuz və kreditlərin qalığı (kredit qalıqları təxminidir).", ru: "Счета плюс долги вам, минус ваши долги и остатки по кредитам (остатки по кредитам — оценка)." },
  "acc.totalNote": { en: "This is not your net worth: debts and loans are not included.", az: "Bu sizin xalis sərvətiniz deyil: borclar və kreditlər daxil edilməyib.", ru: "Это не ваш капитал: долги и кредиты не учтены." },
  "acc.transferTitle": { en: "Move money between accounts", az: "Hesablar arasında pul köçürün", ru: "Перевод между счетами" },
  "acc.transferSub": { en: "A transfer is not income and not spending. It changes only the two balances.", az: "Köçürmə nə gəlirdir, nə də xərc. O yalnız iki qalığı dəyişir.", ru: "Перевод — не доход и не расход. Он меняет только два остатка." },
  "acc.from":   { en: "From account", az: "Hansı hesabdan", ru: "Со счёта" },
  "acc.to":     { en: "To account", az: "Hansı hesaba", ru: "На счёт" },
  "acc.amount": { en: "Transfer amount", az: "Köçürmə məbləği", ru: "Сумма перевода" },
  "acc.transferGo": { en: "Transfer", az: "Köçür", ru: "Перевести" },
  "acc.transferDone": { en: "Transfer recorded", az: "Köçürmə qeyd edildi", ru: "Перевод записан" },
  "acc.transferRemoved": { en: "Transfer removed", az: "Köçürmə silindi", ru: "Перевод удалён" },
  "acc.removeTransfer": { en: "Remove this transfer", az: "Bu köçürməni sil", ru: "Удалить этот перевод" },
  "acc.err.empty":   { en: "Type a name first.", az: "Əvvəlcə ad yazın.", ru: "Сначала введите название." },
  "acc.err.long":    { en: "That name is too long (40 characters at most).", az: "Ad çox uzundur (ən çox 40 simvol).", ru: "Название слишком длинное (не более 40 символов)." },
  "acc.err.full":    { en: "You have reached the limit.", az: "Həddə çatdınız.", ru: "Достигнут предел." },
  "acc.err.dup":     { en: "An account with that name already exists.", az: "Bu adda hesab artıq var.", ru: "Счёт с таким названием уже есть." },
  "acc.err.amount":  { en: "Enter an amount greater than zero.", az: "Sıfırdan böyük məbləğ daxil edin.", ru: "Введите сумму больше нуля." },
  "acc.err.same":    { en: "Choose two different accounts.", az: "İki fərqli hesab seçin.", ru: "Выберите два разных счёта." },
  "acc.err.account": { en: "Choose both accounts.", az: "Hər iki hesabı seçin.", ru: "Выберите оба счёта." },
  "acc.err.date":    { en: "The date is not valid.", az: "Tarix düzgün deyil.", ru: "Дата недействительна." },
  "split.btn":     { en: "Split into categories", az: "Kateqoriyalara böl", ru: "Разделить по категориям" },
  "split.sub":     { en: "Share {total} between two or more categories. The parts must add up exactly.", az: "{total} məbləğini iki və ya daha çox kateqoriya arasında bölün. Hissələrin cəmi dəqiq uyğun olmalıdır.", ru: "Разделите {total} между двумя и более категориями. Сумма частей должна совпасть точно." },
  "split.partCat": { en: "Category of part {n}", az: "{n}-ci hissənin kateqoriyası", ru: "Категория части {n}" },
  "split.partAmt": { en: "Amount of part {n}", az: "{n}-ci hissənin məbləği", ru: "Сумма части {n}" },
  "split.left":    { en: "Left to assign: {amount}", az: "Bölüşdürülməli qalan: {amount}", ru: "Осталось распределить: {amount}" },
  "split.add":     { en: "Add a part", az: "Hissə əlavə et", ru: "Добавить часть" },
  "split.save":    { en: "Split", az: "Böl", ru: "Разделить" },
  "split.done":    { en: "Split into {n} entries", az: "{n} qeydə bölündü", ru: "Разделено на записей: {n}" },
  "mycat.title":   { en: "My categories", az: "Mənim kateqoriyalarım", ru: "Мои категории" },
  "mycat.sub":     { en: "Add your own categories. They appear everywhere categories are chosen. A category can be removed only when no entry or budget uses it.", az: "Öz kateqoriyalarınızı əlavə edin. Onlar kateqoriya seçilən hər yerdə görünür. Kateqoriyanı yalnız heç bir qeyd və ya büdcə istifadə etmədikdə silmək olar.", ru: "Добавьте свои категории. Они появятся везде, где выбирается категория. Удалить категорию можно, только если её не используют операции и бюджеты." },
  "mycat.name":    { en: "Category name", az: "Kateqoriya adı", ru: "Название категории" },
  "mycat.type":    { en: "Category type", az: "Kateqoriya növü", ru: "Тип категории" },
  "mycat.color":   { en: "Colour", az: "Rəng", ru: "Цвет" },
  "mycat.add":     { en: "Add category", az: "Kateqoriya əlavə et", ru: "Добавить категорию" },
  "mycat.added":   { en: "Category added", az: "Kateqoriya əlavə edildi", ru: "Категория добавлена" },
  "mycat.removed": { en: "Category removed", az: "Kateqoriya silindi", ru: "Категория удалена" },
  "mycat.removeBtn": { en: "Remove", az: "Sil", ru: "Удалить" },
  "mycat.remove":  { en: "Remove category {name}", az: "{name} kateqoriyasını sil", ru: "Удалить категорию {name}" },
  "mycat.inUse":   { en: "This category is used by an entry or a budget, so it cannot be removed.", az: "Bu kateqoriya bir qeyd və ya büdcədə istifadə olunur, buna görə silinə bilməz.", ru: "Эта категория используется в операции или бюджете, поэтому её нельзя удалить." },
  "mycat.saveFailed": { en: "Could not save the category. Free some storage and try again.", az: "Kateqoriyanı saxlamaq mümkün olmadı. Yaddaşı boşaldıb yenidən cəhd edin.", ru: "Не удалось сохранить категорию. Освободите память и повторите." },
  "mycat.err.empty": { en: "Type a name first.", az: "Əvvəlcə ad yazın.", ru: "Сначала введите название." },
  "mycat.err.long":  { en: "That name is too long (24 characters at most).", az: "Ad çox uzundur (ən çox 24 simvol).", ru: "Название слишком длинное (не более 24 символов)." },
  "mycat.err.dup":   { en: "A category with that name already exists.", az: "Bu adda kateqoriya artıq var.", ru: "Категория с таким названием уже есть." },
  "mycat.err.full":  { en: "You have reached the limit of 30 own categories.", az: "30 şəxsi kateqoriya həddinə çatdınız.", ru: "Достигнут предел — 30 своих категорий." },
  "bill.icsBtn":  { en: "Add upcoming bills to my calendar (.ics)", az: "Yaxın ödənişləri təqvimimə əlavə et (.ics)", ru: "Добавить ближайшие платежи в календарь (.ics)" },
  "bill.icsNone": { en: "No unpaid bill dates in the next 12 months.", az: "Növbəti 12 ayda ödənilməmiş ödəniş tarixi yoxdur.", ru: "В ближайшие 12 месяцев нет неоплаченных платежей." },
  "ledger.select":     { en: "Select", az: "Seç", ru: "Выбрать" },
  "ledger.selectDone": { en: "Done", az: "Hazır", ru: "Готово" },
  "ledger.selectAll":  { en: "Select all ({n})", az: "Hamısını seç ({n})", ru: "Выбрать все ({n})" },
  "ledger.selectNone": { en: "Clear selection", az: "Seçimi təmizlə", ru: "Снять выбор" },
  "ledger.deleteSel":  { en: "Delete {n}", az: "{n} sil", ru: "Удалить: {n}" },
  "ledger.selOnly":    { en: "Selected only", az: "Yalnız seçilənlər", ru: "Только выбранные" },
  "ledger.selSum":     { en: "{n} selected · Spent {exp} · Income {inc} · Net {net}", az: "{n} seçilib · Xərc {exp} · Gəlir {inc} · Xalis {net}", ru: "Выбрано: {n} · Расход {exp} · Доход {inc} · Итого {net}" },
  "ledger.selHint":    { en: "Tap entries to select. Your selection stays when you change the search or filters.", az: "Seçmək üçün qeydlərə toxunun. Axtarışı və ya filtrləri dəyişsəniz də seçim qalır.", ru: "Нажимайте на записи, чтобы выбрать. Выбор сохраняется при смене поиска и фильтров." },
  "budget.crossOver": { en: "{cat} budget exceeded this month ({pct}%)", az: "{cat} büdcəsi bu ay aşıldı ({pct}%)", ru: "Бюджет «{cat}» в этом месяце превышен ({pct}%)" },
  "budget.crossNear": { en: "{cat} budget is {pct}% used", az: "{cat} büdcəsinin {pct}%-i istifadə olunub", ru: "Бюджет «{cat}» использован на {pct}%" },
  "toast.recorded": { en: "Transaction recorded", az: "Əməliyyat qeydə alındı", ru: "Операция записана" },
  "toast.updated":  { en: "Transaction updated", az: "Əməliyyat yeniləndi", ru: "Операция обновлена" },
  "toast.deleted":  { en: { one: "Transaction deleted", other: "{n} transactions deleted" }, az: { one: "Əməliyyat silindi", other: "{n} əməliyyat silindi" }, ru: { one: "{n} операция удалена", few: "{n} операции удалены", many: "{n} операций удалено", other: "{n} операции удалено" } },
  "toast.csvCreated": { en: { one: "CSV file created — {n} row", other: "CSV file created — {n} rows" }, az: "CSV faylı yaradıldı — {n} sətir", ru: { one: "CSV-файл создан — {n} строка", few: "CSV-файл создан — {n} строки", many: "CSV-файл создан — {n} строк", other: "CSV-файл создан — {n} строки" } },
  "toast.backupCreated": {
    en: { one: "Backup file created — {n} transaction. Check your Downloads folder: the app can't confirm it was saved.", other: "Backup file created — {n} transactions. Check your Downloads folder: the app can't confirm it was saved." },
    az: "Ehtiyat nüsxə faylı yaradıldı — {n} əməliyyat. «Yükləmələr» qovluğunu yoxlayın: tətbiq faylın saxlanıldığını təsdiqləyə bilmir.",
    ru: { one: "Файл резервной копии создан — {n} операция. Проверьте папку «Загрузки»: приложение не может подтвердить, что файл сохранён.", few: "Файл резервной копии создан — {n} операции. Проверьте папку «Загрузки»: приложение не может подтвердить, что файл сохранён.", many: "Файл резервной копии создан — {n} операций. Проверьте папку «Загрузки»: приложение не может подтвердить, что файл сохранён.", other: "Файл резервной копии создан — {n} операции. Проверьте папку «Загрузки»: приложение не может подтвердить, что файл сохранён." } },
  "banner.savePaused":  { en: "Saving is paused so your original data is not overwritten (a recovery copy could not be made — storage may be full). Export a backup, free some space, then reload.", az: "Orijinal məlumatlarınızın üzərinə yazılmaması üçün yadda saxlama dayandırılıb (bərpa surəti yaradıla bilmədi — yaddaş dolu ola bilər). Ehtiyat nüsxə ixrac edin, yer boşaldın və səhifəni yeniləyin.", ru: "Сохранение приостановлено, чтобы не перезаписать исходные данные (не удалось создать копию для восстановления — возможно, хранилище заполнено). Экспортируйте резервную копию, освободите место и перезагрузите страницу." },
  "banner.readPaused":  { en: "Saving is paused because your saved data could not be read. Nothing has been overwritten. Close and reopen the app; if this keeps happening, check the browser's storage settings.", az: "Saxlanmış məlumatlarınız oxuna bilmədiyi üçün yadda saxlama dayandırılıb. Heç nəyin üzərinə yazılmayıb. Tətbiqi bağlayıb yenidən açın; bu təkrarlanarsa, brauzerin yaddaş parametrlərini yoxlayın.", ru: "Сохранение приостановлено, так как не удалось прочитать сохранённые данные. Ничего не перезаписано. Закройте и снова откройте приложение; если это повторяется, проверьте настройки хранилища браузера." },
  "banner.saveFailed":  { en: "Could not save changes — storage may be full. Back up your data now.", az: "Dəyişiklikləri yadda saxlamaq mümkün olmadı — yaddaş dolu ola bilər. Məlumatlarınızın ehtiyat nüsxəsini indi yaradın.", ru: "Не удалось сохранить изменения — возможно, хранилище заполнено. Сделайте резервную копию прямо сейчас." },
  "banner.backUp":      { en: "Back up", az: "Ehtiyat nüsxə", ru: "Сделать копию" },
  "more.localDataA":  { en: "Your data lives on this device; Google backup may keep a copy", az: "Məlumatlarınız bu cihazdadır; Google ehtiyat nüsxəsi surət saxlaya bilər", ru: "Ваши данные на этом устройстве; резервная копия Google может хранить копию" },
  "info.how.4.hA":    { en: "Your data and its backups", az: "Məlumatlarınız və ehtiyat nüsxələri", ru: "Ваши данные и резервные копии" },
  "info.how.4.bA":    { en: "There is no account in this app. On Android your phone may also keep an encrypted automatic backup of your data in your Google account and bring it back when you reinstall the app or change phones. That copy can be a day old, so also save a backup file (More → Import / Export) to Google Drive, Telegram or e-mail.", az: "Bu tətbiqdə hesab yoxdur. Android-də telefonunuz məlumatlarınızın şifrələnmiş avtomatik ehtiyat nüsxəsini Google hesabınızda saxlaya və tətbiqi yenidən quraşdırdıqda və ya telefonu dəyişdikdə geri qaytara bilər. Bu nüsxə bir gün köhnə ola bilər, ona görə ehtiyat nüsxə faylını da (Digər → İdxal / ixrac) Google Drive-a, Telegram-a və ya e-poçta saxlayın.", ru: "В этом приложении нет аккаунта. На Android телефон может также хранить зашифрованную автоматическую копию ваших данных в аккаунте Google и возвращать её при переустановке приложения или смене телефона. Такая копия может быть суточной давности, поэтому дополнительно сохраните резервный файл (Ещё → Импорт и экспорт) в Google Drive, Telegram или на почту." },
  "info.safe.1.hA":   { en: "Your data lives on this phone", az: "Məlumatlarınız bu telefondadır", ru: "Ваши данные на этом телефоне" },
  "info.safe.1.bA":   { en: "The app has no account and no server of its own. On Android, Google's automatic backup may keep a copy of your data in your Google account. It can be about a day old, so it does not replace a backup file. You can switch it off in your phone's Google backup settings.", az: "Tətbiqin hesabı və öz serveri yoxdur. Android-də Google-un avtomatik ehtiyat nüsxəsi məlumatlarınızın surətini Google hesabınızda saxlaya bilər. O təxminən bir gün köhnə ola bilər, ona görə ehtiyat nüsxə faylını əvəz etmir. Onu telefonun Google ehtiyat nüsxə ayarlarında söndürə bilərsiniz.", ru: "У приложения нет аккаунта и собственного сервера. На Android автоматическая резервная копия Google может хранить копию ваших данных в аккаунте Google. Она может быть примерно суточной давности, поэтому не заменяет файл резервной копии. Её можно отключить в настройках резервного копирования Google на телефоне." },
  "info.safe.2.bA":   { en: "Clearing the app's storage, a phone reset or losing the phone, and a very full phone. Uninstalling the app or moving to a new phone can bring back an older automatic copy if Google backup is on.", az: "Tətbiq yaddaşının təmizlənməsi, telefonun sıfırlanması və ya itirilməsi, telefonun çox dolu olması. Google ehtiyat nüsxəsi açıqdırsa, tətbiqi silmək və ya yeni telefona keçmək köhnə avtomatik nüsxəni geri qaytara bilər.", ru: "Очистка хранилища приложения, сброс или потеря телефона, переполненная память. Если резервное копирование Google включено, удаление приложения или переход на новый телефон может вернуть более старую автоматическую копию." },
  "info.privacy.1.bA": { en: "Your entries, budgets, goals, bills and settings are stored in the app's own storage on this device. If Google backup is on, Android may also keep a copy in your Google account. The app has no account of its own, no ads, and no analytics of what you enter.", az: "Qeydləriniz, büdcələriniz, məqsədləriniz, ödənişləriniz və ayarlarınız bu cihazda, tətbiqin öz yaddaşında saxlanılır. Google ehtiyat nüsxəsi açıqdırsa, Android surəti Google hesabınızda da saxlaya bilər. Tətbiqin öz hesabı, reklamı və daxil etdiyiniz məlumatların analitikası yoxdur.", ru: "Ваши записи, бюджеты, цели, платежи и настройки хранятся в собственной памяти приложения на этом устройстве. Если резервное копирование Google включено, Android может хранить копию и в вашем аккаунте Google. У приложения нет собственного аккаунта и рекламы, а также аналитики того, что вы вводите." },
  "info.privacy.4.bA": { en: "You can export everything at any time. To delete your data, clear the app's data in your phone's settings or uninstall the app; a copy in your Google backup, if you have one, is managed in your Google account. Without a backup file or a Google backup, deleted data cannot be recovered.", az: "İstənilən vaxt hər şeyi ixrac edə bilərsiniz. Məlumatları silmək üçün telefonun ayarlarında tətbiqin məlumatlarını təmizləyin və ya tətbiqi silin; Google ehtiyat nüsxənizdəki surət (varsa) Google hesabınızda idarə olunur. Ehtiyat nüsxə faylı və ya Google ehtiyat nüsxəsi olmadan silinmiş məlumatı bərpa etmək olmaz.", ru: "Вы можете в любой момент экспортировать всё. Чтобы удалить данные, очистите данные приложения в настройках телефона или удалите приложение; копия в резервной копии Google (если она есть) управляется в вашем аккаунте Google. Без файла резервной копии или резервной копии Google удалённые данные восстановить нельзя." },
  "restore.notice":     { en: "Your data was restored from a backup ({n} entries, latest: {date}). Anything you entered after that backup may be missing – please check your latest entries.", az: "Məlumatlarınız ehtiyat nüsxədən bərpa olunub (əməliyyat sayı: {n}, ən sonuncusu: {date}). Həmin nüsxədən sonra daxil etdikləriniz çatışmaya bilər – son əməliyyatlarınızı yoxlayın.", ru: "Данные восстановлены из резервной копии (операций: {n}, последняя: {date}). Всё, что вы вносили после этой копии, может отсутствовать — проверьте последние операции." },
  "banner.backupDue":   { en: "Back up your data to avoid losing it", az: "Məlumatlarınızı itirməmək üçün ehtiyat nüsxəsini yaradın", ru: "Сделайте резервную копию, чтобы не потерять данные" },
  "banner.backUpNow":   { en: "Back up now", az: "İndi yarat", ru: "Сделать сейчас" },
  "banner.backupConfirm": { en: "A backup file was created. The app can't see your Downloads — once you've found the file, confirm it here.", az: "Ehtiyat nüsxə faylı yaradıldı. Tətbiq «Yükləmələr» qovluğunu görə bilmir — faylı tapdıqdan sonra burada təsdiqləyin.", ru: "Файл резервной копии создан. Приложение не видит папку «Загрузки» — когда найдёте файл, подтвердите это здесь." },
  "banner.haveFile":    { en: "I have the file", az: "Fayl məndədir", ru: "Файл у меня" },
  "banner.confirmThanks": { en: { one: "Thanks — the next reminder is in {n} day", other: "Thanks — the next reminder is in {n} days" }, az: "Təşəkkürlər — növbəti xatırlatma {n} gündən sonra", ru: { one: "Спасибо — следующее напоминание через {n} день", few: "Спасибо — следующее напоминание через {n} дня", many: "Спасибо — следующее напоминание через {n} дней", other: "Спасибо — следующее напоминание через {n} дня" } },
  // ── Restore-backup dialog
  "import.dialogLabel": { en: "Restore backup", az: "Ehtiyat nüsxəni bərpa et", ru: "Восстановление из резервной копии" },
  "import.title":       { en: "Restore Backup", az: "Ehtiyat nüsxəni bərpa et", ru: "Восстановление из копии" },
  "import.readFailed":  { en: "That file could not be read, so nothing was imported.", az: "Fayl oxuna bilmədi, ona görə heç nə idxal edilmədi.", ru: "Не удалось прочитать файл, поэтому ничего не импортировано." },
  "import.billsStay":   { en: { one: "This file has no bills, so your {n} bill stays. If you Replace, the file's payments will not be linked to it.", other: "This file has no bills, so your {n} bills stay. If you Replace, the file's payments will not be linked to them." }, az: "Bu faylda hesab yoxdur, ona görə mövcud {n} hesabınız qalır. Əvəz etsəniz, fayldakı ödənişlər onlara bağlanmayacaq.", ru: { one: "В этом файле нет счетов, поэтому ваш {n} счёт останется. Если выбрать «Заменить», платежи из файла не будут к нему привязаны.", few: "В этом файле нет счетов, поэтому ваши {n} счёта останутся. Если выбрать «Заменить», платежи из файла не будут к ним привязаны.", many: "В этом файле нет счетов, поэтому ваши {n} счетов останутся. Если выбрать «Заменить», платежи из файла не будут к ним привязаны.", other: "В этом файле нет счетов, поэтому ваши {n} счёта останутся. Если выбрать «Заменить», платежи из файла не будут к ним привязаны." } },
  "import.listUnreadable": { en: "The list of transactions in this file could not be read, so no entries can be imported from it.", az: "Bu fayldakı əməliyyat siyahısı oxuna bilmədi, ona görə ondan heç bir qeyd idxal edilə bilməz.", ru: "Список операций в этом файле не удалось прочитать, поэтому из него нельзя импортировать записи." },
  "import.copyFailed":  { en: "Couldn't keep a copy of your current data (storage may be full) — export a backup first. Nothing was changed.", az: "Cari məlumatlarınızın surətini saxlamaq mümkün olmadı (yaddaş dolu ola bilər) — əvvəlcə ehtiyat nüsxə ixrac edin. Heç nə dəyişdirilmədi.", ru: "Не удалось сохранить копию текущих данных (возможно, хранилище заполнено) — сначала экспортируйте резервную копию. Ничего не изменено." },
  "import.replaced":    { en: { one: "Replaced with {n} transaction", other: "Replaced with {n} transactions" }, az: "{n} əməliyyatla əvəz edildi", ru: "Данные заменены, операций: {n}" },
  "import.added":       { en: { one: "Added {n} transaction", other: "Added {n} transactions" }, az: "{n} əməliyyat əlavə edildi", ru: "Добавлено операций: {n}" },
  "import.auxFailed":  { en: "Import stopped: the subcategories or debts could not be saved. Nothing was changed.", az: "İdxal dayandırıldı: alt kateqoriyalar və ya borclar saxlanıla bilmədi. Heç nə dəyişmədi.", ru: "Импорт остановлен: подкатегории или долги не удалось сохранить. Ничего не изменено." },
  "import.cantUndo":    { en: "Can't undo — your data has changed since the import", az: "Geri qaytarmaq mümkün deyil — idxaldan sonra məlumatlarınız dəyişib", ru: "Отменить нельзя — после импорта данные изменились" },
  "import.ready":       { en: { one: "{n} transaction ready to import", other: "{n} transactions ready to import" }, az: "{n} əməliyyat idxala hazırdır", ru: "Готово к импорту операций: {n}" },
  "import.skipped":     { en: { one: "{n} row skipped — {summary}", other: "{n} rows skipped — {summary}" }, az: "{n} sətir buraxıldı — {summary}", ru: "Пропущено строк: {n} — {summary}" },
  "import.mergeLabel":  { en: "Merge", az: "Birləşdir", ru: "Объединить" },
  "import.mergeText":   { en: "adds new transactions and keeps everything you have. Budgets are combined (imported categories win), new goals and templates are added, and your currency and Safe to Spend settings stay as they are.", az: "yeni əməliyyatları əlavə edir və mövcud olanların hamısını saxlayır. Büdcələr birləşdirilir (idxal olunan kateqoriyalar üstünlük təşkil edir), yeni məqsədlər və şablonlar əlavə olunur, valyuta və «Xərcləmək olar» parametrləriniz dəyişmir.", ru: "добавляет новые операции и сохраняет всё, что у вас есть. Бюджеты объединяются (импортированные категории имеют приоритет), новые цели и шаблоны добавляются, а валюта и настройки «Можно потратить» остаются прежними." },
  "import.replaceLabel": { en: "Replace", az: "Əvəz et", ru: "Заменить" },
  "import.replaceText": { en: "swaps your transactions for the file's. Budgets, goals, templates, currency and Safe to Spend are replaced only if the file has a valid section for them. A recovery copy of your current data is kept first, and you can undo straight after.", az: "əməliyyatlarınızı fayldakılarla əvəz edir. Büdcələr, məqsədlər, şablonlar, valyuta və «Xərcləmək olar» yalnız faylda onlar üçün düzgün bölmə olduqda əvəz olunur. Əvvəlcə cari məlumatlarınızın bərpa surəti saxlanılır və dərhal sonra geri qaytara bilərsiniz.", ru: "заменяет ваши операции операциями из файла. Бюджеты, цели, шаблоны, валюта и «Можно потратить» заменяются, только если в файле есть для них корректный раздел. Сначала сохраняется копия текущих данных для восстановления, и сразу после этого действие можно отменить." },
  "import.skipDup":     { en: "When merging, skip {n} that look like transactions you already have (same date, amount, merchant and note)", az: "Birləşdirərkən artıq mövcud olanlara bənzəyən {n} əməliyyatı buraxın (eyni tarix, məbləğ, satıcı və qeyd)", ru: "При объединении пропустить похожие на уже имеющиеся операции: {n} (та же дата, сумма, продавец и заметка)" },
  "import.mergeBtn":    { en: "Merge — add new, keep existing", az: "Birləşdir — yeniləri əlavə et, mövcudları saxla", ru: "Объединить — добавить новые, сохранить текущие" },
  "import.replaceBlockedLabel": { en: "Replace is not offered.", az: "«Əvəz et» təklif edilmir.", ru: "«Заменить» недоступно." },
  "import.replaceBlockedText":  {
    en: { one: "{n} row in this file could not be read; replacing your data would lose it. Merge adds the readable rows to your data, or fix the file and try again.", other: "{n} rows in this file could not be read; replacing your data would lose them. Merge adds the readable rows to your data, or fix the file and try again." },
    az: "Bu faylda {n} sətir oxuna bilmədi; məlumatlarınızı əvəz etmək onları itirərdi. «Birləşdir» oxunan sətirləri məlumatlarınıza əlavə edir, ya da faylı düzəldib yenidən cəhd edin.",
    ru: { one: "{n} строку в этом файле не удалось прочитать; при замене данных она была бы потеряна. «Объединить» добавит читаемые строки к вашим данным, или исправьте файл и попробуйте снова.", few: "{n} строки в этом файле не удалось прочитать; при замене данных они были бы потеряны. «Объединить» добавит читаемые строки к вашим данным, или исправьте файл и попробуйте снова.", many: "{n} строк в этом файле не удалось прочитать; при замене данных они были бы потеряны. «Объединить» добавит читаемые строки к вашим данным, или исправьте файл и попробуйте снова.", other: "{n} строки в этом файле не удалось прочитать; при замене данных они были бы потеряны. «Объединить» добавит читаемые строки к вашим данным, или исправьте файл и попробуйте снова." } },
  "import.settingsOnlyLabel": { en: "No transactions in this file.", az: "Bu faylda əməliyyat yoxdur.", ru: "В этом файле нет операций." },
  "import.settingsOnlyText":  { en: "It can only update settings. Your transactions are kept either way.", az: "O, yalnız parametrləri yeniləyə bilər. Əməliyyatlarınız hər halda saxlanılır.", ru: "Он может обновить только настройки. Ваши операции в любом случае сохраняются." },
  "import.settingsOnlyBtn":   { en: "Use the file's settings — keep my transactions", az: "Fayldakı parametrləri istifadə et — əməliyyatlarımı saxla", ru: "Использовать настройки из файла — сохранить мои операции" },
  "import.settingsApplied":   { en: "Settings from the file applied — your transactions were not changed", az: "Fayldakı parametrlər tətbiq edildi — əməliyyatlarınız dəyişmədi", ru: "Настройки из файла применены — ваши операции не изменены" },
  "import.replaceBtn":  { en: "Replace — use the file's data", az: "Əvəz et — fayldakı məlumatları istifadə et", ru: "Заменить — использовать данные из файла" },

  // ── Home
  "home.spentThisMonth": { en: "spent this month", az: "bu ay xərclənib", ru: "потрачено в этом месяце" },
  // Month comparisons (Run 7): a month under way is compared with the same days of the previous month; a finished month
  // with the whole previous month. No short month name is slotted into the sentence (az "sen ilə müqayisədə" read as a word).
  "month.trendsTitle": { en: "Trends up to today", az: "Bu günə qədər meyillər", ru: "Тенденции на сегодня" },
  "month.trendsSub":   { en: "Recent months up to today. This section does not change with the month selected above.", az: "Son aylar, bu günə qədər. Bu bölmə yuxarıda seçilən aydan asılı deyil.", ru: "Последние месяцы по сегодняшний день. Этот раздел не зависит от выбранного выше месяца." },
  "cmp.lessSame":   { en: "{amount} less than the same days last month", az: "keçən ayın eyni günləri ilə müqayisədə {amount} az", ru: "на {amount} меньше, чем за те же дни прошлого месяца" },
  "cmp.moreSame":   { en: "{amount} more than the same days last month", az: "keçən ayın eyni günləri ilə müqayisədə {amount} çox", ru: "на {amount} больше, чем за те же дни прошлого месяца" },
  "cmp.lessFull":   { en: "{amount} less than the previous month", az: "əvvəlki ayla müqayisədə {amount} az", ru: "на {amount} меньше, чем в предыдущем месяце" },
  "cmp.moreFull":   { en: "{amount} more than the previous month", az: "əvvəlki ayla müqayisədə {amount} çox", ru: "на {amount} больше, чем в предыдущем месяце" },
  "cmp.titleSame":  { en: "What changed vs the same days last month", az: "Keçən ayın eyni günləri ilə müqayisədə nə dəyişib", ru: "Что изменилось по сравнению с теми же днями прошлого месяца" },
  "cmp.titleFull":  { en: "What changed vs the previous month", az: "Əvvəlki ayla müqayisədə nə dəyişib", ru: "Что изменилось по сравнению с предыдущим месяцем" },
  "cmp.prevSame":   { en: "same days last month: {amount}", az: "keçən ayın eyni günləri: {amount}", ru: "те же дни прошлого месяца: {amount}" },
  "cmp.prevFull":   { en: "previous month: {amount}", az: "əvvəlki ay: {amount}", ru: "предыдущий месяц: {amount}" },
  "cmp.window":     { en: "Days 1–{d} of both months compared", az: "Hər iki ay üzrə ayın 1-dən {d}-dək olan günlər müqayisə edilir.", ru: "Сравниваются дни с 1-го по {d}-е число каждого месяца." },
  "home.income":    { en: "Income", az: "Gəlir", ru: "Доход" },
  "home.spent":     { en: "Spent", az: "Xərclənib", ru: "Потрачено" },
  "home.balance":   { en: "Balance", az: "Balans", ru: "Баланс" },
  "surplus.Surplus":    { en: "Surplus", az: "Qənaət", ru: "Профицит" },
  "surplus.Deficit":    { en: "Deficit", az: "Kəsir", ru: "Дефицит" },
  "surplus.Break-even": { en: "Break-even", az: "Bərabər", ru: "В ноль" },
  "home.dueWithin7": { en: "Due within 7 days", az: "Növbəti 7 gündə ödənilməli", ru: "К оплате в ближайшие 7 дней" },
  "home.emptyTitle": { en: "Nothing recorded yet", az: "Hələ heç nə qeyd olunmayıb", ru: "Пока ничего не записано" },
  "home.emptyBody":  { en: "Tap + to add your first transaction.", az: "İlk əməliyyatı əlavə etmək üçün + düyməsinə toxunun.", ru: "Нажмите +, чтобы добавить первую операцию." },
  "home.emptyBtn":   { en: "Add first transaction", az: "İlk əməliyyatı əlavə et", ru: "Добавить первую операцию" },
  "home.seeAll":     { en: "See all transactions", az: "Bütün əməliyyatlara bax", ru: "Все операции" },
  // Run 16 (DRAFT az/ru, not reviewed by a native speaker): which wallet an entry was paid from or received in.
  // Run 16 (DRAFT az/ru, not reviewed by a native speaker and not legal advice): "How it works" and the privacy notice.
  "more.howSub":     { en: "Four short steps", az: "Dörd qısa addım", ru: "Четыре коротких шага" },
  "more.privacySub": { en: "What the app stores and what leaves your phone", az: "Tətbiq nəyi saxlayır və telefondan nə çıxır", ru: "Что хранит приложение и что покидает телефон" },
  "home.howBtn":     { en: "How it works", az: "Necə işləyir", ru: "Как это работает" },
  "info.how.title":  { en: "How Expense Ledger works", az: "Expense Ledger necə işləyir", ru: "Как работает Expense Ledger" },
  "info.how.1.h":    { en: "Add what you spend", az: "Xərclədiyinizi əlavə edin", ru: "Записывайте траты" },
  "info.how.1.b":    { en: "Tap + and type the amount. Pick a category and how you paid (cash, bank card…). It takes a few seconds, and you can undo it.", az: "+ düyməsinə toxunun və məbləği yazın. Kateqoriya və ödəniş üsulunu (nağd, bank kartı…) seçin. Bir neçə saniyə çəkir və geri qaytara bilərsiniz.", ru: "Нажмите + и введите сумму. Выберите категорию и чем платили (наличные, банковская карта…). Это занимает пару секунд, и запись можно отменить." },
  "info.how.2.h":    { en: "Safe to Spend", az: "Xərcləmək olar", ru: "Можно потратить" },
  "info.how.2.b":    { en: "This is what is left to spend this month after money that is already promised: upcoming bills and the amount you set aside for savings. On Home, tap “How is this calculated?” to see every line.", az: "Bu, bu ay artıq ayrılmış pulun (yaxınlaşan ödənişlər və yığım üçün ayırdığınız məbləğ) çıxılmasından sonra xərcləmək üçün qalan məbləğdir. Ana səhifədə «Bu necə hesablanır?» düyməsinə toxunub hər sətri görün.", ru: "Это то, что остаётся потратить в этом месяце после уже обещанных денег: предстоящих платежей и суммы, которую вы откладываете. На главном экране нажмите «Как это рассчитано?», чтобы увидеть каждую строку." },
  "info.how.3.h":    { en: "Bills and goals", az: "Ödənişlər və məqsədlər", ru: "Платежи и цели" },
  "info.how.3.b":    { en: "Add rent or subscriptions as bills so they are counted before they are due. For a goal with a date, the app shows how much to save each month.", az: "İcarə və ya abunəlikləri ödəniş kimi əlavə edin ki, vaxtı çatmamış hesaba alınsın. Tarixi olan məqsəd üçün tətbiq hər ay nə qədər yığmaq lazım olduğunu göstərir.", ru: "Добавьте аренду или подписки как платежи, чтобы их учитывали заранее. Для цели с датой приложение показывает, сколько откладывать в месяц." },
  "info.how.4.h":    { en: "Your data stays on your phone", az: "Məlumatlarınız telefonda qalır", ru: "Данные остаются на вашем телефоне" },
  "info.how.4.b":    { en: "There is no account and nobody else keeps a copy. Save a backup file (More → Import / Export) to Google Drive, Telegram or e-mail, so you can restore it on a new phone.", az: "Hesab yoxdur və surəti başqası saxlamır. Yeni telefonda bərpa etmək üçün ehtiyat nüsxəni (Digər → İdxal / ixrac) Google Drive-a, Telegram-a və ya e-poçta saxlayın.", ru: "Аккаунта нет, и копию больше никто не хранит. Сохраните резервный файл (Ещё → Импорт и экспорт) в Google Drive, Telegram или на почту, чтобы восстановить данные на новом телефоне." },
  "info.privacy.title": { en: "Privacy", az: "Məxfilik", ru: "Конфиденциальность" },
  "info.privacy.1.h": { en: "What the app stores", az: "Tətbiq nəyi saxlayır", ru: "Что хранит приложение" },
  "info.privacy.1.b": { en: "Your entries, budgets, goals, bills and settings, on this device only, in the app's own storage. The app has no account and no ads, and no analytics of what you enter.", az: "Qeydləriniz, büdcələriniz, məqsədləriniz, ödənişləriniz və ayarlarınız yalnız bu cihazda, tətbiqin öz yaddaşında saxlanılır. Tətbiqdə hesab və reklam yoxdur, daxil etdiyiniz məlumatların analitikası da yoxdur.", ru: "Ваши записи, бюджеты, цели, платежи и настройки хранятся только на этом устройстве, в собственной памяти приложения. В приложении нет аккаунта и рекламы, а также аналитики того, что вы вводите." },
  "info.privacy.2.h": { en: "What leaves your phone", az: "Telefondan nə çıxır", ru: "Что покидает телефон" },
  "info.privacy.2.b": { en: "None of your entries or amounts is sent to us. The app only checks whether a newer version of the website is available and counts visits (see below). Files you export (backup, CSV) go only where you choose to share them, and that service's own rules then apply.", az: "Qeydlərinizdən və məbləğlərdən heç biri bizə göndərilmir. Tətbiq yalnız saytın daha yeni versiyasının olub-olmadığını yoxlayır və ziyarətləri sayır (aşağıya baxın). İxrac etdiyiniz fayllar (ehtiyat nüsxə, CSV) yalnız paylaşmağı seçdiyiniz yerə gedir və orada həmin xidmətin öz qaydaları keçərlidir.", ru: "Ни ваши записи, ни суммы нам не отправляются. Приложение только проверяет, есть ли новая версия сайта, и считает посещения (см. ниже). Файлы, которые вы экспортируете (резервная копия, CSV), попадают только туда, куда вы их отправите, и дальше действуют правила этого сервиса." },
  "info.privacy.3.h": { en: "The website", az: "Sayt", ru: "Сайт" },
  "info.privacy.3.b": { en: "When you open the web version, the site's host (Vercel) may keep ordinary technical logs such as your IP address and the time of the visit. We use Vercel Web Analytics to count visits (page views, country, device type). It uses no cookies and never receives your entries, amounts or any ledger data.", az: "Veb versiyanı açdıqda saytın host-u (Vercel) IP ünvanınız və ziyarət vaxtı kimi adi texniki qeydlər saxlaya bilər. Ziyarətlərin sayını (səhifə baxışları, ölkə, cihaz növü) saymaq üçün Vercel Web Analytics-dən istifadə edirik. O, cookie istifadə etmir və qeydlərinizi, məbləğləri və ya heç bir dəftər məlumatını almır.", ru: "Когда вы открываете веб-версию, хостинг сайта (Vercel) может хранить обычные технические журналы, например IP-адрес и время визита. Мы используем Vercel Web Analytics для подсчёта посещений (просмотры страниц, страна, тип устройства). Он не использует cookie и никогда не получает ваши записи, суммы или другие данные учёта." },
  "info.privacy.4.h": { en: "Your control", az: "Nəzarət sizdədir", ru: "Вы управляете данными" },
  "info.privacy.4.b": { en: "You can export everything at any time. To delete your data, clear the app's data in your phone's settings or uninstall the app. Without a backup file, deleted data cannot be recovered.", az: "İstənilən vaxt hər şeyi ixrac edə bilərsiniz. Məlumatları silmək üçün telefonun ayarlarında tətbiqin məlumatlarını təmizləyin və ya tətbiqi silin. Ehtiyat nüsxə faylı olmadan silinmiş məlumatı bərpa etmək olmaz.", ru: "Вы можете в любой момент экспортировать всё. Чтобы удалить данные, очистите данные приложения в настройках телефона или удалите приложение. Без файла резервной копии удалённые данные восстановить нельзя." },
  "info.privacy.5.h": { en: "Permissions", az: "İcazələr", ru: "Разрешения" },
  "info.privacy.5.b": { en: "The app does not ask you for any permission: no camera, location, contacts or microphone.", az: "Tətbiq sizdən heç bir icazə istəmir: kamera, məkan, kontaktlar və ya mikrofon yoxdur.", ru: "Приложение не запрашивает у вас никаких разрешений: ни камеры, ни геолокации, ни контактов, ни микрофона." },
  "info.privacy.6.h": { en: "Debts, loans and recovery copies", az: "Borclar, kreditlər və bərpa surətləri", ru: "Долги, кредиты и копии для восстановления" },
  "info.privacy.6.b": { en: "Debts and loans are kept on this device too. Before risky changes (an import, a conversion) the app keeps a recovery copy of your data on this device only. If the app crashes, a short error note is kept on this device and is never sent anywhere.", az: "Borclar və kreditlər də bu cihazda saxlanılır. Təhlükəli dəyişikliklərdən (idxal, çevirmə) əvvəl tətbiq məlumatlarınızın bərpa surətini yalnız bu cihazda saxlayır. Tətbiq çökərsə, qısa xəta qeydi bu cihazda saxlanılır və heç yerə göndərilmir.", ru: "Долги и кредиты тоже хранятся на этом устройстве. Перед рискованными изменениями (импорт, преобразование) приложение сохраняет копию ваших данных для восстановления только на этом устройстве. Если приложение вылетает, короткая запись об ошибке хранится на этом устройстве и никуда не отправляется." },
  "info.privacy.7.h": { en: "A shared phone", az: "Ortaq telefon", ru: "Общий телефон" },
  "info.privacy.7.b": { en: "You can switch on an app lock (More → App lock) with a PIN and, on phones that allow it, a fingerprint. Without it, anyone who can open your phone and this app can see your entries. The lock keeps other people out of the app screens, but it does not encrypt your data: the records stay readable in this browser's storage and backup files are not protected by the PIN. “Hide amounts” hides the numbers on screen only.", az: "PIN və telefon icazə verirsə, barmaq izi ilə tətbiq kilidini (Daha çox → Tətbiq kilidi) aça bilərsiniz. Onsuz telefonunuzu və bu tətbiqi aça bilən hər kəs qeydlərinizi görə bilər. Kilid başqalarını tətbiqin ekranlarından kənarda saxlayır, lakin məlumatı şifrələmir: qeydlər bu brauzerin yaddaşında oxuna bilən qalır və ehtiyat nüsxə faylları PIN ilə qorunmur. «Məbləğləri gizlət» yalnız ekrandakı rəqəmləri gizlədir.", ru: "Можно включить блокировку приложения (Ещё → Блокировка приложения) с PIN-кодом и, если телефон позволяет, отпечатком пальца. Без неё любой, кто может открыть ваш телефон и это приложение, увидит ваши записи. Блокировка не пускает посторонних на экраны приложения, но не шифрует данные: записи остаются читаемыми в хранилище этого браузера, а файлы резервных копий PIN-кодом не защищены. «Скрыть суммы» прячет цифры только на экране." },
  "pat.basisMonth": { en: { one: "Based on {n} entry this month", other: "Based on {n} entries this month" }, az: "Bu ayın {n} qeydinə əsaslanır", ru: { one: "На основе {n} записи этого месяца", few: "На основе {n} записей этого месяца", many: "На основе {n} записей этого месяца", other: "На основе {n} записи этого месяца" } },
  "pat.basisWeeks": { en: { one: "Based on {n} entry in the last 8 weeks", other: "Based on {n} entries in the last 8 weeks" }, az: "Son 8 həftənin {n} qeydinə əsaslanır", ru: { one: "На основе {n} записи за последние 8 недель", few: "На основе {n} записей за последние 8 недель", many: "На основе {n} записей за последние 8 недель", other: "На основе {n} записи за последние 8 недель" } },
  "pat.basisTwo":   { en: { one: "Based on {n} entry this month and last month", other: "Based on {n} entries this month and last month" }, az: "Bu ayın və keçən ayın {n} qeydinə əsaslanır", ru: { one: "На основе {n} записи этого и прошлого месяца", few: "На основе {n} записей этого и прошлого месяца", many: "На основе {n} записей этого и прошлого месяца", other: "На основе {n} записи этого и прошлого месяца" } },
  "pat.basisSix":   { en: { one: "Based on {n} entry in the last 6 full months", other: "Based on {n} entries in the last 6 full months" }, az: "Son 6 tam ayın {n} qeydinə əsaslanır", ru: { one: "На основе {n} записи за последние 6 полных месяцев", few: "На основе {n} записей за последние 6 полных месяцев", many: "На основе {n} записей за последние 6 полных месяцев", other: "На основе {n} записи за последние 6 полных месяцев" } },
  // Run 20: headings for the Patterns lines
  "pat.weekend":    { en: "Weekends and weekdays", az: "Həftəsonu və iş günləri", ru: "Выходные и будни" },
  "pat.catconc":    { en: "One category dominates", az: "Bir kateqoriya üstündür", ru: "Одна категория преобладает" },
  "pat.merchant":   { en: "A few places take most of it", az: "Bir neçə yer çoxunu alır", ru: "Несколько мест — большая часть трат" },
  "pat.avgtxn":     { en: "Typical purchase size", az: "Tipik alışın ölçüsü", ru: "Размер типичной покупки" },
  "pat.dayofweek":  { en: "Busy and quiet days", az: "Sıx və sakit günlər", ru: "Загруженные и спокойные дни" },
  "pat.trend":      { en: "Category over time", az: "Kateqoriya zamanla", ru: "Категория во времени" },
  "pat.anomaly":    { en: "Unusually large purchases", az: "Qeyri-adi böyük alışlar", ru: "Необычно крупные покупки" },
  // Run 20 (coach R12): "what if I pay extra now" on a loan card
  "loan.extra":      { en: "What if I pay extra now?", az: "İndi əlavə ödəsəm nə olar?", ru: "Что, если внести дополнительно сейчас?" },
  "loan.extraHint":  { en: "Assumes your regular payment stays the same. Your lender may instead lower the payment or charge a fee for early repayment: check your contract.", az: "Adi ödənişinizin dəyişmədiyi fərz olunur. Kreditor əvəzində ödənişi azalda və ya vaxtından əvvəl ödəniş üçün komissiya tutda bilər: müqaviləni yoxlayın.", ru: "Предполагается, что обычный платёж не меняется. Кредитор может вместо этого снизить платёж или взять комиссию за досрочное погашение: проверьте договор." },
  "loan.extraMonths": { en: { one: "{n} month", other: "{n} months" }, az: "{n} ay", ru: { one: "{n} месяц", few: "{n} месяца", many: "{n} месяцев", other: "{n} месяца" } },
  "loan.extraResult": { en: "An extra {amount} now would end the loan about {months} sooner and save about {interest} in interest.", az: "İndi əlavə {amount} ödəsəniz, kredit təxminən {months} tez bitər və təxminən {interest} faiz qənaət olunar.", ru: "Если внести сейчас дополнительно {amount}, кредит закончится примерно на {months} раньше, а вы сэкономите около {interest} процентов." },
  "loan.extraNoMonths": { en: "An extra {amount} now would not shorten the loan by a whole month, but would save about {interest} in interest.", az: "İndi əlavə {amount} krediti tam bir ay qısaltmaz, lakin təxminən {interest} faiz qənaət edər.", ru: "Дополнительно {amount} сейчас не сократит кредит на целый месяц, но сэкономит около {interest} процентов." },
  "loan.extraNone": { en: "An extra {amount} now would change almost nothing.", az: "İndi əlavə {amount} demək olar ki, heç nəyi dəyişməz.", ru: "Дополнительно {amount} сейчас почти ничего не изменит." },
  "loan.extraClears": { en: "That is the whole remaining balance or more, so the loan would simply be paid off.", az: "Bu, qalan borcun hamısı və ya daha çoxdur, yəni kredit sadəcə bağlanardı.", ru: "Это весь остаток долга или больше, то есть кредит будет просто погашен." },
  // Run 19: app lock. It is a screen lock, NOT encryption; the wording says so wherever it matters.
  "lock.title":      { en: "App lock", az: "Tətbiq kilidi", ru: "Блокировка приложения" },
  "lock.rowSub":     { en: "PIN and fingerprint", az: "PIN və barmaq izi", ru: "PIN-код и отпечаток пальца" },
  "lock.on":         { en: "The lock is on", az: "Kilid aktivdir", ru: "Блокировка включена" },
  "lock.off":        { en: "The lock is off", az: "Kilid söndürülüb", ru: "Блокировка выключена" },
  "lock.notEnc":     { en: "This lock keeps other people out of the app on this phone. It does not encrypt your data: your records stay readable in this browser's storage, and backup files are not protected by the PIN.", az: "Bu kilid başqalarını bu telefondakı tətbiqdən kənarda saxlayır. Məlumatı şifrələmir: qeydləriniz bu brauzerin yaddaşında oxuna bilən qalır və ehtiyat nüsxə faylları PIN ilə qorunmur.", ru: "Эта блокировка не пускает посторонних в приложение на этом телефоне. Она не шифрует данные: записи остаются читаемыми в хранилище этого браузера, а файлы резервных копий PIN-кодом не защищены." },
  "lock.unsupported": { en: "This browser cannot create a PIN lock.", az: "Bu brauzer PIN kilidi yarada bilmir.", ru: "Этот браузер не может создать PIN-блокировку." },
  "lock.pin":        { en: "PIN (4 to 6 digits)", az: "PIN (4–6 rəqəm)", ru: "PIN-код (4–6 цифр)" },
  "lock.pin2":       { en: "Repeat the PIN", az: "PIN-i təkrarlayın", ru: "Повторите PIN-код" },
  "lock.current":    { en: "Current PIN", az: "Cari PIN", ru: "Текущий PIN-код" },
  "lock.newPin":     { en: "New PIN (4 to 6 digits)", az: "Yeni PIN (4–6 rəqəm)", ru: "Новый PIN-код (4–6 цифр)" },
  "lock.set":        { en: "Set the PIN", az: "PIN təyin et", ru: "Задать PIN-код" },
  "lock.change":     { en: "Change the PIN", az: "PIN-i dəyiş", ru: "Сменить PIN-код" },
  "lock.badPin":     { en: "Use 4 to 6 digits.", az: "4–6 rəqəm istifadə edin.", ru: "Введите от 4 до 6 цифр." },
  "lock.mismatch":   { en: "The two PINs are different.", az: "İki PIN fərqlidir.", ru: "Два PIN-кода не совпадают." },
  "lock.currentWrong": { en: "The current PIN is not right.", az: "Cari PIN düzgün deyil.", ru: "Текущий PIN-код неверен." },
  "lock.saveFail":   { en: "Could not save the lock. Nothing was changed.", az: "Kilidi saxlamaq mümkün olmadı. Heç nə dəyişmədi.", ru: "Не удалось сохранить блокировку. Ничего не изменилось." },
  "lock.saved":      { en: "PIN saved. The app will lock as you chose.", az: "PIN saxlanıldı. Tətbiq seçdiyiniz kimi kilidlənəcək.", ru: "PIN-код сохранён. Приложение будет блокироваться, как вы выбрали." },
  "lock.changed":    { en: "PIN changed.", az: "PIN dəyişdirildi.", ru: "PIN-код изменён." },
  "lock.when":       { en: "Lock the app", az: "Tətbiqi kilidlə", ru: "Блокировать приложение" },
  "lock.after0":     { en: "Every time I leave it", az: "Hər dəfə ondan çıxanda", ru: "Каждый раз, когда выхожу" },
  "lock.after1":     { en: "After 1 minute", az: "1 dəqiqədən sonra", ru: "Через 1 минуту" },
  "lock.after5":     { en: "After 5 minutes", az: "5 dəqiqədən sonra", ru: "Через 5 минут" },
  "lock.after15":    { en: "After 15 minutes", az: "15 dəqiqədən sonra", ru: "Через 15 минут" },
  "lock.whenSub":    { en: "Away or not touched for that long. It also locks when you open the app again.", az: "Bu qədər uzaqda olduqda və ya toxunulmadıqda. Tətbiqi yenidən açanda da kilidlənir.", ru: "Если вы так долго вне приложения или не касались экрана. Также блокируется при повторном открытии." },
  "lock.bio":        { en: "Unlock with fingerprint", az: "Barmaq izi ilə aç", ru: "Разблокировать отпечатком" },
  "lock.bioSub":     { en: "Uses the phone's own fingerprint prompt. The PIN still works and is needed if the fingerprint fails.", az: "Telefonun öz barmaq izi sorğusundan istifadə edir. PIN yenə işləyir və barmaq izi alınmasa lazımdır.", ru: "Использует системный запрос отпечатка. PIN-код по-прежнему работает и нужен, если отпечаток не сработает." },
  "lock.bioNo":      { en: "Fingerprint is not available on this device or browser.", az: "Bu cihazda və ya brauzerdə barmaq izi mövcud deyil.", ru: "Отпечаток недоступен на этом устройстве или в браузере." },
  "lock.bioSetupFail": { en: "The fingerprint could not be set up. The PIN lock is unchanged.", az: "Barmaq izi qurulmadı. PIN kilidi dəyişməyib.", ru: "Не удалось настроить отпечаток. PIN-блокировка не изменилась." },
  "lock.now":        { en: "Lock now", az: "İndi kilidlə", ru: "Заблокировать сейчас" },
  "lock.turnOff":    { en: "Turn off the lock", az: "Kilidi söndür", ru: "Выключить блокировку" },
  "lock.turnOffHint": { en: "Enter the current PIN to turn the lock off. Your records are not changed.", az: "Kilidi söndürmək üçün cari PIN-i daxil edin. Qeydləriniz dəyişmir.", ru: "Введите текущий PIN-код, чтобы выключить блокировку. Записи не изменятся." },
  "lock.offDone":    { en: "Lock turned off. Your records were not changed.", az: "Kilid söndürüldü. Qeydləriniz dəyişməyib.", ru: "Блокировка выключена. Записи не изменились." },
  "lock.screenTitle": { en: "Enter your PIN", az: "PIN-i daxil edin", ru: "Введите PIN-код" },
  "lock.screenSub":  { en: "Expense Ledger is locked", az: "Expense Ledger kilidlidir", ru: "Expense Ledger заблокирован" },
  "lock.wrong":      { en: "That PIN is not right.", az: "Bu PIN düzgün deyil.", ru: "Неверный PIN-код." },
  "lock.wait":       { en: "Too many wrong tries. Wait {s} seconds.", az: "Çox səhv cəhd. {s} saniyə gözləyin.", ru: "Слишком много ошибок. Подождите {s} с." },
  "lock.useBio":     { en: "Use fingerprint", az: "Barmaq izindən istifadə et", ru: "Использовать отпечаток" },
  "lock.bioFail":    { en: "The fingerprint did not work. Use your PIN.", az: "Barmaq izi alınmadı. PIN-dən istifadə edin.", ru: "Отпечаток не сработал. Введите PIN-код." },
  "lock.del":        { en: "Delete the last digit", az: "Son rəqəmi sil", ru: "Удалить последнюю цифру" },
  "lock.entered":    { en: "{n} digits entered", az: "{n} rəqəm daxil edilib", ru: "Введено цифр: {n}" },
  "lock.forgot":     { en: "Forgot your PIN?", az: "PIN-i unutmusunuz?", ru: "Забыли PIN-код?" },
  "lock.forgotWait": { en: "You can remove the lock in {s} s", az: "Kilidi {s} san. sonra silə bilərsiniz", ru: "Убрать блокировку можно через {s} с" },
  "cat.allTime": { en: "All time: {total} in {n} entries", az: "Bütün dövr: {n} əməliyyatda {total}", ru: "За всё время: {total} ({n} записей)" },
  "cat.month": { en: "{month}: {total}", az: "{month} üzrə: {total}", ru: "{month}: {total}" },
  "set.currencyPick": { en: "Common currencies", az: "Geniş yayılmış valyutalar", ru: "Частые валюты" },
  "banner.iosNote": { en: "On iPhone, Safari can erase a website's saved data if you don't open it for about a week. Add Expense Ledger to your Home Screen (Share, then Add to Home Screen) and keep a backup file.", az: "iPhone-da Safari təxminən bir həftə açılmayan saytın saxlanmış məlumatlarını silə bilər. Expense Ledger-i Ana ekrana əlavə edin (Paylaş, sonra Ana ekrana əlavə et) və ehtiyat nüsxə faylı saxlayın.", ru: "На iPhone Safari может стереть сохранённые данные сайта, если его не открывать около недели. Добавьте Expense Ledger на экран «Домой» (Поделиться, затем «На экран «Домой»») и храните файл резервной копии." },
  "lock.forgotBioBody": { en: "Confirm with your fingerprint to remove the lock. Your records stay on this phone; you can set a new PIN afterwards.", az: "Kilidi götürmək üçün barmaq izinizlə təsdiq edin. Qeydləriniz bu telefonda qalır; sonra yeni PIN təyin edə bilərsiniz.", ru: "Подтвердите отпечатком пальца, чтобы снять блокировку. Ваши записи останутся на этом телефоне; затем можно задать новый PIN." },
  "lock.forgotBioGo": { en: "Confirm with fingerprint", az: "Barmaq izi ilə təsdiq et", ru: "Подтвердить отпечатком" },
  "lock.forgotDelayBody": { en: "To keep others out, the lock can be removed 24 hours after you ask. Your records stay on this phone; you can set a new PIN afterwards. Opening the app with the right PIN cancels the request.", az: "Başqalarının girişinin qarşısını almaq üçün kilid sorğudan 24 saat sonra götürülə bilər. Qeydləriniz bu telefonda qalır; sonra yeni PIN təyin edə bilərsiniz. Düzgün PIN ilə daxil olmaq sorğunu ləğv edir.", ru: "Чтобы посторонние не вошли, блокировку можно снять через 24 часа после запроса. Ваши записи останутся на этом телефоне; затем можно задать новый PIN. Вход с правильным PIN отменяет запрос." },
  "lock.forgotDelayWait": { en: "Remove the lock in {h} h {m} min", az: "Kilidi {h} saat {m} dəq. sonra silə bilərsiniz", ru: "Убрать блокировку через {h} ч {m} мин" },
  "lock.forgotGo":   { en: "Remove the lock", az: "Kilidi sil", ru: "Убрать блокировку" },
  "lock.back":       { en: "Back to the PIN", az: "PIN-ə qayıt", ru: "Назад к PIN-коду" },
  "lock.damaged":    { en: "The lock settings cannot be read. You can remove the lock; your records are not touched.", az: "Kilid ayarlarını oxumaq mümkün deyil. Kilidi silə bilərsiniz; qeydlərinizə toxunulmur.", ru: "Настройки блокировки не читаются. Можно убрать блокировку; записи не затрагиваются." },
  "more.safeSub":    { en: "What can erase your data, backups, home-screen icon", az: "Məlumatı nə silə bilər, ehtiyat nüsxə, ana ekran ikonu", ru: "Что может стереть данные, резервные копии, значок на экране" },
  "info.safe.title": { en: "Keep your data safe", az: "Məlumatlarınızı qoruyun", ru: "Сбережите свои данные" },
  "info.safe.1.h":   { en: "Your data lives only on this phone", az: "Məlumatlarınız yalnız bu telefondadır", ru: "Ваши данные только на этом телефоне" },
  "info.safe.1.b":   { en: "There is no account and no server copy, so nobody can restore it for you. A backup file is your only safety net.", az: "Hesab və server surəti yoxdur, ona görə də onu sizin üçün heç kim bərpa edə bilməz. Ehtiyat nüsxə faylı yeganə təhlükəsizlik vasitənizdir.", ru: "Аккаунта и копии на сервере нет, поэтому восстановить данные за вас никто не сможет. Файл резервной копии — ваша единственная страховка." },
  "info.safe.2.h":   { en: "What can erase it", az: "Onu nə silə bilər", ru: "Что может их стереть" },
  "info.safe.2.b":   { en: "Clearing the browser's site data or the app's storage, uninstalling the app, a phone reset or losing the phone, a very full phone, and using a private (incognito) window. Moving to a new phone does not copy it by itself.", az: "Brauzerin sayt məlumatlarını və ya tətbiq yaddaşını təmizləmək, tətbiqi silmək, telefonun sıfırlanması və ya itirilməsi, telefonun çox dolu olması və gizli (inkoqnito) pəncərədən istifadə. Yeni telefona keçid özü-özlüyündə məlumatı köçürmür.", ru: "Очистка данных сайта в браузере или хранилища приложения, удаление приложения, сброс или потеря телефона, переполненная память и работа в приватном (инкогнито) окне. При переходе на новый телефон данные сами не переносятся." },
  "info.safe.3.h":   { en: "Save a backup now, and often", az: "Ehtiyat nüsxəni indi və tez-tez saxlayın", ru: "Сохраните копию сейчас и делайте это регулярно" },
  "info.safe.3.b":   { en: "More → Import / Export → save the backup file, then send it to Google Drive, Telegram or your e-mail. Do it after any big change, and at least once a month.", az: "Digər → İdxal / ixrac → ehtiyat nüsxə faylını saxlayın, sonra Google Drive-a, Telegram-a və ya e-poçtunuza göndərin. Hər böyük dəyişiklikdən sonra və ən azı ayda bir dəfə edin.", ru: "Ещё → Импорт и экспорт → сохраните файл резервной копии и отправьте его в Google Drive, Telegram или на почту. Делайте это после любых крупных изменений и не реже раза в месяц." },
  "info.safe.4.h":   { en: "Where do I find the backup file?", az: "Ehtiyat nüsxə faylını harada tapım?", ru: "Где найти файл резервной копии?" },
  "info.safe.4.b":   { en: "The file is called ledger-backup-DATE.json. Android: it usually goes to the Downloads folder: open the Files app → Downloads, or tap the “Downloaded” notice. iPhone: choose “Save to Files” in the share sheet, then look in the Files app (iCloud Drive or On My iPhone). Copy it somewhere else too, such as Google Drive, Telegram Saved Messages or your e-mail: a copy that is only on this phone is lost with the phone. Where exactly the file lands depends on your phone and browser, so check once that you can find it.", az: "Faylın adı ledger-backup-TARİX.json olur. Android: adətən Downloads (Yükləmələr) qovluğuna düşür: Files tətbiqini açın → Downloads və ya «Yükləndi» bildirişinə toxunun. iPhone: paylaşma pəncərəsində «Fayllara saxla» seçin, sonra Files tətbiqində (iCloud Drive və ya iPhone-da) axtarın. Onu başqa yerə də kopyalayın: Google Drive, Telegram-ın «Saxlanmış mesajlar» bölməsi və ya e-poçtunuz. Yalnız bu telefondakı surət telefonla birlikdə itir. Faylın dəqiq düşdüyü yer telefondan və brauzerdən asılıdır, ona görə bir dəfə tapa bildiyinizi yoxlayın.", ru: "Файл называется ledger-backup-ДАТА.json. Android: обычно он попадает в папку «Загрузки»: откройте приложение «Файлы» → «Загрузки» или нажмите на уведомление «Загружено». iPhone: в меню «Поделиться» выберите «Сохранить в Файлы», затем ищите в приложении «Файлы» (iCloud Drive или «На iPhone»). Скопируйте файл ещё и в другое место: Google Диск, «Избранное» в Telegram или почту. Копия только на этом телефоне пропадёт вместе с ним. Куда именно попадёт файл, зависит от телефона и браузера, поэтому один раз проверьте, что можете его найти." },
  "info.safe.5.h":   { en: "Put the app on your home screen", az: "Tətbiqi ana ekrana qoyun", ru: "Добавьте приложение на главный экран" },
  "info.safe.5.b":   { en: "Android (Chrome): menu ⋮ → Install app or Add to Home screen. iPhone (Safari): Share → Add to Home Screen. It then opens like a normal app, in full screen, and works without internet.", az: "Android (Chrome): menyu ⋮ → Tətbiqi quraşdır və ya Ana ekrana əlavə et. iPhone (Safari): Paylaş → Ana ekrana əlavə et. Bundan sonra adi tətbiq kimi, tam ekranda və internetsiz açılır.", ru: "Android (Chrome): меню ⋮ → Установить приложение или Добавить на главный экран. iPhone (Safari): Поделиться → На экран «Домой». Затем оно открывается как обычное приложение, на весь экран и работает без интернета." },
  "info.safe.6.h":   { en: "If something goes wrong", az: "Nəsə səhv gedərsə", ru: "Если что-то пошло не так" },
  "info.safe.6.b":   { en: "Open More → Import / Export and choose your latest backup file. “Merge” adds what is missing; “Replace” swaps everything and can be undone for a few seconds. Do not clear the app's data before you have a backup.", az: "Digər → İdxal / ixrac bölməsini açın və ən son ehtiyat nüsxə faylını seçin. «Birləşdir» çatışmayanları əlavə edir; «Əvəz et» hər şeyi dəyişir və bir neçə saniyə geri qaytarmaq olar. Ehtiyat nüsxə almamış tətbiqin məlumatlarını təmizləməyin.", ru: "Откройте Ещё → Импорт и экспорт и выберите последний файл копии. «Объединить» добавляет недостающее; «Заменить» меняет всё, и это можно отменить в течение нескольких секунд. Не очищайте данные приложения, пока нет резервной копии." },
  "info.privacy.8.h": { en: "Changes", az: "Dəyişikliklər", ru: "Изменения" },
  "info.privacy.8.b": { en: "If this notice changes, the new text appears here, in the app.", az: "Bu bildiriş dəyişərsə, yeni mətn burada, tətbiqin içində görünəcək.", ru: "Если это уведомление изменится, новый текст появится здесь, в приложении." },
  // Run 16 (DRAFT az/ru): the user's own subcategories (suggestions in the picker; entries keep the text).
  "subcat.mine":     { en: "My own", az: "Özümünkü", ru: "Своя" },
  "subcat.ph":       { en: "e.g. Street food", az: "məs. Küçə yeməyi", ru: "напр. Уличная еда" },
  "theme.title":     { en: "Colour theme", az: "Rəng temi", ru: "Цветовая тема" },
  "theme.changed":   { en: "Theme changed", az: "Tema dəyişdi", ru: "Тема изменена" },
  "theme.saveFailed": { en: "Could not save the theme choice on this device", az: "Tema seçimi bu cihazda saxlanıla bilmədi", ru: "Не удалось сохранить выбор темы на этом устройстве" },
  "fx.title":        { en: "Reduce effects", az: "Effektləri azalt", ru: "Меньше эффектов" },
  "fx.sub":          { en: "Turns off shadows and highlights. Layers stay visible through colour and edges.", az: "Kölgələri və işıqlanmanı söndürür. Qatlar rəng və kənarlar vasitəsilə görünməyə davam edir.", ru: "Отключает тени и подсветку. Слои остаются заметны по цвету и границам." },
  "theme.sea":       { en: "Sea glass", az: "Dəniz şüşəsi", ru: "Морское стекло" },
  "theme.nordic":    { en: "Nordic", az: "Şimal", ru: "Север" },
  "theme.mist":      { en: "Mist (light)", az: "Duman (açıq)", ru: "Дымка (светлая)" },
  "theme.dusk":      { en: "Dusk", az: "Qürub", ru: "Сумерки" },
  "theme.sapphire":  { en: "Sapphire", az: "Sapfir", ru: "Сапфир" },
  "theme.cocoa":     { en: "Cocoa", az: "Kakao", ru: "Какао" },
  "subcat.rename":   { en: "Rename \"{name}\"", az: "«{name}» adını dəyiş", ru: "Переименовать «{name}»" },
  "subcat.renamed":  { en: "Renamed, including earlier entries", az: "Adı dəyişdi, əvvəlki qeydlər də daxil", ru: "Переименовано, включая прежние записи" },
  "subcat.remove":   { en: "Remove \"{name}\" from my list", az: "«{name}» siyahımdan sil", ru: "Убрать «{name}» из моего списка" },
  "subcat.saveFailed": { en: "Could not save your list on this device. The entry itself is not affected.", az: "Siyahı bu cihazda saxlanmadı. Qeydin özünə təsir etmir.", ru: "Не удалось сохранить список на этом устройстве. Сама запись не затронута." },
  "subcat.err.empty":    { en: "Type a name first.", az: "Əvvəlcə ad yazın.", ru: "Сначала введите название." },
  "subcat.err.long":     { en: "At most 30 characters.", az: "Ən çoxu 30 simvol.", ru: "Не более 30 символов." },
  "subcat.err.dup":      { en: "That name is already in the list.", az: "Bu ad siyahıda artıq var.", ru: "Такое название уже есть в списке." },
  "subcat.err.full":     { en: "You already have 20 of your own here. Remove one first.", az: "Burada artıq 20 öz siyahınız var. Əvvəlcə birini silin.", ru: "Здесь уже 20 ваших вариантов. Сначала уберите один." },
  "subcat.err.category": { en: "Pick a category first.", az: "Əvvəlcə kateqoriya seçin.", ru: "Сначала выберите категорию." },
  "trip.label":       { en: "Label, trip or group", az: "Etiket, səfər və ya qrup", ru: "Метка, поездка или группа" },
  "trip.placeholder": { en: "e.g. Baku trip, Family, Business", az: "məs. Bakı səfəri, Ailə, Biznes", ru: "напр. Поездка в Баку, Семья, Бизнес" },
  "trip.filterLabel": { en: "Filter by label, trip or group", az: "Etiketə, səfərə və ya qrupa görə süzgəc", ru: "Фильтр по метке, поездке или группе" },
  "trip.filterAll":   { en: "All labels", az: "Bütün etiketlər", ru: "Все метки" },
  "trip.total":       { en: "{name}: {total} spent in {n} entries", az: "{name}: {n} əməliyyatda {total} xərclənib", ru: "{name}: потрачено {total} ({n} записей)" },
  "wallet.label":    { en: "Paid with", az: "Ödəniş üsulu", ru: "Чем оплачено" },
  "wallet.labelIn":  { en: "Received in", az: "Daxil olduğu yer", ru: "Куда поступило" },
  "wallet.cash":     { en: "Cash", az: "Nağd", ru: "Наличные" },
  "wallet.card":     { en: "Bank card", az: "Bank kartı", ru: "Банковская карта" },
  "wallet.mobile":   { en: "Mobile wallet", az: "Mobil pul kisəsi", ru: "Мобильный кошелёк" },
  "wallet.other":    { en: "Other", az: "Digər", ru: "Другое" },
  "wallet.none":     { en: "Not set", az: "Göstərilməyib", ru: "Не указано" },
  "wallet.filterAll": { en: "All wallets", az: "Hamısı", ru: "Все" },
  "wallet.filterLabel": { en: "Filter by wallet", az: "Ödəniş üsuluna görə süzgəc", ru: "Фильтр по способу оплаты" },
  "wallet.analyticsTitle": { en: "Spending by wallet", az: "Ödəniş üsuluna görə xərclər", ru: "Расходы по способу оплаты" },
  "date.tomorrow":   { en: "Tomorrow", az: "Sabah", ru: "Завтра" },
  "date.inDays":     { en: "In {n}d", az: "{n} gün sonra", ru: "Через {n} дн." },
  // Safe to Spend
  "pace.title":         { en: "Spending Pace", az: "Xərcləmə tempi", ru: "Темп расходов" },
  "safe.title":          { en: "Safe to Spend", az: "Xərcləmək olar", ru: "Можно потратить" },
  "safe.perDay":         { en: "{amount}/day · ", az: "gündə {amount} · ", ru: "{amount} в день · " },
  "safe.daysLeft":       { en: { one: "{n} day left in {month} (today included)", other: "{n} days left in {month} (today included)" }, az: "Ayın sonuna {n} gün qalıb (bu gün daxil)", ru: "До конца месяца дней: {n} (включая сегодня)" },
  "safe.incomeReceived": { en: "Income received so far", az: "İndiyədək daxil olan gəlir", ru: "Уже полученный доход" },
  "safe.expectedLater":  { en: "Expected later this month (not counted)", az: "Bu ay daha sonra gözlənilir (hesablanmır)", ru: "Ожидается позже в этом месяце (не учтено)" },
  "safe.goalContributions": { en: "Goal contributions", az: "Məqsədlərə ayırmalar", ru: "Взносы на цели" },
  "safe.savingsTarget":  { en: "Savings target", az: "Yığım hədəfi", ru: "Цель накоплений" },
  "safe.recordedSpend":  { en: "Recorded expenses", az: "Qeydə alınmış xərclər", ru: "Записанные расходы" },
  "safe.laterExpenses":  { en: "of which dated later this month (set aside, not spent yet)", az: "o cümlədən bu ayın sonrakı tarixlərinə yazılan (ayrılıb, hələ xərclənməyib)", ru: "в том числе на более поздние даты месяца (отложено, ещё не потрачено)" },
  "safe.upcoming":       { en: "Upcoming & unrecorded payments", az: "Qarşıdakı və qeydə alınmamış ödənişlər", ru: "Предстоящие и незаписанные платежи" },
  "safe.noneThisMonth":  { en: "none this month", az: "bu ay yoxdur", ru: "в этом месяце нет" },
  "safe.discretionary":  { en: "Discretionary remaining", az: "Sərbəst qalıq", ru: "Свободный остаток" },
  "safe.goalsExceedFloor": { en: "Goal contributions ({goals}) exceed the savings floor ({floor}) — using the higher amount", az: "Məqsədlərə ayırmalar ({goals}) aylıq minimum yığımdan ({floor}) çoxdur — böyük məbləğ götürülür", ru: "Взносы на цели ({goals}) превышают минимум накоплений ({floor}) — учитывается бо́льшая сумма" },
  "safe.noteIncome":     { en: "Counts income received so far (dated today or earlier).", az: "İndiyədək daxil olan gəlir hesablanır (bu gün və ya daha əvvəlki tarixli).", ru: "Учитывается уже полученный доход (с датой не позже сегодняшней)." },
  "safe.noteSchedules":  { en: "Includes {up} upcoming and {un} unrecorded {payments} from {s} recurring {schedules}.", az: "{s} təkrarlanan cədvəldən {up} qarşıdakı və {un} qeydə alınmamış ödəniş daxildir.", ru: "Учтены платежи из регулярных графиков ({s}): предстоящие — {up}, незаписанные — {un}." },
  "safe.noteBalance": { en: "Your accounts hold {held} in total, less than this figure. Safe to Spend counts this month's recorded income and spending, not account balances; entries with no account are in no balance.", az: "Hesablarınızda cəmi {held} var, bu rəqəmdən azdır. «Xərcləmək olar» məbləği hesab qalıqlarını yox, bu ayın qeydə alınmış gəlir və xərclərini sayır; hesabı olmayan qeydlər heç bir qalığa daxil deyil.", ru: "На ваших счетах всего {held}, это меньше указанной суммы. «Можно потратить» считает записанные доходы и расходы этого месяца, а не остатки на счетах; записи без счёта не входят ни в один остаток." },
  "safe.noteNoRecurring": { en: "No recurring payments are set up, so upcoming bills are not included.", az: "Təkrarlanan ödənişlər qurulmayıb, ona görə qarşıdakı hesablar nəzərə alınmayıb.", ru: "Регулярные платежи не настроены, поэтому предстоящие счета не учтены." },
  "safe.waiting":        { en: "Safe to Spend appears once this month's income has arrived (income dated today or earlier).", az: "«Xərcləmək olar» bu ayın gəliri daxil olduqdan sonra görünəcək (bu gün və ya daha əvvəlki tarixli gəlir).", ru: "«Можно потратить» появится, когда поступит доход за этот месяц (с датой не позже сегодняшней)." },
  "safe.waitingExpected": { en: "{amount} is expected later this month.", az: "Bu ay daha sonra {amount} gözlənilir.", ru: "Позже в этом месяце ожидается {amount}." },
  "unit.payments":       { en: { one: "payment", other: "payments" }, az: "ödəniş", ru: "платежей" },
  "unit.schedules":      { en: { one: "schedule", other: "schedules" }, az: "cədvəl", ru: "графиков" },
  // Goals, budgets, what changed, pace
  "goals.title":        { en: "Goals", az: "Məqsədlər", ru: "Цели" },
  "goals.savedOf":      { en: "{saved} of {target}", az: "{target} məbləğdən {saved}", ru: "{saved} из {target}" },
  "goals.completed":    { en: "Completed", az: "Tamamlandı", ru: "Выполнено" },
  "goals.toGo":         { en: "{amount} to go", az: "{amount} qalıb", ru: "Осталось {amount}" },
  "goals.overdueDays":  { en: { one: "Target date passed {n} day ago", other: "Target date passed {n} days ago" }, az: "Hədəf tarixi {n} gün əvvəl keçib", ru: "Срок истёк {n} дн. назад" },
  // Run 15 (DRAFT az/ru, not reviewed by a native speaker): the required monthly amount and the optional what-if.
  "goals.needMain":     { en: "Save {amount} a month", az: "Ayda {amount} yığın", ru: "Откладывайте {amount} в месяц" },
  "goals.needThisMonth": { en: "Save {amount} before {date}", az: "{date} tarixinədək {amount} yığın", ru: "Отложите {amount} до {date}" },
  "goals.needSub":      { en: { one: "{n} monthly saving until {date}, counted on the 1st of each month", other: "{n} monthly savings until {date}, counted on the 1st of each month" }, az: "{date} tarixinədək, hər ayın 1-i sayılmaqla {n} aylıq yığım", ru: { one: "{n} ежемесячный взнос до {date}, считая 1-е число каждого месяца", few: "{n} ежемесячных взноса до {date}, считая 1-е число каждого месяца", many: "{n} ежемесячных взносов до {date}, считая 1-е число каждого месяца", other: "{n} ежемесячного взноса до {date}, считая 1-е число каждого месяца" } },
  "goals.needNote":     { en: "A plan, not an automatic transfer. Nothing is moved for you.", az: "Bu plandır, avtomatik köçürmə deyil. Sizin yerinizə heç nə köçürülmür.", ru: "Это план, а не автоматический перевод. Деньги сами не переводятся." },
  "goals.needNoDate":   { en: "Set a target date to see how much to save each month.", az: "Hər ay nə qədər yığmaq lazım olduğunu görmək üçün hədəf tarixi təyin edin.", ru: "Укажите срок цели, чтобы увидеть, сколько откладывать в месяц." },
  "goals.needOverdue":  { en: "The target date has passed. {amount} still to go.", az: "Hədəf tarixi keçib. {amount} qalıb.", ru: "Срок прошёл. Осталось {amount}." },
  "goals.scenarioTitle": { en: "Try a different monthly amount", az: "Başqa aylıq məbləği sınayın", ru: "Попробовать другую сумму в месяц" },
  "goals.scenarioLabel": { en: "Amount per month", az: "Aylıq məbləğ", ru: "Сумма в месяц" },
  "goals.scenarioResult": { en: "At {amount} a month you would finish in {date} ({months}).", az: "Ayda {amount} ilə {date} tarixində tamamlayarsınız ({months}).", ru: "При {amount} в месяц цель будет достигнута: {date} ({months})." },
  "goals.scenarioMeets": { en: "This reaches the target date.", az: "Bu, hədəf tarixinə çatır.", ru: "Это укладывается в срок." },
  "goals.scenarioMisses": { en: "This is after the target date.", az: "Bu, hədəf tarixindən sonradır.", ru: "Это позже срока." },
  "goals.scenarioEstimate": { en: "An estimate, not a guarantee.", az: "Təxmindir, zəmanət deyil.", ru: "Оценка, а не гарантия." },
  "budgets.title":      { en: "Budgets", az: "Büdcələr", ru: "Бюджеты" },
  "budgets.over":       { en: "{amount} over limit", az: "Limit {amount} keçilib", ru: "Лимит превышен на {amount}" },
  "budgets.remaining":  { en: "{amount} remaining", az: "{amount} qalıb", ru: "Осталось {amount}" },
  "wc.recurring":       { en: "recurring", az: "təkrarlanan", ru: "регулярный" },
  "wc.tagHelp":         { en: "“Recurring” means the payment repeats on a schedule (rent, subscriptions). “One-off” means it was a single purchase that does not repeat.", az: "«Təkrarlanan» ödəniş cədvəl üzrə təkrarlanır (kirayə, abunə). «Birdəfəlik» təkrarlanmayan tək alışdır.", ru: "«Регулярный» платёж повторяется по расписанию (аренда, подписки). «Разовый» — это отдельная покупка, которая не повторяется." },
  "wc.oneOff":         { en: "one-off", az: "birdəfəlik", ru: "разовый" },

  // ── Ledger
  "ledger.emptyTitle":   { en: "Ledger is empty", az: "Əməliyyat siyahısı boşdur", ru: "Список операций пуст" },
  "ledger.emptyBody":    { en: "Start recording to build your transaction history.", az: "Əməliyyat tarixçənizi yaratmaq üçün qeyd etməyə başlayın.", ru: "Начните записывать операции, чтобы сформировать историю." },
  "ledger.emptyBtn":     { en: "Add first entry", az: "İlk qeydi əlavə et", ru: "Добавить первую запись" },
  "ledger.countOf":      { en: "{shown} of {total}", az: "{total} əməliyyatdan {shown}", ru: "{shown} из {total}" },
  "ledger.searchPh":     { en: "Search merchant, note, amount…", az: "Satıcı, qeyd, məbləğ üzrə axtar…", ru: "Поиск по продавцу, заметке, сумме…" },
  "ledger.search":       { en: "Search", az: "Axtar", ru: "Поиск" },
  "ledger.type.all":     { en: "All", az: "Hamısı", ru: "Все" },
  "ledger.type.expense": { en: "Expenses", az: "Xərclər", ru: "Расходы" },
  "ledger.type.income":  { en: "Income", az: "Gəlir", ru: "Доходы" },
  "ledger.category":     { en: "Category", az: "Kateqoriya", ru: "Категория" },
  "ledger.date":         { en: "Date", az: "Tarix", ru: "Дата" },
  "ledger.clear":        { en: "Clear", az: "Təmizlə", ru: "Сбросить" },
  "ledger.from":         { en: "From", az: "Başlanğıc", ru: "С" },
  "ledger.to":           { en: "To", az: "Son", ru: "По" },
  "ledger.noResults":    { en: "No results", az: "Nəticə tapılmadı", ru: "Ничего не найдено" },
  "ledger.noResultsBody": { en: "Try adjusting your search or clearing filters.", az: "Axtarışı dəyişin və ya filtrləri təmizləyin.", ru: "Измените запрос или сбросьте фильтры." },
  "ledger.filterTitle":  { en: "Filter by Category", az: "Kateqoriya üzrə filtrlə", ru: "Фильтр по категории" },
  "ledger.allCategories": { en: "All Categories", az: "Bütün kateqoriyalar", ru: "Все категории" },
  "common.selected":     { en: "Selected", az: "Seçilib", ru: "Выбрано" },
  "freq.weekly":   { en: "weekly", az: "həftəlik", ru: "еженедельно" },
  "freq.biweekly": { en: "every 2 weeks", az: "2 həftədən bir", ru: "раз в 2 недели" },
  "freq.monthly":  { en: "monthly", az: "aylıq", ru: "ежемесячно" },
  "freq.yearly":   { en: "yearly", az: "illik", ru: "ежегодно" },

  // ── Analytics
  "an.forecast":       { en: "Expected by month end", az: "Ay sonuna gözlənilən", ru: "Ожидается к концу месяца" },
  "an.forecastRange":  { en: "Likely between {low} and {high}", az: "Çox güman ki, {low} ilə {high} arasında", ru: "Скорее всего от {low} до {high}" },
  "an.forecastSingle": { en: "One estimate only: there is not yet enough past data to show a range.", az: "Yalnız bir təxmin: aralıq göstərmək üçün hələ kifayət qədər keçmiş məlumat yoxdur.", ru: "Только одна оценка: прошлых данных пока недостаточно, чтобы показать диапазон." },
  "an.forecastHow":    { en: "Spent so far, plus entries already dated later this month, plus bills still to pay, plus the days left at your usual {daily} a day.", az: "Proqnoza indiyədək xərclənən məbləğ, bu ayın sonrakı tarixlərinə yazılmış qeydlər, ödənilməmiş hesablar və ayın qalan günləri üçün gündəlik adi xərciniz ({daily}) daxildir.", ru: "В прогноз входят уже понесённые расходы, записи на более поздние даты этого месяца, неоплаченные счета и обычные расходы за оставшиеся дни ({daily} в день)." },
  "an.forecastNeed":   { en: "Record about a week of spending to see a month-end forecast.", az: "Ay sonu proqnozunu görmək üçün təxminən bir həftəlik xərc qeyd edin.", ru: "Запишите расходы примерно за неделю, чтобы увидеть прогноз на конец месяца." },
  "an.totalSpending": { en: "Total spending", az: "Ümumi xərclər", ru: "Все расходы" },
  "an.vs":           { en: "{a} vs {b}", az: "{a} / {b}", ru: "{a} против {b}" },
  "an.transactions": { en: "Transactions", az: "Əməliyyatlar", ru: "Операции" },
  "an.avgPerTxn":    { en: "Avg per txn", az: "Orta əməliyyat", ru: "Средняя операция" },
  "an.median":       { en: "Median", az: "Median", ru: "Медиана" },
  "an.perDayTitle":  { en: "Average spending per day, counting only the days of this month so far", az: "Gündəlik orta xərc — yalnız bu ayın keçən günləri nəzərə alınır", ru: "Средние расходы в день — учитываются только прошедшие дни этого месяца" },
  "an.perDay.null":    { en: "Per day: too early to compare", az: "Gündəlik: müqayisə üçün tezdir", ru: "В день: сравнивать рано" },
  "an.perDay.same":    { en: "Per day, weekdays = weekends", az: "Gündəlik: iş günləri = həftəsonu", ru: "В день: будни = выходные" },
  "an.perDay.weekend": { en: "Per weekend day (higher)", az: "Həftəsonu günü (daha çox)", ru: "В выходной день (больше)" },
  "an.perDay.weekday": { en: "Per weekday (higher)", az: "İş günü (daha çox)", ru: "В будний день (больше)" },
  "an.patterns":     { en: "Patterns & Insights", az: "Qanunauyğunluqlar və müşahidələr", ru: "Закономерности и выводы" },
  "an.byDay":        { en: "Typical Purchase by Day of Week — {month}", az: "Həftənin günləri üzrə tipik əməliyyat — {month}", ru: "Типичная покупка по дням недели — {month}" },
  "an.byDaySub":     { en: "Median amount per transaction, and the number of transactions", az: "Bir əməliyyatın median məbləği və əməliyyatların sayı", ru: "Медианная сумма операции и число операций" },
  "an.unusual":      { en: "Unusual Transactions This Month", az: "Bu ayın qeyri-adi əməliyyatları", ru: "Необычные операции в этом месяце" },
  "an.together":     { en: "Often Appear Together", az: "Tez-tez birlikdə olanlar", ru: "Часто встречаются вместе" },
  "an.togetherSub":  { en: "Categories recorded on the same day this month", az: "Bu ay eyni gündə qeyd olunan kateqoriyalar", ru: "Категории, записанные в один день в этом месяце" },
  "an.ofDays":       { en: "{pct}% of days", az: "günlərin {pct}%-i", ru: "{pct}% дней" },
  "an.budgetStatus": { en: "Budget Status — {month}", az: "Büdcə vəziyyəti — {month}", ru: "Состояние бюджета — {month}" },
  "an.pctUsed":      { en: "{pct}% used", az: "{pct}% istifadə olunub", ru: "использовано {pct}%" },
  "an.exceeded":     { en: "exceeded", az: "keçilib", ru: "превышен" },
  "an.daysLeft":     { en: "{n}d left", az: "{n} gün qalıb", ru: "осталось {n} дн." },
  "an.aheadOfPace":  { en: "Spending pace is ahead of budget pace", az: "Xərcləmə tempi büdcə tempindən qabaqdadır", ru: "Расходы опережают темп бюджета" },
  "an.byCategory":   { en: "By Category", az: "Kateqoriyalar üzrə", ru: "По категориям" },
  "an.sixMonth":     { en: "Last 6 months: spending and income", az: "Son 6 ay: xərc və gəlir", ru: "Последние 6 месяцев: расходы и доходы" },
  "an.sixMonthAvg":  { en: "Average monthly spending (earlier months):", az: "Aylıq orta xərc (əvvəlki aylar):", ru: "Средние расходы за месяц (прошлые месяцы):" },
  "an.calendar":     { en: "Spending by day", az: "Günlər üzrə xərclər", ru: "Расходы по дням" },
  "an.calendarHint": { en: "Tap a day to see what you spent.", az: "Həmin gün nə xərclədiyinizi görmək üçün günə toxunun.", ru: "Нажмите на день, чтобы увидеть расходы." },
  "an.noSpending":   { en: "No spending", az: "Xərc yoxdur", ru: "Расходов нет" },
  "an.less":         { en: "Less", az: "Az", ru: "Меньше" },
  "an.moreTap":      { en: "More · tap for details", az: "Çox · ətraflı üçün toxunun", ru: "Больше · нажмите для подробностей" },

  // ── Recurring
  "rec.title":         { en: "Recurring payments", az: "Təkrarlanan ödənişlər", ru: "Регулярные платежи" },
  "rec.emptyTitle":    { en: "No recurring payments", az: "Təkrarlanan ödəniş yoxdur", ru: "Регулярных платежей нет" },
  "rec.emptyBody":     { en: "Mark a transaction as recurring when you add it — rent, gym, subscriptions. Entries for the same payment are grouped into one schedule.", az: "Əməliyyatı əlavə edərkən onu təkrarlanan kimi qeyd edin — icarə, idman zalı, abunəliklər. Eyni ödənişin qeydləri bir cədvəldə qruplaşdırılır.", ru: "Отмечайте операцию как регулярную при добавлении — аренда, спортзал, подписки. Записи одного и того же платежа объединяются в один график." },
  "rec.intro":         { en: "Each row is one schedule. Monthly figures are estimates (weekly ×4.33, every two weeks ×2.17); Safe to Spend uses the payments actually still to come this month.", az: "Hər sətir bir cədvəldir. Aylıq rəqəmlər təxminidir (həftəlik ×4,33, iki həftədən bir ×2,17); «Xərcləmək olar» bu ay hələ qarşıda olan faktiki ödənişləri nəzərə alır.", ru: "Каждая строка — один график. Месячные суммы приблизительные (еженедельно ×4,33, раз в 2 недели ×2,17); «Можно потратить» учитывает платежи, которые действительно ещё предстоят в этом месяце." },
  "rec.monthlyOut":    { en: "Typical monthly outgoing", az: "Tipik aylıq ödənişlər", ru: "Обычно в месяц уходит" },
  "rec.yearly":        { en: "Typical yearly", az: "Tipik illik məbləğ", ru: "Обычно за год" },
  "rec.monthlyIn":     { en: "Typical monthly income", az: "Tipik aylıq gəlir", ru: "Обычный доход в месяц" },
  "rec.activeSchedules": { en: "Active schedules", az: "Aktiv ödəniş cədvəlləri", ru: "Активные графики" },
  "rec.active":        { en: "Active", az: "Aktiv", ru: "Активные" },
  "rec.paused":        { en: "Paused", az: "Dayandırılıb", ru: "Приостановлено" },
  "rec.recordPayment": { en: "Record payment", az: "Ödənişi qeyd et", ru: "Записать платёж" },
  "rec.recordIncome":  { en: "Record receipt", az: "Daxilolmanı qeyd et", ru: "Записать поступление" },
  "rec.recordHint":    { en: "Paid one of these? Tap “Record payment” so it counts as paid. An ordinary expense with the same name is not linked to the bill, and the bill would still be set aside in Safe to Spend.", az: "Bunlardan birini ödədiniz? Ödənilmiş sayılması üçün «Ödənişi qeyd et» düyməsinə toxunun. Eyni adlı adi xərc bu ödənişlə əlaqələndirilmir və o, «Xərcləmək olar» hesabında yenə ayrılmış qalır.", ru: "Оплатили что-то из этого? Нажмите «Записать платёж», чтобы платёж считался оплаченным. Обычный расход с тем же названием с ним не связывается, и сумма по-прежнему будет зарезервирована в «Можно потратить»." },
  "rec.pause":         { en: "Pause", az: "Dayandır", ru: "Приостановить" },
  "rec.reactivate":    { en: "Reactivate", az: "Bərpa et", ru: "Возобновить" },
  "rec.noDate":        { en: "No upcoming date", az: "Yaxın tarix yoxdur", ru: "Ближайшей даты нет" },
  "rec.dueToday":      { en: "Due today", az: "Bu gün ödənilməlidir", ru: "Оплата сегодня" },
  "rec.dueTomorrow":   { en: "Due tomorrow", az: "Sabah ödənilməlidir", ru: "Оплата завтра" },
  "rec.dueInDays":     { en: { one: "Due in {n} day", other: "Due in {n} days" }, az: "{n} gün sonra ödənilməlidir", ru: { one: "Оплата через {n} день", few: "Оплата через {n} дня", many: "Оплата через {n} дней", other: "Оплата через {n} дня" } },
  "rec.dueOn":         { en: "Due {date}", az: "Ödəniş tarixi: {date}", ru: "Оплата {date}" },
  "rec.paymentsRecorded": { en: { one: "{n} payment recorded", other: "{n} payments recorded" }, az: "{n} ödəniş qeydə alınıb", ru: { one: "записан {n} платёж", few: "записано {n} платежа", many: "записано {n} платежей", other: "записано {n} платежа" } },
  "rec.last":          { en: "last {date}", az: "sonuncu: {date}", ru: "последний: {date}" },
  "rec.notRecorded":   { en: "{n} not recorded this month", az: "bu ay {n} ödəniş qeydə alınmayıb", ru: "не записано в этом месяце: {n}" },
  "rec.perMonthApprox": { en: "≈{amount}/mo", az: "ayda ≈{amount}", ru: "≈{amount}/мес." },
  "rec.yearlyByCat":   { en: "Typical Yearly Cost by Category", az: "Kateqoriyalar üzrə tipik illik xərc", ru: "Обычные годовые расходы по категориям" },

  // ── Add / edit transaction
  "add.titleNew":     { en: "New Transaction", az: "Yeni əməliyyat", ru: "Новая операция" },
  "add.titleEdit":    { en: "Edit Transaction", az: "Əməliyyatı redaktə et", ru: "Изменить операцию" },
  "add.expense":      { en: "Expense", az: "Xərc", ru: "Расход" },
  "add.income":       { en: "Income", az: "Gəlir", ru: "Доход" },
  "add.amount":       { en: "Amount", az: "Məbləğ", ru: "Сумма" },
  "add.errAmount":    { en: "Please enter a valid amount", az: "Düzgün məbləğ daxil edin", ru: "Введите корректную сумму" },
  "add.errDate":      { en: "Please choose a valid date", az: "Düzgün tarix seçin", ru: "Выберите корректную дату" },
  "add.dupe":         { en: "Similar transaction recorded recently — double entry?", az: "Bənzər əməliyyat bu yaxınlarda qeyd olunub — təkrar qeyd deyil ki?", ru: "Похожая операция недавно уже записана — не дубликат ли это?" },
  "add.quickFill":    { en: "Quick fill", az: "Sürətli seçim", ru: "Быстрое заполнение" },
  "add.optional":     { en: "optional", az: "istəyə görə", ru: "необязательно" },
  "add.merchant":     { en: "Merchant", az: "Satıcı / xidmət", ru: "Продавец" },
  "add.discardTitle": { en: "This entry isn't saved", az: "Bu qeyd yadda saxlanmayıb", ru: "Запись не сохранена" },
  "add.discardBody":  { en: "If you close now, what you've entered will be lost.", az: "İndi bağlasanız, daxil etdikləriniz itəcək.", ru: "Если закрыть сейчас, введённые данные пропадут." },
  "add.keepEditing":  { en: "Keep editing", az: "Davam et", ru: "Продолжить" },
  "add.discard":      { en: "Close without saving", az: "Yadda saxlamadan bağla", ru: "Закрыть без сохранения" },
  "add.merchantPh":   { en: "e.g., BakuBus, Bravo, Spotify", az: "məs., BakuBus, Bravo, Spotify", ru: "напр., BakuBus, Bravo, Spotify" },
  "add.hintUsually":  { en: "Usually {amount}", az: "Adətən {amount}", ru: "Обычно {amount}" },
  "add.hintDay":      { en: "typically {day}", az: "adətən {day}", ru: "обычно {day}" },
  "add.hintNext":     { en: "next ~{date}", az: "növbəti ~{date}", ru: "следующий ~{date}" },
  "add.usedTimes":    { en: "used {n}×", az: "{n} dəfə istifadə olunub", ru: "использовано {n} раз" },
  "add.category":     { en: "Category", az: "Kateqoriya", ru: "Категория" },
  "add.subcategory":  { en: "Subcategory", az: "Alt kateqoriya", ru: "Подкатегория" },
  "add.note":         { en: "Note", az: "Qeyd", ru: "Заметка" },
  "add.notePh":       { en: "Additional detail", az: "Əlavə məlumat", ru: "Дополнительные сведения" },
  "add.date":         { en: "Date", az: "Tarix", ru: "Дата" },
  "add.recurring":    { en: "Recurring", az: "Təkrarlanan", ru: "Регулярный" },
  "add.frequency":    { en: "How often", az: "Nə qədər tez-tez", ru: "Как часто" },
  "freqCap.weekly":   { en: "Weekly", az: "Həftəlik", ru: "Еженедельно" },
  "freqCap.biweekly": { en: "Biweekly", az: "2 həftədən bir", ru: "Раз в 2 недели" },
  "freqCap.monthly":  { en: "Monthly", az: "Aylıq", ru: "Ежемесячно" },
  "freqCap.yearly":   { en: "Yearly", az: "İllik", ru: "Ежегодно" },
  "add.saveChanges":  { en: "Save Changes", az: "Dəyişiklikləri yadda saxla", ru: "Сохранить изменения" },
  "add.recordExpense": { en: "Record Expense", az: "Xərci qeyd et", ru: "Записать расход" },
  "add.recordIncome": { en: "Record Income", az: "Gəliri qeyd et", ru: "Записать доход" },

  // ── Transaction detail and merchant profile
  "common.yes":     { en: "Yes", az: "Bəli", ru: "Да" },
  "common.no":      { en: "No", az: "Xeyr", ru: "Нет" },
  "detail.duplicate": { en: "Duplicate", az: "Surətini çıxar", ru: "Дублировать" },
  "mp.title":       { en: "Merchant Profile", az: "Satıcı profili", ru: "Профиль продавца" },
  "mp.visits":      { en: "Visits", az: "Ziyarətlər", ru: "Визиты" },
  "mp.avgSpend":    { en: "Avg spend", az: "Orta xərc", ru: "Средний чек" },
  "mp.total":       { en: "Total", az: "Cəmi", ru: "Всего" },
  "mp.frequency":   { en: "Visit frequency", az: "Ziyarət tezliyi", ru: "Частота визитов" },
  "mp.everyDays":   { en: "every ~{n} days", az: "təxminən hər {n} gündən bir", ru: "примерно раз в {n} дн." },
  "mp.typicalDay":  { en: "Typical day", az: "Adi gün", ru: "Обычный день" },
  "mp.usuallyFor":  { en: "Usually for", az: "Adətən", ru: "Обычно на" },
  "mp.consistent":  { en: "Consistent (±15%)", az: "Sabit (±15%)", ru: "Стабильная (±15%)" },
  "mp.trend":       { en: "Trend", az: "Tendensiya", ru: "Тенденция" },
  "mp.increasing":  { en: "↑ Increasing", az: "↑ Artır", ru: "↑ Растёт" },
  "mp.decreasing":  { en: "↓ Decreasing", az: "↓ Azalır", ru: "↓ Снижается" },
  "mp.nextVisit":   { en: "Est. next visit", az: "Təxmini növbəti ziyarət", ru: "Ожидаемый следующий визит" },
  "mp.pattern":     { en: "Detected pattern", az: "Aşkarlanan qanunauyğunluq", ru: "Обнаруженная периодичность" },
  "mp.last30":      { en: "Last 30 days", az: "Son 30 gün", ru: "Последние 30 дней" },
  "mp.vsPrev":      { en: "{amount} vs prev", az: "əvvəlki ilə fərq {amount}", ru: "{amount} к предыдущим" },

  // ── Settings
  "set.overview":      { en: "Overview", az: "İcmal", ru: "Обзор" },
  "set.totalIncome":   { en: "Total income", az: "Ümumi gəlir", ru: "Всего доходов" },
  "set.totalExpenses": { en: "Total expenses", az: "Ümumi xərclər", ru: "Всего расходов" },
  "set.safeEnable":    { en: "Enable Safe to Spend", az: "«Xərcləmək olar»-ı aktivləşdir", ru: "Включить «Можно потратить»" },
  "set.safeEnableSub": { en: "Shows discretionary budget on Dashboard", az: "Ana səhifədə sərbəst büdcəni göstərir", ru: "Показывает свободный бюджет на главном экране" },
  "set.floor":         { en: "Monthly savings floor", az: "Aylıq minimum yığım", ru: "Минимум накоплений в месяц" },
  "set.floorSub":      { en: "Minimum reserved from income — if your goal contributions exceed this, the higher amount is used automatically", az: "Gəlirdən ayrılan minimum məbləğ — məqsədlərə ayırmalar bundan çox olarsa, avtomatik olaraq böyük məbləğ götürülür", ru: "Минимум, который откладывается из дохода. Если взносы на цели больше, автоматически учитывается бо́льшая сумма" },
  "set.zeroOrMore":    { en: "Enter a number, 0 or more", az: "0 və ya daha böyük ədəd daxil edin", ru: "Введите число от 0 и больше" },
  "set.saved":         { en: "Saved", az: "Yadda saxlanıldı", ru: "Сохранено" },
  "set.currency":      { en: "Currency symbol", az: "Valyuta işarəsi", ru: "Символ валюты" },
  "set.currencySub":   { en: "Display only — amounts are not converted. Currently: {currency}", az: "Yalnız göstərmək üçündür — məbləğlər çevrilmir. Hazırda: {currency}", ru: "Только для отображения — суммы не пересчитываются. Сейчас: {currency}" },
  "set.currencyEmpty": { en: "Enter a currency symbol", az: "Valyuta işarəsini daxil edin", ru: "Введите символ валюты" },
  "set.currencyUpdated": { en: "Currency updated", az: "Valyuta yeniləndi", ru: "Валюта обновлена" },
  "set.templates":     { en: "Quick-Add Templates", az: "Sürətli əlavə şablonları", ru: "Шаблоны быстрого добавления" },
  "set.add":           { en: "+ Add", az: "+ Əlavə et", ru: "+ Добавить" },
  "set.name":          { en: "Name", az: "Ad", ru: "Название" },
  "set.tplNamePh":     { en: "Coffee", az: "Qəhvə", ru: "Кофе" },
  "set.optionalPh":    { en: "Optional", az: "İstəyə görə", ru: "Необязательно" },
  "set.noteOptional":  { en: "Note (optional)", az: "Qeyd (istəyə görə)", ru: "Заметка (необязательно)" },
  "set.tplNotePh":     { en: "Pre-filled note", az: "Əvvəlcədən doldurulmuş qeyd", ru: "Заметка по умолчанию" },
  "set.saveTemplate":  { en: "Save Template", az: "Şablonu yadda saxla", ru: "Сохранить шаблон" },
  "set.noTemplates":   { en: "No templates yet.", az: "Hələ şablon yoxdur.", ru: "Шаблонов пока нет." },
  "set.tplInvalid":    { en: "Name and a positive amount required", az: "Ad və müsbət məbləğ tələb olunur", ru: "Нужны название и положительная сумма" },
  "set.deleteTemplate": { en: "Delete template {name}", az: "{name} şablonunu sil", ru: "Удалить шаблон «{name}»" },
  "set.set":           { en: "Set", az: "Təyin et", ru: "Задать" },
  "set.monthlyLimit":  { en: "Monthly limit", az: "Aylıq limit", ru: "Лимит в месяц" },
  "set.budgetSaved":   { en: "Budget saved", az: "Büdcə yadda saxlanıldı", ru: "Бюджет сохранён" },
  "set.financialGoals": { en: "Financial Goals", az: "Maliyyə məqsədləri", ru: "Финансовые цели" },
  "set.goalName":      { en: "Goal name", az: "Məqsədin adı", ru: "Название цели" },
  "set.goalNamePh":    { en: "e.g., Master's degree, Emergency Fund", az: "məs., magistratura, ehtiyat fondu", ru: "напр., магистратура, резервный фонд" },
  "set.target":        { en: "Target ({currency})", az: "Hədəf məbləğ ({currency})", ru: "Цель ({currency})" },
  "set.savedSoFar":    { en: "Saved so far", az: "Yığılmış məbləğ", ru: "Уже накоплено" },
  "set.monthlyContribution": { en: "Monthly contribution", az: "Aylıq yığım", ru: "Взнос в месяц" },
  "set.targetDate":    { en: "Target date", az: "Hədəf tarixi", ru: "Срок" },
  "set.saveGoal":      { en: "Save Goal", az: "Məqsədi yadda saxla", ru: "Сохранить цель" },
  "set.noGoals":       { en: "No goals yet.", az: "Hələ məqsəd yoxdur.", ru: "Целей пока нет." },
  "set.goalInvalidTarget":  { en: "Name and a positive target required", az: "Ad və müsbət hədəf məbləğ tələb olunur", ru: "Нужны название и положительная сумма цели" },
  "set.goalInvalidAmounts": { en: "Saved and monthly amounts must be numbers, 0 or more", az: "Yığılmış və aylıq məbləğlər 0 və ya daha böyük ədəd olmalıdır", ru: "Накопленная сумма и взнос должны быть числами от 0 и больше" },
  "set.goalInvalidDate":    { en: "Target date is not valid", az: "Hədəf tarixi yanlışdır", ru: "Некорректный срок" },
  "set.targetToday":   { en: "Target date is today", az: "Hədəf tarixi bu gündür", ru: "Срок — сегодня" },
  "set.daysToTarget":  { en: { one: "{n} day to target", other: "{n} days to target" }, az: "Hədəfə {n} gün qalıb", ru: "До срока осталось {n} дн." },
  "set.projectedAfter": { en: " · projected after the target date", az: " · hədəf tarixindən sonra gözlənilir", ru: " · по прогнозу позже срока" },
  "set.onTrackSuffix": { en: " · on track", az: " · plan üzrə", ru: " · успеваете" },
  "set.updatePrompt":  { en: "Update saved amount for \"{name}\":", az: "«{name}» üçün yığılmış məbləği yeniləyin:", ru: "Обновите накопленную сумму для «{name}»:" },
  "set.updateInvalid": { en: "Not a valid amount — saved amount unchanged", az: "Məbləğ düzgün deyil — yığılmış məbləğ dəyişmədi", ru: "Некорректная сумма — накопленная сумма не изменена" },
  "set.update":        { en: "Update", az: "Yenilə", ru: "Обновить" },
  "set.deleteGoal":    { en: "Delete goal {name}", az: "{name} məqsədini sil", ru: "Удалить цель «{name}»" },
  "set.atRate":        { en: "At {amount}/mo → est. {date}", az: "Ayda {amount} ilə → təxminən {date}", ru: "При {amount} в месяц → ориентир: {date}" },
  "set.months":        { en: { one: "{n} month", other: "{n} months" }, az: "{n} ay", ru: { one: "{n} месяц", few: "{n} месяца", many: "{n} месяцев", other: "{n} месяца" } },
  "set.exportCsvSub":  { en: "Full ledger with merchant and subcategory", az: "Satıcı və alt kateqoriya ilə bütün əməliyyatlar", ru: "Все операции с продавцом и подкатегорией" },
  "set.jsonBackupSub": { en: { one: "{n} transaction · complete backup", other: "{n} transactions · complete backup" }, az: "{n} əməliyyat · tam ehtiyat nüsxə", ru: "Операций: {n} · полная копия" },
  "set.lastBackup":    { en: "Last backup file created:", az: "Son ehtiyat nüsxə faylı yaradılıb:", ru: "Последний файл копии создан:" },
  "set.confirmedOn":   { en: "You confirmed you have it on {date}.", az: "Faylın sizdə olduğunu {date} tarixində təsdiqlədiniz.", ru: "Вы подтвердили, что файл у вас, {date}." },
  "set.notConfirmed":  { en: "Not confirmed yet — the reminder at the top asks once you've found the file.", az: "Hələ təsdiqlənməyib — faylı tapdıqdan sonra yuxarıdakı xatırlatmada təsdiqləyin.", ru: "Пока не подтверждено — когда найдёте файл, подтвердите это в напоминании вверху." },
  "set.cantTell":      { en: "The app can't tell whether your browser kept the file — check it, and store a copy somewhere safe.", az: "Tətbiq brauzerin faylı saxlayıb-saxlamadığını bilə bilmir — yoxlayın və surətini etibarlı yerdə saxlayın.", ru: "Приложение не может узнать, сохранил ли браузер файл, — проверьте это и храните копию в надёжном месте." },
  "set.noBackup":      { en: "No backup yet — export one above", az: "Hələ ehtiyat nüsxə yoxdur — yuxarıda ixrac edin", ru: "Резервной копии пока нет — сделайте её выше" },

  // ── Monthly
  "month.plannedExp":   { en: "+{amount} in expenses dated later this month (not counted yet)", az: "+{amount} xərc bu ayın sonrakı tarixlərinə yazılıb (hələ hesablanmayıb)", ru: "+{amount} расходов записано на более поздние даты месяца (пока не учтено)" },
  "month.plannedInc":   { en: "+{amount} in income dated later this month (not counted yet)", az: "+{amount} gəlir bu ayın sonrakı tarixlərinə yazılıb (hələ hesablanmayıb)", ru: "+{amount} доходов записано на более поздние даты месяца (пока не учтено)" },
  "month.prev":         { en: "Previous month", az: "Əvvəlki ay", ru: "Предыдущий месяц" },
  "month.next":         { en: "Next month", az: "Növbəti ay", ru: "Следующий месяц" },
  "month.current":      { en: "Current", az: "Cari ay", ru: "Текущий" },
  "month.net.Net surplus": { en: "Net surplus", az: "Xalis qənaət", ru: "Чистый профицит" },
  "month.net.Net deficit": { en: "Net deficit", az: "Xalis kəsir", ru: "Чистый дефицит" },
  "month.net.Break-even":  { en: "Break-even", az: "Bərabər", ru: "В ноль" },
  "month.byMerchant":   { en: "By Merchant", az: "Satıcılar üzrə", ru: "По продавцам" },
  "month.recurringCount": { en: { one: "{n} recurring transaction recorded this month", other: "{n} recurring transactions recorded this month" }, az: "Bu ay {n} təkrarlanan əməliyyat qeydə alınıb", ru: "Регулярных операций в этом месяце: {n}" },
  "month.emptyTitle":   { en: "No transactions", az: "Əməliyyat yoxdur", ru: "Операций нет" },
  "month.emptyBody":    { en: "Nothing recorded for {month}.", az: "{month} üçün heç nə qeyd olunmayıb.", ru: "За {month} ничего не записано." },
  // ── Smart Helper ("Financial Coach") cards
  "help.title":         { en: "Financial Coach", az: "Maliyyə məsləhətçisi", ru: "Финансовый помощник" },
  "help.paceText":      { en: "You are {amount} above budget pace for this point in the month.", az: "Ayın bu nöqtəsi üçün büdcə tempindən {amount} çox xərcləmisiniz.", ru: "Вы на {amount} выше темпа бюджета для этого момента месяца." },
  "help.paceLeft":      { en: { one: "Your remaining budget of {left} allows about {perDay}/day for the {n} day left (today included).", other: "Your remaining budget of {left} allows about {perDay}/day for the {n} days left (today included)." }, az: "Qalan {left} büdcə qalan {n} gün üçün (bu gün daxil) gündə təxminən {perDay} imkan verir.", ru: "Оставшийся бюджет {left} позволяет тратить около {perDay} в день в оставшиеся дни ({n}, включая сегодня)." },
  "help.paceUsed":      { en: { one: "Your total budget is fully used with {n} day left (today included).", other: "Your total budget is fully used with {n} days left (today included)." }, az: "Ümumi büdcəniz tam istifadə olunub, ayın sonuna {n} gün qalıb (bu gün daxil).", ru: "Весь бюджет израсходован, а до конца месяца ещё дней: {n} (включая сегодня)." },
  "help.paceUsedOver":  { en: { one: "Your total budget is fully used ({over} over) with {n} day left (today included).", other: "Your total budget is fully used ({over} over) with {n} days left (today included)." }, az: "Ümumi büdcəniz tam istifadə olunub ({over} artıq), ayın sonuna {n} gün qalıb (bu gün daxil).", ru: "Весь бюджет израсходован (превышение {over}), а до конца месяца ещё дней: {n} (включая сегодня)." },
  "help.budgetTitle":   { en: "{cat} Budget", az: "Büdcə: {cat}", ru: "Бюджет: {cat}" },
  "help.budgetOver":    { en: "You have exceeded your {cat} budget by {amount} this month.", az: "Bu ay «{cat}» büdcəsini {amount} keçmisiniz.", ru: "В этом месяце бюджет «{cat}» превышен на {amount}." },
  "help.budgetWarn":    { en: { one: "You have used {pct}% of your {cat} budget with {n} day remaining.", other: "You have used {pct}% of your {cat} budget with {n} days remaining." }, az: "«{cat}» büdcəsinin {pct}%-ni istifadə etmisiniz, {n} gün qalıb.", ru: "Использовано {pct}% бюджета «{cat}», осталось дней: {n}." },
  "help.budgetOverImpact": { en: "Consider pausing {cat} spending for the rest of the month.", az: "Ayın qalan hissəsində «{cat}» xərclərini dayandırmağı düşünün.", ru: "Подумайте о том, чтобы до конца месяца приостановить расходы на «{cat}»." },
  "help.budgetWarnImpact": { en: "You have {left} left — {perDay}/day available.", az: "{left} qalıb — gündə {perDay} xərcləmək olar.", ru: "Осталось {left} — можно тратить {perDay} в день." },
  "help.goalTitle":     { en: "Goal: {name}", az: "Məqsəd: {name}", ru: "Цель: {name}" },
  // Run 15 (DRAFT az/ru): the Home coach only flags a goal that needs attention. The amounts and dates live on the Goals tab.
  "help.goalBehind":    { en: "Your planned monthly amount for \"{name}\" is not enough to reach the target date.", az: "«{name}» üçün planlaşdırdığınız aylıq məbləğ hədəf tarixinə çatmaq üçün kifayət deyil.", ru: "Запланированной ежемесячной суммы для цели «{name}» не хватит, чтобы успеть к сроку." },
  "help.goalBehindImpact": { en: "Open Goals to see the monthly amount that fits the deadline.", az: "Son tarixə uyğun aylıq məbləği görmək üçün Məqsədlər bölməsini açın.", ru: "Откройте «Цели», чтобы увидеть сумму в месяц, которая подходит к сроку." },
  "help.goalOverdue":   { en: "The target date for \"{name}\" has passed.", az: "«{name}» üçün hədəf tarixi keçib.", ru: "Срок цели «{name}» прошёл." },
  "help.goalOverdueImpact": { en: "Open Goals to update the goal or set a new date.", az: "Məqsədi yeniləmək və ya yeni tarix təyin etmək üçün Məqsədlər bölməsini açın.", ru: "Откройте «Цели», чтобы обновить цель или назначить новый срок." },
  "help.safeNegTitle":  { en: "Over Discretionary Limit", az: "Sərbəst limit keçilib", ru: "Свободный лимит превышен" },
  "help.safeNegText":   { en: "You have spent {amount} beyond your discretionary budget this month.", az: "Bu ay sərbəst büdcənizdən {amount} çox xərcləmisiniz.", ru: "В этом месяце вы потратили на {amount} больше свободного бюджета." },
  "help.safeNegImpact": { en: "Income received so far: {income} − commitments − savings target leaves no room.", az: "İndiyədək daxil olan {income} gəlirdən öhdəliklər və yığım hədəfi çıxıldıqda sərbəst məbləğ qalmır.", ru: "После вычета обязательств и цели накоплений из полученного дохода ({income}) свободных средств не остаётся." },
  "help.safeNegExpected": { en: "{amount} more is expected later this month.", az: "Bu ay daha sonra əlavə {amount} gözlənilir.", ru: "Позже в этом месяце ожидается ещё {amount}." },
  "help.safeNegReview": { en: "Review recurring or reduce spending.", az: "Təkrarlanan ödənişlərə baxın və ya xərcləri azaldın.", ru: "Проверьте регулярные платежи или сократите расходы." },
  "help.recurTitle":    { en: "Recurring Audit", az: "Təkrarlanan ödənişlərin yoxlanışı", ru: "Проверка регулярных платежей" },
  "help.recurText":     { en: "{n} active recurring payments come to about {amount} in a typical month — {pct}% of the income recorded this month.", az: "{n} aktiv təkrarlanan ödəniş tipik ayda təxminən {amount} edir — bu ay qeydə alınan gəlirin {pct}%-i.", ru: "Активные регулярные платежи ({n}) в обычный месяц составляют около {amount} — {pct}% дохода, записанного в этом месяце." },
  "help.recurImpact":   { en: "Review them in the Recurring tab. Pausing ones you no longer use frees up discretionary budget.", az: "Onlara «Təkrarlanan» bölməsində baxın. İstifadə etmədiklərinizi dayandırmaq sərbəst büdcəni artırır.", ru: "Проверьте их на вкладке «Регулярные». Приостановка ненужных платежей освобождает бюджет." },
  "help.anomalyTitle":  { en: "Unusual Transaction", az: "Qeyri-adi əməliyyat", ru: "Необычная операция" },
  "help.anomalyText":   { en: "{who} on {date}: {amount} — {reason}.", az: "{who}, {date}: {amount} — {reason}.", ru: "{who}, {date}: {amount} — {reason}." },
  "help.anomalyImpact": { en: "This is significantly above your normal spend for {cat}. Was this expected?", az: "Bu, «{cat}» üçün adi xərcinizdən xeyli çoxdur. Bu gözlənilən idimi?", ru: "Это заметно больше ваших обычных расходов в категории «{cat}». Вы этого ожидали?" },

  // @@END
};














// ─────────────────────────────────────────────────────────────────────────────
// PERSONAL FINANCIAL OS v9
// Storage key: expense_ledger_v5 — PERMANENT, never rename
// S0: Reliability — local dates, createdAt duplicate detection, migration
// S1: Goals — target date, estimated completion, what-if scenarios
// S2: Home — financial hierarchy (position → trajectory → explanation → future)
// S3: What Changed — merchant-level explanation per category
// S4: Safe to Spend — future unrecorded commitments separated
// S5: Financial patterns — deterministic, data-only
// S6: Merchant intelligence — profile in detail view
// ─────────────────────────────────────────────────────────────────────────────

const KEY = "expense_ledger_v5";
const KEYS_LEGACY = [
  "finance_app_data","finance_editorial_v1","finance_editorial_v2",
  "finance_editorial_v3","finance_editorial_v4","finance_os_v3",
];

function writeRaw(k,v) { try { localStorage.setItem(k,JSON.stringify(v)); return true; } catch { return false; } }

// Set when stored data needed recovery on load; the App shows it once.
let LOAD_NOTICE = null;
// True when a recovery copy could not be written: saving is then paused so the original data is never overwritten.
let SAVE_BLOCKED = false;
// True when saving is paused because stored data could not be READ (not because a copy failed): the banner then says so.
let SAVE_BLOCKED_READ = false;

// ─── Money grammar ────────────────────────────────────────────────────────────
// Text typed by the user or read from a CSV cell: digits with an optional decimal point and at most 2 decimals,
// up to 9 integer digits. Accepted: "12" "12.5" "12.50" ".5" "0.05".
// Rejected: "" "12." "-5" "+5" "1e3" "0x10" "1,5" "1 000" "NaN" "Infinity" "25abc", and anything above MAX_AMOUNT.
// JSON numbers (stored data, older versions, backups, settings) must be whole cents too (Run 6, D13/D22): the number must be
// exactly the 2-decimal value it prints as. 12.345, 10.005 and 0.1+0.2 (= 0.30000000000000004) are refused, never rounded —
// rounding would silently change the figure. This is the rule imports already used (Phase 3), now applied everywhere.
const MAX_AMOUNT = 999999999.99;
const MONEY_TEXT_RE = /^(?:\d{1,9}|\d{0,9}\.\d{1,2})$/;
const isWholeCents = (n) => Number(n.toFixed(2))===n;

function strictNum(v) {
  if (typeof v==="number") return Number.isFinite(v) ? v : NaN;
  if (typeof v==="string") { const s=v.trim(); return MONEY_TEXT_RE.test(s) ? Number(s) : NaN; }
  return NaN;
}

// Why a money value is not acceptable (null when it is). {positive:true} → must be > 0, otherwise ≥ 0.
function moneyReason(v, { positive=false } = {}) {
  if (v===undefined || v===null || (typeof v==="string" && v.trim()==="")) return "missing amount";
  if (typeof v==="number") { if (!Number.isFinite(v)) return "invalid amount"; }
  else if (typeof v==="string") {
    const t=v.trim();
    if (t.startsWith("-") && MONEY_TEXT_RE.test(t.slice(1))) return "negative amount";
    if (!MONEY_TEXT_RE.test(t)) return "invalid amount";
  } else return "invalid amount";
  const n=strictNum(v);
  if (n<0) return "negative amount";
  if (!isWholeCents(n)) return "more than 2 decimal places";
  if (positive && n===0) return "zero amount";
  if (n>MAX_AMOUNT) return "amount too large";
  return null;
}

// Money typed by the user: a finite number > 0 ({positive:true}) or ≥ 0; anything else → null (never silently 0).
function parseMoney(v, opts) { return moneyReason(v,opts)===null ? strictNum(v) : null; }
// Run 17: what a money box lets through while typing. Phones whose decimal key is a comma used to lose the mark (145,67 was saved as 14567 because the box was type=number).
// Either "." or "," is the decimal mark; when both appear the LAST one is, the other is a thousands mark and goes. Digits are never changed, at most 2 decimals.
function cleanMoneyText(raw) {
  // A sign or an exponent is never turned into a different valid number (-5 must not become 5): it stays visible and is refused when saving.
  if (/[-+eE]/.test(String(raw??""))) return String(raw).replace(/[\s\u00a0\u202f]/g,"").slice(0,24);
  const s=String(raw??"").replace(/[\s\u00a0\u202f]/g,"").replace(/[^0-9.,]/g,"");
  const dot=s.indexOf("."), com=s.indexOf(","), lastDot=s.lastIndexOf("."), lastCom=s.lastIndexOf(",");
  let at;                                           // index of the character that is the decimal mark
  if (dot>=0 && com>=0) at=Math.max(lastDot,lastCom);
  else if (dot>=0) at=dot;                          // a repeated dot while typing (1.2.3): the first is the mark
  else if (com>=0) { if (lastCom!==com) return s.replace(/,/g,""); at=com; }   // 1,234,567 pasted: thousands marks
  else return s;
  const intPart=s.slice(0,at).replace(/[.,]/g,""), dec=s.slice(at+1).replace(/[.,]/g,"").slice(0,2);
  return (intPart===""?"0":intPart)+"."+dec;
}// A form value that ends in the decimal mark ("145.") means 145; parseMoney itself stays strict for imports.
// Run 26: an in-app question instead of the browser's own confirm box (same look as the rest, animated, translated). askConfirm(text) gives
// a promise of true/false; the <ConfirmHost/> in the app shell shows it. Without a host (never in the app) it falls back to window.confirm.
let confirmHost=null;
function askConfirm(message) { return new Promise(res=>{ if (!confirmHost) { res(typeof window!=="undefined" && window.confirm ? window.confirm(message) : false); return; } confirmHost({ message, res }); }); }
// Run 26: one shared way to open an inline form without a jump: the view glides to it (smooth scroll) and the first box is focused
// with preventScroll (a plain autoFocus makes phones snap the page). Use as ref={revealFocus}; it only acts once per element.
function revealFocus(el) {
  if (!el || el.dataset.shown) return; el.dataset.shown="1";
  requestAnimationFrame(()=>{ try { el.scrollIntoView({ behavior:"smooth", block:"center" }); const i=el.matches("input,select,textarea") ? el : el.querySelector("input,select,textarea"); if (i) i.focus({ preventScroll:true }); } catch {} });
}
function formMoney(v, opts) { return parseMoney(typeof v==="string" ? v.trim().replace(/\.$/,"") : v, opts); }

function isPlainObject(x) { return x!==null && typeof x==="object" && !Array.isArray(x); }
// Run 14: a clickable <div> that acts as a button must answer Enter and Space too. Only when the key was pressed ON the element
// itself, so a real button inside it keeps its own keys.
const activateKey = (fn) => (e) => { if (e.target!==e.currentTarget) return; if (e.key==="Enter" || e.key===" ") { e.preventDefault(); fn(); } };
// A yes/no field: true/false, or the words "true"/"false" (any case, trimmed). Anything else → null (not guessed).
const flagValue = (v) => { if (typeof v==="boolean") return v; if (typeof v==="string") { const s=v.trim().toLowerCase(); if (s==="true") return true; if (s==="false") return false; } return null; };
const isTrue = (v) => flagValue(v)===true;
const txt = (v) => typeof v==="string" ? v : (typeof v==="number" && Number.isFinite(v) ? String(v) : "");
const norm = (v) => txt(v).trim().toLowerCase().replace(/\s+/g," ");

// Keep a recoverable copy of anything we cannot use, so the next save never overwrites it.
function preserveRaw(label, raw) {
  try { localStorage.setItem(`${"expense_ledger_v5"}__${label}_${Date.now()}`, typeof raw==="string"?raw:JSON.stringify(raw)); return true; }
  catch { return false; }
}

function isValidDateStr(s) {
  if (typeof s!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y,m,d]=s.split("-").map(Number);
  const dt=new Date(y,m-1,d);
  return dt.getFullYear()===y && dt.getMonth()===m-1 && dt.getDate()===d;
}

// ─── Transaction record contract ──────────────────────────────────────────────
// A record is stored only if it can be stored exactly as it means. Nothing is repaired or guessed:
// a missing/invalid date, a non-positive amount or an unsupported type is rejected with a reason (never abs()'d, never today).
const TXN_TYPES = { income:"income", inc:"income", incomes:"income", expense:"expense", exp:"expense", expenses:"expense" };
const RECUR_FREQS = new Set(["weekly","biweekly","monthly","yearly"]);
// A date, or a date with a valid time (Run 8): "2026-10-01", "2026-10-01T10:30", "…:15", "…:15.123", optionally "Z" or
// "+04:00"/"-0530", with T or a space. Anything else after the date ("Tgarbage", "T25:00") is refused — it used to be cut
// off and the record silently kept with the first ten characters. The stored date is the written calendar date.
const DATE_TEXT_RE = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|[+-](\d{2}):?(\d{2}))?)?$/;
function isValidDateText(s) {
  const m=DATE_TEXT_RE.exec(s); if (!m || !isValidDateStr(m[1])) return false;
  const [,,h,mi,se,oh,om]=m;
  if (h!==undefined && (Number(h)>23 || Number(mi)>59 || (se!==undefined && Number(se)>59))) return false;
  if (oh!==undefined && (Number(oh)>14 || Number(om)>59)) return false;
  return true;
}
function normType(v) { if (v===undefined||v===null||v==="") return "expense"; return TXN_TYPES[String(v).trim().toLowerCase()] || null; }

function checkRawTxn(t) {
  if (!isPlainObject(t)) return "not a transaction record";
  if (t.date===undefined || t.date===null || (typeof t.date==="string" && t.date.trim()==="")) return "missing date";
  if (typeof t.date!=="string") return "invalid date";
  const d=t.date.trim();
  if (!isValidDateText(d)) return "invalid date";
  const r=moneyReason(t.amount ?? t.amt, { positive:true });
  if (r) return r;
  if (normType(t.type)===null) return "unsupported type";
  // isActive: missing = active (as always). An explicit value must be a yes/no: null, 0, 1, "yes", {} … used to be read by
  // truthiness, which could silently re-activate a paused payment. recurring: missing or null = not recurring (null always
  // meant that and it is also the default); any other non-yes/no value is refused.
  // Run 8: null is accepted as paused — the meaning older versions always gave it (!!null) — so such records stay visible.
  if (t.isActive!==undefined && t.isActive!==null && flagValue(t.isActive)===null) return "invalid active flag";
  if (t.recurring!==undefined && t.recurring!==null && flagValue(t.recurring)===null) return "invalid recurrence flag";
  if (isTrue(t.recurring) && !RECUR_FREQS.has(t.recurFreq||t.frequency)) return "invalid recurrence";
  return null;
}
function isUsableRawTxn(t) { return checkRawTxn(t)===null; }

// Several load/import events can each add a line; they are joined, never overwritten.
function noteLoad(msg) { LOAD_NOTICE = LOAD_NOTICE ? `${LOAD_NOTICE} · ${msg}` : msg; }

function summariseReasons(items) {
  const c={}; items.forEach(b=>{ c[b.reason]=(c[b.reason]||0)+1; });
  // Reasons are stable English codes (checkRawTxn); only their display is translated.
  return Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([r,n])=>MESSAGES["reason."+r] ? t("reason."+r,{n}) : `${n} ${r}`).join(", ");
}

function setAside(label, records, detail="") {
  if (!records.length) return;
  const kept=preserveRaw(label, records);
  const why=detail ? ` (${detail})` : "";
  if (kept) noteLoad(tn("load.setAside",records.length,{why}));
  else { SAVE_BLOCKED=true; noteLoad(tn("load.setAsideBlocked",records.length,{why})); }
}

// Two records with the same id would be edited or deleted together: keep the first, give later ones a fresh id.
function ensureUniqueIds(list) {
  const seen=new Set(); let rekeyed=0;
  const out=list.map(t=>{
    if (!seen.has(String(t.id))) { seen.add(String(t.id)); return t; }
    let id; do { id=Date.now()+Math.random(); } while (seen.has(String(id)));
    seen.add(String(id)); rekeyed++; return { ...t, id };
  });
  return { list:out, rekeyed };
}

function partitionTransactions(list, opts={}) {
  const good=[], bad=[];
  list.forEach(t=>{
    const reason=checkRawTxn(t);
    if (reason) { bad.push({ record:t, reason }); return; }
    good.push(normaliseTxn(t,opts));
  });
  const u=ensureUniqueIds(good);
  return { good:u.list, bad, rekeyed:u.rekeyed };
}

function sanitizeTransactions(list, label) {
  const { good, bad, rekeyed }=partitionTransactions(list,{ keepCategoryId:true });   // the app's own saved data: keep category ids a later version added
  setAside(label, bad.map(b=>b.record), summariseReasons(bad));
  if (rekeyed) noteLoad(tn("load.rekeyed",rekeyed));
  return good;
}

// ─── Local date helpers (S0: all UTC bugs eliminated) ────────────────────────
function localDateStr(d=new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function localMonthStr(d=new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
// Parse a YYYY-MM-DD string as LOCAL calendar date (avoids UTC midnight shift)
function parseLocalDate(s) {
  if (!s) return new Date();
  const [y,m,d] = s.split("-").map(Number);
  return new Date(y, m-1, d);
}
// Add whole months without overflowing: Jan 31 + 1 month = Feb 28/29 (never Mar 3).
function addMonths(d, n) {
  const r=new Date(d.getFullYear(), d.getMonth()+n, 1);
  const dim=new Date(r.getFullYear(), r.getMonth()+1, 0).getDate();
  r.setDate(Math.min(d.getDate(), dim));
  return r;
}
const today   = () => localDateStr();
const curMon  = () => localMonthStr();
const prevMon = () => { const n=new Date(); const d=new Date(n.getFullYear(),n.getMonth()-1,1); return localMonthStr(d); };
const nMon    = (n) => { const now=new Date(); const d=new Date(now.getFullYear(),now.getMonth()-n,1); return localMonthStr(d); };

// ─── Category system ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { id:"food",     name:"Food & Dining",        tile:"Food",      color:"#F0C46F", income:false,
    subs:["Restaurants","Fast Food","Coffee","Groceries","Delivery","Snacks","Bakery","Market / Bazaar","Other"] },
  { id:"transport",name:"Transport",             tile:"Transport", color:"#83B9F5", income:false,
    subs:["Metro","Bus","Taxi / Ride-hailing","Fuel","Parking","Car Maintenance","Intercity","Public transport card","Other"] },
  { id:"shopping", name:"Shopping",              tile:"Shopping",  color:"#B3A1FF", income:false,
    subs:["Clothing","Electronics","Personal Items","Home","Accessories","Online Shopping","Furniture","Appliances","Other"] },
  { id:"gifts",    name:"Gifts & Personal",      tile:"Gifts",     color:"#C9A27E", income:false,
    subs:["Gifts","Donations","Personal Care","Barber / Hair","Cosmetics","Other"] },
  { id:"entertain",name:"Entertainment",         tile:"Entertainment",   color:"#E7A3D6", income:false,
    subs:["Cinema","Games","Events","Sports","Hobbies","Music","Other"] },
  { id:"digital",  name:"Bills & Subscriptions", tile:"Bills & subs",     color:"#9FB4C7", income:false,
    subs:["Mobile","Internet","Streaming","Software","Cloud Storage","Other Subs","Other"] },
  { id:"health",   name:"Health & Fitness",      tile:"Health",    color:"#F2A66E", income:false,
    subs:["Gym","Sports Equipment","Pharmacy","Doctor / Dentist","Supplements","Eye care","Tests / Lab","Other"] },
  { id:"edu",      name:"Education",             tile:"Education", color:"#C9B8FF", income:false,
    subs:["University","Books","Courses","Exams","Stationery","Tutoring","School / Kindergarten","Other"] },
  { id:"travel",   name:"Travel",                tile:"Travel",    color:"#D8CB7E", income:false,
    subs:["Flights","Hotels","Visa","Travel Food","Travel Transport","Activities","Other"] },
  { id:"housing",  name:"Home",                  tile:"Home",      color:"#4CC9C4", income:false,
    subs:["Rent","Utilities","Household","Repairs","Gas","Electricity","Water","Building fees","Other"] },
  { id:"finance",  name:"Finance",               tile:"Finance",   color:"#85D9D0", income:false,
    subs:["Bank Fees","Transfers","Taxes","Insurance","Investments","Loan payment","Interest","Other"] },
  { id:"other",    name:"Other",                 tile:"Other",     color:"#A5B7B8", income:false,
    subs:["Miscellaneous","Pets","Children"] },
  { id:"salary",   name:"Salary",                tile:"Salary",    color:"#8BD97A", income:true, subs:[] },
  { id:"freelance",name:"Freelance",             tile:"Freelance", color:"#7CCB9A", income:true, subs:[] },
  { id:"income",   name:"Other Income",          tile:"Other income",    color:"#9FDDA0", income:true, subs:[] },
];
const CAT = (id) => CATEGORIES.find(c=>c.id===id) || CATEGORIES.find(c=>c.id==="other");
// Display names in the interface language. The English `name` above stays the stored/CSV identifier and is never translated.
const catName = (id) => MESSAGES["cat."+CAT(id).id] ? t("cat."+CAT(id).id) : CAT(id).name;
const catTile = (id) => MESSAGES["tile."+CAT(id).id] ? t("tile."+CAT(id).id) : CAT(id).tile;
// Built-in subcategory names are translated for display; anything the user typed is shown exactly as stored.
const subName = (s) => (s && MESSAGES["sub."+s]) ? t("sub."+s) : s;

const CATEGORY_MAP = {
  "food":"food","transport":"transport","housing":"housing","digital":"digital",
  "edu":"edu","other":"other","salary":"salary","freelance":"freelance",
  "sport":"health","personal":"gifts","culture":"shopping",
  "food & dining":"food","groceries & dining":"food","groceries":"food","dining":"food",
  "food and dining":"food","restaurant":"food","restaurants":"food","coffee":"food",
  "cafe":"food","lunch":"food","snacks":"food","breakfast":"food","dinner":"food",
  "sport & fitness":"health","sports":"health","fitness":"health","gym":"health",
  "football":"entertain","health & sport":"health","exercise":"health","workout":"health",
  "personal care":"gifts","skincare":"gifts","health":"health","grooming":"gifts",
  "pharmacy":"health","personal & health":"gifts","beauty":"gifts","medical":"health",
  "doctor":"health","hygiene":"gifts","style & culture":"shopping","culture & style":"shopping",
  "fashion":"shopping","style":"shopping","clothing":"shopping","clothes":"shopping",
  "fragrance":"gifts","entertainment":"entertain","shopping":"shopping","games":"entertain",
  "gaming":"entertain","cinema":"entertain","movies":"entertain","transportation":"transport",
  "travel":"travel","bus":"transport","taxi":"transport","uber":"transport","fuel":"transport",
  "petrol":"transport","metro":"transport","benzin":"transport","rent":"housing","home":"housing",
  "utilities":"housing","bills":"digital","household":"housing","digital & subs":"digital",
  "digital and subs":"digital","subscriptions":"digital","subscription":"digital","subs":"digital",
  "streaming":"digital","software":"digital","apps":"digital","tech":"digital","mobile":"digital",
  "internet":"digital","education":"edu","books":"edu","courses":"edu","tuition":"edu",
  "university":"edu","school":"edu","salary & income":"salary","salary and income":"salary",
  "wage":"salary","wages":"salary","paycheck":"salary","pay":"salary",
  "side income":"freelance","commission":"freelance","consulting":"freelance","gig":"freelance",
  "groceries & cafes":"food","cafes":"food",
};

// Exact matches only (Run 8): an id, a category's English name or an alias, compared after lower-casing, collapsing spaces
// and treating "and" as "&". Anything else is "other" — the import sheet counts those rows and says so. The old fallback
// matched any part of a word ("Payment" → Salary via "pay", "x" → whatever alias contained an x).
const catKey = (s) => String(s).toLowerCase().trim().replace(/\s+/g," ").replace(/ and /g," & ").replace(/\s*&\s*/g," & ");
const CATEGORY_LOOKUP = (() => {
  const m={}; Object.entries(CATEGORY_MAP).forEach(([k,v])=>{ m[catKey(k)]=v; });
  CATEGORIES.forEach(c=>{ m[catKey(c.name)]=c.id; m[c.id]=c.id; });
  return m;
})();
function resolveCategory(raw, keepUnknownId=false) {
  if (!raw) return "other";
  const known=CATEGORY_LOOKUP[catKey(raw)];
  if (known) return known;
  // Run 17: in the app's OWN saved data (never in imports) an id this version does not know is kept as it is, so an older copy of the app
  // never rewrites a later version's category to "Other". Only id-shaped text qualifies; it is shown as Other until the version knows it.
  if (keepUnknownId && typeof raw==="string" && /^[a-z][a-z0-9_]{1,31}$/.test(raw)) return raw;
  return "other";
}

// ─── Custom categories (Run 24; Phase 2 of the custom-categories design note) ──────────────────────────────────────────────
// The user's own categories live in their own storage key and are added to CATEGORIES at start-up, so every picker, chart and budget
// sees them. An entry keeps only the category's id ("u_…"); the ledger shape is unchanged. A phone or older version that does not
// know an id shows the entry as "Other" and keeps the id (see resolveCategory), and the backup file carries the list.
const CCAT_KEY=KEY+"__cats", CCAT_MAX=30, CCAT_LEN=24, CCAT_COLORS=["#F28B82","#F6AD55","#ECC94B","#68D391","#4FD1C5","#63B3ED","#A78BFA","#F687B3"];
function cleanCustomCats(raw) {
  const src=Array.isArray(raw) ? raw : (raw && Array.isArray(raw.cats) ? raw.cats : []);
  const ids=new Set(), names=new Set(CATEGORIES.filter(c=>!c.custom).map(c=>catKey(c.name)).concat(CATEGORIES.filter(c=>!c.custom).map(c=>catKey(c.id)))), out=[];
  src.forEach(v=>{
    if (!isPlainObject(v) || out.length>=CCAT_MAX) return;
    const id=typeof v.id==="string" && /^u_[a-z0-9]{3,12}$/.test(v.id) ? v.id : null;
    const name=typeof v.name==="string" ? v.name.trim().replace(/\s+/g," ") : "";
    if (!id || !name || name.length>CCAT_LEN || ids.has(id) || names.has(catKey(name))) return;
    ids.add(id); names.add(catKey(name));
    out.push({ id, name, income:v.income===true, color:typeof v.color==="string" && /^#[0-9a-fA-F]{6}$/.test(v.color) ? v.color : CCAT_COLORS[out.length%CCAT_COLORS.length] });
  });
  return out;
}
const currentCustomCats=()=>CATEGORIES.filter(c=>c.custom).map(c=>({ id:c.id, name:c.name, income:c.income, color:c.color }));
function applyCustomCats(list) {   // replaces the custom entries of CATEGORIES in place (same array, so every reader sees the change)
  for (let i=CATEGORIES.length-1;i>=0;i--) if (CATEGORIES[i].custom) { const c=CATEGORIES.splice(i,1)[0]; delete CATEGORY_LOOKUP[c.id]; delete CATEGORY_LOOKUP[catKey(c.name)]; }
  cleanCustomCats(list).forEach(c=>{ CATEGORIES.push({ id:c.id, name:c.name, tile:c.name, color:c.color, income:c.income, subs:[], custom:true }); CATEGORY_LOOKUP[c.id]=c.id; CATEGORY_LOOKUP[catKey(c.name)]=c.id; });
}
function mergeCustomCats(a, b) { return cleanCustomCats([...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])]); }
function readCustomCats() { try { const r=localStorage.getItem(CCAT_KEY); return r ? cleanCustomCats(JSON.parse(r)) : []; } catch { return []; } }
function writeCustomCats(list) {
  try { const c=cleanCustomCats(list); if (!c.length) localStorage.removeItem(CCAT_KEY); else localStorage.setItem(CCAT_KEY,JSON.stringify({ version:1, cats:c })); return true; } catch { return false; }
}
function newCustomCatId(list) { const used=new Set((list||[]).map(c=>c.id)); let id; do { id="u_"+Math.random().toString(36).slice(2,8).replace(/[^a-z0-9]/g,"a").padEnd(6,"a"); } while (used.has(id)); return id; }
// Adds a category to a list; returns the new list or a reason it was refused (empty, long, duplicate of a built-in or own name, full).
function addCustomCat(list, name, income, color) {
  const n=typeof name==="string" ? name.trim().replace(/\s+/g," ") : "";
  if (!n) return { list, added:false, reason:"empty" };
  if (n.length>CCAT_LEN) return { list, added:false, reason:"long" };
  if ((list||[]).length>=CCAT_MAX) return { list, added:false, reason:"full" };
  const next=cleanCustomCats([...(list||[]),{ id:newCustomCatId(list), name:n, income:!!income, color }]);
  return next.length>(list||[]).length ? { list:next, added:true, reason:"" } : { list, added:false, reason:"dup" };
}
// Renames a category and/or changes its colour. Entries and budgets point at the id, so nothing else changes; the type stays as it was.
function editCustomCat(list, id, name, color) {
  const cur=(list||[]).find(c=>c.id===id);
  if (!cur) return { list, edited:false, reason:"missing" };
  const n=typeof name==="string" ? name.trim().replace(/\s+/g," ") : "";
  if (!n) return { list, edited:false, reason:"empty" };
  if (n.length>CCAT_LEN) return { list, edited:false, reason:"long" };
  const next=cleanCustomCats(list.map(c=>c.id===id ? { ...c, name:n, color:color||c.color } : c));
  return next.length===list.length && next.some(c=>c.id===id) ? { list:next, edited:true, reason:"" } : { list, edited:false, reason:"dup" };
}
function customCatInUse(id, transactions, budgets) { return (transactions||[]).some(x=>x && x.category===id) || !!(budgets && budgets[id]>0); }
try { applyCustomCats(readCustomCats()); } catch {}

// planImport reads a backup's own categories first, so its entries keep their category instead of becoming "Other"; nothing is stored here.
function planImportWithCats(raw, filename="") {
  let inc=[]; try { const p=JSON.parse(String(raw).replace(/^﻿/,"")); if (isPlainObject(p)) inc=cleanCustomCats(p.customCategories); } catch {}
  if (!inc.length) return planImport(raw,filename);
  const had=currentCustomCats();
  applyCustomCats(mergeCustomCats(had,inc));
  try { const r=planImport(raw,filename); if (r && r.ok) r.customCats=inc; return r; } finally { applyCustomCats(had); }
}

// Callers validate with checkRawTxn() first (see partitionTransactions). normaliseTxn never takes abs(),
// never defaults a date and never turns an unknown type into an expense.
function normaliseTxn(t, opts={}) {
  // Keep the record's own id whenever it is usable: a finite number or a non-blank string (legacy and imported ids, UUIDs).
  // Anything else (missing, blank, NaN/Infinity, booleans, objects) gets a fresh numeric id.
  const rawId=t.id;
  const usableId=(typeof rawId==="number" && Number.isFinite(rawId)) || (typeof rawId==="string" && rawId.trim()!=="");
  const id=usableId ? rawId : Date.now()+Math.random();
  const f=t.recurFreq||t.frequency;
  return {
    id,
    type:        normType(t.type)==="income" ? "income" : "expense",
    amount:      strictNum(t.amount ?? t.amt),
    category:    resolveCategory(t.category||t.catId||t.cat, !!opts.keepCategoryId),
    subcategory: txt(t.subcategory||t.subcat),
    merchant:    txt(t.merchant||t.merchantName),
    note:        txt(t.note||t.description||t.name),
    date:        String(t.date).trim().slice(0,10),
    recurring:   isTrue(t.recurring),
    recurFreq:   RECUR_FREQS.has(f) ? f : null,
    isActive:    t.isActive===undefined ? true : t.isActive===null ? false : flagValue(t.isActive),   // checkRawTxn has refused anything else
    createdAt:   t.createdAt||new Date().toISOString(),
    // Run 12: the bill this payment paid (explicit bills). Only a short non-blank text id is kept; records without one get
    // no new field, so data written by earlier versions loads byte-for-byte the same.
    ...(isBillId(t.billId) ? { billId:t.billId.trim() } : {}),
    // Run 16: how it was paid. Optional, so entries without one keep exactly the shape older versions wrote.
    ...(walletId(t.wallet) ? { wallet:walletId(t.wallet) } : {}),
    // Run 17: a loan instalment marked paid on the Debts page. Optional; entries without it keep the shape older versions wrote.
    ...(loanRef(t.loan) ? { loan:loanRef(t.loan) } : {}),
    // Run 18: a repayment of a person-to-person debt that the user chose to also record as cash flow. Optional, same rule.
    ...(debtLinkRef(t.debtLink) ? { debtLink:debtLinkRef(t.debtLink) } : {}),
    // Run 22: an optional trip / group name. Same rule: entries without one keep the shape older versions wrote.
    ...(tripName(t.trip) ? { trip:tripName(t.trip) } : {}),
    // Run 24: the account the entry was paid from or received into. Optional, same rule; an id this phone does not know is kept as it is.
    ...(accId(t.account) ? { account:accId(t.account) } : {}),
  };
}
// Run 22: a trip is a short free-text label (max 40 characters) on ordinary entries. Anything that is not text gives no trip.
function tripName(v) { return typeof v==="string" ? v.replace(/[\u0000-\u001f\u007f\s]+/g," ").trim().slice(0,40).trim() : ""; }
// Run 24: one category's all-time total and a total per month (newest first), in whole cents. Loan instalments count only their interest, like every spending view.
function catTotals(list, catId) {
  const by=new Map(); let cents=0, n=0;
  forSpending(list||[]).forEach(x=>{
    if (!x || x.category!==catId) return;
    const c=Math.round((Number(x.amount)||0)*100), m=String(x.date||"").slice(0,7);
    cents+=c; n++; const g=by.get(m)||{ month:m, cents:0, n:0 }; g.cents+=c; g.n++; by.set(m,g);
  });
  return { total:cents/100, n, months:[...by.values()].filter(g=>/^\d{4}-\d{2}$/.test(g.month)).sort((a,b)=>b.month.localeCompare(a.month)).map(g=>({ month:g.month, total:g.cents/100, n:g.n })) };
}
// Expenses per trip (loan instalments count only their interest, like every spending view), whole cents so 0.1 + 0.2 is exactly 0.30.
// "Baku" and "baku" are one trip; the spelling of the first entry in the list (newest first) is shown. Largest total first.
function tripTotals(list) {
  const by=new Map();
  forSpending(list).forEach(x=>{
    const n=tripName(x && x.trip); if (!n || x.type==="income") return;
    const k=n.toLowerCase(), g=by.get(k) || { name:n, cents:0, n:0 };
    g.cents+=Math.round((Number(x.amount)||0)*100); g.n++; by.set(k,g);
  });
  return [...by.values()].map(g=>({ name:g.name, total:g.cents/100, n:g.n })).sort((a,b)=>b.total-a.total || a.name.localeCompare(b.name));
}
// Run 17 (owner rule): a loan payment is recorded as the FULL instalment (money paid out). loan.interest is the part that is a real cost
// (units, 2 decimals) or null when the person does not know the split. Spending views count only the interest; the principal reduces the
// loan and is not ordinary spending. An unknown split adds nothing to spending: no allocation is invented.
function loanRef(v) {
  if (!isPlainObject(v)) return null;
  if (v.interest===null) return { interest:null };
  return (typeof v.interest==="number" && Number.isFinite(v.interest) && v.interest>=0 && v.interest<=1e9) ? { interest:Math.round(v.interest*100)/100 } : null;
}
// Run 18 (owner decision "ask each time"): repaying a person, or being repaid, may also be recorded as a cash-flow entry. The entry is the
// principal only: it reduces the debt and is NOT ordinary spending or income (interest or fees are entered separately as normal entries).
function debtLinkRef(v) {
  if (!isPlainObject(v)) return null;
  const ok=(x)=>typeof x==="string" && x.trim()!=="" && x.length<=64;
  return ok(v.debtId) && ok(v.paymentId) ? { debtId:v.debtId, paymentId:v.paymentId } : null;
}
function debtCashFlow(list, mon) {
  const out={ out:0, in:0, n:0 };
  (Array.isArray(list)?list:[]).forEach(t=>{
    if (!t || !t.debtLink || !debtLinkRef(t.debtLink) || String(t.date).slice(0,7)!==mon) return;
    out.n++; if (t.type==="income") out.in+=Number(t.amount)||0; else out.out+=Number(t.amount)||0;
  });
  out.out=Math.round(out.out*100)/100; out.in=Math.round(out.in*100)/100;
  return out;
}
function forSpending(list) {
  return (Array.isArray(list)?list:[]).flatMap(t=>{
    if (t && t.debtLink && debtLinkRef(t.debtLink)) return [];
    const r=t&&t.loan?loanRef(t.loan):null;
    if (!r) return [t];
    const part=r.interest===null ? 0 : Math.min(r.interest,Number(t.amount)||0);
    return part>0 ? [{...t,amount:part}] : [];
  });
}
function loanCashOut(list, mon) {
  const out={ paid:0, n:0, interest:0, unknown:0 };
  (Array.isArray(list)?list:[]).forEach(t=>{
    const r=t&&t.loan?loanRef(t.loan):null;
    if (!r || String(t.date).slice(0,7)!==mon) return;
    out.n++; out.paid+=Number(t.amount)||0;
    if (r.interest===null) out.unknown++; else out.interest+=Math.min(r.interest,Number(t.amount)||0);
  });
  out.paid=Math.round(out.paid*100)/100; out.interest=Math.round(out.interest*100)/100;
  return out;
}
// Run 16: the wallet an entry was paid from. Only a tag (no balances, no transfers). The built-in ids are below; a short safe
// text id this version does not know (a wallet from a newer version or file) is KEPT, never dropped or turned into another one,
// and shown as "Other". "" means not set.
const WALLET_IDS = ["cash","card","mobile","other"];
function walletId(v) { const s=typeof v==="string" ? v.trim().toLowerCase() : ""; return /^[a-z0-9_-]{1,32}$/.test(s) ? s : ""; }
// Names a person types in a CSV, mapped to the ids ("Bank card" has a space, so it is not an id by itself).
const WALLET_ALIASES = { "bank card":"card", "credit card":"card", "debit card":"card", "mobile wallet":"mobile", "e wallet":"mobile" };
function walletFromText(s) { const k=String(s||"").trim().toLowerCase(); return WALLET_ALIASES[k] || walletId(k); }
// The wallet of the newest entry that has one (the list is newest first): the default for the next entry.
function lastWallet(transactions) { const t=(transactions||[]).find(x=>walletId(x && x.wallet)); return t ? walletId(t.wallet) : ""; }
const walletName=(id)=>WALLET_IDS.includes(id) ? t("wallet."+id) : t("wallet.other");   // an id this version does not know shows as "Other"
// Run 16: the user's own subcategories (Phase 1 of the custom-categories design note). A subcategory is already free text on each
// entry, so these are only SUGGESTIONS in the picker, kept in their own storage key. The ledger and every entry stay untouched,
// and an older version simply never shows them. Limits: 20 per category, 30 characters, no duplicates (ignoring case), nothing
// equal to a built-in subcategory of that category.
const SUBCAT_KEY=KEY+"__subcats", SUBCAT_MAX=20, SUBCAT_LEN=30;
const subKey=(s)=>String(s).trim().toLowerCase();
function cleanSubcats(raw) {
  const out={};
  const src=raw && typeof raw==="object" && !Array.isArray(raw) ? (raw.byCategory && typeof raw.byCategory==="object" && !Array.isArray(raw.byCategory) ? raw.byCategory : raw) : {};
  Object.entries(src).forEach(([cid,list])=>{
    const cat=CATEGORIES.find(c=>c.id===cid); if (!cat || !Array.isArray(list)) return;
    const seen=new Set((cat.subs||[]).map(subKey)), keep=[];
    list.forEach(v=>{ if (typeof v!=="string") return; const s=v.trim().replace(/\s+/g," "); if (!s || s.length>SUBCAT_LEN || seen.has(subKey(s)) || keep.length>=SUBCAT_MAX) return; seen.add(subKey(s)); keep.push(s); });
    if (keep.length) out[cid]=keep;
  });
  return out;
}
function addUserSubcat(map, catId, text) {
  const cat=CATEGORIES.find(c=>c.id===catId); if (!cat) return { map, added:false, reason:"category" };
  const s=typeof text==="string" ? text.trim().replace(/\s+/g," ") : ""; if (!s) return { map, added:false, reason:"empty" };
  if (s.length>SUBCAT_LEN) return { map, added:false, reason:"long" };
  const mine=(map&&map[catId])||[];
  if ((cat.subs||[]).some(x=>subKey(x)===subKey(s)) || mine.some(x=>subKey(x)===subKey(s))) return { map, added:false, reason:"dup" };
  if (mine.length>=SUBCAT_MAX) return { map, added:false, reason:"full" };
  return { map:{ ...map, [catId]:[...mine,s] }, added:true, reason:"" };
}
function removeUserSubcat(map, catId, text) {
  const rest=((map&&map[catId])||[]).filter(x=>subKey(x)!==subKey(text)), out={ ...map };
  if (rest.length) out[catId]=rest; else delete out[catId];
  return out;
}
// Run 25: renaming one of the user's own subcategories. Same rules as adding (length, no duplicate, not a built-in name); the position
// in the list is kept. Entries that used the old name are renamed by renameSubcatInEntries (only that category's entries).
function renameUserSubcat(map, catId, oldText, newText) {
  const cat=CATEGORIES.find(c=>c.id===catId); if (!cat) return { map, edited:false, reason:"category" };
  const mine=(map&&map[catId])||[], idx=mine.findIndex(x=>subKey(x)===subKey(oldText));
  if (idx<0) return { map, edited:false, reason:"missing" };
  const s=typeof newText==="string" ? newText.trim().replace(/\s+/g," ") : ""; if (!s) return { map, edited:false, reason:"empty" };
  if (s.length>SUBCAT_LEN) return { map, edited:false, reason:"long" };
  if ((cat.subs||[]).some(x=>subKey(x)===subKey(s)) || mine.some((x,i)=>i!==idx && subKey(x)===subKey(s))) return { map, edited:false, reason:"dup" };
  const list=[...mine]; list[idx]=s;
  return { map:{ ...map, [catId]:list }, edited:true, reason:"", name:s };
}
function renameSubcatInEntries(transactions, catId, oldText, newText) {
  return (transactions||[]).map(x=> x && x.category===catId && typeof x.subcategory==="string" && subKey(x.subcategory)===subKey(oldText) ? { ...x, subcategory:newText } : x);
}
function mergeSubcats(a, b) { const out={}; const A=cleanSubcats(a), B=cleanSubcats(b); new Set([...Object.keys(A),...Object.keys(B)]).forEach(k=>{ out[k]=[...(A[k]||[]),...(B[k]||[])]; }); return cleanSubcats(out); }
function readSubcats() { try { const r=localStorage.getItem(SUBCAT_KEY); return r ? cleanSubcats(JSON.parse(r)) : {}; } catch { return {}; } }
function writeSubcats(map) {   // an empty list removes the key instead of keeping an empty shell
  try { const c=cleanSubcats(map); if (!Object.keys(c).length) localStorage.removeItem(SUBCAT_KEY); else localStorage.setItem(SUBCAT_KEY,JSON.stringify({ version:1, byCategory:c })); return true; } catch { return false; }
}
// ─── Accounts, balances and transfers (Run 24; see handoff/DESIGN_NOTE_ACCOUNTS_TRANSFERS) ────────────────────────────────
// Accounts (a card, cash, a bank account) live in their own storage key with the transfers between them. An ordinary entry may carry
// an optional `account` id. A balance is never stored: opening balance + income − expenses (entries with that account) + transfers in −
// transfers out, all in whole cents. A transfer is its own record, so it can never count as income or spending.
const ACC_KEY=KEY+"__accounts", ACC_MAX=30, TRANSFER_MAX=2000, ACC_KINDS=["cash","card","wallet","bank","other"];
const accId=(v)=>typeof v==="string" && /^a_[a-z0-9]{3,12}$/.test(v) ? v : "";
const centsOf=(v)=>{ const n=Number(v); return Number.isFinite(n) ? Math.round(n*100) : 0; };
function cleanAccountData(raw) {
  const src=isPlainObject(raw) ? raw : {};
  const accounts=[], ids=new Set(), names=new Set();
  (Array.isArray(src.accounts)?src.accounts:[]).forEach(a=>{
    if (!isPlainObject(a) || accounts.length>=ACC_MAX) return;
    const id=accId(a.id), name=typeof a.name==="string" ? a.name.trim().replace(/\s+/g," ").slice(0,40) : "";
    if (!id || !name || ids.has(id) || names.has(name.toLowerCase())) return;
    const op=isPlainObject(a.opening) ? a.opening : {}, amt=Number(op.amount);
    ids.add(id); names.add(name.toLowerCase());
    accounts.push({ id, name, kind:ACC_KINDS.includes(a.kind)?a.kind:"other", opening:{ amount:Number.isFinite(amt)&&Math.abs(amt)<1e12 ? Math.round(amt*100)/100 : 0, date:isValidDateStr(op.date)?op.date:"" }, hidden:a.hidden===true });
  });
  const tids=new Set(), transfers=[];
  (Array.isArray(src.transfers)?src.transfers:[]).forEach(x=>{
    if (!isPlainObject(x) || transfers.length>=TRANSFER_MAX) return;
    const id=typeof x.id==="string" && /^t_[a-z0-9]{3,16}$/.test(x.id) ? x.id : "", amt=centsOf(x.amount);
    if (!id || tids.has(id) || !ids.has(accId(x.from)) || !ids.has(accId(x.to)) || x.from===x.to || !(amt>0) || amt>1e14 || !isValidDateStr(x.date)) return;
    tids.add(id); transfers.push({ id, from:x.from, to:x.to, amount:amt/100, date:x.date, note:typeof x.note==="string" ? x.note.trim().slice(0,80) : "" });
  });
  return { accounts, transfers };
}
function mergeAccountData(a, b) {   // by id: what is already here wins; transfers whose accounts are missing are dropped by the cleaner
  const A=cleanAccountData(a), B=cleanAccountData(b);
  const haveA=new Set(A.accounts.map(x=>x.id)), haveT=new Set(A.transfers.map(x=>x.id));
  return cleanAccountData({ accounts:[...A.accounts,...B.accounts.filter(x=>!haveA.has(x.id))], transfers:[...A.transfers,...B.transfers.filter(x=>!haveT.has(x.id))] });
}
function readAccounts() { try { const r=localStorage.getItem(ACC_KEY); return r ? cleanAccountData(JSON.parse(r)) : { accounts:[], transfers:[] }; } catch { return { accounts:[], transfers:[] }; } }
function writeAccounts(data) {
  try { const c=cleanAccountData(data); if (!c.accounts.length) localStorage.removeItem(ACC_KEY); else localStorage.setItem(ACC_KEY,JSON.stringify({ version:1, ...c })); return true; } catch { return false; }
}
// Run 26: the name of an account for a row label. Cached against the raw stored text, so listing many rows does not parse it again.
let _accRaw=null, _accMap={};
function accountName(id) {
  if (!accId(id)) return "";
  try { const raw=localStorage.getItem(ACC_KEY); if (raw!==_accRaw) { _accRaw=raw; _accMap={}; cleanAccountData(raw?JSON.parse(raw):null).accounts.forEach(a=>{ _accMap[a.id]=a.name; }); } } catch { return ""; }
  return _accMap[id]||"";
}
// Balance per account id, in money (exact to the cent). Entries whose account is unknown here are not counted anywhere.
// Run 28: a balance is "as of" a day (default: today). An entry or transfer dated AFTER that day has not happened yet, so it does not move
// the balance (a planned bill for the 20th must not lower the balance on the 5th). Entries without a valid date count, as before.
function accountBalances(data, transactions, asOf) {
  const d=cleanAccountData(data), out={}, cut=isValidDateStr(asOf) ? asOf : localDateStr();
  const happened=(date)=>!isValidDateStr(date) || date<=cut;
  d.accounts.forEach(a=>{ out[a.id]=centsOf(a.opening.amount); });
  (transactions||[]).forEach(x=>{ if (!x || !(accId(x.account) in out) || !happened(x.date)) return; const c=centsOf(x.amount); out[x.account]+= x.type==="income" ? c : x.type==="expense" ? -c : 0; });
  d.transfers.forEach(x=>{ if (!happened(x.date)) return; out[x.from]-=centsOf(x.amount); out[x.to]+=centsOf(x.amount); });
  Object.keys(out).forEach(k=>{ out[k]=out[k]/100; });
  return out;
}
function newAccId(prefix, used) { let id; do { id=prefix+Math.random().toString(36).slice(2,8).replace(/[^a-z0-9]/g,"a").padEnd(6,"a"); } while (used.has(id)); return id; }
function addAccount(data, name, kind, openingAmount, openingDate) {
  const d=cleanAccountData(data), n=typeof name==="string" ? name.trim().replace(/\s+/g," ") : "";
  if (!n) return { data:d, added:false, reason:"empty" };
  if (n.length>40) return { data:d, added:false, reason:"long" };
  if (d.accounts.length>=ACC_MAX) return { data:d, added:false, reason:"full" };
  if (d.accounts.some(a=>a.name.toLowerCase()===n.toLowerCase())) return { data:d, added:false, reason:"dup" };
  const amt=Number(openingAmount||0); if (!Number.isFinite(amt) || Math.abs(amt)>=1e12) return { data:d, added:false, reason:"amount" };
  const id=newAccId("a_",new Set(d.accounts.map(a=>a.id)));
  return { data:cleanAccountData({ accounts:[...d.accounts,{ id, name:n, kind, opening:{ amount:amt, date:openingDate||"" }, hidden:false }], transfers:d.transfers }), added:true, reason:"", id };
}
// Rename an account and/or set its opening amount (the date of the opening stays, or becomes the given date when it had none).
function editAccount(data, id, name, openingAmount, openingDate) {
  const d=cleanAccountData(data), cur=d.accounts.find(a=>a.id===id);
  if (!cur) return { data:d, edited:false, reason:"account" };
  const n=typeof name==="string" ? name.trim().replace(/\s+/g," ") : "";
  if (!n) return { data:d, edited:false, reason:"empty" };
  if (n.length>40) return { data:d, edited:false, reason:"long" };
  if (d.accounts.some(a=>a.id!==id && a.name.toLowerCase()===n.toLowerCase())) return { data:d, edited:false, reason:"dup" };
  const amt=Number(openingAmount); if (!Number.isFinite(amt) || Math.abs(amt)>=1e12) return { data:d, edited:false, reason:"amount" };
  const accounts=d.accounts.map(a=>a.id!==id ? a : { ...a, name:n, opening:{ amount:Math.round(amt*100)/100, date:a.opening.date||openingDate||"" } });
  return { data:cleanAccountData({ accounts, transfers:d.transfers }), edited:true, reason:"" };
}
function addTransfer(data, from, to, amount, date, note="") {
  const d=cleanAccountData(data), c=centsOf(amount);
  if (!d.accounts.some(a=>a.id===from) || !d.accounts.some(a=>a.id===to)) return { data:d, added:false, reason:"account" };
  if (from===to) return { data:d, added:false, reason:"same" };
  if (!(c>0)) return { data:d, added:false, reason:"amount" };
  if (!isValidDateStr(date)) return { data:d, added:false, reason:"date" };
  if (d.transfers.length>=TRANSFER_MAX) return { data:d, added:false, reason:"full" };
  const id=newAccId("t_",new Set(d.transfers.map(x=>x.id)));
  return { data:cleanAccountData({ accounts:d.accounts, transfers:[{ id, from, to, amount:c/100, date, note },...d.transfers] }), added:true, reason:"", id };
}
// Removing an account is refused while any entry or transfer uses it (hide it instead), so nothing is ever orphaned silently.
function accountInUse(data, id, transactions) { const d=cleanAccountData(data); return (transactions||[]).some(x=>x && x.account===id) || d.transfers.some(x=>x.from===id||x.to===id); }
// ─── Debts and loans (Run 17) ─────────────────────────────────────────────────
// Informal DEBTS (person to person) and formal LOANS (a rate and a schedule). All money is whole qapik (integers); interest is rounded
// half-up to the qapik each month. Stored under their own key, so the main saved-data key is never touched by this feature. The
// remaining balance of a debt is always derived from its payments, never stored. The schedule of a loan is an ESTIMATE from the terms
// the person typed: the bank's contract (its effective rate, day count and fees) is what counts, so a typed bank payment overrides ours.
const DEBTS_KEY="expense_ledger_v5__debts";
const LOAN_RATE_TYPES=["annuity","equal","flat","none"], LOAN_KINDS=["cash","card","taksit","other"], MAX_DEBTS=200, MAX_LOANS=100, MAX_QAPIK=1e12;
const isQapik=(v)=>Number.isInteger(v) && v>0 && v<=MAX_QAPIK;
function loanDate(first, i) {   // same day of the month, shortened to the month's last day when it is shorter (no drift)
  const [y,m,d]=first.split("-").map(Number); const idx=(m-1)+i, yy=y+Math.floor(idx/12), mm=((idx%12)+12)%12;
  const day=Math.min(d,new Date(yy,mm+1,0).getDate());
  return `${String(yy).padStart(4,"0")}-${String(mm+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}
function loanSchedule(l) {
  if (!isPlainObject(l) || !isQapik(l.principal) || !Number.isInteger(l.months) || l.months<1 || l.months>600 || !LOAN_RATE_TYPES.includes(l.rateType)) return null;
  const rate=l.rateType==="none" ? 0 : l.ratePct;
  if (typeof rate!=="number" || !Number.isFinite(rate) || rate<0 || rate>100) return null;
  if (typeof l.firstPayment!=="string" || !isValidDateStr(l.firstPayment)) return null;
  if (l.bankPayment!==null && l.bankPayment!==undefined && !isQapik(l.bankPayment)) return null;
  const P=l.principal, n=l.months, r=rate/1200, rows=[];
  let bal=P;
  const push=(i,payment,interest,principal)=>{ bal-=principal; rows.push({ n:i, date:loanDate(l.firstPayment,i-1), payment, interest, principal, balance:bal }); };
  if (l.rateType==="annuity") {
    const A=(l.bankPayment>0) ? l.bankPayment : (r===0 ? Math.round(P/n) : Math.round(P*r/(1-Math.pow(1+r,-n))));
    for (let i=1;i<=n && bal>0;i++) {
      const interest=Math.round(bal*r);
      if (i===n || A-interest>=bal) { push(i,bal+interest,interest,bal); break; }
      if (A<=interest) return null;                       // the payment never reduces the balance: refuse instead of inventing a plan
      push(i,A,interest,A-interest);
    }
  } else if (l.rateType==="equal") {
    const pr=Math.round(P/n);
    for (let i=1;i<=n && bal>0;i++) { const interest=Math.round(bal*r), part=(i===n||pr>=bal) ? bal : pr; push(i,part+interest,interest,part); }
  } else if (l.rateType==="flat") {
    const I=Math.round(P*rate/100*n/12), total=P+I, pay=Math.round(total/n), ip=Math.round(I/n);
    let paid=0, intPaid=0;
    for (let i=1;i<=n;i++) { const last=i===n, payment=last ? total-paid : pay, interest=last ? I-intPaid : ip; paid+=payment; intPaid+=interest; push(i,payment,interest,payment-interest); }
  } else {
    const base=Math.floor(P/n);
    for (let i=1;i<=n;i++) { const payment=i===n ? bal : base; push(i,payment,0,payment); }
  }
  const totalInterest=rows.reduce((s,p)=>s+p.interest,0), totalPaid=rows.reduce((s,p)=>s+p.payment,0);
  return { payments:rows, totalInterest, totalPaid };
}
// The yearly rate (in %) on the FALLING balance that an equal payment implies: used to show what "18% flat" really costs.
function impliedNominalPct(principal, months, payment) {
  const pv=(r)=>{ let s=0; for (let k=1;k<=months;k++) s+=payment/Math.pow(1+r,k); return s; };
  let lo=0, hi=1; if (pv(0)<principal) return null;
  for (let i=0;i<80;i++) { const mid=(lo+hi)/2; if (pv(mid)>principal) lo=mid; else hi=mid; }
  return ((lo+hi)/2)*1200;
}
// Run 20 (coach R12): what an extra payment made now would change, with the regular payment kept as it is. An ESTIMATE on the typed terms, for
// annuity loans only (the other repayment types do not shorten the same way). Returns null when it cannot say something true: other loan
// types, an invalid amount, a loan already paid, or an extra payment that would clear the whole balance (then the loan is simply paid off).
function loanExtraEffect(l, extra) {
  const sc=loanSchedule(l); if (!sc || l.rateType!=="annuity" || !isQapik(extra)) return null;
  const k=Math.min(Array.isArray(l.payments)?l.payments.length:0, sc.payments.length);
  if (k>=sc.payments.length) return null;
  const bal0=k===0 ? l.principal : sc.payments[k-1].balance;
  if (extra>=bal0) return null;
  const rows=sc.payments.slice(k), origMonths=rows.length, origInterest=rows.reduce((s,p)=>s+p.interest,0);
  const A=sc.payments[0].payment, r=(l.ratePct||0)/1200;
  let bal=bal0-extra, months=0, interest=0;
  while (bal>0) {
    const i=Math.round(bal*r); months++; interest+=i;
    if (months>origMonths) return null;
    if (A-i>=bal) break;                 // the last payment is whatever is left
    if (A<=i) return null;               // the payment never reduces the balance: say nothing rather than invent a plan
    bal-=A-i;
  }
  return { monthsSaved:origMonths-months, interestSaved:origInterest-interest, newMonths:months, origMonths };
}
function debtRemaining(d) { return Math.max(0,d.principal-(d.payments||[]).reduce((s,p)=>s+p.amount,0)); }
function debtCanPay(d, amount) { return isQapik(amount) && amount<=debtRemaining(d); }
// Run 28: net position = money in the visible accounts + money people owe you − what you owe − what is left on your loans. All in whole cents
// (the debts store keeps cents as integers, so there is no unit conversion). Loan balances come from the repayment schedule after the payments
// recorded so far, so they are ESTIMATES (an extra payment or a bank's own rounding can move them). Returns null when there is nothing owed
// either way, so a screen can stay quiet instead of repeating the accounts total.
function loanRemainingCents(l) {
  const sc=loanSchedule(l); if (!sc) return 0;
  const k=Math.min(Array.isArray(l.payments)?l.payments.length:0, sc.payments.length);
  return k>=sc.payments.length ? 0 : k===0 ? l.principal : Math.max(0,sc.payments[k-1].balance);
}
function netPosition(accountData, transactions, debtData, asOf) {
  const a=cleanAccountData(accountData), debts=cleanDebtData(debtData), bal=accountBalances(a,transactions,asOf);
  const accounts=a.accounts.filter(x=>!x.hidden).reduce((s,x)=>s+Math.round((bal[x.id]||0)*100),0);
  const owedToMe=debts.debts.filter(x=>x.direction==="owed").reduce((s,x)=>s+debtRemaining(x),0);
  const iOwe=debts.debts.filter(x=>x.direction==="owe").reduce((s,x)=>s+debtRemaining(x),0);
  const loans=debts.loans.reduce((s,x)=>s+loanRemainingCents(x),0);
  if (!owedToMe && !iOwe && !loans) return null;
  return { accounts, owedToMe, iOwe, loans, net:accounts+owedToMe-iOwe-loans };
}
function cleanPayments(list, withTxn) {
  if (!Array.isArray(list)) return [];
  const seen=new Set(), out=[];
  list.forEach(p=>{
    if (!isPlainObject(p) || typeof p.id!=="string" || !p.id.trim() || p.id.length>64 || seen.has(p.id) || typeof p.date!=="string" || !isValidDateStr(p.date) || !isQapik(p.amount)) return;
    seen.add(p.id);
    out.push({ id:p.id, date:p.date, amount:p.amount, ...(withTxn && (typeof p.txnId==="number"||typeof p.txnId==="string") && String(p.txnId).length<=64 ? { txnId:p.txnId } : {}) });
  });
  return out;
}
const cleanText=(v,max)=>typeof v==="string" ? Array.from(v.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim()).slice(0,max).join("") : "";
function cleanDebtData(raw) {
  const out={ debts:[], loans:[] };
  if (!isPlainObject(raw)) return out;
  const ids=new Set();
  (Array.isArray(raw.debts)?raw.debts:[]).forEach(d=>{
    if (out.debts.length>=MAX_DEBTS || !isPlainObject(d) || typeof d.id!=="string" || !d.id.trim() || d.id.length>64 || ids.has("d:"+d.id)) return;
    const name=cleanText(d.name,60);
    if (!name || !["owe","owed"].includes(d.direction) || !isQapik(d.principal)) return;
    ids.add("d:"+d.id);
    out.debts.push({ id:d.id, direction:d.direction, name, principal:d.principal, dueDate:(typeof d.dueDate==="string" && isValidDateStr(d.dueDate)) ? d.dueDate : "", note:cleanText(d.note,120), payments:cleanPayments(d.payments,true) });
  });
  (Array.isArray(raw.loans)?raw.loans:[]).forEach(l=>{
    if (out.loans.length>=MAX_LOANS || !isPlainObject(l) || typeof l.id!=="string" || !l.id.trim() || l.id.length>64 || ids.has("l:"+l.id)) return;
    const lender=cleanText(l.lender,60); if (!lender) return;
    const c={ id:l.id, lender, kind:LOAN_KINDS.includes(l.kind)?l.kind:"other", principal:l.principal, ratePct:l.rateType==="none"?0:l.ratePct, rateType:l.rateType, months:l.months, firstPayment:l.firstPayment, bankPayment:isQapik(l.bankPayment)?l.bankPayment:null, payments:cleanPayments(l.payments,true) };
    if (loanSchedule(c)===null) return;
    ids.add("l:"+l.id); out.loans.push(c);
  });
  return out;
}
function readDebts() { try { const r=localStorage.getItem(DEBTS_KEY); return cleanDebtData(r ? JSON.parse(r) : null); } catch { return { debts:[], loans:[] }; } }
// Run 18: unreadable or corrupt debts data is NEVER treated as an empty list that a later save may overwrite.
//  corrupt / unreadable: the stored value stays exactly as it is, one safe copy is kept, every write is refused (an empty write too).
//  partial (some records cannot be read): a safe copy of the original text is kept BEFORE the first write that would drop them.
let DEBTS_PRESERVED=null;   // the raw text last kept as a safe copy, so repeated saves do not pile up copies
function debtsHealth() {
  let raw; try { raw=localStorage.getItem(DEBTS_KEY); } catch { return { status:"unreadable", dropped:0, raw:null }; }
  if (raw===null || raw===undefined) return { status:"missing", dropped:0, raw:null };
  let parsed; try { parsed=JSON.parse(raw); } catch { return { status:"corrupt", dropped:0, raw }; }
  if (!isPlainObject(parsed) || (parsed.debts!==undefined && !Array.isArray(parsed.debts)) || (parsed.loans!==undefined && !Array.isArray(parsed.loans))) return { status:"corrupt", dropped:0, raw };
  const c=cleanDebtData(parsed), total=(parsed.debts||[]).length+(parsed.loans||[]).length, kept=c.debts.length+c.loans.length;
  return kept<total ? { status:"partial", dropped:total-kept, raw } : { status:"ok", dropped:0, raw };
}
function writeDebts(data) {   // nothing to keep removes the key instead of storing an empty shell
  try {
    const h=debtsHealth();
    if (h.status==="unreadable" || h.status==="corrupt") { if (h.raw!==null && h.raw!==DEBTS_PRESERVED && preserveRaw("debts_unreadable",h.raw)) DEBTS_PRESERVED=h.raw; return false; }
    if (h.status==="partial" && h.raw!==DEBTS_PRESERVED) { if (!preserveRaw("debts_dropped",h.raw)) return false; DEBTS_PRESERVED=h.raw; }
    const c=cleanDebtData(data); if (!c.debts.length && !c.loans.length) localStorage.removeItem(DEBTS_KEY); else localStorage.setItem(DEBTS_KEY,JSON.stringify({ version:1, ...c })); return true; } catch { return false; }
}
function mergeDebtData(a, b) {
  const A=cleanDebtData(a), B=cleanDebtData(b);
  const dh=new Set(A.debts.map(d=>d.id)), lh=new Set(A.loans.map(l=>l.id));
  return cleanDebtData({ debts:[...A.debts,...B.debts.filter(d=>!dh.has(d.id))], loans:[...A.loans,...B.loans.filter(l=>!lh.has(l.id))] });
}

// ─── Financial Coach, first rules (Run 17) ────────────────────────────────────
// From the research rulebook: R0 data gate, R1 spent vs recorded income, R9 instalment due soon / overdue, R13 money owed to you is late.
// Facts with their window, never a score. A rule without enough data says so rather than showing a figure. Returns plain cards
// ({id, ...numbers}); the screen words them. Amounts from the Debts page are whole qapik.
function calcCoach(transactions, debtData, now=new Date(), bills=[]) {
  const txns=Array.isArray(transactions)?transactions:[], dd=debtData&&typeof debtData==="object"?debtData:{};
  const todayS=localDateStr(now), t0=new Date(now); t0.setDate(t0.getDate()-29);
  const startS=localDateStr(t0), midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
  const daysTo=(ds)=>{ const [y,m,d]=String(ds).split("-").map(Number); return Math.round((new Date(y,m-1,d).getTime()-midnight)/86400000); };
  const actions=[], numbers=[];
  (Array.isArray(dd.loans)?dd.loans:[]).forEach(l=>{
    const sc=loanSchedule(l), k=Array.isArray(l.payments)?l.payments.length:0;
    if (!sc || k>=sc.payments.length) return;
    const next=sc.payments[k], dt=daysTo(next.date);
    if (dt<0) actions.push({ id:"loanOverdue", lender:l.lender, amount:next.payment, date:next.date });
    else if (dt<=7) actions.push({ id:"loanDue", lender:l.lender, amount:next.payment, date:next.date });
  });
  (Array.isArray(dd.debts)?dd.debts:[]).forEach(d=>{
    if (d.direction==="owed" && d.dueDate && d.dueDate<todayS && debtRemaining(d)>0) actions.push({ id:"owedLate", name:d.name, amount:debtRemaining(d), date:d.dueDate });
  });
  const win=txns.filter(x=>x.date>=startS && x.date<=todayS), future=txns.filter(x=>x.date>todayS).length;
  if (win.length>0) {
    const days=new Set(win.map(x=>x.date)).size;
    if (days<14 || win.length<15) numbers.push({ id:"incomplete", days });
    else {
      const inc=win.filter(x=>x.type==="income").reduce(addAmt,0), exp=win.filter(x=>x.type==="expense").reduce(addAmt,0);
      if (!(inc>0)) numbers.push({ id:"noIncome" });
      else { const pct=Math.round(exp/inc*100); numbers.push(exp<=inc ? { id:"spent", pct, kept:100-pct } : { id:"over", pct:Math.max(101,pct) }); }
    }
  }
  if (future>0) numbers.push({ id:"future", n:future });
  // Run 18 (rulebook R8, R11, R14, R15). Only what was entered; thresholds are design defaults (45% and 70%), not legal limits.
  const past=txns.filter(x=>x.date<=todayS);
  if (past.length>0) {
    const last=past.reduce((m,x)=>x.date>m?x.date:m,"0000-00-00");
    if (daysTo(last)<-3) numbers.unshift({ id:"welcome" });
  }
  const monKey=(d)=>d.getFullYear()*12+d.getMonth(), curK=monKey(now);
  const incBy={}; let firstK=null;
  past.forEach(x=>{ const [y,m]=String(x.date).split("-").map(Number); const k=y*12+(m-1); if (firstK===null||k<firstK) firstK=k; if (x.type==="income") incBy[k]=Math.round(((incBy[k]||0)+(Number(x.amount)||0))*100)/100; });
  if (firstK!==null) {
    const from=Math.max(firstK,curK-6), months=[]; for (let k=from;k<curK;k++) months.push(k);
    if (months.length>=4) {
      const vals=months.map(k=>incBy[k]||0), avg=vals.reduce((a,b)=>a+b,0)/vals.length, low=Math.min(...vals);
      if (avg>0 && low<0.7*avg) numbers.push({ id:"incomeDip", have:vals.filter(v=>v>0).length, of:vals.length, pct:Math.round(low/avg*100) });
      const loans=(Array.isArray(dd.loans)?dd.loans:[]).map(l=>({ sc:loanSchedule(l), k:Array.isArray(l.payments)?l.payments.length:0 })).filter(o=>o.sc&&o.k<o.sc.payments.length);
      if (avg>0 && loans.length) {
        const monthly=loans.reduce((s,o)=>s+o.sc.payments[o.k].payment,0)/100, pct=Math.round(monthly/avg*100);
        numbers.push({ id:pct>=45?"loanShareHigh":"loanShare", pct });
      }
    }
  }
  (Array.isArray(dd.loans)?dd.loans:[]).forEach(l=>{
    const sc=loanSchedule(l), k=Array.isArray(l.payments)?l.payments.length:0;
    if (!sc || k>=sc.payments.length-1) return;
    const row=sc.payments[k]; if (row.interest>=row.payment && row.interest>0) numbers.push({ id:"noCover", lender:l.lender });
  });
  // Run 18g (rulebook R3): the monthly estimate of active expense bills against the average income of up to six completed months
  // (at least two months with income recorded). A fact, with no threshold; paused bills and income schedules are left out.
  if (firstK!==null) {
    const from=Math.max(firstK,curK-6), vals=[]; for (let k=from;k<curK;k++) vals.push(incBy[k]||0);
    const avg=vals.length>=2 ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
    const monthly=buildSchedules(txns,Array.isArray(bills)?bills:[]).filter(s=>s.isActive&&s.type==="expense"&&s.billId).reduce((a,s)=>a+scheduleMonthly(s),0);
    if (avg>0 && monthly>0 && vals.filter(v=>v>0).length>=2) numbers.push({ id:"billsShare", pct:Math.round(monthly/avg*100) });
  }
  // Run 18f (rulebook R7, R10). R7: a category this month at least 50% (and 20 or more) above its average of the three earlier months,
  // only with all three earlier months present; the biggest rise only. R10: interest still to pay on each running loan (qapik).
  {
    const spend=forSpending(past.filter(x=>x.type==="expense")), byCat={}, seen=new Set();
    spend.forEach(x=>{ const [y,m]=String(x.date).split("-").map(Number); const k=y*12+(m-1); seen.add(k); if (!byCat[x.category]) byCat[x.category]={}; byCat[x.category][k]=Math.round(((byCat[x.category][k]||0)+(Number(x.amount)||0))*100)/100; });
    if ([1,2,3].every(i=>seen.has(curK-i))) {
      let best=null;
      Object.keys(byCat).forEach(c=>{
        // Whole cents, no division: "at least 50% above the average of 3 months" is 2×current ≥ sum of the 3 months, and "20 or more above" is 3×current − sum ≥ 60.
        const curC=Math.round((byCat[c][curK]||0)*100), prevC=[1,2,3].reduce((s,i)=>s+Math.round((byCat[c][curK-i]||0)*100),0);
        if (prevC>0 && 2*curC>=prevC && 3*curC-prevC>=6000 && (!best || (3*curC-prevC)/3>best.d)) best={ d:(3*curC-prevC)/3, id:"catUp", cat:c, pct:Math.round((curC*3/prevC-1)*100) };
      });
      if (best) numbers.push({ id:best.id, cat:best.cat, pct:best.pct });
    }
  }
  (Array.isArray(dd.loans)?dd.loans:[]).forEach(l=>{
    const sc=loanSchedule(l), k=Array.isArray(l.payments)?l.payments.length:0;
    if (!sc || k>=sc.payments.length) return;
    const amount=sc.payments.slice(k).reduce((s,p)=>s+(Number(p.interest)||0),0);
    if (amount>0) numbers.push({ id:"loanInterest", lender:l.lender, amount:Math.round(amount) });
  });
  return [...actions.sort((a,b)=>(a.id==="loanOverdue"?0:1)-(b.id==="loanOverdue"?0:1)), ...numbers];
}
function isBillId(v) { return typeof v==="string" && v.trim()!=="" && v.trim().length<=64; }

// "Hide amounts" is remembered until the user changes it (Run 20, owner request): it is a preference, kept under its own key like the other
// side settings, so the ledger key is not touched. An unreadable or blocked store simply means "off".
// ─── Colour themes (Run 25, owner-supplied palettes) ───────────────────────────────────────────────────────────────────────────────
// A theme is a set of overrides for the CSS colour variables, applied to the page root; "sea" (the original look) has none. The choice
// is a plain preference in its own storage key (not in the ledger, so backups and imports never touch it). Meaning colours (income,
// spending, warning) stay readable on every theme: tests/logic/run25themes checks the contrast of every text colour on every surface.
const THEME_KEY=`${KEY}__theme`;
const DARK_MEANING={ "--violet":"#B3A1FF","--info":"#83B9F5","--pos":"#8BD97A","--pos-bg":"#173622","--neg":"#FF8188","--neg-bg":"#3B1C22","--warn":"#F0C46F","--warn-bg":"#352B14" };
const THEMES={
  sea:{ swatch:["#07151A","#4CC9C4"], dark:true, vars:{} },
  nordic:{ swatch:["#1F2933","#A68A64"], dark:true, vars:{ ...DARK_MEANING,
    "--bg":"#171E26","--bg-card":"#1F2933","--bg-warm":"#2B3745","--bg-inset":"#232D39","--ink":"#F7F7F2","--ink-2":"#E2E3DE","--ink-3":"#B3B8BF","--ink-4":"#A0A7AF","--ink-5":"#3A4756",
    "--rule":"#34414F","--rule-2":"#4B5B6C","--accent":"#C2A57C","--accent-light":"#3A3226","--accent-mid":"#D6BE9C","--accent-text":"#C2A57C","--accent-fill":"#A68A64","--on-accent":"#14181D" } },
  mist:{ swatch:["#DEDCDC","#57707A"], dark:false, vars:{
    "--bg":"#DEDCDC","--bg-card":"#EDEBEB","--bg-warm":"#D9D7D9","--bg-inset":"#E6E4E4","--ink":"#191D23","--ink-2":"#2D333B","--ink-3":"#4A525C","--ink-4":"#4B5661","--ink-5":"#B5B7BD",
    "--rule":"#C6C4C6","--rule-2":"#A9AAB0","--accent":"#3A535D","--accent-light":"#CFD9DE","--accent-mid":"#57707A","--accent-text":"#3A535D","--accent-fill":"#57707A","--on-accent":"#FFFFFF",
    "--violet":"#5B43C7","--info":"#1F5A9E","--pos":"#1B6B3A","--pos-bg":"#D5E6D1","--neg":"#A8360A","--neg-bg":"#F0D6D3","--warn":"#7A5200","--warn-bg":"#EBDDB9" } },
  dusk:{ swatch:["#0B132B","#D97706"], dark:true, vars:{ ...DARK_MEANING,
    "--bg":"#0B132B","--bg-card":"#1C2541","--bg-warm":"#26365A","--bg-inset":"#16203D","--ink":"#FBF1E3","--ink-2":"#EAD9C0","--ink-3":"#B7C3D9","--ink-4":"#A3B0C8","--ink-5":"#3A506B",
    "--rule":"#2C3A5E","--rule-2":"#46608A","--accent":"#F0A44B","--accent-light":"#38281A","--accent-mid":"#F4D6B0","--accent-text":"#F0A44B","--accent-fill":"#D97706","--on-accent":"#0B132B" } },
  sapphire:{ swatch:["#000926","#0F52BA"], dark:true, vars:{ ...DARK_MEANING,
    "--bg":"#000926","--bg-card":"#08143A","--bg-warm":"#10276A","--bg-inset":"#0B1B4D","--ink":"#E4EEF7","--ink-2":"#D6E6F3","--ink-3":"#A6C5D7","--ink-4":"#93B2C6","--ink-5":"#1E3A7A",
    "--rule":"#16295F","--rule-2":"#2D4FA0","--accent":"#6FA3F5","--accent-light":"#0F2A63","--accent-mid":"#A6C5D7","--accent-text":"#6FA3F5","--accent-fill":"#0F52BA","--on-accent":"#FFFFFF" } },
  cocoa:{ swatch:["#1A120E","#A88462"], dark:true, vars:{ ...DARK_MEANING,
    "--bg":"#1A120E","--bg-card":"#261A13","--bg-warm":"#3A2418","--bg-inset":"#2E1F16","--ink":"#F2E8DA","--ink-2":"#D5C4AE","--ink-3":"#B9A58B","--ink-4":"#A8947B","--ink-5":"#4A3426",
    "--rule":"#3A2A1F","--rule-2":"#5A4130","--accent":"#C9A882","--accent-light":"#3A2A1C","--accent-mid":"#D5C4AE","--accent-text":"#C9A882","--accent-fill":"#A88462","--on-accent":"#1A120E" } },
};
const THEME_IDS=Object.keys(THEMES);
const themeId=(v)=>typeof v==="string" && Object.prototype.hasOwnProperty.call(THEMES,v) ? v : "sea";
function readTheme() { try { return themeId(localStorage.getItem(THEME_KEY)); } catch { return "sea"; } }
function writeTheme(id) { try { if (themeId(id)==="sea") localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY,themeId(id)); return true; } catch { return false; } }
function applyTheme(id) {   // sets (or clears) the colour variables on the page root; safe to call before the app renders
  if (typeof document==="undefined" || !document.documentElement) return;
  const th=THEMES[themeId(id)], root=document.documentElement, all=new Set(Object.values(THEMES).flatMap(x=>Object.keys(x.vars)));
  all.forEach(k=>root.style.removeProperty(k));
  Object.entries(th.vars).forEach(([k,v])=>root.style.setProperty(k,v));
  root.style.colorScheme=th.dark?"dark":"light"; root.setAttribute("data-theme",themeId(id));
  const m=document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content",th.vars["--bg"]||th.swatch[0]);
}
if (typeof document!=="undefined") applyTheme(readTheme());

// Run 25: "Reduce effects" - a plain preference (own key). Turns off shadows and highlights; tone and hairline edges stay, so layers remain readable.
const FX_KEY=KEY+"__fx";
function readFxOff() { try { return localStorage.getItem(FX_KEY)==="off"; } catch { return false; } }
function writeFxOff(off) { try { if (off) localStorage.setItem(FX_KEY,"off"); else localStorage.removeItem(FX_KEY); return true; } catch { return false; } }
function applyFx(off) { if (typeof document==="undefined" || !document.documentElement) return; if (off) document.documentElement.setAttribute("data-fx","off"); else document.documentElement.removeAttribute("data-fx"); }
if (typeof document!=="undefined") applyFx(readFxOff());
const PRIVACY_KEY=`${KEY}__privacy`;
function readPrivacy() { try { return localStorage.getItem(PRIVACY_KEY)==="1"; } catch { return false; } }
function writePrivacy(on) { try { if (on) localStorage.setItem(PRIVACY_KEY,"1"); else localStorage.removeItem(PRIVACY_KEY); return true; } catch { return false; } }

// ─── App lock (Run 19) ───────────────────────────────────────────────────────
// A PIN (4–6 digits) and, where the phone allows, a fingerprint prompt keep other people out of the app's screens. It is NOT
// encryption: the ledger stays readable in this browser's storage and the backup files are unchanged. The PIN is never stored;
// only a salted PBKDF2-SHA-256 hash is, under its own key (expense_ledger_v5__lock), which a backup never contains and an import
// never touches. Forgetting the PIN can be fixed on the lock screen (after a short wait) without deleting any record.
const LOCK_KEY=`${KEY}__lock`;
const LOCK_TIMEOUTS=[0,1,5,15];            // minutes; 0 = lock whenever the app is left or reopened
const LOCK_ITER=150000;
function validPin(p) { return typeof p==="string" && /^[0-9]{4,6}$/.test(p); }
function lockSupported() { try { return typeof crypto!=="undefined" && !!crypto.subtle && typeof crypto.getRandomValues==="function"; } catch { return false; } }
function toB64(buf) { let s=""; new Uint8Array(buf).forEach(b=>{ s+=String.fromCharCode(b); }); return btoa(s); }
function fromB64(s) { const bin=atob(String(s)), out=new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out; }
async function pinHash(pin, saltB64, iter) {
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(pin),"PBKDF2",false,["deriveBits"]);
  return toB64(await crypto.subtle.deriveBits({ name:"PBKDF2", hash:"SHA-256", salt:fromB64(saltB64), iterations:iter },key,256));
}
function sameText(a, b) { a=String(a); b=String(b); let d=a.length^b.length; for (let i=0;i<Math.max(a.length,b.length);i++) d|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0); return d===0; }
// null = no lock; { ok:true, rec } = a lock; { ok:false } = the lock record exists but cannot be read (the lock screen then offers the reset only).
function readLock() {
  // Storage that cannot be read at all (blocked by the browser) holds no lock to enforce, and the ledger is unreadable too: the app already
  // shows its "saving is paused" notice. Treating that as a damaged lock would lock the user out of an app that otherwise works.
  let raw; try { raw=localStorage.getItem(LOCK_KEY); } catch { return null; }
  if (raw===null) return null;
  try {
    const r=JSON.parse(raw);
    if (!isPlainObject(r) || r.v!==1 || typeof r.salt!=="string" || typeof r.hash!=="string" || !Number.isInteger(r.iter) || r.iter<1000 || r.iter>2000000) return { ok:false };
    return { ok:true, rec:{ v:1, salt:r.salt, hash:r.hash, iter:r.iter, timeout:LOCK_TIMEOUTS.includes(r.timeout)?r.timeout:0,
      bio:typeof r.bio==="string" && r.bio ? r.bio : null, len:Number.isInteger(r.len)&&r.len>=4&&r.len<=6?r.len:0, resetAt:Number.isFinite(r.resetAt)&&r.resetAt>0?r.resetAt:0, fails:Number.isInteger(r.fails)&&r.fails>0?r.fails:0, until:Number.isFinite(r.until)&&r.until>0?r.until:0 } };
  } catch { return { ok:false }; }
}
function writeLock(rec) { try { localStorage.setItem(LOCK_KEY,JSON.stringify(rec)); return true; } catch { return false; } }
function removeLock() { try { localStorage.removeItem(LOCK_KEY); return true; } catch { return false; } }
async function makeLockRecord(pin, timeout=0, bio=null) {
  if (!validPin(pin) || !lockSupported()) return null;
  const salt=toB64(crypto.getRandomValues(new Uint8Array(16)));
  return { v:1, salt, hash:await pinHash(pin,salt,LOCK_ITER), iter:LOCK_ITER, timeout:LOCK_TIMEOUTS.includes(timeout)?timeout:0, bio, len:pin.length, fails:0, until:0 };
}
async function verifyPin(rec, pin) { if (!rec || !validPin(pin) || !lockSupported()) return false; try { return sameText(await pinHash(pin,rec.salt,rec.iter),rec.hash); } catch { return false; } }
// Wrong PINs: the first four are free, then the wait doubles from 30 s up to 5 minutes. Stored, so closing the app does not reset it.
function lockWaitMs(fails) { return fails<5 ? 0 : Math.min(300000, 30000*Math.pow(2,fails-5)); }
// When the app should lock. "away" = how long it was out of sight; "idle" = how long without a touch or key while open.
function lockShouldEngage(timeoutMin, event, ms) {
  if (event==="away") return timeoutMin===0 ? true : ms>=timeoutMin*60000;
  if (event==="idle") return timeoutMin>0 && ms>=timeoutMin*60000;
  return false;
}
// Fingerprint through the phone's own prompt (WebAuthn "platform" authenticator, user verification required). The app has no server
// to check the result against, so this is a convenience in front of the PIN, never a replacement for it.
async function bioAvailable() { try { return typeof PublicKeyCredential!=="undefined" && !!navigator.credentials && lockSupported() && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch { return false; } }
async function bioRegister() {
  const cred=await navigator.credentials.create({ publicKey:{ challenge:crypto.getRandomValues(new Uint8Array(32)), rp:{ name:"Expense Ledger" },
    user:{ id:crypto.getRandomValues(new Uint8Array(16)), name:"ledger", displayName:"Expense Ledger" }, pubKeyCredParams:[{ type:"public-key", alg:-7 },{ type:"public-key", alg:-257 }],
    authenticatorSelection:{ authenticatorAttachment:"platform", userVerification:"required", residentKey:"discouraged" }, timeout:60000 } });
  return cred ? toB64(cred.rawId) : null;
}
async function bioCheck(idB64) {
  const r=await navigator.credentials.get({ publicKey:{ challenge:crypto.getRandomValues(new Uint8Array(32)), allowCredentials:[{ type:"public-key", id:fromB64(idB64) }], userVerification:"required", timeout:30000 } });
  return !!r;
}

// ─── Settings contract (used for stored data AND imported backups) ───────────
// Each section is validated on its own. Invalid entries are skipped and reported; a section whose entries are ALL
// invalid is rejected so your current value is kept. Sections absent from the source are simply not returned.
// Run 12: version 10 adds explicit bills ("bills" + each payment's "billId"). Version 9 files import unchanged.
const BACKUP_VERSION = 10;
const EXPENSE_CAT_IDS = () => CATEGORIES.filter(c=>!c.income).map(c=>c.id);
function budgetKey(k) {
  const ids=EXPENSE_CAT_IDS();
  if (ids.includes(k)) return k;
  const m=CATEGORY_MAP[String(k).toLowerCase()];            // exact legacy id only — no fuzzy guessing for budgets
  return m && ids.includes(m) ? m : null;
}
function validateSettings(src) {
  const settings={}, problems=[], warnings=[];
  const has=(k)=>src[k]!==undefined && src[k]!==null;
  const ids=EXPENSE_CAT_IDS();

  if (has("budgets")) {
    if (!isPlainObject(src.budgets)) problems.push(t("settings.budgetsNotList"));
    else {
      const out={}; let bad=0; const entries=Object.entries(src.budgets);
      entries.forEach(([k,v])=>{ const id=budgetKey(k), n=parseMoney(v); if (!id||n===null) bad++; else if (out[id]===undefined) out[id]=n; });
      if (entries.length && !Object.keys(out).length) problems.push(tn("settings.budgetsAllBad",entries.length));
      else { settings.budgets=out; if (bad) problems.push(tn("settings.budgetsSomeBad",bad)); }
    }
  }
  if (has("templates")) {
    if (!Array.isArray(src.templates)) problems.push(t("settings.templatesNotList"));
    else {
      const out=[], used=new Set(); let bad=0;
      src.templates.forEach((t,i)=>{
        if (!isPlainObject(t)) { bad++; return; }
        const name=typeof t.name==="string" ? t.name.trim() : "";
        const amount=parseMoney(t.amount,{positive:true});
        const catId=typeof t.catId==="string" && ids.includes(t.catId) ? t.catId : null;
        if (!name || name.length>60 || amount===null || !catId) { bad++; return; }
        let id=typeof t.id==="string" && t.id ? t.id : `t${Date.now()}_${i}`;
        while (used.has(id)) id+="_"; used.add(id);
        out.push({ id, name, amount, catId, subcat:txt(t.subcat).slice(0,40), merchant:txt(t.merchant).slice(0,80), note:txt(t.note).slice(0,120) });
      });
      if (src.templates.length && !out.length) problems.push(tn("settings.templatesAllBad",src.templates.length));
      else { settings.templates=out; if (bad) problems.push(tn("settings.templatesSomeBad",bad)); }
    }
  }
  if (has("goals")) {
    if (!Array.isArray(src.goals)) problems.push(t("settings.goalsNotList"));
    else {
      const out=[], used=new Set(); let bad=0;
      src.goals.forEach((g,i)=>{
        if (!isPlainObject(g)) { bad++; return; }
        const name=typeof g.name==="string" ? g.name.trim() : "";
        const target=parseMoney(g.target,{positive:true});
        const saved=(g.saved===undefined||g.saved===null||g.saved==="") ? 0 : parseMoney(g.saved);
        const monthly=(g.monthlyTarget===undefined||g.monthlyTarget===null||g.monthlyTarget==="") ? 0 : parseMoney(g.monthlyTarget);
        const hasDate=!(g.targetDate===undefined||g.targetDate===null||g.targetDate==="");
        if (!name || name.length>80 || target===null || saved===null || monthly===null || (hasDate && !isValidDateStr(g.targetDate))) { bad++; return; }
        let id=typeof g.id==="string" && g.id ? g.id : `g${Date.now()}_${i}`;
        while (used.has(id)) id+="_"; used.add(id);
        out.push({ id, name, target, saved, monthlyTarget:monthly, targetDate:hasDate?g.targetDate:null });
      });
      if (src.goals.length && !out.length) problems.push(tn("settings.goalsAllBad",src.goals.length));
      else { settings.goals=out; if (bad) problems.push(tn("settings.goalsSomeBad",bad)); }
    }
  }
  if (has("bills")) {
    if (!Array.isArray(src.bills)) problems.push(t("settings.billsNotList"));
    else {
      const out=[], used=new Set(); let bad=0;
      src.bills.forEach(b=>{ const v=validateBill(b); if (!v || used.has(v.id)) { bad++; return; } used.add(v.id); out.push(v); });
      if (src.bills.length && !out.length) problems.push(tn("settings.billsAllBad",src.bills.length));
      else { settings.bills=out; if (bad) problems.push(tn("settings.billsSomeBad",bad)); }
    }
  }
  if (has("currency")) {
    const c=typeof src.currency==="string" ? src.currency.trim() : "";
    if (c && c.length<=3 && !/[\u0000-\u001f]/.test(c)) settings.currency=c;
    else problems.push(t("settings.currencyBad"));
  }
  if (has("safeToSpend")) {
    const sts=src.safeToSpend;
    const target=(isPlainObject(sts) && (sts.savingsTarget===undefined||sts.savingsTarget===null||sts.savingsTarget==="")) ? 0 : (isPlainObject(sts) ? parseMoney(sts.savingsTarget) : null);
    const enabledOk=isPlainObject(sts) && (sts.enabled===undefined || typeof sts.enabled==="boolean");
    if (isPlainObject(sts) && enabledOk && target!==null) settings.safeToSpend={ savingsTarget:target, enabled:!!sts.enabled };
    else problems.push(t("settings.safeBad"));
  }
  return { settings, problems, warnings };
}

// Reads one key: { value } (null = nothing stored) or { failed:true } when the browser refused the read. A refused read is
// never treated as "nothing stored": that would look like a fresh install and the next save would overwrite the real data.
function readKey(k) { try { return { value:localStorage.getItem(k) }; } catch { return { failed:true }; } }

function migrateAndLoad() {
  const cur=readKey(KEY);
  if (cur.failed) {
    // The data may well be there; it just cannot be read right now. Show an empty view, pause saving, migrate nothing.
    SAVE_BLOCKED=true; SAVE_BLOCKED_READ=true; noteLoad(t("load.readFailed"));
    return { ...buildState([], null), language:"en" };
  }
  const rawStr=cur.value;
  let current=null;
  // An empty string is present-but-unusable data, not absence: it goes through the corrupt path below and is preserved.
  if (rawStr!==null && rawStr!=="") { try { current=JSON.parse(rawStr); } catch { current=null; } }

  if (isPlainObject(current) && Array.isArray(current.transactions)) {
    // Interface language: a saved choice is used (and set first, so load notices appear in it). Data saved by an earlier
    // version has no "language" field: that user has been using English, so they continue in English without the
    // first-launch chooser. Only an explicit null (a fresh install that has not chosen yet) shows the chooser again.
    const language=LANGS.includes(current.language) ? current.language : (current.language===null ? null : "en");
    if (language) setLang(language);
    const v=validateSettings(current);
    if (v.problems.length) {
      const kept=preserveRaw("settings_rejected",{ budgets:current.budgets, templates:current.templates, currency:current.currency, goals:current.goals, safeToSpend:current.safeToSpend, bills:current.bills });
      if (!kept) SAVE_BLOCKED=true;
      noteLoad(t(kept ? "load.settingsResetKept" : "load.settingsResetBlocked"));
    }
    const lastBackup=(typeof current.lastBackup==="string" && !Number.isNaN(Date.parse(current.lastBackup))) ? current.lastBackup : null;
    const backupConfirmedAt=(typeof current.backupConfirmedAt==="string" && !Number.isNaN(Date.parse(current.backupConfirmedAt))) ? current.backupConfirmedAt : null;
    return {
      transactions: sanitizeTransactions(current.transactions, "rejected"),
      budgets:      v.settings.budgets     ?? {},
      templates:    v.settings.templates   ?? DEFAULT_TEMPLATES,
      currency:     v.settings.currency    ?? "₼",
      goals:        v.settings.goals       ?? [],
      safeToSpend:  v.settings.safeToSpend ?? { savingsTarget:0, enabled:false },
      bills:        v.settings.bills       ?? [],
      lastBackup,
      backupConfirmedAt,
      language,
      profileName:  cleanProfileName(current.profileName),
      setupHidden:  current.setupHidden===true,                // Run 17: the Home "Get set up" list was hidden for good
    };
  }

  // Something is stored under the current key but we cannot use it: keep a copy before anything overwrites it.
  if (rawStr!==null) {
    if (preserveRaw("corrupt", rawStr)) noteLoad(t("load.corruptKept"));
    else { SAVE_BLOCKED=true; noteLoad(t("load.corruptBlocked")); }
  }

  // Legacy key migration. Older keys are only read, never modified or removed.
  let merged=[], bestSettings=null, legacyFound=false;
  const seenIds=new Set();   // de-duplicate on the ORIGINAL id, before normalisation may replace it
  for (const k of KEYS_LEGACY) {
    const r=readKey(k);
    // A refused read could hide that version's data behind the new key written on the next save: pause saving instead.
    if (r.failed) { SAVE_BLOCKED=true; SAVE_BLOCKED_READ=true; noteLoad(t("load.legacyReadFailed")); legacyFound=true; continue; }
    if (r.value===null) continue;
    let d=null; try { d=JSON.parse(r.value); } catch { d=null; }
    if (!isPlainObject(d)) {
      // Unparseable older data stays in its key, but the new key would hide it from then on: keep a recovery copy first.
      legacyFound=true;
      if (preserveRaw(`legacy_${k}_corrupt`, r.value)) noteLoad(t("load.legacyCorruptKept"));
      else { SAVE_BLOCKED=true; noteLoad(t("load.corruptBlocked")); }
      continue;
    }
    const list=Array.isArray(d.transactions)?d.transactions:Array.isArray(d.entries)?d.entries:[];
    const bad=[];
    list.forEach(t=>{
      const reason=checkRawTxn(t);
      if (reason) { bad.push({ record:t, reason }); return; }
      const rid=(t.id!==undefined && t.id!==null && t.id!=="") ? String(t.id) : null;
      if (rid!==null && seenIds.has(rid)) return;
      if (rid!==null) seenIds.add(rid);
      merged.push(normaliseTxn(t));
    });
    setAside(`legacy_${k}_rejected`, bad.map(b=>b.record), summariseReasons(bad));
    if (d.currency||d.budgets) bestSettings=d;
  }
  merged=ensureUniqueIds(merged).list;
  merged.sort((a,b)=>b.date.localeCompare(a.date));
  // Anything found (unreadable current data or older versions' data) means an existing user → English, no chooser.
  // Nothing at all means a genuinely fresh install → language null → the first-launch chooser is shown.
  const existingUser=rawStr!==null || merged.length>0 || !!bestSettings || legacyFound;
  return { ...buildState(merged, bestSettings), language: existingUser ? "en" : null };
}

function buildState(transactions=[], settings=null) {
  // No seed data — real users start empty
  const v=isPlainObject(settings) ? validateSettings(settings) : { settings:{}, problems:[] };
  return {
    transactions,
    budgets:     v.settings.budgets     ?? {},
    templates:   v.settings.templates   ?? DEFAULT_TEMPLATES,
    currency:    v.settings.currency    ?? "₼",
    goals:       v.settings.goals       ?? [],
    safeToSpend: v.settings.safeToSpend ?? { savingsTarget:0, enabled:false },
    bills:       v.settings.bills       ?? [],
    lastBackup:  null,
    backupConfirmedAt: null,
    language:    null,
    profileName: "",
    setupHidden: false,
  };
}

// Run 17: the optional name used in the Home greeting. Plain text only: control characters removed, spaces collapsed, 30 characters at most.
// It lives in the app's own saved state and is NOT part of backups or exports (it is not financial data and a backup may be shared).
const PROFILE_NAME_MAX=30;
function cleanProfileName(v) {
  if (typeof v!=="string") return "";
  return Array.from(v.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim()).slice(0,PROFILE_NAME_MAX).join("").trim();
}

const DEFAULT_TEMPLATES = [
  { id:"t1",name:"Bus / Metro",    amount:0.6,  catId:"transport",subcat:"Bus",        merchant:"BakuBus",   note:"" },
  { id:"t2",name:"Manatlıq B-S",   amount:1,    catId:"transport",subcat:"Bus",        merchant:"Bus",       note:"Manatlıq B-S" },
  { id:"t3",name:"Groceries",      amount:35,   catId:"food",     subcat:"Groceries",  merchant:"Bravo",     note:"" },
  { id:"t4",name:"Coffee",         amount:4.5,  catId:"food",     subcat:"Coffee",     merchant:"",          note:"" },
  { id:"t5",name:"Football Pitch", amount:12,   catId:"entertain",subcat:"Sports",     merchant:"Pitch 14",  note:"" },
];

// ─── RFC 4180 CSV parser ──────────────────────────────────────────────────────
function parseCSV(raw) {
  const rows=[]; let row=[],field="",inQ=false,i=0;
  const s=raw.replace(/\r\n/g,"\n").replace(/\r/g,"\n");
  while (i<s.length) {
    const ch=s[i];
    if (inQ) {
      if (ch==='"'&&s[i+1]==='"') { field+='"'; i+=2; }
      else if (ch==='"') { inQ=false; i++; }
      else { field+=ch; i++; }
    } else {
      if (ch==='"') { inQ=true; i++; }
      else if (ch===',') { row.push(field.trim()); field=""; i++; }
      else if (ch==='\n') {
        row.push(field.trim()); field="";
        if (row.some(f=>f!=="")) rows.push(row);
        row=[]; i++;
      } else { field+=ch; i++; }
    }
  }
  row.push(field.trim());
  if (row.some(f=>f!=="")) rows.push(row);
  rows.unterminated=inQ;   // an opening quote that never closes would silently merge rows
  return rows;
}


// Browser download. Starting a download is all the page can know: it cannot confirm the file was kept.
// ─── Run 10: keeping the data safe ──────────────────────────────────────────────────────────────────────────────────────
// Storage protection. Unless a site asks, browsers may clear its stored data when the device runs low on space (and Safari
// clears script storage of a site not visited for 7 days unless it is on the Home Screen). persist() asks the browser to keep
// it; the browser decides (Chrome grants it to installed or often-used sites without a prompt). Returns "on" | "off" |
// "unsupported" | "unknown". It never touches the ledger data.
async function storageProtection(ask, nav=(typeof navigator!=="undefined"?navigator:null)) {
  const s=nav&&nav.storage;
  if (!s||typeof s.persisted!=="function") return "unsupported";
  try {
    if (await s.persisted()) return "on";
    if (ask&&typeof s.persist==="function") return (await s.persist()) ? "on" : "off";
    return "off";
  } catch { return "unknown"; }
}
// Sends the backup file to the phone's share menu (Google Drive, Telegram, e-mail, Files …), so a copy leaves the phone.
// "shared" (a destination was chosen — the app still can't see whether it arrived), "cancelled", or "unsupported" (no file
// sharing here; the caller then downloads the file instead).
// Run 13: inside a native shell (the Capacitor Android app) the ordinary download link does nothing, so the shell defines
// window.__ledgerNativeShare(filename, text, mime) -> "shared" | "cancelled" (or rejects). The web app uses it when it exists
// and counts only an explicit "shared" as success: anything else is "cancelled" or "failed" and is never reported as saved.
// No hook (the PWA) = the behaviour below, unchanged.
const nativeShareHook=()=>(typeof window!=="undefined" && typeof window.__ledgerNativeShare==="function") ? window.__ledgerNativeShare : null;
async function shareViaNative(native, filename, text, mime) {
  try { const r=await native(filename, text, mime); return r==="shared" ? "shared" : r==="cancelled" ? "cancelled" : "failed"; }
  catch { return "failed"; }
}
async function shareBackupFile(text, filename, nav=(typeof navigator!=="undefined"?navigator:null), native=nativeShareHook()) {
  if (native) return shareViaNative(native, filename, text, "application/json");
  if (!nav||typeof nav.share!=="function"||typeof nav.canShare!=="function"||typeof File==="undefined") return "unsupported";
  const file=new File([text],filename,{type:"application/json"});
  try { if (!nav.canShare({files:[file]})) return "unsupported"; } catch { return "unsupported"; }
  try { await nav.share({files:[file],title:filename}); return "shared"; }
  catch (e) { return e && e.name==="AbortError" ? "cancelled" : "unsupported"; }
}

// Run 11: which version of the app a page is. The built page loads one script, /assets/index-<hash>.js; the hash changes
// with every release, so it identifies the version. null when it can't be told (the test bundle, a single-file build).
function appVersionOf(html) { const m=String(html||"").match(/\/assets\/index-([A-Za-z0-9_-]+)\.js/); return m?m[1]:null; }
// Compares the running version with the one the site serves now. "update" only when both are known and differ, so an
// unreadable answer (offline, an error page) never nags. fetchHtml() returns the site's current page as text.
async function checkForUpdate(currentVersion, fetchHtml) {
  if (!currentVersion) return "unknown";
  try { const latest=appVersionOf(await fetchHtml()); return !latest ? "unknown" : latest===currentVersion ? "current" : "update"; }
  catch { return "unknown"; }
}

function downloadFile(content, mime, filename) {
  const url=URL.createObjectURL(new Blob([content],{type:mime}));
  const a=document.createElement("a"); a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}
// Keep only the newest recovery copy with this label (older ones are removed once a newer one is safely stored).
function pruneRecoveryCopies(label) {
  try {
    const prefix=`${KEY}__${label}_`, keys=[];
    for (let i=0;i<localStorage.length;i++) { const k=localStorage.key(i); if (k && k.startsWith(prefix)) keys.push(k); }
    keys.sort().slice(0,-1).forEach(k=>localStorage.removeItem(k));
  } catch {}
}

// ─── Import / export pipeline (pure: no React, no storage) ───────────────────
const CSV_COLUMNS = { date:["date"], amount:["amount","amt","value"], type:["type"], category:["category","cat"],
  categoryId:["categoryid","category id","category_id"], subcategory:["subcategory","subcat"], merchant:["merchant"],
  note:["note","notes","description","memo"], recurring:["recurring","recurfreq","frequency"], wallet:["wallet","paid with"], trip:["trip","group"] };

// Run 24: bank statements. Banks name columns differently, split money into Debit/Credit columns, use ; or tab, day-first dates and
// comma decimals. This rewrites such a file into the app's own CSV (date, amount, type, merchant, note); the normal import review,
// validation and duplicate checks then run on the result. Files the app wrote itself are never touched (they have Date + Amount).
const BANK_HEADERS = {
  date:["date","transaction date","booking date","posting date","value date","tarix","\u0259m\u0259liyyat tarixi","\u0434\u0430\u0442\u0430","\u0434\u0430\u0442\u0430 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0438","\u0434\u0430\u0442\u0430 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0438"],
  amount:["amount","sum","m\u0259bl\u0259\u011F","\u0441\u0443\u043C\u043C\u0430","\u0441\u0443\u043C\u043C\u0430 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0438"],
  debit:["debit","withdrawal","withdrawals","paid out","money out","x\u0259rc","\u00E7\u0131x\u0131\u015F","\u0440\u0430\u0441\u0445\u043E\u0434","\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435"],
  credit:["credit","deposit","deposits","paid in","money in","g\u0259lir","m\u0259daxil","\u043F\u0440\u0438\u0445\u043E\u0434","\u0437\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0435"],
  desc:["description","details","narrative","payee","merchant","reference","t\u0259svir","t\u0259yinat","\u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435","\u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043F\u043B\u0430\u0442\u0435\u0436\u0430","\u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435","\u0434\u0435\u0442\u0430\u043B\u0438"] };
function splitDelimited(text, d) {
  const rows=[]; let row=[], cur="", q=false;
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if (q) { if (c==='"') { if (text[i+1]==='"') { cur+='"'; i++; } else q=false; } else cur+=c; }
    else if (c==='"') q=true;
    else if (c===d) { row.push(cur); cur=""; }
    else if (c==="\n"||c==="\r") { if (c==="\r"&&text[i+1]==="\n") i++; row.push(cur); cur=""; if (row.some(x=>x.trim()!=="")) rows.push(row); row=[]; }
    else cur+=c;
  }
  row.push(cur); if (row.some(x=>x.trim()!=="")) rows.push(row);
  return rows;
}
function bankMoney(s) {   // "1 234,56" "1.234,56" "1,234.56" "-12,5 AZN" "(45.00)" -> cents (integer, signed) or null
  let v=String(s==null?"":s).replace(/[\u00A0\s]/g,"").trim(); if (!v) return null;
  let neg=false; if (/^\(.*\)$/.test(v)) { neg=true; v=v.slice(1,-1); }
  v=v.replace(/[^\d.,+\-]/g,""); if (/^-/.test(v)) { neg=!neg; } v=v.replace(/[+\-]/g,"");
  if (!/\d/.test(v)) return null;
  const lc=v.lastIndexOf(","), ld=v.lastIndexOf(".");
  if (lc>-1 && ld>-1) v = lc>ld ? v.replace(/\./g,"").replace(",",".") : v.replace(/,/g,"");
  else if (lc>-1) v = /,\d{1,2}$/.test(v) && v.indexOf(",")===lc ? v.replace(",",".") : v.replace(/,/g,"");
  else if (ld>-1 && v.indexOf(".")!==ld) v=v.replace(/\./g,"");
  if (!/^\d*\.?\d+$|^\d+\.$/.test(v)) return null;
  const c=Math.round(parseFloat(v)*100); return neg ? -c : c;
}
function bankDate(s) {   // yyyy-mm-dd, dd.mm.yyyy, dd/mm/yyyy, dd-mm-yyyy (day first); times ignored; real calendar dates only
  const v=String(s||"").trim(); let y,m,d, x;
  if ((x=v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/))) { y=+x[1]; m=+x[2]; d=+x[3]; }
  else if ((x=v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[\sT].*)?$/))) { d=+x[1]; m=+x[2]; y=+x[3]; }
  else return null;
  const dt=new Date(y,m-1,d); if (dt.getFullYear()!==y||dt.getMonth()!==m-1||dt.getDate()!==d) return null;
  return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}
function bankCsvToStandard(raw) {
  const text=String(raw).replace(/^\uFEFF/,""), first=text.split(/\r?\n/,1)[0]||"";
  const d=[";","\t",","].map(c=>[c,first.split(c).length]).sort((a,b)=>b[1]-a[1])[0][0];
  const rows=splitDelimited(text,d); if (rows.length<2) return null;
  const hdr=rows[0].map(h=>h.replace(/^\uFEFF/,"").trim().toLowerCase());
  const col=(k)=>BANK_HEADERS[k].map(n=>hdr.indexOf(n)).find(i=>i!==-1) ?? -1;
  const ci={ date:col("date"), amount:col("amount"), debit:col("debit"), credit:col("credit"), desc:col("desc") };
  if (ci.date===-1 || (ci.amount===-1 && ci.debit===-1 && ci.credit===-1)) return null;
  const out=["date,amount,type,merchant,note"]; let skipped=0;
  rows.slice(1).forEach(r=>{
    const date=bankDate(r[ci.date]); let cents=null, type="expense";
    if (ci.amount!==-1) { const a=bankMoney(r[ci.amount]); if (a!==null && a!==0) { cents=Math.abs(a); type=a<0?"expense":"income"; } }
    if (cents===null && (ci.debit!==-1||ci.credit!==-1)) {
      const dv=ci.debit===-1?null:bankMoney(r[ci.debit]), cv=ci.credit===-1?null:bankMoney(r[ci.credit]);
      if (dv) { cents=Math.abs(dv); type="expense"; } else if (cv) { cents=Math.abs(cv); type="income"; }
    }
    if (!date || !cents) { skipped++; return; }
    const desc=ci.desc===-1?"":String(r[ci.desc]||"").trim().replace(/\s+/g," ").slice(0,80);
    const q=(s)=>`"${s.replace(/"/g,'""')}"`;
    out.push([date,(cents/100).toFixed(2),type,q(desc),'""'].join(","));
  });
  return out.length>1 ? { text:out.join("\n"), skipped } : null;
}

function parseCsvImport(raw, _bank=false) {
  const rows=parseCSV(String(raw).replace(/^\uFEFF/,""));
  if (rows.unterminated) return { error:t("csv.unterminated") };
  if (rows.length<2) return { error:t("csv.noRows") };
  const headers=rows[0].map(h=>h.replace(/^\uFEFF/,"").trim().toLowerCase());
  const idx={}; Object.entries(CSV_COLUMNS).forEach(([k,names])=>{ idx[k]=names.map(n=>headers.indexOf(n)).find(i=>i!==-1) ?? -1; });
  const missing=["date","amount"].filter(k=>idx[k]===-1);
  if (!_bank && (missing.length || (idx.date!==-1 && !/^\d{4}-\d{2}-\d{2}/.test(String(rows[1][idx.date]||"").trim())))) {   // Run 24: bank statement layouts
    const conv=bankCsvToStandard(raw); if (conv) return { ...parseCsvImport(conv.text,true), bankSkipped:conv.skipped };
  }
  if (missing.length) return { error:t(missing.length===2 ? "csv.needDateAmount" : missing[0]==="date" ? "csv.needDate" : "csv.needAmount", { found:rows[0].map(h=>h.trim()).filter(Boolean).join(", ")||t("csv.noHeaders") }) };
  // A leading apostrophe before = + - @ tab or CR is the formula guard added by buildCsv: remove it to restore the original text.
  const cell=(row,k)=>{ const v=idx[k]===-1 ? "" : String(row[idx[k]] ?? "").trim(); return /^'[=+\-@\t\r]/.test(v) ? v.slice(1) : v; };
  const records=rows.slice(1).map((row,i)=>{
    const rec=cell(row,"recurring").toLowerCase();
    const isRec=!!rec && !["no","false","0","none"].includes(rec);
    const wal=walletFromText(cell(row,"wallet"));   // Run 16: free text that is not a wallet gives none, never an error
    const trp=tripName(cell(row,"trip"));            // Run 22
    return { id:Date.now()+i+Math.random(), type:cell(row,"type"), amount:cell(row,"amount"),
      category:cell(row,"categoryId")||cell(row,"category"), subcategory:cell(row,"subcategory"), merchant:cell(row,"merchant"),
      note:cell(row,"note"), date:cell(row,"date"), recurring:isRec, recurFreq:isRec?rec:null, isActive:true, createdAt:new Date().toISOString(),
      ...(wal ? { wallet:wal } : {}), ...(trp ? { trip:trp } : {}) };
  });
  return { records };
}

// Reads a file's text into a plan. Nothing is applied here; the user reviews the plan first.
function planImport(raw, filename="") {
  const text=String(raw).replace(/^\uFEFF/,"");
  const isCSV=/\.csv$/i.test(filename) || text.trimStart().toLowerCase().startsWith("date,");
  let list=[], settings={}, problems=[], warnings=[], subcategories={}, debtData={ debts:[], loans:[] }, accountData={ accounts:[], transfers:[] };
  if (isCSV) {
    const r=parseCsvImport(text);
    if (r.error) return { ok:false, error:r.error };
    list=r.records;
    if (r.bankSkipped) warnings.push(t("import.bankSkipped",{ n:r.bankSkipped }));
  } else {
    let parsed;
    try { parsed=JSON.parse(text); } catch { return { ok:false, error:t("import.notJsonCsv") }; }
    if (Array.isArray(parsed)) list=parsed;
    else if (isPlainObject(parsed)) {
      if (parsed.version!==undefined) {
        if (!Number.isInteger(parsed.version) || parsed.version<1) return { ok:false, error:t("import.badVersion") };
        if (parsed.version>BACKUP_VERSION) return { ok:false, error:t("import.newerVersion",{v:parsed.version}) };
      }
      if (Array.isArray(parsed.transactions)) list=parsed.transactions;
      else if (Array.isArray(parsed.entries)) list=parsed.entries;
      else { const v=Object.values(parsed).find(v=>Array.isArray(v) && v.length>0 && isPlainObject(v[0]) && v[0].amount!==undefined); if (v) list=v; }
      const v=validateSettings(parsed); settings=v.settings; problems=v.problems; warnings=v.warnings.slice();
      subcategories=cleanSubcats(parsed.subcategories);   // Run 16: the user's own subcategory suggestions (optional)
      accountData=cleanAccountData({ accounts:parsed.accounts, transfers:parsed.transfers });   // Run 24: accounts and transfers (optional)
      debtData=cleanDebtData({ debts:parsed.debts, loans:parsed.loans });   // Run 17: debts and loans (optional)
      // Run 13: an entry list that is present but not a list used to be skipped without a word when the file also held
      // settings (and had no entry count to disagree with). The user is told no entries could be read.
      if ((parsed.transactions!==undefined && !Array.isArray(parsed.transactions) && !Array.isArray(parsed.entries)) || (parsed.entries!==undefined && !Array.isArray(parsed.entries) && !Array.isArray(parsed.transactions)))
        warnings.push(t("import.listUnreadable"));
      if (parsed.exportedAt!==undefined && !(typeof parsed.exportedAt==="string" && !Number.isNaN(Date.parse(parsed.exportedAt)))) warnings.push(t("import.badExportDate"));
      if (isPlainObject(parsed.meta) && Number.isInteger(parsed.meta.transactionCount) && parsed.meta.transactionCount!==list.length)
        warnings.push(t("import.countMismatch",{said:parsed.meta.transactionCount,has:list.length}));
    } else return { ok:false, error:t("import.notBackup") };
  }
  const { good:parsed, bad, rekeyed }=partitionTransactions(list);
  // Amounts in a file must be whole cents. 12.345 or 0.000000001 is refused rather than rounded, because rounding would
  // silently change the figure. (Data already stored on the device is not re-checked here, so loading never drops it.)
  const good=[];
  parsed.forEach(t=>{ if (Number(t.amount.toFixed(2))===t.amount) good.push(t); else bad.push({ record:t, reason:"more than 2 decimal places" }); });
  if (!good.length && !Object.keys(settings).length)
    return { ok:false, error: bad.length ? t("import.nothing",{summary:summariseReasons(bad)}) : t("import.empty") };
  const unknownCat=list.filter(t=>checkRawTxn(t)===null).filter(t=>{ const c=txt(t.category||t.catId||t.cat).trim(); return c && resolveCategory(c)==="other" && !/^(other|miscellaneous)$/i.test(c); }).length;
  if (unknownCat) warnings.push(tn("import.unknownCat",unknownCat));
  // Run 12: a payment's bill link is kept only when the file also contains that bill; otherwise only the link is dropped
  // (the payment stays, still recurring) and the sheet says how many.
  const fileBills=new Set((settings.bills||[]).map(b=>b.id)); let unlinked=0;
  good.forEach((t,i)=>{ if (t.billId && !fileBills.has(t.billId)) { const { billId, ...rest }=t; good[i]=rest; unlinked++; } });
  if (unlinked) warnings.push(tn("import.billUnlinked",unlinked));
  if (rekeyed) warnings.push(tn("import.rekeyed",rekeyed));
  // Rows identical to another row of the same file are all imported (two coffees at the same price on the same day are real),
  // but the user is told, since a file exported twice into one can look the same (Run 6, D10: policy — tell, never auto-remove).
  const seenFp=new Set(); let sameFile=0;
  good.forEach(t=>{ const f=txnFingerprint(t); if (seenFp.has(f)) sameFile++; else seenFp.add(f); });
  if (sameFile) warnings.push(tn("import.sameFileDup",sameFile));
  // A file with no usable transactions (settings only, an empty list, or only refused rows) may update settings, but it can
  // never replace the ledger: Replace would otherwise delete every transaction on the device.
  // Run 8: nor can a file where some rows were refused — Replace would quietly drop those rows along with the whole ledger.
  // Merge (adds the readable rows) stays available; the sheet explains why Replace is not offered.
  return { ok:true, kind:isCSV?"csv":"json", filename, transactions:good, canReplace:good.length>0 && bad.length===0, skippedCount:bad.length, skippedSummary:summariseReasons(bad), settings, problems, warnings, subcategories, debtData, accountData };
}

// Run 8: whether an entry repeats (and how often) is part of what it is, so a monthly bill and an identical one-off purchase
// are not look-alikes. Paused/active is a state that changes over time and is left out (a re-imported entry still matches).
function txnFingerprint(t) { return [t.date,t.type,Number(t.amount).toFixed(2),t.category,norm(t.merchant),norm(t.note),norm(t.subcategory),t.recurring?(t.recurFreq||"r"):""].join("|"); }
function countSuspectedDuplicates(existing, incoming) { const fp=new Set(existing.map(txnFingerprint)); return incoming.filter(t=>fp.has(txnFingerprint(t))).length; }

// What each mode does with each part of a backup (shown to the user in the import sheet):
//   Merge   transactions: added unless the id exists (optionally also skipping look-alikes) · budgets: combined, imported categories win ·
//           templates/goals: new ones added · currency and Safe to Spend: YOUR current values stay.
//   Replace transactions: replaced · budgets/templates/goals/currency/Safe to Spend: replaced ONLY if the file contains a valid section.
function applyImport(state, plan, mode, { skipDuplicates=false }={}) {
  const sortDesc=(l)=>[...l].sort((a,b)=>b.date.localeCompare(a.date));
  const S=plan.settings||{};
  if (mode==="replace") {
    // Defence in depth (the sheet does not offer Replace then): a file with no usable rows, or with refused rows, never
    // replaces the ledger; only its valid settings are applied.
    const keep=!plan.transactions.length || (plan.skippedCount||0)>0;
    const next={ ...state, transactions:keep ? state.transactions : sortDesc(plan.transactions) };
    ["budgets","templates","currency","goals","safeToSpend","bills"].forEach(k=>{ if (S[k]!==undefined) next[k]=S[k]; });
    return next;
  }
  const ids=new Set(state.transactions.map(t=>String(t.id)));
  const fps=new Set(state.transactions.map(txnFingerprint));
  const add=plan.transactions.filter(t=>!ids.has(String(t.id)) && !(skipDuplicates && fps.has(txnFingerprint(t))));
  const next={ ...state, transactions:sortDesc([...add, ...state.transactions]) };
  const fresh=(prefix)=>`${prefix}${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  if (S.budgets) next.budgets={ ...state.budgets, ...S.budgets };
  if (S.templates) {
    const key=(t)=>`${norm(t.name)}|${Number(t.amount).toFixed(2)}|${t.catId}`; const have=new Set(state.templates.map(key));
    next.templates=[...state.templates, ...S.templates.filter(t=>!have.has(key(t))).map(t=>state.templates.some(x=>x.id===t.id)?{...t,id:fresh("t")}:t)];
  }
  if (S.goals) {
    const key=(g)=>`${norm(g.name)}|${Number(g.target).toFixed(2)}`; const have=new Set(state.goals.map(key));
    next.goals=[...state.goals, ...S.goals.filter(g=>!have.has(key(g))).map(g=>state.goals.some(x=>x.id===g.id)?{...g,id:fresh("g")}:g)];
  }
  // Run 12: bills are added when their id is not on the device yet (a backup's bill is the same bill as the device's one
  // with that id, so payments linked to it in either place stay linked).
  if (S.bills) { const have=new Set((state.bills||[]).map(b=>b.id)); next.bills=[...(state.bills||[]), ...S.bills.filter(b=>!have.has(b.id))]; }
  return next;
}

// Backup reminder. lastBackup = when a backup FILE was last created (a download was started); backupConfirmedAt = when the
// user last told the app they have that file. The page cannot see the Downloads folder, so only the user can confirm.
//   "confirm" → a file was created recently but not confirmed: ask the user to check it, never assume it was kept
//   "none"    → a backup was confirmed less than BACKUP_REMINDER_DAYS ago
//   "due"     → otherwise (no backup, or the last one is old)
const BACKUP_REMINDER_DAYS=7;
function backupReminderDue(s, now=new Date()) {
  const at=(v)=>(typeof v==="string" && !Number.isNaN(Date.parse(v))) ? Date.parse(v) : null;
  const created=at(s?.lastBackup), confirmed=at(s?.backupConfirmedAt);
  const recent=(ms)=>ms!==null && (now.getTime()-ms)/86400000<BACKUP_REMINDER_DAYS;
  if (recent(created) && (confirmed===null || created>confirmed)) return "confirm";
  return recent(confirmed) ? "none" : "due";
}

function buildBackup(state, now=new Date().toISOString()) {
  const { transactions,budgets,templates,currency,goals,safeToSpend,bills=[],subcategories }=state;
  const subs=cleanSubcats(subcategories);   // Run 16: optional; absent when there are none, so such a file is identical to before
  const dd=cleanDebtData(state.debtData);   // Run 17: debts and loans, optional in the same way
  const acc=cleanAccountData(state.accountData);   // Run 24: accounts and transfers, optional in the same way
  const ccats=cleanCustomCats(state.customCats);   // Run 24: the user's own categories, optional in the same way
  return { version:BACKUP_VERSION, exportedAt:now, meta:{ app:"expense-ledger", transactionCount:transactions.length },
    transactions, budgets, templates, currency, goals, safeToSpend, bills, ...(Object.keys(subs).length ? { subcategories:subs } : {}),
    ...(ccats.length ? { customCategories:ccats } : {}),
    ...(acc.accounts.length ? { accounts:acc.accounts, ...(acc.transfers.length ? { transfers:acc.transfers } : {}) } : {}),
    ...(dd.debts.length ? { debts:dd.debts } : {}), ...(dd.loans.length ? { loans:dd.loans } : {}), lastBackup:now };
}

function buildCsv(transactions) {
  // Run 16: "Wallet" is the last column, so the columns before it did not move (older readers and the older import still work).
  const rows=[["Date","Type","Category","Subcategory","Merchant","Amount","Note","Recurring","CategoryId","Wallet","Trip"]];   // Run 22: "Trip" is appended after "Wallet"
  transactions.forEach(t=>rows.push([t.date,t.type,CAT(t.category)?.name||t.category,t.subcategory||"",t.merchant||"",Number(t.amount).toFixed(2),t.note||"",t.recurring?(t.recurFreq||""):"",t.category,walletId(t.wallet),tripName(t.trip)]));
  // Formula-injection guard: a cell starting with = + - @ tab or CR would run as a formula in a spreadsheet, so it gets a
  // leading apostrophe (shown as text). parseCsvImport removes it again, so the app's own CSV round trip stays exact.
  const safe=(v)=>{ const s=String(v); return /^[=+\-@\t\r]/.test(s) ? "'"+s : s; };
  return "\uFEFF"+rows.map(r=>r.map(v=>`"${safe(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
}

// ─── Merchant memory ──────────────────────────────────────────────────────────
// Memory is keyed by type + merchant, so a merchant used as both income and expense
// keeps a separate category/subcategory for each. The most recent choice per type wins.
function memKey(type, merchant) { return `${type==="income"?"income":"expense"}|${String(merchant).trim().toLowerCase()}`; }

function buildMerchantMemory(transactions) {
  const mem={};
  [...transactions].sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>{
    if (t.merchant&&String(t.merchant).trim()) {
      const type=t.type==="income"?"income":"expense";
      const key=memKey(type,t.merchant);
      if (!mem[key]) mem[key]={ type, merchant:String(t.merchant).trim(), count:0, totalSpent:0 };
      mem[key].category=t.category;
      mem[key].subcategory=t.subcategory||"";
      mem[key].count++;
      mem[key].totalSpent+=(t.amount||0);
    }
  });
  return mem;
}

function merchantSuggest(merchant, memory, type="expense") {
  if (!merchant||!merchant.trim()) return null;
  const exact=memory[memKey(type,merchant)];
  if (exact) return exact;
  const q=merchant.trim().toLowerCase();
  return Object.values(memory).find(v=>v.type===(type==="income"?"income":"expense")&&v.merchant.toLowerCase().startsWith(q))||null;
}

// S6: Full merchant profile per spec — frequency, timing, recurrence detection, forecasting
function detectRecurrence(txns) {
  if (txns.length < 3) return { isRecurring: false, recurringFreq: "irregular", recurringConfidence: 0, avgDaysBetween: null };
  const gaps = [];
  for (let i = 1; i < txns.length; i++) {
    const days = Math.round((parseLocalDate(txns[i].date) - parseLocalDate(txns[i-1].date)) / 86400000);
    if (days > 0) gaps.push(days);
  }
  if (!gaps.length) return { isRecurring: false, recurringFreq: "irregular", recurringConfidence: 0, avgDaysBetween: null };
  const avgGap = gaps.reduce((s,g)=>s+g,0) / gaps.length;
  const stdDev = Math.sqrt(gaps.reduce((s,g)=>s+Math.pow(g-avgGap,2),0) / gaps.length);
  const coefficient = avgGap > 0 ? stdDev / avgGap : 1;
  const confidence = Math.max(0, Math.round((1 - coefficient) * 100) / 100);
  let freq = "irregular";
  if (avgGap >= 5  && avgGap <= 9)   freq = "weekly";
  if (avgGap >= 12 && avgGap <= 16)  freq = "biweekly";
  if (avgGap >= 25 && avgGap <= 35)  freq = "monthly";
  if (avgGap >= 300 && avgGap <= 400) freq = "yearly";
  return { isRecurring: confidence > 0.7, recurringFreq: freq, recurringConfidence: confidence, avgDaysBetween: Math.round(avgGap) };
}

function calcMerchantProfile(merchant, transactions) {
  if (!merchant) return null;
  const ml = merchant.toLowerCase();
  const txns = transactions
    .filter(t => t.merchant && t.merchant.toLowerCase() === ml && t.type === "expense")
    .sort((a,b) => a.date.localeCompare(b.date));
  if (!txns.length) return null;

  const amounts = txns.map(t => t.amount);
  const total = amounts.reduce((s,a)=>s+a, 0);
  const avg = total / amounts.length;
  const minSpend = Math.min(...amounts);
  const maxSpend = Math.max(...amounts);
  const stdDevSpend = parseFloat(Math.sqrt(amounts.reduce((s,a)=>s+Math.pow(a-avg,2),0)/amounts.length).toFixed(2));

  // Last 30 / previous 30 days
  const now30 = localDateStr(new Date(Date.now()-30*86400000));
  const prev30 = localDateStr(new Date(Date.now()-60*86400000));
  const last30 = txns.filter(t=>t.date>=now30).reduce(addAmt,0);
  const prev30total = txns.filter(t=>t.date>=prev30&&t.date<now30).reduce(addAmt,0);

  // Visit frequency
  const gaps = [];
  for (let i=1;i<txns.length;i++) {
    const days = Math.round((parseLocalDate(txns[i].date)-parseLocalDate(txns[i-1].date))/86400000);
    if (days>0) gaps.push(days);
  }
  const avgDaysBetween = gaps.length ? Math.round(gaps.reduce((s,g)=>s+g,0)/gaps.length) : null;

  // Day of week (most common)
  const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const dayCounts = [0,0,0,0,0,0,0];
  txns.forEach(t=>{ dayCounts[parseLocalDate(t.date).getDay()]++; });
  const typicalDay = DAY_NAMES[dayCounts.indexOf(Math.max(...dayCounts))];

  // Category stability
  const catCounts = {};
  txns.forEach(t=>{ catCounts[t.category]=(catCounts[t.category]||0)+1; });
  const catEntries = Object.entries(catCounts).sort((a,b)=>b[1]-a[1]);
  const usualCat = catEntries[0]?.[0];
  const categoryConsistency = catEntries[0] ? catEntries[0][1]/txns.length : 0;
  const categoryStable = categoryConsistency > 0.9;

  // Subcategory
  const subCounts = {};
  txns.filter(t=>t.subcategory).forEach(t=>{ subCounts[t.subcategory]=(subCounts[t.subcategory]||0)+1; });
  const usualSub = Object.entries(subCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;

  // Amount stability
  const amountStable = avg > 0 && (maxSpend-minSpend)/avg < 0.15;

  // Recurrence detection
  const hasRecurringFlag = txns.some(t=>t.recurring);
  const recurrence = detectRecurrence(txns);

  // Estimated next visit + next spend
  let estimatedNextVisit = null, estimatedNextSpend = null;
  if (avgDaysBetween && txns.length >= 2) {
    const lastDate = parseLocalDate(txns[txns.length-1].date);
    const nextDate = new Date(lastDate.getTime() + avgDaysBetween*86400000);
    estimatedNextVisit = localDateStr(nextDate);
    // Use last 3 transactions avg as next spend estimate
    const recentAmts = txns.slice(-3).map(t=>t.amount);
    estimatedNextSpend = parseFloat((recentAmts.reduce((s,a)=>s+a,0)/recentAmts.length).toFixed(2));
  }

  // Spending trend (compare last 3 txns to previous 3)
  let spendingTrend = "stable";
  if (txns.length >= 6) {
    const recent3 = txns.slice(-3).reduce(addAmt,0)/3;
    const prev3   = txns.slice(-6,-3).reduce(addAmt,0)/3;
    if (prev3 > 0) {
      const delta = (recent3-prev3)/prev3*100;
      if (delta > 10) spendingTrend = "increasing";
      else if (delta < -10) spendingTrend = "decreasing";
    }
  }

  // Visit count this month and last 30 days
  const mon = curMon();
  const visitCountThisMonth = txns.filter(happenedIn(mon)).length;   // visits that have happened, not ones dated later
  const visitCount30 = txns.filter(t=>t.date>=now30).length;

  return {
    merchant, total: parseFloat(total.toFixed(2)), count: txns.length,
    avg: parseFloat(avg.toFixed(2)), minSpend, maxSpend, stdDevSpend,
    last30: parseFloat(last30.toFixed(2)), prev30total: parseFloat(prev30total.toFixed(2)), diff30: parseFloat((last30-prev30total).toFixed(2)),
    avgDaysBetween, typicalDay, categoryConsistency: parseFloat(categoryConsistency.toFixed(2)),
    usualCat, usualSub, categoryStable, amountStable,
    hasRecurring: hasRecurringFlag || recurrence.isRecurring,
    isRecurring: recurrence.isRecurring, recurringFreq: recurrence.recurringFreq, recurringConfidence: recurrence.recurringConfidence,
    estimatedNextVisit, estimatedNextSpend, spendingTrend,
    visitCountThisMonth, visitCount30Days: visitCount30,
    firstSeen: txns[0]?.date, lastSeen: txns[txns.length-1]?.date,
  };
}

// ─── Shared financial calculation layer ──────────────────────────────────────
// Shared label so every screen agrees: positive=Surplus, zero=Break-even, negative=Deficit
function surplusLabel(inc, exp) { return inc>exp ? "Surplus" : inc<exp ? "Deficit" : "Break-even"; }

function surplusColor(inc, exp) { return inc>exp ? "var(--pos)" : inc<exp ? "var(--neg)" : "var(--ink)"; }

// "Has this entry happened?" for month figures: a past month counts whole, the current month up to and including today,
// a future month nothing. Entries dated later are PLANNED: shown separately, never as money already spent or received.
function happenedIn(mon, now=new Date()) {
  const p=monthProgress(mon,now), todayStr=localDateStr(now);
  return (t)=>t.date.startsWith(mon) && (p.state==="past" || (p.state==="current" && t.date<=todayStr));
}

// How month `mon` is compared with the month before it (Run 7, V9): while `mon` is under way, with the SAME DAYS of the
// previous month (1–27 Oct vs 1–27 Sep — all of a shorter month when today's day is past its end); a finished month with
// the whole previous month; a future month not at all. Returns the filter for the previous month's entries.
function comparisonWindow(mon, prv, now=new Date()) {
  const p=monthProgress(mon,now), donePrv=happenedIn(prv,now);
  if (p.state==="future") return { kind:null, days:0, inPrev:()=>false };
  if (p.state==="current") return { kind:"same", days:p.daysPassed, inPrev:t=>donePrv(t) && Number(t.date.slice(8,10))<=p.daysPassed };
  return { kind:"full", days:0, inPrev:donePrv };
}

// cur* = happened (to date), planned* = dated later in the month, total* = the whole month (Safe to Spend uses totalExp:
// an expense entered ahead of time is money already committed). prev* = the previous month over the comparison window
// (see comparisonWindow); prevFullExp = the whole previous month, for display.
// Run 22 (formula audit): the sum of entry amounts in whole cents. Adding 0.1 ten times in floating point gives 0.9999999999999999, which
// would sit just under an exact budget of 1.00; rounding each amount to cents first makes the total exact.
// Run 24: reducer that keeps a running total exact to the cent (0.1 + 0.2 stays 0.3), for the plain sums that used to add raw decimals.
const addAmt=(s,t)=>Math.round((s+(Number(t&&t.amount)||0))*100)/100;
function sumCents(list) { return (list||[]).reduce((s,t)=>s+Math.round((Number(t.amount)||0)*100),0)/100; }
function calcMonthSummary(transactions, mon=curMon(), prv=prevMon(), now=new Date()) {
  const isExp=t=>t.type==="expense", isInc=t=>t.type==="income", inMon=t=>t.date.startsWith(mon);
  const cw=comparisonWindow(mon,prv,now);
  const done=happenedIn(mon,now), donePrv=cw.inPrev, sum=sumCents;   // Run 22 audit: whole cents, so ten entries of 0.10 are exactly 1.00
  const curExp =sum(transactions.filter(t=>isExp(t)&&done(t)));
  const curInc =sum(transactions.filter(t=>isInc(t)&&done(t)));
  const plannedExp=sum(transactions.filter(t=>isExp(t)&&inMon(t)&&!done(t)));
  const plannedInc=sum(transactions.filter(t=>isInc(t)&&inMon(t)&&!done(t)));
  const totalExp=sum(transactions.filter(t=>isExp(t)&&inMon(t))), totalInc=sum(transactions.filter(t=>isInc(t)&&inMon(t)));
  const prevExp=sum(transactions.filter(t=>isExp(t)&&donePrv(t)));
  const prevInc=sum(transactions.filter(t=>isInc(t)&&donePrv(t)));
  const prevFullExp=sum(transactions.filter(t=>isExp(t)&&happenedIn(prv,now)(t)));
  const momDiff=cw.kind&&prevExp>0?curExp-prevExp:null;
  // Negative when expenses exceed income — don't clamp, show the deficit
  const surplusRate=curInc>0?Math.round(((curInc-curExp)/curInc)*100):null;
  return { curExp,curInc,plannedExp,plannedInc,totalExp,totalInc,prevExp,prevInc,prevFullExp,momDiff,surplusRate,cmpKind:cw.kind,cmpDays:cw.days };
}

function calcCategorySpend(transactions, mon=curMon(), now=new Date()) {
  const out={}, done=happenedIn(mon,now);
  transactions.filter(t=>t.type==="expense"&&done(t))
    .forEach(t=>{ out[t.category]=(out[t.category]||0)+Math.round((Number(t.amount)||0)*100); });
  Object.keys(out).forEach(k=>{ out[k]=out[k]/100; });   // Run 22 audit: summed in whole cents
  return out;
}

// Run 16: money spent in one month by wallet, by the same rule as calcCategorySpend (entries that have happened, not later ones).
// Whole cents, so 0.1 + 0.2 is exactly 0.30. "none" = entries without a wallet. "used" = at least one entry has a wallet.
function calcWalletSpend(transactions, mon=curMon(), now=new Date()) {
  const done=happenedIn(mon,now), cents={}; let totalC=0, used=false;
  (transactions||[]).filter(t=>t.type==="expense"&&done(t)).forEach(t=>{
    const w=walletId(t.wallet)||"none"; if (w!=="none") used=true;
    const c=Math.round(Number(t.amount)*100); cents[w]=(cents[w]||0)+c; totalC+=c;
  });
  const byWallet={}; Object.keys(cents).forEach(k=>{ byWallet[k]=cents[k]/100; });
  return { byWallet, total:totalC/100, used };
}

// Where a month sits relative to today. "daysLeft" counts the days AFTER today; "daysRemaining" counts today as well,
// because today's spending is still open. Every screen that shows "days left" or a per-day figure uses daysRemaining.
function daysBetween(a, b) {   // calendar days from a to b, ignoring time of day and DST
  return Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/86400000);
}
function monthProgress(mon, now=new Date()) {
  const totalDays=daysInMonth(mon), cur=localMonthStr(now);
  if (mon===cur) { const d=now.getDate(); return { state:"current", totalDays, daysPassed:d, daysLeft:totalDays-d, daysRemaining:totalDays-d+1 }; }
  if (mon<cur)   return { state:"past",   totalDays, daysPassed:totalDays, daysLeft:0, daysRemaining:0 };
  return           { state:"future", totalDays, daysPassed:0, daysLeft:totalDays, daysRemaining:totalDays };
}
// Spending that has actually happened by today (entries dated later this month are planned, not yet spent).
function calcSpentToDate(transactions, mon=curMon(), now=new Date()) {
  const p=monthProgress(mon,now); if (p.state==="future") return 0;
  const todayStr=localDateStr(now);
  return transactions.filter(t=>t.type==="expense"&&t.date.startsWith(mon)&&(p.state==="past"||t.date<=todayStr)).reduce((s,t)=>s+Math.round((Number(t.amount)||0)*100),0)/100;   // Run 22 audit: whole cents
}

function calcSpendingPace(spent, mon=curMon(), budgetTotal=0, now=new Date()) {
  const p=monthProgress(mon,now);
  const dailyAvg=p.daysPassed>0 ? spent/p.daysPassed : 0;
  const projected=p.state==="current" ? dailyAvg*p.totalDays : spent;
  // A projection from very few days is noise: say so instead of presenting it as a forecast.
  const projectionReliable=p.state!=="current" || p.daysPassed>=5;
  // "On track" only means something against an external benchmark (a budget); otherwise it stays null.
  let onTrack=null, expectedByToday=null, diff=null;
  if (budgetTotal>0 && p.state!=="future") {
    expectedByToday = p.state==="past" ? budgetTotal : (budgetTotal/p.totalDays)*p.daysPassed;
    diff=spent-expectedByToday;
    onTrack = p.state==="past" ? spent<=budgetTotal : spent<=expectedByToday*1.05;
  }
  return { state:p.state, daysPassed:p.daysPassed, totalDays:p.totalDays, daysLeft:p.daysLeft, daysRemaining:p.daysRemaining, dailyAvg, projected, projectionReliable, expectedByToday, diff, onTrack };
}

// Run 17: month-end forecast for the CURRENT month. It replaces "daily average x days in month", which is thrown off by one big early
// payment (rent on the 3rd made a 30-day forecast several times too high).
//   forecast = spent so far + entries already dated later this month + bills still unpaid + days left x the usual daily spend.
// Usual daily spend = the 28 days ending yesterday (at least 7 days of history), without bills/recurring entries (counted on their
// own) and without unusually large single purchases (more than 5x the median purchase). The +/- range is one standard deviation of
// the daily totals x sqrt(days left). `rangeShown` is true only when the same method, run on up to 3 earlier months as of their 10th
// day, put the real total inside the range in at least 2/3 of them (and at least 2 months could be tested).
const FORECAST_WINDOW=28, FORECAST_MIN_HISTORY=7, FORECAST_BIG=5;
function forecastCore(transactions, bills, now) {
  const mon=localMonthStr(now), todayStr=localDateStr(now), p=monthProgress(mon,now);
  const cents=(x)=>Math.round(x*100)/100;
  const expenses=transactions.filter(t=>t.type==="expense");
  if (!expenses.length) return { available:false, reason:"history" };
  const inMon=expenses.filter(t=>t.date.startsWith(mon));
  const spentSoFar=inMon.filter(t=>t.date<=todayStr).reduce(addAmt,0);
  const plannedLater=inMon.filter(t=>t.date>todayStr).reduce(addAmt,0);
  let commitments=0;
  buildSchedules(transactions,bills).filter(s=>s.isActive && s.type==="expense").forEach(s=>{
    const st=scheduleMonthStatus(s,transactions,mon,now);
    commitments+=s.amount*(st.upcoming.length+st.overdue.length);
  });
  const end=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);              // yesterday: today is only partly over
  const first=parseLocalDate(expenses.reduce((m,t)=>t.date<m?t.date:m,expenses[0].date));
  const winStart=new Date(end.getFullYear(),end.getMonth(),end.getDate()-(FORECAST_WINDOW-1));
  const start=first>winStart?first:winStart;
  const days=daysBetween(start,end)+1;
  if (days<FORECAST_MIN_HISTORY) return { available:false, reason:"history" };
  const s0=localDateStr(start), e0=localDateStr(end);
  const usual=expenses.filter(t=>t.date>=s0 && t.date<=e0 && !t.recurring && !t.billId);
  const sorted=usual.map(t=>t.amount).sort((a,b)=>a-b);
  const median=sorted.length ? (sorted.length%2 ? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2-1]+sorted[sorted.length/2])/2) : 0;
  const kept=median>0 ? usual.filter(t=>t.amount<=FORECAST_BIG*median) : usual;
  const perDay=new Array(days).fill(0);
  kept.forEach(t=>{ perDay[daysBetween(start,parseLocalDate(t.date))]+=t.amount; });
  const mean=perDay.reduce((s,v)=>s+v,0)/days;
  const sd=Math.sqrt(perDay.reduce((s,v)=>s+(v-mean)*(v-mean),0)/days);
  const base=spentSoFar+plannedLater+commitments, point=base+mean*p.daysLeft, half=sd*Math.sqrt(p.daysLeft);
  return { available:true, spentSoFar:cents(spentSoFar), plannedLater:cents(plannedLater), commitments:cents(commitments), usualDaily:cents(mean), daysLeft:p.daysLeft,
    point:cents(point), low:cents(Math.max(base,point-half)), high:cents(point+half) };
}
function calcMonthEndForecast(transactions, bills=[], now=new Date()) {
  const f=forecastCore(transactions,bills,now);
  if (!f.available) return { ...f, rangeShown:false, backtest:{ months:0, hits:0 } };
  let months=0, hits=0;
  for (let k=1;k<=3;k++) {
    const m=new Date(now.getFullYear(),now.getMonth()-k,1), asOf=new Date(m.getFullYear(),m.getMonth(),10,12,0,0), mon=localMonthStr(m);
    const known=transactions.filter(t=>t.date<=localDateStr(asOf));
    const b=forecastCore(known,bills,asOf); if (!b.available) continue;
    const actual=transactions.filter(t=>t.type==="expense" && t.date.startsWith(mon)).reduce(addAmt,0);
    months++; if (actual>=b.low-0.005 && actual<=b.high+0.005) hits++;
  }
  return { ...f, backtest:{ months, hits }, rangeShown:months>=2 && hits*3>=months*2 };
}

// Run 24: split one entry (a shopping receipt, say) into 2–6 entries in different categories. No new data shape: the original is
// replaced by ordinary entries with the same date, merchant, note, wallet and tag, and their amounts add up to the original to the
// cent. Entries that belong to a bill, a repeating schedule or a debt repayment are not split, so those links never break.
const SPLIT_MAX=6;
function splitTransaction(txn, parts, mkId=()=>Date.now()+Math.random()) {
  if (!txn || !(Number(txn.amount)>0)) return { ok:false, reason:"invalid" };
  if (txn.recurring || txn.billId || txn.debtLink) return { ok:false, reason:"linked" };
  if (!Array.isArray(parts) || parts.length<2 || parts.length>SPLIT_MAX) return { ok:false, reason:"count" };
  const total=Math.round(Number(txn.amount)*100), isInc=txn.type==="income", { id:_id, ...base }=txn;
  let sum=0; const entries=[];
  for (const p of parts) {
    const cat=p && CATEGORIES.find(x=>x.id===p.category), c=Math.round((Number(p && p.amount)||0)*100);
    if (!cat || cat.income!==isInc) return { ok:false, reason:"category" };
    if (!(c>0)) return { ok:false, reason:"amount" };
    sum+=c;
    entries.push({ ...base, id:mkId(), category:cat.id, amount:c/100, subcategory:cat.id===txn.category ? (txn.subcategory||"") : "" });
  }
  return sum===total ? { ok:true, entries } : { ok:false, reason:"sum", diff:(total-sum)/100 };
}

// Run 24: a newly added expense can push its category past 80% of that month's limit ("near") or past the limit ("over"). Only the
// crossing is reported, once, so entries that follow in the same state stay quiet. Cent-exact; never touches the ledger.
function budgetCrossing(before, after, budgets, txn, now=new Date()) {
  if (!txn || txn.type!=="expense" || !isPlainObject(budgets)) return null;
  const limit=Math.round((Number(budgets[txn.category])||0)*100), mon=String(txn.date||"").slice(0,7);
  if (limit<=0 || !/^\d{4}-\d{2}$/.test(mon)) return null;
  const c=(list)=>Math.round(((calcCategorySpend(list||[],mon,now)[txn.category])||0)*100);
  const b=c(before), a=c(after);
  if (a>limit && b<=limit) return { kind:"over", pct:Math.round(a*100/limit) };
  if (a<=limit && a*5>=limit*4 && b*5<limit*4) return { kind:"near", pct:Math.round(a*100/limit) };
  return null;
}

function calcBudgetStatus(budgets, catSpend, mon=curMon(), now=new Date()) {
  const p=monthProgress(mon,now);
  const pacePct=p.totalDays ? Math.round((p.daysPassed/p.totalDays)*100) : 0;
  return Object.entries(budgets).filter(([,v])=>v>0).map(([catId,limit])=>{
    const spent=catSpend[catId]||0;
    const pct=Math.min((spent/limit)*100,100);
    const over=spent>limit, warn=pct>=80&&!over;
    const aheadOfPace=p.state==="current" && Math.round(pct)>pacePct+10;   // pace only means something while the month is under way
    return { catId,limit,spent,pct,over,warn,aheadOfPace,daysLeft:p.daysRemaining,daysRemaining:p.daysRemaining,state:p.state };
  });
}

function calcTxnStats(transactions, mon=curMon(), now=new Date()) {
  const done=happenedIn(mon,now);
  const amts=transactions.filter(t=>t.type==="expense"&&done(t)).map(t=>t.amount);
  const isWkend=d=>[0,6].includes(parseLocalDate(d).getDay());
  const wkdExp=transactions.filter(t=>t.type==="expense"&&done(t)&&!isWkend(t.date)).reduce(addAmt,0);
  const wkndExp=transactions.filter(t=>t.type==="expense"&&done(t)&&isWkend(t.date)).reduce(addAmt,0);
  return { count:amts.length, avgTxn:amts.length?amts.reduce((s,a)=>s+a,0)/amts.length:0, medTxn:median(amts), weekdayExp:wkdExp, weekendExp:wkndExp };
}

// Weekend vs weekday spending PER DAY for one month, counting only days that have passed (today included) and only
// expenses dated on those days. A month has ~2.5× more weekdays than weekend days, so raw totals are never compared.
// heavier: "weekend" | "weekday" | "same" (equal to the cent) | null (no spending, or a group has no elapsed day yet).
function calcWeekdayWeekend(transactions, mon=curMon(), now=new Date()) {
  const p=monthProgress(mon,now);
  const [y,m]=mon.split("-").map(Number);
  let weDays=0, wdDays=0;
  for (let d=1; d<=p.daysPassed; d++) { if ([0,6].includes(new Date(y,m-1,d).getDay())) weDays++; else wdDays++; }
  const lastStr=p.daysPassed>0 ? `${mon}-${String(p.daysPassed).padStart(2,"0")}` : "";
  const isWkend=d=>[0,6].includes(parseLocalDate(d).getDay());
  const inWindow=transactions.filter(t=>t.type==="expense"&&t.date.startsWith(mon)&&t.date<=lastStr);
  const weTotal=inWindow.filter(t=>isWkend(t.date)).reduce(addAmt,0);
  const wdTotal=inWindow.filter(t=>!isWkend(t.date)).reduce(addAmt,0);
  const weAvg=weDays>0 ? weTotal/weDays : null, wdAvg=wdDays>0 ? wdTotal/wdDays : null;
  let heavier=null;
  if (weAvg!==null && wdAvg!==null && (weTotal>0 || wdTotal>0)) {
    const a=Math.round(weAvg*100), b=Math.round(wdAvg*100);
    heavier = a===b ? "same" : a>b ? "weekend" : "weekday";
  }
  return { weDays, wdDays, weTotal, wdTotal, weAvg, wdAvg, heavier };
}

// S3: What Changed — category + merchant-level explanation + recurring/one-off flag
function calcWhatChanged(transactions, mon=curMon(), prv=prevMon(), now=new Date()) {
  // The previous month is taken over the same comparison window as the totals (Run 7, V9).
  const donePrv=comparisonWindow(mon,prv,now).inPrev, doneMon=happenedIn(mon,now);
  const catSpendMon=calcCategorySpend(transactions,mon,now);
  const catSpendPrv={}; transactions.filter(t=>t.type==="expense"&&donePrv(t)).forEach(t=>{ catSpendPrv[t.category]=(catSpendPrv[t.category]||0)+t.amount; });
  const { curExp,prevExp,curInc,prevInc,cmpKind,cmpDays }=calcMonthSummary(transactions,mon,prv,now);

  // Build a set of merchant names that have any recurring transaction
  const recurringMerchants=new Set(
    transactions.filter(t=>t.recurring&&t.merchant).map(t=>t.merchant.toLowerCase())
  );

  const cats=[...new Set([...Object.keys(catSpendMon),...Object.keys(catSpendPrv)])];
  const catChanges=cats.map(catId=>{
    const cur=catSpendMon[catId]||0,prev=catSpendPrv[catId]||0,diff=cur-prev;
    const merchantMon={},merchantPrv={};
    transactions.filter(t=>t.type==="expense"&&t.category===catId&&t.merchant&&doneMon(t)).forEach(t=>{merchantMon[t.merchant]=(merchantMon[t.merchant]||0)+t.amount;});
    transactions.filter(t=>t.type==="expense"&&t.category===catId&&t.merchant&&donePrv(t)).forEach(t=>{merchantPrv[t.merchant]=(merchantPrv[t.merchant]||0)+t.amount;});
    const allM=[...new Set([...Object.keys(merchantMon),...Object.keys(merchantPrv)])];
    const merchantDiffs=allM.map(m=>({
      merchant:m,
      cur:merchantMon[m]||0,
      prev:merchantPrv[m]||0,
      diff:(merchantMon[m]||0)-(merchantPrv[m]||0),
      // Fix 3: Is this merchant recurring or one-off?
      isRecurring: recurringMerchants.has(m.toLowerCase()),
    })).filter(m=>Math.abs(m.diff)>0.01).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff)).slice(0,3);
    return { catId, cur, prev, diff, merchantDiffs };
  }).filter(c=>Math.abs(c.diff)>0.01).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff));

  const merchantMon={},merchantPrv={};
  transactions.filter(t=>t.type==="expense"&&t.merchant&&doneMon(t)).forEach(t=>{merchantMon[t.merchant]=(merchantMon[t.merchant]||0)+t.amount;});
  transactions.filter(t=>t.type==="expense"&&t.merchant&&donePrv(t)).forEach(t=>{merchantPrv[t.merchant]=(merchantPrv[t.merchant]||0)+t.amount;});
  const allM=[...new Set([...Object.keys(merchantMon),...Object.keys(merchantPrv)])];
  const merchantChanges=allM.map(m=>({
    merchant:m, cur:merchantMon[m]||0, prev:merchantPrv[m]||0,
    diff:(merchantMon[m]||0)-(merchantPrv[m]||0),
    isRecurring: recurringMerchants.has(m.toLowerCase()),
  })).filter(c=>Math.abs(c.diff)>0.01).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff)).slice(0,5);

  return { curExp,prevExp,curInc,prevInc,catChanges,merchantChanges,totalDiff:curExp-prevExp,cmpKind,cmpDays };
}

// S4: Safe to Spend — distinguishes available, future commitments, savings
// ─── Recurring model: a SCHEDULE (the repeating commitment) vs its OCCURRENCES (individual dated payments) ───
// Transactions flagged "recurring" are grouped into schedules by what they are — type, category, merchant (or note) and
// frequency — so recording the same rent three months running is ONE schedule with three occurrences, not three commitments.
// The subcategory is part of what a bill is, so electricity and water from the same utility stay two schedules (Run 6, D1);
// the amount is not (a price change keeps one schedule). Unnamed entries also split by amount so two different unnamed bills
// never merge. The key is computed on the fly and never stored.
function scheduleKey(t) {
  const who=norm(t.merchant)||norm(t.note);
  const tail=who ? norm(t.subcategory) : `${norm(t.subcategory)}|${Number(t.amount).toFixed(2)}`;
  return [t.type,t.category,who,t.recurFreq,tail].join("|");
}
// Run 12: explicit bills. A bill is the user's own record of a repeating payment — its name, expected amount, how often,
// and the date it is first due (the due day comes from that date, never from guessing). A payment points to its bill with
// billId. Payments with no (known) bill keep the earlier inferred grouping below, so data from before bills, or not yet
// converted, behaves exactly as it always did.
function validateBill(b) {
  if (!isPlainObject(b)) return null;
  const id=isBillId(b.id) ? b.id.trim() : null;
  const name=typeof b.name==="string" ? b.name.trim() : "";
  const type=b.type==="income" ? "income" : b.type==="expense" ? "expense" : null;
  const amount=parseMoney(b.amount,{positive:true});
  const anchor=typeof b.anchorDate==="string" && isValidDateStr(b.anchorDate) ? b.anchorDate : null;
  const dueDayOk=b.dueDay===undefined || (Number.isInteger(b.dueDay) && b.dueDay>=1 && b.dueDay<=31);
  // Run 18: an optional last due date (the final instalment of a credit). Empty = none; anything else must be a real date on or after the first due date.
  const endRaw=b.endDate===undefined||b.endDate===null||b.endDate==="" ? null : b.endDate;
  const endOk=endRaw===null || (typeof endRaw==="string" && isValidDateStr(endRaw) && anchor!==null && endRaw>=anchor);
  if (!id || !name || name.length>80 || !type || amount===null || !RECUR_FREQS.has(b.freq) || !anchor || !dueDayOk || !endOk || (b.active!==undefined && typeof b.active!=="boolean")) return null;
  const ids=CATEGORIES.map(c=>c.id);
  return { id, name, type, category:ids.includes(b.category) ? b.category : "other", subcategory:txt(b.subcategory).slice(0,40), amount, freq:b.freq,
    anchorDate:anchor, ...(b.dueDay!==undefined ? { dueDay:b.dueDay } : {}), ...(endRaw!==null ? { endDate:endRaw } : {}), active:b.active!==false, createdAt:typeof b.createdAt==="string" ? b.createdAt : "" };
}
function newBillId(taken) { let id; do { id="b"+Date.now().toString(36)+Math.random().toString(36).slice(2,7); } while (taken && taken.has(id)); return id; }

// ── Run 13: bills mirror ──
// The version-9 app (live before bills) rewrites the whole ledger every time it starts and does not know `bills` or a
// payment's `billId`, so opening it once after a rollback erases both. It cannot be patched and the ledger key cannot change,
// so a small copy of the bills and the payment links is kept under a separate key that version 9 never touches (it only
// prunes its own "before_import" copies). When the ledger has lost bills the mirror still has, the app OFFERS to restore them;
// nothing is ever restored silently, and bills are matched by id only, never by name or amount.
const BILLS_MIRROR_KEY = `${KEY}__bills_mirror`;
function buildBillsMirror(bills, transactions) {
  const links={};
  for (const t of (transactions||[])) if (t && isBillId(t.billId)) links[String(t.id)]=t.billId;
  return { v:1, savedAt:new Date().toISOString(), bills:Array.isArray(bills) ? bills : [], links };
}
function planBillRestore(bills, transactions, mirror) {
  if (!isPlainObject(mirror) || mirror.v!==1 || !Array.isArray(mirror.bills)) return null;
  const have=new Set((bills||[]).map(b=>b.id)), seen=new Set(), add=[];
  for (const raw of mirror.bills) { const b=validateBill(raw); if (!b || have.has(b.id) || seen.has(b.id)) continue; seen.add(b.id); add.push(b); }
  if (!add.length) return null;
  const known=new Set([...have, ...seen]), links=[];
  if (isPlainObject(mirror.links)) for (const t of (transactions||[])) {
    if (t.billId!==undefined) continue;   // a payment that already points somewhere is never re-linked
    const to=mirror.links[String(t.id)];
    if (typeof to==="string" && known.has(to)) links.push({ id:t.id, billId:to });
  }
  return { bills:add, links };
}
function applyBillRestore(s, plan) {
  const have=new Set((s.bills||[]).map(b=>b.id));
  const to=new Map(plan.links.map(l=>[String(l.id), l.billId]));
  return { ...s, bills:[...(s.bills||[]), ...plan.bills.filter(b=>!have.has(b.id))],
    transactions:s.transactions.map(t=>(t.billId===undefined && to.has(String(t.id))) ? { ...t, billId:to.get(String(t.id)) } : t) };
}
function readBillsMirror() { try { const r=localStorage.getItem(BILLS_MIRROR_KEY); return r===null ? null : JSON.parse(r); } catch { return null; } }
// Best effort: the ledger itself was already saved. Users who never had bills get no extra key.
function syncBillsMirror(bills, transactions) {
  try { if (!(bills&&bills.length) && localStorage.getItem(BILLS_MIRROR_KEY)===null) return true; } catch { return false; }
  return writeRaw(BILLS_MIRROR_KEY, buildBillsMirror(bills, transactions));
}

function buildSchedules(transactions, bills=[]) {
  const known=new Map((bills||[]).map(b=>[b.id,b]));
  const billed=(t)=>!!(t.billId && known.has(t.billId));
  const byDate=(a,b)=>a.date.localeCompare(b.date)||String(a.createdAt).localeCompare(String(b.createdAt));
  const fromBills=[...known.values()].map(b=>{
    const paid=transactions.filter(t=>t.billId===b.id).sort(byDate);
    return { key:"bill:"+b.id, billId:b.id, bill:b, anchorDate:b.anchorDate, type:b.type, category:b.category, subcategory:b.subcategory, merchant:b.name, note:"",
      freq:b.freq, amount:b.amount, isActive:b.active!==false, occurrences:paid.map(t=>t.date), memberIds:paid.map(t=>t.id), latest:paid[paid.length-1]||null, knownBills:known };
  });
  const groups=new Map();
  transactions.forEach(t=>{ if (t.recurring && RECUR_FREQS.has(t.recurFreq) && !billed(t)) { const k=scheduleKey(t); if (!groups.has(k)) groups.set(k,[]); groups.get(k).push(t); } });
  const inferred=[...groups.entries()].map(([key,members])=>{
    const sorted=[...members].sort(byDate);
    const latest=sorted[sorted.length-1];
    return { key, type:latest.type, category:latest.category, subcategory:latest.subcategory, merchant:latest.merchant, note:latest.note,
      freq:latest.recurFreq, amount:latest.amount, isActive:latest.isActive!==false, occurrences:sorted.map(t=>t.date), memberIds:sorted.map(t=>t.id), latest, knownBills:known };
  });
  return [...fromBills, ...inferred].sort((a,b)=>a.key.localeCompare(b.key));
}

// Turns every inferred schedule into a bill (one explicit step the user takes; the app shows Undo). Each bill takes the
// schedule's name, latest amount, frequency, activity and due day (from the earlier rules), starting at its first payment;
// each payment gets that bill's id. Nothing else in any record changes, the inputs are not modified, and running it again
// does nothing. Two bills that were already inferred as one stay one bill — the user separates them (assignToBill).
function convertLegacySchedules(transactions, bills=[], now=new Date()) {
  const legacy=buildSchedules(transactions,bills).filter(s=>!s.billId);
  if (!legacy.length) return { transactions, bills, created:0 };
  const taken=new Set((bills||[]).map(b=>b.id)), link=new Map(), made=[];
  legacy.forEach(s=>{
    const id=newBillId(taken); taken.add(id);
    const first=parseLocalDate(s.occurrences[0]);
    const day=(s.freq==="weekly"||s.freq==="biweekly") ? first.getDate() : Math.min(scheduleDueDay(s), new Date(first.getFullYear(),first.getMonth()+1,0).getDate());
    // dueDay keeps the intended day when it is later than the first payment's month allows (28 Feb, then 31 Mar → due on the 31st).
    made.push({ id, name:(s.merchant||s.note||catName(s.category)).trim().slice(0,80), type:s.type, category:s.category, subcategory:s.subcategory||"", amount:s.amount,
      freq:s.freq, anchorDate:localDateStr(new Date(first.getFullYear(),first.getMonth(),day)), ...((s.freq==="monthly"||s.freq==="yearly") ? { dueDay:scheduleDueDay(s) } : {}), active:s.isActive, createdAt:now.toISOString() });
    s.memberIds.forEach(mid=>link.set(String(mid),id));
  });
  return { transactions:transactions.map(t=>link.has(String(t.id)) ? { ...t, billId:link.get(String(t.id)) } : t), bills:[...(bills||[]), ...made], created:made.length };
}

// Marks one entry as the payment of a bill — an existing bill (target = its id) or a new bill made from this entry
// (target = "new": its name, amount and frequency, due from its date). The entry keeps its own amount, date, category,
// name and id; it becomes recurring with the bill's frequency. Moving a payment to another bill never deletes a bill.
function assignToBill(transactions, bills=[], txnId, target, now=new Date()) {
  const txn=transactions.find(t=>String(t.id)===String(txnId));
  if (!txn) return { transactions, bills, billId:null };
  let list=bills||[], bill=null;
  if (target==="new") {
    bill={ id:newBillId(new Set(list.map(b=>b.id))), name:(txn.merchant||txn.note||catName(txn.category)).trim().slice(0,80), type:txn.type, category:txn.category,
      subcategory:txn.subcategory||"", amount:txn.amount, freq:RECUR_FREQS.has(txn.recurFreq) ? txn.recurFreq : "monthly", anchorDate:txn.date, active:true, createdAt:now.toISOString() };
    list=[...list, bill];
  } else bill=list.find(b=>b.id===target)||null;
  if (!bill) return { transactions, bills, billId:null };
  return { transactions:transactions.map(t=>t===txn ? { ...t, billId:bill.id, recurring:true, recurFreq:bill.freq, isActive:true } : t), bills:list, billId:bill.id };
}
const scheduleMonthly = (s) => toMonthlyAmountHelper({ amount:s.amount, recurFreq:s.freq });   // an ESTIMATE of a typical month

// The day of the month a monthly/yearly schedule is due on. It is the latest payment's day — except when that payment fell
// on the last day of a short month (28 Feb, 30 Apr), which is only where a later due day was clamped to: then the run of
// month-end payments before it shows the intended day (31 Jan, 28 Feb → 31; 29 Feb 2024, 28 Feb 2025 → 29). A payment on
// a day that is not its month's last day (28 Mar) is a deliberate change and becomes the new due day.
// Run 8: one payment on a different day (paid early or late, or recorded with "Record payment" on the day it was paid)
// does not move the due day when the two payments before it agree; a real change needs two payments in a row on the new
// day. Trade-off: the first payment after a genuine due-date change is read as early/late until the second one confirms it.
function scheduleDueDay(s) {
  const ds=s.occurrences.map(parseLocalDate), isMonthEnd=(d)=>d.getDate()===new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  const dueAt=(n)=>{   // the due day implied by the first n payments
    let day=ds[n-1].getDate();
    for (let i=n-1; i>=0 && isMonthEnd(ds[i]); i--) day=Math.max(day, ds[i].getDate());
    return day;
  };
  const n=ds.length, last=dueAt(n);
  if (n>=3) { const prev=dueAt(n-1), prev2=dueAt(n-2); if (prev===prev2 && last!==prev) return prev; }
  return last;
}

// Dates a schedule is expected to fall on inside month `mon`, projected from its latest occurrence on its due day
// (clamped to the month's length: due on the 31st → 30 Apr, 28/29 Feb).
// Run 12: a bill's dates come from the bill itself — it starts on its anchor date and is due on that date's day (or, weekly,
// every 7 / 14 days from it) — whether or not anything has been paid yet.
function scheduleOccurrences(s, mon) {
  const [y,mo]=mon.split("-").map(Number);
  const first=new Date(y,mo-1,1), last=new Date(y,mo,0);
  const fromBill=!!s.billId;
  const anchor=fromBill ? parseLocalDate(s.anchorDate) : parseLocalDate(s.occurrences[s.occurrences.length-1]);
  const start=fromBill ? anchor : parseLocalDate(s.occurrences[0]);
  const dueDay=Math.min(fromBill ? (s.bill.dueDay||anchor.getDate()) : scheduleDueDay(s), last.getDate());
  if (mon<localMonthStr(start)) return [];                       // the commitment did not exist yet
  const out=[];
  if (s.freq==="weekly" || s.freq==="biweekly") {
    const step=s.freq==="weekly" ? 7 : 14;
    for (let k=Math.ceil(daysBetween(anchor,first)/step); ; k++) {
      const d=new Date(anchor.getFullYear(),anchor.getMonth(),anchor.getDate()+k*step);
      if (d>last) break;
      if (d>=first && d>=start) out.push(d);
    }
  } else if (s.freq==="monthly") out.push(new Date(y,mo-1,dueDay));
  else if (s.freq==="yearly" && anchor.getMonth()===mo-1) out.push(new Date(y,mo-1,dueDay));
  const end=fromBill && s.bill.endDate ? s.bill.endDate : null;   // Run 18: nothing is due after a bill's last date
  return end ? out.filter(d=>localDateStr(d)<=end) : out;
}

// Which expected occurrences in `mon` have no recorded payment yet. Monthly/yearly: any payment of the schedule in that month
// settles it. Weekly/biweekly: each payment settles at most one expected date within ±3 / ±6 days.
function scheduleMonthStatus(s, transactions, mon, now=new Date()) {
  const todayStr=localDateStr(now);
  const expected=scheduleOccurrences(s,mon).map(localDateStr);
  // A bill's payments are the entries linked to it; an inferred schedule's are the unlinked recurring entries with its key.
  const linked=(t)=>!!(t.billId && s.knownBills && s.knownBills.has(t.billId));
  const mine=s.billId ? (t)=>t.billId===s.billId : (t)=>t.recurring && !linked(t) && scheduleKey(t)===s.key;
  const recorded=transactions.filter(t=>mine(t)&&t.date.startsWith(mon)).map(t=>t.date).sort();
  let remaining=[];
  if (s.freq==="monthly" || s.freq==="yearly") remaining = recorded.length ? [] : expected;
  else {
    const tol=s.freq==="weekly" ? 3 : 6, used=new Set();
    expected.forEach(e=>{
      const i=recorded.findIndex((r,ix)=>!used.has(ix) && Math.abs(daysBetween(parseLocalDate(r),parseLocalDate(e)))<=tol);
      if (i>=0) used.add(i); else remaining.push(e);
    });
  }
  return { expected, recorded, remaining, upcoming:remaining.filter(d=>d>=todayStr), overdue:remaining.filter(d=>d<todayStr) };
}

// Next date (today or later) with no payment recorded yet, or null.
function scheduleNextDue(s, transactions, now=new Date()) {
  const todayStr=localDateStr(now);
  for (let i=0;i<14;i++) {
    const mon=localMonthStr(addMonths(new Date(now.getFullYear(),now.getMonth(),1),i));
    const c=scheduleMonthStatus(s,transactions,mon,now).remaining.filter(d=>d>=todayStr);
    if (c.length) return parseLocalDate(c[0]);
  }
  return null;
}

// Run 24: upcoming unpaid bill dates (next 12 months) as an iCalendar file other calendar apps can import. All-day events, one per
// date; nothing leaves the device and the ledger is not touched. Text is escaped and lines folded per RFC 5545.
function icsEscape(s) { return String(s==null?"":s).replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,"); }
function icsFold(line) { const out=[]; let rest=line; while (rest.length>73) { out.push(rest.slice(0,73)); rest=" "+rest.slice(73); } out.push(rest); return out.join("\r\n"); }
function billsToIcs(schedules, transactions, now=new Date(), opts={}) {
  const months=opts.months||12, label=opts.label||((x)=>x.merchant||x.note||x.category), amountText=opts.amountText||((x)=>String(x.amount));
  const todayStr=localDateStr(now), stamp=now.toISOString().replace(/[-:]/g,"").replace(/\.\d+Z$/,"Z");
  const ev=[]; let n=0;
  (Array.isArray(schedules)?schedules:[]).filter(s=>s && s.isActive && s.type==="expense").forEach(s=>{
    for (let i=0;i<months;i++) {
      const mon=localMonthStr(addMonths(new Date(now.getFullYear(),now.getMonth(),1),i));
      scheduleMonthStatus(s,transactions,mon,now).remaining.filter(d=>d>=todayStr).forEach(d=>{
        const next=localDateStr(new Date(parseLocalDate(d).getFullYear(),parseLocalDate(d).getMonth(),parseLocalDate(d).getDate()+1));
        ev.push(["BEGIN:VEVENT","UID:"+icsEscape(String(s.key)+"-"+d)+"@expense-ledger","DTSTAMP:"+stamp,"DTSTART;VALUE=DATE:"+d.replace(/-/g,""),"DTEND;VALUE=DATE:"+next.replace(/-/g,""),
          "SUMMARY:"+icsEscape(label(s)+" · "+amountText(s)),"TRANSP:TRANSPARENT","END:VEVENT"].map(icsFold).join("\r\n")); n++;
      });
    }
  });
  return { text:["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Expense Ledger//Bills//EN","CALSCALE:GREGORIAN",...ev,"END:VCALENDAR"].join("\r\n")+"\r\n", count:n };
}

// Run 18: how many payments of a bill with an end date are still to come (today or later, none recorded for them yet). null = no end date.
function billPaymentsLeft(s, transactions, now=new Date()) {
  const end=s && s.bill && s.bill.endDate; if (!end) return null;
  const todayStr=localDateStr(now), endMon=end.slice(0,7);
  let n=0;
  for (let i=0;i<600;i++) {
    const mon=localMonthStr(addMonths(new Date(now.getFullYear(),now.getMonth(),1),i));
    if (mon>endMon) break;
    n+=scheduleMonthStatus(s,transactions,mon,now).remaining.filter(d=>d>=todayStr).length;
  }
  return n;
}

// S4: Safe to Spend = income received so far this month − savings reserve − spending recorded this month − commitments still to come.
// "Received so far" = income dated today or earlier. Income dated later this month is expected, not available yet: it is
// reported separately (expectedInc) and never added, so the figure is never optimistic. Expenses dated later this month ARE
// subtracted (they are planned spending).
// "Commitments still to come" = every expected payment of an active schedule this month that has no matching recorded payment:
// both upcoming ones and earlier ones that were never recorded (counted so the figure is never optimistic).
// Recurring monthly estimates (recurringMonthly) are informational and are NOT part of this month's subtraction.
function calcSafeToSpend(transactions, safeConfig, goals=[], now=new Date(), bills=[]) {
  const { savingsTarget=0 }=safeConfig||{};
  const mon=localMonthStr(now), todayStr=localDateStr(now);
  // Every expense recorded for this month, including ones dated later: money entered ahead of time is already committed.
  // laterExp is the part of it dated after today, shown on the card so it is not mistaken for money already spent.
  const { totalExp:curExp, plannedExp:laterExp }=calcMonthSummary(transactions,mon,prevMon(),now);
  const monthInc=transactions.filter(t=>t.type==="income"&&t.date.startsWith(mon));
  const curInc=sumCents(monthInc.filter(t=>t.date<=todayStr));          // Run 22 audit: whole cents
  const expectedInc=sumCents(monthInc.filter(t=>t.date>todayStr));
  const p=monthProgress(mon,now);

  const schedules=buildSchedules(transactions,bills).filter(s=>s.isActive && s.type==="expense");
  let upcomingCommitments=0, unrecordedCommitments=0, upcomingCount=0, unrecordedCount=0, matchedAheadCount=0;
  // F1 (counter-review): a payment typed in as an ordinary entry (not linked to its bill) is already inside curExp, so the bill's
  // own expected payment must not be subtracted a second time. Only entries dated AFTER today count (money deliberately set aside
  // ahead; past-dated look-alikes stay unmatched until the user links them — the Run 12 rule). Such an entry settles an upcoming
  // date only when it is clearly the same payment: this month, linked to no bill, same category, same merchant as the bill's name,
  // same amount to the cent. Each entry settles at most one date. Anything less certain stays counted (never optimistic).
  const knownIds=new Set((bills||[]).map(b=>b.id));
  const looseExp=transactions.filter(t=>t.type==="expense" && t.date.startsWith(mon) && t.date>todayStr && !(t.billId && knownIds.has(t.billId)));
  const usedLoose=new Set();
  const cents=(x)=>Math.round((Number(x)||0)*100);
  schedules.forEach(s=>{
    const st=scheduleMonthStatus(s,transactions,mon,now);
    const settle=(dates)=>{
      if (!s.billId) return dates.length;   // inferred schedules already count their own recurring entries
      let open=0;
      dates.forEach(()=>{
        const hit=looseExp.find(t=>!usedLoose.has(t.id) && t.category===s.category && norm(t.merchant)===norm(s.merchant) && cents(t.amount)===cents(s.amount));
        if (hit) { usedLoose.add(hit.id); matchedAheadCount++; } else open++;
      });
      return open;
    };
    const up=settle(st.upcoming), od=st.overdue.length;
    upcomingCommitments+=s.amount*up;  upcomingCount+=up;
    unrecordedCommitments+=s.amount*od; unrecordedCount+=od;
  });
  const futureCommitments=upcomingCommitments+unrecordedCommitments;
  const recurringMonthly=schedules.reduce((sum,s)=>sum+scheduleMonthly(s),0);

  // Goal reserve: only goals that still need money and have a monthly contribution. The reserve is the LARGER of the manual
  // savings floor and the goal contributions (the floor is treated as an overall minimum that already includes them).
  const goalContributions=(goals||[]).filter(g=>g.monthlyTarget>0 && g.target>0 && (g.saved||0)<g.target).reduce((sum,g)=>sum+g.monthlyTarget,0);
  const effectiveSavingsTarget=Math.max(savingsTarget,goalContributions);
  const goalContributionActive=goalContributions>savingsTarget && goalContributions>0;

  const cents2=(x)=>Math.round(x*100)/100;   // Run 22 audit: no floating-point crumbs (5e-17 instead of 0)
  const disposable=cents2(curInc-effectiveSavingsTarget);
  const remaining=cents2(disposable-curExp-futureCommitments);
  const dailyAllowance=p.daysRemaining>0 ? remaining/p.daysRemaining : 0;

  return {
    curInc, expectedInc, curExp, laterExp, savingsTarget, effectiveSavingsTarget, goalContributions, goalContributionActive,
    futureCommitments, upcomingCommitments, unrecordedCommitments, upcomingCount, unrecordedCount, matchedAheadCount,
    scheduleCount:schedules.length, recurringMonthly,
    disposable, remaining, daysLeft:p.daysLeft, daysRemaining:p.daysRemaining, dailyAllowance,
    feasible:curInc>0,
  };
}

// S1: Goals — full funding plan with target date and what-if
function calcGoalProgress(goal, now=new Date()) {
  const num=(v)=>Number.isFinite(Number(v)) && Number(v)>0 ? Number(v) : 0;      // malformed values become 0, never NaN
  const target=num(goal.target), saved=num(goal.saved), monthlyTarget=num(goal.monthlyTarget);
  const pct=target>0 ? Math.min((saved/target)*100,100) : 0;
  const remaining=Math.max(target-saved,0);
  const complete=target>0 && saved>=target;
  const td=(goal.targetDate && isValidDateStr(String(goal.targetDate))) ? parseLocalDate(goal.targetDate) : null;
  const monthLabel=(d,style)=>t("date.monthYear",{ m:t((style==="long"?"mon.":"monShort.")+(d.getMonth()+1)), y:d.getFullYear() });

  let monthsNeeded=null, estCompletion=null, estDate=null;
  // Run 15: the user's own monthly amount follows the same rule as goalRequiredMonthly: one payment on the 1st of each month,
  // so N payments finish on the N-th month-start after today (not N months from today). Counted in whole cents.
  if (monthlyTarget>0 && remaining>0) { const mc=goalCents(monthlyTarget); monthsNeeded=Math.floor((goalCents(target)-goalCents(saved)+mc-1)/mc); estDate=new Date(now.getFullYear(),now.getMonth()+monthsNeeded,1); estCompletion=monthLabel(estDate,"long"); }

  const daysToTarget = td ? daysBetween(now,td) : null;                      // calendar days, not 24-hour blocks
  const overdue = !!td && !complete && daysToTarget<0;
  const behindSchedule = !!td && !complete && !overdue && !!estDate && daysBetween(td,estDate)>0;   // projected finish is after the target date
  const onTrack = !!td && !complete && !overdue && !!estDate && !behindSchedule;
  const noContribution = !complete && remaining>0 && monthlyTarget===0;

  // Run 15: the fixed what-if rows (60% / 100% / 140% of the monthly amount, or 50 when none) and the 25/50/75/100% milestone
  // tiles were removed with their screens. The optional what-if is goalScenario(); the required amount is goalRequiredMonthly().
  return { pct, remaining, complete, monthsNeeded, estCompletion, estDate, daysToTarget, overdue, behindSchedule, onTrack, noContribution };
}

// Run 15: the ONE rule for "how much must I save each month to reach this goal on time". The goal cards, the Home coach and the
// what-if all call it, so the same goal never shows two different figures (the coach used to divide days by 30.44).
// Rule: one contribution on the 1st of each month. The periods are the month-starts after today, up to and including the deadline
// month; when none is left (deadline later this month, or today) there is 1 period. Money is whole cents (integers), rounded UP, so
// periods x amount is never short. It is a plan, not a promise: nothing is moved or reserved.
const goalCents=(v)=>{ const n=Number(v); return Number.isFinite(n)&&n>0 ? Math.round(n*100) : 0; };    // malformed or non-positive -> 0, never NaN
function goalPeriods(td, now) {    // td: a valid deadline on or after today
  const months=(td.getFullYear()*12+td.getMonth())-(now.getFullYear()*12+now.getMonth());
  return { periods:Math.max(1,months), thisMonth:months<1 };
}
function goalRequiredMonthly(goal, now=new Date()) {
  const targetC=goalCents(goal&&goal.target), savedC=goalCents(goal&&goal.saved);
  const remainingC=Math.max(targetC-savedC,0), remaining=remainingC/100;
  const base={ remaining, periods:null, perMonth:null, thisMonth:false };
  if (targetC===0) return { ...base, state:"invalid" };
  if (savedC>=targetC) return { ...base, state:"complete", perMonth:0 };
  const raw=goal.targetDate;
  if (!raw || !isValidDateStr(String(raw))) return { ...base, state:"noDate" };
  const td=parseLocalDate(String(raw));
  if (daysBetween(now,td)<0) return { ...base, state:"overdue" };
  const { periods, thisMonth }=goalPeriods(td,now);
  return { ...base, state:"active", periods, thisMonth, perMonth:Math.floor((remainingC+periods-1)/periods)/100 };
}
// The optional what-if: "if I save this much each month, when do I finish and does that meet the deadline?" Same periods, same cents.
function goalScenario(goal, amount, now=new Date()) {
  const req=goalRequiredMonthly(goal,now);
  if (req.state==="invalid" || req.state==="complete") return { valid:false, reason:req.state };
  const amtC=goalCents(amount);
  if (amtC===0) return { valid:false, reason:"amount" };
  const months=Math.floor((Math.round(req.remaining*100)+amtC-1)/amtC);
  const d=new Date(now.getFullYear(),now.getMonth()+months,1);
  const completion=t("date.monthYear",{ m:t("mon."+(d.getMonth()+1)), y:d.getFullYear() });
  const meetsDeadline=req.state==="active" ? months<=req.periods : req.state==="overdue" ? false : null;
  return { valid:true, months, completion, meetsDeadline };
}

function toMonthlyAmountHelper(t) {
  if (!t.recurFreq) return t.amount;
  if (t.recurFreq==="weekly")   return t.amount*4.33;
  if (t.recurFreq==="biweekly") return t.amount*2.17;
  if (t.recurFreq==="monthly")  return t.amount;
  if (t.recurFreq==="yearly")   return t.amount/12;
  return t.amount;
}

// Run 20: a short heading for each kind of pattern line (the sentence itself says what was found and from how many entries)
const PATTERN_BASIS_KEY={ month:"pat.basisMonth", weeks:"pat.basisWeeks", two:"pat.basisTwo", six:"pat.basisSix" };
const PATTERN_TITLE_KEY={ weekend:"pat.weekend", catconc:"pat.catconc", merchant:"pat.merchant", avgtxn:"pat.avgtxn", dayofweek:"pat.dayofweek", trend:"pat.trend", anomaly:"pat.anomaly" };
// S5: Full financial patterns engine — deterministic, data-only
// Returns { insights, anomalies, dayOfWeek, categoryTrends, correlations }

function calcPatterns(transactions, currency="₼", now=new Date()) {
  const expenses=transactions.filter(t=>t.type==="expense");
  const monBack=(k)=>localMonthStr(new Date(now.getFullYear(),now.getMonth()-k,1));
  const mon=monBack(0), prv=monBack(1), todayStr=localDateStr(now);
  const insights=[];
  const empty={ insights, anomalies:[], dayOfWeek:{}, categoryTrends:[], correlations:[] };
  if (expenses.length<5) return empty;
  const sumOf=(l)=>l.reduce(addAmt,0);
  const pctChange=(a,b)=>Math.round(((a-b)/b)*100);                       // only called with b>0
  const quantile=(sorted,q)=>{ const i=(sorted.length-1)*q, lo=Math.floor(i), hi=Math.ceil(i); return sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo); };
  const isWeekend=(d)=>[0,6].includes(parseLocalDate(d).getDay());
  const DAY_NAMES=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  // ── Weekend vs weekday: spending PER CALENDAR DAY over up to 56 days (never before the first recorded expense).
  //    Totals and per-transaction figures are not compared: a window holds ~2.5× more weekdays than weekend days.
  const earliest=expenses.reduce((m,t)=>t.date<m?t.date:m,todayStr);
  const winStartLimit=new Date(now.getFullYear(),now.getMonth(),now.getDate()-55);
  const startD=parseLocalDate(earliest)>winStartLimit ? parseLocalDate(earliest) : winStartLimit;
  const startStr=localDateStr(startD);
  let weDays=0, wdDays=0;
  for (let d=new Date(startD); localDateStr(d)<=todayStr; d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1)) { if ([0,6].includes(d.getDay())) weDays++; else wdDays++; }
  const win=expenses.filter(t=>t.date>=startStr && t.date<=todayStr);
  if (win.length>=10 && weDays>=8 && wdDays>=20) {
    const weAvg=sumOf(win.filter(t=>isWeekend(t.date)))/weDays, wdAvg=sumOf(win.filter(t=>!isWeekend(t.date)))/wdDays;
    if (weAvg>0 && wdAvg>0) {
      const pct=pctChange(weAvg,wdAvg);
      if (Math.abs(pct)>=20) insights.push({ id:"weekend", basis:{ n:win.length, per:"weeks" }, text:t(pct>0?"ins.weekendMore":"ins.weekendLess",{ pct:Math.abs(pct), we:fmt(weAvg,currency), wd:fmt(wdAvg,currency), days:weDays+wdDays }) });
    }
  }

  // ── Concentration this month
  const monExp=expenses.filter(t=>t.date.startsWith(mon)&&t.date<=todayStr);   // what has happened this month (not entries dated later)
  const monTotal=sumOf(monExp);
  if (monExp.length>=5 && monTotal>0) {
    const catTotals={}; monExp.forEach(t=>{ catTotals[t.category]=addAmt(catTotals[t.category]||0,t); });
    const topCat=Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
    const pct=Math.round((topCat[1]/monTotal)*100);
    if (pct>=40) insights.push({ id:"catconc", basis:{ n:monExp.length, per:"month" }, text:t("ins.catConc",{ cat:catName(topCat[0]), pct }) });
    const mTotals={}, mShown={}; monExp.filter(t=>t.merchant&&t.merchant.trim()).forEach(t=>{ const k=t.merchant.trim().toLowerCase(); if (!(k in mShown)) mShown[k]=t.merchant.trim(); mTotals[k]=addAmt(mTotals[k]||0,t); });   // "Bravo" and "bravo " are one merchant
    const top3=Object.entries(mTotals).sort((a,b)=>b[1]-a[1]).slice(0,3);
    if (top3.length>=2) { const pc=Math.round((top3.reduce((a,[,v])=>Math.round((a+v)*100)/100,0)/monTotal)*100); if (pc>=60) insights.push({ id:"merchant", basis:{ n:monExp.length, per:"month" }, text:t("ins.merchantConc",{ names:top3.map(([m])=>mShown[m]).join(", "), pct:pc }) }); }
  }

  // ── Typical transaction vs last month: the MEDIAN per transaction (a part-month stays comparable, and one unusual purchase
  //    cannot read as a general change; unusual purchases are reported separately as anomalies)
  const median=(l)=>quantile([...l].sort((a,b)=>a-b),0.5);
  const curAmts=monExp.map(t=>t.amount), prvAmts=expenses.filter(t=>t.date.startsWith(prv)).map(t=>t.amount);
  if (curAmts.length>=4 && prvAmts.length>=4) {
    const curMed=median(curAmts), prvMed=median(prvAmts);
    if (prvMed>0) { const pct=pctChange(curMed,prvMed); if (Math.abs(pct)>=20) insights.push({ id:"avgtxn", basis:{ n:curAmts.length+prvAmts.length, per:"two" }, text:t(pct>0?"ins.avgHigher":"ins.avgLower",{ pct:Math.abs(pct), a:curAmts.length, b:prvAmts.length }) }); }
  }

  // ── Day of week. The insight and the Analytics card both use the MEDIAN (the typical transaction; the average is kept in
  //    the data), so one unusual purchase cannot produce a claim. Only days with at least 3 transactions on at least 2 different dates
  //    are compared (one busy Monday is not a weekly pattern); differences of 3× or more are stated as a multiple ("5.0×").
  const dayOfWeek={}; DAY_NAMES.forEach(d=>{ dayOfWeek[d]={ avg:0, median:0, count:0, total:0 }; });
  const dayAmts={}, dayDates={}; monExp.forEach(t=>{ const d=DAY_NAMES[parseLocalDate(t.date).getDay()]; dayOfWeek[d].count++; dayOfWeek[d].total+=t.amount; (dayAmts[d]=dayAmts[d]||[]).push(t.amount); (dayDates[d]=dayDates[d]||new Set()).add(t.date); });
  DAY_NAMES.forEach(d=>{ if (dayOfWeek[d].count>0) { dayOfWeek[d].avg=parseFloat((dayOfWeek[d].total/dayOfWeek[d].count).toFixed(2)); dayOfWeek[d].median=median(dayAmts[d]); } });
  const eligible=DAY_NAMES.filter(d=>dayOfWeek[d].count>=3 && dayDates[d].size>=2);
  if (eligible.length>=2) {
    const byMed=[...eligible].sort((a,b)=>dayOfWeek[b].median-dayOfWeek[a].median), hi=byMed[0], lo=byMed[byMed.length-1];
    const mHi=dayOfWeek[hi].median, mLo=dayOfWeek[lo].median;
    if (mLo>0) {
      const pct=pctChange(mHi,mLo), vars={ hi:t("dow.pl."+hi), lo:t("dow.cmp."+lo), pct, x:(mHi/mLo).toFixed(1), a:dayOfWeek[hi].count, b:dayOfWeek[lo].count };
      if (pct>=30) insights.push({ id:"dayofweek", basis:{ n:dayOfWeek[hi].count+dayOfWeek[lo].count, per:"month" }, text:t(pct>=200?"ins.dayOfWeekX":"ins.dayOfWeek",vars) });
    }
  }

  // ── Category trends over the last 6 COMPLETED months (the current part-month would distort a trend)
  const categoryTrends=[];
  const months6=[6,5,4,3,2,1].map(monBack);
  [...new Set(expenses.map(t=>t.category))].forEach(catId=>{
    const data=months6.map((m,i)=>({ x:i, y:sumOf(expenses.filter(t=>t.category===catId&&t.date.startsWith(m))) }));
    if (data.filter(d=>d.y>0).length<3) return;
    // Least-squares direction of a run of months: "increasing" / "decreasing" when the slope exceeds 5% of the average.
    const direction=(pts)=>{ const n=pts.length, sx=pts.reduce((a,d)=>a+d.x,0), sy=pts.reduce((a,d)=>a+d.y,0), sxy=pts.reduce((a,d)=>a+d.x*d.y,0), sx2=pts.reduce((a,d)=>a+d.x*d.x,0), den=n*sx2-sx*sx;
      if (den===0) return { slope:0, trend:"stable" }; const sl=(n*sxy-sx*sy)/den, avg=sy/n; return { slope:sl, trend: sl>avg*0.05?"increasing":sl<-avg*0.05?"decreasing":"stable" }; };
    const n=data.length, { slope, trend }=direction(data);
    const last=data[n-1].y, prev=data[n-2].y;
    const trendPct=prev>0 ? pctChange(last,prev) : 0;
    categoryTrends.push({ catId, trend, trendPct, slope:parseFloat(slope.toFixed(2)), monthlyData:data });
    // "Over recent months" only when the months BEFORE last month already moved the same way; a one-month jump is stated as
    // what it is (last month vs the month before), not as a trend.
    const sustained=direction(data.slice(0,n-1)).trend===trend;
    if (trend!=="stable" && prev>0 && last>0 && Math.abs(trendPct)>=20) {
      const vars={ cat:catName(catId), pct:`${trendPct>0?"+":""}${trendPct}` };
      insights.push({ id:`trend-${catId}`, basis:{ n:expenses.filter(t=>t.category===catId&&months6.some(m=>t.date.startsWith(m))).length, per:"six" }, text: sustained ? t(trend==="increasing"?"ins.trendUp":"ins.trendDown",vars) : t("ins.lastMonthChange",vars) });
    }
  });

  // ── Unusually large transactions this month: above Q3 + 1.5×IQR of that category's history AND at least 1.5× its median
  const hist={}; expenses.forEach(t=>{ (hist[t.category]=hist[t.category]||[]).push(t.amount); });
  const anomalies=[];
  monExp.forEach(tx=>{
    const h=[...(hist[tx.category]||[])].sort((a,b)=>a-b);
    if (h.length<8) return;
    const q1=quantile(h,0.25), q3=quantile(h,0.75), med=quantile(h,0.5);
    if (tx.amount>q3+1.5*(q3-q1) && med>0 && tx.amount>=1.5*med)
      anomalies.push({ date:tx.date, amount:tx.amount, category:tx.category, merchant:tx.merchant||"", reason:t("ins.anomalyReason",{ x:(tx.amount/med).toFixed(1), cat:catName(tx.category), med:fmt(med,currency) }), severity:"high" });
  });
  anomalies.sort((a,b)=>b.amount-a.amount).splice(10);
  if (anomalies.length) insights.push({ id:"anomaly", basis:{ n:monExp.length, per:"month" }, text:tn("ins.anomalies",anomalies.length) });

  // ── Categories recorded on the same day (co-occurrence — it does not mean one causes the other)
  const correlations=[];
  const catByDay={}; monExp.forEach(t=>{ (catByDay[t.date]=catByDay[t.date]||new Set()).add(t.category); });
  const days=Object.keys(catByDay).length, pairCounts={};
  Object.values(catByDay).forEach(set=>{ const u=[...set]; for (let i=0;i<u.length;i++) for (let j=i+1;j<u.length;j++) { const k=[u[i],u[j]].sort().join("__"); pairCounts[k]=(pairCounts[k]||0)+1; } });
  if (days>=8) {
    Object.entries(pairCounts).filter(([,c])=>c>=Math.max(3,Math.ceil(days*0.3))).sort((a,b)=>b[1]-a[1]).slice(0,3).forEach(([k,c])=>{
      const [c1,c2]=k.split("__"); correlations.push({ category1:c1, category2:c2, frequency:c, correlation:parseFloat((c/days).toFixed(2)) });
    });
    if (correlations.length) { const top=correlations[0]; insights.push({ id:"same-day", text:t("ins.sameDay",{ a:catName(top.category1), b:catName(top.category2), pct:Math.round(top.correlation*100) }) }); }
  }
  return { insights, anomalies, dayOfWeek, categoryTrends, correlations };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Privacy mode (Run 9): a display-only switch for this session. While it is on, every formatted amount, percentage and
// personal name on screen (and in accessible names) is replaced by dots. It never touches stored data, imports, exports or
// calculations, and it is not security: the data is still in the browser's storage, readable by anyone with the phone unlocked.
let PRIVACY=false;
const MASK="••••";
function setPrivacyMode(on) { PRIVACY=!!on; }
function maskText(s) { return PRIVACY && s ? "•••••" : s; }
function fmtPct(n) { return PRIVACY ? "••%" : `${n}%`; }
function fmt(n, sym="₼") {
  if (PRIVACY) return `${MASK} ${sym}`;
  return `${Math.abs(n||0).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})} ${sym}`;
}
// The three small Home tiles. Exact below 10,000 (1,050.00 used to show as "1.1k", which reads as 1,100 — Run 7, V4);
// above that the short form is marked "≈" so it is never taken for an exact figure.
function fmtShort(n, sym="₼") {
  if (PRIVACY) return fmt(n,sym);
  const a=Math.abs(n||0);
  return a>=1e6?`≈${(a/1e6).toFixed(1)}M ${sym}`:a>=10000?`≈${(a/1000).toFixed(1)}k ${sym}`:fmt(a,sym);
}
// Dates and month names follow the interface language. They are built from the catalog (mon.* / monShort.* / monGen.*)
// rather than toLocaleDateString, because Chrome ships without Azerbaijani date data and would show "2026 M10".
// Amounts keep the "1,234.56" form in every language for now, because amounts are typed with a decimal point (see
// MONEY_TEXT_RE); showing "1 234,56" while requiring "1234.56" would mislead.
function fmtDate(d) {
  if (!d) return "";
  const td=today();
  if (d===td) return t("date.today");
  const y=new Date(); y.setDate(y.getDate()-1);
  if (d===localDateStr(y)) return t("date.yesterday");
  const dt=parseLocalDate(d);
  return t("date.dayMonth",{ d:dt.getDate(), m:t("monShort."+(dt.getMonth()+1)) });
}
// Full date in the interface language (e.g. "13 October 2026"), used wherever a long date is shown.
function fmtLongDate(v) { const dt=v instanceof Date ? v : new Date(v); return t("date.long",{ d:dt.getDate(), m:t("monGen."+(dt.getMonth()+1)), y:dt.getFullYear() }); }
function monthName(ym) { const [y,m]=ym.split("-").map(Number); return t("date.monthYear",{ m:t("mon."+m), y }); }
function monthShort(ym) { return t("monShort."+Number(ym.split("-")[1])); }
function daysInMonth(ym) { const [y,m]=ym.split("-").map(Number); return new Date(y,m,0).getDate(); }
function median(arr) {
  if (!arr.length) return 0;
  const s=[...arr].sort((a,b)=>a-b),m=Math.floor(s.length/2);
  return s.length%2?s[m]:(s[m-1]+s[m])/2;
}

// ─── Redesign (2026-10-27): figures for the Home ring, the Analytics trend and the Home greeting ───
// Time-of-day greeting for the Home title. No name: the app does not know the user's name and does not ask for it.
function greetingKey(now=new Date()) { const h=now.getHours(); return h<5?"home.greet.evening":h<12?"home.greet.morning":h<18?"home.greet.afternoon":"home.greet.evening"; }
// Whole-number percentages that add up to exactly 100 (largest remainder), so a legend never shows 99% or 101%.
// Rows with no amount get 0. Returns [] when the total is 0.
function pctShares(amounts) {
  const total=amounts.reduce((s,a)=>s+a,0); if (!(total>0)) return [];
  const raw=amounts.map(a=>a/total*100), out=raw.map(Math.floor);
  let left=100-out.reduce((s,a)=>s+a,0);
  raw.map((r,i)=>[r-out[i],i]).sort((a,b)=>b[0]-a[0]||a[1]-b[1]).forEach(([,i])=>{ if (left>0 && amounts[i]>0) { out[i]++; left--; } });
  return out;
}
// The month's spending by category for the Home ring: the five largest, the rest (if any) combined as "Other".
function donutSlices(catSpend, max=5) {
  const rows=Object.entries(catSpend).filter(([,a])=>a>0).sort((a,b)=>b[1]-a[1]);
  const top=rows.slice(0,max).map(([id,amt])=>({ id, amt, color:CAT(id)?.color||"#98A5B7", name:catName(id) }));
  const rest=rows.slice(max).reduce((s,[,a])=>s+a,0);
  if (rest>0) top.push({ id:"_rest", amt:rest, color:"#5F6B7C", name:t("home.otherCats") });
  const pct=pctShares(top.map(x=>x.amt));
  return top.map((x,i)=>({ ...x, pct:pct[i] }));
}
// Running total of a month's expenses, day by day: element d-1 is everything spent on days 1…d. Only what has happened
// counts (days after today are null in the current month; a future month is all null), matching the month's "Spent" figure.
function cumulativeByDay(transactions, mon, now=new Date()) {
  const n=daysInMonth(mon), p=monthProgress(mon,now), last=p.state==="future"?0:p.state==="past"?n:p.daysPassed;
  const perDay=new Array(n).fill(0);
  transactions.forEach(x=>{ if (x.type==="expense" && x.date.startsWith(mon)) { const d=Number(x.date.slice(8,10)); if (d>=1 && d<=last) perDay[d-1]+=x.amount; } });
  let run=0; return perDay.map((v,i)=>{ run=Math.round((run+v)*100)/100; return i<last?run:null; });
}

// Run 23: iPhone/iPad in a Safari-engine browser tab (every iPhone browser) that is NOT installed to the Home Screen. Apple may clear such a site's saved
// data after about a week of non-use, so the app says so once. Installed Home Screen apps are exempt from that rule and are not told.
const IOS_NOTE_KEY=KEY+"__iosnote";
function iosBrowserTab() {
  try {
    const ios=/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
    const installed=navigator.standalone===true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
    return ios && !installed;
  } catch { return false; }
}
function iosNoteSeen() { try { return localStorage.getItem(IOS_NOTE_KEY)==="1"; } catch { return false; } }
// Run 29: Android restores an app's data from the user's Google backup (or a phone-to-phone transfer) when the app is installed. That copy can be
// older than the ledger the user had, and nothing in the data says so (confirmed on an emulator, 6 Nov 2026: an entry made after the backup was gone
// after a reinstall, silently). The Android shell keeps a random id in a place that is NOT backed up (window.LedgerNative.installId()); the ledger
// keeps the id it saw last under KEY+"__install" (which IS backed up). A different id means this data came from somewhere else: say so once.
// No id (website, older shell) or no earlier id (first run, ledger from before this feature) never produces a notice.
const INSTALL_KEY=KEY+"__install";
function restoreCheck(stored, current) {
  const cur=typeof current==="string"?current.trim():"";
  if (!cur || cur.length>128) return "none";
  if (typeof stored!=="string" || !stored) return "first";
  return stored===cur?"same":"restored";
}
// Run 30 (Android app only): reminders. The Android shell (window.LedgerNative.reminders) schedules local notifications; nothing is sent anywhere.
// Preferences are a plain setting kept beside the ledger (KEY+"__reminders"), all OFF until the user turns them on (Android asks for permission then).
// reminderPlan() is a pure function: from the bills / recurring payments and the entries already recorded, it lists the notifications that
// should exist in the next days. The shell cancels what it had and schedules exactly this list, so a paid bill, an edited date or a deleted
// bill can never leave a stale reminder behind. Bills: on the due day. Recurring payments found from entries: the day before. Daily nudge: 21:00.
const REMIND_KEY=KEY+"__reminders";
const REMIND_EVENT="ledger-reminders-changed";
const REMIND_DEFAULT=Object.freeze({ bills:false, recurring:false, daily:false, time:"09:00", hideAmount:false });
function cleanReminderPrefs(raw) {
  const r=raw && typeof raw==="object" ? raw : {};
  const time=typeof r.time==="string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.time) ? r.time : REMIND_DEFAULT.time;
  return { bills:r.bills===true, recurring:r.recurring===true, daily:r.daily===true, time, hideAmount:r.hideAmount===true };
}
function readReminders() { try { return cleanReminderPrefs(JSON.parse(localStorage.getItem(REMIND_KEY)||"null")); } catch { return { ...REMIND_DEFAULT }; } }
function writeReminders(p) {
  try { localStorage.setItem(REMIND_KEY,JSON.stringify(cleanReminderPrefs(p))); if (typeof window!=="undefined") window.dispatchEvent(new Event(REMIND_EVENT)); return true; } catch { return false; }
}
const remindersAvailable=()=>{ try { const n=window.LedgerNative; return !!(n && n.reminders && typeof n.reminders.sync==="function"); } catch { return false; } };
function reminderId(s) { let h=5381; for (let i=0;i<s.length;i++) h=((h*33)^s.charCodeAt(i))>>>0; return (h%2147483000)+1; }   // stable positive int per (kind, schedule, date)
function reminderPlan(schedules, transactions, prefs, now=new Date(), opts={}) {
  const p=cleanReminderPrefs(prefs), horizon=opts.horizon||30, cap=opts.cap||60, out=[];
  const [hh,mm]=p.time.split(":").map(Number), todayStr=localDateStr(now);
  const endStr=localDateStr(new Date(now.getFullYear(),now.getMonth(),now.getDate()+horizon));
  const at=(dStr,h,m)=>{ const d=parseLocalDate(dStr); return new Date(d.getFullYear(),d.getMonth(),d.getDate(),h,m,0,0); };
  const push=(kind,key,dStr,when,extra)=>{ if (when.getTime()<=now.getTime()) return; out.push({ id:reminderId(kind+"|"+key+"|"+dStr), kind, date:dStr, atMs:when.getTime(), ...extra }); };
  if (p.bills || p.recurring) {
    (Array.isArray(schedules)?schedules:[]).filter(s=>s && s.isActive && s.type==="expense").forEach(s=>{
      const bill=!!s.billId; if (bill ? !p.bills : !p.recurring) return;
      const seen=new Set();
      for (let i=0;i<=Math.ceil(horizon/28)+1;i++) {
        const mon=localMonthStr(addMonths(new Date(now.getFullYear(),now.getMonth(),1),i));
        scheduleMonthStatus(s,transactions,mon,now).remaining.filter(d=>d>=todayStr && d<=endStr).forEach(d=>{
          if (seen.has(d)) return; seen.add(d);
          const name=s.merchant||s.note||s.category, extra={ name, amount:s.amount };
          if (bill) push("bill",s.key,d,at(d,hh,mm),extra);
          else { const day=parseLocalDate(d); push("recurring",s.key,d,at(localDateStr(new Date(day.getFullYear(),day.getMonth(),day.getDate()-1)),hh,mm),extra); }
        });
      }
    });
  }
  if (p.daily) {
    const spentToday=(Array.isArray(transactions)?transactions:[]).some(x=>x && x.date===todayStr);
    for (let i=0;i<14;i++) {
      const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i), ds=localDateStr(d);
      if (i===0 && spentToday) continue;
      push("daily","d",ds,new Date(d.getFullYear(),d.getMonth(),d.getDate(),21,0,0,0),{});
    }
  }
  return out.sort((a,b)=>a.atMs-b.atMs || a.id-b.id).slice(0,cap);
}
// The text of one notification (shown on the lock screen). With "hide amounts" on, or the app's own privacy mode, no amount is written.
function reminderMessage(item, prefs, currency) {
  if (item.kind==="daily") return { title:t("remind.dailyTitle"), body:t("remind.dailyBody") };
  const hide=cleanReminderPrefs(prefs).hideAmount || PRIVACY;
  const name=hide ? t("remind.aPayment") : item.name;
  return { title:t(item.kind==="bill"?"remind.billTitle":"remind.recurTitle",{name}), body:hide ? t("remind.bodyHidden") : t("remind.body",{amount:fmt(item.amount,currency)}) };
}

function calcHelperCards(transactions, budgets, goals, safeToSpend, currency, bills=[]) {
  const cards = [];
  const mon = curMon();
  const { curExp, curInc } = calcMonthSummary(transactions, mon);
  const catSpend = calcCategorySpend(transactions, mon);
  const budgetTotal = Object.values(budgets||{}).reduce((s,v)=>s+(v||0),0);
  const spentToDate = calcSpentToDate(transactions, mon);
  const paceInfo = calcSpendingPace(spentToDate, mon, budgetTotal);
  const budgetItems = calcBudgetStatus(budgets||{}, catSpend, mon);
  const safeInfo = calcSafeToSpend(transactions, safeToSpend, goals, new Date(), bills);

  // 1. Spending pace — only fire when compared against a real budget (onTrack===false)
  if (paceInfo.onTrack === false && paceInfo.daysRemaining > 0 && spentToDate > 0) {
    const overage = spentToDate - paceInfo.expectedByToday;
    const remainingBudget = budgetTotal - curExp;
    cards.push({
      id:"pace", type:"warn", icon:"pace",
      title:t("pace.title"),
      text:t("help.paceText",{amount:fmt(overage,currency)}),
      impact: remainingBudget>0
        ? tn("help.paceLeft",paceInfo.daysRemaining,{ left:fmt(remainingBudget,currency), perDay:fmt(remainingBudget/paceInfo.daysRemaining,currency) })
        : remainingBudget<0
          ? tn("help.paceUsedOver",paceInfo.daysRemaining,{ over:fmt(Math.abs(remainingBudget),currency) })
          : tn("help.paceUsed",paceInfo.daysRemaining),
    });
  }

  // 2. Budget warnings — over or approaching
  budgetItems.filter(b=>b.over||b.warn).forEach(b=>{
    const name=catName(b.catId);
    cards.push({
      id:`budget-${b.catId}`, type:b.over?"neg":"warn", icon:b.catId,
      title:t("help.budgetTitle",{cat:name}),
      text:b.over
        ?t("help.budgetOver",{cat:name,amount:fmt(b.spent-b.limit,currency)})
        :tn("help.budgetWarn",b.daysLeft,{cat:name,pct:PRIVACY?"••":Math.round(b.pct)}),
      impact:b.over
        ?t("help.budgetOverImpact",{cat:name})
        :t("help.budgetWarnImpact",{left:fmt(b.limit-b.spent,currency),perDay:fmt((b.limit-b.spent)/Math.max(b.daysLeft,1),currency)}),
    });
  });

  // 3. Goals that will miss their target date, or whose date has passed
  goals?.forEach(goal=>{
    const gp=calcGoalProgress(goal);
    // Run 15: a short alert only. The required monthly amount, the dates and the what-if are on the Goals tab, not repeated here.
    if (gp.behindSchedule && goal.monthlyTarget>0) {
      cards.push({
        id:`goal-${goal.id}`, type:"warn", icon:"goal",
        title:t("help.goalTitle",{name:goal.name}),
        text:t("help.goalBehind",{name:goal.name}),
        impact:t("help.goalBehindImpact"),
      });
    } else if (gp.overdue) {
      cards.push({
        id:`goal-${goal.id}`, type:"warn", icon:"goal",
        title:t("help.goalTitle",{name:goal.name}),
        text:t("help.goalOverdue",{name:goal.name}),
        impact:t("help.goalOverdueImpact"),
      });
    }
  });

  // 4. Safe to Spend negative
  if (safeToSpend?.enabled && safeInfo.feasible && safeInfo.remaining < 0) {
    cards.push({
      id:"safe-neg", type:"neg", icon:"safe",
      title:t("help.safeNegTitle"),
      text:t("help.safeNegText",{amount:fmt(Math.abs(safeInfo.remaining),currency)}),
      impact:t("help.safeNegImpact",{income:fmt(safeInfo.curInc,currency)})+(safeInfo.expectedInc>0?" "+t("help.safeNegExpected",{amount:fmt(safeInfo.expectedInc,currency)}):"")+" "+t("help.safeNegReview"),
    });
  }

  // 5. Recurring audit — one line per schedule, not per recorded payment
  const activeSchedules = buildSchedules(transactions, bills).filter(x=>x.isActive && x.type==="expense");
  if (activeSchedules.length >= 3) {
    const monthlyTotal = activeSchedules.reduce((sum,x)=>sum+scheduleMonthly(x),0);
    const pctOfIncome = curInc>0 ? Math.round((monthlyTotal/curInc)*100) : 0;
    if (pctOfIncome >= 30) {
      cards.push({
        id:"recur-audit", type:"info", icon:"repeat",
        title:t("help.recurTitle"),
        text:t("help.recurText",{n:activeSchedules.length,amount:fmt(monthlyTotal,currency),pct:PRIVACY?"••":pctOfIncome}),
        impact:t("help.recurImpact"),
      });
    }
  }

  // 6. High-spend anomaly this month
  const patternsData = calcPatterns(transactions, currency);
  if (patternsData.anomalies.length > 0) {
    const top = patternsData.anomalies[0];
    cards.push({
      id:"anomaly-top", type:"info", icon:"other",
      title:t("help.anomalyTitle"),
      text:t("help.anomalyText",{who:top.merchant||catName(top.category),date:fmtDate(top.date),amount:fmt(top.amount,currency),reason:top.reason}),
      impact:t("help.anomalyImpact",{cat:catName(top.category)}),
    });
  }

  // Limit to 4 most impactful cards
  return cards.slice(0, 4);
}



export { migrateAndLoad, buildMerchantMemory, merchantSuggest, memKey, calcHelperCards, calcSafeToSpend, calcSpendingPace, calcBudgetStatus, calcMonthSummary, calcPatterns, calcGoalProgress, goalRequiredMonthly, goalScenario, walletId, WALLET_IDS, lastWallet, calcWalletSpend, cleanSubcats, addUserSubcat, removeUserSubcat, THEMES, THEME_IDS, THEME_KEY, themeId, readTheme, writeTheme, renameUserSubcat, renameSubcatInEntries, mergeSubcats, readSubcats, writeSubcats, calcCategorySpend, calcWhatChanged, calcTxnStats, calcSpentToDate, prevMon, nMon, surplusLabel, surplusColor, normaliseTxn, addMonths, strictNum, parseMoney, moneyReason, isUsableRawTxn, checkRawTxn, isValidDateStr, localDateStr, localMonthStr, parseLocalDate, daysInMonth, daysBetween, parseCSV, validateSettings, planImport, applyImport, buildBackup, buildCsv, countSuspectedDuplicates, txnFingerprint, partitionTransactions, ensureUniqueIds, summariseReasons, noteLoad, buildSchedules, scheduleOccurrences, scheduleMonthStatus, scheduleNextDue, scheduleKey, monthProgress, toMonthlyAmountHelper, fmt, detectRecurrence, calcMerchantProfile, resolveCategory, curMon, sanitizeTransactions, MAX_AMOUNT, CATEGORIES, CAT, calcWeekdayWeekend, backupReminderDue, BACKUP_REMINDER_DAYS, pctShares, donutSlices, cumulativeByDay, greetingKey, storageProtection, shareBackupFile, shareViaNative, nativeShareHook, appVersionOf, checkForUpdate, validateBill, convertLegacySchedules, assignToBill, BACKUP_VERSION, buildBillsMirror, planBillRestore, applyBillRestore, BILLS_MIRROR_KEY, calcMonthEndForecast, calcCoach, forSpending, loanCashOut, debtsHealth, debtCashFlow, debtLinkRef, billPaymentsLeft, loanExtraEffect, PRIVACY_KEY, readPrivacy, writePrivacy, LOCK_KEY, LOCK_TIMEOUTS, validPin, lockSupported, readLock, writeLock, removeLock, makeLockRecord, verifyPin, lockWaitMs, lockShouldEngage, cleanProfileName, PROFILE_NAME_MAX, loanSchedule, impliedNominalPct, debtRemaining, debtCanPay, cleanDebtData, readDebts, writeDebts, mergeDebtData, tripName, tripTotals, catTotals, budgetCrossing, billsToIcs, icsEscape, bankMoney, bankDate, cleanCustomCats, applyCustomCats, addCustomCat, editCustomCat, mergeCustomCats, customCatInUse, planImportWithCats, splitTransaction, cleanAccountData, accountBalances, addAccount, editAccount, addTransfer, accountInUse, mergeAccountData, parseCsvImport, netPosition, loanRemainingCents, reminderPlan, cleanReminderPrefs, reminderMessage, REMIND_DEFAULT, t, tn, tIn, setLang, getLang, MESSAGES, LANGS, LANG_NAMES, LOCALES, catName, subName, monthName, monthShort, fmtLongDate };
export const getNotice=()=>LOAD_NOTICE; export const getSaveBlocked=()=>SAVE_BLOCKED;
export const resetFlags=()=>{LOAD_NOTICE=null;SAVE_BLOCKED=false;if(typeof SAVE_BLOCKED_READ!=='undefined')SAVE_BLOCKED_READ=false;};
