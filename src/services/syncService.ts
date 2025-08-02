'use client';

import { supabase, checkConnection, type DatabaseSetlist, type DatabaseMusic } from '@/lib/supabase';
import { robustStorage } from '@/utils/robustStorage';
import type { Setlist, Music } from '@/types';

// Gerar ID único do dispositivo
const getDeviceId = (): string => {
  if (typeof window === 'undefined') return 'server';
  
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
};

// Converter tipos locais para banco de dados
const setlistToDatabase = (setlist: Setlist): Omit<DatabaseSetlist, 'created_at' | 'updated_at'> => ({
  id: setlist.id,
  name: setlist.name,
  description: setlist.description,
  device_id: getDeviceId(),
});

const musicToDatabase = (music: Music, setlistId: string, position: number): Omit<DatabaseMusic, 'created_at' | 'updated_at'> => ({
  id: music.id,
  setlist_id: setlistId,
  title: music.title,
  artist: music.artist,
  original_key: music.originalKey,
  current_key: music.currentKey,
  lyrics: music.lyrics,
  cifra_club_url: music.cifraClubUrl,
  position,
});

// Converter tipos de banco para locais
const databaseToSetlist = (dbSetlist: DatabaseSetlist, musics: DatabaseMusic[]): Setlist => ({
  id: dbSetlist.id,
  name: dbSetlist.name,
  description: dbSetlist.description,
  musics: musics
    .sort((a, b) => a.position - b.position)
    .map(databaseToMusic),
  createdAt: new Date(dbSetlist.created_at),
  updatedAt: new Date(dbSetlist.updated_at),
});

const databaseToMusic = (dbMusic: DatabaseMusic): Music => ({
  id: dbMusic.id,
  title: dbMusic.title,
  artist: dbMusic.artist,
  originalKey: dbMusic.original_key,
  currentKey: dbMusic.current_key,
  lyrics: dbMusic.lyrics,
  cifraClubUrl: dbMusic.cifra_club_url,
  createdAt: new Date(dbMusic.created_at),
  updatedAt: new Date(dbMusic.updated_at),
});

export class SyncService {
  private static instance: SyncService;
  private isOnline = false;
  private syncInProgress = false;

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  // Verificar se está online
  async checkOnlineStatus(): Promise<boolean> {
    this.isOnline = await checkConnection();
    return this.isOnline;
  }

  // Diagnóstico detalhado
  async diagnose(): Promise<{ status: string; message: string }> {
    try {
      const { data, error } = await supabase.from('setlists').select('count').limit(1);
      
      if (error) {
        if (error.message.includes('relation "setlists" does not exist')) {
          return {
            status: 'tables_missing',
            message: 'Tabelas não existem. Execute o SQL no Supabase primeiro.'
          };
        }
        return {
          status: 'connection_error',
          message: `Erro de conexão: ${error.message}`
        };
      }
      
      return {
        status: 'online',
        message: 'Conexão funcionando perfeitamente!'
      };
    } catch (error) {
      return {
        status: 'network_error',
        message: `Erro de rede: ${error instanceof Error ? error.message : 'Desconhecido'}`
      };
    }
  }

