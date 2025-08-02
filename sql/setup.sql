-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de setlists
CREATE TABLE IF NOT EXISTS setlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID, -- Para futuro sistema de usuários
  device_id TEXT NOT NULL, -- Identificar dispositivo que criou
  
  -- Índices
  CONSTRAINT setlists_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200)
);

-- Tabela de músicas
CREATE TABLE IF NOT EXISTS musics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setlist_id UUID NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  original_key TEXT NOT NULL,
  current_key TEXT NOT NULL,
  lyrics JSONB NOT NULL, -- Array de linhas com letras e acordes
  cifra_club_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  position INTEGER DEFAULT 0, -- Ordem na setlist
  
  -- Índices
  CONSTRAINT musics_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  CONSTRAINT musics_artist_length CHECK (char_length(artist) >= 1 AND char_length(artist) <= 200)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_setlists_device_id ON setlists(device_id);
CREATE INDEX IF NOT EXISTS idx_setlists_created_at ON setlists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_musics_setlist_id ON musics(setlist_id);
CREATE INDEX IF NOT EXISTS idx_musics_position ON musics(setlist_id, position);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_setlists_updated_at 
  BEFORE UPDATE ON setlists 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_musics_updated_at 
  BEFORE UPDATE ON musics 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (Row Level Security) - por enquanto tudo público
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE musics ENABLE ROW LEVEL SECURITY;

-- Permitir acesso público por enquanto (sem autenticação)
CREATE POLICY "Allow all operations on setlists" ON setlists FOR ALL USING (true);
CREATE POLICY "Allow all operations on musics" ON musics FOR ALL USING (true);

-- Views úteis
CREATE OR REPLACE VIEW setlists_with_music_count AS
SELECT 
  s.*,
  COALESCE(m.music_count, 0) as music_count
FROM setlists s
LEFT JOIN (
  SELECT setlist_id, COUNT(*) as music_count
  FROM musics
  GROUP BY setlist_id
) m ON s.id = m.setlist_id
ORDER BY s.updated_at DESC;