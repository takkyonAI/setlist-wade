import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
// Definir interfaces localmente para evitar imports quebrados
interface Chord {
  id: string;
  chord: string;
  position: number;
}

interface LyricLine {
  id: string;
  text: string;
  chords: Chord[];
  position: number;
}

interface Music {
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

// Funções utilitárias para processar cifras e letras
function parseLyricsWithChords(lyrics: string): LyricLine[] {
  const lines = lyrics.split('\n');
  const result: LyricLine[] = [];
  let lineIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i].trim();
    if (currentLine.length === 0) continue;
    
    // Detectar se é uma linha só de cifras - INCLUI SLASH CHORDS (G/B, C/E)
    // FIXED: Regex específico para capturar slash chords com # e b corretamente
    const chordRegex = /([A-G][#b]?(?:m|maj|dim|aug|sus|add|\d)*(?:\/[A-G][#b]?)?)/g;
    const textWithoutChords = currentLine.replace(chordRegex, '').trim();
    const chordMatches = [...currentLine.matchAll(chordRegex)];
    
    // Debug removido - regex corrigido para capturar # e b nos slash chords
    
    // É linha de cifras se tem acordes e muito pouco texto restante
    const isChordOnlyLine = chordMatches.length > 0 && textWithoutChords.length < 5;
    
    if (isChordOnlyLine && i + 1 < lines.length) {
      // Esta é uma linha só de cifras, tentar combinar com a próxima linha de texto
      const nextLine = lines[i + 1].trim();
      
      if (nextLine.length > 0) {
        // Mapear posições das cifras baseado no espaçamento
        const chords: Chord[] = chordMatches.map((match, chordIndex) => {
          const chordPosition = match.index || 0;
          // Converter posição de caractere para posição relativa ao texto
          const adjustedPosition = Math.round(chordPosition * 0.8); // Ajuste fino
          
          return {
            id: `chord-${lineIndex}-${chordIndex}`,
            chord: match[1],
            position: Math.max(0, adjustedPosition)
          };
        });
        
        // Adicionar linha com texto e cifras combinadas
        result.push({
          id: `line-${lineIndex++}`,
          text: nextLine,
          chords: chords,
          position: result.length
        });
        
        i++; // Pular a próxima linha pois já foi processada
        continue;
      }
    }
    
    // Linha normal (texto com ou sem cifras misturadas)
    const mixedChords: Chord[] = [];
    let cleanText = currentLine;
    let chordIndex = 0;
    
    // Extrair cifras da linha atual
    let match;
    chordRegex.lastIndex = 0; // Reset regex
    while ((match = chordRegex.exec(currentLine)) !== null) {
      if (match.index !== undefined) {
        mixedChords.push({
          id: `chord-${lineIndex}-${chordIndex++}`,
          chord: match[1],
          position: match.index
        });
      }
    }
    
    // Remover cifras do texto se houver muitas (deixar apenas o texto)
    if (mixedChords.length > 2) {
      cleanText = currentLine.replace(chordRegex, ' ').replace(/\s+/g, ' ').trim();
    }
    
    result.push({
      id: `line-${lineIndex++}`,
      text: cleanText,
      chords: mixedChords,
      position: result.length
    });
  }
  
  return result;
}

function extractKeyFromContent(content: string): string {
  // Procurar por indicações específicas do CifraClub
  const cifraClubKeyPatterns = [
    /tom:\s*([A-G][#b]?m?)/i,        // "tom: D"
    /\btom\s+([A-G][#b]?m?)\b/i,     // "tom D"
    /\[Intro\]\s*([A-G][#b]?)/i,     // "[Intro] D G"
    /\bKey:\s*([A-G][#b]?m?)/i       // "Key: D"
  ];
  
  for (const pattern of cifraClubKeyPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // Procurar por indicações gerais de tom
  const generalKeyPatterns = [
    /tonalidade[:\s]*([A-G][#b]?m?)/i
  ];
  
  for (const pattern of generalKeyPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // Fallback: tentar detectar o primeiro acorde válido como tom
  const chordPattern = /\b([A-G][#b]?m?)(?:\/[A-G][#b]?)?\b/g;
  const chordMatches = [...content.matchAll(chordPattern)];
  
  if (chordMatches.length > 0) {
    // Pegar o primeiro acorde que não seja um slash chord baixo
    for (const match of chordMatches) {
      const chord = match[1];
      if (chord && !chord.includes('/')) {
        return chord;
      }
    }
  }
  
  return 'C'; // Tom padrão
}

// Função para transpor todas as cifras para C
function transposeLyricsToC(lyrics: LyricLine[], originalKey: string): LyricLine[] {
  if (originalKey === 'C') return lyrics;
  
  const semitones = calculateSemitones(originalKey, 'C');
  
  return lyrics.map(line => ({
    ...line,
    chords: line.chords.map(chord => ({
      ...chord,
      chord: transposeChord(chord.chord, semitones)
    }))
  }));
}

// Calcular semitons para transposição
function calculateSemitones(fromKey: string, toKey: string): number {
  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const getKeyIndex = (key: string) => {
    const baseKey = key.replace('m', ''); // Remove 'm' para acordes menores
    return keys.indexOf(baseKey);
  };
  
  const fromIndex = getKeyIndex(fromKey);
  const toIndex = getKeyIndex(toKey);
  
  if (fromIndex === -1 || toIndex === -1) return 0;
  
  let diff = toIndex - fromIndex;
  if (diff < 0) diff += 12;
  return diff;
}

// Transpor um acorde específico - AGORA INCLUI SLASH CHORDS
function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord;
  
  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  // Função helper para transpor uma nota individual
  const transposeNote = (note: string): string => {
    // Converter bemol para sustenido para simplificar
    const normalizedNote = note.replace('Bb', 'A#').replace('Db', 'C#').replace('Eb', 'D#').replace('Gb', 'F#').replace('Ab', 'G#');
    
    const currentIndex = keys.indexOf(normalizedNote);
    if (currentIndex === -1) return note;
    
    const newIndex = (currentIndex + semitones) % 12;
    return keys[newIndex];
  };
  
  // Verificar se é slash chord (G/B, C/E, etc.)
  const slashMatch = chord.match(/^([A-G][#b]?)([^/]*)(\/([A-G][#b]?))(.*)$/);
  
  if (slashMatch) {
    // É um slash chord - transpor ambas as notas
    const [, rootNote, rootModifiers, , bassNote, remainingModifiers] = slashMatch;
    
    const newRootNote = transposeNote(rootNote);
    const newBassNote = transposeNote(bassNote);
    
    return `${newRootNote}${rootModifiers}/${newBassNote}${remainingModifiers}`;
  } else {
    // Acorde normal - apenas uma nota
    const match = chord.match(/^([A-G][#b]?)(.*)/);
    if (!match) return chord;
    
    const [, baseNote, modifiers] = match;
    const newNote = transposeNote(baseNote);
    
    return newNote + modifiers;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {

    // Validar se é uma URL válida do CifraClub
    if (!url.includes('cifraclub.com.br')) {
      const mockMusic: Music = generateMockMusicFromUrl(url);
      return NextResponse.json({ 
        music: mockMusic, 
        warning: '⚠️ URL deve ser do CifraClub - usando dados de demonstração' 
      });
    }

    console.log('🔍 Importando de:', url);
    
    let response;
    try {
      // Headers mais modernos e avançados para evitar bloqueio
      response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"macOS"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Referer': 'https://www.google.com/',
        },
        timeout: 20000,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 500; // Aceitar até erro 4xx
        },
      });
    } catch (httpError) {
      console.error('❌ Erro HTTP ao acessar CifraClub:', httpError);
      const mockMusic: Music = generateMockMusicFromUrl(url);
      return NextResponse.json({ 
        music: mockMusic, 
        warning: '⚠️ Erro de conexão com CifraClub - usando dados de demonstração' 
      });
    }

    // Verificar se a resposta é válida
    if (response.status >= 400) {
      console.log(`⚠️ Status HTTP ${response.status} - usando dados mock`);
      const mockMusic: Music = generateMockMusicFromUrl(url);
      return NextResponse.json({ 
        music: mockMusic, 
        warning: `⚠️ CifraClub retornou erro ${response.status} - usando dados de demonstração` 
      });
    }

    const $ = cheerio.load(response.data);
    
    // Debug: analisar estrutura da página
    console.log('📄 Título da página:', $('title').text());
    console.log('📊 Total de elementos:', $('*').length);
    
    // Extrair título - limpar e extrair apenas o nome da música
    const titleFromMeta = $('meta[property="og:title"]').attr('content') || '';
    const titleFromPage = $('title').text().replace(' - Cifra Club', '').replace(' | Cifra Club', '').trim();
    const titleFromH1 = $('h1').first().text().trim();
    
    // Priorizar meta tag, depois title da página, depois h1
    const rawTitle = titleFromMeta || 
                   (titleFromPage !== 'Cifra Club' ? titleFromPage : '') ||
                   (titleFromH1 !== 'Cifra Club' ? titleFromH1 : '') ||
                   'Música Importada';
    
    // Extrair apenas o nome da música (primeira parte antes do " - ")
    const title = rawTitle.split(' - ')[0].trim() || rawTitle;
    
    // Extrair artista - seletores mais específicos
    const artist = $('.js-artist, .artist-name, .page-subtitle, h2').first().text().trim() ||
                   $('meta[property="og:description"]').attr('content')?.split(' - ')[0] ||
                   $('.breadcrumb a').eq(-2).text().trim();
    
    console.log('🎵 Título extraído:', title);
    console.log('🎤 Artista extraído:', artist);
    
    // Extrair cifra/letra - estratégia mais robusta
    let lyrics = '';
    
    // Seletores modernos e específicos para o CifraClub
    const modernSelectors = [
      'pre[class*="cifra"], pre[class*="tab"], pre[class*="chord"]',
      '[data-js="cipher"], [data-cipher="true"]', 
      '.js-cipher-content, .cipher-content, .tab-cipher',
      '.tablature-content, .music-content, .song-content',
      'pre:contains("**"), pre:contains("tom:")' // Específico para formato negrito do CifraClub
    ];
    
    for (const selector of modernSelectors) {
      const elements = $(selector);
      console.log(`🔍 Seletor '${selector}': ${elements.length} elementos`);
      
      if (elements.length > 0) {
        lyrics = elements.first().text().trim();
        if (lyrics.length > 100) {
          console.log(`✅ Conteúdo encontrado com '${selector}': ${lyrics.length} chars`);
          break;
        }
      }
    }
    
    // Estratégia alternativa: procurar por elementos <pre> com cifras
    if (!lyrics || lyrics.length < 100) {
      $('pre').each((index, element) => {
        const text = $(element).text().trim();
        // Verificar se contém acordes comuns
        if (text.match(/\b[A-G][#b]?m?\b.*\n.*[a-zA-Z]/)) {
          console.log(`🎵 Cifra encontrada em <pre> ${index}: ${text.length} chars`);
          lyrics = text;
          return false; // break
        }
      });
    }
    
    // Se não encontrou pelos seletores específicos, tentar extrair de scripts ou outras fontes
    if (!lyrics || lyrics.length < 50) {
      // Procurar em scripts JSON-LD ou outras estruturas
      $('script[type="application/ld+json"]').each((_, script) => {
        try {
          const jsonData = JSON.parse($(script).html() || '');
          if (jsonData.lyrics) {
            lyrics = jsonData.lyrics;
          }
        } catch (e) {
          // Ignorar erros de parsing JSON
        }
      });
    }
    
    // Fallback: extrair todo texto relevante da página
    if (!lyrics || lyrics.length < 50) {
      const mainContent = $('.main-content, .content, .container').first();
      if (mainContent.length > 0) {
        lyrics = mainContent.text().trim();
      }
    }

    console.log('📋 Resultado da extração:', { 
      title: title || 'VAZIO', 
      artist: artist || 'VAZIO',
      lyricsLength: lyrics.length 
    });

    // Condição mais flexível - aceitar se pelo menos temos título OU cifra
    if ((!title || title.length < 3) && (!lyrics || lyrics.length < 50)) {
      console.log('⚠️ Extração falhou completamente, usando mock');
      const mockMusic: Music = generateMockMusicFromUrl(url);
      return NextResponse.json({ 
        music: mockMusic, 
        warning: '⚠️ MOCK: Dados de demonstração - extração falharam' 
      });
    }

    // Se não temos cifra mas temos título, tentar extrair da URL
    if ((!lyrics || lyrics.length < 50) && title) {
      console.log('⚠️ Título encontrado mas cifra não - criando mock com dados reais');
      const mockMusic: Music = generateMockMusicFromUrl(url);
      mockMusic.title = title;
      mockMusic.artist = artist || mockMusic.artist;
      
      return NextResponse.json({ 
        music: mockMusic, 
        warning: '⚠️ PARCIAL: Título real + cifra de demonstração' 
      });
    }

    // Processar a letra e extrair cifras
    const originalLyrics = parseLyricsWithChords(lyrics);
    const originalKey = extractKeyFromContent(lyrics);
    
    // Transpor para C se não estiver em C
    const transposedLyrics = originalKey !== 'C' ? transposeLyricsToC(originalLyrics, originalKey) : originalLyrics;

    // Criar objeto Music - SEMPRE em C mas com tom original salvo
    const music: Music = {
      id: Date.now().toString(),
      title,
      artist: artist || 'Artista Desconhecido',
      originalKey, // Tom original da música
      currentKey: 'C', // SEMPRE inicia em C
      lyrics: transposedLyrics, // Cifras transpostas para C
      createdAt: new Date(),
      updatedAt: new Date(),
      cifraClubUrl: url,
    };

    return NextResponse.json({ music });

  } catch (error) {
    console.error('Erro ao importar música do CifraClub:', error);
    
    // Dados mock mais realistas para demonstração
    const mockMusic: Music = generateMockMusicFromUrl(url);

    return NextResponse.json({ 
      music: mockMusic, 
      warning: '⚠️ MOCK: Dados de demonstração - CifraClub bloqueado' 
    });
  }
}

function generateMockMusicFromUrl(url: string): Music {
  // Verificar se é uma música específica que temos dados reais
  if (url.includes('atrai-meu-coracao')) {
    return generateAtraiMeuCoracaoMusic(url);
  }
  
  // Extrair info da URL para gerar mock realista
  const urlParts = url.split('/').pop()?.replace(/[^a-zA-Z0-9\s-]/g, '') || 'musica';
  const songName = urlParts.replace(/-/g, ' ').split(' ').map(w => 
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
  
  const originalKey = ['G', 'C', 'D', 'Am', 'Em', 'F'][Math.floor(Math.random() * 6)];
  
  return {
    id: Date.now().toString(),
    title: songName || 'Música Importada',
    artist: getArtistFromSong(songName),
    originalKey,
    currentKey: 'C', // Sempre em C conforme solicitado
    lyrics: generateRealisticLyrics(songName),
    createdAt: new Date(),
    updatedAt: new Date(),
    cifraClubUrl: url,
  };
}

function generateAtraiMeuCoracaoMusic(url: string): Music {
  // Dados baseados na estrutura da música para demonstração
  const lyrics: LyricLine[] = [
    {
      id: 'line-1',
      text: 'Tu és minha vida, Jesus',
      chords: [
        { id: 'chord-1', chord: 'C', position: 0 },
        { id: 'chord-2', chord: 'F', position: 8 },
        { id: 'chord-3', chord: 'G/B', position: 16 }
      ],
      position: 0
    },
    {
      id: 'line-2', 
      text: 'És meu amigo',
      chords: [
        { id: 'chord-4', chord: 'C', position: 10 }
      ],
      position: 1
    },
    {
      id: 'line-3',
      text: 'E a tua vontade, doce Espírito',
      chords: [
        { id: 'chord-5', chord: 'F', position: 4 },
        { id: 'chord-6', chord: 'G/B', position: 18 }
      ],
      position: 2
    },
    {
      id: 'line-4',
      text: 'Meu alimento',
      chords: [
        { id: 'chord-7', chord: 'C', position: 8 }
      ],
      position: 3
    },
    {
      id: 'line-5',
      text: 'Refrão - Atrai o meu coração',
      chords: [
        { id: 'chord-8', chord: 'F', position: 8 }
      ],
      position: 4
    },
    {
      id: 'line-6',
      text: 'Atrai o meu coração',
      chords: [
        { id: 'chord-9', chord: 'Am', position: 8 }
      ],
      position: 5
    },
    {
      id: 'line-7',
      text: 'És tudo que eu quero',
      chords: [
        { id: 'chord-10', chord: 'C', position: 10 }
      ],
      position: 6
    },
    {
      id: 'line-8',
      text: 'Eu posso te tocar',
      chords: [
        { id: 'chord-11', chord: 'C', position: 0 },
        { id: 'chord-12', chord: 'F', position: 6 },
        { id: 'chord-13', chord: 'G/B', position: 10 },
        { id: 'chord-14', chord: 'F/A', position: 14 }
      ],
      position: 7
    }
  ];

  return {
    id: Date.now().toString(),
    title: 'Atrai o Meu Coração',
    artist: 'Filhos do Homem',
    originalKey: 'D', // Tom original da música
    currentKey: 'C', // Sempre iniciar em C (transposta)
    lyrics,
    createdAt: new Date(),
    updatedAt: new Date(),
    cifraClubUrl: url,
  };
}

function getArtistFromSong(songName: string): string {
  const lower = songName.toLowerCase();
  if (lower.includes('imagine') || lower.includes('thunder') || lower.includes('demons')) return 'Imagine Dragons';
  if (lower.includes('yellow') || lower.includes('fix') || lower.includes('paradise')) return 'Coldplay';
  if (lower.includes('yesterday') || lower.includes('let') || lower.includes('help')) return 'The Beatles';
  if (lower.includes('bohemian') || lower.includes('queen') || lower.includes('rock')) return 'Queen';
  if (lower.includes('with') || lower.includes('without') || lower.includes('where')) return 'U2';
  return 'Artista da Música';
}

function generateRealisticLyrics(songName: string): LyricLine[] {
  return [
    {
      id: 'intro',
      text: 'Intro instrumental',
      chords: [
        { id: 'chord-1', chord: 'C', position: 0 },
        { id: 'chord-2', chord: 'Am', position: 8 }
      ],
      position: 0
    },
    {
      id: 'verse1-1',
      text: `Esta é a primeira linha de ${songName}`,
      chords: [
        { id: 'chord-3', chord: 'F', position: 0 },
        { id: 'chord-4', chord: 'C', position: 15 },
        { id: 'chord-5', chord: 'G', position: 25 }
      ],
      position: 1
    },
    {
      id: 'verse1-2',
      text: 'Com acordes que mudam automaticamente',
      chords: [
        { id: 'chord-6', chord: 'Am', position: 0 },
        { id: 'chord-7', chord: 'F', position: 12 },
        { id: 'chord-8', chord: 'C', position: 28 }
      ],
      position: 2
    },
    {
      id: 'chorus-1',
      text: 'Refrão com progressão clássica',
      chords: [
        { id: 'chord-9', chord: 'C', position: 0 },
        { id: 'chord-10', chord: 'G', position: 8 },
        { id: 'chord-11', chord: 'Am', position: 16 },
        { id: 'chord-12', chord: 'F', position: 24 }
      ],
      position: 3
    },
    {
      id: 'chorus-2',
      text: 'Você pode editar qualquer parte',
      chords: [
        { id: 'chord-13', chord: 'F', position: 0 },
        { id: 'chord-14', chord: 'G', position: 12 },
        { id: 'chord-15', chord: 'C', position: 24 }
      ],
      position: 4
    },
    {
      id: 'bridge',
      text: 'Ponte musical com acordes diferentes',
      chords: [
        { id: 'chord-16', chord: 'Em', position: 0 },
        { id: 'chord-17', chord: 'Am', position: 10 },
        { id: 'chord-18', chord: 'Dm', position: 20 },
        { id: 'chord-19', chord: 'G', position: 30 }
      ],
      position: 5
    }
  ];
}