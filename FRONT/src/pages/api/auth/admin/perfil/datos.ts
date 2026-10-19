import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const token = obtenerToken(cookies);

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const respuesta = await llamarBackend('/api/perfil', { token });

    return new Response(JSON.stringify(respuesta.datos), {
      status: respuesta.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ success: false, message: 'Error al obtener el perfil' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

const guardarDatos: APIRoute = async ({ request, cookies }) => {
  try {
    const token = obtenerToken(cookies);

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const tipoContenido = request.headers.get('content-type') ?? '';
    const datos = tipoContenido.includes('application/json')
      ? await request.json()
      : await request.formData();
    const datosPersonales = new FormData();
    const camposPersonales = ['nombre', 'apellido', 'email', 'foto'];
    for (const campo of camposPersonales) {
      const valor = datos instanceof FormData ? datos.get(campo) : datos[campo];
      if (valor !== undefined && valor !== null && valor !== '') {
        datosPersonales.set(campo, valor);
      }
    }
    const respuestaPerfil = datosPersonales.keys().next().done
      ? { status: 200, datos: { success: true, message: '' } }
      : await llamarBackend('/api/perfil', {
        metodo: 'PUT',
        cuerpo: datosPersonales,
        token,
      });

    const cuerpo = datos instanceof FormData ? {} : datos;
    const nombreEmpresa = String(cuerpo.empresaNombre ?? '').trim();
    const descripcionEmpresa = String(cuerpo.empresaDesc ?? '').trim();
    if (!respuestaPerfil.datos.success) {
      return new Response(JSON.stringify(respuestaPerfil.datos), {
        status: respuestaPerfil.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (nombreEmpresa || descripcionEmpresa) {
      const formEmpresa = new FormData();
      if (nombreEmpresa) formEmpresa.set('nombre', nombreEmpresa);
      formEmpresa.set('descripcion', descripcionEmpresa);
      const respuestaEmpresa = await llamarBackend('/api/admin/empresa', {
        metodo: 'PUT',
        cuerpo: formEmpresa,
        token,
      });
      if (!respuestaEmpresa.datos.success) {
        return new Response(JSON.stringify({
          success: false,
          message: `Los datos personales se guardaron, pero no se pudo actualizar la empresa: ${respuestaEmpresa.datos.message ?? 'Error del backend'}`,
        }), {
          status: respuestaEmpresa.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: nombreEmpresa || descripcionEmpresa
        ? 'Perfil y datos de la empresa actualizados correctamente'
        : respuestaPerfil.datos.message,
    }), {
      status: respuestaPerfil.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ success: false, message: 'Error al editar el perfil' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

export const POST = guardarDatos;
export const PUT = guardarDatos;