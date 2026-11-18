# az / ru / en review sheet: security and privacy wording, Runs 107–108 (18 Nov 2026)

**These texts have NOT been checked by a native speaker.** Claude wrote the az and ru texts. This sheet is for the owner or a native
reviewer to check. No privacy or security wording was changed while making it. Where a problem is suspected, it is listed under
"Question", with a proposed text, so the owner can decide.

Source: `i18n.js` in `Expense-ledger2-fixes` (HEAD after dbbabff). Keys added in Runs 106–108 come from `git diff cf4a596..HEAD -- i18n.js`. Placeholders in
`{braces}` are filled by the app; the examples show them filled.

| # | Key (i18n.js line) | Where it shows | EN | AZ | RU | Placeholders |
|---|---|---|---|---|---|---|
| 1 | `snack.notSaved` (1028) | Bottom bar, when the phone refuses to save (storage full or blocked); `App.jsx:6337` | Not saved on this device | Bu cihazda yadda saxlanmadı | Не сохранено на этом устройстве | none |
| 2 | `sync.editGone` (1066) | Toast when you save an entry that another open window has deleted; `App.jsx:5383` | This entry was deleted in another window, so the change was not saved. | Bu əməliyyat başqa pəncərədə silinib, ona görə dəyişiklik saxlanmadı. | Эта операция удалена в другом окне, поэтому изменение не сохранено. | none |
| 3 | `sync.otherWindow` (1067) | Toast after another window's changes are pulled in; `App.jsx:5031` | Updated with the changes you made in another window. | Başqa pəncərədə etdiyiniz dəyişikliklər burada da göstərildi. | Здесь показаны изменения, сделанные в другом окне. | none |
| 4 | `import.tooBig` (1068) | Import preview, file over 50 MB; `App.jsx:6034` | That file is larger than 50 MB, far bigger than any backup or statement, so it was not opened. Nothing was changed. | Bu fayl 50 MB-dan böyükdür, heç bir yedək və ya çıxarış bu qədər olmur, ona görə açılmadı. Heç nə dəyişmədi. | Этот файл больше 50 МБ — таких резервных копий и выписок не бывает, поэтому он не открыт. Ничего не изменилось. | none |
| 5 | `photo.note` (2323) | Under a receipt photo in the entry form; `photo.jsx:165` | The photo is kept only on this phone. Backups do not include it. | Şəkil yalnız bu telefonda saxlanılır. Ehtiyat nüsxəyə düşmür. | Фото хранится только на этом телефоне. В резервную копию оно не попадает. | none |
| 6 | `info.privacy.6.h` / `.b` (1165–1166) | Settings > Privacy, section 6 | Debts, loans and recovery copies / "…Receipt photos stay only on this device: they are not part of backups, exported files, the Google Drive backup or the account copy." | Borclar, kreditlər və bərpa surətləri / "…Qəbz şəkilləri yalnız bu cihazda qalır: …" | Долги, кредиты и копии для восстановления / "…Фото чеков остаются только на этом устройстве: …" | none |
| 7 | `acct.pausedRestore` (2266) | Bell + Settings > Account, when the account already holds data | Your account already holds data. Review it, or keep this phone's data instead. Saving is paused until you choose. | Hesabınızda artıq məlumat var. Ona baxın və ya bu telefonun məlumatlarını saxlayın. Seçim edənə qədər saxlama dayandırılıb. | В аккаунте уже есть данные. Просмотрите их или оставьте данные этого телефона. Пока вы не выберете, сохранение приостановлено. | none |
| 8 | `acct.pausedConflict` (2267) | Same places, when another device saved newer data | Another device saved newer data to your account. Review it, or keep this phone's data instead. Saving is paused until you choose. | Başqa cihaz hesaba daha yeni məlumat saxlayıb. … | Другое устройство сохранило в аккаунт более новые данные. … | none |
| 9 | `acct.review` (2268) | Button beside 7 and 8 | Review account data | Hesabdakı məlumatları nəzərdən keçirin | Просмотреть данные аккаунта | none |
| 10 | `acct.err.toolarge` (2285) | Settings > Account, data over the 8 MB server limit | Your data is too large to save to the account. It is safe on this phone. | Məlumatlar hesaba saxlamaq üçün çox böyükdür. Bu telefonda təhlükəsizdir. | Данных слишком много для сохранения в аккаунт. На телефоне они в безопасности. | none |
| 11 | `drive.failing` (2237) | Bell + Settings > Google Drive, after 3 or more failed days | The backup has not worked for {n} days. Press Back up now to see why. | Ehtiyat nüsxə {n} gündür alınmır. Səbəbini görmək üçün «İndi ehtiyat nüsxə yaradın» düyməsini basın. | Копия не сохраняется уже {n} дн. Нажмите «Сохранить сейчас», чтобы узнать причину. | `{n}` days, at least 3 |
| 12 | `acc.looseBell` (2127) | Bell: entries with no account | 1 entry since {date} has no account, so {amount} is missing from your account balances. (plural forms) | {date} tarixindən {n} qeydin hesabı yoxdur, ona görə {amount} hesab qalıqlarınızda görünmür. | one/few/many forms: "{n} записи с {date} без счёта, поэтому {amount} не попадает в остатки ваших счетов." | `{n}`, `{date}`, `{amount}` |
| 13 | `acc.looseShort` (2128) | Home, under the accounts card | {n} entries ({amount}) are in no account | {n} qeyd ({amount}) heç bir hesabda deyil | {n} записей ({amount}) без счёта | `{n}`, `{amount}` |

