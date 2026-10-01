// paletaDinamica.ts
// Genera la escala de 10 tonos (900→50) de primary Y secondary a partir
// de UN solo color elegido por la empresa (color_primario). secondary
// se deriva automáticamente del mismo matiz, con saturación forzada muy
// baja — nunca se le pide un segundo color a la empresa.
//
// Reglas de diseño detrás de este archivo (decisiones ya validadas):
//   1. S y L del color elegido se CLAMPEAN antes de generar nada, para
//      que ninguna empresa pueda romper el contraste del panel eligiendo
//      un color extremo (rojo puro, amarillo neón, navy casi negro...).
//   2. secondary NUNCA es una escala de color "de marca" — es la misma
//      estructura neutra que ya usa Global.css (equivalente a "slate"),
//      solo que con el matiz (H) del primary para dar algo de "sinergia"
//      visual sutil. Saturación forzada a ~12%.
//   3. Reparto de uso (para cuando armemos el sidebar/tablas de
//      Admin/Proveedor): secondary hace de estructura (sidebar, fondos,
//      texto, bordes — el 90% de la superficie), primary es solo acento
//      (hover, ítem activo, botones, focus rings, logo).

export interface EscalaColor {
  900: string;
  800: string;
  700: string;
  600: string;
  500: string;
  400: string;
  300: string;
  200: string;
  100: string;
  50: string;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface PaletaEmpresa {
  primary: EscalaColor;
  secondary: EscalaColor;
  /** Tripleta "r, g, b" del escalón 600 de primary — es el único que
   *  Forms.css necesita en formato rgba(var(--primary-600-rgb), N). */
  primary600Rgb: string;
  secondary900Rgb: string;
  secondary600Rgb: string;
}

// ---------------------------------------------------------------
// Límites de seguridad para lo que la empresa puede elegir. No se
// rechaza el color — se recorta antes de generar la escala, así que
// la empresa SIEMPRE obtiene un panel usable sin importar qué tan
// extremo sea el hex que metió.
// ---------------------------------------------------------------
const S_MIN = 35;
const S_MAX = 75;
const L_MIN = 35;
const L_MAX = 65;

// Saturación forzada para la escala secondary derivada — mismo matiz
// que primary, casi neutro (rango recomendado 10-15%, se usa el punto
// medio).
const ACENTO_SATURACION = 12;

// Deltas de luminosidad por escalón (ver la guía anterior para la
// explicación completa de por qué son proporcionales y no fijos).
const DELTAS: Record<keyof EscalaColor, number> = {
  900: -30,
  800: -22,
  700: -15,
  600: -7,
  500: 0,
  400: 10,
  300: 18,
  200: 27,
  100: 35,
  50: 42,
};

function hexAHsl(hex: string): HSL {
  const limpio = hex.replace("#", "").trim();
  const normalizado =
    limpio.length === 3 ? limpio.split("").map((c) => c + c).join("") : limpio;

  if (!/^[0-9a-fA-F]{6}$/.test(normalizado)) {
    throw new Error(`Color inválido: "${hex}". Se esperaba formato hex (#rrggbb).`);
  }

  const r = parseInt(normalizado.slice(0, 2), 16) / 255;
  const g = parseInt(normalizado.slice(2, 4), 16) / 255;
  const b = parseInt(normalizado.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  let s = 0;
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  }

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: s * 100, l: l * 100 };
}

function clamp(valor: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, valor));
}

function pasoProporcional(l: number, delta: number): number {
  const ajustado = delta < 0 ? delta * (l / 50) : delta * ((100 - l) / 50);
  return clamp(l + ajustado, 0, 100);
}

function generarEscala(h: number, s: number, l: number): EscalaColor {
  const escala = {} as EscalaColor;
  for (const paso of Object.keys(DELTAS) as unknown as (keyof EscalaColor)[]) {
    const lPaso = pasoProporcional(l, DELTAS[paso]);
    escala[paso] = `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${lPaso.toFixed(1)}%)`;
  }
  return escala;
}

/** HSL → tripleta RGB entera, como string "r, g, b" — para poder usar
 *  rgba(var(--x-rgb), alpha) en el CSS existente (Forms.css). */
function hslARgbTriplet(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;

  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return `${R}, ${G}, ${B}`;
}

/**
 * Punto de entrada único. Recibe el hex que guardó la empresa en
 * color_primario y devuelve las dos escalas completas (primary +
 * secondary derivado) más la tripleta RGB del 600 de primary.
 *
 * @param hexColorPrimario  El hex crudo tal como lo eligió la empresa
 *   (se guarda tal cual en la BD — el clampeo pasa acá, en cada
 *   render, nunca se sobreescribe lo que la empresa realmente eligió).
 */
export function generarPaletaEmpresa(hexColorPrimario: string): PaletaEmpresa {
  const original = hexAHsl(hexColorPrimario);

  const h = original.h;
  const s = clamp(original.s, S_MIN, S_MAX);
  const l = clamp(original.l, L_MIN, L_MAX);

  const primary = generarEscala(h, s, l);
  const secondary = generarEscala(h, ACENTO_SATURACION, l);

  const l600 = pasoProporcional(l, DELTAS[600]);
  const primary600Rgb = hslARgbTriplet(h, s, l600);

  const l900 = pasoProporcional(l,DELTAS[900]);
  const secondary900Rgb = hslARgbTriplet(h,ACENTO_SATURACION, l900);
  const secondary600Rgb = hslARgbTriplet(h, ACENTO_SATURACION, l600);

  return { primary, secondary, primary600Rgb, secondary600Rgb, secondary900Rgb };
}