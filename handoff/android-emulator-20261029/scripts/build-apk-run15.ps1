$ErrorActionPreference="Continue"
$env:Path="C:\Program Files\nodejs;$env:Path"
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"; $env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"; $env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:Path="$env:JAVA_HOME\bin;$env:Path"
$wt="C:\Users\cavid\OneDrive\Documents\GitHub\Expense-ledger2-fixes"; $c="C:\Users\cavid\OneDrive\Documents\GitHub\Expense-ledger2-capacitor"; Set-Location $c
"== started $(Get-Date -Format o)"
"== 1. Run 15 candidate (commit a30f585) into the Android copy; main.jsx, native-share files, index.html, public stay as in Run 13"
Copy-Item "$wt\App.jsx","$wt\i18n.js" $c -Force
foreach($f in "App.jsx","i18n.js","main.jsx","native-share-core.js","native-share.js"){ "{0}  {1}" -f (Get-FileHash "$c\$f").Hash,$f }
"== 2. vite build (node_modules already present; no npm install)"
npm run build 2>&1 | Select-Object -Last 4; "build exit=$LASTEXITCODE"
"== 3. cap sync android"
npx cap sync android 2>&1 | Select-Object -Last 8; "sync exit=$LASTEXITCODE"
"== 4. gradle assembleDebug (offline, build output outside OneDrive)"
& "$c\android\gradlew.bat" -p "$c\android" -I "$env:TEMP\outside-onedrive.init.gradle" assembleDebug --offline --no-daemon --console=plain 2>&1 | Select-Object -Last 14; "gradle exit=$LASTEXITCODE"
$apk="C:\ExpenseLedgerBuild\android\_app\outputs\apk\debug\app-debug.apk"; if(Test-Path $apk){ "{0}  {1} bytes  {2}" -f (Get-FileHash $apk).Hash,(Get-Item $apk).Length,$apk }
"== finished $(Get-Date -Format o)"