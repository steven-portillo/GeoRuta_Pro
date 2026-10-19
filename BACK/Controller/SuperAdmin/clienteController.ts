import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { Cliente } from "../../Model/SuperAdmin/ClienteModel.ts";
import {
  generarRutaArchivo,
  escribirArchivo,
  validarArchivo,
} from "../../Helpers/archivos.ts";

export const listarClientes = async (ctx: Context) => {
  try {
    const clientes = await Cliente.Listar();
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: clientes };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const obtenerCliente = async (
  ctx: RouterContext<"/api/admin/superadmin/clientes/:id">,
) => {
  try {
    const id_usuario = Number(ctx.params.id);
    if (Number.isNaN(id_usuario)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const cliente = await Cliente.ObtenerPorId(id_usuario);
    if (!cliente) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, message: "Cliente no encontrado" };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = { success: true, data: cliente };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const cambiarEstadoCliente = async (
  ctx: RouterContext<"/api/admin/superadmin/clientes/:id/estado">,
) => {
  try {
    const id_usuario = Number(ctx.params.id);
    const body = await ctx.request.body.json();

    if (![0, 1].includes(body.estado)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Estado inválido" };
      return;
    }

    const resultado = await Cliente.CambiarEstado(id_usuario, body.estado);
    ctx.response.status = resultado.success ? 200 : 404;
    ctx.response.body = resultado;
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const editarCliente = async (
  ctx: RouterContext<"/api/admin/superadmin/clientes/:id">,
) => {
  try {
    const id_usuario = Number(ctx.params.id);
    const form = await ctx.request.body.formData();

    const nombre = String(form.get("nombre") ?? "").trim();
    const apellido = String(form.get("apellido") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const foto = form.get("foto");

    let rutaFoto: string | undefined;

    if (foto !== null) {
      if (!(foto instanceof File)) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: "La foto enviada no es un archivo válido",
        };
        return;
      }
      const errorFoto = validarArchivo(foto);
      if (errorFoto) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: errorFoto };
        return;
      }

      rutaFoto = generarRutaArchivo(foto, "usuarios");
      await escribirArchivo(foto, rutaFoto);
    }

    const resultado = await Cliente.Editar(id_usuario, {
      nombre: nombre || undefined,
      apellido: apellido || undefined,
      email: email || undefined,
      imagen_url: rutaFoto,
    });

    ctx.response.status = resultado.success ? 200 : 404;
    ctx.response.body = resultado;
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};
