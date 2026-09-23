import { conexion } from "./Conexion.ts";
import { bcrypt } from "../Dependencies/Dependencias.ts";
import { GenerarToken } from "../Helpers/GenerarToken.ts";

interface LoginData {
  email: string;
  password: string;
}

// datos del autoregistro publico — siempre crea un CLIENTE sin empresa asociada
interface RegistroData {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
}

interface UsuarioConRolRow {
  id_usuario: number;
  id_empresa: number | null;
  nombre: string;
  apellido: string;
  email: string;
  password_hash: string;
  imagen_url: string | null;
  activo: number;
  rol: string;
}
interface ActualizarPerfilData {
  nombre: string;
  apellido: string;
  email: string;
  empresaNombre?: string;
  empresaDesc?: string;
}

interface PerfilUsuarioRow {
  nombre: string;
  apellido: string;
  email: string;
  imagen_url: string | null;
  empresa_nombre: string | null;
  empresa_desc: string | null;
  empresa_logo: string | null;
}
interface ActualizarPerfilProveedorData {
  nombre: string;
  apellido?: string;
  email: string;
  telefono?: string;
}

interface DatosPersonalesClienteData {
  nombre: string;
  apellido: string;
  email: string;
}

export class Usuario {
  public _idUsuario: number | null;
  public _ObjLoginUsuario: LoginData | null;
  public _ObjRegistro: RegistroData | null;
  public _ObjActualizarPerfil: ActualizarPerfilData | null;
  public _ObjActualizarPerfilProveedor: ActualizarPerfilProveedorData | null;
  public _ObjDatosPersonalesCliente: DatosPersonalesClienteData | null; // nuevo

  constructor(
    idUsuario: number | null = null,
    ObjLoginUsuario: LoginData | null = null,
    ObjRegistro: RegistroData | null = null,
    ObjActualizarPerfil: ActualizarPerfilData | null = null,
    ObjActualizarPerfilProveedor: ActualizarPerfilProveedorData | null = null,
    ObjDatosPersonalesCliente: DatosPersonalesClienteData | null = null, // nuevo
  ) {
    this._idUsuario = idUsuario;
    this._ObjLoginUsuario = ObjLoginUsuario;
    this._ObjRegistro = ObjRegistro;
    this._ObjActualizarPerfil = ObjActualizarPerfil;
    this._ObjActualizarPerfilProveedor = ObjActualizarPerfilProveedor;
    this._ObjDatosPersonalesCliente = ObjDatosPersonalesCliente; // nuevo
  }
  public async CrearUsuario(): Promise<{ success: boolean; message: string }> {
    try {
      const datos = this._ObjRegistro;
      if (!datos) return { success: false, message: "No se recibieron datos de registro" };

      const { rows: existentes } = await conexion.execute(
        `SELECT id_usuario FROM usuarios WHERE email = ?`,
        [datos.email],
      );

      if ((existentes?.length ?? 0) > 0) {
        return { success: false, message: "Este correo ya está registrado" };
      }

      const { rows: rolesCliente } = await conexion.execute(
        `SELECT id_rol FROM roles WHERE nombre_rol = 'CLIENTE'`,
      );

      if (!rolesCliente || rolesCliente.length === 0) {
        return { success: false, message: "Error de configuración: el rol CLIENTE no existe" };
      }

      const idRolCliente = (rolesCliente[0] as { id_rol: number }).id_rol;
      const passwordHasheado = await bcrypt.hash(datos.password);

      await conexion.execute(
        `INSERT INTO usuarios (id_empresa, id_rol, nombre, apellido, email, password_hash, activo, fecha_creacion)
         VALUES (NULL, ?, ?, ?, ?, ?, 1, NOW())`,
        [idRolCliente, datos.nombre, datos.apellido, datos.email, passwordHasheado],
      );

      return { success: true, message: "Usuario registrado correctamente" };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible registrar el usuario" };
    }
  }

