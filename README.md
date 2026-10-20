# My Food Journal

A private, local-first food and drink journal designed for iPhone Home Screen use. Records live in IndexedDB on the device, not on GitHub. The app has date, meal, and tag filters, editable timestamps, email/share of the filtered list, CSV export, and full JSON backup/restore.

## Publish to GitHub Pages

1. Create a new **public** GitHub repository, e.g. `my-food-journal`.
2. Upload **the files inside this folder** to the repository root, including `index.html`, `app.js`, `style.css`, `sw.js`, `manifest.webmanifest`, and both PNG icons.
3. Open repository Settings > Pages > Deploy from a branch > `main` > `/(root)` > Save.
4. When deployment succeeds, open `https://YOUR-USERNAME.github.io/my-food-journal/` in Safari on iPhone. Use Share > Add to Home Screen.

## Backups and privacy

- Tap **Backup to Files**, then choose **Save to Files > iCloud Drive**. Confirm the file exists in Files.
- Tap **Restore backup** and select a JSON archive to replace all local records. Restore is transactional, but make a backup before restoring. Test with sample data first.
- Records remain in local browser/app storage. Removing the Home Screen app or clearing site data can remove them. Backup regularly and retain multiple versions.
- GitHub Pages publicly serves the app's *code*, but records are not uploaded to GitHub. Do not commit backup JSON files to the public repository.
- **Email list** shares currently filtered entries using the iPhone share sheet; choose Mail. When unavailable, a short `mailto:` message is used. For large lists, export CSV and attach it to an email.
- iCloud Drive backup is manual, not automatic synchronization. This app is not medical advice or a nutritional analysis service.

## Updating

Upload updated source files to GitHub. Change the `CACHE` value in `sw.js` when making a release; the app may need to be fully closed and reopened twice to activate new code. Back up before updating. Never clear website data as a routine update step.
