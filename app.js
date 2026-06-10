import { initBackend, signIn, demoSignIn, signOutUser, state, refreshCache, seedIfEmpty, save, list } from "./store.js";
import { renderLibrary } from "./library.js";
import { renderTopology } from "./topology.js";
import { renderRack } from "./rack.js";
import { renderPorts } from "./ports.js";
import { renderEnclosure } from "./enclosure.js";
import { renderExport } from "./export-tab.js";

const $ = s => document.querySelector(s);
const renderers = { library: renderLibrary, topology: renderTopology, rack: renderRack,
                    ports: renderPorts, enclosure: renderEnclosure, export: renderExport };
let activeTab = "library";

async function boot() {
  const mode = await initBackend();
  if (mode === "demo") $("#btnDemo").style.display = "block";
  $("#btnLogin").onclick = doLogin;
  $("#btnDemo").onclick = async () => { demoSignIn(); await enter(); };
  $("#loginPass").addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
}
async function doLogin() {
  $("#loginError").textContent = "";
  try { await signIn($("#loginEmail").value.trim(), $("#loginPass").value); await enter(); }
  catch (e) { $("#loginError").textContent = e.message || "Sign-in failed"; }
}

async function enter() {
  await seedIfEmpty();
  const projects = await list("projects");
  state.projectId = state.projectId || (projects[0] && projects[0].id);
  await refreshCache();
  $("#loginScreen").style.display = "none";
  $("#appShell").style.display = "flex";
  $("#userBadge").textContent = `${state.user.email} · ${state.user.role.toUpperCase()}${state.mode==="demo" ? " · DEMO" : ""}`;
  $("#btnLogout").onclick = async () => { await signOutUser(); location.reload(); };
  fillProjects();
  $("#btnNewProject").onclick = async () => {
    if (state.user.role !== "owner") return alert("Only Owner can create projects.");
    const name = prompt("Project name:"); if (!name) return;
    const p = await save("projects", { name, client: "", systems: [], status: "draft" });
    state.projectId = p.id; await refreshCache(); fillProjects(); show(activeTab);
  };
  document.querySelectorAll(".tab").forEach(b => b.onclick = () => show(b.dataset.tab));
  show("library");
}
function fillProjects() {
  const sel = $("#projectSelect");
  sel.innerHTML = state.cache.projects.map(p =>
    `<option value="${p.id}" ${p.id===state.projectId?"selected":""}>${p.name}</option>`).join("");
  sel.onchange = async () => { state.projectId = sel.value; await refreshCache(); show(activeTab); };
}
export async function show(tab) {
  activeTab = tab;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tabpane").forEach(p => p.classList.toggle("active", p.id === "tab-" + tab));
  await refreshCache();
  renderers[tab](document.getElementById("tab-" + tab));
}
boot();
