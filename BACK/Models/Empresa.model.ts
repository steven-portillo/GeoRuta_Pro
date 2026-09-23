import { conexion } from "./Conexion.ts";
import { bcrypt } from "../Dependencies/Dependencias.ts";

interface RegistroEmpresaData {
  nombreEmpresa: string;
  descripcion?: string;
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  logoUrl: string | null;
}

// categorias base que se crean automaticamente para toda empresa nueva,
// igual que en el RegistroEmpresaController original
export const CATEGORIAS_BASE = ["Abarrotes", "Bebidas", "Aseo", "Lácteos", "Carnes", "Panadería"];

export class Empresa {
  public _idEmpresa: number | null;
  public _ObjRegistroEmpresa: RegistroEmpresaData | null;

  constructor(
    idEmpresa: number | null = null,
    ObjRegistroEmpresa: RegistroEmpresaData | null = null,
  ) {
    this._idEmpresa = idEmpresa;
    this._ObjRegistroEmpresa = ObjRegistroEmpresa;
  }

  // crea la empresa (estado 0 = pendiente de aprobacion), sus categorias base
  // y su usuario ADMIN (activo 0, hasta que se apruebe la empresa)
  public async CrearEmpresaConAdmin(): Promise<{ success: boolean; message: string }> {
    const datos = this._ObjRegistroEmpresa;
    if (!datos) return { success: false, message: "No se recibieron datos de registro" };

    try {
      const { rows: existentes } = await conexion.execute(
        `SELECT id_usuario FROM usuarios WHERE email = ?`,
        [datos.email],
      );
      if ((existentes?.length ?? 0) > 0) {
        return { success: false, message: "Este correo ya está registrado" };
      }

      const { rows: rolesAdmin } = await conexion.execute(
        `SELECT id_rol FROM roles WHERE nombre_rol = 'ADMIN'`,
      );
      if (!rolesAdmin || rolesAdmin.length === 0) {
        return { success: false, message: "Error de configuración: el rol ADMIN no existe" };
      }
      const idRolAdmin = (rolesAdmin[0] as { id_rol: number }).id_rol;

      const { lastInsertId: idEmpresa } = await conexion.execute(
        `INSERT INTO empresas (nombre, descripcion, logo_url, estado)
         VALUES (?, ?, ?, 0)`,
        [datos.nombreEmpresa, datos.descripcion ?? "", datos.logoUrl],
      );

      const valoresCategorias = CATEGORIAS_BASE.map(() => "(?, ?, 1)").join(", ");
      const parametrosCategorias = CATEGORIAS_BASE.flatMap((nombre) => [idEmpresa, nombre]);
      await conexion.execute(
        `INSERT INTO categorias (id_empresa, nombre, activo) VALUES ${valoresCategorias}`,
        parametrosCategorias,
      );

      const passwordHasheado = await bcrypt.hash(datos.password);
      await conexion.execute(
        `INSERT INTO usuarios (id_empresa, id_rol, nombre, apellido, email, password_hash, activo, fecha_creacion)
         VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
        [idEmpresa, idRolAdmin, datos.nombre, datos.apellido, datos.email, passwordHasheado],
      );

      return {
        success: true,
        message: "Empresa registrada. Espera la aprobación del administrador.",
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible registrar la empresa" };
    }
  }

    // actualiza el logo de la empresa (llamado desde el perfil del admin, con idEmpresa ya conocido)
  public async ActualizarLogo(rutaLogo: string): Promise<{ success: boolean; message: string }> {
    if (!this._idEmpresa) return { success: false, message: "Empresa no identificada" };

    try {
      await conexion.execute(`UPDATE empresas SET logo_url = ? WHERE id_empresa = ?`, [
        rutaLogo,
        this._idEmpresa,
      ]);
      return { success: true, message: "Logo actualizado" };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible actualizar el logo" };
    }
  }
    // listado publico de empresas activas, para el catalogo del cliente
  public async ObtenerActivas(): Promise<{ success: boolean; message: string; data?: unknown[] }> {
    try {
      const { rows } = await conexion.execute(
        `SELECT id_empresa, nombre, descripcion, logo_url
         FROM empresas WHERE estado = 1 ORDER BY fecha_creacion DESC`,
      );

      const empresas = (rows as Record<string, unknown>[]).map((fila) => ({
        id: fila.id_empresa,
        nombre: fila.nombre,
        descripcion: fila.descripcion ?? "",
        logoUrl: fila.logo_url ?? "",
      }));

      return { success: true, message: "Empresas obtenidas", data: empresas };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener las empresas" };
    }
  }
    // lista todas las empresas con los datos de su admin, filtrable por nombre
  public async ObtenerTodas(busqueda?: string): Promise<{ success: boolean; message: string; data?: unknown[] }> {
    try {
      const condicionBusqueda = busqueda ? `AND e.nombre LIKE CONCAT('%', ?, '%')` : "";
      const parametros = busqueda ? [busqueda] : [];

      const { rows } = await conexion.execute(
        `SELECT
           e.id_empresa, e.nombre, e.descripcion, e.logo_url, e.estado, e.fecha_creacion,
           u.nombre AS admin_nombre, u.apellido AS admin_apellido, u.email AS admin_email
         FROM empresas e
         LEFT JOIN usuarios u
           ON u.id_empresa = e.id_empresa
           AND u.id_rol = (SELECT id_rol FROM roles WHERE nombre_rol = 'ADMIN')
         WHERE 1 = 1 ${condicionBusqueda}
         ORDER BY e.fecha_creacion DESC`,
        parametros,
      );

      const empresas = (rows as Record<string, unknown>[]).map((fila) => ({
        idEmpresa: fila.id_empresa,
        nombre: fila.nombre,
        descripcion: fila.descripcion,
        logoUrl: fila.logo_url ?? null,
        estado: Boolean(fila.estado),
        fechaCreacion: fila.fecha_creacion,
        adminNombre: fila.admin_nombre ? `${fila.admin_nombre} ${fila.admin_apellido}` : "—",
        adminEmail: fila.admin_email ?? "—",
      }));

      return { success: true, message: "Empresas obtenidas", data: empresas };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener las empresas" };
    }
  }

  // activa/desactiva la empresa Y a su admin en un solo paso — un admin sin empresa activa no debe poder operar
  public async CambiarEstado(idEmpresa: number, activar: boolean): Promise<{ success: boolean; message: string }> {
    try {
      await conexion.transaction(async (conn) => {
        await conn.execute(`UPDATE empresas SET estado = ? WHERE id_empresa = ?`, [activar ? 1 : 0, idEmpresa]);

        await conn.execute(
          `UPDATE usuarios SET activo = ?
           WHERE id_empresa = ? AND id_rol = (SELECT id_rol FROM roles WHERE nombre_rol = 'ADMIN')`,
          [activar ? 1 : 0, idEmpresa],
        );
      });

      return { success: true, message: `Empresa ${activar ? "activada" : "desactivada"} correctamente` };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible cambiar el estado de la empresa" };
    }
  }
}