# Windows download — currently disabled

The site had a header button linking to a prototype installer here:

    downloads/PhysiX-Academy-Setup.exe

**That button has been removed** for now. Nothing in the site references it
anymore, and the binary was never actually deployed — `downloads/*` is
git-ignored, so the link was a 404 for every visitor.

A binary is also a poor fit for the web: ~107 MB, Windows-only, and it cannot
live in git sensibly. The planned replacement is a **PWA** (manifest +
service worker), which is a few KB, installs from the browser on Android,
iOS, Windows, macOS and Linux, and works offline — which suits this
project's offline-first design.

## If you want the desktop installer back instead

```powershell
npm install        # node_modules was removed during a storage cleanup
npm run dist       # builds release/PhysiX-Academy-Setup-0.1.0.exe
```

Then re-add the button to `index.html` inside `.top-actions`:

```html
<a class="icon-btn" id="btn-download" href="downloads/PhysiX-Academy-Setup.exe" download
   title="Download PhysiX Academy for Windows"
   aria-label="Download PhysiX Academy for Windows"> ... </a>
```

The binary is intentionally git-ignored, so it has to be uploaded somewhere
separately (GitHub Releases, or object storage) rather than committed.