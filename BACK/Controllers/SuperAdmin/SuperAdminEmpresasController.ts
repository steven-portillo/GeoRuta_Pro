import { RouterContext } from "../../Dependencies/Dependencias.ts";
import { Empresa } from "../../Models/Empresa.model.ts";
import { Usuario } from "../../Models/Usuario.model.ts";
import { EsquemaCambiarEstadoEmpresa } from "../../Helpers/EsquemasValidacion.ts";

// GET /superadmin/empresas?busqueda=texto si
export const obtenerEmpresas = async (ctx: RouterContext<string>) => {
  const { response, request } = ctx;
  try {
    const busqueda = request.url.searchParams.get("busqueda") ?? undefined;
    const ObjEmpresa = new Empresa();
    const resultado = await ObjEmpresa.ObtenerTodas(busqueda);

    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener las empresas" };
  }
};

// POST /superadmin/empresas/cambiar-estado
export const cambiarEstadoEmpresa = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaCambiarEstadoEmpresa.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = { success: false, message: "Datos inválidos" };
      return;
    }

    const ObjEmpresa = new Empresa(resultado.data.idEmpresa);
    const resultadoCambio = await ObjEmpresa.CambiarEstado(resultado.data.idEmpresa, resultado.data.activar);

    response.status = resultadoCambio.success ? 200 : 400;
    response.body = resultadoCambio;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible cambiar el estado de la empresa" };
  }
};

// GET /superadmin/usuarios/total
export const obtenerTotalUsuarios = async (ctx: RouterContext<string>) => {
  const { response } = ctx;
  try {
    const ObjUsuario = new Usuario();
    const resultado = await ObjUsuario.ObtenerTotalUsuarios();

    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener el total de usuarios" };
  }
};