carpeta ws/ubicacionHub.ts
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

export type RolWs = "SUEPERADMIN" | "ADMIN" | "PROVEEDOR" | "CLIENTE";
export type ModoRuta = "inactivo" | "activo" | "descanso";

export interface infoConexion {
usuarioId: number;
rol: RolWs;
idEmpresa: number | null;
grupos: Set<string>;
modoRuta: ModoRuta;
nombre: string;
empresa: string | null;
}

const grupos = new Map<string, Set<WebSocket>>();
const conexiones = new Map<WebSocket, infoConexion>();

//
//HELPERS PARA LOS GRUPOS
//

//esta es la funcion para agregar
function agregarAGrupo(ws: WebSocket, nombre: string) {
if (!grupos.has(nombre)) {
grupos.set(nombre, new Set());
}
grupos.get(nombre)!.add(ws);
conexiones.get(ws)?.grupos.add(nombre);
}
//funcion para mandar mensajitos
function enviarAGrupo(nombre: string, payload: object) {
const set = grupos.get(nombre);
if (!set) return;
const message = JSON.stringify(payload);
for (const cliente of set) {
if (cliente.readyState === WebSocket.OPEN) cliente.send(message);
}
}
//enviar mensajes por consola basicamente
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

//
//AQUI SE ACTIVA EL PROTOCOLO WEBSOCKET PATOS
//

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

