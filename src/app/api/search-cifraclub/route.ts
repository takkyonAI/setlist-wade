import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
// Definir interface localmente para evitar imports quebrados
interface SearchResult {
  title: string;
  artist: string;
  url: string;
  key?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  // PRIMEIRO: Buscar na base de músicas REAIS conhecidas
  const realSongsDatabase = [
    { artist: "Legião Urbana", title: "Tempo Perdido", url: "https://www.cifraclub.com.br/legiao-urbana/tempo-perdido/", key: "G" },
    { artist: "Legião Urbana", title: "Eduardo e Mônica", url: "https://www.cifraclub.com.br/legiao-urbana/eduardo-e-monica/", key: "C" },
    { artist: "Imagine Dragons", title: "Demons", url: "https://www.cifraclub.com.br/imagine-dragons/demons/", key: "Em" },
    { artist: "Imagine Dragons", title: "Thunder", url: "https://www.cifraclub.com.br/imagine-dragons/thunder/", key: "C" },
    { artist: "Imagine Dragons", title: "Radioactive", url: "https://www.cifraclub.com.br/imagine-dragons/radioactive/", key: "Am" },
    { artist: "Coldplay", title: "Yellow", url: "https://www.cifraclub.com.br/coldplay/yellow/", key: "G" },
    { artist: "Coldplay", title: "Fix You", url: "https://www.cifraclub.com.br/coldplay/fix-you/", key: "Eb" },
    { artist: "The Beatles", title: "Yesterday", url: "https://www.cifraclub.com.br/the-beatles/yesterday/", key: "F" },
    { artist: "Queen", title: "Bohemian Rhapsody", url: "https://www.cifraclub.com.br/queen/bohemian-rhapsody/", key: "Bb" },
    { artist: "U2", title: "With Or Without You", url: "https://www.cifraclub.com.br/u2/with-or-without-you/", key: "D" },
    { artist: "Charlie Brown Jr.", title: "Só os Loucos Sabem", url: "https://www.cifraclub.com.br/charlie-brown-jr/so-os-loucos-sabem/", key: "E" },
    { artist: "Skank", title: "Ainda Gosto Dela", url: "https://www.cifraclub.com.br/skank/ainda-gosto-dela/", key: "Em" },
    { artist: "Cazuza", title: "Exagerado", url: "https://www.cifraclub.com.br/cazuza/exagerado/", key: "G" },
    { artist: "Raul Seixas", title: "Maluco Beleza", url: "https://www.cifraclub.com.br/raul-seixas/maluco-beleza/", key: "A" },
    { artist: "Los Hermanos", title: "Anna Júlia", url: "https://www.cifraclub.com.br/los-hermanos/anna-julia/", key: "C" },
  ];

  // Buscar músicas que coincidem com a query - mais flexível
  const queryLower = query.toLowerCase().trim();
  const matchingSongs = realSongsDatabase.filter(song => {
    const titleLower = song.title.toLowerCase();
    const artistLower = song.artist.toLowerCase();
    
    // Busca exata ou parcial
    return titleLower.includes(queryLower) ||
           artistLower.includes(queryLower) ||
           queryLower.includes(titleLower) ||
           queryLower.includes(artistLower) ||
           // Busca por palavras individuais
           queryLower.split(/\s+/).some(word => 
             word.length > 2 && (titleLower.includes(word) || artistLower.includes(word))
           ) ||
           // Busca sem acentos
           artistLower.replace(/[àáâãäå]/g, 'a').replace(/[éêë]/g, 'e').replace(/[íîï]/g, 'i')
           .replace(/[óôõö]/g, 'o').replace(/[úûü]/g, 'u').replace(/[ç]/g, 'c')
           .includes(queryLower.replace(/[àáâãäå]/g, 'a').replace(/[éêë]/g, 'e').replace(/[íîï]/g, 'i')
           .replace(/[óôõö]/g, 'o').replace(/[úûü]/g, 'u').replace(/[ç]/g, 'c'));
  });

  // Se encontrou músicas na base, incluir elas nos resultados mas CONTINUAR buscando
  let baseResults: SearchResult[] = [];
  if (matchingSongs.length > 0) {
    baseResults = matchingSongs.map(song => ({
      title: song.title,
      artist: song.artist,
      url: song.url,
      key: song.key
    }));
    console.log(`📚 Encontrado ${baseResults.length} músicas na base de dados`);
  }

