import { initBackend, signIn, demoSignIn, signOutUser, state, refreshCache, seedIfEmpty, list } from "./store.js";
import { renderEditor } from "./editor.js";
import { renderLibrary } from "./library.js";
import { renderTopology } from "./topology.js";
import { renderRack } from "./rack.js";
import { renderPorts } from "./ports.js";
import { renderEnclosure } from "./enclosure.js";
import { renderExport } from "./export-tab.js";

const $ = s => document.querySelector(s);
const tools = { library: ["Asset Library", renderLibrary], topology: ["Topology", renderTopology],
  rack: ["Rack Builder", renderRack], ports: ["Port Allocation", renderPorts],
  enclosure: ["Enclosure", renderEnclosure], export: ["Schedules (Excel)", renderExport] };

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
  $("#editorRoot").style.display = "block";
  renderEditor($("#editorRoot"));
  $("#userBadge").textContent =
    `${state.user.email} · ${state.user.role.toUpperCase()}${state.mode === "demo" ? " · DEMO" : ""}`;
  $("#btnLogout").onclick = async () => { await signOutUser(); location.reload(); };
}
// Tools overlay (legacy modules), opened from the editor's Tools menu
window.openToolOverlay = async key => {
  const [title, render] = tools[key];
  await refreshCache();
  $("#toolsTitle").textContent = title;
  $("#toolsOverlay").style.display = "flex";
  document.querySelectorAll("#toolsMain .tabpane").forEach(p =>
    p.classList.toggle("active", p.id === "tab-" + key));
  render(document.getElementById("tab-" + key));
};
document.addEventListener("click", e => {
  if (e.target?.id === "toolsBack") $("#toolsOverlay").style.display = "none";
});
boot();
