type CookieStore = {
  get(name: string): { value: string } | undefined;
};

type OpcionesBackend = {
  metodo?: string;
  cuerpo?: unknown;
  token?: string | null;
  headers?: HeadersInit;
};

export type RespuestaBackend<T = unknown> = {
  status: number;
  datos: T;
};

const URL_BACKEND = (
  import.meta.env.API_DENO ||
  import.meta.env.PUBLIC_API_DENO ||
  import.meta.env.PUBLIC_BACKEND_URL ||
  import.meta.env.BACKEND_URL ||
  "http://127.0.0.1:8005"
).replace(/\/+$/, "");

export function obtenerToken(cookies: CookieStore): string | null {
  return cookies.get("token")?.value ?? null;
}

export function resolverUrlBackend(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:|data:|blob:|\/\/)/i.test(url)) return url;
  return `${URL_BACKEND}${url.startsWith("/") ? url : `/${url}`}`;
}

function normalizarUrlsImagenes(valor: unknown, campo?: string): unknown {
  if (typeof valor === "string") {
    return campo && /(imagen|image|logo|foto|avatar|portada)/i.test(campo)
      ? resolverUrlBackend(valor) ?? valor
      : valor;
  }
  if (Array.isArray(valor)) {
    return valor.map((elemento) => normalizarUrlsImagenes(elemento, campo));
  }
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([clave, contenido]) => [
        clave,
        normalizarUrlsImagenes(contenido, clave),
      ]),
    );
  }
  return valor;
}