async function procesarMensaje(ws: WebSocket, data: Record<string, unknown>) {
const tipo = data.tipo as string;

if (tipo === "auth") {
const token = String(data.token ?? "");
const payload = await VerificarTokenAcceso(token);

    if (!payload) {
      enviarA(ws, { tipo: "Error", mensaje: "Token invalido" });
      ws.close();
      return;
    }
    const {nombre, empresa} = await new ProveedorMapaModel().datosProveedor(payload.id as number, payload.idEmpresa as number);
    //aqui es donde metemos toda la info necesaria para los sockets
    conexiones.set(ws, {
      usuarioId: payload.id as number,
      rol: payload.rol as RolWs,
      idEmpresa: typeof payload.idEmpresa === "number"
        ? payload.idEmpresa
        : null,
      grupos: new Set(),
      modoRuta: "inactivo",
      //esta info de aqui la agregue despues, es para la info en los pins de lso repartidores
      nombre: nombre as string,
      empresa: empresa as string,
    });

    enviarA(ws, {
      tipo: "auth_ok",
      usuarioId: payload.id,
      rol: payload.rol,
      idEmpresa: payload.idEmpresa ?? null,
    });

    return;

}
const info = conexiones.get(ws);
if (!info) {
enviarA(ws, { tipo: "Error", mensaje: "Debes autenticarte primero" }); //by the way esto nunca deberia pasar teniendo en cuenta el middleware de astro que obliga a tener token si o si para cualquier vista
return;
}
//UNIRSE AL GRUPO COMO ADMIN

if (tipo === "UnirseComoAdmin") {
if (info.rol !== "ADMIN" || !info.idEmpresa) {
enviarA(ws, { tipo: "Error", mensaje: "No autorizado" });
return;
}
agregarAGrupo(ws, `empresa-${info.idEmpresa}-admins`);
enviarA(ws, { tipo: "unido", grupo: `empresa-${info.idEmpresa}-admins` });
return;
}

//UNIRSE COMO REPARTIDOR

if (tipo === "UnirseComoProveedor") {
if (info.rol !== "PROVEEDOR") {
enviarA(ws, { tipo: "Error", mensaje: "No autorizado" });
return;
}

    const fila = await ubicacionModel.obtenerPorProveedor(info.usuarioId);
    const modo = modoDesdeBD(fila?.estado);
    info.modoRuta = modo;
    console.log(modo);

    enviarA(ws, { tipo: "unido", rol: "PROVEEDOR" });

    // El front usa esto para no volver a pulsar "Iniciar ruta" como el proyecto en c# pero menos mierda
    enviarA(ws, {
      tipo: "estado_ruta",
      modo, // "activo" | "descanso" | "inactivo"
      lat: fila?.latitud ?? null,
      lng: fila?.longitud ?? null,
    });
    console.log("[WS] enviado estado_ruta", { modo });
    return;

}

//UNIRSE COMO CLIENTE

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

//ESTADOS DE LA UBICACION DEL REPARTIDOR
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

    const pedidos = await new ProveedorMapaModel().pedidoEnTransitoDeProveedor(
      info.usuarioId,
    );
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

    const pedidos = await new ProveedorMapaModel().pedidoEnTransitoDeProveedor(
      info.usuarioId,
    );

    for (const id of pedidos) {
      enviarAGrupo(`pedido-${id}`, {
        tipo: "ProveedorReanudo",
        proveedorId: info.usuarioId,
      });
    }

    // ultima posición conocida, esto se toma desdde la BD como en el proj anterior
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
      .pedidoEnTransitoDeProveedor(
        info.usuarioId,
      );

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

//AHORA SI LO BUENO, ENVIAR LA UBI DEL REPARTIDOR A LOS GRUPOS

if (tipo === "EnviarUbicacion") {
if (info.rol !== "PROVEEDOR") return;
if (info.modoRuta === "inactivo") return;

    const lat = Number(data.lat);
    const lng = Number(data.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    // estado actual del hub se manda a la BD
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

    // Clientes solo si está en ruta activa
    if (info.modoRuta === "activo") {
      const pedidos = await new ProveedorMapaModel()
        .pedidoEnTransitoDeProveedor(
          info.usuarioId,
        );
      for (const id of pedidos) {
        enviarAGrupo(`pedido-${id}`, payload);
      }
    }
    return;

}
}

carpeta Utils/tipos.ts
export type Sesion = {
id: number;
rol:string;
idEmpresa?: number;
}

carpeta Router/Mapa/adminMapaRoter.ts
import { Router } from "../../Dependencies/dependencias.ts";
import { listarRepartidoresMapaAdmin } from "../../Controller/Mapa/adminMapaController.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloAdmin } from "../../Middlewares/roles.ts"; // o el nombre que uses

const AdminMapaRouter = new Router();

AdminMapaRouter.get(
"/admin/mapa/repartidores",
authMiddleware,
soloAdmin,
listarRepartidoresMapaAdmin,
);

export { AdminMapaRouter };

carpea Router/Mapa/clienteMapaRoter.ts
import { Router } from "../../Dependencies/dependencias.ts";
import {
pedidosEnTransitoCliente,
listarRepartidoresMapaCliente,
pedidoDetalleMapaCliente,
} from "../../Controller/Mapa/clienteMapaController.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloCliente } from "../../Middlewares/roles.ts";

const ClienteMapaRouter = new Router();

ClienteMapaRouter.get(
"/cliente/mapa/pedidos-en-transito",
authMiddleware,
soloCliente,
pedidosEnTransitoCliente,
);

ClienteMapaRouter.get(
"/cliente/mapa/repartidores",
authMiddleware,
soloCliente,
listarRepartidoresMapaCliente,
);

ClienteMapaRouter.get(
"/cliente/mapa/pedido-detalle/:id",
authMiddleware,
soloCliente,
pedidoDetalleMapaCliente,
);

export { ClienteMapaRouter };

carpea Router/Mapa/provedorMapaRoter.ts
import { Router } from "../../Dependencies/dependencias.ts";
import { destinosEnRutaProveedor } from "../../Controller/Mapa/proveedorMapaController.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloProveedor } from "../../Middlewares/roles.ts";

const ProveedorMapaRouter = new Router();

// Una sola ruta (antes tenías /destinos y /destinos-en-ruta duplicadas)
ProveedorMapaRouter.get(
"/proveedor/mapa/destinos-en-ruta",
authMiddleware,
soloProveedor,
destinosEnRutaProveedor,
);

export { ProveedorMapaRouter };

carpeta Model/Mapa/adminMapaModel.ts
import { conexion } from "../conexion.ts";

export type EstadoUbicacionMapa = "activo" | "descanso" | "inactivo";

export interface RepartidorMapaAdmin {
id_proveedor: number;
nombre: string;
empresa: string;
foto_url: string | null;
estado: EstadoUbicacionMapa;
lat: number | null;
lng: number | null;
pedidos_en_transito: number;
pedidos_entregados_hoy: number;
}

export class AdminMapaModel {
public async listarRepartidoresEmpresa(
idEmpresa: number,
q?: string,
): Promise<RepartidorMapaAdmin[]> {
const termino = (q ?? "").trim();
const params: unknown[] = [idEmpresa];

    let filtroNombre = "";
    if (termino) {
      filtroNombre =
        ` AND LOWER(CONCAT(u.nombre, ' ', u.apellido)) LIKE ? `;
      params.push(`%${termino.toLowerCase()}%`);
    }

    const rows = await conexion.query(
      `
      SELECT
        u.id_usuario AS id_proveedor,
        CONCAT(u.nombre, ' ', u.apellido) AS nombre,
        e.nombre AS empresa,
        imagen_url AS foto_url,
        COALESCE(up.estado, 'inactivo') AS estado,
        up.latitud AS lat,
        up.longitud AS lng,
        (
          SELECT COUNT(*)
          FROM asignacion_pedido a
          INNER JOIN pedidos p ON p.id_pedido = a.id_pedido
          WHERE a.id_proveedor = u.id_usuario
            AND p.id_estado = 4
        ) AS pedidos_en_transito,
        (
          SELECT COUNT(*)
          FROM asignacion_pedido a
          INNER JOIN pedidos p ON p.id_pedido = a.id_pedido
          WHERE a.id_proveedor = u.id_usuario
            AND p.id_estado = 5
            AND DATE(COALESCE(p.fecha_entrega, p.fecha_inicio_transito)) = CURDATE()
        ) AS pedidos_entregados_hoy
      FROM usuarios u
      INNER JOIN empresas e ON e.id_empresa = u.id_empresa
      LEFT JOIN ubicacion_proveedor up ON up.id_proveedor = u.id_usuario
      WHERE u.id_empresa = ?
        AND u.id_rol = 3
        ${filtroNombre}
      ORDER BY
        FIELD(COALESCE(up.estado, 'inactivo'), 'activo', 'descanso', 'inactivo'),
        nombre
      `,
      params,
    );

    return ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
      id_proveedor: Number(r.id_proveedor),
      nombre: String(r.nombre ?? ""),
      empresa: String(r.empresa ?? ""),
      foto_url: r.foto_url != null ? String(r.foto_url) : null,
      estado: (String(r.estado) as EstadoUbicacionMapa) || "inactivo",
      lat: r.lat != null && r.lat !== "" ? Number(r.lat) : null,
      lng: r.lng != null && r.lng !== "" ? Number(r.lng) : null,
      pedidos_en_transito: Number(r.pedidos_en_transito ?? 0),
      pedidos_entregados_hoy: Number(r.pedidos_entregados_hoy ?? 0),
    }));

}
}

