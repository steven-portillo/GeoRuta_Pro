// Mapeo id_rol -> nombre_rol, igual a la tabla `roles`
export const ID_A_ROL: Record<number, string> = {
  1: "SUPERADMIN",
  2: "ADMIN",
  3: "PROVEEDOR",
  4: "CLIENTE",
};

export const Rol = {
  SUPERADMIN: "SUPERADMIN",
  ADMIN: "ADMIN",
  PROVEEDOR: "PROVEEDOR",
  CLIENTE: "CLIENTE",
} as const;