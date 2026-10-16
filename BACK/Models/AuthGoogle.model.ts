import { conexion } from "./Conexion.ts";
import { bcrypt } from "../Dependencies/Dependencias.ts";
import { GenerarToken } from "../Helpers/GenerarToken.ts";

// datos del usuario que ya verificamos con google
interface GoogleData {
  email: string;
  nombre: string;
  apellido: string;
}

interface UsuarioGoogleRow {
  id_usuario: number;
  id_empresa: number | null;
  nombre: string;
  apellido: string;
  email: string;
  imagen_url: string | null;
  activo: number;
  rol: string;
}

export class AuthGoogle {
  public _ObjGoogle: GoogleData | null;

  constructor(ObjGoogle: GoogleData | null = null) {
    this._ObjGoogle = ObjGoogle;
  }

  private async buscarPorEmail(email: string): Promise<UsuarioGoogleRow | null> {
    const { rows } = await conexion.execute(
      `SELECT u.id_usuario, u.id_empresa, u.nombre, u.apellido, u.email,
              u.imagen_url, u.activo, r.nombre_rol AS rol
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.email = ?`,
      [email],
    );

    return rows && rows.length > 0 ? (rows[0] as UsuarioGoogleRow) : null;
  }

  // inicia sesion con google; si el correo no existe, crea un CLIENTE (registro).
  // "prohibido" le dice al controller que responda 403 en vez de 500
  public async IniciarSesion(): Promise<{
    success: boolean;
    message: string;
    prohibido?: boolean;
    data?: Record<string, unknown>;
  }> {
    try {
      const datos = this._ObjGoogle;
      if (!datos) return { success: false, message: "No se recibieron datos de Google" };

      let usuario = await this.buscarPorEmail(datos.email);
      let nuevo = false;

      if (!usuario) {
        const { rows: roles } = await conexion.execute(
          `SELECT id_rol FROM roles WHERE nombre_rol = 'CLIENTE'`,
        );

        if (!roles || roles.length === 0) {
          return { success: false, message: "Error de configuración: el rol CLIENTE no existe" };
        }

        const idRolCliente = (roles[0] as { id_rol: number }).id_rol;

        // password_hash no admite null: se guarda un hash de una clave aleatoria que nadie conoce.
        // si despues el usuario quiere clave propia, usa "olvide mi contraseña"
        const hashAleatorio = await bcrypt.hash(crypto.randomUUID() + crypto.randomUUID());

        try {
          await conexion.execute(
            `INSERT INTO usuarios (id_empresa, id_rol, nombre, apellido, email, password_hash, activo, fecha_creacion)
             VALUES (NULL, ?, ?, ?, ?, ?, 1, NOW())`,
            [idRolCliente, datos.nombre, datos.apellido, datos.email, hashAleatorio],
          );
          nuevo = true;
        } catch (error) {
          // si dos peticiones crean el mismo correo a la vez, la segunda falla por el UNIQUE
          console.error(error);
        }

        usuario = await this.buscarPorEmail(datos.email);
        if (!usuario) return { success: false, message: "No fue posible crear la cuenta" };
      }

      if (!usuario.activo) {
        return { success: false, message: "El usuario se encuentra inactivo", prohibido: true };
      }

      // google solo sirve para clientes: admin, proveedor y superadmin entran con su clave
      if (usuario.rol !== "CLIENTE") {
        return {
          success: false,
          message: "Esta cuenta debe iniciar sesión con correo y contraseña",
          prohibido: true,
        };
      }

      const token = await GenerarToken(usuario.id_usuario, usuario.rol, usuario.id_empresa);

      return {
        success: true,
        message: nuevo ? "Cuenta creada con Google" : "Sesión iniciada",
        data: {
          token,
          nuevo,
          usuario: {
            id: usuario.id_usuario,
            nombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
            email: usuario.email,
            rol: usuario.rol,
            imagenUrl: usuario.imagen_url,
          },
        },
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "Error al procesar el inicio de sesión con Google" };
    }
  }
}