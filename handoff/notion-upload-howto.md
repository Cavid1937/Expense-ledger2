# Uploading evidence files to Notion (worked on 2026-10-27)
1. `notion-create-file-upload` with filename `xxx.zip` -> returns `upload_url`, headers, id.
2. POST multipart with curl: `curl.exe -s -X POST "<upload_url>" -H "<each upload_headers>" -F "file=@C:\path\xxx.zip;type=application/zip"` (text files: type=text/plain).
3. Put `<file source="file-upload://<id>">name</file>` in the page content (create-pages / update-page), then FETCH the page back and confirm the file block is present.
Zip evidence with `Compress-Archive`; keep each under 20 MiB. Never include real user data (tests use synthetic data only).
