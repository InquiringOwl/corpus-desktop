# Corpus — desktop app

Corpus Body Lab as a native desktop app for macOS, Windows and Linux, with automatic updates.

- 2,909 anatomical structures (bones, muscles, ligaments and fascia, heart and vessels, nervous system, organs, skin) in real-time 3D
- EVE-style fitting ring: layers, camera, movements (walk, squat, reach, curl, throw, neck, jaw, single-leg squat) and tools (activity, fade, isolate, cross-section, labels)
- 22-segment rig with ~40 joint controls, scapulohumeral rhythm and ground contact; muscles shorten, lengthen and bulge
- Curated anatomy, diagnostics, histology and kinetic chains for key structures
- Works offline — everything, including three.js and fonts, is bundled

## Run it on your computer

Requires [Node.js 20+](https://nodejs.org).

```bash
npm install
npm start            # opens the app
npm run dist:mac     # builds dist/Corpus-1.0.0-arm64.dmg (run this on a Mac)
```

## Turn on automatic updates (one-time setup)

Updates are delivered through GitHub Releases.

1. Create a GitHub repository named `corpus-desktop` and push this folder to it.
2. In `package.json`, replace `YOUR_GITHUB_USERNAME` under `build.publish` with your GitHub username (or organisation).
3. Release a version: bump `version` in `package.json`, commit, then
   ```bash
   git tag v1.0.1 && git push origin main --tags
   ```
   The workflow in `.github/workflows/release.yml` builds the Mac, Windows and Linux installers and publishes the release.
4. Installed copies check for updates at launch and every 4 hours, download in the background, and show **Restart now** when ready (they also install on quit). **Help → Check for updates…** checks on demand.

### macOS signing

macOS only lets an app replace itself if it is signed with an Apple Developer ID and notarised (Apple Developer Program, US$99/year). Add these repository secrets and the workflow signs and notarises automatically:

| Secret | Value |
| --- | --- |
| `MAC_CERT_P12_BASE64` | Your "Developer ID Application" certificate exported as .p12, base64-encoded |
| `MAC_CERT_PASSWORD` | The .p12 password |
| `APPLE_ID` | Your Apple ID email |
| `APPLE_APP_SPECIFIC_PASSWORD` | An app-specific password from appleid.apple.com |
| `APPLE_TEAM_ID` | Your 10-character team ID |

Without signing, the Mac app still runs (right-click → Open the first time) and still notices new releases, but it shows a **Download** button instead of installing by itself. Windows and Linux builds self-update without extra setup (Windows shows a SmartScreen prompt on first install unless you add a code-signing certificate).

## Updating the content

The app itself lives in `app/`. `app/index.html` is generated from the Corpus sources; `app/data/*.bin` holds the packed 3D meshes and `app/data/manifest.json` the rig and structure index. Replace them, bump the version and tag a release — every installed copy picks it up.

## Licences

- 3D models: [Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy) by Gauthier Kervyn and Marcin Zielinski, CC BY-SA 4.0, derived from BodyParts3D © The Database Center for Life Science (CC BY-SA 2.1 Japan). The skin surface is from BodyParts3D. Because these are share-alike licences, the mesh files in `app/data/` (and any changes to them) must stay under CC BY-SA.
- three.js: MIT. Barlow Semi Condensed font: SIL Open Font License.
- Educational reference; not a diagnostic device.
