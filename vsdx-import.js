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
  for (const p of paths) { p.tx = (p.tx || 0) - minX; p.ty = (p.ty || 0) - minY; }
  return { name: name.slice(0, 28), w: Math.round(w), h: Math.round(h), paths };
}

/* ================================================================
   importVisioDrawing(file) — opens a .vsdx DRAWING onto the canvas:
   returns { pages: [{ name, W, H, shapes:[...] }] } in px, Y-down.
   Shapes carry their real positions; geometry comes from the shape
   itself or is inherited from its Master.
   ================================================================ */
export async function importVisioDrawing(file) {
  const zip = await JSZip.loadAsync(file);
  // --- masters geometry map: MasterID -> {mw, mh, paths(local px, y-down)}
  const masters = {};
  const mXml = await read(zip, "visio/masters/masters.xml");
  if (mXml) {
    const doc = xml(mXml);
    const rels = xml(await read(zip, "visio/masters/_rels/masters.xml.rels") || "<x/>");
    for (const m of doc.querySelectorAll("Master")) {
      const relId = m.querySelector("Rel")?.getAttribute("r:id");
      const rel = [...rels.querySelectorAll("Relationship")].find(r => r.getAttribute("Id") === relId);
      if (!rel) continue;
      const mx = await read(zip, "visio/masters/" + rel.getAttribute("Target"));
      if (!mx) continue;
      const top = xml(mx).querySelector("Shapes > Shape");
      if (!top) continue;
      const W = cell(top, "Width") || 1, H = cell(top, "Height") || 1;
      const paths = localPaths(top, W, H);
      if (paths.length) masters[m.getAttribute("ID")] =
        { mw: W * IN, mh: H * IN, paths, name: m.getAttribute("Name") || "" };
    }
  }
  // --- page sizes
  const pageMeta = {};
  const pagesXml = await read(zip, "visio/pages/pages.xml");
  if (pagesXml) {
    let i = 1;
    for (const p of xml(pagesXml).querySelectorAll("Page")) {
      const ps = p.querySelector("PageSheet");
      pageMeta[i] = { name: p.getAttribute("Name") || `Page-${i}`,
        W: (ps ? cell(ps, "PageWidth", 16.54) : 16.54),
        H: (ps ? cell(ps, "PageHeight", 11.69) : 11.69) };
      i++;
    }
  }
  const pages = [];
  const files = Object.keys(zip.files).filter(p => /visio\/pages\/page\d+\.xml$/.test(p))
    .sort((a, b) => +a.match(/(\d+)/)[1] - +b.match(/(\d+)/)[1]);
  let pn = 0;
  for (const path of files) {
    pn++;
    const meta = pageMeta[pn] || { name: `Page-${pn}`, W: 16.54, H: 11.69 };
    const PH = meta.H;
    const page = { name: meta.name, W: Math.round(meta.W * IN), H: Math.round(meta.H * IN),
                   shapes: [], links: [] };
    const px = xml(await read(zip, path));
    for (const sh of px.querySelectorAll("PageContents > Shapes > Shape")) {
      try {
        const W = cell(sh, "Width"), H = cell(sh, "Height");
        if (!W || !H) continue;
        const pinX = cell(sh, "PinX"), pinY = cell(sh, "PinY");
        const lx = cell(sh, "LocPinX", W / 2), ly = cell(sh, "LocPinY", H / 2);
        const x = (pinX - lx) * IN;
        const y = (PH - (pinY + (H - ly))) * IN;
        let paths = localPaths(sh, W, H);
        let pw = W * IN, ph = H * IN, label = textOf(sh);
        if (!paths.length) {
          const mid = sh.getAttribute("Master");
          const m = masters[mid];
          if (m) { paths = m.paths; pw = m.mw; ph = m.mh; label = label || m.name; }
        }
        if (!paths.length)
          paths = [{ d: `M 0 0 L ${W*IN} 0 L ${W*IN} ${H*IN} L 0 ${H*IN} Z`,
                     fill: "#EAF1FF", stroke: "#0A3DBB", sw: 1.6 }], pw = W*IN, ph = H*IN;
        page.shapes.push({ id: "v" + Math.random().toString(36).slice(2, 8), type: "custom",
          inline: paths, pw, ph, x: Math.round(x), y: Math.round(y),
          w: Math.round(W * IN), h: Math.round(H * IN), text: label });
      } catch (e) { /* skip malformed shape */ }
    }
    pages.push(page);
  }
  return { pages };
}

// shape geometry → SVG paths in LOCAL px coords (origin top-left, y-down)
function localPaths(sh, W, H) {
  const paths = [];
  for (const geo of [...sh.children].filter(e => e.tagName === "Section" && e.getAttribute("N") === "Geometry")) {
    let d = "";
    const noFill = [...geo.children].some(c => c.tagName === "Cell" &&
      c.getAttribute("N") === "NoFill" && c.getAttribute("V") === "1");
    for (const row of geo.querySelectorAll("Row")) {
      const T = row.getAttribute("T");
      const rc = n => { const c = [...row.children].find(x => x.getAttribute("N") === n);
        return c ? parseFloat(c.getAttribute("V")) || 0 : 0; };
      let X = rc("X"), Y = rc("Y");
      if (T?.startsWith("Rel")) { X *= W; Y *= H; }
      const SX = (X * IN).toFixed(1), SY = ((H - Y) * IN).toFixed(1);
      if (T === "MoveTo" || T === "RelMoveTo") d += `M ${SX} ${SY} `;
      else if (T === "Ellipse") {
        const rx = Math.abs((rc("A") - X) * IN), ry = Math.abs((H - rc("D") - (H - Y)) * IN) || rx;
        d += `M ${(X*IN - rx).toFixed(1)} ${SY} a ${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(2*rx).toFixed(1)} 0 a ${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(-2*rx).toFixed(1)} 0 `;
      }
      else if (T) d += `L ${SX} ${SY} `;
    }
    if (d.trim()) paths.push({ d: d.trim() + (noFill ? "" : " Z"),
      fill: noFill ? "none" : "#EAF1FF", stroke: "#0A3DBB", sw: 1.4 });
  }
  // nested sub-shapes (groups)
  for (const sub of sh.querySelectorAll(":scope > Shapes > Shape")) {
    const sw2 = cell(sub, "Width"), sh2 = cell(sub, "Height");
    const spx = cell(sub, "PinX"), spy = cell(sub, "PinY");
    const slx = cell(sub, "LocPinX", sw2 / 2), sly = cell(sub, "LocPinY", sh2 / 2);
    const ox = (spx - slx) * IN, oy = (H - (spy + (sh2 - sly))) * IN;
    for (const p of localPaths(sub, sw2, sh2))
      paths.push({ ...p, tx: (p.tx || 0) + ox, ty: (p.ty || 0) + oy });
  }
  return paths;
}
