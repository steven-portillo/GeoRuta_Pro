import { enviarCorreo } from "./EnviarCorreo.ts";
import { plantillaRecuperacionPassword } from "./PlantillasCorreo.ts";

// arma y envia el correo con el codigo de recuperacion; devuelve true si salio.
// la plantilla ya escapa el nombre (lo escribio el usuario al registrarse)
export async function enviarCodigoRecuperacion(
  email: string,
  nombre: string,
  codigo: string,
  minutosVigencia: number,
): Promise<boolean> {
  const plantilla = plantillaRecuperacionPassword(nombre, codigo, minutosVigencia);

  return await enviarCorreo({
    para: email,
    asunto: plantilla.asunto,
    html: plantilla.html,
    texto: plantilla.texto,
  });
}