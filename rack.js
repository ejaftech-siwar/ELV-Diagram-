// Rack builder 9U–48U: drag&drop, collision check, UPS power routing, load %
import { state, save, remove } from "./store.js";
import { branding } from "./branding.js";

const NS = "http://www.w3.org/2000/svg";
const U = 22;           // px per U on screen
const RW = 320;         // rack inner width px
let svg, rack, powerMode = false, powerFrom = null, armedAsset = null;

export function renderRack(root) {
  const racks = state.cache.racks;
  root.innerHTML = `
  <div class="split">
    <div class="panel side">
      <h3>Rack</h3>
      <div class="row">
        <select id="rackSel" style="flex:1">
          ${racks.map(r=>`<option value="${r.id}">${r.name} (${r.uSize}U)</option>`).join("")}
        </select>
      </div>
      <div class="row">
        <input id="rackName" placeholder="Name e.g. MDF-01" style="flex:1">
        <select id="rackSize">${Array.from({length:40},(_,i)=>i+9).map(u=>`<option ${u===42?"selected":""}>${u}</option>`).join("")}</select>
      </div>
      <button id="btnNewRack" class="btn primary" style="width:100%">Create rack</button>
      <h3 style="margin-top:14px">Equipment (drag onto rack)</h3>
      <div id="rackPalette"></div>
      <h3 style="margin-top:14px">Power</h3>
      <button id="btnPowerMode" class="btn" style="width:100%">Power routing mode: OFF</button>
      <p class="muted" style="font-size:11.5px">Tap equipment above to select it, then tap a U row to install it (or drag In power mode: click the UPS, then click each device it feeds. Double-click a device to remove it from the rack.amp; drop on desktop). Power mode: tap the UPS, then tap each device it feeds. Double-tap a device to remove it.</p>
      <div id="upsLoad" class="muted" style="font-size:12.5px;margin-top:8px"></div>
    </div>
    <div class="grow">
      <div class="canvas-wrap"><svg id="rackSvg" class="canvas" width="760" height="200"></svg>
      <div class="wm">${branding.poweredBy}</div></div>
    </div>
  </div>`;
  svg = root.querySelector("#rackSvg");
  root.querySelector("#btnNewRack").onclick = async () => {
    const name = root.querySelector("#rackName").value.trim() || "RACK-" + (racks.length + 1);
    const uSize = +root.querySelector("#rackSize").value;
    rack = await save("racks", { name, uSize, slots: {}, powerChain: [] });
    state.cache.racks.push(rack); renderRack(root);
  };
  root.querySelector("#rackSel").onchange = e => { rack = racks.find(r => r.id === e.target.value); paint(root); };
  root.querySelector("#btnPowerMode").onclick = e => {
    powerMode = !powerMode; powerFrom = null;
    e.target.textContent = "Power routing mode: " + (powerMode ? "ON" : "OFF");
    e.target.classList.toggle("primary", powerMode); paint(root);
  };
  rack = racks[0] || null;
  palette(root); paint(root);
}

function palette(root) {
  const el = root.querySelector("#rackPalette");
  el.innerHTML = state.cache.assets.filter(a => a.uHeight > 0).map(a => `
    <div class="palette-item" draggable="true" data-asset="${a.id}">
      ${a.imageData ? `<img src="${a.imageData}">` : `<img src="ejaf-logo.svg">`}
      <span>${a.manufacturer} ${a.model} <b>(${a.uHeight}U${a.power?.watts ? ", " + a.power.watts + "W" : ""})</b></span>
    </div>`).join("");
  el.querySelectorAll(".palette-item").forEach(p => {
    p.ondragstart = e => e.dataTransfer.setData("asset", p.dataset.asset);
    // Touch: tap equipment to arm it, then tap a U row in the rack to install it
    p.onclick = () => {
      el.querySelectorAll(".palette-item").forEach(x => x.classList.remove("armed"));
      if (armedAsset === p.dataset.asset) { armedAsset = null; return; }
      armedAsset = p.dataset.asset; p.classList.add("armed");
    };
  });
}

