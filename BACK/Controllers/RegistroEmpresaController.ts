import { RouterContext } from "../Dependencies/Dependencias.ts";
import { Empresa } from "../Models/Empresa.model.ts";
import { EsquemaRegistroEmpresa } from "../Helpers/EsquemasValidacion.ts";
import { guardarLogoEmpresa } from "../Helpers/GestorArchivos.ts";
import { notificarRegistroEmpresa } from "../Helpers/EnviarNotificaciones.ts";

// registro publico de empresa + su admin inicial — equivalente a
// POST /RegistroEmpresa/RegistrarEmpresa del original (llega como form-data, no json, por el logo)
export const registrarEmpresa = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    if (!request.hasBody) {
      response.status = 400;
      response.body = { success: false, message: "No se recibió ningún dato" };
      return;
    }

    const cuerpoFormData = await request.body.formData();

    let logo: File | null = null;
    const campos: Record<string, string> = {};

    for (const [clave, valor] of cuerpoFormData.entries()) {
      if (valor instanceof File) {
        if (clave === "logo" && valor.size > 0) logo = valor;
      } else {
        campos[clave] = valor;
      }
    }

    const resultado = EsquemaRegistroEmpresa.safeParse(campos);
    if (!resultado.success) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Datos inválidos",
        errors: resultado.error.flatten().fieldErrors,
      };
      return;
    }

    const logoUrl = logo ? await guardarLogoEmpresa(logo) : null;

    const ObjEmpresa = new Empresa(null, { ...resultado.data, logoUrl });
    const resultadoRegistro = await ObjEmpresa.CrearEmpresaConAdmin();

    // avisa al admin que se registro y a los superadmin; sin await para no demorar la respuesta
    if (resultadoRegistro.success) {
      notificarRegistroEmpresa({
        nombreEmpresa: resultado.data.nombreEmpresa,
        nombre: resultado.data.nombre,
        apellido: resultado.data.apellido,
        email: resultado.data.email,
      });
    }

    response.status = resultadoRegistro.success ? 201 : 409;
    response.body = resultadoRegistro;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible completar la operación" };
  }
};