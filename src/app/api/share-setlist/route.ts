import { NextRequest, NextResponse } from 'next/server';

// Sistema simplificado: usar o ID do setlist diretamente como URL
// URLs permanentes baseadas no próprio ID do setlist - nunca expiram
// Force deploy - v2.0

export async function POST(request: NextRequest) {
  try {
    const { setlist } = await request.json();

    if (!setlist || !setlist.id) {
      return NextResponse.json(
        { error: 'Setlist com ID é obrigatório' },
        { status: 400 }
      );
    }

    // Usar o ID do setlist diretamente como shareId (URL fixa e permanente)
    const shareId = setlist.id;

    console.log(`📤 URL permanente criada para setlist: ${setlist.name} (${shareId})`);

    return NextResponse.json({
      shareId,
      shareUrl: `${request.nextUrl.origin}/shared/${shareId}`,
      permanent: true, // Indicar que é URL permanente
    });

  } catch (error) {
    console.error('Erro ao criar link de compartilhamento:', error);
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