function paint(root) {
  if (!rack) { svg.innerHTML = ""; svg.setAttribute("height", 60); return; }
  const H = rack.uSize * U + 60;
  svg.setAttribute("height", H);
  svg.innerHTML = "";
  const x0 = 90, y0 = 30;
  const frame = document.createElementNS(NS, "rect");
  frame.setAttribute("x", x0 - 26); frame.setAttribute("y", y0 - 14);
  frame.setAttribute("width", RW + 52); frame.setAttribute("height", rack.uSize * U + 28);
  frame.setAttribute("fill", "#2b3440"); frame.setAttribute("rx", 8);
  svg.appendChild(frame);
  const title = document.createElementNS(NS, "text");
  title.setAttribute("x", x0); title.setAttribute("y", 14); title.setAttribute("font-size", 13);
  title.setAttribute("font-weight", "700"); title.setAttribute("fill", "#1c2733");
  title.textContent = `${rack.name} — ${rack.uSize}U`;
  svg.appendChild(title);
  // U rows
  for (let u = 1; u <= rack.uSize; u++) {
    const y = y0 + (rack.uSize - u) * U;
    const row = document.createElementNS(NS, "rect");
    row.setAttribute("x", x0); row.setAttribute("y", y);
    row.setAttribute("width", RW); row.setAttribute("height", U - 1);
    row.setAttribute("fill", "#1d242e");
    row.dataset.u = u;
    row.ondragover = e => e.preventDefault();
    row.ondrop = e => onDrop(e, u, root);
    row.onclick = async () => {
      if (!armedAsset) return;
      const a = state.cache.assets.find(x => x.id === armedAsset);
      armedAsset = null;
      document.querySelectorAll("#rackPalette .palette-item").forEach(x => x.classList.remove("armed"));
      if (a) await place(a, u, root, row);
    };
    svg.appendChild(row);
    [x0 - 14, x0 + RW + 4].forEach(lx => {
      const n = document.createElementNS(NS, "text");
      n.setAttribute("x", lx); n.setAttribute("y", y + U - 8);
      n.setAttribute("font-size", 8); n.setAttribute("fill", "#8a96a3");
      n.textContent = u; svg.appendChild(n);
    });
  }
  // installed devices
  const inRack = state.cache.devices.filter(d => d.location?.rackId === rack.id);
  for (const d of inRack) {
    const a = state.cache.assets.find(x => x.id === d.assetRef) || { uHeight: 1 };
    const topU = d.location.uPosition + a.uHeight - 1;
    const y = y0 + (rack.uSize - topU) * U;
    const g = document.createElementNS(NS, "g");
    const r = document.createElementNS(NS, "rect");
    r.setAttribute("x", x0 + 2); r.setAttribute("y", y + 1);
    r.setAttribute("width", RW - 4); r.setAttribute("height", a.uHeight * U - 3);
    r.setAttribute("rx", 3);
    r.setAttribute("fill", a.category === "ups" ? "#7f1d1d" : branding.systemColors[d.system] || "#3b82a0");
    r.style.cursor = "pointer";
    g.appendChild(r);
    if (a.imageData) {
      const im = document.createElementNS(NS, "image");
      im.setAttribute("href", a.imageData);
      im.setAttribute("x", x0 + 4); im.setAttribute("y", y + 2);
      im.setAttribute("width", RW - 8); im.setAttribute("height", a.uHeight * U - 5);
      im.setAttribute("preserveAspectRatio", "none"); im.setAttribute("opacity", "0.85");
      im.style.pointerEvents = "none";
      g.appendChild(im);
    }
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", x0 + 10); t.setAttribute("y", y + 15);
    t.setAttribute("font-size", 10.5); t.setAttribute("fill", "#fff"); t.setAttribute("font-weight", "600");
    t.style.pointerEvents = "none";
    t.textContent = `${d.label} (U${d.location.uPosition}${a.uHeight > 1 ? "–U" + topU : ""})`;
    g.appendChild(t);
    r.ondblclick = async () => { await removeFromRack(d); paint(root); };
    r.onclick = () => powerClick(d, a, root);
    svg.appendChild(g);
  }
  // power chain bus
  const busX = x0 + RW + 34;
  (rack.powerChain || []).forEach(link => {
    const from = inRack.find(d => d.id === link.from), to = inRack.find(d => d.id === link.to);
    if (!from || !to) return;
    const ya = devY(from, y0), yb = devY(to, y0);
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", `M ${x0 + RW} ${ya} L ${busX} ${ya} L ${busX} ${yb} L ${x0 + RW} ${yb}`);
    p.setAttribute("stroke", "#c62828"); p.setAttribute("stroke-width", 2.5); p.setAttribute("fill", "none");
    svg.appendChild(p);
  });
  loadInfo(root, inRack);
}
function devY(d, y0) {
  const a = state.cache.assets.find(x => x.id === d.assetRef) || { uHeight: 1 };
  const topU = d.location.uPosition + a.uHeight - 1;
  return y0 + (rack.uSize - topU) * U + (a.uHeight * U) / 2;
}

