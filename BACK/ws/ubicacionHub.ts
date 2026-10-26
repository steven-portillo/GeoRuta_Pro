import { VerificarTokenAcceso } from "../Helpers/Jwt.ts";
import { ClienteMapaModel } from "../Model/Mapa/clienteMapaModel.ts";
import { ProveedorMapaModel } from "../Model/Mapa/proveedorMapaModel.ts";
import { UbicacionProveedorModel } from "../Model/Mapa/ubicacionProveedorModel.ts";

const ubicacionModel = new UbicacionProveedorModel();

function modoDesdeBD(
  estado: string | undefined,
): "inactivo" | "activo" | "descanso" {
  if (estado === "activo") return "activo";
  if (estado === "descanso") return "descanso";
  return "inactivo";
}

export type RolWs = "SUPERADMIN" | "ADMIN" | "PROVEEDOR" | "CLIENTE";
export type ModoRuta = "inactivo" | "activo" | "descanso";

export interface InfoConexion {
  usuarioId: number;
  rol: RolWs;
  idEmpresa: number | null;
  grupos: Set<string>;
  modoRuta: ModoRuta;
  nombre: string;
  empresa: string | null;
}

const grupos = new Map<string, Set<WebSocket>>();
const conexiones = new Map<WebSocket, InfoConexion>();

function agregarAGrupo(ws: WebSocket, nombre: string) {
  if (!grupos.has(nombre)) {
    grupos.set(nombre, new Set());
  }
  grupos.get(nombre)!.add(ws);
  conexiones.get(ws)?.grupos.add(nombre);
}

function enviarAGrupo(nombre: string, payload: object) {
  const set = grupos.get(nombre);
  if (!set) return;
  const message = JSON.stringify(payload);
  for (const cliente of set) {
    if (cliente.readyState === WebSocket.OPEN) cliente.send(message);
  }
}

function enviarA(ws: WebSocket, payload: object) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

function limpiarConexion(ws: WebSocket) {
  const info = conexiones.get(ws);
  if (!info) return;
  for (const grp of info.grupos) {
    grupos.get(grp)?.delete(ws);
  }
  conexiones.delete(ws);
}

export function manejarWsUbicacion(socket: WebSocket): void {
  socket.addEventListener("open", () => {
    console.log("[WS] conexion abierta");
  });

  socket.addEventListener("message", async (ev) => {
    try {
      const data = JSON.parse(String(ev.data));
      await procesarMensaje(socket, data);
    } catch (error) {
      console.error("Error en hub", error);
      enviarA(socket, { tipo: "Error", mensaje: "Mensaje invalido" });
    }
  });

  socket.addEventListener("close", () => limpiarConexion(socket));
  socket.addEventListener("error", () => limpiarConexion(socket));
}

