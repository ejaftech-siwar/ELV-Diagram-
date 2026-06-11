// Visio-style full editor: ribbon, shapes panel, multi-page canvas, open/export VSDX, PDF
import { state, save, list } from "./store.js";
import { branding, logoPngDataUrl } from "./branding.js";
import { LIB, FIND, glyph } from "./stencils.js";
import { exportVsdxModel } from "./export-vsdx.js";
import { importVisioFile, importVisioDrawing } from "./vsdx-import.js";

const NS = "http://www.w3.org/2000/svg";
const GRID = 10, A3W = 1587, A3H = 1123;
let svg, doc, sel = null, selLink = null, mode = "select", pendingFrom = null;
let zoom = .8, vx = -40, vy = -40, act = null, undoStack = [], armed = null, custom = [];

const page = () => doc.pages[doc.cur];

export function renderEditor(root) {
  root.innerHTML = `
  <div class="vz-app">
    <!-- ===== menubar ===== -->
    <div class="vz-menubar">
      <img src="ejaf-logo.svg" class="vz-logo" alt="Ejaf Technology">
      <div class="vz-menu"><button class="vz-mbtn">File ▾</button>
        <div class="vz-drop">
          <button id="mOpen">Open Visio file (.vsdx)…</button>
          <button id="mNew">New drawing</button>
          <button id="mSave">Save</button><hr>
          <button id="mPdf">Export PDF (all pages)</button>
          <button id="mVsdx">Export Visio .vsdx</button>
          <button id="mSvg">Export SVG (current page)</button>
          <button id="mPng">Export PNG (current page)</button>
        </div></div>
      <div class="vz-menu"><button class="vz-mbtn">Tools ▾</button>
        <div class="vz-drop" id="toolsDrop">
          <button data-tool="library">Asset Library</button>
          <button data-tool="topology">Topology</button>
          <button data-tool="rack">Rack Builder</button>
          <button data-tool="ports">Port Allocation</button>
          <button data-tool="enclosure">Enclosure</button>
          <button data-tool="export">Schedules (Excel)</button>
        </div></div>
      <span class="vz-title" id="vzTitle">ELV Drawing — Ejaf Schematic Studio</span>
      <span class="spacer"></span>
      <span id="userBadge" class="badge"></span>
      <button id="btnLogout" class="btn small">Sign out</button>
      <input id="openVsdx" type="file" accept=".vsdx,.vsdm" hidden>
    </div>
    <!-- ===== ribbon ===== -->
    <div class="vz-ribbon">
      <div class="vz-group"><div class="vz-glabel">Tools</div>
        <button class="vz-btn primary" data-m="select" title="Select / move">⬚ Select</button>
        <button class="vz-btn" data-m="connect" title="Draw connector">↗ Connector</button>
        <select id="vzCable" title="Cable type">${Object.entries(branding.cableStyles).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join("")}</select>
      </div>
      <div class="vz-group"><div class="vz-glabel">Edit</div>
        <button class="vz-btn" id="vzUndo">↶ Undo</button>
        <button class="vz-btn" id="vzDel">✕ Delete</button>
        <button class="vz-btn" id="vzDup">⧉ Duplicate</button>
      </div>
      <div class="vz-group"><div class="vz-glabel">Zoom</div>
        <button class="vz-btn" id="vzZout">−</button>
        <span id="vzZpct" class="vz-zpct">80%</span>
        <button class="vz-btn" id="vzZin">＋</button>
        <button class="vz-btn" id="vzFit">Fit page</button>
      </div>
      <div class="vz-group" id="vzInspect" style="display:none"><div class="vz-glabel">Shape</div>
        <input id="insText" placeholder="Label">
        <input id="insBrand" placeholder="Brand">
        <input id="insModel" placeholder="Model">
      </div>
    </div>
    <!-- ===== body ===== -->
    <div class="vz-body">
      <aside class="vz-shapes">
        <div class="vz-shead">Shapes
          <label class="vz-import" title="Import stencil blocks from .vsdx/.vssx">＋ Stencil
            <input id="stFile" type="file" accept=".vsdx,.vssx" hidden></label></div>
        <input id="stSearch" placeholder="Search shapes…">
        <div id="stencils">${LIB.map(g => `
          <div class="st-cat">${g.cat}</div>
          <div class="st-grid">${g.items.map(([id,name,w,h]) => `
            <div class="st-item" data-st="${id}" title="${name}">
              <svg width="44" height="32" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">${glyph(id,w,h)}</svg>
              <span>${name}</span></div>`).join("")}</div>`).join("")}
          <div class="st-cat">Imported</div>
          <div class="st-grid" id="customGrid"></div>
        </div>
      </aside>
      <div class="vz-canvasbg" id="vzScroll">
        <button class="btn small primary vz-shapestoggle" id="shToggle">☰ Shapes</button>
        <svg id="vzSvg" class="vz-canvas" width="100%" height="100%" style="touch-action:none"></svg>
      </div>
    </div>
    <!-- ===== page bar + status ===== -->
    <div class="vz-pagebar">
      <div id="pageTabs"></div>
      <button class="vz-ptab add" id="addPage">＋</button>
      <span class="spacer"></span>
      <span class="vz-status">${branding.poweredBy}</span>
    </div>
  </div>`;
  svg = root.querySelector("#vzSvg");
  root.querySelector("#shToggle").onclick = e => { e.stopPropagation();
    root.querySelector(".vz-shapes").classList.toggle("open"); };
  svg.addEventListener("pointerdown", () => root.querySelector(".vz-shapes").classList.remove("open"), true);
  Promise.all([loadDoc(), loadCustom()]).then(() => { drawCustomGrid(); drawPageTabs(); fit(); });
  wire(root);
}