carpeta Model/Mapa/clienteMapaModel.ts
import { conexion } from "../conexion.ts";

export interface RepartidorMapaCliente {
id_proveedor: number;
nombre: string;
empresa: string;
foto_url: string | null;
estado: "activo" | "descanso" | "inactivo";
lat: number | null;
lng: number | null;
id_pedido: number;
}

export class ClienteMapaModel {
/\*_ Lista de ids para UnirseComoCliente (front o hub) _/
public async pedidosEnTransitoCliente(idCliente: number): Promise<number[]> {
const rows = await conexion.query(
`SELECT id_pedido FROM pedidos WHERE id_cliente = ? AND id_estado = 4`,
[idCliente],
);
return ((rows ?? []) as { id_pedido: number }[]).map((r) =>
Number(r.id_pedido)
);
}

/\*_ Hub: validar pedidoIds del mensaje UnirseComoCliente _/
public async filtrarPedidosClienteEnTransito(
idCliente: number,
pedidoIds: number[],
): Promise<number[]> {
if (!pedidoIds.length) return [];
const ids = pedidoIds.map(Number).filter((n) => Number.isFinite(n));
if (!ids.length) return [];

    const placeholders = ids.map(() => "?").join(", ");
    const rows = await conexion.query(
      `
      SELECT id_pedido
      FROM pedidos
      WHERE id_cliente = ?
        AND id_estado = 4
        AND id_pedido IN (${placeholders})
      `,
      [idCliente, ...ids],
    );
    return ((rows ?? []) as { id_pedido: number }[]).map((r) =>
      Number(r.id_pedido)
    );

}

/\*_ Sidebar: repartidores de pedidos en tránsito; q filtra por empresa _/
public async listarRepartidoresDeCliente(
idCliente: number,
q?: string,
): Promise<RepartidorMapaCliente[]> {
const termino = (q ?? "").trim();
const params: unknown[] = [idCliente];

    let filtroEmpresa = "";
    if (termino) {
      filtroEmpresa = ` AND LOWER(e.nombre) LIKE ? `;
      params.push(`%${termino.toLowerCase()}%`);
    }

    const rows = await conexion.query(
      `
      SELECT
        prov.id_usuario AS id_proveedor,
        CONCAT(prov.nombre, ' ', prov.apellido) AS nombre,
        e.nombre AS empresa,
        prov.imagen_url AS foto_url,
        COALESCE(up.estado, 'inactivo') AS estado,
        up.latitud AS lat,
        up.longitud AS lng,
        p.id_pedido
      FROM pedidos p
      INNER JOIN asignacion_pedido a ON a.id_pedido = p.id_pedido
      INNER JOIN usuarios prov ON prov.id_usuario = a.id_proveedor
      INNER JOIN empresas e ON e.id_empresa = prov.id_empresa
      LEFT JOIN ubicacion_proveedor up ON up.id_proveedor = prov.id_usuario
      WHERE p.id_cliente = ?
        AND p.id_estado = 4
        ${filtroEmpresa}
      ORDER BY p.id_pedido DESC
      `,
      params,
    );

    return ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
      id_proveedor: Number(r.id_proveedor),
      nombre: String(r.nombre ?? ""),
      empresa: String(r.empresa ?? ""),
      foto_url: r.foto_url != null ? String(r.foto_url) : null,
      estado:
        (String(r.estado) as RepartidorMapaCliente["estado"]) || "inactivo",
      lat: r.lat != null && r.lat !== "" ? Number(r.lat) : null,
      lng: r.lng != null && r.lng !== "" ? Number(r.lng) : null,
      id_pedido: Number(r.id_pedido),
    }));

}