async function procesarMensaje(
  ws: WebSocket,
  data: Record<string, unknown>,
) {
  const tipo = data.tipo as string;

  if (tipo === "auth") {
    const token = String(data.token ?? "");
    const payload = await VerificarTokenAcceso(token);

    if (
      !payload ||
      typeof payload.sub !== "string" ||
      typeof payload.rol !== "string"
    ) {
      enviarA(ws, { tipo: "Error", mensaje: "Token invalido" });
      ws.close();
      return;
    }

    const usuarioId = Number(payload.sub);
    const rolesPermitidos: string[] = [
      "SUPERADMIN",
      "ADMIN",
      "PROVEEDOR",
      "CLIENTE",
    ];
    if (
      !Number.isSafeInteger(usuarioId) || usuarioId <= 0 ||
      !rolesPermitidos.includes(payload.rol)
    ) {
      enviarA(ws, { tipo: "Error", mensaje: "Token invalido" });
      ws.close();
      return;
    }

    const idEmpresa = typeof payload.id_empresa === "number"
      ? payload.id_empresa
      : null;
    const { nombre, empresa } = await new ProveedorMapaModel().datosProveedor(
      usuarioId,
      idEmpresa,
    );
    conexiones.set(ws, {
      usuarioId,
      rol: payload.rol as RolWs,
      idEmpresa,
      grupos: new Set(),
      modoRuta: "inactivo",
      nombre: nombre ?? "",
      empresa,
    });

    enviarA(ws, {
      tipo: "auth_ok",
      usuarioId,
      rol: payload.rol,
      idEmpresa,
    });
    return;
  }

  const info = conexiones.get(ws);
  if (!info) {
    enviarA(ws, { tipo: "Error", mensaje: "Debes autenticarte primero" });
    return;
  }

  if (tipo === "UnirseComoAdmin") {
    if (info.rol !== "ADMIN" || !info.idEmpresa) {
      enviarA(ws, { tipo: "Error", mensaje: "No autorizado" });
      return;
    }
    agregarAGrupo(ws, `empresa-${info.idEmpresa}-admins`);
    enviarA(ws, {
      tipo: "unido",
      grupo: `empresa-${info.idEmpresa}-admins`,
    });
    return;
  }

  if (tipo === "UnirseComoProveedor") {
    if (info.rol !== "PROVEEDOR") {
      enviarA(ws, { tipo: "Error", mensaje: "No autorizado" });
      return;
    }

    const fila = await ubicacionModel.obtenerPorProveedor(info.usuarioId);
    const modo = modoDesdeBD(fila?.estado);
    info.modoRuta = modo;

    enviarA(ws, { tipo: "unido", rol: "PROVEEDOR" });
    enviarA(ws, {
      tipo: "estado_ruta",
      modo,
      lat: fila?.latitud ?? null,
      lng: fila?.longitud ?? null,
    });
    return;
  }

  if (tipo === "UnirseComoCliente") {
    if (info.rol !== "CLIENTE") {
      enviarA(ws, { tipo: "Error", mensaje: "No autorizado" });
      return;
    }

    const pedidoIds = ((data.pedidoIds as unknown[]) ?? [])
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);

    const validos = await new ClienteMapaModel()
      .filtrarPedidosClienteEnTransito(
        info.usuarioId,
        pedidoIds,
      );
    for (const id_pedido of validos) {
      agregarAGrupo(ws, `pedido-${id_pedido}`);
    }
    enviarA(ws, { tipo: "unido", pedidos: validos });
    return;
  }

  if (tipo === "EmpezarRuta") {
    if (info.rol !== "PROVEEDOR") return;

    info.modoRuta = "activo";
    await ubicacionModel.upsertEstado(info.usuarioId, "activo");
    enviarA(ws, { tipo: "ruta_iniciada" });
    return;
  }

  if (tipo === "Descanso") {
    if (info.rol !== "PROVEEDOR" || info.modoRuta !== "activo") return;

    info.modoRuta = "descanso";
    await ubicacionModel.upsertEstado(info.usuarioId, "descanso");

    const pedidos = await new ProveedorMapaModel()
      .pedidoEnTransitoDeProveedor(info.usuarioId);
    for (const id of pedidos) {
      enviarAGrupo(`pedido-${id}`, {
        tipo: "ProveedorEnDescanso",
        proveedorId: info.usuarioId,
      });
    }
    return;
  }

  if (tipo === "ReanudarRuta") {
    if (info.rol !== "PROVEEDOR" || info.modoRuta !== "descanso") return;

    info.modoRuta = "activo";
    await ubicacionModel.upsertEstado(info.usuarioId, "activo");

    const pedidos = await new ProveedorMapaModel()
      .pedidoEnTransitoDeProveedor(info.usuarioId);
    for (const id of pedidos) {
      enviarAGrupo(`pedido-${id}`, {
        tipo: "ProveedorReanudo",
        proveedorId: info.usuarioId,
      });
    }

    const fila = await ubicacionModel.obtenerPorProveedor(info.usuarioId);
    if (
      fila &&
      Number.isFinite(fila.latitud) &&
      Number.isFinite(fila.longitud) &&
      !(fila.latitud === 0 && fila.longitud === 0)
    ) {
      const payload = {
        tipo: "ActualizarUbicacion",
        proveedorId: info.usuarioId,
        lat: fila.latitud,
        lng: fila.longitud,
        modo: "activo",
      };
      for (const id of pedidos) {
        enviarAGrupo(`pedido-${id}`, payload);
      }
      if (info.idEmpresa) {
        enviarAGrupo(`empresa-${info.idEmpresa}-admins`, payload);
      }
    }
    return;
  }

  if (tipo === "TerminarRuta") {
    if (info.rol !== "PROVEEDOR") return;

    const pendientes = await new ProveedorMapaModel()
      .pedidoEnTransitoDeProveedor(info.usuarioId);
    if (pendientes.length > 0) {
      enviarA(ws, {
        tipo: "Error",
        codigo: "RUTA_CON_PENDIENTES",
        mensaje: "No puedes terminar la ruta: aún hay pedidos en tránsito",
      });
      return;
    }

    info.modoRuta = "inactivo";
    await ubicacionModel.upsertEstado(info.usuarioId, "inactivo");
    enviarA(ws, { tipo: "ruta_terminada" });

    if (info.idEmpresa) {
      enviarAGrupo(`empresa-${info.idEmpresa}-admins`, {
        tipo: "ProveedorTerminoRuta",
        proveedorId: info.usuarioId,
      });
    }
    return;
  }

  if (tipo === "EnviarUbicacion") {
    if (info.rol !== "PROVEEDOR") return;
    if (info.modoRuta === "inactivo") return;

    const lat = Number(data.lat);
    const lng = Number(data.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const estadoBd = info.modoRuta === "descanso" ? "descanso" : "activo";
    await ubicacionModel.upsertUbicacion(
      info.usuarioId,
      lat,
      lng,
      estadoBd,
    );

    const payload = {
      tipo: "ActualizarUbicacion",
      proveedorId: info.usuarioId,
      lat,
      lng,
      modo: info.modoRuta,
    };

    if (info.idEmpresa) {
      enviarAGrupo(`empresa-${info.idEmpresa}-admins`, payload);
    }

    if (info.modoRuta === "activo") {
      const pedidos = await new ProveedorMapaModel()
        .pedidoEnTransitoDeProveedor(info.usuarioId);
      for (const id of pedidos) {
        enviarAGrupo(`pedido-${id}`, payload);
      }
    }
  }
}