function wire(root) {
  const $ = s => root.querySelector(s);
  // menus open/close
  root.querySelectorAll(".vz-menu").forEach(m => {
    m.querySelector(".vz-mbtn").onclick = e => { e.stopPropagation();
      root.querySelectorAll(".vz-drop").forEach(d => { if (d !== m.querySelector(".vz-drop")) d.classList.remove("open"); });
      m.querySelector(".vz-drop").classList.toggle("open"); };
  });
  document.addEventListener("click", () => root.querySelectorAll(".vz-drop").forEach(d => d.classList.remove("open")));
  // file menu
  $("#mOpen").onclick = () => $("#openVsdx").click();
  $("#openVsdx").onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const res = await importVisioDrawing(f);
      if (!res.pages.length || !res.pages.some(p => p.shapes.length))
        return alert("No shapes found in this file.");
      pushUndo();
      doc.pages = res.pages.map(p => ({ ...p, links: [] }));
      doc.cur = 0; doc.title = f.name.replace(/\.vsd.?$/i, "");
      $("#vzTitle").textContent = doc.title + " — Ejaf Schematic Studio";
      sel = selLink = null; drawPageTabs(); fit();
      alert(`Opened "${f.name}": ${res.pages.length} page(s), ${res.pages.reduce((s,p)=>s+p.shapes.length,0)} shape(s).`);
    } catch (err) { alert("Could not open this Visio file: " + err.message); }
    e.target.value = "";
  };
  $("#mNew").onclick = () => { pushUndo();
    doc = blankDoc(); sel = selLink = null; drawPageTabs(); fit(); };
  $("#mSave").onclick = async () => { await save("diagrams", structuredClone(doc)); alert("Drawing saved."); };
  $("#mPdf").onclick = toPdf;
  $("#mVsdx").onclick = () => exportVsdxModel(null, null, branding, doc.title, doc.pages);
  $("#mSvg").onclick = toSvg;
  $("#mPng").onclick = toPng;
  // tools overlay
  root.querySelectorAll("#toolsDrop [data-tool]").forEach(b =>
    b.onclick = () => window.openToolOverlay?.(b.dataset.tool));
  // ribbon
  root.querySelectorAll(".vz-btn[data-m]").forEach(b => b.onclick = () => {
    mode = b.dataset.m; pendingFrom = null;
    root.querySelectorAll(".vz-btn[data-m]").forEach(x => x.classList.toggle("primary", x === b)); paint();
  });
  $("#vzUndo").onclick = undo;
  $("#vzDel").onclick = delSelected;
  $("#vzDup").onclick = duplicate;
  $("#vzZin").onclick = () => setZoom(zoom * 1.2);
  $("#vzZout").onclick = () => setZoom(zoom / 1.2);
  $("#vzFit").onclick = fit;
  ["insText","insBrand","insModel"].forEach(id => $("#"+id).oninput = e => {
    const s = page().shapes.find(x => x.id === sel); if (!s) return;
    s[{insText:"text",insBrand:"brand",insModel:"model"}[id]] = e.target.value; paint();
  });
  // stencils
  $("#stSearch").oninput = e => { const q = e.target.value.toLowerCase();
    root.querySelectorAll(".st-item").forEach(i =>
      i.style.display = i.title.toLowerCase().includes(q) ? "" : "none"); };
  root.querySelectorAll("#stencils .st-item").forEach(p => p.onclick = () => arm(p));
  $("#stFile").onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const blocks = await importVisioFile(f);
      if (!blocks.length) return alert("No stencil shapes found.");
      for (const b of blocks.slice(0, 40)) custom.push(await save("stencils", b));
      drawCustomGrid(); alert(`Imported ${Math.min(blocks.length,40)} block(s).`);
    } catch (err) { alert("Import failed: " + err.message); }
    e.target.value = "";
  };
  $("#addPage").onclick = () => { pushUndo();
    doc.pages.push({ name: `Page-${doc.pages.length+1}`, W: A3W, H: A3H, shapes: [], links: [] });
    doc.cur = doc.pages.length - 1; sel = selLink = null; drawPageTabs(); fit(); };
  // canvas
  svg.addEventListener("pointerdown", onDown);
  svg.addEventListener("pointermove", onMove);
  svg.addEventListener("pointerup", () => act = null);
  svg.addEventListener("wheel", e => { if (e.ctrlKey) { e.preventDefault();
    setZoom(zoom * (e.deltaY < 0 ? 1.1 : .9)); } }, { passive: false });
  window.addEventListener("keydown", e => { if (e.key === "Delete") delSelected(); });
}
function arm(p) {
  document.querySelectorAll(".st-item").forEach(x => x.classList.remove("armed"));
  if (armed === p.dataset.st) { armed = null; return; }
  armed = p.dataset.st; p.classList.add("armed");
}
function blankDoc() {
  return { kind: "visio", title: "ELV Drawing", cur: 0,
    pages: [{ name: "Page-1", W: A3W, H: A3H, shapes: [], links: [] }] };
}
async function loadDoc() {
  const d = state.cache.diagrams.find(x => x.kind === "visio");
  doc = d ? structuredClone(d) : blankDoc();
  doc.cur = Math.min(doc.cur || 0, doc.pages.length - 1);
}
async function loadCustom() { custom = await list("stencils"); }
function drawCustomGrid() {
  const g = document.querySelector("#customGrid");
  g.innerHTML = custom.map(c => `
    <div class="st-item" data-st="custom:${c.id}" title="${c.name}">
      <svg width="44" height="32" viewBox="0 0 ${c.w} ${c.h}" preserveAspectRatio="xMidYMid meet">${pathsSvg(c.paths)}</svg>
      <span>${c.name}</span></div>`).join("") ||
    `<span class="muted" style="font-size:10.5px">Use “＋ Stencil” to import blocks from .vsdx / .vssx files.</span>`;
  g.querySelectorAll(".st-item").forEach(p => p.onclick = () => arm(p));
}
const pathsSvg = paths => paths.map(p =>
  `<path d="${p.d}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${p.sw}"${(p.tx||p.ty)?` transform="translate(${p.tx||0},${p.ty||0})"`:""}/>`).join("");