/\*\*

- Modal factura. Ajusta detalle_pedido / productos a tu esquema.
- Si aún no tienes líneas de detalle, devuelve items: [].
  \*/
  public async detallePedidoCliente(
  idCliente: number,
  idPedido: number,
  ): Promise<Record<string, unknown> | null> {
  const rows = await conexion.query(
  `    SELECT
  p.id_pedido,
  p.total,
  p.id_estado,
  p.fecha_pedido,
  d.direccion_texto,
  CONCAT(cli.nombre, ' ', cli.apellido) AS cliente,
  e.nombre AS empresa,
  CONCAT(prov.nombre, ' ', prov.apellido) AS repartidor
FROM pedidos p
INNER JOIN direcciones d ON d.id_direccion = p.id_direccion
INNER JOIN usuarios cli ON cli.id_usuario = p.id_cliente
LEFT JOIN asignacion_pedido a ON a.id_pedido = p.id_pedido
LEFT JOIN usuarios prov ON prov.id_usuario = a.id_proveedor
LEFT JOIN empresas e ON e.id_empresa = prov.id_empresa
WHERE p.id_pedido = ?
  AND p.id_cliente = ?`,
  [idPedido, idCliente],
  );
  if (!rows?.length) return null;

  let items: unknown[] = [];
  try {
  const itemRows = await conexion.query(
  `       SELECT pr.nombre AS producto, dp.cantidad, dp.precio_unitario,
           (dp.cantidad * dp.precio_unitario) AS subtotal
    FROM detalle_pedido dp
    INNER JOIN productos pr ON pr.id_producto = dp.id_producto
    WHERE dp.id_pedido = ?
    `,
  [idPedido],
  );
  items = itemRows ?? [];
  } catch {
  items = [];
  }

  return {
  ...(rows[0] as object),
  items,
  };

}
}

