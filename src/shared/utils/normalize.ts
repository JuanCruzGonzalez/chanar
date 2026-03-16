/**
 * Elimina tildes y diacríticos de un texto y lo convierte a minúsculas.
 * Permite búsquedas que ignoren acentos, ej: "sahumerio" encuentra "sahumério".
 */
export function normalizeTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
