'use client';

import { migrateIdToUUID } from '@/utils/generateId';

export interface BackupData {
  setlists: unknown[];
  timestamp: string;
  version: string;
  userAgent: string;
}

class RobustStorage {
  private static instance: RobustStorage;
  private backupKey = 'setlist-backup';
  private historyKey = 'setlist-history';
  private maxHistorySize = 10; // Manter 10 backups históricos

  private constructor() {
    this.initAutoBackup();
  }

  static getInstance(): RobustStorage {
    if (!RobustStorage.instance) {
      RobustStorage.instance = new RobustStorage();
    }
    return RobustStorage.instance;
  }

  // 💾 SALVAR COM BACKUP MÚLTIPLO
  async saveSetlists(setlists: unknown[]): Promise<void> {
    // Verificar se estamos no cliente (browser)
    if (typeof window === 'undefined') return;
    
    try {
      const timestamp = new Date().toISOString();
      const backupData: BackupData = {
        setlists,
        timestamp,
        version: '1.0',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server'
      };

      // 1. Salvar no localStorage principal
      localStorage.setItem('setlists', JSON.stringify(setlists));

      // 2. Salvar backup redundante
      localStorage.setItem(this.backupKey, JSON.stringify(backupData));

      // 3. Salvar no sessionStorage como backup temporário
      sessionStorage.setItem('setlists-session', JSON.stringify(setlists));

      // 4. Salvar no histórico (array de backups)
      this.saveToHistory(backupData);

      // 5. Tentar salvar no IndexedDB
      await this.saveToIndexedDB(backupData);

      // 6. Criar download automático a cada 5 mudanças
      this.triggerAutoDownload(setlists);
      
      // 7. Limpar flag de reset se salvamento foi bem-sucedido
      localStorage.removeItem('__reset_in_progress__');

      console.log('💾 Dados salvos com segurança múltipla!');
    } catch (error) {
      console.error('❌ Erro ao salvar dados:', error);
      alert('⚠️ ERRO AO SALVAR! Faça backup manual imediatamente!');
    }
  }