  // valida credenciales y, si son correctas, genera el jwt firmado
  public async iniciarSesion(): Promise<
    | { success: true; message: string; data: Record<string, unknown> }
    | { success: false; message: string; data?: undefined }
  > {
    try {
      const email = this._ObjLoginUsuario?.email;
      const password = this._ObjLoginUsuario?.password;

      const { rows: usuarios } = await conexion.execute(
        `SELECT u.id_usuario, u.id_empresa, u.nombre, u.apellido, u.email,
                u.password_hash, u.imagen_url, u.activo, r.nombre_rol AS rol
         FROM usuarios u
         JOIN roles r ON r.id_rol = u.id_rol
         WHERE u.email = ?`,
        [email],
      );

      if (!usuarios || usuarios.length === 0) {
        return { success: false, message: "Email o contraseña incorrectos" };
      }

      const usuario = usuarios[0] as UsuarioConRolRow;

      if (!usuario.activo) {
        return { success: false, message: "El usuario se encuentra inactivo" };
      }

      const passwordValido = await bcrypt.compare(password ?? "", usuario.password_hash);

      if (!passwordValido) {
        return { success: false, message: "Email o contraseña incorrectos" };
      }

      const token = await GenerarToken(usuario.id_usuario, usuario.rol, usuario.id_empresa);

      return {
        success: true,
        message: "Sesión iniciada",
        data: {
          token,
          usuario: {
            id: usuario.id_usuario,
            nombre: `${usuario.nombre} ${usuario.apellido}`,
            email: usuario.email,
            rol: usuario.rol,
            imagenUrl: usuario.imagen_url,
          },
        },
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "Error al procesar el inicio de sesión" };
    }
  }
  // trae los datos de perfil del usuario junto con los de su empresa (si tiene)
  public async ObtenerPerfil(): Promise<
    { success: true; message: string; data: Record<string, unknown> } | { success: false; message: string }
  > {
    try {
      if (!this._idUsuario) return { success: false, message: "Usuario no identificado" };

      const { rows } = await conexion.execute(
        `SELECT u.nombre, u.apellido, u.email, u.imagen_url,
                e.nombre AS empresa_nombre, e.descripcion AS empresa_desc, e.logo_url AS empresa_logo
         FROM usuarios u
         LEFT JOIN empresas e ON u.id_empresa = e.id_empresa
         WHERE u.id_usuario = ?`,
        [this._idUsuario],
      );

      if (!rows || rows.length === 0) {
        return { success: false, message: "Usuario no encontrado" };
      }

      const fila = rows[0] as PerfilUsuarioRow;

      return {
        success: true,
        message: "Perfil obtenido",
        data: {
          nombre: fila.nombre,
          apellido: fila.apellido,
          email: fila.email,
          imagenUrl: fila.imagen_url ?? "",
          empresaNombre: fila.empresa_nombre ?? "",
          empresaDesc: fila.empresa_desc ?? "",
          empresaLogo: fila.empresa_logo ?? "",
        },
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener el perfil" };
    }
  }

  // actualiza los datos personales del admin y, si vienen, los de su empresa
  public async ActualizarPerfil(): Promise<{ success: boolean; message: string }> {
    const datos = this._ObjActualizarPerfil;
    if (!this._idUsuario || !datos) return { success: false, message: "Datos incompletos" };

    try {
      const { rows: enUso } = await conexion.execute(
        `SELECT id_usuario FROM usuarios WHERE email = ? AND id_usuario != ?`,
        [datos.email, this._idUsuario],
      );
      if ((enUso?.length ?? 0) > 0) {
        return { success: false, message: "Este correo ya está en uso" };
      }

      await conexion.execute(
        `UPDATE usuarios SET nombre = ?, apellido = ?, email = ? WHERE id_usuario = ?`,
        [datos.nombre, datos.apellido, datos.email, this._idUsuario],
      );

      if (datos.empresaNombre) {
        await conexion.execute(
          `UPDATE empresas SET nombre = ?, descripcion = ?
           WHERE id_empresa = (SELECT id_empresa FROM usuarios WHERE id_usuario = ?)`,
          [datos.empresaNombre, datos.empresaDesc ?? "", this._idUsuario],
        );
      }

      return { success: true, message: "Perfil actualizado correctamente" };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible actualizar el perfil" };
    }
  }

  // actualiza solo la foto de perfil; se usa una vez ya se guardo el archivo en disco
  public async ActualizarImagenPerfil(rutaImagen: string): Promise<{ success: boolean; message: string }> {
    if (!this._idUsuario) return { success: false, message: "Usuario no identificado" };

    try {
      await conexion.execute(`UPDATE usuarios SET imagen_url = ? WHERE id_usuario = ?`, [
        rutaImagen,
        this._idUsuario,
      ]);
      return { success: true, message: "Imagen actualizada" };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible actualizar la imagen" };
    }
  }
    // perfil propio del repartidor: incluye telefono, no incluye datos de empresa para editar
  public async ObtenerPerfilProveedor(): Promise<
    { success: true; message: string; data: Record<string, unknown> } | { success: false; message: string }
  > {
    try {
      if (!this._idUsuario) return { success: false, message: "Usuario no identificado" };

      const { rows } = await conexion.execute(
        `SELECT u.nombre, u.apellido, u.email, u.telefono, u.imagen_url,
                e.nombre AS empresa_nombre
         FROM usuarios u
         LEFT JOIN empresas e ON u.id_empresa = e.id_empresa
         WHERE u.id_usuario = ?`,
        [this._idUsuario],
      );

      if (!rows || rows.length === 0) {
        return { success: false, message: "Usuario no encontrado" };
      }

      const fila = rows[0] as {
        nombre: string; apellido: string; email: string;
        telefono: string | null; imagen_url: string | null; empresa_nombre: string | null;
      };

      return {
        success: true,
        message: "Perfil obtenido",
        data: {
          nombre: fila.nombre,
          apellido: fila.apellido,
          email: fila.email,
          telefono: fila.telefono ?? "",
          imagenUrl: fila.imagen_url ?? "",
          empresaNombre: fila.empresa_nombre ?? "",
        },
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener el perfil" };
    }
  }

  public async ActualizarPerfilProveedor(): Promise<{ success: boolean; message: string }> {
    const datos = this._ObjActualizarPerfilProveedor;
    if (!this._idUsuario || !datos) return { success: false, message: "Datos incompletos" };

    try {
      const { rows: enUso } = await conexion.execute(
        `SELECT id_usuario FROM usuarios WHERE email = ? AND id_usuario != ?`,
        [datos.email, this._idUsuario],
      );
      if ((enUso?.length ?? 0) > 0) {
        return { success: false, message: "Este correo ya está en uso" };
      }

      await conexion.execute(
        `UPDATE usuarios SET nombre = ?, apellido = ?, email = ?, telefono = ? WHERE id_usuario = ?`,
        [datos.nombre, datos.apellido ?? "", datos.email, datos.telefono ?? null, this._idUsuario],
      );

      return { success: true, message: "Perfil actualizado correctamente" };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible actualizar el perfil" };
    }
    
  }
    // perfil basico del cliente para su vista de inicio (mas liviano que ObtenerDatosCuenta)
  public async ObtenerPerfilCliente(): Promise<
    { success: true; message: string; data: Record<string, unknown> } | { success: false; message: string }
  > {
    try {
      if (!this._idUsuario) return { success: false, message: "Usuario no identificado" };

      const { rows } = await conexion.execute(
        `SELECT nombre, apellido, email, imagen_url FROM usuarios WHERE id_usuario = ?`,
        [this._idUsuario],
      );

      if (!rows || rows.length === 0) return { success: false, message: "Usuario no encontrado" };

      const fila = rows[0] as { nombre: string; apellido: string; email: string; imagen_url: string | null };

      return {
        success: true,
        message: "Perfil obtenido",
        data: {
          nombre: fila.nombre,
          apellido: fila.apellido,
          email: fila.email,
          imagenUrl: fila.imagen_url ?? "/img/default-avatar.png",
        },
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener el perfil" };
    }
  }

  // datos extendidos de cuenta: estado, fecha de registro (cruda, la formatea Astro)
  public async ObtenerDatosCuenta(): Promise<
    { success: true; message: string; data: Record<string, unknown> } | { success: false; message: string }
  > {
    try {
      if (!this._idUsuario) return { success: false, message: "Usuario no identificado" };

      const { rows } = await conexion.execute(
        `SELECT nombre, apellido, email, imagen_url, activo, fecha_creacion FROM usuarios WHERE id_usuario = ?`,
        [this._idUsuario],
      );

      if (!rows || rows.length === 0) return { success: false, message: "Usuario no encontrado" };

      const fila = rows[0] as {
        nombre: string; apellido: string; email: string;
        imagen_url: string | null; activo: number; fecha_creacion: Date;
      };
      const activo = Boolean(fila.activo);

      return {
        success: true,
        message: "Datos obtenidos",
        data: {
          nombre: fila.nombre,
          apellido: fila.apellido,
          email: fila.email,
          imagenUrl: fila.imagen_url ?? "",
          activo,
          fechaCreacion: fila.fecha_creacion,
          estadoCuenta: activo ? "Activa" : "Inactiva",
        },
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener los datos de la cuenta" };
    }
  }

  public async ActualizarDatosCliente(): Promise<{ success: boolean; message: string }> {
    const datos = this._ObjDatosPersonalesCliente;
    if (!this._idUsuario || !datos) return { success: false, message: "Datos incompletos" };

    try {
      const { rows: enUso } = await conexion.execute(
        `SELECT id_usuario FROM usuarios WHERE email = ? AND id_usuario != ?`,
        [datos.email, this._idUsuario],
      );
      if ((enUso?.length ?? 0) > 0) {
        return { success: false, message: "Este correo ya está en uso por otra cuenta" };
      }

      await conexion.execute(
        `UPDATE usuarios SET nombre = ?, apellido = ?, email = ? WHERE id_usuario = ?`,
        [datos.nombre, datos.apellido, datos.email, this._idUsuario],
      );

      return { success: true, message: "Datos actualizados correctamente" };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible actualizar los datos" };
    }
  }

    // total de usuarios de la plataforma, excluyendo SUPERADMIN (para el dashboard de superadmin)
  public async ObtenerTotalUsuarios(): Promise<{ success: boolean; message: string; data?: { total: number } }> {
    try {
      const { rows } = await conexion.execute(
        `SELECT COUNT(*) AS total FROM usuarios u
         INNER JOIN roles r ON u.id_rol = r.id_rol
         WHERE r.nombre_rol != 'SUPERADMIN'`,
      );

      return { success: true, message: "Total obtenido", data: { total: (rows?.[0] as { total: number })?.total ?? 0 } };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener el total de usuarios" };
    }
  }
  
}
