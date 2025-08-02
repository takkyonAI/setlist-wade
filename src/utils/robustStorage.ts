'use client';

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

      console.log('💾 Dados salvos com segurança múltipla!');
    } catch (error) {
      console.error('❌ Erro ao salvar dados:', error);
      alert('⚠️ ERRO AO SALVAR! Faça backup manual imediatamente!');
    }
  }

  // 📖 CARREGAR COM RECUPERAÇÃO AUTOMÁTICA
  loadSetlists(): unknown[] {
    // Verificar se estamos no cliente (browser)
    if (typeof window === 'undefined') {
      console.log('⚠️ localStorage não disponível no servidor');
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