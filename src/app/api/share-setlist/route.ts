import { NextRequest, NextResponse } from 'next/server';

// Interface para o setlist compartilhado
interface SharedSetlist {
  id: string;
  data: unknown;
  createdAt: string;
  expiresAt: string;
}

// Armazenamento em memória (em produção, usar banco de dados)
const sharedSetlists = new Map<string, SharedSetlist>();

// Função para gerar ID único curto
function generateShortId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Função para limpar setlists expirados
function cleanExpiredSetlists() {
  const now = new Date().toISOString();
  for (const [id, setlist] of sharedSetlists.entries()) {
    if (setlist.expiresAt < now) {
      sharedSetlists.delete(id);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { setlist } = await request.json();

    if (!setlist) {
      return NextResponse.json(
        { error: 'Setlist é obrigatório' },
        { status: 400 }
      );
    }

    // Limpar setlists expirados
    cleanExpiredSetlists();

    // Gerar ID único curto
    let shareId = generateShortId();
    while (sharedSetlists.has(shareId)) {
      shareId = generateShortId();
    }

    // Criar setlist compartilhado (válido por 7 dias)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const sharedSetlist: SharedSetlist = {
      id: shareId,
      data: setlist,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    sharedSetlists.set(shareId, sharedSetlist);

    console.log(`📤 Setlist compartilhado criado: ${shareId}`);

    return NextResponse.json({
      shareId,
      shareUrl: `${request.nextUrl.origin}/shared/${shareId}`,
      expiresAt: expiresAt.toISOString(),
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
    const shareId = url.searchParams.get('id');

    if (!shareId) {
      return NextResponse.json(
        { error: 'ID de compartilhamento é obrigatório' },
        { status: 400 }
      );
    }

    // Limpar setlists expirados
    cleanExpiredSetlists();

    const sharedSetlist = sharedSetlists.get(shareId);

    if (!sharedSetlist) {
      return NextResponse.json(
        { error: 'Setlist não encontrado ou expirado' },
        { status: 404 }
      );
    }

    console.log(`📥 Setlist compartilhado acessado: ${shareId}`);

    return NextResponse.json({
      setlist: sharedSetlist.data,
      createdAt: sharedSetlist.createdAt,
      expiresAt: sharedSetlist.expiresAt,
    });

  } catch (error) {
    console.error('Erro ao buscar setlist compartilhado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}