function drawPageTabs() {
  const el = document.querySelector("#pageTabs");
  el.innerHTML = doc.pages.map((p, i) =>
    `<button class="vz-ptab ${i===doc.cur?"on":""}" data-p="${i}">${p.name}</button>`).join("");
  el.querySelectorAll("[data-p]").forEach(b => {
    b.onclick = () => { doc.cur = +b.dataset.p; sel = selLink = null; drawPageTabs(); fit(); };
    b.ondblclick = () => { const n = prompt("Page name:", doc.pages[+b.dataset.p].name);
      if (n) { doc.pages[+b.dataset.p].name = n; drawPageTabs(); } };
  });
}

/* ---------- interaction ---------- */
const snap = v => Math.round(v / GRID) * GRID;
const uid = () => "s" + Math.random().toString(36).slice(2, 8);
function pushUndo() { undoStack.push(JSON.stringify(doc)); if (undoStack.length > 30) undoStack.shift(); }
function undo() { const s = undoStack.pop(); if (!s) return;
  doc = JSON.parse(s); sel = selLink = null; syncInspector(); drawPageTabs(); paint(); }
function pt(e) { const r = svg.getBoundingClientRect();
  return { x: vx + (e.clientX - r.left) / zoom, y: vy + (e.clientY - r.top) / zoom }; }
