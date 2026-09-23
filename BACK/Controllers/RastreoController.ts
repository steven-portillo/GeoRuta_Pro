import { Context, verificarFirmaJWT } from "../Dependencies/Dependencias.ts";
import { unirseASala, salirDeSala, enviarAOtrosEnSala } from "../Helpers/GestorSalasRastreo.ts";
import { UbicacionProveedor } from "../Models/UbicacionProveedorModel.ts";
import { obtenerClaveJWT } from "../Helpers/GenerarToken.ts";

// maneja la conexion websocket de tracking para un pedido puntual.
// reemplaza a RastreoHub.cs (UnirseAPedido + EnviarUbicacion) del proyecto original.
// el navegador no puede mandar headers en la conexion websocket, asi que el jwt
// viaja como query param: /ws/rastreo/:idPedido?token=...
export const conectarRastreo = async (ctx: Context & { params: { idPedido: string } }) => {
  if (!ctx.isUpgradable) {
    ctx.throw(501, "Esta ruta solo acepta conexiones websocket");
  }

  const idPedido = ctx.params.idPedido;
  const token = ctx.request.url.searchParams.get("token");

  if (!token) {
    ctx.throw(401, "Token no proporcionado");
  }

  let idUsuario: number;
  let rol: string;

  try {
    const clave = await obtenerClaveJWT();
    const payload = await verificarFirmaJWT(token as string, clave) as { sub: string; rol: string };
    idUsuario = Number(payload.sub);
    rol = payload.rol;
  } catch (_error) {
    ctx.throw(401, "Token inválido o expirado");
    return;
  }

  const socket = ctx.upgrade();

  socket.onopen = () => {
    unirseASala(idPedido, socket);
    console.log(`usuario ${idUsuario} (${rol}) se unió al tracking del pedido ${idPedido}`);
  };

  socket.onmessage = async (evento) => {
    try {
      const mensaje = JSON.parse(evento.data);

      if (mensaje.tipo === "ubicacion" && rol === "PROVEEDOR") {
        const { lat, lng } = mensaje;

        const ObjUbicacion = new UbicacionProveedor(idUsuario, { latitud: lat, longitud: lng });
        await ObjUbicacion.ActualizarUbicacion();

        enviarAOtrosEnSala(idPedido, socket, {
          tipo: "ubicacion",
          idProveedor: idUsuario,
          lat,
          lng,
        });
      }
    } catch (error) {
      console.error("mensaje websocket inválido:", error);
    }
  };

  socket.onclose = async () => {
    salirDeSala(idPedido, socket);

    if (rol === "PROVEEDOR") {
      const ObjUbicacion = new UbicacionProveedor(idUsuario);
      await ObjUbicacion.MarcarInactivo();
    }
  };
};