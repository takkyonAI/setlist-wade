'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Setlist, Music } from '../types';
import { generateUUID } from '@/utils/generateId';

interface SetlistState {
  setlists: Setlist[];
  currentSetlist: Setlist | null;
  currentMusic: Music | null;
  isLoading: boolean;
  error: string | null;
}

type SetlistAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SETLISTS'; payload: Setlist[] }
  | { type: 'ADD_SETLIST'; payload: Setlist }
  | { type: 'UPDATE_SETLIST'; payload: Setlist }
  | { type: 'DELETE_SETLIST'; payload: string }
  | { type: 'SET_CURRENT_SETLIST'; payload: Setlist | null }
  | { type: 'SET_CURRENT_MUSIC'; payload: Music | null }
  | { type: 'ADD_MUSIC_TO_SETLIST'; payload: { setlistId: string; music: Music } }
  | { type: 'UPDATE_MUSIC_IN_SETLIST'; payload: { setlistId: string; music: Music } }
  | { type: 'DELETE_MUSIC_FROM_SETLIST'; payload: { setlistId: string; musicId: string } }
  | { type: 'REORDER_MUSICS_IN_SETLIST'; payload: { setlistId: string; musics: Music[] } };

const initialState: SetlistState = {
  setlists: [],
  currentSetlist: null,
  currentMusic: null,
  isLoading: false,
  error: null,
};

function setlistReducer(state: SetlistState, action: SetlistAction): SetlistState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_SETLISTS':
      return { ...state, setlists: action.payload, isLoading: false };
    
    case 'ADD_SETLIST':
      return { ...state, setlists: [...state.setlists, action.payload] };
    
    case 'UPDATE_SETLIST':
      return {
        ...state,
        setlists: state.setlists.map(setlist =>
          setlist.id === action.payload.id ? action.payload : setlist
        ),
        currentSetlist: state.currentSetlist?.id === action.payload.id 
          ? action.payload 
          : state.currentSetlist,
      };
    
    case 'DELETE_SETLIST':
      return {
        ...state,
        setlists: state.setlists.filter(setlist => setlist.id !== action.payload),
        currentSetlist: state.currentSetlist?.id === action.payload ? null : state.currentSetlist,
      };
    
    case 'SET_CURRENT_SETLIST':
      return { ...state, currentSetlist: action.payload };
    
    case 'SET_CURRENT_MUSIC':
      return { ...state, currentMusic: action.payload };
    
    case 'ADD_MUSIC_TO_SETLIST':
      return {
        ...state,
        setlists: state.setlists.map(setlist =>
          setlist.id === action.payload.setlistId
            ? { ...setlist, musics: [...setlist.musics, action.payload.music] }
            : setlist
        ),
      };
    
    case 'UPDATE_MUSIC_IN_SETLIST':
      return {
        ...state,
        setlists: state.setlists.map(setlist =>
          setlist.id === action.payload.setlistId
            ? {
                ...setlist,
                musics: setlist.musics.map(music =>
                  music.id === action.payload.music.id ? action.payload.music : music
                ),
              }
            : setlist
        ),
      };
    
    case 'DELETE_MUSIC_FROM_SETLIST':
      return {
        ...state,
        setlists: state.setlists.map(setlist =>
          setlist.id === action.payload.setlistId
            ? {
                ...setlist,
                musics: setlist.musics.filter(music => music.id !== action.payload.musicId),
              }
            : setlist
        ),
      };
    
    case 'REORDER_MUSICS_IN_SETLIST':
      return {
        ...state,
        setlists: state.setlists.map(setlist =>
          setlist.id === action.payload.setlistId
            ? { ...setlist, musics: action.payload.musics }
            : setlist
        ),
      };
    
    default:
      return state;
  }
}

