// src/utils/validaciones.ts
// helpers de validacion de campos, reutilizables en login/registro/perfil

export interface ResultadoValidacion {
  isValid: boolean;
  mensaje?: string;
}

export function validarFormatoEmail(valor: string): ResultadoValidacion {
  const texto = valor.trim();
  if (!texto) return { isValid: false, mensaje: 'El correo es obligatorio' };

  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regexEmail.test(texto)) return { isValid: false, mensaje: 'Ingresa un correo válido' };

  return { isValid: true };
}

// minLength es opcional a proposito: en login solo se exige que no este vacia
// (no se le puede exigir 8 caracteres a un usuario que ya tiene su clave), pero
// en registro se puede llamar como validarPassword(valor, { minLength: 8 })
export function validarPassword(valor: string, opciones: { minLength?: number } = {}): ResultadoValidacion {
  if (!valor) return { isValid: false, mensaje: 'La contraseña es obligatoria' };

  if (opciones.minLength && valor.length < opciones.minLength) {
    return { isValid: false, mensaje: `Debe tener al menos ${opciones.minLength} caracteres` };
  }

  return { isValid: true };
}

// valida que la confirmacion de contraseña sea igual a la contraseña original
// (se usa en registro y registro-empresa, donde hay campo de "confirmar contraseña")
export function validarPasswordComparar(valor: string, passwordOriginal: string): ResultadoValidacion {
  if (!valor) return { isValid: false, mensaje: 'Confirma tu contraseña' };
  if (valor !== passwordOriginal) return { isValid: false, mensaje: 'Las contraseñas no coinciden' };

  return { isValid: true };
}

// valida que el valor solo tenga letras (incluye tildes y ñ) y espacios —
// se usa en nombre/apellido, donde no tiene sentido aceptar numeros o simbolos
export function validarSoloLetras(valor: string, etiqueta: string): ResultadoValidacion {
  const texto = valor.trim();
  if (!texto) return { isValid: false, mensaje: `${etiqueta} es obligatorio` };

  const regexSoloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  if (!regexSoloLetras.test(texto)) return { isValid: false, mensaje: `${etiqueta} solo puede contener letras` };

  return { isValid: true };
}

// campo de texto libre obligatorio generico (ej. nombre de la empresa) —
// no aplica "solo letras" porque puede llevar numeros/simbolos (ej. "Distribuidora 2000")
export function validarRequerido(valor: string, etiqueta: string): ResultadoValidacion {
  const texto = valor.trim();
  if (!texto) return { isValid: false, mensaje: `${etiqueta} es obligatorio` };

  return { isValid: true };
}

const TIPOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const PESO_MAXIMO_LOGO_MB = 2;

// el logo de la empresa es opcional: si no hay archivo, es valido de una vez.
// si hay archivo, se revisa tipo y peso (mismos limites que GestorArchivos.ts en el backend)
export function validarImagenFile(archivo: File | null): ResultadoValidacion {
  if (!archivo) return { isValid: true };

  if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.type)) {
    return { isValid: false, mensaje: 'Formato no permitido (usa jpg, png o webp)' };
  }

  const pesoMaximoBytes = PESO_MAXIMO_LOGO_MB * 1024 * 1024;
  if (archivo.size > pesoMaximoBytes) {
    return { isValid: false, mensaje: `La imagen no puede superar ${PESO_MAXIMO_LOGO_MB}MB` };
  }

  return { isValid: true };
}

// conecta un input con su <span> de error: pinta is-invalid/is-valid y el
// mensaje al perder el foco, y revalida en caliente solo si ya estaba en error
// (para no marcar el campo en rojo mientras el usuario recien empieza a escribir).
// devuelve una funcion que se puede llamar a mano (ej. al hacer submit) y
// retorna el ResultadoValidacion actual.
export function attachFieldValidation(
  input: HTMLInputElement | null,
  errorEl: HTMLElement | null,
  validador: (valor: string) => ResultadoValidacion,
): (() => ResultadoValidacion) | null {
  if (!input) return null;

  const validar = (): ResultadoValidacion => {
    const resultado = validador(input.value);
    input.classList.toggle('is-invalid', !resultado.isValid);
    input.classList.toggle('is-valid', resultado.isValid);
    if (errorEl) errorEl.textContent = resultado.isValid ? '' : (resultado.mensaje ?? '');
    return resultado;
  };

  input.addEventListener('blur', validar);
  input.addEventListener('input', () => {
    if (input.classList.contains('is-invalid')) validar();
  });

  return validar;
}

// version de attachFieldValidation para <input type="file">: un input de
// archivo no dispara "blur" de forma util, asi que se valida en "change"
// (justo cuando el usuario elige o quita el archivo)
export function attachFileValidation(
  input: HTMLInputElement | null,
  errorEl: HTMLElement | null,
  validador: (archivo: File | null) => ResultadoValidacion,
): (() => ResultadoValidacion) | null {
  if (!input) return null;

  const validar = (): ResultadoValidacion => {
    const archivo = input.files?.[0] ?? null;
    const resultado = validador(archivo);
    input.classList.toggle('is-invalid', !resultado.isValid);
    input.classList.toggle('is-valid', resultado.isValid && archivo !== null);
    if (errorEl) errorEl.textContent = resultado.isValid ? '' : (resultado.mensaje ?? '');
    return resultado;
  };

  input.addEventListener('change', validar);

  return validar;
}