function hit(p) { const sh = page().shapes;
  for (let i = sh.length - 1; i >= 0; i--) { const s = sh[i];
    if (p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h) return s; }
  return null; }
let lastTap = 0;
function onDown(e) {
  e.preventDefault(); svg.setPointerCapture?.(e.pointerId);
  const p = pt(e), s = hit(p);
  if (armed && !s) {
    pushUndo(); let sh;
    if (armed.startsWith("custom:")) {
      const c = custom.find(x => "custom:" + x.id === armed); if (!c) return;
      sh = { id: uid(), type: "custom", ref: c.id, x: snap(p.x - c.w/2), y: snap(p.y - c.h/2),
             w: c.w, h: c.h, pw: c.w, ph: c.h, text: c.name };
    } else { const [id, name, w, h] = FIND(armed);
      sh = { id: uid(), type: id, x: snap(p.x - w/2), y: snap(p.y - h/2), w, h, text: name }; }
    page().shapes.push(sh); sel = sh.id; selLink = null; armed = null;
    document.querySelectorAll(".st-item").forEach(x => x.classList.remove("armed"));
    syncInspector(); paint(); return;
  }
  if (mode === "connect") {
    if (!s) { pendingFrom = null; return paint(); }
    if (!pendingFrom) { pendingFrom = s.id; return paint(); }
    if (pendingFrom !== s.id) { pushUndo();
      page().links.push({ id: uid(), from: pendingFrom, to: s.id, text: "",
        ctype: document.querySelector("#vzCable").value }); }
    pendingFrom = null; return paint();
  }
  if (s) {
    const now = Date.now();
    if (sel === s.id && now - lastTap < 350) { const t = prompt("Label:", s.text || "");
      if (t !== null) { pushUndo(); s.text = t; syncInspector(); paint(); } lastTap = 0; return; }
    lastTap = now; sel = s.id; selLink = null;
    if (Math.hypot(p.x - (s.x + s.w), p.y - (s.y + s.h)) < 14 / zoom) { pushUndo(); act = { kind: "resize", s }; }
    else { pushUndo(); act = { kind: "move", s, dx: p.x - s.x, dy: p.y - s.y }; }
    syncInspector(); paint();
  } else { sel = selLink = null; syncInspector();
    act = { kind: "pan", px: e.clientX, py: e.clientY, vx, vy }; paint(); }
}
function onMove(e) {
  if (!act) return;
  const p = pt(e);
  if (act.kind === "move") { act.s.x = snap(p.x - act.dx); act.s.y = snap(p.y - act.dy); paint(); }
  else if (act.kind === "resize") { act.s.w = Math.max(30, snap(p.x - act.s.x));
    act.s.h = Math.max(20, snap(p.y - act.s.y)); paint(); }
  else { vx = act.vx - (e.clientX - act.px) / zoom; vy = act.vy - (e.clientY - act.py) / zoom; paint(); }
}
function delSelected() {
  if (selLink) { pushUndo(); page().links = page().links.filter(l => l.id !== selLink);
    selLink = null; return paint(); }
  if (!sel) return; pushUndo();
  page().links = page().links.filter(l => l.from !== sel && l.to !== sel);
  page().shapes = page().shapes.filter(s => s.id !== sel);
  sel = null; syncInspector(); paint();
}
function duplicate() {
  const s = page().shapes.find(x => x.id === sel); if (!s) return;
  pushUndo(); const c = structuredClone(s); c.id = uid(); c.x += 24; c.y += 24;
  page().shapes.push(c); sel = c.id; paint();
}
function syncInspector() {
  const box = document.querySelector("#vzInspect");
  const s = page()?.shapes.find(x => x.id === sel);
  if (!s) { box.style.display = "none"; return; }
  box.style.display = "flex";
  document.querySelector("#insText").value = s.text || "";
  document.querySelector("#insBrand").value = s.brand || "";
  document.querySelector("#insModel").value = s.model || "";
}
function setZoom(z) { zoom = Math.min(4, Math.max(.15, z));
  document.querySelector("#vzZpct").textContent = Math.round(zoom * 100) + "%"; paint(); }
