'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Upload, 
  Download,
  CheckCircle,
  AlertCircle 
} from 'lucide-react';
import { syncService } from '@/services/syncService';

interface SyncButtonProps {
  onSyncComplete?: () => void;
}

export function SyncButton({ onSyncComplete }: SyncButtonProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [lastSyncMessage, setLastSyncMessage] = useState<string>('');
  const [lastSyncSuccess, setLastSyncSuccess] = useState<boolean | null>(null);

  // Verificar status da conexão
  useEffect(() => {
    const checkStatus = async () => {
      const online = await syncService.checkOnlineStatus();
      setIsOnline(online);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Verificar a cada 30s

    return () => clearInterval(interval);
  }, []);

  const handleSync = async (type: 'full' | 'up' | 'down' = 'full') => {
    setSyncInProgress(true);
    setLastSyncMessage('');
    setLastSyncSuccess(null);

    try {
      let result;
      
      switch (type) {
        case 'up':
          result = await syncService.syncUp();
          break;
        case 'down':
          result = await syncService.syncDown();
          break;
        default:
          result = await syncService.fullSync();
      }

      setLastSyncMessage(result.message);
      setLastSyncSuccess(result.success);

      if (result.success && onSyncComplete) {
        onSyncComplete();
      }

    } catch (error) {
      setLastSyncMessage(`Erro: ${error instanceof Error ? error.message : 'Desconhecido'}`);
      setLastSyncSuccess(false);
    } finally {
      setSyncInProgress(false);
    }
  };

  const getStatusIcon = () => {
    if (syncInProgress) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    return isOnline ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    if (syncInProgress) return 'bg-blue-500';
    return isOnline ? 'bg-green-500' : 'bg-gray-500';
  };

  const getStatusText = () => {
    if (syncInProgress) return 'Sincronizando...';
    return isOnline ? 'Online' : 'Offline';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Status da conexão */}
      <Badge variant="outline" className={`${getStatusColor()} text-white border-none`}>
        {getStatusIcon()}
        <span className="ml-1">{getStatusText()}</span>
      </Badge>

      {/* Botões de sincronização */}
      <div className="flex gap-2">
        <Button
          onClick={() => handleSync('full')}
          disabled={!isOnline || syncInProgress}
          size="sm"
          className="min-w-[100px]"
        >
          {syncInProgress ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Sincronizando
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar
            </>
          )}
        </Button>

        <Button
          onClick={() => handleSync('up')}
          disabled={!isOnline || syncInProgress}
          size="sm"
          variant="outline"
          title="Enviar dados locais para a nuvem"
        >
          <Upload className="h-4 w-4" />
        </Button>

        <Button
          onClick={() => handleSync('down')}
          disabled={!isOnline || syncInProgress}
          size="sm"
          variant="outline"
          title="Baixar dados da nuvem"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Mensagem de resultado */}
      {lastSyncMessage && (
        <div className={`flex items-center gap-1 text-sm ${
          lastSyncSuccess ? 'text-green-600' : 'text-red-600'
        }`}>
          {lastSyncSuccess ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span className="max-w-[300px] text-center">{lastSyncMessage}</span>
        </div>
      )}

      {/* Instruções se offline */}
      {!isOnline && (
        <div className="text-xs text-muted-foreground text-center max-w-[250px]">
          Configure o Supabase para sincronizar dados entre dispositivos
        </div>
      )}
    </div>
  );
}