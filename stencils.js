// Shared ELV stencil library + SVG glyphs (used by the Visio-style editor)
export const LIB = [
 { cat: "Racks & Cabinets", items: [
   ["rack42",  "Rack Cabinet 42U", 120, 220], ["rack24", "Rack Cabinet 24U", 120, 150],
   ["rackwall","Wall Cabinet 9U",  110, 100], ["openrack","Open Frame Rack", 110, 200],
   ["organizer","Cable Organizer 1U", 150, 30], ["blank", "Blank Panel 1U", 150, 30],
   ["shelf",   "Rack Shelf", 150, 34] ]},
 { cat: "CCTV", items: [
   ["camdome", "Dome Camera", 90, 70], ["cambullet","Bullet Camera", 110, 60],
   ["camptz",  "PTZ Camera", 95, 85], ["nvr", "NVR / Server", 130, 70],
   ["monitor", "Monitor", 110, 85], ["joystick","Keyboard/Joystick", 120, 55] ]},
 { cat: "Network", items: [
   ["switch",  "Switch", 150, 54], ["poesw", "PoE Switch", 150, 54],
   ["router",  "Router", 130, 64], ["firewall","Firewall", 130, 70],
   ["ap",      "Wireless AP", 90, 80], ["cloud", "Cloud / WAN", 150, 84] ]},
 { cat: "Cabling & Termination", items: [
   ["patch",   "Patch Panel 24P", 150, 50], ["odf", "ODF / Fiber Panel", 150, 50],
   ["patchcord","Patch Cord", 120, 36], ["mediaconv","Media Converter", 110, 50],
   ["splice",  "Splice Closure", 100, 70], ["tray", "Cable Tray", 160, 36],
   ["jbox",    "Junction Box", 100, 80], ["faceplate","Outlet / Faceplate", 70, 70] ]},
 { cat: "Power", items: [
   ["ups",     "UPS", 120, 74], ["pdu", "PDU", 150, 40],
   ["battery", "Battery Bank", 110, 64], ["psu", "Power Supply", 100, 60],
   ["db",      "Distribution Board", 110, 90] ]},
 { cat: "Access Control & Intrusion", items: [
   ["reader",  "Card Reader", 70, 90], ["maglock","Maglock", 100, 44],
   ["acpanel", "Access Controller", 120, 80], ["pir", "PIR Detector", 80, 70],
   ["intpanel","Intrusion Panel", 120, 80], ["siren", "Siren", 80, 80],
   ["intercom","Intercom", 80, 95] ]},
 { cat: "Fire Alarm", items: [
   ["facp",    "Fire Alarm Panel", 120, 90], ["smoke", "Smoke Detector", 80, 70],
   ["heat",    "Heat Detector", 80, 70], ["mcp", "Call Point", 70, 70],
   ["sounder", "Sounder/Beacon", 80, 80] ]},
 { cat: "Basic", items: [
   ["rect","Process",140,70], ["rounded","Rounded",140,70], ["diamond","Decision",120,90],
   ["ellipse","Ellipse",130,80], ["text","Text",140,34] ]}
];
export const FIND = id => { for (const g of LIB) { const f = g.items.find(i => i[0] === id); if (f) return f; } };
/* ============ GLYPHS ============ */
export function glyph(type, w, h, hot) {
  const st = hot ? "#FFB020" : "#0A3DBB", f = "#EAF1FF", s2 = `stroke="${st}" stroke-width="2" fill="${f}"`;
  const rails = n => Array.from({length:n},(_,i)=>`<line x1="10" y1="${16+i*(h-26)/n}" x2="${w-10}" y2="${16+i*(h-26)/n}" stroke="${st}" stroke-width=".8" opacity=".55"/>`).join("");
  const ledRow = (y,n=6)=>Array.from({length:n},(_,i)=>`<rect x="${10+i*(w-20)/n}" y="${y}" width="${(w-20)/n-4}" height="7" fill="${st}" opacity=".7"/>`).join("");
  switch (type) {
    case "rack42": case "rack24": return `<rect width="${w}" height="${h}" rx="5" ${s2}/><rect x="6" y="10" width="${w-12}" height="${h-20}" fill="none" stroke="${st}" stroke-width="1.2"/>${rails(type==="rack42"?14:9)}<circle cx="11" cy="6" r="1.6" fill="${st}"/><circle cx="${w-11}" cy="6" r="1.6" fill="${st}"/><text x="${w/2}" y="${h-3}" text-anchor="middle" font-size="9" fill="${st}" font-weight="700">${type==="rack42"?"42U":"24U"}</text>`;
    case "rackwall": return `<rect width="${w}" height="${h}" rx="5" ${s2}/><rect x="6" y="8" width="${w-12}" height="${h-16}" fill="none" stroke="${st}" stroke-width="1.2"/>${rails(5)}<text x="${w/2}" y="${h-2}" text-anchor="middle" font-size="8.5" fill="${st}" font-weight="700">9U WALL</text>`;
    case "openrack": return `<line x1="12" y1="0" x2="12" y2="${h}" stroke="${st}" stroke-width="4"/><line x1="${w-12}" y1="0" x2="${w-12}" y2="${h}" stroke="${st}" stroke-width="4"/>${rails(12)}<line x1="2" y1="${h}" x2="${w-2}" y2="${h}" stroke="${st}" stroke-width="3"/>`;
    case "organizer": return `<rect width="${w}" height="${h}" rx="4" ${s2}/>${Array.from({length:5},(_,i)=>`<path d="M ${14+i*(w-28)/4} 4 q 6 ${h/2-4} 0 ${h-8}" fill="none" stroke="${st}" stroke-width="1.6"/>`).join("")}`;
    case "blank": return `<rect width="${w}" height="${h}" rx="4" ${s2}/><circle cx="10" cy="${h/2}" r="2.2" fill="${st}"/><circle cx="${w-10}" cy="${h/2}" r="2.2" fill="${st}"/>`;
    case "shelf": return `<rect width="${w}" height="${h*.45}" rx="3" ${s2}/><line x1="6" y1="${h*.45}" x2="2" y2="${h}" stroke="${st}" stroke-width="2"/><line x1="${w-6}" y1="${h*.45}" x2="${w-2}" y2="${h}" stroke="${st}" stroke-width="2"/>`;
    case "camdome": return `<path d="M ${w*.1} ${h*.55} a ${w*.4} ${h*.45} 0 0 1 ${w*.8} 0 Z" ${s2}/><rect x="${w*.05}" y="${h*.5}" width="${w*.9}" height="${h*.14}" rx="3" fill="${st}"/><circle cx="${w/2}" cy="${h*.42}" r="${h*.16}" fill="${st}" opacity=".85"/>`;
    case "cambullet": return `<rect x="${w*.08}" y="${h*.3}" width="${w*.6}" height="${h*.42}" rx="6" ${s2}/><path d="M ${w*.68} ${h*.36} L ${w*.95} ${h*.24} V ${h*.78} L ${w*.68} ${h*.66} Z" ${s2}/><circle cx="${w*.22}" cy="${h*.51}" r="${h*.1}" fill="${st}"/><line x1="${w*.3}" y1="${h*.72}" x2="${w*.3}" y2="${h*.95}" stroke="${st}" stroke-width="2.4"/>`;
    case "camptz": return `<rect x="${w*.3}" y="0" width="${w*.4}" height="${h*.16}" rx="3" fill="${st}"/><line x1="${w/2}" y1="${h*.16}" x2="${w/2}" y2="${h*.3}" stroke="${st}" stroke-width="3"/><circle cx="${w/2}" cy="${h*.6}" r="${h*.32}" ${s2}/><circle cx="${w/2}" cy="${h*.6}" r="${h*.13}" fill="${st}"/>`;
    case "nvr": return `<rect width="${w}" height="${h}" rx="5" ${s2}/><line x1="0" y1="${h/2}" x2="${w}" y2="${h/2}" stroke="${st}"/><circle cx="${w-13}" cy="${h*.25}" r="3" fill="#22C55E"/><circle cx="${w-13}" cy="${h*.75}" r="3" fill="#FFB020"/><rect x="10" y="${h*.18}" width="${w*.35}" height="${h*.14}" fill="${st}" opacity=".5"/><rect x="10" y="${h*.68}" width="${w*.35}" height="${h*.14}" fill="${st}" opacity=".5"/>`;
    case "monitor": return `<rect width="${w}" height="${h*.68}" rx="5" ${s2}/><rect x="6" y="6" width="${w-12}" height="${h*.68-12}" fill="${st}" opacity=".2"/><line x1="${w/2}" y1="${h*.68}" x2="${w/2}" y2="${h*.85}" stroke="${st}" stroke-width="3"/><line x1="${w*.3}" y1="${h*.92}" x2="${w*.7}" y2="${h*.92}" stroke="${st}" stroke-width="3"/>`;
    case "joystick": return `<rect y="${h*.4}" width="${w}" height="${h*.55}" rx="5" ${s2}/><line x1="${w*.75}" y1="${h*.4}" x2="${w*.75}" y2="${h*.12}" stroke="${st}" stroke-width="3"/><circle cx="${w*.75}" cy="${h*.12}" r="${h*.12}" fill="${st}"/>${Array.from({length:8},(_,i)=>`<rect x="${8+(i%4)*(w*.5)/4}" y="${h*(.5+Math.floor(i/4)*.2)}" width="${w*.08}" height="${h*.1}" fill="${st}" opacity=".6"/>`).join("")}`;
    case "switch": case "poesw": return `<rect width="${w}" height="${h}" rx="6" ${s2}/>${ledRow(h-15,8)}<path d="M 10 ${h*.3} h ${w*.26} m 5 0 l -5 -4 m 5 4 l -5 4 M ${w-10} ${h*.3} h -${w*.26} m -5 0 l 5 -4 m -5 4 l 5 4" stroke="${st}" stroke-width="2" fill="none"/>${type==="poesw"?`<text x="${w-8}" y="12" text-anchor="end" font-size="9" font-weight="800" fill="#E07A00">PoE</text>`:""}`;
    case "router": return `<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2-2}" ry="${h/2-2}" ${s2}/><path d="M ${w*.22} ${h*.4} h ${w*.2} m 4 0 l -5 -4 m 5 4 l -5 4 M ${w*.78} ${h*.6} h -${w*.2} m -4 0 l 5 -4 m -5 4 l 5 4 M ${w*.4} ${h*.72} v -${h*.16} m 0 -4 l -4 5 m 4 -5 l 4 5 M ${w*.6} ${h*.28} v ${h*.16} m 0 4 l -4 -5 m 4 5 l 4 -5" stroke="${st}" stroke-width="2" fill="none"/>`;
    case "firewall": return `<rect width="${w}" height="${h}" rx="6" fill="#FDEBD2" stroke="#E07A00" stroke-width="2"/><path d="M 0 ${h/3} H ${w} M 0 ${2*h/3} H ${w} M ${w/4} 0 V ${h/3} M ${w*3/4} 0 V ${h/3} M ${w/2} ${h/3} V ${2*h/3} M ${w/4} ${2*h/3} V ${h} M ${w*3/4} ${2*h/3} V ${h}" stroke="#E07A00" stroke-width="1.6"/>`;
    case "ap": return `<circle cx="${w/2}" cy="${h*.68}" r="${h*.22}" ${s2}/><circle cx="${w/2}" cy="${h*.68}" r="${h*.07}" fill="${st}"/><path d="M ${w*.25} ${h*.42} a ${w*.32} ${h*.32} 0 0 1 ${w*.5} 0 M ${w*.33} ${h*.26} a ${w*.45} ${h*.45} 0 0 1 ${w*.34} 0" fill="none" stroke="${st}" stroke-width="2.4" stroke-linecap="round"/>`;
    case "cloud": return `<path d="M ${w*.25} ${h*.75} a ${w*.14} ${h*.22} 0 1 1 ${w*.05} -${h*.4} a ${w*.16} ${h*.3} 0 0 1 ${w*.3} -${h*.12} a ${w*.16} ${h*.26} 0 0 1 ${w*.28} ${h*.12} a ${w*.13} ${h*.22} 0 1 1 ${w*.02} ${h*.4} Z" ${s2}/>`;
    case "patch": return `<rect width="${w}" height="${h}" rx="5" ${s2}/>${Array.from({length:12},(_,i)=>`<rect x="${8+(i%12)*(w-16)/12}" y="${h/2-6}" width="${(w-16)/12-3}" height="12" fill="none" stroke="${st}" stroke-width="1.3"/>`).join("")}`;
    case "odf": return `<rect width="${w}" height="${h}" rx="5" ${s2}/>${Array.from({length:8},(_,i)=>`<circle cx="${14+i*(w-28)/7}" cy="${h/2}" r="4.5" fill="none" stroke="#E07A00" stroke-width="1.8"/>`).join("")}<text x="${w-6}" y="12" text-anchor="end" font-size="8.5" font-weight="800" fill="#E07A00">FO</text>`;
    case "patchcord": return `<path d="M 8 ${h*.7} C ${w*.3} ${h*.1}, ${w*.7} ${h*.95}, ${w-8} ${h*.3}" fill="none" stroke="${st}" stroke-width="2.6"/><rect x="2" y="${h*.6}" width="10" height="9" rx="2" fill="${st}"/><rect x="${w-12}" y="${h*.2}" width="10" height="9" rx="2" fill="${st}"/>`;
    case "mediaconv": return `<rect width="${w}" height="${h}" rx="5" ${s2}/><rect x="8" y="${h/2-6}" width="14" height="12" fill="none" stroke="${st}" stroke-width="1.5"/><circle cx="${w-16}" cy="${h/2}" r="5" fill="none" stroke="#E07A00" stroke-width="1.8"/><path d="M 28 ${h/2} H ${w-26}" stroke="${st}" stroke-width="1.6" stroke-dasharray="4 3"/>`;
    case "splice": return `<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2-2}" ry="${h/2-2}" ${s2}/><path d="M 6 ${h/2} H ${w-6}" stroke="#E07A00" stroke-width="2" stroke-dasharray="6 4"/><path d="M ${w*.3} ${h*.3} q ${w*.2} ${h*.2} ${w*.4} 0" fill="none" stroke="#E07A00" stroke-width="1.6"/>`;
    case "tray": return `<path d="M 4 6 H ${w-4} M 4 ${h-6} H ${w-4}" stroke="${st}" stroke-width="3"/>${Array.from({length:7},(_,i)=>`<line x1="${8+i*(w-16)/6}" y1="6" x2="${8+i*(w-16)/6}" y2="${h-6}" stroke="${st}" stroke-width="1.4"/>`).join("")}`;
    case "jbox": return `<rect width="${w}" height="${h}" rx="6" ${s2}/><rect x="8" y="8" width="${w-16}" height="${h-16}" fill="none" stroke="${st}" stroke-width="1.2" stroke-dasharray="5 3"/><circle cx="8" cy="8" r="2" fill="${st}"/><circle cx="${w-8}" cy="8" r="2" fill="${st}"/><circle cx="8" cy="${h-8}" r="2" fill="${st}"/><circle cx="${w-8}" cy="${h-8}" r="2" fill="${st}"/>`;
    case "faceplate": return `<rect width="${w}" height="${h}" rx="6" ${s2}/><rect x="${w/2-9}" y="${h/2-8}" width="18" height="16" fill="none" stroke="${st}" stroke-width="1.6"/><rect x="${w/2-4}" y="${h/2-8}" width="8" height="5" fill="${st}"/>`;
    case "ups": return `<rect width="${w}" height="${h}" rx="6" ${s2}/><path d="M ${w*.52} ${h*.14} L ${w*.34} ${h*.55} H ${w*.5} L ${w*.44} ${h*.86} L ${w*.66} ${h*.42} H ${w*.5} Z" fill="#FFB020" stroke="#E07A00"/>`;
    case "pdu": return `<rect width="${w}" height="${h}" rx="5" ${s2}/>${Array.from({length:6},(_,i)=>`<circle cx="${14+i*(w-28)/5}" cy="${h/2}" r="${h*.26}" fill="none" stroke="${st}" stroke-width="1.6"/><circle cx="${14+i*(w-28)/5}" cy="${h/2}" r="1.4" fill="${st}"/>`).join("")}`;
    case "battery": return `<rect y="${h*.14}" width="${w}" height="${h*.72}" rx="5" ${s2}/><rect x="${w*.25}" y="${h*.02}" width="${w*.14}" height="${h*.12}" fill="${st}"/><rect x="${w*.6}" y="${h*.02}" width="${w*.14}" height="${h*.12}" fill="${st}"/><text x="${w*.3}" y="${h*.6}" font-size="${h*.3}" font-weight="800" fill="${st}">+</text><text x="${w*.62}" y="${h*.6}" font-size="${h*.3}" font-weight="800" fill="${st}">−</text>`;
    case "psu": return `<rect width="${w}" height="${h}" rx="5" ${s2}/><path d="M 8 ${h*.35} H ${w*.4}" stroke="${st}" stroke-width="2.4"/><path d="M 8 ${h*.65} H ${w*.4}" stroke="${st}" stroke-width="2.4" stroke-dasharray="5 3"/><text x="${w*.55}" y="${h*.62}" font-size="${h*.3}" font-weight="700" fill="${st}">DC</text>`;
    case "db": return `<rect width="${w}" height="${h}" rx="5" ${s2}/>${Array.from({length:6},(_,i)=>`<rect x="${10+(i%2)*(w/2-12)}" y="${10+Math.floor(i/2)*(h-22)/3}" width="${w/2-16}" height="${(h-26)/3}" fill="none" stroke="${st}" stroke-width="1.3"/>`).join("")}`;
    case "reader": return `<rect width="${w}" height="${h}" rx="8" ${s2}/><circle cx="${w/2}" cy="${h*.32}" r="${w*.18}" fill="none" stroke="${st}" stroke-width="2"/><rect x="${w*.25}" y="${h*.6}" width="${w*.5}" height="${h*.18}" rx="3" fill="${st}" opacity=".7"/><circle cx="${w/2}" cy="${h*.88}" r="2.5" fill="#22C55E"/>`;
    case "maglock": return `<rect width="${w}" height="${h*.5}" rx="4" ${s2}/><rect x="${w*.2}" y="${h*.55}" width="${w*.6}" height="${h*.35}" rx="3" fill="${st}" opacity=".75"/>`;
    case "acpanel": return `<rect width="${w}" height="${h}" rx="6" ${s2}/><rect x="8" y="8" width="${w-16}" height="${h*.34}" fill="${st}" opacity=".2"/><text x="${w/2}" y="${h*.3}" text-anchor="middle" font-size="${h*.18}" font-weight="800" fill="${st}">ACU</text>${Array.from({length:4},(_,i)=>`<circle cx="${16+i*(w-32)/3}" cy="${h*.72}" r="3.4" fill="none" stroke="${st}" stroke-width="1.6"/>`).join("")}`;
    case "pir": return `<path d="M 6 6 H ${w-6} V ${h*.6} L ${w/2} ${h-4} L 6 ${h*.6} Z" ${s2}/><path d="M ${w*.3} ${h*.3} a ${w*.2} ${h*.2} 0 0 1 ${w*.4} 0" fill="none" stroke="${st}" stroke-width="2"/>`;
    case "intpanel": return `<rect width="${w}" height="${h}" rx="6" ${s2}/><text x="${w/2}" y="${h*.36}" text-anchor="middle" font-size="${h*.2}" font-weight="800" fill="${st}">ALARM</text><rect x="${w*.18}" y="${h*.52}" width="${w*.64}" height="${h*.26}" fill="none" stroke="${st}" stroke-width="1.5"/>`;
    case "siren": return `<path d="M ${w*.2} ${h*.85} a ${w*.3} ${h*.55} 0 0 1 ${w*.6} 0 Z" ${s2}/><rect x="${w*.1}" y="${h*.82}" width="${w*.8}" height="${h*.12}" rx="3" fill="${st}"/><path d="M ${w*.2} ${h*.3} l -8 -8 M ${w*.8} ${h*.3} l 8 -8 M ${w/2} ${h*.16} v -10" stroke="#E07A00" stroke-width="2.4" stroke-linecap="round"/>`;
    case "intercom": return `<rect width="${w}" height="${h}" rx="8" ${s2}/><rect x="${w*.2}" y="${h*.12}" width="${w*.6}" height="${h*.32}" rx="3" fill="${st}" opacity=".25"/><circle cx="${w/2}" cy="${h*.66}" r="${w*.13}" fill="none" stroke="${st}" stroke-width="2"/><circle cx="${w/2}" cy="${h*.88}" r="3" fill="${st}"/>`;
    case "facp": return `<rect width="${w}" height="${h}" rx="6" fill="#FDE2E2" stroke="#C62828" stroke-width="2"/><text x="${w/2}" y="${h*.34}" text-anchor="middle" font-size="${h*.2}" font-weight="800" fill="#C62828">FACP</text><rect x="${w*.15}" y="${h*.48}" width="${w*.7}" height="${h*.3}" fill="none" stroke="#C62828" stroke-width="1.5"/><circle cx="${w*.27}" cy="${h*.63}" r="3" fill="#22C55E"/><circle cx="${w*.45}" cy="${h*.63}" r="3" fill="#FFB020"/><circle cx="${w*.63}" cy="${h*.63}" r="3" fill="#C62828"/>`;
    case "smoke": return `<circle cx="${w/2}" cy="${h/2}" r="${Math.min(w,h)/2-3}" fill="#FDE2E2" stroke="#C62828" stroke-width="2"/><circle cx="${w/2}" cy="${h/2}" r="${Math.min(w,h)/4}" fill="none" stroke="#C62828" stroke-width="1.6"/><text x="${w/2}" y="${h/2+3.5}" text-anchor="middle" font-size="9" font-weight="800" fill="#C62828">S</text>`;
    case "heat": return `<circle cx="${w/2}" cy="${h/2}" r="${Math.min(w,h)/2-3}" fill="#FDE2E2" stroke="#C62828" stroke-width="2"/><text x="${w/2}" y="${h/2+3.5}" text-anchor="middle" font-size="9" font-weight="800" fill="#C62828">H</text>`;
    case "mcp": return `<rect width="${w}" height="${h}" rx="5" fill="#C62828"/><rect x="${w*.22}" y="${h*.22}" width="${w*.56}" height="${h*.56}" fill="#fff" opacity=".9"/><text x="${w/2}" y="${h*.6}" text-anchor="middle" font-size="${h*.22}" font-weight="800" fill="#C62828">MCP</text>`;
    case "sounder": return `<circle cx="${w/2}" cy="${h/2}" r="${Math.min(w,h)/2-4}" fill="#FDE2E2" stroke="#C62828" stroke-width="2"/><path d="M ${w*.3} ${h*.3} l -7 -7 M ${w*.7} ${h*.3} l 7 -7 M ${w*.3} ${h*.7} l -7 7 M ${w*.7} ${h*.7} l 7 7" stroke="#C62828" stroke-width="2.2" stroke-linecap="round"/>`;
    case "rounded": return `<rect width="${w}" height="${h}" rx="${Math.min(16,h/3)}" ${s2}/>`;
    case "diamond": return `<path d="M ${w/2} 0 L ${w} ${h/2} L ${w/2} ${h} L 0 ${h/2} Z" ${s2}/>`;
    case "ellipse": return `<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2-1}" ry="${h/2-1}" ${s2}/>`;
    case "text": return `<rect width="${w}" height="${h}" fill="none" stroke="${hot?st:"#B9C8E4"}" stroke-dasharray="4 3"/>`;
    default: return `<rect width="${w}" height="${h}" rx="4" ${s2}/>`;
  }
}