function fit() {
  const r = svg.getBoundingClientRect();
  const z = Math.min(r.width / (page().W + 120), r.height / (page().H + 120));
  vx = -(r.width / z - page().W) / 2; vy = -(r.height / z - page().H) / 2;
  setZoom(z);
}

/* ---------- paint ---------- */
function paint() {
  if (!doc) return;
  const r = svg.getBoundingClientRect();
  svg.setAttribute("viewBox", `${vx} ${vy} ${Math.max(50, r.width / zoom)} ${Math.max(50, r.height / zoom)}`);
  const P = page();
  svg.innerHTML = `<defs>
    <marker id="arr" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
      <path d="M0 0 L9 4.5 L0 9 z" fill="#16264A"/></marker>
    <pattern id="grid" width="${GRID*2}" height="${GRID*2}" patternUnits="userSpaceOnUse">
      <path d="M ${GRID*2} 0 L 0 0 0 ${GRID*2}" fill="none" stroke="#E3EAF5" stroke-width="1"/></pattern>
    <filter id="pgsh" x="-5%" y="-5%" width="112%" height="112%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#0B1426" flood-opacity=".22"/></filter>
  </defs>
  <rect x="0" y="0" width="${P.W}" height="${P.H}" fill="#fff" filter="url(#pgsh)"/>
  <rect x="0" y="0" width="${P.W}" height="${P.H}" fill="url(#grid)"/>
  <rect x="0" y="0" width="${P.W}" height="${P.H}" fill="none" stroke="#B9C8E4"/>`;
  for (const l of P.links) {
    const a = P.shapes.find(s => s.id === l.from), b = P.shapes.find(s => s.id === l.to);
    if (!a || !b) continue;
    const st = branding.cableStyles[l.ctype] || { color: "#16264A" };
    const x1 = a.x + a.w/2, y1 = a.y + a.h/2, x2 = b.x + b.w/2, y2 = b.y + b.h/2, midX = (x1+x2)/2;
    const path = el("path", { d: `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`,
      fill: "none", stroke: selLink === l.id ? "#FFB020" : st.color,
      "stroke-width": st.width || 2.2, "marker-end": "url(#arr)" });
    if (st.dash) path.setAttribute("stroke-dasharray", st.dash);
    path.style.cursor = "pointer";
    path.onpointerdown = e => { e.stopPropagation(); selLink = l.id; sel = null; syncInspector();
      const now = Date.now();
      if (now - lastTap < 350) { const t = prompt("Cable label:", l.text || "");
        if (t !== null) { pushUndo(); l.text = t; } }
      lastTap = now; paint(); };
    svg.appendChild(path);
    const lbl = l.text || branding.cableStyles[l.ctype]?.label || "";
    if (lbl) svg.appendChild(text(midX + 5, (y1+y2)/2 - 5, lbl, 10.5, st.color, 600));
  }
  for (const s of P.shapes) {
    const g = el("g", { transform: `translate(${s.x},${s.y})` });
    if (s.type === "custom") {
      const paths = s.inline || custom.find(x => x.id === s.ref)?.paths;
      if (paths) g.innerHTML = `<g transform="scale(${s.w / s.pw},${s.h / s.ph})">${pathsSvg(paths)}</g>`;
      else g.innerHTML = glyph("rect", s.w, s.h, s.id === sel);
    } else g.innerHTML = glyph(s.type, s.w, s.h, s.id === sel || pendingFrom === s.id);
    svg.appendChild(g);
    const cx = s.x + s.w / 2;
    if (s.text) svg.appendChild(text(cx, s.y + s.h + 13, s.text, 11.5, "#13203A", 700, "middle"));
    const bm = [s.brand, s.model].filter(Boolean).join(" ");
    if (bm) svg.appendChild(text(cx, s.y + s.h + 25, bm, 10, "#0A3DBB", 500, "middle"));
    if (s.id === sel) {
      svg.appendChild(el("rect", { x: s.x-4, y: s.y-4, width: s.w+8, height: s.h+8, fill: "none",
        stroke: "#FFB020", "stroke-width": 1.5, "stroke-dasharray": "5 4", rx: 5 }));
      svg.appendChild(el("circle", { cx: s.x+s.w, cy: s.y+s.h, r: 7, fill: "#FFB020",
        stroke: "#fff", "stroke-width": 2 }));
    }
  }
  // footer note on page
  svg.appendChild(text(P.W - 8, P.H - 8, `${branding.company} · ${branding.poweredBy}`, 10, "#9FB2D4", 500, "end"));
}
function el(tag, attrs) { const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; }
function text(x, y, s, size, fill, weight, anchor) {
  const t = el("text", { x, y, "font-size": size, fill, "font-weight": weight || 400,
    "font-family": "Inter, Arial" });
  if (anchor) t.setAttribute("text-anchor", anchor);
  t.style.pointerEvents = "none"; t.textContent = s; return t;
}

