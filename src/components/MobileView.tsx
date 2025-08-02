'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Music as MusicIcon } from 'lucide-react';
import { SimpleMusicEditor } from '@/components/SimpleMusicEditor';
import { robustStorage } from '@/utils/robustStorage';
import type { Music, Setlist } from '@/types';

export function MobileView() {
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<Music | null>(null);
  const [selectedSetlistId, setSelectedSetlistId] = useState<string | null>(null);

  // Carregar setlists do storage
  useEffect(() => {
    const loadedSetlists = robustStorage.loadSetlists() as Setlist[];
    setSetlists(loadedSetlists);
  }, []);

  // Coletar todas as músicas de todos os setlists
  const allMusics: (Music & { setlistName: string })[] = [];
  
  setlists.forEach(setlist => {
    setlist.musics.forEach(music => {
      allMusics.push({
        ...music,
        setlistName: setlist.name
      });
    });
  });

  // Se uma música está selecionada, mostrar o editor
  if (selectedMusic && selectedSetlistId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        {/* Header simples com botão voltar */}
        <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-sm border-b border-gray-800 p-3">
          <Button
            onClick={() => {
              setSelectedMusic(null);
              setSelectedSetlistId(null);
            }}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </div>

        {/* Editor em tela cheia */}
        <div className="p-2">
          <SimpleMusicEditor
            music={selectedMusic}
            onMusicUpdated={(updatedMusic) => {
              // No mobile, não permitir edição - apenas visualização
              console.log('Música atualizada (somente leitura):', updatedMusic.title);
            }}
            onClose={() => {
              setSelectedMusic(null);
              setSelectedSetlistId(null);
            }}
            initialViewMode="view"
          />
        </div>
      </div>
    );
  }

  // Lista de músicas
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Header compacto */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-sm border-b border-gray-800 p-4">
        <div className="flex items-center gap-2">
          <MusicIcon className="h-5 w-5 text-green-400" />
          <h1 className="text-lg font-bold">
            Setlist Wade
          </h1>
          <span className="text-sm text-gray-400 ml-auto">
            {allMusics.length} músicas
          </span>
        </div>
      </div>

      {/* Lista de músicas */}
      <div className="p-3 space-y-2">
        {allMusics.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6 text-center">
              <MusicIcon className="h-12 w-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">Nenhuma música encontrada</p>
              <p className="text-sm text-gray-500 mt-1">
                Acesse pelo desktop para adicionar músicas
              </p>
            </CardContent>
          </Card>
        ) : (
          allMusics.map((music) => {
            const setlist = setlists.find(s => s.musics.some(m => m.id === music.id));
            
            return (
              <Card
                key={`${music.id}-${music.setlistName}`}
                className="bg-gray-800/30 border-gray-700 hover:bg-gray-700/50 transition-all cursor-pointer active:scale-95"
                onClick={() => {
                  setSelectedMusic(music);
                  setSelectedSetlistId(setlist?.id || '');
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">
                        {music.title}
                      </h3>
                      <p className="text-sm text-gray-400 truncate">
                        {music.artist}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        📂 {music.setlistName}
                      </p>
                    </div>
                    
                    <div className="flex-shrink-0 ml-3 text-right">
                      <div className="text-xs text-green-400 font-medium">
                        {music.currentKey || music.originalKey || 'C'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Toque para abrir
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Footer compacto */}
      <div className="p-4 border-t border-gray-800 bg-black/50">
        <p className="text-xs text-gray-500 text-center">
          Setlist Wade Mobile • Para editar, acesse pelo desktop
        </p>
      </div>
    </div>
  );
}