Rendered examples (filled in by hand; the date and money formats are approximate, not captured from the screen):
- 11 en: "The backup has not worked for 4 days. Press Back up now to see why." / ru: "Копия не сохраняется уже 4 дн. Нажмите «Сохранить сейчас», чтобы узнать причину."
- 12 ru (few): "3 записи с 1 нояб. без счёта, поэтому 45,00 ₼ не попадает в остатки ваших счетов." / az: "1 noy. tarixindən 3 qeydin hesabı yoxdur, ona görə 45,00 ₼ hesab qalıqlarınızda görünmür."
- 13 ru (many): "5 записей (120,00 ₼) без счёта".

Checked by Claude (not a native speaker): every button named inside a text matches the real button label in that language
(`drive.backupNow`: "Back up now" / «İndi ehtiyat nüsxə yaradın» / «Сохранить сейчас»). The ru plural forms one/few/many are present where `{n}` varies.

## Questions for the owner or a native reviewer (nothing changed)

| # | Text | Concern | Proposal |
|---|---|---|---|
| Q1 | `acct.err.toolarge`, `acct.paused*` say "this phone" | Account sign-in also works on the website, where the device is a computer. On a computer, "safe on this phone" is not true. | en "this device", az "bu cihaz", ru "этом устройстве". This is a privacy statement, so it needs the owner's OK. |
| Q2 | `import.tooBig` az uses **yedək** | Every other az text says **ehtiyat nüsxə** for a backup. | az: "…heç bir ehtiyat nüsxə və ya çıxarış bu qədər olmur…" |
| Q3 | `drive.failing` ru "{n} дн." | The shortened form reads like a template. | ru plural forms: "уже 3 дня" / "уже 5 дней". |
| Q4 | `snack.notSaved` | It says what happened but not what to do. Data typed after this point may be lost when the app closes. | en "Not saved on this device. Free some space or export a backup now." (az/ru to follow). This is a data-loss warning, so it needs the owner's OK. |
| Q5 | `sync.editGone` az/ru say **əməliyyat / операция**; en says "entry" | This follows the 12 Nov decision (az/ru may mix terms). Listed only for the reviewer. | No change unless the reviewer prefers "qeyd" / "запись", the words used in 12 and 13. |
| Q6 | `photo.note` names only "backups"; the Privacy text (6.b) also names exported files, Drive and the account copy | Both are true; the short one is less complete. | Optional: "…Backups, exports, Drive and the account copy do not include it." |

Status: wording inventory **VERIFIED** (read from code). Native-speaker review **NOT ASSESSED** (needs a person). Q1 and Q4 **need an owner decision**
(privacy and data-loss wording). Q2, Q3, Q5 and Q6 are wording-only and could be done in the next run once approved.
