import { z } from "../Dependencies/Dependencias.ts";

// esquema de validacion para el login
export const EsquemaLogin = z.object({
  email: z.string().email("el correo no es válido"),
  password: z.string().min(1, "la contraseña es obligatoria"),
});

// esquema de validacion para el autoregistro publico (siempre crea un CLIENTE)
export const EsquemaRegistro = z.object({
  nombre: z.string().min(2, "el nombre debe tener al menos 2 caracteres").max(100),
  apellido: z.string().min(2, "el apellido debe tener al menos 2 caracteres").max(100),
  email: z.string().email("el correo no es válido"),
  password: z.string().min(8, "la contraseña debe tener al menos 8 caracteres"),
});
// esquema para el registro de empresa + su admin inicial
// (el logo se valida aparte porque llega como File, no como campo de texto)
export const EsquemaRegistroEmpresa = z.object({
  nombreEmpresa: z.string().min(2, "el nombre de la empresa debe tener al menos 2 caracteres").max(150),
  descripcion: z.string().max(500).optional(),
  nombre: z.string().min(2, "el nombre debe tener al menos 2 caracteres").max(100),
  apellido: z.string().min(2, "el apellido debe tener al menos 2 caracteres").max(100),
  email: z.string().email("el correo no es válido"),
  password: z.string().min(8, "la contraseña debe tener al menos 8 caracteres"),
});

// esquema para actualizar el perfil del admin (datos personales + opcionalmente los de su empresa)
export const EsquemaActualizarPerfilAdmin = z.object({
  nombre: z.string().min(2, "el nombre debe tener al menos 2 caracteres").max(100),
  apellido: z.string().min(2, "el apellido debe tener al menos 2 caracteres").max(100),
  email: z.string().email("el correo no es válido"),
  empresaNombre: z.string().max(150).optional(),
  empresaDesc: z.string().max(500).optional(),
});

// guardarProducto llega como form-data (por la imagen opcional), por eso z.coerce en los numeros
export const EsquemaGuardarProducto = z.object({
  nombre: z.string().min(2, "el nombre debe tener al menos 2 caracteres").max(150),
  descripcion: z.string().max(500).optional(),
  idCategoria: z.coerce.number().int().positive("selecciona una categoría"),
  precio: z.coerce.number().positive("el precio debe ser mayor a 0"),
  stock: z.coerce.number().int().nonnegative("el stock no puede ser negativo"),
  idProducto: z.coerce.number().int().positive().optional(),
});

export const EsquemaToggleProducto = z.object({
  idProducto: z.number().int().positive(),
});

export const EsquemaCrearCategoria = z.object({
  nombre: z.string().min(2, "el nombre debe tener al menos 2 caracteres").max(100),
});

export const EsquemaEliminarCategoria = z.object({
  idCategoria: z.number().int().positive(),
});

export const EsquemaRenombrarCategoria = z.object({
  idCategoria: z.number().int().positive(),
  nuevoNombre: z.string().min(2, "el nombre debe tener al menos 2 caracteres").max(100),
});

export const EsquemaCambiarEstadoPedido = z.object({
  idPedido: z.number().int().positive(),
  nuevoEstado: z.string().min(1, "el estado es obligatorio"),
});


export const EsquemaGuardarRepartidor = z.object({
  nombre: z.string().min(2, "el nombre debe tener al menos 2 caracteres").max(100),
  apellido: z.string().max(100).optional(),
  email: z.string().email("el correo no es válido"),
  password: z.string().min(8, "la contraseña debe tener mínimo 6 caracteres"),
  telefono: z.string().max(20).optional(),
});

export const EsquemaAsignarRepartidor = z.object({
  idPedido: z.number().int().positive(),
  idRepartidor: z.number().int().positive(),
  notas: z.string().max(300).optional(),
});

// perfil del proveedor: telefono es propio del repartidor, no tiene datos de empresa como el admin
export const EsquemaActualizarPerfilProveedor = z.object({
  nombre: z.string().min(2, "el nombre debe tener al menos 2 caracteres").max(100),
  apellido: z.string().max(100).optional(),
  email: z.string().email("el correo no es válido"),
  telefono: z.string().max(20).optional(),
});

export const EsquemaGuardarUbicacion = z.object({
  latitud: z.number(),
  longitud: z.number(),
});

//ESQUEMAS PARA CLIENTES

export const EsquemaDatosPersonalesCliente = z.object({
  nombre: z.string().min(2, "el nombre debe tener al menos 2 caracteres").max(100),
  apellido: z.string().min(2, "el apellido debe tener al menos 2 caracteres").max(100),
  email: z.string().email("el correo no es válido"),
});

const EsquemaItemPedido = z.object({
  idProducto: z.number().int().positive(),
  cantidad: z.number().int().positive(),
});

export const EsquemaCrearPedido = z.object({
  idEmpresa: z.number().int().positive(),
  idDireccion: z.number().int().positive(),
  metodoPago: z.string().optional(),
  observaciones: z.string().max(500).optional(),
  items: z.array(EsquemaItemPedido).min(1, "el carrito está vacío"),
});

export const EsquemaGuardarResena = z.object({
  idPedido: z.number().int().positive(),
  idProducto: z.number().int().positive(),
  calificacion: z.number().int()
    .min(1, "la calificación debe ser entre 1 y 5")
    .max(5, "la calificación debe ser entre 1 y 5"),
  comentario: z.string().max(500).optional(),
});

// catalogo publico: direcciones del cliente

export const EsquemaGuardarDireccion = z.object({
  direccionTexto: z.string().min(5, "la dirección debe tener al menos 5 caracteres").max(300),
  latitud: z.number(),
  longitud: z.number(),
});

export const EsquemaEliminarDireccion = z.object({
  idDireccion: z.number().int().positive(),
});

// payment_intents: creacion de pagos en Stripe

export const EsquemaCrearIntencion = z.object({
  idPedido: z.number().int().positive(),
});

export const EsquemaCambiarEstadoEmpresa = z.object({
  idEmpresa: z.number().int().positive(),
  activar: z.boolean(),
});

// perfil del superadmin: identico a EsquemaActualizarPerfilAdmin pero sin campos de empresa,
// porque el superadmin no pertenece a ninguna
export const EsquemaActualizarPerfilSuperAdmin = z.object({
  nombre: z.string().min(2, "el nombre debe tener al menos 2 caracteres").max(100),
  apellido: z.string().min(2, "el apellido debe tener al menos 2 caracteres").max(100),
  email: z.string().email("el correo no es válido"),
});