  // Sincronizar dados locais para o banco
  async syncUp(): Promise<{ success: boolean; message: string }> {
    if (this.syncInProgress) {
      return { success: false, message: 'Sincronização já em andamento' };
    }

    try {
      this.syncInProgress = true;
      
      if (!await this.checkOnlineStatus()) {
        return { success: false, message: 'Sem conexão com o banco de dados' };
      }

      const localSetlists = robustStorage.loadSetlists() as Setlist[];
      
      for (const setlist of localSetlists) {
        // Verificar se setlist já existe
        const { data: existingSetlist } = await supabase
          .from('setlists')
          .select('id, updated_at')
          .eq('id', setlist.id)
          .single();

        const setlistData = setlistToDatabase(setlist);

        if (!existingSetlist) {
          // Criar novo setlist
          const { error: setlistError } = await supabase
            .from('setlists')
            .insert([setlistData]);

          if (setlistError) throw setlistError;
        } else {
          // Atualizar setlist existente
          const { error: setlistError } = await supabase
            .from('setlists')
            .update(setlistData)
            .eq('id', setlist.id);

          if (setlistError) throw setlistError;
        }

        // Sincronizar músicas
        for (let i = 0; i < setlist.musics.length; i++) {
          const music = setlist.musics[i];
          const musicData = musicToDatabase(music, setlist.id, i);

          const { data: existingMusic } = await supabase
            .from('musics')
            .select('id')
            .eq('id', music.id)
            .single();

          if (!existingMusic) {
            // Criar nova música
            const { error: musicError } = await supabase
              .from('musics')
              .insert([musicData]);

            if (musicError) throw musicError;
          } else {
            // Atualizar música existente
            const { error: musicError } = await supabase
              .from('musics')
              .update(musicData)
              .eq('id', music.id);

            if (musicError) throw musicError;
          }
        }
      }

      return { success: true, message: `${localSetlists.length} setlists sincronizados com sucesso!` };

    } catch (error) {
      console.error('Erro na sincronização UP:', error);
      
      // Diagnóstico automático em caso de erro
      const diagnostic = await this.diagnose();
      
      if (diagnostic.status === 'tables_missing') {
        return { 
          success: false, 
          message: '❌ Tabelas não existem no Supabase. Execute o SQL primeiro: https://supabase.com/dashboard/project/pbqiumrsxnunnjcfnbzx' 
        };
      }
      
      return { 
        success: false, 
        message: `❌ ${diagnostic.message}` 
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Baixar dados do banco para local
  async syncDown(): Promise<{ success: boolean; message: string; setlists?: Setlist[] }> {
    try {
      if (!await this.checkOnlineStatus()) {
        return { success: false, message: 'Sem conexão com o banco de dados' };
      }

      // Buscar setlists
      const { data: dbSetlists, error: setlistsError } = await supabase
        .from('setlists')
        .select('*')
        .order('updated_at', { ascending: false });

      if (setlistsError) throw setlistsError;

      // Buscar músicas
      const { data: dbMusics, error: musicsError } = await supabase
        .from('musics')
        .select('*')
        .order('position');

      if (musicsError) throw musicsError;

      // Converter para formato local
      const setlists: Setlist[] = (dbSetlists || []).map(dbSetlist => {
        const setlistMusics = (dbMusics || []).filter(m => m.setlist_id === dbSetlist.id);
        return databaseToSetlist(dbSetlist, setlistMusics);
      });

      // Salvar localmente
      robustStorage.saveSetlists(setlists);

      return { 
        success: true, 
        message: `${setlists.length} setlists baixados com sucesso!`,
        setlists
      };

    } catch (error) {
      console.error('Erro na sincronização DOWN:', error);
      return { success: false, message: `Erro: ${error instanceof Error ? error.message : 'Desconhecido'}` };
    }
  }

  // Sincronização bidirecional inteligente
  async fullSync(): Promise<{ success: boolean; message: string }> {
    try {
      // Primeiro fazer upload dos dados locais
      const upResult = await this.syncUp();
      if (!upResult.success) {
        return upResult;
      }

      // Depois fazer download para garantir que temos tudo
      const downResult = await this.syncDown();
      if (!downResult.success) {
        return downResult;
      }

      return { success: true, message: 'Sincronização completa realizada com sucesso!' };

    } catch (error) {
      console.error('Erro na sincronização completa:', error);
      return { success: false, message: `Erro: ${error instanceof Error ? error.message : 'Desconhecido'}` };
    }
  }

  // Status da sincronização
  getStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      deviceId: getDeviceId(),
    };
  }
}

// Instância única
export const syncService = SyncService.getInstance();