import type { APIRoute } from 'astro';

const BACKEND_URL = import.meta.env.API_DENO || 'http://127.0.0.1:8005';
const NOMBRE_COOKIE = 'token';

export const PATCH: APIRoute = async ({ request, cookies }) => {
  try {
    const token = cookies.get(NOMBRE_COOKIE)?.value;

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const cuerpo = await request.json();
    const { id, nombre } = cuerpo;

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: 'ID de categoría requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (!nombre || !String(nombre).trim()) {
      return new Response(
        JSON.stringify({ success: false, message: 'El nombre es obligatorio' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Usa el PUT que ya tienes en el backend (editarCategoria)
    const respuesta = await fetch(`${BACKEND_URL}/api/admin/categorias/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nombre: String(nombre).trim() }),
    });

    const datos = await respuesta.json();

    return new Response(JSON.stringify(datos), {
      status: respuesta.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ success: false, message: 'Error al renombrar la categoría' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};