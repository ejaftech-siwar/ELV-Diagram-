# Ejaf Technology — ELV Schematic Studio
**Powered by Siwar**

A 100% free web app that generates ELV / IT infrastructure schematics:
topology & connection mapping (Cat5e→Cat8, SM/MM fiber, AC/DC power),
rack layouts 9U–48U with drag-and-drop and UPS power routing,
smart port allocation, enclosure (junction box) layouts to scale,
an asset & datasheet library — and exports to **MS Visio (.vsdx)**,
**vector PDF**, and **Excel** (BOM, connection & port schedules).

No build step. No paid libraries. Plain HTML/JS + Firebase free tier.

---

## Quick start (2 minutes, no Firebase needed)
Open `index.html` with any local web server and click **"Continue in Demo Mode"**.
All data is stored in your browser (localStorage). Easiest server:

```bash
# Python (preinstalled on most systems)
python -m http.server 8080
# then open http://localhost:8080
```
(Or use the free "Live Server" extension in VS Code.)

---

## Full setup with Firebase (free Spark plan)

1. Go to https://console.firebase.google.com → **Add project** (disable Analytics — not needed).
2. **Build → Authentication → Get started → Email/Password → Enable.**
   Then **Users → Add user** to create your first account.
3. **Build → Firestore Database → Create database → Production mode.**
4. **Rules tab** → paste the contents of `firestore.rules` → Publish.
5. **Project settings (gear) → Your apps → Web (</>) → Register app** →
   copy the `firebaseConfig` object into `js/firebase-config.js`.
6. Assign your role (free — runs on your own PC, not on paid Cloud Functions):
   ```bash
   npm install firebase-admin
   node scripts/set-role.js you@example.com owner
   ```
   (First download a service-account key: Project settings → Service accounts →
   Generate new private key → save as `scripts/serviceAccountKey.json`.
   This file is git-ignored — never upload it.)
7. Reload the app and sign in. Roles: **Owner** (full control: projects,
   delete assets, unlock port reservations) and **Support** (day-to-day editing).

> Why no images upload to Cloud Storage? New Firebase projects require the
> paid Blaze plan for Storage. To stay free, device photos are stored as small
> Base64 thumbnails inside Firestore, and datasheets are linked by URL to the
> manufacturer's PDF. Zero cost, fully functional.

---

## Hosting it online — free options

**Option A — GitHub Pages (recommended, you already have GitHub):**
```bash
git init
git add .
git commit -m "ELV Schematic Studio"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/elv-studio.git
git push -u origin main
```
Then on github.com: repo → **Settings → Pages → Source: Deploy from a branch →
main / (root) → Save**. Your app goes live at
`https://YOUR_USERNAME.github.io/elv-studio/`.
Finally, in Firebase: **Authentication → Settings → Authorized domains →
Add domain** `YOUR_USERNAME.github.io`.

**Option B — Firebase Hosting (also free):**
```bash
npm i -g firebase-tools
firebase login
firebase init hosting     # public dir: . (current), single-page: No
firebase deploy
```

---

## Using the app
| Tab | What it does |
|---|---|
| Asset Library | Add devices (image thumbnail, datasheet URL, U-height, watts, ports) |
| Topology | Place devices, click port→port to run typed cables; system filters; reservation conflicts enforced |
| Rack Builder | Create 9U–48U racks, drag equipment in (collision-checked), Power mode: UPS→device routing + load % |
| Port Allocation | Click first/last port to select a range, assign a system color, optional Owner-only lock |
| Enclosure | Enter box W×H in mm, drag components in to scale, label power/data feeds in & out |
| Export | Excel (BOM + Connection + Port schedules), vector PDF, native Visio .vsdx |

Every screen and every exported file carries the **Ejaf Technology** logo and
the **"Powered by Siwar"** footer (see `js/branding.js` to swap in your real logo:
replace `brand/ejaf-logo.svg`).

## Project structure
```
index.html            app shell + login
css/style.css         all styling
brand/ejaf-logo.svg   replace with the real logo (keep the filename)
js/
  firebase-config.js  ← paste your Firebase keys here
  store.js            data layer (Firestore OR free demo localStorage)
  branding.js         logo, "Powered by Siwar", cable colors, system colors
  app.js              auth gate, project selector, tab router
  library.js          asset & datasheet library
  topology.js         connection mapping engine (custom SVG, license-free)
  rack.js             rack builder + UPS power routing
  ports.js            smart port allocation
  enclosure.js        junction box designer (mm-scaled)
  export-tab.js       Excel + PDF exports
  export-vsdx.js      native Visio VSDX writer (JSZip OOXML)
firestore.rules       Owner/Support security rules
scripts/set-role.js   free role assignment (runs locally with Admin SDK)
```