carpeta Model/Mapa/proveedorMapaModel.ts
import { conexion } from "../conexion.ts";

export interface PedidoIdRow {
id_pedido: number;
}

export interface DestinoRuta {
id_pedido: number;
lat: number;
lng: number;
direccion_texto: string;
nombre_cliente: string;
}

export class ProveedorMapaModel {
/\*_ Usado por el hub WS_/
public async pedidoEnTransitoDeProveedor(
idProveedor: number,
): Promise<number[]> {
const rows = await conexion.query(
`       SELECT p.id_pedido
      FROM pedidos p
      INNER JOIN asignacion_pedido a ON a.id_pedido = p.id_pedido
      WHERE a.id_proveedor = ?
        AND p.id_estado = 4
      `,
[idProveedor],
);
const lista = (rows ?? []) as PedidoIdRow[];
return lista.map((r) => Number(r.id_pedido));
}

public async datosProveedor(
idProveedor: number,
idEmpresa: number
):Promise<{nombre: string | null, empresa: string | null}> {
const rows = await conexion.query(
`       select concat(u.nombre," ", u.apellido) as nombre, e.nombre as empresa
      from usuarios u
      left join empresas e on e.id_empresa = u.id_empresa
      where u.id_usuario = ?
        and u.id_empresa = ?
      `,
[idProveedor, idEmpresa]
);
return {nombre: rows.nombre, empresa:rows.empresa}
}

/\*_ Sidebar + pines de destinos. q = búsqueda opcional _/
public async destinosRutaProveedor(
idProveedor: number,
q?: string,
): Promise<DestinoRuta[]> {
const termino = (q ?? "").trim();
const params: unknown[] = [idProveedor];

    let filtro = "";
    if (termino) {
      filtro = `
        AND (
          LOWER(CONCAT(u.nombre, ' ', u.apellido)) LIKE ?
          OR LOWER(IFNULL(d.direccion_texto, '')) LIKE ?
        )
      `;
      const like = `%${termino.toLowerCase()}%`;
      params.push(like, like);
    }

    const result = await conexion.query(
      `
      SELECT
        p.id_pedido,
        d.latitud  AS lat,
        d.longitud AS lng,
        d.direccion_texto,
        CONCAT(u.nombre, ' ', u.apellido) AS nombre_cliente
      FROM pedidos p
      INNER JOIN asignacion_pedido a ON a.id_pedido = p.id_pedido
      INNER JOIN direcciones d ON d.id_direccion = p.id_direccion
      INNER JOIN usuarios u ON u.id_usuario = p.id_cliente
      WHERE a.id_proveedor = ?
        AND p.id_estado = 4
        AND d.latitud IS NOT NULL
        AND d.longitud IS NOT NULL
        ${filtro}
      ORDER BY p.id_pedido DESC
      `,
      params,
    );

    return ((result ?? []) as Record<string, unknown>[]).map((r) => ({
      id_pedido: Number(r.id_pedido),
      lat: Number(r.lat),
      lng: Number(r.lng),
      direccion_texto: String(r.direccion_texto ?? ""),
      nombre_cliente: String(r.nombre_cliente ?? ""),
    }));

}
}

