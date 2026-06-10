import { state, save, remove } from "./store.js";
import { branding } from "./branding.js";

const CATS = ["camera","switch","patchPanel","odf","organizer","server","firewall","ups","pdu",
              "mediaConverter","powerSupply","accessController","facp","intrusionPanel"];

export function renderLibrary(root) {
  root.innerHTML = `
  <div class="split">
    <div class="panel side">
      <h3>Add / Edit Asset</h3>
      <form id="assetForm" class="form-grid" onsubmit="return false">
        <input name="manufacturer" placeholder="Manufacturer" required>
        <input name="model" placeholder="Model" required>
        <select name="category">${CATS.map(c=>`<option>${c}</option>`).join("")}</select>
        <select name="system">${branding.systems.map(s=>`<option>${s}</option>`).join("")}</select>
        <input name="uHeight" type="number" min="0" max="10" placeholder="U height (0 = field)">
        <input name="watts" type="number" min="0" placeholder="Power (W)">
        <select name="powerInput"><option>AC230V</option><option>DC12V</option><option>DC24V</option><option>DC48V</option><option>PoE</option><option>None</option></select>
        <input name="ports" type="number" min="0" placeholder="Data ports">
        <input name="w" type="number" placeholder="Width mm"><input name="h" type="number" placeholder="Height mm">
        <input name="datasheetUrl" placeholder="Datasheet URL (free: link to vendor PDF)" style="grid-column:1/3">
        <input name="image" type="file" accept="image/*" style="grid-column:1/3">
        <button id="btnSaveAsset" class="btn primary" style="grid-column:1/3">Save Asset</button>
      </form>
      <p class="muted" style="font-size:11px">Images are stored as small Base64 thumbnails inside the database — 100% free, no Cloud Storage needed. Keep images under ~100 KB.</p>
    </div>
    <div class="panel grow">
      <h3>Asset & Datasheet Library (${state.cache.assets.length})</h3>
      <table class="data"><thead><tr>
        <th></th><th>Manufacturer</th><th>Model</th><th>Category</th><th>System</th><th>U</th><th>W</th><th>Ports</th><th>Datasheet</th><th></th>
      </tr></thead><tbody id="assetRows"></tbody></table>
    </div>
  </div>`;
  drawRows(root);
  root.querySelector("#btnSaveAsset").onclick = () => submit(root);
}

function drawRows(root) {
  root.querySelector("#assetRows").innerHTML = state.cache.assets.map(a => `
    <tr>
      <td>${a.imageData ? `<img src="${a.imageData}" style="width:42px;height:28px;object-fit:contain">` : "—"}</td>
      <td>${a.manufacturer}</td><td>${a.model}</td><td>${a.category}</td><td>${a.system}</td>
      <td>${a.uHeight || 0}</td><td>${a.power?.watts || 0}</td>
      <td>${(a.portTemplate||[]).reduce((s,p)=>s+p.count,0)}</td>
      <td>${a.datasheetUrl ? `<a href="${a.datasheetUrl}" target="_blank">PDF</a>` : "—"}</td>
      <td><button class="btn small danger" data-del="${a.id}">✕</button></td>
    </tr>`).join("");
  root.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (state.user.role !== "owner") return alert("Only Owner can delete library assets.");
    await remove("assets", b.dataset.del);
    state.cache.assets = state.cache.assets.filter(a => a.id !== b.dataset.del);
    drawRows(root);
  });
}

async function submit(root) {
  const f = root.querySelector("#assetForm");
  if (!f.manufacturer.value || !f.model.value) return alert("Manufacturer and model are required.");
  const asset = {
    manufacturer: f.manufacturer.value, model: f.model.value,
    category: f.category.value, system: f.system.value,
    uHeight: +f.uHeight.value || 0,
    power: { input: f.powerInput.value, watts: +f.watts.value || 0 },
    portTemplate: +f.ports.value ? [{ group: "data", type: "RJ45", count: +f.ports.value }] : [],
    dimensionsMm: { w: +f.w.value || 100, h: +f.h.value || 50 },
    datasheetUrl: f.datasheetUrl.value || ""
  };
  const file = f.image.files[0];
  if (file) asset.imageData = await thumb(file);
  await save("assets", asset);
  state.cache.assets.push(asset);
  f.reset(); drawRows(root);
}
function thumb(file) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      const k = Math.min(1, 160 / img.width);
      c.width = img.width * k; c.height = img.height * k;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", 0.7));
    };
    img.src = URL.createObjectURL(file);
  });
}