  // 🧹 Limpar dados com UUIDs corrompidos
  private cleanCorruptedData(): void {
    console.log('🧹 Limpando dados corrompidos...');
    
    try {
      // Remover localStorage corrompido
      ['setlists', 'setlist-backup', 'setlist-history', 'setlists-session'].forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            const hasCorruptedIds = this.hasCorruptedUUIDs(parsed);
            if (hasCorruptedIds) {
              console.log(`🗑️ Removendo ${key} corrompido`);
              localStorage.removeItem(key);
            }
          } catch {
            console.log(`🗑️ Removendo ${key} inválido`);
            localStorage.removeItem(key);
          }
        }
      });
      
      // Limpar sessionStorage também
      sessionStorage.removeItem('setlists-session');
      
    } catch (error) {
      console.error('Erro ao limpar dados corrompidos:', error);
    }
  }

  // 🔍 Verificar se há UUIDs corrompidos nos dados
  private hasCorruptedUUIDs(data: unknown): boolean {
    if (Array.isArray(data)) {
      return data.some(item => this.hasCorruptedUUIDs(item));
    }
    
    if (data && typeof data === 'object') {
      // Verificar se tem ID corrompido
      const dataWithId = data as Record<string, unknown>;
      if (dataWithId.id && typeof dataWithId.id === 'string') {
        // UUID válido deve ter 36 caracteres e formato correto
        const isValidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(dataWithId.id);
        if (!isValidFormat) {
          console.log(`🚨 UUID corrompido encontrado: ${dataWithId.id}`);
          return true;
        }
      }
      
      // Verificar recursivamente
      for (const key in dataWithId) {
        if (this.hasCorruptedUUIDs(dataWithId[key])) {
          return true;
        }
      }
    }
    
    return false;
  }

  // 🔄 Migrar dados antigos com IDs timestamp para UUID
  private migrateDataToUUID(data: unknown[]): unknown[] {
    console.log('🔄 Migrando dados para UUID...');
    
    return data.map(setlist => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setlistAny = setlist as any;
      const migratedSetlist = {
        ...setlistAny,
        id: migrateIdToUUID(setlistAny.id),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        musics: setlistAny.musics?.map((music: any) => ({
          ...music,
          id: migrateIdToUUID(music.id),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lyrics: music.lyrics?.map((line: any) => ({
            ...line,
            id: migrateIdToUUID(line.id),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            chords: line.chords?.map((chord: any) => ({
              ...chord,
              id: migrateIdToUUID(chord.id)
            })) || []
          })) || []
        })) || []
      };
      
      return migratedSetlist;
    });
  }

  // 📖 CARREGAR COM RECUPERAÇÃO AUTOMÁTICA
  loadSetlists(): unknown[] {
    // Verificar se estamos no cliente (browser)
    if (typeof window === 'undefined') {
      console.log('⚠️ localStorage não disponível no servidor');
      return [];
    }
    
    // 🛑 Verificar se está em reset - não restaurar automaticamente
    if (localStorage.getItem('__reset_in_progress__') === 'true') {
      console.log('🛑 Reset em progresso - não restaurando backups');
      return [];
    }
    
    try {
      console.log('📖 Carregando setlists...');

      // 1. Tentar localStorage principal
      const main = localStorage.getItem('setlists');
      if (main && this.isValidData(main)) {
        console.log('✅ Carregado do localStorage principal');
        return JSON.parse(main);
      }

      // 2. Tentar backup redundante
      const backup = localStorage.getItem(this.backupKey);
      if (backup) {
        const backupData: BackupData = JSON.parse(backup);
        if (backupData.setlists && Array.isArray(backupData.setlists)) {
          console.log('✅ Recuperado do backup redundante!');
          // Restaurar dados principais
          localStorage.setItem('setlists', JSON.stringify(backupData.setlists));
          return backupData.setlists;
        }
      }

      // 3. Tentar sessionStorage
      const session = sessionStorage.getItem('setlists-session');
      if (session && this.isValidData(session)) {
        console.log('✅ Recuperado do sessionStorage!');
        // Restaurar dados principais
        localStorage.setItem('setlists', session);
        return JSON.parse(session);
      }

      // 4. Tentar histórico
      const fromHistory = this.loadFromHistory();
      if (fromHistory && fromHistory.length > 0) {
        console.log('✅ Recuperado do histórico!');
        localStorage.setItem('setlists', JSON.stringify(fromHistory));
        return fromHistory;
      }

      // 5. Tentar IndexedDB
      this.loadFromIndexedDB().then(fromDB => {
        if (fromDB && fromDB.length > 0) {
          console.log('✅ Recuperado do IndexedDB!');
          localStorage.setItem('setlists', JSON.stringify(fromDB));
          // Recarregar página para aplicar dados
          setTimeout(() => window.location.reload(), 100);
        }
      });

      console.log('ℹ️ Nenhum dado encontrado - iniciando vazio');
      return [];

    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      return [];
    }
  }

  // 📚 HISTÓRICO DE BACKUPS
  private saveToHistory(backupData: BackupData): void {
    try {
      const history = JSON.parse(localStorage.getItem(this.historyKey) || '[]');
      history.unshift(backupData); // Adicionar no início

      // Manter apenas os últimos backups
      if (history.length > this.maxHistorySize) {
        history.splice(this.maxHistorySize);
      }

      localStorage.setItem(this.historyKey, JSON.stringify(history));
    } catch (error) {
      console.error('Erro ao salvar histórico:', error);
    }
  }

  private loadFromHistory(): unknown[] | null {
    try {
      const history = JSON.parse(localStorage.getItem(this.historyKey) || '[]');
      if (history.length > 0) {
        return history[0].setlists; // Retornar backup mais recente
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
    return null;
  }

  // 🗄️ INDEXEDDB COMO BACKUP ROBUSTO
  private async saveToIndexedDB(backupData: BackupData): Promise<void> {
    try {
      if (!window.indexedDB) return;

      const request = indexedDB.open('SetlistWadeDB', 1);
      
      request.onupgradeneeded = (event: Event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'timestamp' });
        }
      };

      request.onsuccess = (event: Event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['backups'], 'readwrite');
        const store = transaction.objectStore('backups');
        store.put(backupData);
      };
    } catch (error) {
      console.error('Erro ao salvar no IndexedDB:', error);
    }
  }

  private async loadFromIndexedDB(): Promise<unknown[] | null> {
    return new Promise((resolve) => {
      try {
        if (!window.indexedDB) {
          resolve(null);
          return;
        }

        const request = indexedDB.open('SetlistWadeDB', 1);
        
        request.onsuccess = (event: Event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(['backups'], 'readonly');
          const store = transaction.objectStore('backups');
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = () => {
            const backups = getAllRequest.result;
            if (backups && backups.length > 0) {
              // Retornar backup mais recente
              backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
              resolve(backups[0].setlists);
            } else {
              resolve(null);
            }
          };
        };

        request.onerror = () => resolve(null);
      } catch (error) {
        console.error('Erro ao carregar do IndexedDB:', error);
        resolve(null);
      }
    });
  }

  // 📥 DOWNLOAD AUTOMÁTICO
  private triggerAutoDownload(setlists: unknown[]): void {
    try {
      // Contar quantas vezes salvou
      const saveCount = parseInt(localStorage.getItem('save-count') || '0') + 1;
      localStorage.setItem('save-count', saveCount.toString());

      // A cada 5 salvamentos, oferecer download
      if (saveCount % 5 === 0) {
        this.createBackupFile(setlists);
      }
    } catch (error) {
      console.error('Erro no download automático:', error);
    }
  }

  // 🔄 RESET COMPLETO - Limpar todos os dados corrompidos
  resetCorruptedData(): { success: boolean; message: string } {
    if (typeof window === 'undefined') {
      return { success: false, message: 'Não disponível no servidor' };
    }

    try {
      console.log('🔄 RESET: Limpando todos os dados corrompidos...');
      
      // Marcar reset em progresso PRIMEIRO
      localStorage.setItem('__reset_in_progress__', 'true');
      
      // Backup dos dados antes de limpar
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupKey = `reset-backup-${timestamp}`;
      
      // Tentar fazer backup de dados válidos
      const main = localStorage.getItem('setlists');
      if (main) {
        localStorage.setItem(backupKey, main);
        console.log(`📦 Backup criado: ${backupKey}`);
      }
      
      // Limpar TODOS os dados relacionados
      const keysToRemove = [
        'setlists',
        'setlist-backup', 
        'setlist-history',
        'setlists-session',
        'device_id' // Regenerar device ID também
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Removido: ${key}`);
      });
      
      // Limpar sessionStorage
      sessionStorage.clear();
      
      console.log('✅ Reset completo realizado!');
      return { 
        success: true, 
        message: `Reset completo realizado! Backup salvo como ${backupKey}. Recarregue a página.` 
      };
      
    } catch (error) {
      console.error('Erro no reset:', error);
      return { 
        success: false, 
        message: `Erro no reset: ${error instanceof Error ? error.message : 'Desconhecido'}` 
      };
    }
  }

  // 💾 EXPORT MANUAL
  exportBackup(): void {
    try {
      const setlists = this.loadSetlists();
      this.createBackupFile(setlists);
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      alert('Erro ao criar backup!');
    }
  }

  private createBackupFile(setlists: unknown[]): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `setlist-wade-backup-${timestamp}.json`;
    
    const backupData: BackupData = {
      setlists,
      timestamp: new Date().toISOString(),
      version: '1.0',
      userAgent: navigator.userAgent
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`💾 Backup criado: ${filename}`);
  }

  // 📥 IMPORT BACKUP
  async importBackup(fileContent: string): Promise<boolean> {
    try {
      const data = JSON.parse(fileContent);
      
      // Verificar se é um backup válido
      if (data.setlists && Array.isArray(data.setlists)) {
        await this.saveSetlists(data.setlists);
        console.log('✅ Backup importado com sucesso!');
        return true;
      } else if (Array.isArray(data)) {
        // Compatibilidade com formato antigo
        await this.saveSetlists(data);
        console.log('✅ Dados importados com sucesso!');
        return true;
      } else {
        throw new Error('Formato de backup inválido');
      }
    } catch (error) {
      console.error('❌ Erro ao importar backup:', error);
      return false;
    }
  }

  // 🔍 VERIFICAR DADOS
  private isValidData(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed);
    } catch {
      return false;
    }
  }

  // 📊 ESTATÍSTICAS DE BACKUP
  getBackupStats(): { 
    main: boolean, 
    backup: boolean, 
    session: boolean, 
    history: number,
    saveCount: number 
  } {
    // Verificar se estamos no cliente
    if (typeof window === 'undefined') {
      return {
        main: false,
        backup: false,
        session: false,
        history: 0,
        saveCount: 0
      };
    }
    
    return {
      main: !!localStorage.getItem('setlists'),
      backup: !!localStorage.getItem(this.backupKey),
      session: !!sessionStorage.getItem('setlists-session'),
      history: JSON.parse(localStorage.getItem(this.historyKey) || '[]').length,
      saveCount: parseInt(localStorage.getItem('save-count') || '0')
    };
  }

  // 🔄 INICIALIZAR AUTO-BACKUP
  private initAutoBackup(): void {
    // Verificar se estamos no cliente (browser)
    if (typeof window === 'undefined') {
      console.log('⚠️ Auto-backup desabilitado no servidor');
      return;
    }

    // Fazer backup a cada 30 segundos se houver dados
    setInterval(() => {
      try {
        // Não fazer auto-backup durante reset
        if (localStorage.getItem('__reset_in_progress__') === 'true') {
          return;
        }
        
        const setlists = localStorage.getItem('setlists');
        if (setlists) {
          const parsed = JSON.parse(setlists);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Só fazer backup se realmente tem dados
            this.saveSetlists(parsed);
          }
        }
      } catch (error) {
        console.error('Erro no auto-backup:', error);
      }
    }, 30000); // 30 segundos

    console.log('🔄 Sistema de auto-backup iniciado (30s)');
  }
}

// Instância singleton
export const robustStorage = RobustStorage.getInstance();