interface SetlistContextType {
  state: SetlistState;
  dispatch: React.Dispatch<SetlistAction>;
  // Funções helper
  createSetlist: (name: string, description?: string) => Promise<void>;
  updateSetlist: (setlist: Setlist) => Promise<void>;
  deleteSetlist: (id: string) => Promise<void>;
  addMusicToSetlist: (setlistId: string, music: Music) => Promise<void>;
  updateMusicInSetlist: (setlistId: string, music: Music) => Promise<void>;
  deleteMusicFromSetlist: (setlistId: string, musicId: string) => Promise<void>;
  reorderMusicsInSetlist: (setlistId: string, musics: Music[]) => Promise<void>;
  loadSetlists: () => Promise<void>;
}

const SetlistContext = createContext<SetlistContextType | undefined>(undefined);

export function SetlistProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(setlistReducer, initialState);

  // Carregar setlists do localStorage (temporário, depois será Google Sheets)
  const loadSetlists = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const stored = localStorage.getItem('setlists');
      const setlists = stored ? JSON.parse(stored) : [];
      dispatch({ type: 'SET_SETLISTS', payload: setlists });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Erro ao carregar setlists' });
    }
  };

  // Salvar setlists no localStorage
  const saveSetlists = async (setlists: Setlist[]) => {
    try {
      localStorage.setItem('setlists', JSON.stringify(setlists));
    } catch (error) {
      console.error('Erro ao salvar setlists:', error);
    }
  };

  // Funções helper
  const createSetlist = async (name: string, description?: string) => {
    const newSetlist: Setlist = {
      id: generateUUID(),
      name,
      description,
      musics: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const updatedSetlists = [...state.setlists, newSetlist];
    dispatch({ type: 'ADD_SETLIST', payload: newSetlist });
    await saveSetlists(updatedSetlists);
  };

  const updateSetlist = async (setlist: Setlist) => {
    const updatedSetlist = { ...setlist, updatedAt: new Date() };
    const updatedSetlists = state.setlists.map(s => 
      s.id === setlist.id ? updatedSetlist : s
    );
    dispatch({ type: 'UPDATE_SETLIST', payload: updatedSetlist });
    await saveSetlists(updatedSetlists);
  };

  const deleteSetlist = async (id: string) => {
    const updatedSetlists = state.setlists.filter(s => s.id !== id);
    dispatch({ type: 'DELETE_SETLIST', payload: id });
    await saveSetlists(updatedSetlists);
  };

  const addMusicToSetlist = async (setlistId: string, music: Music) => {
    dispatch({ type: 'ADD_MUSIC_TO_SETLIST', payload: { setlistId, music } });
    // Salvar após atualização do estado
    setTimeout(() => saveSetlists(state.setlists), 100);
  };

  const updateMusicInSetlist = async (setlistId: string, music: Music) => {
    dispatch({ type: 'UPDATE_MUSIC_IN_SETLIST', payload: { setlistId, music } });
    setTimeout(() => saveSetlists(state.setlists), 100);
  };

  const deleteMusicFromSetlist = async (setlistId: string, musicId: string) => {
    dispatch({ type: 'DELETE_MUSIC_FROM_SETLIST', payload: { setlistId, musicId } });
    setTimeout(() => saveSetlists(state.setlists), 100);
  };

  const reorderMusicsInSetlist = async (setlistId: string, musics: Music[]) => {
    dispatch({ type: 'REORDER_MUSICS_IN_SETLIST', payload: { setlistId, musics } });
    setTimeout(() => saveSetlists(state.setlists), 100);
  };

  // Carregar setlists na inicialização
  useEffect(() => {
    loadSetlists();
  }, []);

  // Salvar quando setlists mudarem
  useEffect(() => {
    if (state.setlists.length > 0) {
      saveSetlists(state.setlists);
    }
  }, [state.setlists]);

  return (
    <SetlistContext.Provider
      value={{
        state,
        dispatch,
        createSetlist,
        updateSetlist,
        deleteSetlist,
        addMusicToSetlist,
        updateMusicInSetlist,
        deleteMusicFromSetlist,
        reorderMusicsInSetlist,
        loadSetlists,
      }}
    >
      {children}
    </SetlistContext.Provider>
  );
}

export function useSetlist() {
  const context = useContext(SetlistContext);
  if (context === undefined) {
    throw new Error('useSetlist must be used within a SetlistProvider');
  }
  return context;
}