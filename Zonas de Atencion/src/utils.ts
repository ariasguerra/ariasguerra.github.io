import { Person } from './types';

export function getPersonnelCategory(grade: string): Person['category'] {
  const oficiales = ["CR", "TC", "MY", "CT", "TE", "ST"];
  const suboficiales = ["CM", "SC", "IJ", "IT", "SI"];
  const patrulleros = ["PT", "PP"];

  const g = grade.toUpperCase();
  if (oficiales.includes(g)) return "Oficiales";
  if (suboficiales.includes(g)) return "Suboficiales";
  if (patrulleros.includes(g)) return "Patrulleros";
  return "Desconocido";
}

export function toTitleCaseSmart(str: string): string {
  if (!str) return '';
  const minorWords = new Set(['de', 'a', 'en', 'y', 'e', 'o', 'u', 'el', 'la', 'los', 'las', 'un', 'una']);
  const acronyms = new Set(['CAI', 'POE', 'CIEPS', 'E-12']);

  return str.split(' ').map((word, index) => {
    // Remove punctuation for comparison
    const cleanWord = word.toUpperCase().replace(/[.,()]/g, '');
    if (acronyms.has(cleanWord)) return word.toUpperCase();
    
    const lowerWord = word.toLowerCase();
    if (index > 0 && minorWords.has(lowerWord)) return lowerWord;
    return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
  }).join(' ');
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "buenos días";
  if (hour >= 12 && hour < 18) return "buenas tardes";
  return "buenas noches";
}

export function getTurno(): string {
  const hour = new Date().getHours();
  // Primer turno: 21:00 - 06:00
  if (hour >= 21 || hour < 6) return "primer turno";
  // Segundo turno: 06:00 - 13:00
  if (hour >= 6 && hour < 13) return "segundo turno";
  // Tercer turno: 13:00 - 21:00
  return "tercer turno";
}
