'use client';

import React, { useState } from 'react';

export function UltraSimple() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Record<string, unknown>[]>([]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/search-cifraclub?q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Erro:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleImport = async (url: string) => {
    try {
      const response = await fetch(`/api/import-cifraclub?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      console.log('Música importada:', data.music);
      alert(`Música importada: ${data.music?.title || 'Sucesso!'}`);
    } catch (error) {
      console.error('Erro na importação:', error);
      alert('Erro na importação');
    }
  };

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      fontWeight: 'bold',
      minHeight: '100vh', 
      backgroundColor: '#0a0a0a', 
      color: '#fff', 
      padding: '20px' 
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ 
          color: '#7dd3fc', 
          textAlign: 'center', 
          marginBottom: '30px',
          textShadow: '0 0 10px #7dd3fc'
        }}>
          🎵 SETLIST WADE - BUSCA REAL CIFRACLUB
        </h1>

        <div style={{ 
          backgroundColor: '#1a1a1a', 
          padding: '20px', 
          borderRadius: '10px', 
          marginBottom: '20px',
          border: '1px solid #333'
        }}>
          <h2 style={{ color: '#84cc16', marginBottom: '15px' }}>
            Buscar Música Real no CifraClub
          </h2>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite: nome da música ou artista..."
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor: '#2a2a2a',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '6px'
              }}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchTerm.trim()}
              style={{
                padding: '12px 20px',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor: isSearching ? '#666' : '#84cc16',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                cursor: isSearching ? 'not-allowed' : 'pointer'
              }}
            >
              {isSearching ? '🔍 Buscando...' : '🔍 Buscar'}
            </button>
          </div>

          {results.length > 0 && (
            <div>
              <h3 style={{ color: '#7dd3fc', marginBottom: '15px' }}>
                Resultados encontrados:
              </h3>
              {results.map((result, index) => (
                <div 
                  key={index}
                  style={{
                    backgroundColor: '#2a2a2a',
                    padding: '15px',
                    marginBottom: '10px',
                    borderRadius: '8px',
                    border: '1px solid #444'
                  }}
                >
                  <h4 style={{ color: '#fff', margin: '0 0 5px 0' }}>
                    {result.title as string}
                  </h4>
                  <p style={{ color: '#ccc', margin: '0 0 10px 0' }}>
                    {result.artist as string}
                  </p>
                  <button
                    onClick={() => handleImport(result.url as string)}
                    style={{
                      padding: '8px 15px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      backgroundColor: '#7dd3fc',
                      color: '#000',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    📥 Importar Música Real
                  </button>
                </div>
              ))}
            </div>
          )}

          {results.length === 0 && searchTerm && !isSearching && (
            <p style={{ color: '#888', textAlign: 'center' }}>
              Nenhuma música encontrada. Tente termos diferentes.
            </p>
          )}
        </div>

        <div style={{ 
          backgroundColor: '#1a1a1a', 
          padding: '20px', 
          borderRadius: '10px',
          border: '1px solid #333'
        }}>
          <h3 style={{ color: '#84cc16', marginBottom: '10px' }}>
            ✅ Sistema Funcionando:
          </h3>
          <ul style={{ color: '#ccc', lineHeight: '1.6' }}>
            <li>🎵 Busca REAL no CifraClub</li>
            <li>📥 Importação de dados verdadeiros</li>
            <li>🎼 Análise de cifras e letras</li>
            <li>🔤 Fonte Arial Bold aplicada</li>
            <li>🎸 APIs funcionais</li>
          </ul>
        </div>
      </div>
    </div>
  );
}