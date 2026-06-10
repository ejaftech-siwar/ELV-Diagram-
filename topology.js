// Topology & connection mapping — custom SVG engine (zero-license, fully free)
import { state, save, remove } from "./store.js";
import { branding } from "./branding.js";

const NS = "http://www.w3.org/2000/svg";
let svg, pendingPort = null, selectedCable = null, drag = null;

export function renderTopology(root) {
  root.innerHTML = `
  <div class="split">
    <div class="panel side">
      <h3>Place Devices</h3>
      <div class="row">
        <select id="topoAsset" style="flex:1">${state.cache.assets.map(a=>`<option value="${a.id}">${a.manufacturer} ${a.model}</option>`).join("")}</select>
      </div>
      <div class="row"><input id="topoLabel" placeholder="Device label e.g. CAM-L02-014" style="flex:1"></div>
      <button id="btnAddDev" class="btn primary" style="width:100%">Add to canvas</button>
      <h3 style="margin-top:16px">Connect (cable)</h3>
      <select id="cableType" style="width:100%">${Object.entries(branding.cableStyles).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join("")}</select>
      <p class="muted" style="font-size:11.5px">Tap a port, then tap a second port to run a cable. Tap a cable to select it (press Delete on desktop to remove). Drag device headers to move them.</p>
      <h3>Filter systems</h3>
      <div id="sysFilters">${branding.systems.map(s=>`<label style="display:block;font-size:12.5px"><input type="checkbox" checked data-sys="${s}"> ${s}</label>`).join("")}</div>
      <button id="btnSaveTopo" class="btn primary" style="width:100%;margin-top:12px">Save layout</button>
    </div>
    <div class="grow">
      <div class="canvas-wrap"><svg id="topoSvg" class="canvas" width="1400" height="800" tabindex="0"></svg>
        <div class="wm">${branding.poweredBy}</div></div>
      <div class="legend">${Object.values(branding.cableStyles).map(v=>`<span style="border-color:${v.color};color:${v.color}">${v.label}</span>`).join("")}</div>
    </div>
  </div>`;
  svg = root.querySelector("#topoSvg");
  svg.addEventListener("keydown", e => { if (e.key === "Delete" && selectedCable) delCable(selectedCable); });
  root.querySelector("#btnAddDev").onclick = () => addDevice(root);
  root.querySelector("#btnSaveTopo").onclick = saveLayout;
  root.querySelectorAll("#sysFilters input").forEach(c => c.onchange = paint);
  paint();
}

function devicesOnCanvas() { return state.cache.devices.filter(d => d.topo); }

async function addDevice(root) {
  const asset = state.cache.assets.find(a => a.id === root.querySelector("#topoAsset").value);
  if (!asset) return;
  const label = root.querySelector("#topoLabel").value.trim() || `${asset.model}-${state.cache.devices.length+1}`;
  const ports = [];
  (asset.portTemplate || []).forEach(g => { for (let i = 1; i <= g.count; i++)
    ports.push({ portId: `${g.group}${i}`, name: `${g.type} ${i}`, group: g.group, status: "free" }); });
  const dev = await save("devices", { assetRef: asset.id, label, system: asset.system,
    ports, location: { type: "field" }, topo: { x: 80 + Math.random()*300, y: 80 + Math.random()*300 } });
  state.cache.devices.push(dev); paint();
}

function visibleSystems() {
  return [...document.querySelectorAll("#sysFilters input")].filter(c=>c.checked).map(c=>c.dataset.sys);
}

function portPos(dev, idx, total) {
  const w = 150, hdr = 26, rows = Math.max(1, Math.ceil(total / 2));
  const h = hdr + rows * 18 + 8;
  const side = idx % 2 === 0 ? 0 : w;            // even = left, odd = right
  const row = Math.floor(idx / 2);
  return { x: dev.topo.x + side, y: dev.topo.y + hdr + 12 + row * 18, w, h };
}

