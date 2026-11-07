// Run 33 (APK level): the fingerprint option inside the Android app uses the phone's own prompt (window.LedgerNative.biometric). Tested against a MOCK shell;
// the real prompt is tested on the emulator separately. The PIN is never replaced: a marker with no shell never unlocks.
import { H, ok, section, reset, finish } from "./lib.mjs";
const { bioAvailable, bioRegister, bioCheck, NATIVE_BIO, screenSecureNative, setLang, t } = H;
reset();
const shell = (bio, extra = {}) => { globalThis.window = { LedgerNative: { biometric: bio, ...extra } }; };
const noShell = () => { delete globalThis.window; };
const calls = [];
const mk = (avail, auth) => ({ available: () => (avail instanceof Error ? Promise.reject(avail) : Promise.resolve(avail)), authenticate: (o) => { calls.push(o); return Promise.resolve(auth); } });

section("R33-B1. Is it offered?");
noShell();
ok((await bioAvailable()) === false, "website in node (no WebAuthn, no shell): not offered");
shell(mk(true, true)); ok((await bioAvailable()) === true, "shell says a strong fingerprint/face is enrolled: offered");
shell(mk(false, true)); ok((await bioAvailable()) === false, "shell says none enrolled or no hardware: not offered");
shell(mk(new Error("boom"), true)); ok((await bioAvailable()) === false, "shell throws: not offered, no error");
shell(mk("yes", true)); ok((await bioAvailable()) === false, "anything other than exactly true is not accepted as available");

section("R33-B2. Setting it up");
shell(mk(true, true)); calls.length = 0;
ok((await bioRegister()) === NATIVE_BIO && NATIVE_BIO === "native-biometric-v1", "a successful prompt stores the marker 'native-biometric-v1'");
setLang("az"); await bioRegister(); setLang("ru"); await bioRegister(); setLang("en");
ok(calls.length === 3 && !!calls[0].title && calls[0].title === t("lock.useBio"), "the prompt is given a title", calls[0]);
ok(calls[1].title !== calls[0].title && calls[2].title !== calls[0].title && calls[1].cancel && calls[2].cancel, "the title and the Cancel button text are in the app's language (az and ru differ from en)", calls);
shell(mk(true, false));
let threw = false; try { await bioRegister(); } catch { threw = true; }
ok(threw, "a cancelled or failed prompt makes setup fail (the app then shows its own message and no marker is saved)");
shell(mk(true, "true")); threw = false; try { await bioRegister(); } catch { threw = true; }
ok(threw, "a prompt answer that is not exactly true is a failure");

section("R33-B3. Unlocking");
shell(mk(true, true)); ok((await bioCheck(NATIVE_BIO)) === true, "success from the prompt unlocks");
shell(mk(true, false)); ok((await bioCheck(NATIVE_BIO)) === false, "a failed or cancelled prompt does not unlock");
shell(mk(true, undefined)); ok((await bioCheck(NATIVE_BIO)) === false, "no clear answer does not unlock");
noShell(); ok((await bioCheck(NATIVE_BIO)) === false, "the marker with no shell (a backup opened in a browser) never unlocks; the PIN does");
calls.length = 0; shell(mk(true, true));
let r; try { r = await bioCheck("someWebAuthnCredentialId=="); } catch { r = "threw"; }
ok(calls.length === 0 && r !== true, "an ordinary website credential id is never sent to the native prompt, and cannot unlock here", r);

section("R33-B4. Screen security hook is only found when complete");
noShell(); ok(screenSecureNative() === null, "no shell: no screen-security control");
shell(null, { screenSecure: { get() {}, set() {} } }); ok(screenSecureNative() !== null, "get and set present: found");
shell(null, { screenSecure: { set() {} } }); ok(screenSecureNative() === null, "only set present: not used");
noShell();
finish("run33bio");
