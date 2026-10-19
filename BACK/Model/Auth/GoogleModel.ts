// Model/Auth/GoogleModel.ts
import { conexion } from "../conexion.ts"; // usa el mismo nombre/import que tu UsuarioModel.ts
import { crearToken } from "../../Helpers/Jwt.ts";

interface DatosGoogle {
  email: string;
  nombre: string;
  apellido: string;
  imagenUrl: string | null;
}

const SELECT_USUARIO = `
  SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.imagen_url, u.activo,
         r.nombre_rol AS rol, r.id_rol, u.id_empresa
  FROM usuarios u
  INNER JOIN roles r ON u.id_rol = r.id_rol
`;

export class GoogleAuth {
  static async LoginORegistrar(datos: DatosGoogle) {
    try {
      // x/mysql: query() devuelve directamente el arreglo de filas
      const encontrados = (await conexion.query(
        `${SELECT_USUARIO} WHERE u.email = ? LIMIT 1`,
        [datos.email],
      )) as any[];

      let usuario = encontrados[0];

      if (!usuario) {
        // x/mysql: execute() devuelve { affectedRows, lastInsertId }
        const resultado = await conexion.execute(
          `INSERT INTO usuarios (nombre, apellido, email, password_hash, id_rol, imagen_url, activo)
           VALUES (?, ?, ?, 'GOOGLE_AUTH', 4, ?, 1)`,
          [datos.nombre, datos.apellido || "", datos.email, datos.imagenUrl],
        );

        const nuevos = (await conexion.query(
          `${SELECT_USUARIO} WHERE u.id_usuario = ? LIMIT 1`,
          [resultado.lastInsertId],
        )) as any[];

        usuario = nuevos[0];

        if (!usuario) {
          return {
            success: false,
            message: "No se pudo crear el usuario con Google",
          };
        }
      }

      // Cuenta existente pero desactivada
      if (!usuario.activo) {
        return {
          success: false,
          message: "Tu cuenta está desactivada. Contacta al administrador.",
        };
      }

      const token = await crearToken({
        id: usuario.id_usuario,
        rol: usuario.rol,
        id_empresa: usuario.id_empresa,
      });

      return {
        success: true,
        accessToken: token,
        data: {
          id: usuario.id_usuario,
          nombreCompleto: `${usuario.nombre} ${usuario.apellido}`.trim(),
          email: usuario.email,
          rol: usuario.rol,
          idRol: usuario.id_rol,
          idEmpresa: usuario.id_empresa,
          imagenUrl: usuario.imagen_url,
        },
      };
    } catch (error) {
      console.error("GoogleAuth.LoginORegistrar:", error);
      return {
        success: false,
        message: "Error al procesar el inicio de sesión con Google",
      };
    }
  }
}