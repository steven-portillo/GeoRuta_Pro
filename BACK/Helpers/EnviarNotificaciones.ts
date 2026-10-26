import { enviarCorreo } from "./EnviarCorreo.ts";
import { Empresa } from "../Models/Empresa.model.ts";
import { Pedido } from "../Models/Pedido.model.ts";
import {
  type PedidoCorreoDatos,
  type PlantillaCorreo,
  plantillaAsignacionPedidoCliente,
  plantillaBienvenidaCliente,
  plantillaBienvenidaRepartidor,
  plantillaCancelacionPedidoCliente,
  plantillaConfirmacionPedidoCliente,
  plantillaEmpresaActivada,
  plantillaEmpresaDesactivada,
  plantillaEstadoPedidoCliente,
  plantillaNuevaEmpresaSuperAdmin,
  plantillaRegistroEmpresaAdmin,
} from "./PlantillasCorreo.ts";

// todas las funciones de este archivo "notificar..." nunca lanzan ni rechazan:
// un correo que falla jamas debe tumbar la operacion principal.
// por eso los controllers las llaman sin await, igual que enviarReciboEmail.

// envia una plantilla ya armada y deja un log si no salio
async function enviarPlantilla(para: string, plantilla: PlantillaCorreo): Promise<void> {
  const enviado = await enviarCorreo({
    para,
    asunto: plantilla.asunto,
    html: plantilla.html,
    texto: plantilla.texto,
  });

  if (!enviado) console.error(`no se pudo enviar el correo "${plantilla.asunto}" a ${para}`);
}

// red de seguridad para los errores al consultar la base antes de enviar
async function protegido(accion: () => Promise<void>): Promise<void> {
  try {
    await accion();
  } catch (error) {
    console.error("error preparando un correo:", error);
  }
}

// busca el pedido en la base y lo devuelve con la forma que esperan las plantillas
async function obtenerDatosPedido(idPedido: number): Promise<PedidoCorreoDatos | null> {
  const ObjPedido = new Pedido(idPedido);
  const resultado = await ObjPedido.ObtenerDatosParaCorreo();

  if (!resultado.success || !resultado.data) {
    console.error(`correo omitido: ${resultado.message} (pedido ${idPedido})`);
    return null;
  }

  return resultado.data;
}

// quita tildes y mayusculas para comparar estados ("En tránsito" y "En transito" son lo mismo)
function normalizarEstado(estado: string): string {
  return estado.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

// cliente: se registro (formulario o google)
export async function notificarRegistroCliente(email: string, nombre: string): Promise<void> {
  await protegido(async () => {
    await enviarPlantilla(email, plantillaBienvenidaCliente(nombre));
  });
}

// empresa: se registro. avisa al admin que se registro y a todos los superadmin activos
export async function notificarRegistroEmpresa(datos: {
  nombreEmpresa: string;
  nombre: string;
  apellido: string;
  email: string;
}): Promise<void> {
  await protegido(async () => {
    const nombreCompleto = `${datos.nombre} ${datos.apellido}`.trim();

    await enviarPlantilla(datos.email, plantillaRegistroEmpresaAdmin(nombreCompleto, datos.nombreEmpresa));

    const ObjEmpresa = new Empresa();
    const superadmins = await ObjEmpresa.ObtenerCorreosSuperAdmin();
    if (!superadmins.success || !superadmins.data) return;

    const plantilla = plantillaNuevaEmpresaSuperAdmin(
      datos.nombreEmpresa,
      datos.nombre,
      datos.apellido,
      datos.email,
    );
    for (const emailSuperAdmin of superadmins.data) {
      await enviarPlantilla(emailSuperAdmin, plantilla);
    }
  });
}

// empresa: el superadmin la activo o desactivo. avisa al admin de esa empresa
export async function notificarCambioEstadoEmpresa(idEmpresa: number, activada: boolean): Promise<void> {
  await protegido(async () => {
    const ObjEmpresa = new Empresa();
    const resultado = await ObjEmpresa.ObtenerDatosParaCorreo(idEmpresa);
    if (!resultado.success || !resultado.data?.emailAdmin) return;

    const { nombreEmpresa, nombreAdmin, apellidoAdmin, emailAdmin } = resultado.data;
    const nombreCompleto = `${nombreAdmin ?? ""} ${apellidoAdmin ?? ""}`.trim();

    const plantilla = activada
      ? plantillaEmpresaActivada(nombreCompleto, nombreEmpresa)
      : plantillaEmpresaDesactivada(nombreCompleto, nombreEmpresa);

    await enviarPlantilla(emailAdmin, plantilla);
  });
}

// repartidor: un admin lo acaba de crear
export async function notificarNuevoRepartidor(
  idEmpresa: number,
  nombre: string,
  apellido: string | undefined,
  email: string,
): Promise<void> {
  await protegido(async () => {
    const ObjEmpresa = new Empresa();
    const resultado = await ObjEmpresa.ObtenerDatosParaCorreo(idEmpresa);
    if (!resultado.success || !resultado.data) return;

    const nombreCompleto = `${nombre} ${apellido ?? ""}`.trim();
    await enviarPlantilla(email, plantillaBienvenidaRepartidor(nombreCompleto, resultado.data.nombreEmpresa));
  });
}

// pedido: el cliente lo acaba de crear
export async function notificarPedidoCreado(idPedido: number): Promise<void> {
  await protegido(async () => {
    const pedido = await obtenerDatosPedido(idPedido);
    if (!pedido) return;

    await enviarPlantilla(pedido.emailCliente, plantillaConfirmacionPedidoCliente(pedido));
  });
}

// pedido: el admin le asigno un repartidor
export async function notificarAsignacionPedido(idPedido: number): Promise<void> {
  await protegido(async () => {
    const pedido = await obtenerDatosPedido(idPedido);
    if (!pedido) return;

    await enviarPlantilla(pedido.emailCliente, plantillaAsignacionPedidoCliente(pedido));
  });
}

// pedido: cambio de estado. solo se avisa de "En transito", "Entregado" y "Cancelado";
// cualquier otro estado se ignora sin consultar la base
export async function notificarCambioEstadoPedido(idPedido: number, estado: string): Promise<void> {
  const clave = normalizarEstado(estado);
  if (clave !== "en transito" && clave !== "entregado" && clave !== "cancelado") return;

  await protegido(async () => {
    const pedido = await obtenerDatosPedido(idPedido);
    if (!pedido) return;

    const plantilla = clave === "cancelado"
      ? plantillaCancelacionPedidoCliente(pedido)
      : plantillaEstadoPedidoCliente(pedido, clave === "entregado" ? "Entregado" : "En transito");

    await enviarPlantilla(pedido.emailCliente, plantilla);
  });
}