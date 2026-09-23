// administra las "salas" de tracking en memoria: una sala por pedido, igual al
// patron Groups.AddToGroupAsync("pedido-{id}") de RastreoHub.cs en el proyecto original.
// al ser un Map en memoria del proceso, si en algún momento corres varias instancias
// del backend detrás de un balanceador hay que pasar esto a un pub/sub externo (Redis);
// para el alcance actual del proyecto, un Map basta.

type Sala = Set<WebSocket>;

const salas = new Map<string, Sala>();

function nombreSala(idPedido: string): string {
  return `pedido-${idPedido}`;
}

export function unirseASala(idPedido: string, socket: WebSocket): void {
  const clave = nombreSala(idPedido);
  if (!salas.has(clave)) salas.set(clave, new Set());
  salas.get(clave)!.add(socket);
}

export function salirDeSala(idPedido: string, socket: WebSocket): void {
  const clave = nombreSala(idPedido);
  const sala = salas.get(clave);
  if (!sala) return;
  sala.delete(socket);
  if (sala.size === 0) salas.delete(clave);
}

// envia a todos los sockets de la sala EXCEPTO al que origino el mensaje,
// igual a Clients.OthersInGroup(...) en el hub original
export function enviarAOtrosEnSala(idPedido: string, origen: WebSocket, mensaje: unknown): void {
  const clave = nombreSala(idPedido);
  const sala = salas.get(clave);
  if (!sala) return;

  const texto = JSON.stringify(mensaje);
  for (const socket of sala) {
    if (socket !== origen && socket.readyState === WebSocket.OPEN) {
      socket.send(texto);
    }
  }
}