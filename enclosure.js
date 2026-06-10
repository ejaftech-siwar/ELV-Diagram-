// Enclosure / outdoor box designer: scaled mm layout + power & data feed arrows
import { state, save } from "./store.js";
import { branding } from "./branding.js";

const NS = "http://www.w3.org/2000/svg";
let enc, svg, drag = null, armedAsset = null;
const SCALE = 1.1; // px per mm

export function renderEnclosure(root) {
  const list = state.cache.enclosures;
  root.innerHTML = `
  <div class="split">
    <div class="panel side">
      <h3>Enclosure</h3>
      <div class="row"><select id="encSel" style="flex:1">${list.map(e=>`<option value="${e.id}">${e.name}</option>`).join("")}</select></div>
      <div class="form-grid">
        <input id="encName" placeholder="Name e.g. OBX-L2-03">
        <select id="encType"><option>outdoor</option><option>indoor</option></select>
        <input id="encW" type="number" placeholder="Width mm" value="400">
        <input id="encH" type="number" placeholder="Height mm" value="500">
      </div>
      <button id="btnNewEnc" class="btn primary" style="width:100%;margin-top:8px">Create box</button>
      <h3 style="margin-top:14px">Components (drag in)</h3>
      <div id="encPalette"></div>
      <h3 style="margin-top:14px">Feeds</h3>
      <div class="form-grid">
        <input id="feedPowerIn" placeholder="Power in (e.g. AC 3x2.5)">
        <input id="feedDataIn" placeholder="Data in (e.g. SM fiber)">
        <input id="feedPowerOut" placeholder="Power out (e.g. DC12V cam)">
        <input id="feedDataOut" placeholder="Data out (e.g. Cat6A cam)">
      </div>
      <button id="btnFeeds" class="btn" style="width:100%;margin-top:8px">Save feeds</button>
    </div>
    <div class="grow">
      <div class="canvas-wrap"><svg id="encSvg" class="canvas" width="900" height="640"></svg>
      <div class="wm">${branding.poweredBy}</div></div>
    </div>
  </div>`;
  svg = root.querySelector("#encSvg");
  root.querySelector("#btnNewEnc").onclick = async () => {
    enc = await save("enclosures", { name: root.querySelector("#encName").value || "BOX-" + (list.length+1),
      type: root.querySelector("#encType").value,
      dimensionsMm: { w: +root.querySelector("#encW").value || 400, h: +root.querySelector("#encH").value || 500 },
      components: [], feeds: {} });
    state.cache.enclosures.push(enc); renderEnclosure(root);
  };
  root.querySelector("#encSel").onchange = e => { enc = list.find(x => x.id === e.target.value); paint(); };
  root.querySelector("#btnFeeds").onclick = async () => {
    if (!enc) return;
    enc.feeds = { powerIn: root.querySelector("#feedPowerIn").value, dataIn: root.querySelector("#feedDataIn").value,
                  powerOut: root.querySelector("#feedPowerOut").value, dataOut: root.querySelector("#feedDataOut").value };
    await save("enclosures", enc); paint();
  };
  const pal = root.querySelector("#encPalette");
  pal.innerHTML = state.cache.assets.filter(a => a.uHeight === 0 || ["mediaConverter","powerSupply","accessController"].includes(a.category))
    .map(a => `<div class="palette-item" draggable="true" data-asset="${a.id}">
      <span>${a.manufacturer} ${a.model} <b>(${a.dimensionsMm?.w}×${a.dimensionsMm?.h}mm)</b></span></div>`).join("");
  pal.querySelectorAll(".palette-item").forEach(p => {
    p.ondragstart = e => e.dataTransfer.setData("asset", p.dataset.asset);
    // Touch: tap a component to arm it, then tap inside the box to place it
    p.onclick = () => {
      pal.querySelectorAll(".palette-item").forEach(x => x.classList.remove("armed"));
      if (armedAsset === p.dataset.asset) { armedAsset = null; return; }
      armedAsset = p.dataset.asset; p.classList.add("armed");
    };
  });
  svg.ondragover = e => e.preventDefault();
  svg.ondrop = onDrop;
  svg.onclick = async e => {
    if (!armedAsset || !enc || drag != null) return;
    enc.components = enc.components || [];
    enc.components.push({ assetRef: armedAsset,
      x: Math.max(0, (e.offsetX - x0) / SCALE), y: Math.max(0, (e.offsetY - y0) / SCALE) });
    armedAsset = null; pal.querySelectorAll(".palette-item").forEach(x => x.classList.remove("armed"));
    await save("enclosures", enc); paint();
  };
  enc = list[0] || null;
  paint();
}

