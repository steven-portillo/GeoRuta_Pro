import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { Empresa } from "../../Model/SuperAdmin/EmpresaModel.ts";
import { enviarCorreo } from "../../Helpers/mailer.ts";
import {
  plantillaEmpresaActivada,
  plantillaEmpresaDesactivada,
} from "../../Helpers/emailTemplates.ts";

export const listarEmpresas = async (ctx: Context) => {
  try {
    const empresas = await Empresa.Listar();
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: empresas };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const cambiarEstadoEmpresa = async (
  ctx: RouterContext<"/api/admin/superadmin/empresas/:id/estado">,
) => {
  try {
    const id_empresa = Number(ctx.params.id);

    if (!Number.isInteger(id_empresa) || id_empresa <= 0) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const body = await ctx.request.body.json();

    if (![0, 1].includes(body.estado)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Estado inválido" };
      return;
    }

    // Se consulta antes de cambiar: valida que exista y guarda el
    // estado anterior para saber si realmente hubo un cambio.
    const empresa = await Empresa.ObtenerConAdmin(id_empresa);
    if (!empresa) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, message: "Empresa no encontrada" };
      return;
    }

    const resultado = await Empresa.CambiarEstado(id_empresa, body.estado);

    if (resultado.success && Number(empresa.estado) !== body.estado) {
      const correo =
        body.estado === 1
          ? plantillaEmpresaActivada(empresa.nombre_admin, empresa.nombre)
          : plantillaEmpresaDesactivada(empresa.nombre_admin, empresa.nombre);

      enviarCorreo(
        empresa.email_admin,
        correo.asunto,
        correo.html,
        correo.texto,
      );
    }

    ctx.response.status = resultado.success ? 200 : 400;
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
