type Handlers = {
  onMensaje: (data: Record<string, unknown>) => void;
  onEstado?: (estado: "conectando" | "conectado" | "reconectando" | "cerrado") => void;
};

export class WsUbicacionCliente {
  private ws: WebSocket | null = null;
  private intentos = 0;
  private readonly maxIntentos = 12;
  private readonly delays = [0, 1000, 2000, 5000, 10000, 20000, 30000];
  private activo = true;
  private debeReunir: (() => void) | null = null;

  constructor(
    private url: string,
    private token: string,
    private handlers: Handlers,
  ) {}

  /** Qué hacer después de cada auth_ok (unirse admin/cliente/proveedor) */
  setDespuesDeAuth(fn: () => void) {
    this.debeReunir = fn;
  }

  conectar() {
    if (!this.activo) return;
    this.handlers.onEstado?.(this.intentos === 0 ? "conectando" : "reconectando");

    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ tipo: "auth", token: this.token }));
    });

    ws.addEventListener("message", (ev) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(String(ev.data));
      } catch {
        return;
      }

      if (data.tipo === "auth_ok") {
        this.intentos = 0;
        this.handlers.onEstado?.("conectado");
        this.debeReunir?.();
      }

      this.handlers.onMensaje(data);
    });

    ws.addEventListener("close", (ev) => {
      this.ws = null;
      // 1000 = cierre normal intencional
      if (!this.activo || ev.code === 1000) {
        this.handlers.onEstado?.("cerrado");
        return;
      }
      this.programarReconexion();
    });

    ws.addEventListener("error", () => {
      // suele venir close después
    });
  }

  private programarReconexion() {
    if (!this.activo) return;
    if (this.intentos >= this.maxIntentos) {
      console.error("[WS] Se agotaron los reintentos");
      this.handlers.onEstado?.("cerrado");
      return;
    }
    const delay =
      this.delays[Math.min(this.intentos, this.delays.length - 1)];
    this.intentos++;
    this.handlers.onEstado?.("reconectando");
    console.log(`[WS] Reintento ${this.intentos} en ${delay}ms`);
    setTimeout(() => this.conectar(), delay);
  }

  enviar(payload: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  /** Cierre a propósito (logout, salir del mapa) */
  cerrar() {
    this.activo = false;
    this.ws?.close(1000, "Cierre intencional");
    this.ws = null;
  }
}