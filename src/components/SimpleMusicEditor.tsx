'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Save, Eye, Edit3 } from 'lucide-react';

// Tipos locais para evitar problemas de importação
interface Chord {
  id: string;
  chord: string;
  position: number;
}

interface LyricLine {
  id: string;
  text: string;
  chords: Chord[];
}

interface Music {
  id: string;
  title: string;
  artist: string;
  currentKey: string;
  originalKey: string;
  lyrics: LyricLine[];
  createdAt: Date;
  updatedAt: Date;
}

interface SimpleMusicEditorProps {
  music: Music;
  onMusicUpdated: (updatedMusic: Music) => void;
  onClose: () => void;
  initialViewMode?: 'edit' | 'view';
}

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function SimpleMusicEditor({ music, onMusicUpdated, onClose, initialViewMode = 'edit' }: SimpleMusicEditorProps) {
  const [localMusic, setLocalMusic] = useState<Music>(music);
  const [isEditing, setIsEditing] = useState<{ lineId?: string; chordId?: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'view'>(initialViewMode);

  // Funções de transposição
  const calculateSemitones = (fromKey: string, toKey: string): number => {
    const keyMap: { [key: string]: number } = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
      'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };
    
    const fromSemitone = keyMap[fromKey] ?? 0;
    const toSemitone = keyMap[toKey] ?? 0;
    return (toSemitone - fromSemitone + 12) % 12;
  };

  const transposeChord = (chord: string, semitones: number): string => {
    const keyMap: { [key: string]: number } = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
      'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };
    
    const reverseKeyMap = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    // Função helper para transpor uma nota individual
    const transposeNote = (note: string): string => {
      const normalizedNote = note.replace('Bb', 'A#').replace('Db', 'C#').replace('Eb', 'D#').replace('Gb', 'F#').replace('Ab', 'G#');
      const currentSemitone = keyMap[normalizedNote] ?? 0;
      const newSemitone = (currentSemitone + semitones) % 12;
      return reverseKeyMap[newSemitone];
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
      const chordRegex = /^([A-G][#b]?)(.*)$/;
      const match = chord.match(chordRegex);
      
      if (!match) return chord;
      
      const [, root, suffix] = match;
      const newRoot = transposeNote(root);
      
      return newRoot + suffix;
    }
  };

  const transposeLyrics = (lyrics: LyricLine[], fromKey: string, toKey: string): LyricLine[] => {
    const semitones = calculateSemitones(fromKey, toKey);
    
    return lyrics.map(line => ({
      ...line,
      chords: line.chords.map(chord => ({
        ...chord,
        chord: transposeChord(chord.chord, semitones)
      }))
    }));
  };

  // Salvar mudanças explicitamente
  const handleSave = () => {
    onMusicUpdated(localMusic);
    setHasUnsavedChanges(false);
  };

  // Alterar tom
  const handleKeyChange = (newKey: string) => {
    const transposedLyrics = transposeLyrics(localMusic.lyrics, localMusic.currentKey, newKey);
    const updatedMusic = {
      ...localMusic,
      currentKey: newKey,
      lyrics: transposedLyrics,
      updatedAt: new Date()
    };
    setLocalMusic(updatedMusic);
    setHasUnsavedChanges(true);
  };

  // Voltar ao tom original
  const handleOriginalKey = () => {
    if (localMusic.originalKey && localMusic.originalKey !== localMusic.currentKey) {
      handleKeyChange(localMusic.originalKey);
    }
  };

  // Adicionar linha
  const addNewLine = () => {
    const newLineId = `line-${Date.now()}`;
    const newLine: LyricLine = {
      id: newLineId,
      text: '',
      chords: []
    };

    const updatedLyrics = [...localMusic.lyrics, newLine];
    const updatedMusic = { ...localMusic, lyrics: updatedLyrics, updatedAt: new Date() };
    setLocalMusic(updatedMusic);
    setHasUnsavedChanges(true);
    
    // Começar a editar a nova linha
    setIsEditing({ lineId: newLineId });
    setEditValue('');
  };

  // ✨ ADICIONAR ACORDE - MÉTODO SIMPLES
  const addChord = (lineId: string, position: number) => {
    const newChordId = `chord-${lineId}-${Date.now()}`;
    const newChord: Chord = {
      id: newChordId,
      chord: 'C',
      position: position
    };

    const updatedLyrics = localMusic.lyrics.map(line =>
      line.id === lineId
        ? {
            ...line,
            chords: [...line.chords, newChord].sort((a, b) => a.position - b.position)
          }
        : line
    );

    const updatedMusic = { ...localMusic, lyrics: updatedLyrics, updatedAt: new Date() };
    setLocalMusic(updatedMusic);
    setHasUnsavedChanges(true);
  };

  // Deletar linha
  const deleteLine = (lineId: string) => {
    const updatedLyrics = localMusic.lyrics.filter(line => line.id !== lineId);
    const updatedMusic = { ...localMusic, lyrics: updatedLyrics, updatedAt: new Date() };
    setLocalMusic(updatedMusic);
    setHasUnsavedChanges(true);
  };

  // Deletar acorde
  const deleteChord = (lineId: string, chordId: string) => {
    const updatedLyrics = localMusic.lyrics.map(line =>
      line.id === lineId
        ? { ...line, chords: line.chords.filter(chord => chord.id !== chordId) }
        : line
    );
    const updatedMusic = { ...localMusic, lyrics: updatedLyrics, updatedAt: new Date() };
    setLocalMusic(updatedMusic);
    setHasUnsavedChanges(true);
  };

  // Editar texto
  const startEditingText = (lineId: string, currentText: string) => {
    setIsEditing({ lineId });
    setEditValue(currentText);
  };

  // Editar acorde
  const startEditingChord = (lineId: string, chordId: string, currentChord: string) => {
    setIsEditing({ lineId, chordId });
    setEditValue(currentChord);
  };

  // Salvar edição
  const saveEdit = () => {
    if (!isEditing) return;

    const { lineId, chordId } = isEditing;

    if (chordId) {
      // Editando acorde
      const updatedLyrics = localMusic.lyrics.map(line =>
        line.id === lineId
          ? {
              ...line,
              chords: line.chords.map(chord =>
                chord.id === chordId ? { ...chord, chord: editValue } : chord
              )
            }
          : line
      );
      const updatedMusic = { ...localMusic, lyrics: updatedLyrics, updatedAt: new Date() };
      setLocalMusic(updatedMusic);
      onMusicUpdated(updatedMusic);
    } else {
      // Editando texto
      const updatedLyrics = localMusic.lyrics.map(line =>
        line.id === lineId ? { ...line, text: editValue } : line
      );
      const updatedMusic = { ...localMusic, lyrics: updatedLyrics, updatedAt: new Date() };
      setLocalMusic(updatedMusic);
      onMusicUpdated(updatedMusic);
    }

    setIsEditing(null);
    setEditValue('');
  };

  // Teclas Enter/Escape
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(null);
      setEditValue('');
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">{localMusic.title}</h3>
            <p className="text-sm text-muted-foreground">{localMusic.artist}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Tom:</label>
              <Select value={localMusic.currentKey} onValueChange={handleKeyChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KEYS.map(key => (
                    <SelectItem key={key} value={key}>{key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {localMusic.originalKey && localMusic.originalKey !== localMusic.currentKey && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOriginalKey}
                className="text-xs"
              >
                Tom Original ({localMusic.originalKey})
              </Button>
            )}
            <Button
              variant={hasUnsavedChanges ? "default" : "outline"}
              size="sm"
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className={hasUnsavedChanges ? "bg-green-600 hover:bg-green-700 text-white" : ""}
            >
              <Save className="h-4 w-4 mr-1" />
              {hasUnsavedChanges ? 'Salvar *' : 'Salvo'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'edit' ? 'view' : 'edit')}
            >
              {viewMode === 'edit' ? (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Visualizar
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4 mr-1" />
                  Editar
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-0.5">
        {viewMode === 'edit' ? (
          // MODO EDIÇÃO - Com linhas pontilhadas e controles
          localMusic.lyrics.map((line) => (
            <div key={line.id} className="group relative border rounded-lg p-2 hover:border-blue-400/50 transition-all">
              
              {/* LINHA DE ACORDES - EDIÇÃO */}
              <div 
                className="relative h-6 mb-0.5 border-b border-dashed border-gray-300 cursor-crosshair"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const position = Math.round(clickX / 12); // ~12px por caractere
                  addChord(line.id, position);
                }}
                title="Clique onde quer adicionar um acorde"
              >
                {line.chords.map(chord => (
                  <span
                    key={chord.id}
                    className="absolute font-bold text-blue-400 cursor-pointer hover:bg-blue-400/20 px-1 rounded"
                    style={{ left: `${chord.position * 12}px` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingChord(line.id, chord.id, chord.chord);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      deleteChord(line.id, chord.id);
                    }}
                    title="Clique para editar • Duplo clique para deletar"
                  >
                    {isEditing?.lineId === line.id && isEditing?.chordId === chord.id ? (
                      <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyPress}
                        onBlur={saveEdit}
                        className="w-12 bg-transparent border-b border-blue-400 outline-none text-center font-bold text-blue-400"
                        autoFocus
                      />
                    ) : (
                      chord.chord
                    )}
                  </span>
                ))}
                {line.chords.length === 0 && (
                  <span className="absolute left-2 top-1 text-xs text-gray-400 italic">
                    Clique para adicionar acordes
                  </span>
                )}
              </div>

              {/* LINHA DE TEXTO - EDIÇÃO */}
              <div 
                className="min-h-[1.2rem] cursor-text leading-tight"
                onClick={() => startEditingText(line.id, line.text)}
                title="Clique para editar o texto"
              >
                {isEditing?.lineId === line.id && !isEditing?.chordId ? (
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    onBlur={saveEdit}
                    className="w-full bg-transparent border-b border-blue-400 outline-none"
                    autoFocus
                    placeholder="Digite o texto da linha..."
                  />
                ) : (
                  <span className={line.text ? '' : 'text-gray-400 italic'}>
                    {line.text || 'Clique para adicionar texto...'}
                  </span>
                )}
              </div>

              {/* BOTÃO DELETAR LINHA */}
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-red-400 hover:text-red-600"
                onClick={() => deleteLine(line.id)}
                title="Deletar linha"
              >
                ×
              </Button>
            </div>
          ))
        ) : (
          // MODO VISUALIZAÇÃO - Limpo, sem linhas pontilhadas
          localMusic.lyrics.map((line) => (
            <div key={line.id} className="py-1">
              {/* ACORDES - VISUALIZAÇÃO FINAL */}
              {line.chords.length > 0 && (
                <div className="relative h-6 mb-0.5">
                  {line.chords.map(chord => (
                    <span
                      key={chord.id}
                      className="absolute font-bold text-blue-400"
                      style={{ left: `${chord.position * 12}px` }}
                    >
                      {chord.chord}
                    </span>
                  ))}
                </div>
              )}
              
              {/* TEXTO - VISUALIZAÇÃO FINAL */}
              <div className="min-h-[1.2rem] leading-tight">
                <span>{line.text}</span>
              </div>
            </div>
          ))
        )}

        {/* BOTÃO ADICIONAR LINHA - APENAS NO MODO EDIÇÃO */}
        {viewMode === 'edit' && (
          <div className="flex justify-center pt-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={addNewLine}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Adicionar Nova Linha
            </Button>
          </div>
        )}


      </CardContent>
    </Card>
  );
}