carpeta Model/Mapa/ubicacionProveedorModel.ts
import { conexion } from "../conexion.ts";

export type EstadoUbicacion = "activo" | "descanso" | "inactivo";

export interface FilaUbicacion {
id_proveedor: number;
latitud: number;
longitud: number;
estado: EstadoUbicacion;
fecha_actualizacion: string;
}

export class UbicacionProveedorModel {
async upsertEstado(
idProveedor: number,
estado: EstadoUbicacion,
): Promise<void> {
await conexion.query(
`       INSERT INTO ubicacion_proveedor
        (id_proveedor, latitud, longitud, estado, fecha_actualizacion)
      VALUES (?, 0, 0, ?, NOW())
      ON DUPLICATE KEY UPDATE
        estado = VALUES(estado),
        fecha_actualizacion = NOW()
      `,
[idProveedor, estado],
);
}

async upsertUbicacion(
idProveedor: number,
lat: number,
lng: number,
estado?: EstadoUbicacion,
): Promise<void> {
if (estado) {
await conexion.query(
`         INSERT INTO ubicacion_proveedor
          (id_proveedor, latitud, longitud, estado, fecha_actualizacion)
        VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          latitud = VALUES(latitud),
          longitud = VALUES(longitud),
          estado = VALUES(estado),
          fecha_actualizacion = NOW()
        `,
[idProveedor, lat, lng, estado],
);
} else {
await conexion.query(
`         INSERT INTO ubicacion_proveedor
          (id_proveedor, latitud, longitud, estado, fecha_actualizacion)
        VALUES (?, ?, ?, 'activo', NOW())
        ON DUPLICATE KEY UPDATE
          latitud = VALUES(latitud),
          longitud = VALUES(longitud),
          fecha_actualizacion = NOW()
        `,
[idProveedor, lat, lng],
);
}
}

async obtenerPorProveedor(
idProveedor: number,
): Promise<FilaUbicacion | null> {
console.log(idProveedor)
const rows = await conexion.query(
`       SELECT id_proveedor, latitud, longitud, estado, fecha_actualizacion
      FROM ubicacion_proveedor
      WHERE id_proveedor = ?
      `,
[idProveedor],
);
if (!rows?.length) return null;
const r = rows[0] as Record<string, unknown>;
return {
id_proveedor: Number(r.id_proveedor),
latitud: Number(r.latitud),
longitud: Number(r.longitud),
estado: r.estado as EstadoUbicacion,
fecha_actualizacion: String(r.fecha_actualizacion ?? ""),
};
}
}

carpeta Controller/Mapa/adminMapaController.ts
import { Context } from "../../Dependencies/dependencias.ts";
import { AdminMapaModel } from "../../Model/Mapa/adminMapaModel.ts";
import { Sesion } from "../../Utils/tipos.ts";

export const listarRepartidoresMapaAdmin = async (ctx: Context) => {
const { response, state, request } = ctx;
try {
const sesion = state.user as Sesion;
if (!sesion || sesion.rol !== "ADMIN") {
response.status = 403;
response.body = { success: false, message: "No autorizado" };
return;
}

    const idEmpresa = Number(
      (sesion as Sesion & { idEmpresa?: number }).idEmpresa,
    );
    if (!idEmpresa) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Sesión sin idEmpresa",
      };
      return;
    }

    const q = request.url.searchParams.get("q") ?? undefined;
    const data = await new AdminMapaModel().listarRepartidoresEmpresa(
      idEmpresa,
      q,
    );

    response.status = 200;
    response.body = { success: true, data };

} catch (error) {
console.error("listarRepartidoresMapaAdmin:", error);
response.status = 500;
response.body = {
success: false,
message: "Error al listar repartidores",
};
}
};

