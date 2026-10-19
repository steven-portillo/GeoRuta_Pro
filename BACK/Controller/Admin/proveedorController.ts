import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { Proveedor } from "../../Model/Admin/ProveedorModel.ts";
import { Empresa } from "../../Model/SuperAdmin/EmpresaModel.ts";
import { enviarCorreo } from "../../Helpers/mailer.ts";
import { plantillaBienvenidaProveedor } from "../../Helpers/emailTemplates.ts";

/** GET /api/admin/proveedores */
export const listarProveedores = async (ctx: Context) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const proveedores = await Proveedor.Listar(usuario.id_empresa);
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: proveedores };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const listarProveedoresDisponibles = async (ctx: Context) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const proveedores = await Proveedor.ListarDisponibles(usuario.id_empresa);
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: proveedores };
  } catch (error) {
    console.error("Error al listar proveedores disponibles:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No fue posible cargar los proveedores disponibles",
    };
  }
};

export const listarPedidosProveedorAdmin = async (
  ctx: RouterContext<"/api/admin/proveedores/:id/pedidos">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const id_proveedor = Number(ctx.params.id);
    if (!Number.isSafeInteger(id_proveedor) || id_proveedor <= 0) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const pedidos = await Proveedor.ListarPedidos(
      id_proveedor,
      usuario.id_empresa,
    );
    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      data: pedidos.map((pedido: Record<string, unknown>) => ({
        ...pedido,
        id: Number(pedido.id),
        total: Number(pedido.total),
        estado: pedido.estado === "Asignado" || pedido.estado === "Aprobado"
          ? "En preparacion"
          : pedido.estado,
        fecha: pedido.fecha
          ? new Date(String(pedido.fecha)).toLocaleString("es-CO")
          : "",
        latitud: pedido.latitud === null ? null : Number(pedido.latitud),
        longitud: pedido.longitud === null ? null : Number(pedido.longitud),
      })),
    };
  } catch (error) {
    console.error("Error al listar pedidos del proveedor para administración:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No fue posible cargar los pedidos del proveedor",
    };
  }
};

/** GET /api/admin/proveedores/:id */
export const obtenerProveedor = async (
  ctx: RouterContext<"/api/admin/proveedores/:id">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const id_usuario = Number(ctx.params.id);

    if (Number.isNaN(id_usuario)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const proveedor = await Proveedor.ObtenerPorId(
      id_usuario,
      usuario.id_empresa,
    );
    if (!proveedor) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        message: "Proveedor no encontrado",
      };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = { success: true, data: proveedor };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

/** POST /api/admin/proveedores */
export const crearProveedor = async (ctx: Context) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const body = await ctx.request.body.json();

    const nombre = String(body.nombre ?? "").trim();
    const apellido = String(body.apellido ?? "").trim();
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "").trim();

    if (!nombre || !apellido || !email || !password) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Faltan campos obligatorios",
      };
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Correo electrónico no válido",
      };
      return;
    }

    if (password.length < 8) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "La contraseña debe tener al menos 8 caracteres",
      };
      return;
    }

    const resultado = await Proveedor.Crear(usuario.id_empresa, {
      nombre,
      apellido,
      email,
      password,
    });
    if (resultado.success) {
      try {
        const nombreEmpresa = await Empresa.ObtenerNombre(usuario.id_empresa);
        if (nombreEmpresa) {
          const correo = plantillaBienvenidaProveedor(nombre, nombreEmpresa);
          enviarCorreo(email, correo.asunto, correo.html, correo.texto);
        } else {
          console.warn(
            "No se encontró el nombre de la empresa para el correo del proveedor.",
          );
        }
      } catch (error) {
        console.error("No se pudo preparar el correo del proveedor:", error);
      }
    }
    ctx.response.status = resultado.success ? 201 : 400;
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

/** PUT /api/admin/proveedores/:id */
export const editarProveedor = async (
  ctx: RouterContext<"/api/admin/proveedores/:id">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const id_usuario = Number(ctx.params.id);

    if (Number.isNaN(id_usuario)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const body = await ctx.request.body.json();
    const nombre = body.nombre ? String(body.nombre).trim() : undefined;
    const apellido = body.apellido ? String(body.apellido).trim() : undefined;
    const email = body.email ? String(body.email).trim() : undefined;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Correo electrónico no válido",
      };
      return;
    }

    const resultado = await Proveedor.Editar(id_usuario, usuario.id_empresa, {
      nombre,
      apellido,
      email,
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

/** PATCH /api/admin/proveedores/:id/estado */
export const cambiarEstadoProveedor = async (
  ctx: RouterContext<"/api/admin/proveedores/:id/estado">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const id_usuario = Number(ctx.params.id);

    if (Number.isNaN(id_usuario)) {
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

    const resultado = await Proveedor.CambiarEstado(
      id_usuario,
      usuario.id_empresa,
      body.estado,
    );
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
