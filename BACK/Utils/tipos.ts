export interface SesionMapa {
  id: number;
  rol: string;
  idEmpresa: number | null;
}

interface ClaimsTokenMapa {
  sub?: unknown;
  rol?: unknown;
  id_empresa?: unknown;
}

export function leerSesionMapa(value: unknown): SesionMapa | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const claims = value as ClaimsTokenMapa;
  const id = typeof claims.sub === "string" ? Number(claims.sub) : NaN;
  if (!Number.isSafeInteger(id) || id <= 0 || typeof claims.rol !== "string") {
    return null;
  }
  const idEmpresa = claims.id_empresa === null ||
      claims.id_empresa === undefined
    ? null
    : Number(claims.id_empresa);
  if (
    idEmpresa !== null &&
    (!Number.isSafeInteger(idEmpresa) || idEmpresa <= 0)
  ) {
    return null;
  }
  return { id, rol: claims.rol, idEmpresa };
}
