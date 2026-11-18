// Ceremonia de revelar: las tarjetas aparecen en cascada en diagonal (columna
// por columna y de arriba hacia abajo) y hay un toque de confetti.

// Paso entre una tarjeta y la siguiente de la ola
export const REVEAL_STEP_MS = 70
// Tope: con muchas tarjetas la última no tarda más que esto en arrancar
export const REVEAL_MAX_DELAY_MS = 1100

// Demora de la animación de una tarjeta según su columna y su lugar en ella
export function revealDelay(columnIndex: number, cardIndex: number): number {
  const step = Math.max(0, columnIndex) + Math.max(0, cardIndex)
  return Math.min(step * REVEAL_STEP_MS, REVEAL_MAX_DELAY_MS)
}

// Hay ceremonia solo cuando la sala pasa de oculta a revelada con la persona
// adentro: no al entrar a una sala ya revelada ni al volver a ocultar
export function isRevealMoment(
  prev: boolean | undefined,
  next: boolean | undefined,
): boolean {
  return prev === false && next === true
}

// Piezas de confetti según el ancho de pantalla (menos en celular)
export function confettiCount(width: number): number {
  return Math.round(Math.min(160, Math.max(60, width / 9)))
}
