import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import {
  DireccionCliente,
  DireccionData,
} from "../../Model/Cliente/DireccionModel.ts";

function idCliente(ctx: Context): number {
  return Number((ctx.state.user as { sub?: string }).sub);
}

function leerDatosDireccion(
  body: Record<string, unknown>,
): DireccionData | null {
  const direccion_texto = String(body.direccion_texto ?? "").trim();
  const alias = String(body.alias ?? "").trim();
  const latitud = body.latitud === null || body.latitud === undefined ||
      body.latitud === ""
    ? null
    : Number(body.latitud);
  const longitud = body.longitud === null || body.longitud === undefined ||
      body.longitud === ""
    ? null
    : Number(body.longitud);

  if (
    !direccion_texto ||
    direccion_texto.length > 255 ||
    alias.length > 100 ||
    (latitud !== null &&
      (!Number.isFinite(latitud) || latitud < -90 || latitud > 90)) ||
    (longitud !== null &&
      (!Number.isFinite(longitud) || longitud < -180 || longitud > 180)) ||
    ((latitud === null) !== (longitud === null))
  ) {
    return null;
  }
  return {
    alias: alias || null,
    direccion_texto,
    latitud,
    longitud,
  };
}

export const listarDireccionesCliente = async (ctx: Context) => {
  try {
    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      data: await DireccionCliente.Listar(idCliente(ctx)),
    };
  } catch (error) {
    console.error("Error listar direcciones de cliente:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const crearDireccionCliente = async (ctx: Context) => {
  try {
    const body = await ctx.request.body.json();
    const datos = leerDatosDireccion(body);
    if (!datos) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Dirección, alias o coordenadas inválidas",
      };
      return;
    }
    const resultado = await DireccionCliente.Crear(idCliente(ctx), datos);
    ctx.response.status = 201;
    ctx.response.body = {
      success: true,
      message: "Dirección creada correctamente",
      id: resultado.id,
    };
  } catch (error) {
    console.error("Error crear dirección de cliente:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const editarDireccionCliente = async (
  ctx: RouterContext<"/api/cliente/direcciones/:id">,
) => {
  try {
    const id_direccion = Number(ctx.params.id);
    const body = await ctx.request.body.json();
    const datos = leerDatosDireccion(body);
    if (!Number.isSafeInteger(id_direccion) || id_direccion <= 0 || !datos) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Datos de dirección inválidos",
      };
      return;
    }
    const resultado = await DireccionCliente.Editar(
      idCliente(ctx),
      id_direccion,
      datos,
    );
    ctx.response.status = resultado.success ? 200 : 404;
    ctx.response.body = resultado;
  } catch (error) {
    console.error("Error editar dirección de cliente:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const cambiarEstadoDireccionCliente = async (
  ctx: RouterContext<"/api/cliente/direcciones/:id/estado">,
) => {
  try {
    const id_direccion = Number(ctx.params.id);
    const body = await ctx.request.body.json();
    if (
      !Number.isSafeInteger(id_direccion) ||
      id_direccion <= 0 ||
      ![0, 1].includes(body.activo)
    ) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Estado o ID inválido" };
      return;
    }
    const actualizado = await DireccionCliente.CambiarEstado(
      idCliente(ctx),
      id_direccion,
      body.activo,
    );
    ctx.response.status = actualizado ? 200 : 404;
    ctx.response.body = actualizado
      ? { success: true, message: "Estado de dirección actualizado" }
      : { success: false, message: "Dirección no encontrada" };
  } catch (error) {
    console.error("Error cambiar estado de dirección:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};
