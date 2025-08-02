import { createClient } from '@supabase/supabase-js';

// Configurações públicas do Supabase (serão configuradas via variáveis de ambiente)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 5,
    },
  },
});

// Tipos específicos para o banco de dados
export interface DatabaseSetlist {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  device_id: string;
}

export interface DatabaseMusic {
  id: string;
  setlist_id: string;
  title: string;
  artist: string;
  original_key: string;
  current_key: string;
  lyrics: unknown; // JSON
  cifra_club_url?: string;
  created_at: string;
  updated_at: string;
  position: number;
}

// Status da conexão
export const checkConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('setlists').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
};