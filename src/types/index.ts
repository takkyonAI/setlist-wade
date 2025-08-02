// Tipos para a aplicação Setlist Wade

export interface Chord {
  id: string;
  chord: string;
  position: number;
}

export interface LyricLine {
  id: string;
  text: string;
  chords: Chord[];
  position: number;
}

export interface Music {
  id: string;
  title: string;
  artist: string;
  originalKey: string;
  currentKey: string;
  lyrics: LyricLine[];
  createdAt: Date;
  updatedAt: Date;
  cifraClubUrl?: string;
}

export interface Setlist {
  id: string;
  name: string;
  description?: string;
  musics: Music[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResult {
  title: string;
  artist: string;
  url: string;
  key?: string;
}

export interface ChordTransposition {
  originalChord: string;
  transposedChord: string;
  semitones: number;
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  range: string;
  credentials: Record<string, unknown>;
}