  try {
    // SEGUNDO: Tentar scraping real no CifraClub (quando não encontrar na base)
    const searchUrl = `https://www.cifraclub.com.br/?q=${encodeURIComponent(query)}`;
    
    console.log('🔍 Não encontrou na base, tentando scraping real:', searchUrl);
    
    // Headers avançados para evitar bloqueio anti-bot
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
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
        'Referer': 'https://www.google.com/',
        'DNT': '1',
      },
      timeout: 20000, // 20 segundos de timeout
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Aceitar redirects
      },
    });

    const $ = cheerio.load(response.data);
    const results: SearchResult[] = [];

    // Seletores REAIS para o CifraClub - múltiplas estratégias
    console.log('📄 Analisando HTML do CifraClub...');
    
    // Log para debug - ver estrutura da página
    const pageTitle = $('title').text();
    console.log(`📋 Título da página: ${pageTitle}`);
    
    // Estratégia 1: Buscar URLs de músicas com padrão específico do CifraClub
    $('a[href]').each((index, element) => {
      if (results.length >= 10) return false;

      const $elem = $(element);
      const href = $elem.attr('href');
      const text = $elem.text().trim();

      // URLs de música no CifraClub: padrão específico mais restritivo
      const musicPattern = /^\/[a-zA-Z][a-zA-Z0-9\-]{2,}\/[a-zA-Z][a-zA-Z0-9\-]{2,}\/?$/;
      
      // Filtrar links de navegação específicos
      const isValidMusic = href && musicPattern.test(href) && 
                          !href.includes('/letra/') &&
                          !href.includes('/busca/') &&
                          !href.includes('/mais-') &&
                          !href.includes('/top-') &&
                          !href.includes('/genero/') &&
                          !href.includes('/artista/') &&
                          !href.match(/\/\d+\/$/) && // Evitar URLs só com números
                          text && text.length > 3 && text.length < 100;
      
      if (isValidMusic) {
        const pathParts = href.split('/').filter(part => part.length > 0);
        
        if (pathParts.length >= 2) {
          const artistSlug = pathParts[0];
          const musicSlug = pathParts[1];
          
          // Tentar extrair artista e música do contexto da página
          const artistFromUrl = artistSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const musicFromUrl = musicSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          
          results.push({
            title: text || musicFromUrl,
            artist: artistFromUrl,
            url: `https://www.cifraclub.com.br${href}`,
          });
        }
      }
    });

    // Estratégia 2: Links diretos de músicas
    if (results.length === 0) {
      console.log('🔄 Usando estratégia alternativa - links diretos...');
      
      $('a[href*="/"]').each((index, element) => {
        if (index >= 15 || results.length >= 10) return false;

        const $elem = $(element);
        const href = $elem.attr('href');
        const text = $elem.text().trim();

        // Filtrar APENAS links de músicas - mais restritivo
        if (href && text && 
            href.length > 5 && 
            !href.includes('busca') && 
            !href.includes('search') &&
            !href.includes('assine') &&
            !href.includes('aprenda') &&
            !href.includes('enviar') &&
            !href.includes('facebook') && 
            !href.includes('instagram') && 
            !href.includes('youtube') &&
            !href.includes('twitter') &&
            !href.includes('utm_') &&
            !href.includes('?') &&
            !href.includes('#') &&
            href.includes('/') &&
            href.split('/').length >= 2 && // Deve ter estrutura /artista/musica
            text.length > 3 && text.length < 80 &&
            !text.toLowerCase().includes('assine') &&
            !text.toLowerCase().includes('aprenda') &&
            !text.toLowerCase().includes('enviar')) {
          
          // Tentar extrair artista e música do contexto
          const parent = $elem.closest('.result-item, .mf-list__item, .song-item, li, .card');
          const artistContext = parent.find('.artist, .band, .singer').first().text().trim();
          
          const fullUrl = href.startsWith('http') ? href : `https://www.cifraclub.com.br${href}`;
          
          results.push({
            title: text,
            artist: artistContext || 'Artista a confirmar',
            url: fullUrl,
          });
        }
      });
    }
    
    console.log(`🎵 Resultados coletados: ${results.length} para "${query}"`);
    
    // Limpar duplicatas
    const uniqueResults = results.filter((result, index, self) => 
      index === self.findIndex(r => r.url === result.url)
    );

    // Combinar resultados da base + scraping
    const allResults = [...baseResults, ...uniqueResults];
    const finalResults = allResults.filter((result, index, self) => 
      index === self.findIndex(r => r.url === result.url)
    ).slice(0, 10);

    if (finalResults.length > 0) {
      return NextResponse.json({ 
        results: finalResults,
        source: baseResults.length > 0 ? 'mixed' : 'cifraclub_real',
        query,
        total: finalResults.length,
        info: baseResults.length > 0 ? 
          `🎵 ${baseResults.length} da base + ${uniqueResults.length} do site` :
          `🎵 ${uniqueResults.length} resultados encontrados no site`
      });
    }

    // Se não conseguiu scraping, oferecer opções manuais
    console.log('⚠️ Scraping não funcionou, oferecendo opções manuais...');
    
    const manualOptions: SearchResult[] = [
      ...baseResults, // Incluir resultados da base se houver
      {
        title: `🔍 Buscar "${query}" manualmente no CifraClub`,
        artist: 'Clique para abrir o CifraClub e copiar a URL',
        url: `https://www.cifraclub.com.br/?q=${encodeURIComponent(query)}`,
      },
      {
        title: `📝 Importar URL direta`,
        artist: 'Cole a URL da música do CifraClub na importação',
        url: `manual-import://${query}`,
      }
    ];

    return NextResponse.json({ 
      results: manualOptions,
      source: 'manual_options',
      query,
      total: manualOptions.length,
      info: '🔍 Use as opções manuais para encontrar qualquer música do CifraClub'
    });

  } catch (error) {
    console.error('Erro ao buscar no CifraClub:', error);
    
    // Retornar resultados mock em caso de erro para não quebrar a aplicação
    const mockResults: SearchResult[] = [
      {
        title: `Resultado para "${query}"`,
        artist: 'Artista Exemplo',
        url: 'https://www.cifraclub.com.br/exemplo',
      },
    ];

    // Base de músicas REAIS populares do CifraClub para busca
    const realSongsDatabase = [
      { artist: "Legião Urbana", title: "Tempo Perdido", url: "https://www.cifraclub.com.br/legiao-urbana/tempo-perdido/", key: "G" },
      { artist: "Legião Urbana", title: "Eduardo e Mônica", url: "https://www.cifraclub.com.br/legiao-urbana/eduardo-e-monica/", key: "C" },
      { artist: "Imagine Dragons", title: "Demons", url: "https://www.cifraclub.com.br/imagine-dragons/demons/", key: "Em" },
      { artist: "Imagine Dragons", title: "Thunder", url: "https://www.cifraclub.com.br/imagine-dragons/thunder/", key: "C" },
      { artist: "Imagine Dragons", title: "Radioactive", url: "https://www.cifraclub.com.br/imagine-dragons/radioactive/", key: "Am" },
      { artist: "Coldplay", title: "Yellow", url: "https://www.cifraclub.com.br/coldplay/yellow/", key: "G" },
      { artist: "Coldplay", title: "Fix You", url: "https://www.cifraclub.com.br/coldplay/fix-you/", key: "Eb" },
      { artist: "The Beatles", title: "Yesterday", url: "https://www.cifraclub.com.br/the-beatles/yesterday/", key: "F" },
      { artist: "Queen", title: "Bohemian Rhapsody", url: "https://www.cifraclub.com.br/queen/bohemian-rhapsody/", key: "Bb" },
      { artist: "U2", title: "With Or Without You", url: "https://www.cifraclub.com.br/u2/with-or-without-you/", key: "D" },
      { artist: "Charlie Brown Jr.", title: "Só os Loucos Sabem", url: "https://www.cifraclub.com.br/charlie-brown-jr/so-os-loucos-sabem/", key: "E" },
      { artist: "Skank", title: "Ainda Gosto Dela", url: "https://www.cifraclub.com.br/skank/ainda-gosto-dela/", key: "Em" },
      { artist: "Cazuza", title: "Exagerado", url: "https://www.cifraclub.com.br/cazuza/exagerado/", key: "G" },
      { artist: "Raul Seixas", title: "Maluco Beleza", url: "https://www.cifraclub.com.br/raul-seixas/maluco-beleza/", key: "A" },
      { artist: "Los Hermanos", title: "Anna Júlia", url: "https://www.cifraclub.com.br/los-hermanos/anna-julia/", key: "C" },
    ];

    // Buscar músicas que coincidem com a query
    const queryLower = query.toLowerCase();
    const matchingSongs = realSongsDatabase.filter(song => 
      song.title.toLowerCase().includes(queryLower) ||
      song.artist.toLowerCase().includes(queryLower) ||
      queryLower.includes(song.title.toLowerCase()) ||
      queryLower.includes(song.artist.toLowerCase())
    );

    // Se encontrou músicas correspondentes, retornar elas
    const betterMockResults: SearchResult[] = matchingSongs.length > 0 
      ? matchingSongs.map(song => ({
          title: song.title,
          artist: song.artist,
          url: song.url,
          key: song.key
        }))
      : [
          {
            title: `${query} - URL Manual`,
            artist: 'Digite a URL do CifraClub na importação',
            url: `https://www.cifraclub.com.br/busca/?q=${encodeURIComponent(query)}`,
            key: 'C'
          }
        ];

    return NextResponse.json({ 
      results: betterMockResults, 
      source: 'real_songs_database',
      total: betterMockResults.length,
      info: matchingSongs.length > 0 ? 
        '🎵 Músicas REAIS encontradas na base de dados!' : 
        '📝 Use a importação manual com URL do CifraClub para músicas específicas'
    });
  }
}

function getMockArtistFromQuery(query: string): string {
  const lowerQuery = query.toLowerCase();
  if (lowerQuery.includes('imagine')) return 'Imagine Dragons';
  if (lowerQuery.includes('coldplay')) return 'Coldplay';
  if (lowerQuery.includes('beatles')) return 'The Beatles';
  if (lowerQuery.includes('queen')) return 'Queen';
  if (lowerQuery.includes('u2')) return 'U2';
  return 'Artista ' + query.split(' ')[0];
}