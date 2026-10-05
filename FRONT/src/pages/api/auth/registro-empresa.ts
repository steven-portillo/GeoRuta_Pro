// src/pages/api/auth/registro-empresa.ts
import type { APIRoute } from 'astro';
import { llamarBackend } from '../../../lib/Backend';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formDataRecibido = await request.formData();

    // el formulario prefija los campos del admin con "Admin" (nombreAdmin,
    // apellidoAdmin, ...) para no chocar con los de la empresa en el mismo
    // html, pero EsquemaRegistroEmpresa en el backend espera nombre/apellido/
    // email/password a secas — aqui se traduce uno a uno antes de reenviar
    const formDataBackend = new FormData();
    formDataBackend.append('nombreEmpresa', formDataRecibido.get('nombreEmpresa') ?? '');
    formDataBackend.append('descripcion', formDataRecibido.get('descripcionEmpresa') ?? '');
    formDataBackend.append('nombre', formDataRecibido.get('nombreAdmin') ?? '');
    formDataBackend.append('apellido', formDataRecibido.get('apellidoAdmin') ?? '');
    formDataBackend.append('email', formDataRecibido.get('emailAdmin') ?? '');
    formDataBackend.append('password', formDataRecibido.get('passwordAdmin') ?? '');

    // el logo es opcional: solo se reenvia si de verdad llego un archivo
    const logo = formDataRecibido.get('logoEmpresa');
    if (logo instanceof File && logo.size > 0) {
      formDataBackend.append('logo', logo);
    }

    const { status, datos } = await llamarBackend('/registro-empresa', {
      metodo: 'POST',
      cuerpo: formDataBackend,
    });

    return new Response(JSON.stringify(datos), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ success: false, message: 'No fue posible completar el registro de la empresa' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};