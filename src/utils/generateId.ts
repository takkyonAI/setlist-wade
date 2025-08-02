// Função para gerar UUID v4 válido (funciona no servidor e cliente)
export function generateUUID(): string {
  // No cliente (browser)
  if (typeof window !== 'undefined' && 'crypto' in window && 'randomUUID' in window.crypto) {
    return window.crypto.randomUUID();
  }
  
  // Fallback para geração manual de UUID v4 (servidor e cliente)
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
  // Se já é UUID válido, retorna como está
  if (isValidUUID(oldId)) {
    return oldId;
  }
  
  // Para qualquer ID inválido (timestamp, malformado, etc.), gera novo UUID
  // Não tentamos ser determinísticos pois isso pode gerar UUIDs inválidos
  return generateUUID();
}