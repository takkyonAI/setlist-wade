'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SimpleMusicEditor } from '@/components/SimpleMusicEditor';
import { ArrowLeft, Music, Calendar, Eye, Share2, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

// Tipos locais (duplicados para evitar dependências)
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

interface Setlist {
  id: string;
  name: string;
  description?: string;
  musics: Music[];
  createdAt: Date;
  updatedAt: Date;
}

// Função para converter dados do banco para formato local
function databaseToSetlist(dbSetlist: { id: string; name: string; description?: string; created_at: string; updated_at: string }, dbMusics: { id: string; title: string; artist: string; original_key: string; current_key: string; lyrics: { id: string; text: string; chords: { id: string; chord: string; position: number }[]; position: number }[]; cifra_club_url?: string; created_at: string; updated_at: string; position: number }[]): Setlist {
  return {
    id: dbSetlist.id,
    name: dbSetlist.name,
    description: dbSetlist.description,
    createdAt: new Date(dbSetlist.created_at),
    updatedAt: new Date(dbSetlist.updated_at),
    musics: dbMusics.map(dbMusic => ({
      id: dbMusic.id,
      title: dbMusic.title,
      artist: dbMusic.artist,
      originalKey: dbMusic.original_key,
      currentKey: dbMusic.current_key,
      lyrics: dbMusic.lyrics || [],
      createdAt: new Date(dbMusic.created_at),
      updatedAt: new Date(dbMusic.updated_at),
      cifraClubUrl: dbMusic.cifra_club_url,
    })).sort((a, b) => (a as { position: number }).position - (b as { position: number }).position),
  };
}

export default function SharedSetlistPage() {
  const params = useParams();
  const shareId = params.id as string;
  
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [selectedMusic, setSelectedMusic] = useState<Music | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null); // Mantido para compatibilidade

  // Carregar setlist do localStorage usando o ID
  useEffect(() => {
    const loadSharedSetlist = async () => {
      try {
        setLoading(true);
        console.log('🔍 Procurando setlist com ID:', shareId);

        // 1. PRIMEIRO: Tentar carregar do localStorage
        const stored = localStorage.getItem('setlists');
        const allSetlists = stored ? JSON.parse(stored) : [];
        
        console.log('📦 Setlists encontrados no storage local:', allSetlists.length);

        const foundSetlist = allSetlists.find((s: Setlist) => s.id === shareId);

        if (foundSetlist) {
          console.log('✅ Setlist encontrado no localStorage:', foundSetlist.name);
          
          const setlistData = {
            ...foundSetlist,
            createdAt: new Date(foundSetlist.createdAt),
            updatedAt: new Date(foundSetlist.updatedAt),
            musics: foundSetlist.musics?.map((music: Music) => ({
              ...music,
              createdAt: new Date(music.createdAt),
              updatedAt: new Date(music.updatedAt),
            })) || [],
          };
          
          setSetlist(setlistData);
          setExpiresAt(null);
          return;
        }

        // 2. SE NÃO ENCONTROU NO LOCAL: Buscar no Supabase
        console.log('🔍 Não encontrado localmente, buscando no Supabase...');
        
        // Buscar setlist no banco
        const { data: dbSetlist, error: setlistError } = await supabase
          .from('setlists')
          .select('*')
          .eq('id', shareId)
          .single();

        if (setlistError) {
          console.error('❌ Erro ao buscar setlist no banco:', setlistError);
          setError('Setlist não encontrado. Verifique se o link está correto.');
          return;
        }

        if (!dbSetlist) {
          console.log('❌ Setlist não existe no banco');
          setError('Setlist não encontrado. O link pode estar incorreto ou o setlist foi removido.');
          return;
        }

        // Buscar músicas do setlist
        const { data: dbMusics, error: musicsError } = await supabase
          .from('musics')
          .select('*')
          .eq('setlist_id', shareId)
          .order('position');

        if (musicsError) {
          console.error('❌ Erro ao buscar músicas:', musicsError);
          setError('Erro ao carregar músicas do setlist.');
          return;
        }

        // Converter para formato local
        const setlistData = databaseToSetlist(dbSetlist, dbMusics || []);
        
        console.log('✅ Setlist carregado do Supabase:', setlistData.name);
        setSetlist(setlistData);
        setExpiresAt(null);

      } catch (err) {
        console.error('❌ Erro ao carregar setlist:', err);
        setError('Erro ao carregar setlist. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    if (shareId) {
      loadSharedSetlist();
    }
  }, [shareId]);

  const handleViewMusic = (music: Music) => {
    setSelectedMusic(music);
  };

  const handleShareSetlist = async () => {
    if (!setlist) return;

    try {
      const shareUrl = window.location.href;
      
      if (navigator.share) {
        // Usar Web Share API se disponível (mobile)
        await navigator.share({
          title: `Setlist: ${setlist.name}`,
          text: `Confira este setlist com ${setlist.musics.length} músicas`,
          url: shareUrl,
        });
      } else {
        // Fallback: copiar para clipboard
        await navigator.clipboard.writeText(shareUrl);
        alert('✅ Link copiado para a área de transferência!');
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      // Fallback manual
      const shareUrl = window.location.href;
      prompt('Copie este link para compartilhar:', shareUrl);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR');
  };

  // Se uma música está selecionada, mostrar o editor
  if (selectedMusic) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        {/* Header simples com botão voltar */}
        <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-sm border-b border-gray-800 p-3">
          <Button
            onClick={() => setSelectedMusic(null)}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar ao Setlist
          </Button>
        </div>

        {/* Editor em modo somente leitura */}
        <div className="p-2">
          <SimpleMusicEditor
            music={selectedMusic}
            onMusicUpdated={(updatedMusic) => {
              // Modo somente leitura
              console.log('Visualização apenas:', updatedMusic.title);
            }}
            onClose={() => setSelectedMusic(null)}
            initialViewMode="view"
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando setlist compartilhado...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-2">Setlist não encontrado</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <div className="text-sm text-gray-500 mb-4">
            <p className="mb-2">Este setlist pode estar disponível apenas no dispositivo onde foi criado.</p>
            <p>Para visualizar:</p>
            <ol className="text-left list-decimal list-inside mt-2 space-y-1">
              <li>Acesse no mesmo dispositivo onde foi criado</li>
              <li>Ou peça para quem criou exportar/sincronizar</li>
            </ol>
          </div>
          <div className="space-y-2">
            <Button 
              onClick={() => window.location.reload()}
              className="w-full"
              variant="outline"
            >
              🔄 Tentar novamente
            </Button>
            <Button 
              onClick={() => window.location.href = '/'}
              className="w-full"
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ir para Setlist Wade
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!setlist) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Music className="h-6 w-6 text-green-400" />
            <span className="text-sm text-gray-400">Setlist Compartilhado</span>
          </div>
          
          <h1 className="text-3xl font-bold mb-2 text-green-400">
            {setlist.name}
          </h1>
          
          {setlist.description && (
            <p className="text-gray-300 mb-2">{setlist.description}</p>
          )}
          
          <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Music className="h-4 w-4" />
              <span>{setlist.musics.length} músicas</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Criado em {formatDate(setlist.createdAt)}</span>
            </div>
          </div>

          <p className="text-xs text-green-400 mt-2">
            🔗 Link permanente - nunca expira
          </p>
        </motion.div>

        {/* Botão de compartilhar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 text-center"
        >
          <Button 
            onClick={handleShareSetlist}
            variant="outline"
            className="border-green-400 text-green-400 hover:bg-green-400 hover:text-black"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar este Setlist
          </Button>
        </motion.div>

        {/* Lista de músicas */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {setlist.musics.length === 0 ? (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-8 text-center">
                <Music className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">
                  Setlist vazio
                </h3>
                <p className="text-gray-500">
                  Este setlist não possui músicas ainda.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gray-800/30 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Music className="h-5 w-5 text-green-400" />
                  Músicas ({setlist.musics.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2 p-4">
                  {setlist.musics.map((music, index) => (
                    <motion.div
                      key={music.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors group cursor-pointer"
                      onClick={() => handleViewMusic(music)}
                    >
                      <div className="bg-green-400 text-black rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">
                          {music.title}
                        </h4>
                        <p className="text-sm text-gray-400">{music.artist}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-gray-600 rounded-md border border-gray-500 text-green-400">
                          {music.currentKey}
                        </span>
                        
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-gray-400 hover:text-white"
                            title="Visualizar música"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8 pb-4"
        >
          <p className="text-sm text-gray-500 mb-2">
            Criado com ❤️ usando Setlist Wade
          </p>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.open('/', '_blank')}
            className="text-green-400 hover:text-green-300"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Criar meu próprio setlist
          </Button>
        </motion.div>
      </div>
    </div>
  );
}