export function paint() {
  if (!svg) return;
  svg.innerHTML = "";
  const vis = visibleSystems();
  // cables first (under devices)
  for (const c of state.cache.cables) {
    const a = state.cache.devices.find(d => d.id === c.fromRef?.deviceId);
    const b = state.cache.devices.find(d => d.id === c.toRef?.deviceId);
    if (!a?.topo || !b?.topo) continue;
    if (!vis.includes(a.system) && !vis.includes(b.system)) continue;
    const pa = portPos(a, a.ports.findIndex(p=>p.portId===c.fromRef.portId), a.ports.length || 1);
    const pb = portPos(b, b.ports.findIndex(p=>p.portId===c.toRef.portId), b.ports.length || 1);
    const st = branding.cableStyles[c.type] || branding.cableStyles.CAT6;
    const midX = (pa.x + pb.x) / 2;
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", `M ${pa.x} ${pa.y} L ${midX} ${pa.y} L ${midX} ${pb.y} L ${pb.x} ${pb.y}`);
    path.setAttribute("fill", "none"); path.setAttribute("stroke", st.color);
    path.setAttribute("stroke-width", c.id === selectedCable ? 5 : (st.width || 2));
    if (st.dash) path.setAttribute("stroke-dasharray", st.dash);
    path.style.cursor = "pointer";
    path.onclick = () => { selectedCable = c.id; svg.focus(); paint(); };
    svg.appendChild(path);
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", midX + 4); t.setAttribute("y", (pa.y + pb.y) / 2 - 4);
    t.setAttribute("font-size", "10"); t.setAttribute("fill", st.color);
    t.textContent = c.code || st.label;
    svg.appendChild(t);
  }
  // devices
  for (const d of devicesOnCanvas()) {
    if (!vis.includes(d.system)) continue;
    const total = d.ports.length || 1;
    const { w, h } = portPos(d, 0, total);
    const g = document.createElementNS(NS, "g");
    g.setAttribute("transform", `translate(${d.topo.x},${d.topo.y})`);
    const r = document.createElementNS(NS, "rect");
    r.setAttribute("width", w); r.setAttribute("height", h); r.setAttribute("rx", 6);
    r.setAttribute("fill", "#fff"); r.setAttribute("stroke", branding.systemColors[d.system] || "#888");
    r.setAttribute("stroke-width", 1.6); r.style.cursor = "move";
    g.appendChild(r);
    const hd = document.createElementNS(NS, "rect");
    hd.setAttribute("width", w); hd.setAttribute("height", 22); hd.setAttribute("rx", 6);
    hd.setAttribute("fill", branding.systemColors[d.system] || "#888"); hd.style.cursor = "move";
    g.appendChild(hd);
    const tt = document.createElementNS(NS, "text");
    tt.setAttribute("x", 8); tt.setAttribute("y", 15); tt.setAttribute("font-size", 11);
    tt.setAttribute("fill", "#fff"); tt.setAttribute("font-weight", "600"); tt.style.pointerEvents="none";
    tt.textContent = d.label; g.appendChild(tt);
    // ports
    d.ports.forEach((p, i) => {
      const pp = portPos(d, i, total);
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", pp.x - d.topo.x); c.setAttribute("cy", pp.y - d.topo.y); c.setAttribute("r", 5);
      c.setAttribute("fill", p.status === "connected" ? "#2e7d32" : "#fff");
      c.setAttribute("stroke", pendingPort && pendingPort.dev === d.id && pendingPort.port === p.portId ? "#E69138" : "#555");
      c.setAttribute("stroke-width", 2); c.style.cursor = "crosshair";
      c.onclick = ev => { ev.stopPropagation(); portClick(d, p); };
      g.appendChild(c);
      const pl = document.createElementNS(NS, "text");
      pl.setAttribute("x", pp.x - d.topo.x + (i % 2 === 0 ? 9 : -9));
      pl.setAttribute("y", pp.y - d.topo.y + 3);
      pl.setAttribute("font-size", 8.5); pl.setAttribute("fill", "#666");
      pl.setAttribute("text-anchor", i % 2 === 0 ? "start" : "end");
      pl.textContent = p.name; g.appendChild(pl);
    });
    // drag
    const startDrag = ev => { ev.preventDefault(); svg.setPointerCapture?.(ev.pointerId); drag = { d, ox: ev.offsetX - d.topo.x, oy: ev.offsetY - d.topo.y }; };
    r.style.touchAction = "none"; hd.style.touchAction = "none";
    r.onpointerdown = startDrag; hd.onpointerdown = startDrag;
    svg.appendChild(g);
  }
  svg.onpointermove = ev => { if (drag) { drag.d.topo.x = ev.offsetX - drag.ox; drag.d.topo.y = ev.offsetY - drag.oy; paint(); } };
  svg.onpointerup = async () => { if (drag) { await save("devices", drag.d); drag = null; } };
  svg.onclick = () => { selectedCable = null; paint(); };
}

async function portClick(dev, port) {
  if (!pendingPort) { pendingPort = { dev: dev.id, port: port.portId }; paint(); return; }
  if (pendingPort.dev === dev.id && pendingPort.port === port.portId) { pendingPort = null; paint(); return; }
  // reservation check
  const r = state.cache.reservations.find(x => x.deviceId === dev.id &&
    numOf(port.portId) >= x.rangeStart && numOf(port.portId) <= x.rangeEnd);
  const fromDev = state.cache.devices.find(d => d.id === pendingPort.dev);
  if (r && r.system !== fromDev.system && state.user.role !== "owner")
    { alert(`Port reserved for ${r.system}. Owner override required.`); pendingPort = null; paint(); return; }
  const type = document.querySelector("#cableType").value;
  const cable = await save("cables", {
    code: `${type.slice(0,3)}-${String(state.cache.cables.length + 1).padStart(4, "0")}`,
    category: type.startsWith("AC") || type.startsWith("DC") ? "power" : "data",
    type, fromRef: { deviceId: pendingPort.dev, portId: pendingPort.port },
    toRef: { deviceId: dev.id, portId: port.portId }, lengthM: 0 });
  state.cache.cables.push(cable);
  setPort(pendingPort.dev, pendingPort.port, "connected");
  setPort(dev.id, port.portId, "connected");
  await save("connections", { name: `${fromDev.label} → ${dev.label}`, system: fromDev.system,
    hops: [{ device: fromDev.label, port: pendingPort.port }, { cable: cable.code },
           { device: dev.label, port: port.portId }], status: "planned" });
  state.cache.connections = state.cache.connections; // refreshed by show()
  pendingPort = null; paint();
}
const numOf = id => parseInt(String(id).replace(/\D/g, "")) || 0;
async function setPort(devId, portId, status) {
  const d = state.cache.devices.find(x => x.id === devId);
  const p = d.ports.find(x => x.portId === portId);
  p.status = status; await save("devices", d);
}
async function delCable(id) {
  const c = state.cache.cables.find(x => x.id === id);
  if (c) { await setPort(c.fromRef.deviceId, c.fromRef.portId, "free");
           await setPort(c.toRef.deviceId, c.toRef.portId, "free"); }
  await remove("cables", id);
  state.cache.cables = state.cache.cables.filter(x => x.id !== id);
  selectedCable = null; paint();
}
async function saveLayout() {
  const layout = {};
  devicesOnCanvas().forEach(d => layout[d.id] = d.topo);
  await save("diagrams", { kind: "topology", title: "Topology", layout, paper: { size: "A3" } });
  alert("Layout saved.");
}
export function topologySvg() { return svg; }
