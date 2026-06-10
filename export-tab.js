// Export hub: Excel (BOM, connections, ports), PDF (vector), Visio VSDX
import { state } from "./store.js";
import { branding, logoPngDataUrl } from "./branding.js";
import { exportVsdx } from "./export-vsdx.js";

export function renderExport(root) {
  root.innerHTML = `
  <div class="panel" style="max-width:680px">
    <h3>Export deliverables</h3>
    <p class="muted">All exports include the Ejaf Technology logo and the "${branding.poweredBy}" footer.</p>
    <div class="row"><button id="expXlsx" class="btn primary">Excel — BOM + Connection & Port Schedules (.xlsx)</button></div>
    <div class="row">
      <select id="pdfSource">
        <option value="topoSvg">Topology diagram</option>
        <option value="rackSvg">Rack layout</option>
        <option value="encSvg">Enclosure layout</option>
      </select>
      <button id="expPdf" class="btn primary">High-res PDF (vector)</button>
    </div>
    <div class="row"><button id="expVsdx" class="btn primary">MS Visio (.vsdx) — topology</button></div>
    <p id="expMsg" class="muted"></p>
  </div>`;
  root.querySelector("#expXlsx").onclick = doXlsx;
  root.querySelector("#expPdf").onclick = () => doPdf(root.querySelector("#pdfSource").value);
  root.querySelector("#expVsdx").onclick = () => exportVsdx(state, branding);
}

/* ---------- EXCEL ---------- */
async function doXlsx() {
  const wb = new ExcelJS.Workbook();
  wb.creator = branding.company;
  const logo = wb.addImage({ base64: await logoPngDataUrl(), extension: "png" });
  const header = (ws, cols) => {
    ws.addImage(logo, { tl: { col: 0, row: 0 }, ext: { width: 165, height: 36 } });
    ws.getRow(3).values = cols;
    ws.getRow(3).font = { bold: true };
    ws.getRow(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF3F9" } };
    ws.columns = cols.map(() => ({ width: 20 }));
  };
  const footer = ws => {
    const r = ws.addRow([]); ws.addRow([`${branding.poweredBy} — generated ${new Date().toLocaleDateString("en-GB")}`]);
    ws.lastRow.font = { italic: true, color: { argb: "FF888888" } };
  };
  // BOM
  const bom = wb.addWorksheet("BOM");
  header(bom, ["Item","System","Manufacturer","Model","Category","Qty","U","Power (W)"]);
  const byAsset = {};
  state.cache.devices.forEach(d => byAsset[d.assetRef] = (byAsset[d.assetRef] || 0) + 1);
  let i = 1;
  for (const [aid, qty] of Object.entries(byAsset)) {
    const a = state.cache.assets.find(x => x.id === aid); if (!a) continue;
    bom.addRow([i++, a.system, a.manufacturer, a.model, a.category, qty, a.uHeight, a.power?.watts || 0]);
  }
  const byCable = {};
  state.cache.cables.forEach(c => byCable[c.type] = (byCable[c.type] || 0) + 1);
  for (const [t, qty] of Object.entries(byCable))
    bom.addRow([i++, "—", "Cable", branding.cableStyles[t]?.label || t, "cable", qty, "", ""]);
  footer(bom);
  // Connection schedule
  const cs = wb.addWorksheet("Connection Schedule");
  header(cs, ["#","System","From device","From port","Cable","Type","To device","To port","Status"]);
  state.cache.cables.forEach((c, n) => {
    const a = state.cache.devices.find(d => d.id === c.fromRef?.deviceId) || {};
    const b = state.cache.devices.find(d => d.id === c.toRef?.deviceId) || {};
    cs.addRow([n + 1, a.system || "", a.label || "", c.fromRef?.portId || "", c.code,
               branding.cableStyles[c.type]?.label || c.type, b.label || "", c.toRef?.portId || "", "planned"]);
  });
  footer(cs);
  // Port schedule
  const ps = wb.addWorksheet("Port Schedule");
  header(ps, ["Device","Range","System","Locked","Reserved by"]);
  state.cache.reservations.forEach(r => {
    const d = state.cache.devices.find(x => x.id === r.deviceId) || {};
    ps.addRow([d.label || r.deviceId, `${r.rangeStart}–${r.rangeEnd}`, r.system, r.locked ? "Yes" : "No", r.reservedBy]);
  });
  footer(ps);
  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf]), "ELV-Schedules.xlsx");
}

/* ---------- PDF ---------- */
async function doPdf(svgId) {
  const el = document.getElementById(svgId);
  if (!el || !el.innerHTML.trim()) return alert("Open that tab first and draw something, then export.");
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });
  doc.addImage(await logoPngDataUrl(), "PNG", 24, 16, 132, 29);
  doc.setFontSize(14).setTextColor(11, 83, 148);
  doc.text("ELV Schematic — " + (svgId === "rackSvg" ? "Rack Layout" : svgId === "encSvg" ? "Enclosure Layout" : "Topology"), 180, 36);
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  await doc.svg(el, { x: 24, y: 60, width: W - 48, height: H - 110 });
  doc.setFontSize(9).setTextColor(140);
  doc.text(`${branding.company} · ${branding.poweredBy} · ${new Date().toLocaleDateString("en-GB")}`, 24, H - 18);
  doc.save("ELV-Diagram.pdf");
}
function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  URL.revokeObjectURL(a.href);
}
