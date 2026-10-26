type MapaLike = { flyTo: (c: [number, number], z?: number) => unknown };
export type FaseRuta = "idle" | "activo" | "descanso";

const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) =>
  r.querySelector<T>(s);
const norm = (t = "") => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/* Fase visual de los botones de ruta. */
export function setFaseRutaUI(fase: FaseRuta) {
  const c = $("#accionesRuta");
  if (!c) return;
  c.classList.remove("ruta-idle", "ruta-activo", "ruta-descanso");
  c.classList.add("ruta-" + fase);
  const off = (id: string, v: boolean) => {
    const b = $<HTMLButtonElement>("#" + id);
    if (b) b.disabled = v;
  };
  off("btnIniciarRuta", fase !== "idle");
  off("btnDescanso", fase !== "activo");
  off("btnReanudar", fase !== "descanso");
  off("btnTerminarRuta", fase === "idle");
}

/* Muestra u oculta "sin resultados" */
export function refrescarLista() {
  const items = Array.from(document.querySelectorAll<HTMLElement>("#mapaLista .mapa-item"));
  const v = $("#mapaVacio");
  if (v) v.hidden = items.some((li) => !li.hidden);
}

/* Resalta una card */
export function marcarSeleccion(id: string | number) {
  let sel: HTMLElement | null = null;
  document.querySelectorAll<HTMLElement>("#mapaLista .mapa-item").forEach((li) => {
    const on = li.dataset.id === String(id);
    li.classList.toggle("is-selected", on);
    if (on) sel = li;
  });
  const elegido = sel as HTMLElement | null;
  elegido?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  if (elegido) llenarPanelAdmin(elegido);
}

function llenarPanelAdmin(li: HTMLElement) {
  if (!$("#panelRepartidor")) return;
  const est = (li.dataset.estado ?? "").replace("_", " ");
  const clase = est === "Activo" ? "ok" : est === "En descanso" ? "warn" : "off";
  $("#panelNombre")!.textContent = li.dataset.nombre ?? "";
  const b = $("#panelEstado")!;
  b.textContent = est || "Inactivo";
  b.className = "mapa-badge mapa-badge--" + clase;
  $("#panelTransito")!.textContent = li.dataset.transito ?? "0";
  $("#panelEntregados")!.textContent = li.dataset.entregados ?? "0";
  $("#panelVacio")!.hidden = true;
  $("#panelDatos")!.hidden = false;
}

let opener: Element | null = null;
export function abrirModal(idPedido?: string) {
  const m = $("#modalPedido");
  if (!m) return;
  opener = document.activeElement;
  const n = $("#modalNumero");
  if (n && idPedido) n.textContent = "#" + idPedido;
  m.hidden = false;
  $<HTMLElement>(".mapa-modal-x", m)?.focus();
}
export function cerrarModal() {
  const m = $("#modalPedido");
  if (!m || m.hidden) return;
  m.hidden = true;
  (opener as HTMLElement | null)?.focus();
}

/* Panel lateral en móvil. */
export function togglePanel(abrir?: boolean) {
  const p = $("#panelLateral"), b = $("#btnPanel");
  if (!p || !b) return;
  const open = abrir ?? !p.classList.contains("is-open");
  p.classList.toggle("is-open", open);
  b.setAttribute("aria-expanded", String(open));
}

/* Llamaad para iniciar elmaap */
export function initMapaUi(map?: MapaLike) {
  document.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const card = t.closest<HTMLElement>("#mapaLista .mapa-card");
    if (card) {
      const li = card.closest<HTMLElement>(".mapa-item")!;
      marcarSeleccion(li.dataset.id ?? "");
      llenarPanelAdmin(li);
      const lat = parseFloat(li.dataset.lat ?? ""), lng = parseFloat(li.dataset.lng ?? "");
      if (map && Number.isFinite(lat) && Number.isFinite(lng)) map.flyTo([lat, lng], 17);
      if (matchMedia("(max-width:900px)").matches) togglePanel(false);
      return;
    }
    const ver = t.closest<HTMLElement>(".mapa-btn-pedido");
    if (ver) abrirModal(ver.dataset.pedido);
    if (t.closest("[data-cerrar]") || t.id === "modalPedido") cerrarModal();
    if (t.closest("[data-cerrar-panel]")) togglePanel(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { cerrarModal(); togglePanel(false); }
  });

  $<HTMLInputElement>("#mapaBusqueda")?.addEventListener("input", (e) => {
    const q = norm((e.target as HTMLInputElement).value.trim());
    document.querySelectorAll<HTMLElement>("#mapaLista .mapa-item").forEach((li) => {
      li.hidden = !norm(li.dataset.search).includes(q);
    });
    refrescarLista();
  });

  $("#btnPanel")?.addEventListener("click", () => togglePanel());
  refrescarLista();
}