carpeta Controller/Mapa/clienteMapaController.ts
import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { ClienteMapaModel } from "../../Model/Mapa/clienteMapaModel.ts";
import { Sesion } from "../../Utils/tipos.ts";

export const pedidosEnTransitoCliente = async (ctx: Context) => {
const { response, state } = ctx;
try {
const sesion = state.user as Sesion;
if (!sesion || sesion.rol !== "CLIENTE") {
response.status = 403;
response.body = { success: false, message: "No autorizado" };
return;
}

    const data = await new ClienteMapaModel().pedidosEnTransitoCliente(
      sesion.id,
    );
    response.status = 200;
    response.body = { success: true, data };

} catch (error) {
console.error("pedidosEnTransitoCliente:", error);
response.status = 500;
response.body = { success: false, message: "Error al obtener pedidos" };
}
};

export const listarRepartidoresMapaCliente = async (ctx: Context) => {
const { response, state, request } = ctx;
try {
const sesion = state.user as Sesion;
if (!sesion || sesion.rol !== "CLIENTE") {
response.status = 403;
response.body = { success: false, message: "No autorizado" };
return;
}

    const q = request.url.searchParams.get("q") ?? undefined;
    const data = await new ClienteMapaModel().listarRepartidoresDeCliente(
      sesion.id,
      q,
    );
    response.status = 200;
    response.body = { success: true, data };

} catch (error) {
console.error("listarRepartidoresMapaCliente:", error);
response.status = 500;
response.body = { success: false, message: "Error al listar repartidores" };
}
};

export const pedidoDetalleMapaCliente = async (
ctx: RouterContext<string>,
) => {
const { response, state, params } = ctx;
try {
const sesion = state.user as Sesion;
if (!sesion || sesion.rol !== "CLIENTE") {
response.status = 403;
response.body = { success: false, message: "No autorizado" };
return;
}

    const idPedido = Number(params.id);
    if (!idPedido || Number.isNaN(idPedido)) {
      response.status = 400;
      response.body = { success: false, message: "Id inválido" };
      return;
    }

    const data = await new ClienteMapaModel().detallePedidoCliente(
      sesion.id,
      idPedido,
    );
    if (!data) {
      response.status = 404;
      response.body = { success: false, message: "Pedido no encontrado" };
      return;
    }

    response.status = 200;
    response.body = { success: true, data };

} catch (error) {
console.error("pedidoDetalleMapaCliente:", error);
response.status = 500;
response.body = { success: false, message: "Error al obtener detalle" };
}
};

carpeta Controller/Mapa/proveedorMapaController.ts
import { Context } from "../../Dependencies/dependencias.ts";
import { ProveedorMapaModel } from "../../Model/Mapa/proveedorMapaModel.ts";
import { Sesion } from "../../Utils/tipos.ts";

export const destinosEnRutaProveedor = async (ctx: Context) => {
const { response, state, request } = ctx;
try {
const sesion = state.user as Sesion;
if (!sesion || sesion.rol !== "PROVEEDOR") {
response.status = 403;
response.body = { success: false, message: "No autorizado" };
return;
}

    const q = request.url.searchParams.get("q") ?? undefined;
    const data = await new ProveedorMapaModel().destinosRutaProveedor(
      sesion.id,
      q,
    );

    response.status = 200;
    response.body = {
      success: true,
      data: data.map((d) => ({
        ...d,
        url_detalle: `/repartidor/detalle/${d.id_pedido}/confirmar`,
      })),
    };

} catch (error) {
console.error("destinosEnRutaProveedor:", error);
response.status = 500;
response.body = { success: false, message: "Error al obtener destinos" };
}
};

mas cambios a middleware y helpers

(no se si esto es para poder usarlo en el front)
carpeta Middlewares/archivos.middleware.ts
// Middlewares/archivos.middleware.ts
import { Context } from "../Dependencies/dependencias.ts";