const x0 = 120, y0 = 60;
function paint() {
  svg.innerHTML = "";
  if (!enc) return;
  const W = enc.dimensionsMm.w * SCALE, H = enc.dimensionsMm.h * SCALE;
  const box = document.createElementNS(NS, "rect");
  box.setAttribute("x", x0); box.setAttribute("y", y0); box.setAttribute("width", W); box.setAttribute("height", H);
  box.setAttribute("fill", "#f7f9fc"); box.setAttribute("stroke", "#37474f"); box.setAttribute("stroke-width", 3); box.setAttribute("rx", 6);
  svg.appendChild(box);
  txt(x0, y0 - 26, `${enc.name} — ${enc.type.toUpperCase()} ${enc.dimensionsMm.w}×${enc.dimensionsMm.h} mm`, 13, "#1c2733", 700);
  txt(x0 + W/2 - 20, y0 + H + 18, `${enc.dimensionsMm.w} mm`, 10, "#666");
  txt(x0 - 50, y0 + H/2, `${enc.dimensionsMm.h} mm`, 10, "#666");
  // components
  (enc.components || []).forEach((c, i) => {
    const a = state.cache.assets.find(x => x.id === c.assetRef) || { dimensionsMm: { w: 80, h: 40 }, model: "?" };
    const r = document.createElementNS(NS, "rect");
    const cw = (a.dimensionsMm?.w || 80) * SCALE, ch = (a.dimensionsMm?.h || 40) * SCALE;
    r.setAttribute("x", x0 + c.x * SCALE); r.setAttribute("y", y0 + c.y * SCALE);
    r.setAttribute("width", cw); r.setAttribute("height", ch); r.setAttribute("rx", 4);
    r.setAttribute("fill", "#dbe7f5"); r.setAttribute("stroke", branding.colors.primary);
    r.style.cursor = "move";
    r.style.touchAction = "none";
    r.onpointerdown = ev => { ev.preventDefault(); svg.setPointerCapture?.(ev.pointerId); drag = { i, ox: ev.offsetX - (x0 + c.x * SCALE), oy: ev.offsetY - (y0 + c.y * SCALE) }; };
    r.ondblclick = async () => { enc.components.splice(i, 1); await save("enclosures", enc); paint(); };
    svg.appendChild(r);
    txt(x0 + c.x * SCALE + 4, y0 + c.y * SCALE + 14, a.model, 9.5, "#1c2733", 600);
  });
  svg.onpointermove = ev => { if (drag != null) {
    const c = enc.components[drag.i];
    c.x = Math.max(0, (ev.offsetX - drag.ox - x0) / SCALE);
    c.y = Math.max(0, (ev.offsetY - drag.oy - y0) / SCALE);
    paint(); } };
  svg.onpointerup = async () => { if (drag != null) { await save("enclosures", enc); drag = null; } };
  // feed arrows
  const feeds = enc.feeds || {};
  arrow(x0 - 80, y0 + 40, x0, y0 + 40, "#c62828", "⚡ " + (feeds.powerIn || "Power in"), false);
  arrow(x0 - 80, y0 + 90, x0, y0 + 90, "#1565c0", "⇄ " + (feeds.dataIn || "Data in"), false);
  arrow(x0 + W, y0 + 40, x0 + W + 80, y0 + 40, "#c62828", (feeds.powerOut || "Power out") + " →", true);
  arrow(x0 + W, y0 + 90, x0 + W + 80, y0 + 90, "#1565c0", (feeds.dataOut || "Data out") + " →", true);
}
function txt(x, y, s, size, fill, weight) {
  const t = document.createElementNS(NS, "text");
  t.setAttribute("x", x); t.setAttribute("y", y); t.setAttribute("font-size", size);
  t.setAttribute("fill", fill); if (weight) t.setAttribute("font-weight", weight);
  t.textContent = s; svg.appendChild(t);
}
function arrow(x1, y1, x2, y2, color, label, right) {
  const l = document.createElementNS(NS, "line");
  l.setAttribute("x1", x1); l.setAttribute("y1", y1); l.setAttribute("x2", x2); l.setAttribute("y2", y2);
  l.setAttribute("stroke", color); l.setAttribute("stroke-width", 2.5);
  svg.appendChild(l);
  const head = document.createElementNS(NS, "path");
  const hx = right ? x2 : x2;
  head.setAttribute("d", `M ${hx} ${y2} l -8 -4 l 0 8 z`);
  head.setAttribute("fill", color); svg.appendChild(head);
  txt(x1, y1 - 7, label, 10, color, 600);
}
async function onDrop(e) {
  e.preventDefault();
  if (!enc) return;
  const a = state.cache.assets.find(x => x.id === e.dataTransfer.getData("asset"));
  if (!a) return;
  enc.components = enc.components || [];
  enc.components.push({ assetRef: a.id, x: Math.max(0,(e.offsetX - x0)/SCALE), y: Math.max(0,(e.offsetY - y0)/SCALE) });
  await save("enclosures", enc); paint();
}
export function enclosureSvg() { return svg; }
