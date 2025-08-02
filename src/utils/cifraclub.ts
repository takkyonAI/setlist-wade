import axios from 'axios';
import * as cheerio from 'cheerio';
import { SearchResult, Music, LyricLine, Chord } from '../types';

// Função para buscar músicas no CifraClub
export async function searchCifraClub(query: string): Promise<SearchResult[]> {
  try {
    // Como não podemos fazer scraping direto do CifraClub por CORS,
    // vamos criar uma API route que fará o scraping no servidor
    const response = await axios.get(`/api/search-cifraclub?q=${encodeURIComponent(query)}`);
    return response.data.results || [];
  } catch (error) {
    console.error('Erro ao buscar no CifraClub:', error);
    return [];
  }
}

// Função para importar música do CifraClub
export async function importMusicFromCifraClub(url: string): Promise<Music | null> {
  try {
    const response = await axios.get(`/api/import-cifraclub?url=${encodeURIComponent(url)}`);
    return response.data.music || null;
  } catch (error) {
    console.error('Erro ao importar música do CifraClub:', error);
    return null;
  }
}

// Função para processar letra com cifras (formato manual)
export function parseLyricsWithChords(content: string): LyricLine[] {
  const lines = content.split('\n');
  const lyricLines: LyricLine[] = [];
  let lineId = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detectar se é uma linha de cifra (contém acordes como C, Dm, F#, etc.)
    const chordRegex = /\b[A-G][#b]?m?(?:maj|min|sus|add|dim|aug)?[0-9]?\b/g;
    const chordsInLine = line.match(chordRegex);

    if (chordsInLine && chordsInLine.length > 0 && line.length < 50) {
      // Linha contém principalmente cifras
      const nextLine = lines[i + 1];
      if (nextLine && nextLine.trim()) {
        // Próxima linha é a letra correspondente
        const chords: Chord[] = [];
        let chordPosition = 0;
        
        chordsInLine.forEach((chord, index) => {
          const position = line.indexOf(chord, chordPosition);
          chords.push({
            id: `chord-${lineId}-${index}`,
            chord: chord.trim(),
            position: Math.max(0, position),
          });
          chordPosition = position + chord.length;
        });

        lyricLines.push({
          id: `line-${lineId}`,
          text: nextLine.trim(),
          chords,
          position: lineId,
        });
        
        i++; // Pular a próxima linha já processada
        lineId++;
      }
    } else {
      // Linha é apenas letra (sem cifras acima)
      lyricLines.push({
        id: `line-${lineId}`,
        text: line,
        chords: [],
        position: lineId,
      });
      lineId++;
    }
  }

  return lyricLines;
}

// Função para extrair key/tom da música
export function extractKeyFromContent(content: string): string {
  const keyRegex = /(?:tom|key|tonalidade)[\s:]*([A-G][#b]?m?)/i;
  const match = content.match(keyRegex);
  return match ? match[1] : 'C';
}

// Função para detectar cifras em uma linha de texto
export function detectChordsInText(text: string): { chord: string; position: number }[] {
  const chordRegex = /\b[A-G][#b]?m?(?:maj|min|sus|add|dim|aug)?[0-9]?\b/g;
  const chords: { chord: string; position: number }[] = [];
  let match;

  while ((match = chordRegex.exec(text)) !== null) {
    chords.push({
      chord: match[0],
      position: match.index,
    });
  }

  return chords;
}

// Função para formatar letra com cifras para exibição
export function formatLyricsForDisplay(lyrics: LyricLine[]): string {
  return lyrics.map(line => {
    if (line.chords.length === 0) {
      return line.text;
    }

    // Criar linha de cifras acima da letra
    const chordLine = ' '.repeat(line.text.length);
    const chordArray = chordLine.split('');
    
    line.chords.forEach(chord => {
      const pos = Math.min(chord.position, chordArray.length - chord.chord.length);
      for (let i = 0; i < chord.chord.length; i++) {
        if (pos + i < chordArray.length) {
          chordArray[pos + i] = chord.chord[i];
        }
      }
    });

    return chordArray.join('') + '\n' + line.text;
  }).join('\n');
}