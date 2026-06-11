// Data layer: Firestore when configured, otherwise free localStorage demo mode.
import { firebaseConfig, isConfigured } from "./firebase-config.js";

export const state = {
  mode: "demo",            // "demo" | "firebase"
  user: null,              // { uid, email, role }
  projectId: null,
  cache: { assets: [], devices: [], cables: [], connections: [],
           racks: [], enclosures: [], reservations: [], projects: [], diagrams: [], stencils: [] }
};

let fb = null; // firebase handles

export async function initBackend() {
  if (!isConfigured()) { state.mode = "demo"; return "demo"; }
  const appM  = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
  const authM = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
  const fsM   = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const app = appM.initializeApp(firebaseConfig);
  fb = { auth: authM.getAuth(app), db: fsM.getFirestore(app), authM, fsM };
  state.mode = "firebase";
  return "firebase";
}

/* ---------------- AUTH ---------------- */
export async function signIn(email, pass) {
  if (state.mode === "demo") return demoSignIn();
  const cred = await fb.authM.signInWithEmailAndPassword(fb.auth, email, pass);
  const tok = await cred.user.getIdTokenResult();
  let role = tok.claims.role;
  if (!role) { // fallback: role mirror in users collection
    const snap = await fb.fsM.getDoc(fb.fsM.doc(fb.db, "users", cred.user.uid));
    role = snap.exists() ? snap.data().role : "support";
  }
  state.user = { uid: cred.user.uid, email, role };
  return state.user;
}
export function demoSignIn() {
  state.user = { uid: "demo", email: "demo@local", role: "owner" };
  return state.user;
}
export async function signOutUser() {
  if (state.mode === "firebase") await fb.authM.signOut(fb.auth);
  state.user = null;
}

/* ---------------- GENERIC CRUD ---------------- */
const LS_KEY = "elv-studio-demo";
function lsAll() { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
function lsSave(d) { localStorage.setItem(LS_KEY, JSON.stringify(d)); }
const uid = () => Math.random().toString(36).slice(2, 10);

function colPath(name) {
  return name === "assets" || name === "projects"
    ? name === "assets" ? "assetLibrary" : "projects"
    : `projects/${state.projectId}/${name}`;
}

export async function list(name) {
  if (state.mode === "demo") {
    const d = lsAll();
    const key = name === "projects" || name === "assets" ? name : `${state.projectId}:${name}`;
    return structuredClone(d[key] || []);
  }
  const { collection, getDocs } = fb.fsM;
  const snap = await getDocs(collection(fb.db, colPath(name)));
  return snap.docs.map(x => ({ id: x.id, ...x.data() }));
}
export async function save(name, obj) {
  if (state.mode === "demo") {
    const d = lsAll();
    const key = name === "projects" || name === "assets" ? name : `${state.projectId}:${name}`;
    d[key] = d[key] || [];
    if (obj.id) { const i = d[key].findIndex(x => x.id === obj.id); if (i >= 0) d[key][i] = obj; else d[key].push(obj); }
    else { obj.id = uid(); d[key].push(obj); }
    lsSave(d); return obj;
  }
  const { collection, doc, addDoc, setDoc } = fb.fsM;
  obj.updatedAt = Date.now(); obj.createdBy = obj.createdBy || state.user.uid;
  if (obj.id) { const { id, ...rest } = obj; await setDoc(doc(fb.db, colPath(name), id), rest); return obj; }
  const ref = await addDoc(collection(fb.db, colPath(name)), obj);
  obj.id = ref.id; return obj;
}
export async function remove(name, id) {
  if (state.mode === "demo") {
    const d = lsAll();
    const key = name === "projects" || name === "assets" ? name : `${state.projectId}:${name}`;
    d[key] = (d[key] || []).filter(x => x.id !== id); lsSave(d); return;
  }
  await fb.fsM.deleteDoc(fb.fsM.doc(fb.db, colPath(name), id));
}

export async function refreshCache() {
  state.cache.projects = await list("projects");
  state.cache.assets   = await list("assets");
  if (!state.projectId) return;
  for (const n of ["devices","cables","connections","racks","enclosures","reservations","diagrams","stencils"])
    state.cache[n] = await list(n);
}

/* ---------------- SEED DATA (first run) ---------------- */
export async function seedIfEmpty() {
  if ((await list("projects")).length) return;
  const p = await save("projects", { name: "Demo Project", client: "Ejaf Technology",
    systems: ["CCTV","NETWORK","ACCESS_CONTROL"], status: "draft" });
  state.projectId = p.id;
  const seed = [
    { category:"camera", manufacturer:"Hikvision", model:"DS-2CD2143", system:"CCTV", uHeight:0,
      portTemplate:[{group:"data",type:"RJ45",count:1}], power:{input:"PoE",watts:8}, dimensionsMm:{w:120,h:120,d:90} },
    { category:"switch", manufacturer:"Cisco", model:"CBS350-24P", system:"NETWORK", uHeight:1,
      portTemplate:[{group:"data",type:"RJ45",count:24},{group:"uplink",type:"SFP+",count:4}],
      power:{input:"AC230V",watts:195}, dimensionsMm:{w:440,h:44,d:300} },
    { category:"patchPanel", manufacturer:"Panduit", model:"24-Port Cat6A", system:"NETWORK", uHeight:1,
      portTemplate:[{group:"data",type:"RJ45",count:24}], power:{input:"None",watts:0}, dimensionsMm:{w:440,h:44,d:100} },
    { category:"odf", manufacturer:"Generic", model:"ODF 24F LC", system:"NETWORK", uHeight:1,
      portTemplate:[{group:"fiber",type:"LC",count:24}], power:{input:"None",watts:0}, dimensionsMm:{w:440,h:44,d:240} },
    { category:"ups", manufacturer:"APC", model:"SMT3000RMI2U", system:"NETWORK", uHeight:2,
      portTemplate:[{group:"power-out",type:"IEC C13",count:8}], power:{input:"AC230V",watts:2700}, dimensionsMm:{w:440,h:88,d:660} },
    { category:"server", manufacturer:"Dell", model:"R650 NVR", system:"CCTV", uHeight:1,
      portTemplate:[{group:"data",type:"RJ45",count:4}], power:{input:"AC230V",watts:450}, dimensionsMm:{w:440,h:44,d:700} },
    { category:"firewall", manufacturer:"Fortinet", model:"FG-100F", system:"NETWORK", uHeight:1,
      portTemplate:[{group:"data",type:"RJ45",count:16}], power:{input:"AC230V",watts:60}, dimensionsMm:{w:440,h:44,d:260} },
    { category:"mediaConverter", manufacturer:"TP-Link", model:"MC220L", system:"NETWORK", uHeight:0,
      portTemplate:[{group:"data",type:"RJ45",count:1},{group:"fiber",type:"SFP",count:1}],
      power:{input:"DC12V",watts:5}, dimensionsMm:{w:94,h:28,d:73} },
    { category:"powerSupply", manufacturer:"MeanWell", model:"DR-60-12", system:"NETWORK", uHeight:0,
      portTemplate:[], power:{input:"AC230V",watts:60}, dimensionsMm:{w:40,h:90,d:100} },
    { category:"accessController", manufacturer:"ZKTeco", model:"C3-400", system:"ACCESS_CONTROL", uHeight:0,
      portTemplate:[{group:"data",type:"RJ45",count:1}], power:{input:"DC12V",watts:12}, dimensionsMm:{w:150,h:110,d:35} }
  ];
  for (const a of seed) await save("assets", a);
}