/* ---------- export ---------- */
async function toPdf() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });
  const logo = await logoPngDataUrl();
  const cur = doc.cur;
  for (let i = 0; i < doc.pages.length; i++) {
    if (i > 0) pdf.addPage("a3", "landscape");
    doc.cur = i; fit();
    pdf.addImage(logo, "PNG", 24, 14, 132, 29);
    pdf.setFontSize(13).setTextColor(10, 61, 187);
    pdf.text(`${doc.title} — ${doc.pages[i].name}`, 180, 33);
    const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
    await pdf.svg(svg, { x: 24, y: 52, width: W - 48, height: H - 96 });
    pdf.setDrawColor(213, 223, 240).line(24, H - 28, W - 24, H - 28);
    pdf.setFontSize(9).setTextColor(140);
    pdf.text(`${branding.company} · ${branding.poweredBy} · ${new Date().toLocaleDateString("en-GB")} · page ${i+1}/${doc.pages.length}`, 24, H - 14);
  }
  doc.cur = cur; fit();
  pdf.save(doc.title.replace(/\s+/g, "-") + ".pdf");
}
function svgMarkup() {
  fit();
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", NS);
  return new XMLSerializer().serializeToString(clone);
}
function toSvg() { dl(new Blob([svgMarkup()], { type: "image/svg+xml" }), doc.title + ".svg"); }
async function toPng() {
  const img = new Image();
  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgMarkup())));
  await img.decode();
  const r = svg.getBoundingClientRect();
  const c = document.createElement("canvas");
  c.width = r.width * 2; c.height = r.height * 2;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  c.toBlob(b => dl(b, doc.title + ".png"), "image/png");
}
function dl(blob, name) { const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href); }
