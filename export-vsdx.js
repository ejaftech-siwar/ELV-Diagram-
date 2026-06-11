// Native MS Visio VSDX writer — pure JSZip OOXML, free, editable in Visio.
// exportVsdxModel(shapes, links, branding, title): generic (Designer tab)
// exportVsdx(state, branding): topology tab wrapper
const IN = 96;
const esc = s => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

export async function exportVsdxModel(shapes, links, branding, title = "ELV Drawing") {
  if (!shapes.length) return alert("Nothing to export — place shapes on the canvas first.");
  const minX = Math.min(...shapes.map(s => s.x)) - 40;
  const minY = Math.min(...shapes.map(s => s.y)) - 40;
  const pageW = Math.max(11.7, (Math.max(...shapes.map(s => s.x + s.w)) - minX + 80) / IN);
  const pageH = Math.max(8.3,  (Math.max(...shapes.map(s => s.y + s.h)) - minY + 80) / IN);
  let id = 1, xmlShapes = "", connects = "";
  const map = {};
  for (const s of shapes) {
    const w = s.w / IN, h = s.h / IN;
    const x = (s.x - minX) / IN + w / 2;
    const y = pageH - ((s.y - minY) / IN + h / 2);
    map[s.id] = id;
    const label = [s.text, [s.brand, s.model].filter(Boolean).join(" ")].filter(Boolean).join("\n");
    xmlShapes += `
    <Shape ID="${id}" Type="Shape" Name="S${id}" NameU="S${id}">
      <Cell N="PinX" V="${x.toFixed(4)}"/><Cell N="PinY" V="${y.toFixed(4)}"/>
      <Cell N="Width" V="${w.toFixed(4)}"/><Cell N="Height" V="${h.toFixed(4)}"/>
      <Cell N="LocPinX" V="${(w/2).toFixed(4)}"/><Cell N="LocPinY" V="${(h/2).toFixed(4)}"/>
      <Cell N="LinePattern" V="1"/><Cell N="LineWeight" V="0.0138"/>
      <Cell N="LineColor" V="#0A3DBB"/><Cell N="FillForegnd" V="#EAF1FF"/>
      <Section N="Geometry" IX="0">
        <Cell N="NoFill" V="0"/><Cell N="NoLine" V="0"/>
        <Row T="RelMoveTo" IX="1"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>
        <Row T="RelLineTo" IX="2"><Cell N="X" V="1"/><Cell N="Y" V="0"/></Row>
        <Row T="RelLineTo" IX="3"><Cell N="X" V="1"/><Cell N="Y" V="1"/></Row>
        <Row T="RelLineTo" IX="4"><Cell N="X" V="0"/><Cell N="Y" V="1"/></Row>
        <Row T="RelLineTo" IX="5"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>
      </Section>
      <Text>${esc(label)}</Text>
    </Shape>`;
    id++;
  }
  for (const l of links) {
    const a = shapes.find(s => s.id === l.from), b = shapes.find(s => s.id === l.to);
    if (!a || !b) continue;
    const x1 = (a.x + a.w/2 - minX) / IN, y1 = pageH - (a.y + a.h/2 - minY) / IN;
    const x2 = (b.x + b.w/2 - minX) / IN, y2 = pageH - (b.y + b.h/2 - minY) / IN;
    const st = (branding.cableStyles || {})[l.ctype] || {};
    const dashed = !!st.dash, color = st.color || "#16264A";
    xmlShapes += `
    <Shape ID="${id}" Type="Shape" Name="C${id}">
      <Cell N="BeginX" V="${x1.toFixed(4)}"/><Cell N="BeginY" V="${y1.toFixed(4)}"/>
      <Cell N="EndX" V="${x2.toFixed(4)}"/><Cell N="EndY" V="${y2.toFixed(4)}"/>
      <Cell N="PinX" V="${((x1+x2)/2).toFixed(4)}"/><Cell N="PinY" V="${((y1+y2)/2).toFixed(4)}"/>
      <Cell N="Width" V="${(Math.abs(x2-x1)||0.1).toFixed(4)}"/><Cell N="Height" V="${(Math.abs(y2-y1)||0.1).toFixed(4)}"/>
      <Cell N="LinePattern" V="${dashed ? 2 : 1}"/>
      <Cell N="LineWeight" V="${st.width ? 0.03 : 0.016}"/>
      <Cell N="LineColor" V="${color}"/>
      <Cell N="ObjType" V="2"/><Cell N="EndArrow" V="4"/>
      <Section N="Geometry" IX="0">
        <Cell N="NoFill" V="1"/>
        <Row T="MoveTo" IX="1"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>
        <Row T="LineTo" IX="2"><Cell N="X" V="${(x2-x1).toFixed(4)}"/><Cell N="Y" V="${(y2-y1).toFixed(4)}"/></Row>
      </Section>
      <Text>${esc(l.text || st.label || "")}</Text>
    </Shape>`;
    connects += `
    <Connect FromSheet="${id}" FromCell="BeginX" ToSheet="${map[l.from]}" ToCell="PinX"/>
    <Connect FromSheet="${id}" FromCell="EndX" ToSheet="${map[l.to]}" ToCell="PinX"/>`;
    id++;
  }
  // branding footer
  xmlShapes += `
    <Shape ID="${id}" Type="Shape" Name="Brand">
      <Cell N="PinX" V="${(pageW - 2.4).toFixed(2)}"/><Cell N="PinY" V="0.35"/>
      <Cell N="Width" V="4.4"/><Cell N="Height" V="0.3"/>
      <Cell N="LinePattern" V="0"/><Cell N="FillPattern" V="0"/>
      <Text>${esc(branding.company + " — " + branding.poweredBy)}</Text>
    </Shape>`;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/visio/document.xml" ContentType="application/vnd.ms-visio.drawing.main+xml"/>
  <Override PartName="/visio/pages/pages.xml" ContentType="application/vnd.ms-visio.pages+xml"/>
  <Override PartName="/visio/pages/page1.xml" ContentType="application/vnd.ms-visio.page+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/document" Target="visio/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);
  zip.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>${esc(title)}</dc:title><dc:creator>${esc(branding.company)}</dc:creator>
  <dc:description>${esc(branding.poweredBy)}</dc:description></cp:coreProperties>`);
  zip.file("docProps/app.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>ELV Schematic Studio</Application></Properties>`);
  zip.file("visio/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<VisioDocument xmlns="http://schemas.microsoft.com/office/visio/2012/main"></VisioDocument>`);
  zip.file("visio/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/pages" Target="pages/pages.xml"/>
</Relationships>`);
  zip.file("visio/pages/pages.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Pages xmlns="http://schemas.microsoft.com/office/visio/2012/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <Page ID="0" NameU="Page-1" Name="Page-1">
    <PageSheet><Cell N="PageWidth" V="${pageW.toFixed(2)}"/><Cell N="PageHeight" V="${pageH.toFixed(2)}"/></PageSheet>
    <Rel r:id="rId1"/>
  </Page>
</Pages>`);
  zip.file("visio/pages/_rels/pages.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/page" Target="page1.xml"/>
</Relationships>`);
  zip.file("visio/pages/page1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<PageContents xmlns="http://schemas.microsoft.com/office/visio/2012/main">
  <Shapes>${xmlShapes}
  </Shapes>
  <Connects>${connects}
  </Connects>
</PageContents>`);
  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.ms-visio.drawing" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = title.replace(/\s+/g, "-") + ".vsdx"; a.click();
  URL.revokeObjectURL(a.href);
}

// Topology tab wrapper (kept for backwards compatibility)
export async function exportVsdx(state, branding) {
  const devices = state.cache.devices.filter(d => d.topo);
  if (!devices.length) return alert("Place devices on the Topology canvas first.");
  const shapes = devices.map(d => ({ id: d.id, x: d.topo.x, y: d.topo.y, w: 150, h: 86, text: d.label }));
  const links = state.cache.cables
    .filter(c => c.fromRef && c.toRef)
    .map(c => ({ from: c.fromRef.deviceId, to: c.toRef.deviceId, text: c.code, ctype: c.type }));
  return exportVsdxModel(shapes, links, branding, "ELV-Topology");
}
