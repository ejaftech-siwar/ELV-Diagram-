// Native MS Visio VSDX writer — pure JSZip OOXML, no license, fully editable in Visio
const IN = 96; // px per inch

export async function exportVsdx(state, branding) {
  const devices = state.cache.devices.filter(d => d.topo);
  if (!devices.length) return alert("Place devices on the Topology canvas first.");
  const zip = new JSZip();
  const pageW = 16.5, pageH = 11.7; // A3 inches

  let shapeId = 1;
  const idMap = {};
  let shapesXml = "";
  for (const d of devices) {
    const w = 1.6, h = 0.9;
    const x = d.topo.x / IN + w / 2;
    const y = pageH - (d.topo.y / IN + h / 2);     // Visio Y axis is bottom-up
    idMap[d.id] = shapeId;
    shapesXml += `
      <Shape ID="${shapeId}" Type="Shape" Name="Dev${shapeId}" NameU="Dev${shapeId}">
        <Cell N="PinX" V="${x}"/><Cell N="PinY" V="${y}"/>
        <Cell N="Width" V="${w}"/><Cell N="Height" V="${h}"/>
        <Cell N="LocPinX" V="${w/2}"/><Cell N="LocPinY" V="${h/2}"/>
        <Cell N="LinePattern" V="1"/><Cell N="LineWeight" V="0.014"/>
        <Cell N="FillForegnd" V="#FFFFFF"/>
        <Section N="Geometry" IX="0">
          <Cell N="NoFill" V="0"/><Cell N="NoLine" V="0"/>
          <Row T="RelMoveTo" IX="1"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>
          <Row T="RelLineTo" IX="2"><Cell N="X" V="1"/><Cell N="Y" V="0"/></Row>
          <Row T="RelLineTo" IX="3"><Cell N="X" V="1"/><Cell N="Y" V="1"/></Row>
          <Row T="RelLineTo" IX="4"><Cell N="X" V="0"/><Cell N="Y" V="1"/></Row>
          <Row T="RelLineTo" IX="5"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>
        </Section>
        <Text>${esc(d.label)}</Text>
      </Shape>`;
    shapeId++;
  }
  let connectsXml = "";
  for (const c of state.cache.cables) {
    const a = idMap[c.fromRef?.deviceId], b = idMap[c.toRef?.deviceId];
    if (!a || !b) continue;
    const da = devices.find(d => idMap[d.id] === a), db = devices.find(d => idMap[d.id] === b);
    const x1 = da.topo.x / IN + 0.8, y1 = pageH - (da.topo.y / IN + 0.45);
    const x2 = db.topo.x / IN + 0.8, y2 = pageH - (db.topo.y / IN + 0.45);
    const isFiber = String(c.type).startsWith("FIBER");
    const isPower = c.category === "power";
    shapesXml += `
      <Shape ID="${shapeId}" Type="Shape" Name="Cable${shapeId}">
        <Cell N="BeginX" V="${x1}"/><Cell N="BeginY" V="${y1}"/>
        <Cell N="EndX" V="${x2}"/><Cell N="EndY" V="${y2}"/>
        <Cell N="PinX" V="${(x1+x2)/2}"/><Cell N="PinY" V="${(y1+y2)/2}"/>
        <Cell N="Width" V="${Math.abs(x2-x1) || 0.1}"/><Cell N="Height" V="${Math.abs(y2-y1) || 0.1}"/>
        <Cell N="LinePattern" V="${isFiber ? 2 : 1}"/>
        <Cell N="LineWeight" V="${isPower ? 0.03 : 0.014}"/>
        <Cell N="LineColor" V="${isPower ? "#C62828" : "#1565C0"}"/>
        <Cell N="ObjType" V="2"/>
        <Section N="Geometry" IX="0">
          <Cell N="NoFill" V="1"/>
          <Row T="MoveTo" IX="1"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>
          <Row T="LineTo" IX="2"><Cell N="X" V="${x2-x1}"/><Cell N="Y" V="${y2-y1}"/></Row>
        </Section>
        <Text>${esc(c.code || "")}</Text>
      </Shape>`;
    connectsXml += `
      <Connect FromSheet="${shapeId}" FromCell="BeginX" ToSheet="${a}" ToCell="PinX"/>
      <Connect FromSheet="${shapeId}" FromCell="EndX" ToSheet="${b}" ToCell="PinX"/>`;
    shapeId++;
  }
  // Branding footer shape
  shapesXml += `
      <Shape ID="${shapeId}" Type="Shape" Name="Brand">
        <Cell N="PinX" V="${pageW - 2.2}"/><Cell N="PinY" V="0.35"/>
        <Cell N="Width" V="4"/><Cell N="Height" V="0.3"/>
        <Cell N="LinePattern" V="0"/><Cell N="FillPattern" V="0"/>
        <Text>${esc(branding.company + " — " + branding.poweredBy)}</Text>
      </Shape>`;

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
  <dc:title>ELV Topology</dc:title><dc:creator>${esc(branding.company)}</dc:creator>
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
    <PageSheet><Cell N="PageWidth" V="${pageW}"/><Cell N="PageHeight" V="${pageH}"/></PageSheet>
    <Rel r:id="rId1"/>
  </Page>
</Pages>`);
  zip.file("visio/pages/_rels/pages.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/page" Target="page1.xml"/>
</Relationships>`);
  zip.file("visio/pages/page1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<PageContents xmlns="http://schemas.microsoft.com/office/visio/2012/main">
  <Shapes>${shapesXml}
  </Shapes>
  <Connects>${connectsXml}
  </Connects>
</PageContents>`);

  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.ms-visio.drawing" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "ELV-Topology.vsdx"; a.click();
  URL.revokeObjectURL(a.href);
}
const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
