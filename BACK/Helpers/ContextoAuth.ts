import { RouterContext } from "../Dependencies/Dependencias.ts";

// extrae idUsuario/idEmpresa/rol del payload que VerificarAutenticacion dejo en ctx.state.usuario
export function obtenerUsuarioAutenticado(ctx: RouterContext<string>) {
  const usuario = ctx.state.usuario as { sub: string; idEmpresa: number | null; rol: string } | undefined;
  return {
    idUsuario: usuario ? Number(usuario.sub) : null,
    idEmpresa: usuario?.idEmpresa ?? null,
    rol: usuario?.rol ?? null,
  };
}