async function onDrop(e, u, root) {
  e.preventDefault();
  const asset = state.cache.assets.find(a => a.id === e.dataTransfer.getData("asset"));
  if (asset) await place(asset, u, root, e.target);
}
async function place(asset, u, root, rowEl) {
  for (let k = u; k < u + asset.uHeight; k++) {
    if (k > rack.uSize || rack.slots[k]) { flash(rowEl); return; }
  }
  const dev = await save("devices", {
    assetRef: asset.id, label: `${asset.model}-${u}U`, system: asset.system,
    ports: (asset.portTemplate || []).flatMap(g => Array.from({ length: g.count },
      (_, i) => ({ portId: `${g.group}${i + 1}`, name: `${g.type} ${i + 1}`, group: g.group, status: "free" }))),
    location: { type: "rack", rackId: rack.id, uPosition: u }
  });
  state.cache.devices.push(dev);
  for (let k = u; k < u + asset.uHeight; k++) rack.slots[k] = dev.id;
  await save("racks", rack); paint(root);
}
function flash(el) { const f = el.getAttribute("fill"); el.setAttribute("fill", "#7f1d1d");
  setTimeout(() => el.setAttribute("fill", f), 250); }

async function removeFromRack(d) {
  Object.keys(rack.slots).forEach(k => { if (rack.slots[k] === d.id) delete rack.slots[k]; });
  rack.powerChain = (rack.powerChain || []).filter(l => l.from !== d.id && l.to !== d.id);
  await save("racks", rack);
  await remove("devices", d.id);
  state.cache.devices = state.cache.devices.filter(x => x.id !== d.id);
}

async function powerClick(d, asset, root) {
  if (!powerMode) return;
  if (!powerFrom) {
    if (asset.category !== "ups" && asset.category !== "pdu") return alert("Select a UPS or PDU first.");
    powerFrom = d.id; return;
  }
  if (powerFrom === d.id) { powerFrom = null; return; }
  rack.powerChain = rack.powerChain || [];
  rack.powerChain.push({ from: powerFrom, to: d.id, cable: "IEC C13-C14" });
  await save("racks", rack); powerFrom = null; paint(root);
}

function loadInfo(root, inRack) {
  const ups = inRack.find(d => (state.cache.assets.find(a => a.id === d.assetRef) || {}).category === "ups");
  if (!ups) { root.querySelector("#upsLoad").textContent = ""; return; }
  const cap = (state.cache.assets.find(a => a.id === ups.assetRef).power || {}).watts || 1;
  const fed = (rack.powerChain || []).filter(l => l.from === ups.id).map(l =>
    state.cache.devices.find(d => d.id === l.to)).filter(Boolean);
  const load = fed.reduce((s, d) => s + ((state.cache.assets.find(a => a.id === d.assetRef)?.power?.watts) || 0), 0);
  const pct = Math.round(load / cap * 100);
  root.querySelector("#upsLoad").innerHTML =
    `UPS load: <b>${load} W / ${cap} W (${pct}%)</b>` + (pct > 80 ? ` <span style="color:var(--danger)">⚠ above 80%</span>` : "");
}
export function rackSvg() { return svg; }
