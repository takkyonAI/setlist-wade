'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Music2, Volume2, Edit3, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useSetlist } from '@/contexts/SetlistContext';
import { Music, LyricLine, Chord } from '../types';
import { transposeMusic, getAllKeys, calculateSemitones } from '@/utils/chordTransposer';

interface MusicEditorProps {
  music: Music;
  setlistId: string;
  onBack: () => void;
}

export function MusicEditor({ music: initialMusic, setlistId, onBack }: MusicEditorProps) {
  const { updateMusicInSetlist } = useSetlist();
  const [music, setMusic] = useState<Music>(initialMusic);
  const [isEditing, setIsEditing] = useState<{ lineId: string; chordId?: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Atualizar música quando props mudarem
  useEffect(() => {
    setMusic(initialMusic);
    setHasChanges(false);
  }, [initialMusic]);

  const handleSave = async () => {
    await updateMusicInSetlist(setlistId, music);
    setHasChanges(false);
  };

  const handleKeyChange = (newKey: string) => {
    const transposedMusic = transposeMusic(music, newKey);
    setMusic(transposedMusic);
    setHasChanges(true);
  };

  const handleResetToOriginalKey = () => {
    const resetMusic = transposeMusic(music, music.originalKey);
    setMusic(resetMusic);
    setHasChanges(true);
  };

  const handleTitleChange = (newTitle: string) => {
    setMusic({ ...music, title: newTitle, updatedAt: new Date() });
    setHasChanges(true);
  };

  const handleArtistChange = (newArtist: string) => {
    setMusic({ ...music, artist: newArtist, updatedAt: new Date() });
    setHasChanges(true);
  };

  const handleLyricEdit = (lineId: string, newText: string) => {
    const updatedLyrics = music.lyrics.map(line =>
      line.id === lineId ? { ...line, text: newText } : line
    );
    setMusic({ ...music, lyrics: updatedLyrics, updatedAt: new Date() });
    setHasChanges(true);
    setIsEditing(null);
  };

  const handleChordEdit = (lineId: string, chordId: string, newChord: string) => {
    const updatedLyrics = music.lyrics.map(line =>
      line.id === lineId
        ? {
            ...line,
            chords: line.chords.map(chord =>
              chord.id === chordId ? { ...chord, chord: newChord } : chord
            ),
          }
        : line
    );
    setMusic({ ...music, lyrics: updatedLyrics, updatedAt: new Date() });
    setHasChanges(true);
    setIsEditing(null);
  };

  const addChordToLine = (lineId: string, position: number) => {
    const newChord: Chord = {
      id: `chord-${Date.now()}`,
      chord: 'C',
      position,
    };

    const updatedLyrics = music.lyrics.map(line =>
      line.id === lineId
        ? { ...line, chords: [...line.chords, newChord].sort((a, b) => a.position - b.position) }
        : line
    );

    setMusic({ ...music, lyrics: updatedLyrics, updatedAt: new Date() });
    setHasChanges(true);
  };

  const removeChord = (lineId: string, chordId: string) => {
    const updatedLyrics = music.lyrics.map(line =>
      line.id === lineId
        ? { ...line, chords: line.chords.filter(chord => chord.id !== chordId) }
        : line
    );
    setMusic({ ...music, lyrics: updatedLyrics, updatedAt: new Date() });
    setHasChanges(true);
  };

  const semitones = calculateSemitones(music.originalKey, music.currentKey);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{music.title}</h1>
              <p className="text-muted-foreground">{music.artist}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                Não salvo
              </Badge>
            )}
            <Button onClick={handleSave} disabled={!hasChanges}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Painel de controles */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music2 className="h-5 w-5" />
                  Configurações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Título */}
                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={music.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                  />
                </div>

                {/* Artista */}
                <div>
                  <Label htmlFor="artist">Artista</Label>
                  <Input
                    id="artist"
                    value={music.artist}
                    onChange={(e) => handleArtistChange(e.target.value)}
                  />
                </div>

                {/* Tom atual */}
                <div>
                  <Label htmlFor="key">Tom Atual</Label>
                  <Select value={music.currentKey} onValueChange={handleKeyChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAllKeys().map(key => (
                        <SelectItem key={key} value={key}>
                          {key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p>Tom original: <span className="font-medium">{music.originalKey}</span></p>
                    {semitones !== 0 && (
                      <p>
                        Transposição: {semitones > 0 ? '+' : ''}{semitones} semitons
                      </p>
                    )}
                  </div>
                  
                  {music.currentKey !== music.originalKey && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={handleResetToOriginalKey}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Voltar ao tom original
                    </Button>
                  )}
                </div>

                {/* Informações */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {music.lyrics.length} linhas
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {music.lyrics.reduce((acc, line) => acc + line.chords.length, 0)} acordes
                  </p>
                  {music.cifraClubUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 w-full"
                      onClick={() => window.open(music.cifraClubUrl, '_blank')}
                    >
                      Ver no CifraClub
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Editor de letra e cifras */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5" />
                  Letra e Cifras
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 font-mono text-sm">
                  {music.lyrics.map((line, index) => (
                    <LyricLineEditor
                      key={line.id}
                      line={line}
                      isEditing={isEditing}
                      onEditLyric={(newText) => handleLyricEdit(line.id, newText)}
                      onEditChord={(chordId, newChord) => handleChordEdit(line.id, chordId, newChord)}
                      onAddChord={(position) => addChordToLine(line.id, position)}
                      onRemoveChord={(chordId) => removeChord(line.id, chordId)}
                      setIsEditing={setIsEditing}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

interface LyricLineEditorProps {
  line: LyricLine;
  isEditing: { lineId: string; chordId?: string } | null;
  onEditLyric: (newText: string) => void;
  onEditChord: (chordId: string, newChord: string) => void;
  onAddChord: (position: number) => void;
  onRemoveChord: (chordId: string) => void;
  setIsEditing: React.Dispatch<React.SetStateAction<{ lineId: string; chordId?: string } | null>>;
}

function LyricLineEditor({
  line,
  isEditing,
  onEditLyric,
  onEditChord,
  onAddChord,
  onRemoveChord,
  setIsEditing,
}: LyricLineEditorProps) {
  const [editValue, setEditValue] = useState('');

  const startEditingLyric = () => {
    setEditValue(line.text);
    setIsEditing({ lineId: line.id });
  };

  const startEditingChord = (chordId: string, currentChord: string) => {
    setEditValue(currentChord);
    setIsEditing({ lineId: line.id, chordId });
  };

  const saveEdit = () => {
    if (isEditing?.chordId) {
      onEditChord(isEditing.chordId, editValue);
    } else {
      onEditLyric(editValue);
    }
    setIsEditing(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setEditValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const handleLineClick = (e: React.MouseEvent) => {
    if (isEditing) return;
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const clickPosition = e.clientX - rect.left;
    const charWidth = 8; // Aproximação da largura de um caractere em font-mono
    const position = Math.floor(clickPosition / charWidth);
    
    onAddChord(Math.min(position, line.text.length));
  };

  // Renderizar cifras acima da linha
  const renderChordLine = () => {
    if (line.chords.length === 0) return null;

    const maxPos = Math.max(line.text.length, ...line.chords.map(c => c.position + c.chord.length));
    const chordArray = new Array(maxPos).fill(' ');

    line.chords.forEach(chord => {
      const startPos = Math.min(chord.position, maxPos - chord.chord.length);
      for (let i = 0; i < chord.chord.length; i++) {
        if (startPos + i < chordArray.length) {
          chordArray[startPos + i] = chord.chord[i];
        }
      }
    });

    return (
      <div className="text-blue-400 select-none relative">
        {line.chords.map(chord => (
          <span
            key={chord.id}
            className="chord absolute cursor-pointer hover:bg-blue-400/20 rounded px-1"
            style={{ left: `${chord.position * 0.6}ch` }}
            onClick={() => startEditingChord(chord.id, chord.chord)}
            onDoubleClick={() => onRemoveChord(chord.id)}
            title="Clique para editar, duplo clique para remover"
          >
            {isEditing?.lineId === line.id && isEditing?.chordId === chord.id ? (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyPress}
                onBlur={saveEdit}
                className="h-6 w-16 text-xs p-1 font-mono"
                autoFocus
              />
            ) : (
              chord.chord
            )}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="group relative">
      {renderChordLine()}
      <div className="lyric-line min-h-[1.5em] relative">
        {isEditing?.lineId === line.id && !isEditing?.chordId ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={saveEdit}
            className="w-full font-mono text-sm"
            autoFocus
          />
        ) : (
          <span
            onClick={line.chords.length === 0 ? handleLineClick : startEditingLyric}
            className="cursor-pointer block"
            title={line.chords.length === 0 ? "Clique para adicionar acordes" : "Clique para editar"}
          >
            {line.text || '\u00A0'}
          </span>
        )}
      </div>
    </div>
  );
}