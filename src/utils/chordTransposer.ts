import { transpose } from 'chord-transposer';
import { Music, LyricLine, Chord } from '../types';

// Mapeamento de notas musicais
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Função para calcular semitons entre duas notas
export function calculateSemitones(fromKey: string, toKey: string): number {
  const normalizeKey = (key: string): string => {
    // Remover indicadores de modo (m, maj, min, etc.)
    const cleanKey = key.replace(/[^A-G#b]/g, '');
    
    // Converter bemóis para sustenidos para consistência
    const flatsToSharps: { [key: string]: string } = {
      'Db': 'C#',
      'Eb': 'D#',
      'Gb': 'F#',
      'Ab': 'G#',
      'Bb': 'A#'
    };
    
    return flatsToSharps[cleanKey] || cleanKey;
  };

  const fromIndex = NOTES.indexOf(normalizeKey(fromKey));
  const toIndex = NOTES.indexOf(normalizeKey(toKey));
  
  if (fromIndex === -1 || toIndex === -1) {
    return 0;
  }
  
  let semitones = toIndex - fromIndex;
  if (semitones < 0) {
    semitones += 12;
  }
  
  return semitones;
}

// Função para transpor um único acorde
export function transposeChord(chord: string, semitones: number): string {
  try {
    // Usar a biblioteca chord-transposer para transpor
    return transpose(chord).up(semitones).toString();
  } catch (error) {
    console.warn(`Erro ao transpor acorde ${chord}:`, error);
    
    // Fallback manual para acordes básicos
    return transposeChordManual(chord, semitones);
  }
}

// Função de transposição manual como fallback
function transposeChordManual(chord: string, semitones: number): string {
  // Extrair nota base do acorde
  const noteMatch = chord.match(/^([A-G][#b]?)/);
  if (!noteMatch) return chord;
  
  const baseNote = noteMatch[1];
  const restOfChord = chord.slice(baseNote.length);
  
  // Encontrar índice da nota
  let noteIndex = NOTES.indexOf(baseNote);
  if (noteIndex === -1) {
    // Tentar com bemóis
    noteIndex = NOTES_FLAT.indexOf(baseNote);
    if (noteIndex === -1) return chord;
  }
  
  // Calcular nova nota
  const newIndex = (noteIndex + semitones) % 12;
  const newNote = NOTES[newIndex];
  
  return newNote + restOfChord;
}

// Função para transpor uma música completa
export function transposeMusic(music: Music, newKey: string): Music {
  const semitones = calculateSemitones(music.currentKey, newKey);
  
  if (semitones === 0) {
    return { ...music, currentKey: newKey };
  }
  
  const transposedLyrics: LyricLine[] = music.lyrics.map(line => ({
    ...line,
    chords: line.chords.map(chord => ({
      ...chord,
      chord: transposeChord(chord.chord, semitones),
    })),
  }));
  
  return {
    ...music,
    currentKey: newKey,
    lyrics: transposedLyrics,
    updatedAt: new Date(),
  };
}

// Função para obter lista de todas as tonalidades possíveis
export function getAllKeys(): string[] {
  const majorKeys = NOTES.map(note => note);
  const minorKeys = NOTES.map(note => note + 'm');
  return [...majorKeys, ...minorKeys];
}

// Função para detectar se um acorde é válido
export function isValidChord(chord: string): boolean {
  const chordRegex = /^[A-G][#b]?(?:m|maj|min|sus[24]?|add[0-9]+|dim|aug|[0-9]+)*$/;
  return chordRegex.test(chord.trim());
}

// Função para normalizar acorde (remover espaços, padronizar formato)
export function normalizeChord(chord: string): string {
  return chord.trim().replace(/\s+/g, '');
}

// Função para obter enarmônicos (equivalentes) de uma nota
export function getEnharmonicEquivalents(note: string): string[] {
  const enharmonics: { [key: string]: string[] } = {
    'C#': ['C#', 'Db'],
    'Db': ['C#', 'Db'],
    'D#': ['D#', 'Eb'],
    'Eb': ['D#', 'Eb'],
    'F#': ['F#', 'Gb'],
    'Gb': ['F#', 'Gb'],
    'G#': ['G#', 'Ab'],
    'Ab': ['G#', 'Ab'],
    'A#': ['A#', 'Bb'],
    'Bb': ['A#', 'Bb'],
  };
  
  return enharmonics[note] || [note];
}

// Função para sugerir tonalidades relacionadas (relativa menor/maior, dominante, etc.)
export function getRelatedKeys(key: string): string[] {
  const cleanKey = key.replace(/[^A-G#bm]/g, '');
  const isMinor = cleanKey.includes('m');
  const baseNote = cleanKey.replace('m', '');
  
  const noteIndex = NOTES.indexOf(baseNote) !== -1 ? NOTES.indexOf(baseNote) : NOTES_FLAT.indexOf(baseNote);
  if (noteIndex === -1) return [key];
  
  const related: string[] = [key];
  
  if (isMinor) {
    // Para menor: relativa maior (3 semitons acima)
    const relativeIndex = (noteIndex + 3) % 12;
    related.push(NOTES[relativeIndex]);
  } else {
    // Para maior: relativa menor (3 semitons abaixo)
    const relativeIndex = (noteIndex - 3 + 12) % 12;
    related.push(NOTES[relativeIndex] + 'm');
  }
  
  // Dominante (7 semitons acima)
  const dominantIndex = (noteIndex + 7) % 12;
  related.push(NOTES[dominantIndex] + (isMinor ? 'm' : ''));
  
  // Subdominante (5 semitons acima)
  const subdominantIndex = (noteIndex + 5) % 12;
  related.push(NOTES[subdominantIndex] + (isMinor ? 'm' : ''));
  
  return [...new Set(related)]; // Remover duplicatas
}