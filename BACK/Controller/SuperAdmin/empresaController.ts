import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { Empresa } from "../../Model/SuperAdmin/EmpresaModel.ts";

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
    const body = await ctx.request.body.json();

    if (![0, 1].includes(body.estado)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Estado inválido" };
      return;
    }

    const resultado = await Empresa.CambiarEstado(id_empresa, body.estado);
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
