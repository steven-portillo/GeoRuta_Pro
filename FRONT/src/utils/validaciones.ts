export interface ValidationResult {
  isValid: boolean;
  message: string;
}


//sirve para validar que solo se ingresen letras
export function validarSoloLetras(val: string, fieldLabel = 'Este campo'): ValidationResult {
  const value = val.trim();
  if (!value) {
    return { isValid: false, message: `${fieldLabel} es requerido.` };
  }

  // Letras (con acentos y ñ) y espacios únicamente, mínimo 2 caracteres
  const soloLetrasRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/;

  if (!soloLetrasRegex.test(value)) {
    return { isValid: false, message: `${fieldLabel} solo puede contener letras.` };
  }
//lo dejo como que el lenght sea minimo 2 y ya(hay un pirobo en colombia que se llaaba 8 Dias o una mierda asi)
  if (value.trim().length < 2) {
    return { isValid: false, message: `${fieldLabel} debe tener al menos 2 caracteres.` };
  }

  // Evita espacios dobles o solo espacios repetidos como "a    b" por si hay un graciosito que quiera chimbear
  if (/\s{2,}/.test(value)) {
    return { isValid: false, message: `${fieldLabel} tiene espacios de más.` };
  }

  return { isValid: true, message: '' };
}

// este es el del email, la mitica de siemrpre x@y.com
export function validarFormatoEmail(val: string): ValidationResult {
  const value = val.trim();

  if (!value) {
    return { isValid: false, message: 'El correo electrónico es requerido.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return { isValid: false, message: 'Ingresa un correo electrónico válido (ej. usuario@dominio.com).' };
  }

  return { isValid: true, message: '' };
}

//este es el de solo numeros por si algun gracioso quiere meter letras a un telefono  
export function validarSoloNumeros(val: string, opts?: { length?: number; label?: string }): ValidationResult {
  const value = val.trim();
  const label = opts?.label ?? 'Este campo';

  if (!value) {
    return { isValid: false, message: `${label} es requerido.` };
  }
  if (!/^\d+$/.test(value)) {
    return { isValid: false, message: `${label} solo puede contener números.` };
  }
  if (opts?.length && value.length !== 10) {
    return { isValid: false, message: `${label} debe tener 10 dígitos.` };
  }
  return { isValid: true, message: '' };
}


export function validatePhone(val: string): ValidationResult {
  return validarSoloNumeros(val, { length: 10, label: 'El teléfono' });
}

//validar que la contraseña tenga minimo 6 caracteres
export function validarPassword(val: string, minLength = 8): ValidationResult {
  const value = val.trim();
 
  if (!value) {
    return { isValid: false, message: 'La contraseña es requerida.' };
  }
  if (value.length < minLength) {
    return { isValid: false, message: `La contraseña debe tener al menos ${minLength} caracteres.` };
  }
  return { isValid: true, message: '' };
}

// y esta es para validar que en confirmar contraseña coincidan
export function validarPasswordComparar(val: string, originalPassword: string): ValidationResult {
  if (!val) {
    return { isValid: false, message: 'Debes confirmar la contraseña.' };
  }
  if (val !== originalPassword) {
    return { isValid: false, message: 'Las contraseñas no coinciden.' };
  }
  return { isValid: true, message: '' };
}

//este es para validar archivos(de momento solo imagenes)
const TIPOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
 
export function validarImagenFile(file: File | null | undefined): ValidationResult {
  if (!file) {
    return { isValid: true, message: '' };
  }
  if (!TIPOS_IMAGEN_PERMITIDOS.includes(file.type)) {
    return { isValid: false, message: 'Formato de imagen no permitido (solo JPG, PNG o WEBP).' };
  }
  return { isValid: true, message: '' };
}

//este bello helper ayuda a conectar el input con el error(agrega o remueve clases si es valido o no)

export function attachFieldValidation(
  inputEl: HTMLInputElement | null,
  errorEl: HTMLElement | null,
  validate: (value: string) => ValidationResult
): (() => ValidationResult) | undefined {
  if (!inputEl || !errorEl) return undefined;
 
  
  const applyState = (result: ValidationResult): ValidationResult => {
    if (!result.isValid) {
      inputEl.classList.add('is-invalid');
      inputEl.classList.remove('is-valid');
      errorEl.innerHTML = `<i class="bi bi-exclamation-circle-fill"></i> <span>${result.message}</span>`;
    } else {
      inputEl.classList.remove('is-invalid');
      inputEl.classList.add('is-valid');
      errorEl.innerHTML = '';
    }
    return result;
  };
 

  inputEl.addEventListener('input', () => {
    if (inputEl.classList.contains('is-invalid')) {
      applyState(validate(inputEl.value));
    }
  });
 
  inputEl.addEventListener('blur', () => {
    applyState(validate(inputEl.value));
  });
 

  return () => applyState(validate(inputEl.value));
}

//este es el helper para validar los tipos de archivos(de mometo solo imagenes)
export function attachFileValidation(
  inputEl: HTMLInputElement | null,
  errorEl: HTMLElement | null,
  validate: (file: File | null) => ValidationResult
): (() => ValidationResult) | undefined {
  if (!inputEl || !errorEl) return undefined;
 
  const getSelectedFile = (): File | null =>
    inputEl.files && inputEl.files.length > 0 ? inputEl.files[0] : null;
 
  const applyState = (result: ValidationResult): ValidationResult => {
    if (!result.isValid) {
      inputEl.classList.add('is-invalid');
      inputEl.classList.remove('is-valid');
      errorEl.innerHTML = `<i class="bi bi-exclamation-circle-fill"></i> <span>${result.message}</span>`;
    } else {
      inputEl.classList.remove('is-invalid');
      inputEl.classList.add('is-valid');
      errorEl.innerHTML = '';
    }
    return result;
  };
 
  inputEl.addEventListener('change', () => {
    applyState(validate(getSelectedFile()));
  });
 
  return () => applyState(validate(getSelectedFile()));
}