function resolverRuta(ruta: string, metodo: string, cuerpo: unknown): {
  ruta: string;
  metodo: string;
  cuerpo: unknown;
} {
  let destino = ruta.startsWith("/api/") ? ruta : `/api${ruta}`;
  let metodoDestino = metodo;
  let body = cuerpo;

  if (destino === "/api/admin/perfil" || destino === "/api/cliente/perfil" ||
    destino === "/api/cliente/perfil/cuenta" ||
    destino === "/api/proveedor/perfil" ||
    destino === "/api/superadmin/perfil") {
    destino = "/api/perfil";
  } else if (destino === "/api/cliente/proveedores") {
    destino = "/api/cliente/empresas";
  } else {
    const productosEmpresa = destino.match(
      /^\/api\/cliente\/proveedores\/(\d+)\/productos$/,
    );
    if (productosEmpresa) {
      destino = `/api/cliente/empresas/${productosEmpresa[1]}/productos`;
    }
  }

  if (
    destino === "/api/admin/pedidos/cambiar-estado" &&
    body &&
    typeof body === "object"
  ) {
    const datos = body as Record<string, unknown>;
    const id = Number(datos.id ?? datos.idPedido);
    const estado = String(datos.estado ?? datos.nuevoEstado ?? "");
    const estadoNormalizado = estado.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (
      estadoNormalizado === "en preparacion" ||
      estadoNormalizado === "aprobado"
    ) {
      destino = `/api/admin/pedidos/${id}/aprobar`;
      body = {};
    } else if (estadoNormalizado === "cancelado") {
      destino = `/api/admin/pedidos/${id}/cancelar`;
      body = {
        motivo: datos.motivo ?? datos.observaciones ??
          "Cancelado desde administración",
      };
    } else if (estadoNormalizado === "entregado") {
      destino = `/api/admin/pedidos/${id}/entregar`;
      body = {};
    }
    metodoDestino = "PATCH";
  }

  if (
    destino === "/api/admin/repartidores/asignar" &&
    body &&
    typeof body === "object"
  ) {
    const datos = body as Record<string, unknown>;
    const idPedido = Number(datos.idPedido ?? datos.id_pedido ?? datos.id);
    destino = `/api/admin/pedidos/${idPedido}/asignar`;
    body = {
      id_proveedor: datos.idProveedor ?? datos.id_proveedor ??
        datos.idRepartidor ?? datos.id_repartidor,
      notas: datos.notas,
    };
    metodoDestino = "PATCH";
  }

  if (destino === "/api/admin/repartidores/disponibles") {
    destino = "/api/admin/proveedores/disponibles";
  } else if (
    destino === "/api/admin/repartidores" ||
    destino.startsWith("/api/admin/repartidores/")
  ) {
    destino = destino.replace(
      "/api/admin/repartidores",
      "/api/admin/proveedores",
    );
  }

  if (destino === "/api/superadmin/empresas/cambiar-estado" && body &&
    typeof body === "object") {
    const datos = body as Record<string, unknown>;
    destino = `/api/admin/superadmin/empresas/${Number(datos.idEmpresa ?? datos.id)}/estado`;
    body = { estado: datos.estado };
  }

  if (destino === "/api/cliente/resenas" && metodo === "POST" && body &&
    typeof body === "object") {
    const datos = body as Record<string, unknown>;
    destino = `/api/cliente/pedidos/${Number(datos.idPedido ?? datos.id_pedido)}/resenas`;
    body = {
      id_producto: datos.idProducto ?? datos.id_producto,
      calificacion: datos.calificacion,
      comentario: datos.comentario,
    };
  }

  if (destino === "/api/cliente/direcciones" && body &&
    typeof body === "object" && !(body instanceof FormData)) {
    const datos = body as Record<string, unknown>;
    body = {
      alias: datos.alias,
      direccion_texto: datos.direccionTexto ?? datos.direccion_texto,
      latitud: datos.latitud,
      longitud: datos.longitud,
    };
  }

  if (destino === "/api/cliente/pedidos" && metodo === "POST" && body &&
    typeof body === "object" && !(body instanceof FormData)) {
    const datos = body as Record<string, unknown>;
    body = {
      id_empresa: datos.idEmpresa ?? datos.id_empresa,
      id_direccion: datos.idDireccion ?? datos.id_direccion,
      metodo_pago: datos.metodoPago ?? datos.metodo_pago,
      items: Array.isArray(datos.items)
        ? datos.items.map((item) => ({
          id_producto: item.idProducto ?? item.id_producto,
          cantidad: item.cantidad,
        }))
        : datos.items,
      observaciones: datos.observaciones,
    };
  }

  if (
    destino === "/api/admin/perfil/foto" ||
    destino === "/api/cliente/perfil/foto" ||
    destino === "/api/proveedor/perfil/foto" ||
    destino === "/api/superadmin/perfil/foto"
  ) {
    destino = "/api/perfil";
    metodoDestino = "PUT";
  }

  if (
    destino === "/api/admin/perfil/logo"
  ) {
    destino = "/api/admin/empresa";
    metodoDestino = "PUT";
  }

  if (
    destino === "/api/perfil" &&
    metodo === "POST" &&
    body &&
    typeof body === "object" &&
    !(body instanceof FormData)
  ) {
    const form = new FormData();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) form.set(key, String(value));
    }
    body = form;
    metodoDestino = "PUT";
  }

  if (destino === "/api/cliente/pago/crear-intencion") {
    metodoDestino = "POST";
  }
  if (destino.startsWith("/api/pago/")) {
    destino = destino.replace("/api/pago/", "/api/cliente/pago/");
  }

  return { ruta: destino, metodo: metodoDestino, cuerpo: body };
}

export async function llamarBackend<T = unknown>(
  ruta: string,
  opciones: OpcionesBackend = {},
): Promise<RespuestaBackend<T>> {
  const metodo = (opciones.metodo ?? "GET").toUpperCase();
  const resuelta = resolverRuta(ruta, metodo, opciones.cuerpo);
  const headers = new Headers(opciones.headers);
  if (opciones.token) headers.set("Authorization", `Bearer ${opciones.token}`);

  let cuerpo: BodyInit | undefined;
  if (resuelta.cuerpo !== undefined && resuelta.cuerpo !== null) {
    if (
      resuelta.cuerpo instanceof FormData ||
      resuelta.cuerpo instanceof Blob ||
      typeof resuelta.cuerpo === "string"
    ) {
      cuerpo = resuelta.cuerpo;
    } else {
      headers.set("Content-Type", "application/json");
      cuerpo = JSON.stringify(resuelta.cuerpo);
    }
  }

  const respuesta = await fetch(`${URL_BACKEND}${resuelta.ruta}`, {
    method: resuelta.metodo,
    headers,
    body: cuerpo,
  });
  const texto = await respuesta.text();
  let datos: unknown;
  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = { success: false, message: "El backend devolvió una respuesta no válida" };
    }
  } else {
    datos = {};
  }

  return {
    status: respuesta.status,
    datos: normalizarUrlsImagenes(datos) as T,
  };
}
