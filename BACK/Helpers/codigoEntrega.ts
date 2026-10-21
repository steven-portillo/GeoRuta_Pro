// genera el codigo de 6 digitos que el cliente le da al repartidor
export const MAX_INTENTOS_CODIGO = 5;

export const generarCodigoEntrega = (): string => {
  // crypto en vez de math.random para que el codigo no sea predecible
  const numero = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  // padStart conserva los ceros a la izquierda (ej: 004821)
  return numero.toString().padStart(6, "0");
};