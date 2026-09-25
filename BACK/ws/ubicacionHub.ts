import { string } from "https://deno.land/x/zod@v3.24.4/types.ts";
import {VerificarTokenAcceso} from "../Helpers/Jwt.ts";
import { resolve } from "jsr:@std/path@1/resolve";
import { info } from "node:console";
import { pedidosModel } from "../Model/pruebasMapa/pruebasModel.ts";

export type RolWs ="SUEPERADMIN" | "ADMIN" | "PROVEEDOR" | "CLIENTE";
export type ModoRuta = "inactivo" | "activo" | "descanso";


export interface infoConexion {
    usuarioId: number;
    rol: RolWs;
    idEmpresa: number | null;
    grupos: Set<string>;
    modoRuta: ModoRuta;
}


const grupos = new Map<string,Set<WebSocket>>();
const conexiones = new Map<WebSocket,infoConexion>();


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
    if(!set) return;
    const message = JSON.stringify(payload);
    for(const cliente of set) {
        if(cliente.readyState === WebSocket.OPEN) cliente.send(message);
    }
}
//enviar mensajes por consola basicamente
function enviarA(ws: WebSocket, payload: object) {
    if(ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

function limpiarConexion(ws: WebSocket) {
    const info = conexiones.get(ws);
    if(!info) return;
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
        const token = String(data.token?? "");
        const payload = await VerificarTokenAcceso(token);

        if(!payload) {
            enviarA(ws, {tipo:"Error", mensaje:"Token invalido"});
            ws.close();
            return;
        }
        //aqui es donde metemos toda la info necesaria para los sockets
        conexiones.set(ws, {
            usuarioId: payload.id as number,
            rol: payload.rol as RolWs,
            idEmpresa: typeof payload.idEmpresa === "number" ? payload.idEmpresa : null,
            grupos: new Set(),
            modoRuta: "inactivo",
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
    if (!info){
        enviarA(ws, { tipo: "Error", mensaje: "Debes autenticarte primero"}); //by the way esto nunca deberia pasar teniendo en cuenta el middleware de astro que obliga a tener token si o si para cualquier vista
        return;
    }
    //UNIRSE AL GRUPO COMO ADMIN

    if (tipo === "UnirseComoAdmin") {
        if (info.rol !== "ADMIN" || !info.idEmpresa) {
            enviarA(ws,{ tipo: "Error", mensaje: "No autorizado"});
            return;
        }
        agregarAGrupo(ws, `empresa-${info.idEmpresa}-admins`);
        enviarA(ws, {tipo: "unido", grupo: `empresa-${info.idEmpresa}-admins`});
        return;
    }

    //UNIRSE COMO REPARTIDOR

    if (tipo === "UnirseComoProveedor") {
        if(info.rol !== "PROVEEDOR") {
            enviarA(ws, { tipo: "Error", mensaje: "No autorizado"});
            return;
        }
        
        enviarA(ws, { tipo: "unido", rol: "PROVEEDOR"});
        return;
    }

    //UNIRSE COMO CLIENTE

    if (tipo === "UnirseComoCliente") {
        if (info.rol !== "CLIENTE") {
            enviarA(ws, { tipo: "Error", mensaje: "No autorizado"});
            return;
        }

        const pedidoIds = ((data.pedidoIds as unknown[]) ?? [])
            .map((x) => Number(x))
            .filter((n) => Number.isFinite(n) && n > 0);
        console.log("pito "+ pedidoIds + " id: " + info.usuarioId)
        const validos = await new pedidosModel().filtrarPedidosClienteEnTransito(info.usuarioId, pedidoIds);
        for(const id_pedido of validos) {
            agregarAGrupo(ws, `pedido-${id_pedido}`);
        }
        enviarA(ws, {tipo: "unido", pedidos: validos});
        return;
    }

    //ESTADOS DE LA UBICACION DEL REPARTIDOR
    if (tipo === "EmpezarRuta") {
        if (info.rol !== "PROVEEDOR") return;

        info.modoRuta = "activo";
        enviarA(ws, {tipo: "ruta_iniciada"});
        return;
    }


    if (tipo === "Descanso") {
        if (info.rol !== "PROVEEDOR" || info.modoRuta !=="activo") return;
        info.modoRuta = "descanso";

        const pedidos = await new pedidosModel().pedidoEnTransitoDeProveedor(info.usuarioId);
        for(const id of pedidos) {
            enviarAGrupo(`pedido-${id}`, {
                tipo: "ProveedorEnDescanso",
                proveedoId: info.usuarioId,
            });
        }
        return;
    }

    if (tipo === "ReanudarRuta") {
        if (info.rol !== "PROVEEDOR" || info.modoRuta !== "descanso") return;

        info.modoRuta = "activo";

        const pedidos = await new pedidosModel().pedidoEnTransitoDeProveedor(info.usuarioId);

        for(const id of pedidos) {
            enviarAGrupo(`pedido-${id}`,{
                tipo:"ProveedorReanudo",
                proveedorId: info.usuarioId
            });
        }

        return;
    }

    if (tipo === "TerminarRuta") {
        if(info.rol !== "PROVEEDOR") return;

        const pendientes = await new pedidosModel().pedidoEnTransitoDeProveedor(info.usuarioId);
        if (pendientes.length > 0) {
            enviarA(ws, {
                tipo:"Error",
                mensaje:"No puedes terminar la ruta: aun hay pedidos en transito"
            });
            return;
        }
        info.modoRuta ="inactivo";
        if (info.idEmpresa) {
            enviarAGrupo(`empresa-${info.idEmpresa}-admins`, {
                tipo:"ProveedorTerminoRuta",
                proveedorId: info.usuarioId,
            });
        }
        return;
    }



    //AHORA SI LO BUENO, ENVIAR LA UBI DEL REPARTIDOR A LOS GRUPOS

    if (tipo === "EnviarUbicacion") {
        if(info.rol !== "PROVEEDOR") return;
        if(info.modoRuta === "inactivo") return;

        const lat = Number(data.lat);
        const lng = Number(data.lng);

        if(!Number.isFinite(lat) || !Number.isFinite(lng)) return;



        const payload = {
            tipo: "ActualizarUbicacion",
            proveedorId: info.usuarioId,
            lat,
            lng,
            modo: info.modoRuta
        };


        if (info.idEmpresa) {
            enviarAGrupo(`empresa-${info.idEmpresa}-admins`, payload);
        }

        if (info.modoRuta === "activo") {
            const pedido = await new pedidosModel().pedidoEnTransitoDeProveedor(info.usuarioId);
            for(const id of pedido) {
                enviarAGrupo(`pedido-${id}`, payload);
            }
        }
        return;
    }
}