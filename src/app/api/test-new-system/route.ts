import { NextRequest, NextResponse } from 'next/server';

// ENDPOINT DE TESTE - Sistema permanente v2.1
export async function POST(request: NextRequest) {
  try {
    const { setlist } = await request.json();

    if (!setlist || !setlist.id) {
      return NextResponse.json(
        { error: 'Setlist com ID é obrigatório' },
        { status: 400 }
      );
    }

    // Sistema NOVO - permanent URLs
    const shareId = setlist.id;

    console.log(`🧪 TESTE API v2.1: ${setlist.name} (${shareId})`);

    return NextResponse.json({
      shareId,
      shareUrl: `${request.nextUrl.origin}/shared/${shareId}`,
      permanent: true,
      testApi: true,
      version: "2.1",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro na API de teste:', error);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "API de teste v2.1 - Sistema permanente ativo",
    version: "2.1",
    permanent: true,
    timestamp: new Date().toISOString()
  });
}