// Visio VSDX / VSSX importer — parses OOXML, converts shape geometry to SVG paths.
// Free, client-side, powered by JSZip. Supports drawings (.vsdx) and stencils (.vssx).
const IN = 96; // inches → px

export async function importVisioFile(file) {
  const zip = await JSZip.loadAsync(file);
  const out = [];
  // 1) Masters (stencil blocks) — preferred source
  const masterRel = {};
  const mastersXml = await read(zip, "visio/masters/masters.xml");
  if (mastersXml) {
    const doc = xml(mastersXml);
    const rels = xml(await read(zip, "visio/masters/_rels/masters.xml.rels") || "<x/>");
    for (const m of doc.querySelectorAll("Master")) {
      const relId = m.querySelector("Rel")?.getAttribute("r:id") ||
                    m.querySelector("Rel")?.getAttributeNS("*","id");
      const rel = [...rels.querySelectorAll("Relationship")].find(r => r.getAttribute("Id") === relId);
      if (rel) masterRel[m.getAttribute("ID")] = { name: m.getAttribute("Name") || "Shape",
        target: "visio/masters/" + rel.getAttribute("Target") };
    }
    for (const { name, target } of Object.values(masterRel)) {
      const mx = await read(zip, target);
      if (!mx) continue;
      const block = shapesToBlock(xml(mx).querySelectorAll(":scope > Shapes > Shape, MasterContents > Shapes > Shape"), name);
      if (block) out.push(block);
    }
  }
  // 2) Page shapes (for .vsdx drawings without useful masters)
  if (!out.length) {
    for (const path of Object.keys(zip.files).filter(p => /visio\/pages\/page\d+\.xml$/.test(p))) {
      const px = xml(await read(zip, path));
      for (const sh of px.querySelectorAll("PageContents > Shapes > Shape")) {
        const block = shapesToBlock([sh], textOf(sh) || "Imported shape");
        if (block) out.push(block);
      }
    }
  }
  return out; // [{name, w, h, paths:[{d,fill,stroke,sw}], label}]
}

const read = (zip, p) => zip.file(p)?.async("string");
const xml = s => new DOMParser().parseFromString(s, "application/xml");
const cell = (sh, n, def = 0) => {
  const c = [...sh.children].find(x => x.tagName === "Cell" && x.getAttribute("N") === n);
  return c ? parseFloat(c.getAttribute("V")) || def : def;
};
const textOf = sh => sh.querySelector(":scope > Text")?.textContent?.trim() || "";

function shapesToBlock(shapeEls, name) {
  const paths = [];
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  const walk = (sh, ox, oy) => {
    const W = cell(sh, "Width"), H = cell(sh, "Height");
    const px = cell(sh, "PinX"), py = cell(sh, "PinY");
    const lx = cell(sh, "LocPinX", W / 2), ly = cell(sh, "LocPinY", H / 2);
    const x0 = ox + px - lx, y0 = oy + py - ly;
    for (const geo of [...sh.children].filter(e => e.tagName === "Section" && e.getAttribute("N") === "Geometry")) {
      let d = "", cx = 0, cy = 0;
      const noFill = [...geo.children].some(c => c.tagName==="Cell" && c.getAttribute("N")==="NoFill" && c.getAttribute("V")==="1");
      for (const row of geo.querySelectorAll("Row")) {
        const T = row.getAttribute("T");
        const rc = n => { const c = [...row.children].find(x => x.getAttribute("N") === n);
          return c ? parseFloat(c.getAttribute("V")) || 0 : 0; };
        let X = rc("X"), Y = rc("Y");
        if (T?.startsWith("Rel")) { X *= W; Y *= H; }
        const SX = (x0 + X) * IN, SY = (y0 + H - Y) * IN; // flip Visio Y-up
        switch (T) {
          case "MoveTo": case "RelMoveTo": d += `M ${SX} ${SY} `; break;
          case "LineTo": case "RelLineTo": case "ArcTo": case "PolylineTo":
          case "NURBSTo": case "SplineKnot": case "RelCubBezTo": case "RelQuadBezTo":
            d += `L ${SX} ${SY} `; break;
          case "EllipticalArcTo": d += `L ${SX} ${SY} `; break;
          case "Ellipse": {
            const A = (x0 + rc("A")) * IN, B = (y0 + H - rc("B")) * IN;
            const rx = Math.abs(A - SX), ry = Math.abs(B - SY) || rx;
            d += `M ${SX - rx} ${SY} a ${rx} ${ry} 0 1 0 ${2*rx} 0 a ${rx} ${ry} 0 1 0 ${-2*rx} 0 `;
            break; }
        }
        minX = Math.min(minX, SX); minY = Math.min(minY, SY);
        maxX = Math.max(maxX, SX); maxY = Math.max(maxY, SY);
      }
      if (d) paths.push({ d: d.trim() + (noFill ? "" : " Z"), fill: noFill ? "none" : "#EAF1FF",
                          stroke: "#0A3DBB", sw: 1.6 });
    }
    for (const sub of sh.querySelectorAll(":scope > Shapes > Shape")) walk(sub, x0, y0);
  };
  for (const sh of shapeEls) walk(sh, 0, 0);
  if (!paths.length || minX > maxX) return null;
  // normalize to origin
  const w = Math.max(20, maxX - minX), h = Math.max(20, maxY - minY);
  for (const p of paths)
    p.d = p.d.replace(/(-?\d+\.?\d*)\s(-?\d+\.?\d*)/g, (m, a, b) =>
      `${(parseFloat(a) - minX).toFixed(1)} ${(parseFloat(b) - minY).toFixed(1)}`);
  return { name: name.slice(0, 28), w: Math.round(w), h: Math.round(h), paths };
}
