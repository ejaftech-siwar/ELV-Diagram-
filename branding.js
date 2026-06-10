export const branding = {
  appName: "Ejaf Technology — ELV Schematic Studio",
  poweredBy: "Powered by Siwar",
  company: "Ejaf Technology",
  colors: { primary: "#0B5394", accent: "#E69138" },
  cableStyles: {
    CAT5E:      { color: "#2e7d32", dash: "" ,     label: "Cat5e" },
    CAT6:       { color: "#1565c0", dash: "" ,     label: "Cat6" },
    CAT6A:      { color: "#6a1b9a", dash: "" ,     label: "Cat6A" },
    CAT7:       { color: "#00838f", dash: "" ,     label: "Cat7" },
    CAT8:       { color: "#37474f", dash: "" ,     label: "Cat8" },
    FIBER_SM:   { color: "#fbc02d", dash: "8 4",   label: "Fiber SM" },
    FIBER_MM:   { color: "#ef6c00", dash: "8 4",   label: "Fiber MM" },
    PATCH_CORD: { color: "#455a64", dash: "2 3",   label: "Patch cord" },
    AC_MAINS:   { color: "#c62828", dash: "",      label: "AC power", width: 3.5 },
    DC_LV:      { color: "#c62828", dash: "5 4",   label: "DC power" }
  },
  systems: ["CCTV","ACCESS_CONTROL","NETWORK","INTRUSION","FIRE_ALARM"],
  systemColors: { CCTV:"#E53935", ACCESS_CONTROL:"#8E24AA", NETWORK:"#1E88E5",
                  INTRUSION:"#FB8C00", FIRE_ALARM:"#D81B60" }
};
// PNG of the logo for PDF/XLSX exports, rendered from the SVG at runtime
export async function logoPngDataUrl() {
  const svg = await (await fetch("ejaf-logo.svg")).text();
  const img = new Image();
  img.src = "data:image/svg+xml;base64," + btoa(svg);
  await img.decode();
  const c = document.createElement("canvas");
  c.width = 440; c.height = 96;
  c.getContext("2d").drawImage(img, 0, 0, 440, 96);
  return c.toDataURL("image/png");
}
