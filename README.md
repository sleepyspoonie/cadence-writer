# Cadence Writer

A distraction-free desktop writing app with sprint goals, streaks, achievements, and themes. Built with Electron and Quill.

## Development

```bash
npm install
npm start          # run the app
npm run build:win  # build the Windows installer (.exe)
```

The installer appears in `dist/` as `Cadence Writer Setup <version>.exe`. That
single file is what you share — it installs the app, creates shortcuts, and
registers an uninstaller.

### Building on GitHub instead

Pushing to `main` triggers GitHub Actions, which builds the Windows installer,
macOS DMG, and Linux AppImage on real machines of each platform — no local
toolchain needed. Download the results from the run's **Artifacts** section
(they expire after 90 days).

To publish a version people can download directly:

```bash
git tag v1.1.0
git push origin v1.1.0
```

That creates a **draft release** with all three installers attached. Open it
under Releases, write the notes, and click Publish to get permanent download
links.

Note: CI runs `npm ci`, which fails if `package-lock.json` is out of sync with
`package.json`. After changing the version or dependencies, run
`npm install --package-lock-only` and commit the lockfile.

## App icon

Icons live in `assets/` (not `build/`, which `.gitignore` excludes — putting
icons there means they never get committed and CI builds fall back to the
default Electron icon).

To change the icon, drop in a square source image of 512x512 or larger and run:

```bash
python tools/make-icons.py path/to/picture.png
```

That writes `assets/icon.ico` (Windows, 7 embedded sizes), `assets/icon.png`
(Linux and the dev-mode window), and `assets/icon.icns` (macOS). Rebuild to
pick up the change. Windows caches icons aggressively, so an old icon may
linger on shortcuts until you reboot or clear the icon cache.

## Project structure

```
main.js                  Electron entry point (app lifecycle only)
preload.js               Secure IPC bridge (channel whitelist)
src/main/                Main-process modules
  state.js               Shared app state (single source of truth)
  store.js               electron-store setup and defaults
  window.js              Window creation, fullscreen
  settings.js            Preferences and onboarding IPC
  documents.js           Folders, files, saving IPC
  session.js             Writing session lifecycle IPC
  stats.js               Stats persistence, streaks, stats-page IPC
  goals.js               Daily/long-term goals, rewards IPC
  achievements-ipc.js    Achievement checks and queueing IPC
  achievement-system.js  Achievement definitions and unlock logic
  maintenance.js         Reset and debug IPC
assets/                  App icons (build inputs)
tools/make-icons.py      Regenerates icons from a source image
*.html                   Pages (markup only)
js/                      Per-page renderer scripts
css/                     Per-page styles (style.css is shared)
vendor/quill/            Bundled Quill editor (works offline)
```

## Adding a new IPC channel

1. Register the handler in the right `src/main/` module.
2. Add the channel name to the whitelist in `preload.js` (SEND_CHANNELS for renderer→main, RECEIVE_CHANNELS for main→renderer).

## Notes

- Renderer pages have no Node access (`contextIsolation: true`). They talk to the main process only through the whitelisted `ipcRenderer` bridge from `preload.js`.
- The Windows installer is unsigned, so SmartScreen will warn on first run ("More info" → "Run anyway").
- Feature wishlist and known issues live in `TODO.md`.
