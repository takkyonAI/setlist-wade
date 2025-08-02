import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Sistema completo: salvar no Supabase + gerar URL permanente  
// URLs permanentes baseadas no próprio ID do setlist - nunca expiram
// Force deploy - v2.2 - SUPABASE SAVE INTEGRATION

export async function POST(request: NextRequest) {
  try {
    const { setlist } = await request.json();

    if (!setlist || !setlist.id) {
      return NextResponse.json(
        { error: 'Setlist com ID é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`💾 Salvando setlist para compartilhamento: ${setlist.name} (${setlist.id})`);

    // 1. SALVAR SETLIST NO SUPABASE
    const { error: setlistError } = await supabase
      .from('setlists')
      .upsert({
        id: setlist.id,
        name: setlist.name,
        description: setlist.description || null,
        device_id: 'shared', // Marcar como compartilhado
        created_at: setlist.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (setlistError) {
      console.error('❌ Erro ao salvar setlist:', setlistError);
      return NextResponse.json(
        { error: 'Erro ao salvar setlist no banco' },
        { status: 500 }
      );
    }

    // 2. SALVAR MÚSICAS NO SUPABASE
    if (setlist.musics && setlist.musics.length > 0) {
      const musicsData = setlist.musics.map((music: { id: string; title: string; artist: string; originalKey: string; currentKey: string; lyrics: { id: string; text: string; chords: { id: string; chord: string; position: number }[]; position: number }[]; cifraClubUrl?: string; createdAt?: string | Date }, index: number) => ({
        id: music.id,
        setlist_id: setlist.id,
        title: music.title,
        artist: music.artist,
        original_key: music.originalKey,
        current_key: music.currentKey,
        lyrics: music.lyrics || [],
        cifra_club_url: music.cifraClubUrl || null,
        position: index,
        created_at: music.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: musicsError } = await supabase
        .from('musics')
        .upsert(musicsData);

      if (musicsError) {
        console.error('❌ Erro ao salvar músicas:', musicsError);
        return NextResponse.json(
          { error: 'Erro ao salvar músicas no banco' },
          { status: 500 }
        );
      }

      console.log(`✅ Setlist e ${setlist.musics.length} músicas salvos no Supabase!`);
    }

    // 3. RETORNAR URL PERMANENTE
    const shareId = setlist.id;
    console.log(`🔗 URL permanente criada: ${setlist.name} (${shareId})`);

    return NextResponse.json({
      shareId,
      shareUrl: `${request.nextUrl.origin}/shared/${shareId}`,
      permanent: true,
      saved: true, // Indicar que foi salvo no banco
    });

  } catch (error) {
    console.error('❌ Erro ao criar link de compartilhamento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const setlistId = url.searchParams.get('id');

    if (!setlistId) {
      return NextResponse.json(
        { error: 'ID do setlist é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`📥 Buscando setlist com ID: ${setlistId}`);

    // O ID é o próprio ID do setlist - a página irá carregar os dados do localStorage
    // ou solicitar que o usuário acesse pelo desktop primeiro
    return NextResponse.json({
      setlistId,
      message: 'Use o ID do setlist para carregar os dados do storage local',
      permanent: true,
    });

  } catch (error) {
    console.error('Erro ao processar solicitação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}