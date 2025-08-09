import { robustStorage } from '@/utils/robustStorage';
import { generateUUID } from '@/utils/generateId';

// Tipos estruturais compatíveis com os usados no app
export interface Chord {
  id: string;
  chord: string;
  position: number;
}

export interface LyricLine {
  id: string;
  text: string;
  chords: Chord[];
  position?: number;
}

export interface Music {
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

export interface Setlist {
  id: string;
  name: string;
  description?: string;
  musics: Music[];
  createdAt: Date;
  updatedAt: Date;
}

export function useSetlistTransfer() {
  const cloneMusicWithNewId = (music: Music): Music => {
    return {
      ...music,
      id: generateUUID(),
      lyrics: music.lyrics.map(line => ({
        ...line,
        chords: line.chords.map(ch => ({ ...ch }))
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  const copySelectedToNewSetlist = (currentSetlist: Setlist, selectedIds: Set<string>): Setlist => {
    const musicsToCopy = currentSetlist.musics
      .filter(m => selectedIds.has(m.id))
      .map(cloneMusicWithNewId);

    const newSetlist: Setlist = {
      id: generateUUID(),
      name: `Novo Setlist (${musicsToCopy.length} músicas)`,
      description: `Criado a partir de ${currentSetlist.name}`,
      musics: musicsToCopy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const all = robustStorage.loadSetlists() as Setlist[];
    robustStorage.saveSetlists([...all, newSetlist]);
    return newSetlist;
  };

  const getAvailableSourceSetlists = (currentSetlistId: string): Setlist[] => {
    const all = robustStorage.loadSetlists() as Setlist[];
    return all.filter(s => s.id !== currentSetlistId);
  };

  const importFromSetlist = (
    currentSetlist: Setlist,
    sourceSetlistId: string,
    selectedSourceMusicIds: Set<string>
  ): Setlist => {
    const all = robustStorage.loadSetlists() as Setlist[];
    const source = all.find(s => s.id === sourceSetlistId);
    if (!source) return currentSetlist;

    const toAdd = source.musics
      .filter(m => selectedSourceMusicIds.has(m.id))
      .filter(m => !currentSetlist.musics.some(existing => existing.id === m.id))
      .map(cloneMusicWithNewId);

    const updated: Setlist = {
      ...currentSetlist,
      musics: [...currentSetlist.musics, ...toAdd],
      updatedAt: new Date(),
    };

    const saved = (robustStorage.loadSetlists() as Setlist[]).map(s =>
      s.id === currentSetlist.id ? updated : s
    );
    robustStorage.saveSetlists(saved);
    return updated;
  };

  return {
    cloneMusicWithNewId,
    copySelectedToNewSetlist,
    getAvailableSourceSetlists,
    importFromSetlist,
  };
}