const TIPOS_MIME: Record<string, string> = {
".jpg": "image/jpeg",
".jpeg": "image/jpeg",
".png": "image/png",
".webp": "image/webp",
".gif": "image/gif",
".pdf": "application/pdf",
};

const DEFAULT_IMG = "default.png";

export const servirArchivos = async (
ctx: Context,
next: () => Promise<unknown>,
) => {
const url = ctx.request.url.pathname;

// Solo rutas bajo /Uploads/
if (!url.startsWith("/uploads/")) {
await next();
return;
}

// ?download=1 → fuerza descarga; si no, el navegador intenta mostrar (img/pdf)
const forzarDescarga =
ctx.request.url.searchParams.get("download") === "1" ||
ctx.request.url.searchParams.get("download") === "true";

let relativo = decodeURIComponent(url.replace(/^\/uploads\//, ""));
if (relativo === "default" || relativo === "") {
relativo = DEFAULT_IMG;
}

// Evitar path traversal (../)
if (relativo.includes("..")) {
ctx.response.status = 400;
ctx.response.body = { success: false, message: "Ruta inválida" };
return;
}

const rutaCompleta = `./uploads/${relativo}`;
const punto = rutaCompleta.lastIndexOf(".");
const extension =
punto >= 0 ? rutaCompleta.slice(punto).toLowerCase() : "";
const mime = TIPOS_MIME[extension] ?? "application/octet-stream";

try {
const bytes = await Deno.readFile(rutaCompleta);
const nombreArchivo = relativo.split("/").pop() ?? "archivo";

    ctx.response.status = 200;
    ctx.response.headers.set("Content-Type", mime);
    ctx.response.headers.set("Cache-Control", "private, max-age=3600");

    if (forzarDescarga) {
      ctx.response.headers.set(
        "Content-Disposition",
        `attachment; filename="${nombreArchivo}"`,
      );
    } else {
      // inline = ver en el navegador (PDF/imagen)
      ctx.response.headers.set(
        "Content-Disposition",
        `inline; filename="${nombreArchivo}"`,
      );
    }

    ctx.response.body = bytes;

} catch {
// Fallback solo para imágenes de perfil; PDFs de solicitud → 404
if (extension !== ".pdf") {
try {
const bytes = await Deno.readFile(`./uploads/${DEFAULT_IMG}`);
ctx.response.status = 200;
ctx.response.headers.set("Content-Type", "image/png");
ctx.response.body = bytes;
return;
} catch {
/_ ignore _/
}
}

    ctx.response.status = 404;
    ctx.response.body = { success: false, message: "Archivo no encontrado" };

}
};

(tambien unos cambios al jwt que no se que tan distinto este al mio)
carpeta Helpers/Jwt.ts
import {
create,
getNumericDate,
verify,
} from "../Dependencies/dependencias.ts";
import { generarKey } from "./CriptoKey.ts";
import type { Payload } from "../Dependencies/dependencias.ts";

const key = Deno.env.get("MY_SECRET_KEY");
const server = Deno.env.get("SERVER") || "http://localhost:8005";

if (!key) {
throw new Error("MY_SECRET_KEY no está definida. Revisa tu archivo .env");
}

export interface DatosToken extends Payload{
id:number;
rol:string;
idEmpresa: number | null;
}

export const crearToken = async (datos:DatosToken): Promise<string> =>{
const clave = await generarKey(key);

    return await create(
        {alg: "HS256", typ:"JWT"},
        {
            iss: server,
            sub: String(datos.id),
            ...datos,
            jti: crypto.randomUUID(),
            exp: getNumericDate(60*60*8),
        },
        clave,
    );

};

export const VerificarTokenAcceso = async (token: string) => {
const secretKey = await generarKey(key);

try {
return await verify(token, secretKey);
} catch (error) {
console.error("Token inválido: ", error);
return null;
}
};
