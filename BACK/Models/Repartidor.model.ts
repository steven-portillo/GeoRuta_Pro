import { conexion } from "./Conexion.ts";
import { bcrypt } from "../Dependencies/Dependencias.ts";

interface RepartidorData {
  nombre: string;
  apellido?: string;
  email: string;
  password: string;
  telefono?: string;
}

interface RepartidorRow {
  id_usuario: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  activo: number;
  imagen_url: string | null;
  enTransito: number;
  totalAsignados: number;
}

interface RepartidorDisponibleRow {
  id_usuario: number;
  nombre: string;
  apellido: string;
  telefono: string | null;
  imagen_url: string | null;
  pedidosActivos: number;
}

const ID_ROL_PROVEEDOR = 3;

export class Repartidor {
  public _idEmpresa: number | null;
  public _ObjRepartidor: RepartidorData | null;

  constructor(idEmpresa: number | null = null, ObjRepartidor: RepartidorData | null = null) {
    this._idEmpresa = idEmpresa;
    this._ObjRepartidor = ObjRepartidor;
  }

  // crea un repartidor (rol PROVEEDOR) para la empresa del admin autenticado
  public async Crear(): Promise<{ success: boolean; message: string }> {
    const datos = this._ObjRepartidor;
    if (!this._idEmpresa || !datos) return { success: false, message: "Datos incompletos" };

    try {
      const { rows: existentes } = await conexion.execute(
        `SELECT id_usuario FROM usuarios WHERE email = ?`,
        [datos.email],
      );
      if ((existentes?.length ?? 0) > 0) {
        return { success: false, message: "El correo ya está registrado" };
      }

      const passwordHasheado = await bcrypt.hash(datos.password);

      await conexion.execute(
        `INSERT INTO usuarios (id_empresa, id_rol, nombre, apellido, email, password_hash, telefono, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          this._idEmpresa,
          ID_ROL_PROVEEDOR,
          datos.nombre,
          datos.apellido ?? "",
          datos.email,
          passwordHasheado,
          datos.telefono ?? null,
        ],
      );

      return { success: true, message: "Repartidor creado correctamente" };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible crear el repartidor" };
    }
  }

  // lista todos los repartidores de la empresa, con sus pedidos en transito y totales asignados
  public async ObtenerPorEmpresa(): Promise<{ success: boolean; message: string; data?: unknown[] }> {
    if (!this._idEmpresa) return { success: false, message: "Empresa no identificada" };

    try {
      const { rows } = await conexion.execute(
        `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.telefono, u.activo, u.imagen_url,
                (SELECT COUNT(*) FROM asignacion_pedido ap
                 INNER JOIN pedidos p ON ap.id_pedido = p.id_pedido
                 INNER JOIN estados_pedido ep ON p.id_estado = ep.id_estado
                 WHERE ap.id_proveedor = u.id_usuario
                   AND ep.nombre_estado IN ('En transito', 'En tránsito')) AS enTransito,
                (SELECT COUNT(*) FROM asignacion_pedido ap WHERE ap.id_proveedor = u.id_usuario) AS totalAsignados
         FROM usuarios u
         WHERE u.id_empresa = ? AND u.id_rol = ?
         ORDER BY u.nombre`,
        [this._idEmpresa, ID_ROL_PROVEEDOR],
      );

      const repartidores = (rows as RepartidorRow[]).map((fila) => ({
        id: fila.id_usuario,
        nombre: fila.nombre,
        apellido: fila.apellido,
        email: fila.email,
        telefono: fila.telefono ?? "",
        activo: Boolean(fila.activo),
        imagenUrl: fila.imagen_url ?? "",
        enTransito: fila.enTransito,
        totalAsignados: fila.totalAsignados,
      }));

      return { success: true, message: "Repartidores obtenidos", data: repartidores };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener los repartidores" };
    }
  }

  // lista solo repartidores activos y sin pedidos activos (listos para asignar)
  public async ObtenerDisponibles(): Promise<{ success: boolean; message: string; data?: unknown[] }> {
    if (!this._idEmpresa) return { success: false, message: "Empresa no identificada" };

    try {
      const { rows } = await conexion.execute(
        `SELECT u.id_usuario, u.nombre, u.apellido, u.telefono, u.imagen_url,
                (SELECT COUNT(*) FROM asignacion_pedido ap
                 INNER JOIN pedidos p ON ap.id_pedido = p.id_pedido
                 INNER JOIN estados_pedido ep ON p.id_estado = ep.id_estado
                 WHERE ap.id_proveedor = u.id_usuario
                   AND ep.nombre_estado NOT IN ('Entregado', 'Cancelado')) AS pedidosActivos
         FROM usuarios u
         WHERE u.id_empresa = ? AND u.id_rol = ? AND u.activo = 1
         ORDER BY u.nombre`,
        [this._idEmpresa, ID_ROL_PROVEEDOR],
      );

      const disponibles = (rows as RepartidorDisponibleRow[]).map((fila) => ({
        id: fila.id_usuario,
        nombre: fila.nombre,
        apellido: fila.apellido,
        telefono: fila.telefono ?? "",
        imagenUrl: fila.imagen_url ?? "",
        pedidosActivos: fila.pedidosActivos,
        disponible: fila.pedidosActivos === 0,
      }));

      return { success: true, message: "Repartidores disponibles obtenidos", data: disponibles };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener los repartidores disponibles" };
    }
  }
}