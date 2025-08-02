'use client';

// Função para gerar UUID v4 válido
export function generateUUID(): string {
  if (typeof window !== 'undefined' && 'crypto' in window && 'randomUUID' in window.crypto) {
    // Usar API nativa se disponível (moderna)
    return window.crypto.randomUUID();
  }
  
  // Fallback para geração manual de UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Função para validar se uma string é um UUID válido
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Função para migrar ID antigo (timestamp) para UUID
export function migrateIdToUUID(oldId: string): string {
  // Se já é UUID, retorna como está
  if (isValidUUID(oldId)) {
    return oldId;
  }
  
  // Se é timestamp numérico, gera novo UUID determinístico baseado no timestamp
  if (/^\d+$/.test(oldId)) {
    // Usar o timestamp como seed para gerar UUID determinístico
    const timestamp = parseInt(oldId);
    const hex = timestamp.toString(16).padStart(8, '0');
    
    // Gerar UUID v4 determinístico baseado no timestamp
    return `${hex.substring(0, 8)}-${hex.substring(8, 12) || '0000'}-4${hex.substring(12, 15) || '000'}-8${hex.substring(15, 18) || '000'}-${generateUUID().substring(24)}`;
  }
  
  // Para qualquer outro formato, gera novo UUID
  return generateUUID();
}