// Smart Port Allocation: reserve port ranges per system with colors + lock
import { state, save, remove } from "./store.js";
import { branding } from "./branding.js";

let selStart = null, selEnd = null;

export function renderPorts(root) {
  const withPorts = state.cache.devices.filter(d => (d.ports || []).length > 1);
  root.innerHTML = `
  <div class="split">
    <div class="panel side">
      <h3>Reserve a range</h3>
      <div class="row"><select id="portDev" style="flex:1">
        ${withPorts.map(d=>`<option value="${d.id}">${d.label}</option>`).join("")}</select></div>
      <p class="muted" style="font-size:11.5px">Click first port then last port to select a range, then assign:</p>
      <div class="row"><select id="portSys" style="flex:1">${branding.systems.map(s=>`<option>${s}</option>`).join("")}</select></div>
      <label style="font-size:12.5px"><input type="checkbox" id="portLock"> Lock range (Owner-only edits)</label>
      <button id="btnReserve" class="btn primary" style="width:100%;margin-top:8px">Reserve selected range</button>
      <h3 style="margin-top:14px">Existing reservations</h3>
      <div id="resList"></div>
    </div>
    <div class="panel grow">
      <h3>Port map <span id="portDevName" class="muted"></span></h3>
      <div id="portsGrid" class="ports-grid"></div>
    </div>
  </div>`;
  const sel = root.querySelector("#portDev");
  sel.onchange = () => { selStart = selEnd = null; grid(root); };
  root.querySelector("#btnReserve").onclick = () => reserve(root);
  grid(root);
}

function curDev(root) {
  return state.cache.devices.find(d => d.id === root.querySelector("#portDev").value);
}
function grid(root) {
  const d = curDev(root);
  const g = root.querySelector("#portsGrid");
  const lst = root.querySelector("#resList");
  if (!d) { g.innerHTML = "<p class='muted'>Add a multi-port device (switch / patch panel) in the Topology or Rack tab first.</p>"; lst.innerHTML=""; return; }
  root.querySelector("#portDevName").textContent = "— " + d.label;
  const res = state.cache.reservations.filter(r => r.deviceId === d.id);
  g.innerHTML = d.ports.map((p, i) => {
    const n = i + 1;
    const r = res.find(x => n >= x.rangeStart && n <= x.rangeEnd);
    const inSel = selStart && n >= Math.min(selStart, selEnd || selStart) && n <= Math.max(selStart, selEnd || selStart);
    const bg = inSel ? "#E69138" : r ? r.color : (p.status === "connected" ? "#2e7d32" : "#fff");
    const fg = (inSel || r || p.status === "connected") ? "#fff" : "#333";
    return `<div class="port-cell" data-n="${n}" title="${p.name}${r ? " — reserved: " + r.system + (r.locked ? " (locked)" : "") : ""}"
      style="background:${bg};color:${fg};border-color:${r?.locked ? "#000" : "var(--line)"}">${n}</div>`;
  }).join("");
  g.querySelectorAll(".port-cell").forEach(c => c.onclick = () => {
    const n = +c.dataset.n;
    if (!selStart || (selStart && selEnd)) { selStart = n; selEnd = null; }
    else selEnd = n;
    grid(root);
  });
  lst.innerHTML = res.map(r => `
    <div class="list-item"><span><span style="display:inline-block;width:12px;height:12px;background:${r.color};border-radius:3px"></span>
      ${r.rangeStart}–${r.rangeEnd} · ${r.system} ${r.locked ? "🔒" : ""}</span>
      <button class="btn small danger" data-rel="${r.id}">Release</button></div>`).join("") || "<p class='muted'>None.</p>";
  lst.querySelectorAll("[data-rel]").forEach(b => b.onclick = async () => {
    const r = state.cache.reservations.find(x => x.id === b.dataset.rel);
    if (r.locked && state.user.role !== "owner") return alert("Locked reservation — Owner role required.");
    await remove("reservations", r.id);
    state.cache.reservations = state.cache.reservations.filter(x => x.id !== r.id);
    grid(root);
  });
}
async function reserve(root) {
  const d = curDev(root);
  if (!d || !selStart) return alert("Select a port range first.");
  const a = Math.min(selStart, selEnd || selStart), b = Math.max(selStart, selEnd || selStart);
  const clash = state.cache.reservations.find(r => r.deviceId === d.id && a <= r.rangeEnd && b >= r.rangeStart);
  if (clash) return alert(`Conflict with existing reservation ${clash.rangeStart}–${clash.rangeEnd} (${clash.system}).`);
  const system = root.querySelector("#portSys").value;
  const r = await save("reservations", { deviceId: d.id, rangeStart: a, rangeEnd: b, system,
    color: branding.systemColors[system], locked: root.querySelector("#portLock").checked,
    reservedBy: state.user.uid });
  state.cache.reservations.push(r);
  selStart = selEnd = null; grid(root);
}
