'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Music, Calendar, ArrowLeft, FileDown, Loader2, Edit3, Link as LinkIcon, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SimpleMusicEditor } from '@/components/SimpleMusicEditor';
import { MobileView } from '@/components/MobileView';
import { SyncButton } from '@/components/SyncButton';
import { useIsMobile } from '@/hooks/useIsMobile';
import { robustStorage } from '@/utils/robustStorage';

// Tipos definidos localmente para teste
interface Chord {
  id: string;
  chord: string;
  position: number;
}

interface LyricLine {
  id: string;
  text: string;
  chords: Chord[];
  position: number;
}

interface Music {
  id: string;
  title: string;
  artist: string;
  originalKey: string;
  currentKey: string;
  lyrics: LyricLine[];
  createdAt: Date;
  updatedAt: Date;
  cifraClubUrl?: string;
}



interface Setlist {
  id: string;
  name: string;
  description?: string;
  musics: Music[];
  createdAt: Date;
  updatedAt: Date;
}

interface CreateSetlistFormData {
  name: string;
  description: string;
}

export function SimpleHomePage() {
  const isMobile = useIsMobile();
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [currentView, setCurrentView] = useState<'home' | 'setlist'>('home');
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateSetlistFormData>({
    name: '',
    description: '',
  });

  const handleCreateSetlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const newSetlist: Setlist = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      musics: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedSetlists = [...setlists, newSetlist];
    setSetlists(updatedSetlists);
    robustStorage.saveSetlists(updatedSetlists);
    setFormData({ name: '', description: '' });
    setIsCreateDialogOpen(false);
  };



  const handleOpenSetlist = (setlist: Setlist) => {
    setSelectedSetlist(setlist);
    setCurrentView('setlist');
  };

  const handleDeleteSetlist = async (setlistId: string, setlistName: string) => {
    // Confirmação antes de deletar
    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir o setlist "${setlistName}"?\n\nEsta ação não pode ser desfeita.`
    );
    
    if (!confirmDelete) return;
    
    try {
      // Filtrar o setlist a ser removido
      const updatedSetlists = setlists.filter(setlist => setlist.id !== setlistId);
      
      // Salvar a lista atualizada
      await robustStorage.saveSetlists(updatedSetlists);
      
      // Atualizar o estado local
      setSetlists(updatedSetlists);
      
      // Fechar o setlist se era o que estava aberto
      if (selectedSetlist?.id === setlistId) {
        setSelectedSetlist(null);
      }
      
    } catch (error) {
      console.error('Erro ao deletar setlist:', error);
      alert('Erro ao deletar setlist. Tente novamente.');
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const success = await robustStorage.importBackup(content);
      
      if (success) {
        // Recarregar dados
        const newSetlists = robustStorage.loadSetlists() as Setlist[];
        setSetlists(newSetlists);
        alert('✅ Backup importado com sucesso!');
      } else {
        alert('❌ Erro ao importar backup. Verifique o arquivo.');
      }
    } catch (error) {
      console.error('Erro ao importar backup:', error);
      alert('❌ Erro ao ler arquivo de backup.');
    }
    
    // Limpar input
    event.target.value = '';
  };

  // Carregar setlists com sistema robusto na inicialização
  React.useEffect(() => {
    try {
      const setlists = robustStorage.loadSetlists() as Setlist[];
      setSetlists(setlists);
      
      // Mostrar estatísticas de backup no console
      const stats = robustStorage.getBackupStats();
      console.log('🛡️ Status dos backups:', stats);
    } catch (error) {
      console.error('Erro ao carregar setlists:', error);
    }
  }, []);

  // Salvar setlists com sistema robusto quando mudarem
  React.useEffect(() => {
    if (setlists.length > 0) {
      robustStorage.saveSetlists(setlists);
    }
  }, [setlists]);

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('pt-BR');
  };

  // Se for mobile, mostrar interface simplificada
  if (isMobile) {
    return <MobileView />;
  }

  // Renderizar editor de setlist se um setlist foi selecionado
  if (currentView === 'setlist' && selectedSetlist) {
    return (
      <SimpleSetlistEditor 
        setlist={selectedSetlist}
        onBack={() => {
          setCurrentView('home');
          setSelectedSetlist(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-bold mb-2" style={{ 
            color: 'oklch(0.8 0.25 127)',
            textShadow: '0 0 10px oklch(0.8 0.25 127)'
          }}>
            Setlist Wade
          </h1>
          <p className="text-muted-foreground text-lg">
            Organize suas setlists com letras e cifras
          </p>
        </motion.div>

        {/* Create Button & Backup Controls */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8 flex flex-col items-center gap-4"
        >
          <div className="flex gap-4">
            <Button 
              onClick={() => robustStorage.exportBackup()}
              variant="outline"
              style={{
                borderColor: 'oklch(0.8 0.25 127)',
                color: 'oklch(0.8 0.25 127)'
              }}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Fazer Backup
            </Button>
            
            <input 
              type="file" 
              accept=".json"
              onChange={handleImportBackup}
              style={{ display: 'none' }}
              id="import-backup"
            />
            <Button 
              onClick={() => document.getElementById('import-backup')?.click()}
              variant="outline"
              style={{
                borderColor: 'oklch(0.7 0.3 200)',
                color: 'oklch(0.7 0.3 200)'
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Importar Backup
            </Button>
            
            {/* Botão de emergência para reset UUID corrompido */}
            <Button 
              onClick={() => {
                const result = robustStorage.resetCorruptedData();
                alert(result.message);
                if (result.success) {
                  window.location.reload();
                }
              }}
              variant="outline"
              size="sm"
              style={{
                borderColor: 'red',
                color: 'red'
              }}
            >
              🔄 Reset UUID
            </Button>
          </div>
          
          {/* Componente de Sincronização Online */}
          <SyncButton onSyncComplete={() => {
            const updatedSetlists = robustStorage.loadSetlists() as Setlist[];
            setSetlists(updatedSetlists);
          }} />
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" style={{
                backgroundColor: 'oklch(0.8 0.25 127)',
                color: 'oklch(0.09 0 0)',
                boxShadow: '0 0 15px oklch(0.8 0.25 127 / 0.3)'
              }}>
                <Plus className="mr-2 h-5 w-5" />
                Criar Novo Setlist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Setlist</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSetlist} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Setlist</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Show Rock in Rio 2024"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do setlist..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    Criar Setlist
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Setlists Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {setlists.length === 0 ? (
            <div className="text-center py-12">
              <Music className="h-24 w-24 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                Nenhum setlist criado
              </h3>
              <p className="text-muted-foreground">
                Crie seu primeiro setlist para começar a organizar suas músicas
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {setlists.map((setlist, index) => (
                <motion.div
                  key={setlist.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-all duration-200 hover:shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-bold text-foreground">
                            {setlist.name}
                          </CardTitle>
                          {setlist.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {setlist.description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSetlist(setlist.id, setlist.name);
                          }}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title={`Excluir setlist "${setlist.name}"`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Music className="h-4 w-4" />
                            <span>{setlist.musics.length} músicas</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(setlist.createdAt)}</span>
                          </div>
                        </div>
                        
                        <Button className="w-full" variant="default" onClick={() => handleOpenSetlist(setlist)}>
                          Abrir Setlist
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// Componente de busca de música
interface SearchMusicComponentProps {
  onMusicAdded: (music: Music) => void;
}

function SearchMusicComponent({ onMusicAdded }: SearchMusicComponentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cifraUrl, setCifraUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');

  const handleImportFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cifraUrl.trim()) return;
    
    // Validar se é URL do CifraClub
    if (!cifraUrl.includes('cifraclub.com.br')) {
      setImportStatus('❌ Por favor, cole uma URL válida do CifraClub');
      return;
    }

    setIsImporting(true);
    setImportStatus('🔄 Importando música do CifraClub...');
    
    try {
      const response = await fetch(`/api/import-cifraclub?url=${encodeURIComponent(cifraUrl)}`);
      const data = await response.json();
      
      if (response.ok && data.music) {
        const music: Music = {
          ...data.music,
          createdAt: new Date(data.music.createdAt),
          updatedAt: new Date(data.music.updatedAt),
        };
        
        onMusicAdded(music);
        setIsOpen(false);
        setCifraUrl('');
        setImportStatus('');
        
        console.log('✅ Música importada com sucesso:', music.title);
      } else {
        throw new Error(data.error || 'Erro na importação');
      }
    } catch (error) {
      console.error('Erro ao importar música:', error);
      setImportStatus('❌ Erro ao importar. Verifique a URL e tente novamente.');
    } finally {
      setIsImporting(false);
    }
  };



  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline" style={{
          borderColor: 'oklch(0.8 0.25 127)',
          color: 'oklch(0.8 0.25 127)'
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Importar Música do CifraClub
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Importar Música do CifraClub
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-6 flex-1 min-h-0">
          {/* Formulário de importação */}
          <form onSubmit={handleImportFromUrl} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cifra-url">URL da música do CifraClub:</Label>
              <Input
                id="cifra-url"
                value={cifraUrl}
                onChange={(e) => setCifraUrl(e.target.value)}
                placeholder="https://www.cifraclub.com.br/artista/musica/"
                className="text-sm"
                disabled={isImporting}
              />
            </div>
            
            {importStatus && (
              <div className="text-sm p-2 rounded bg-muted/50">
                {importStatus}
              </div>
            )}
            
            <Button 
              type="submit" 
              disabled={!cifraUrl.trim() || isImporting}
              className="w-full"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Importando...
                </>
              ) : (
                <>
                  <Music className="h-4 w-4 mr-2" />
                  Importar Música
                </>
              )}
            </Button>
          </form>

          {/* Dica adicional */}
          <div className="text-center text-sm text-muted-foreground">
            <p>💡 <strong>Dica:</strong> Qualquer música do CifraClub pode ser importada!</p>
            <p>Exemplo: cifraclub.com.br/legiao-urbana/tempo-perdido/</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente simples do editor de setlist
interface SimpleSetlistEditorProps {
  setlist: Setlist;
  onBack: () => void;
}

function SimpleSetlistEditor({ setlist: initialSetlist, onBack }: SimpleSetlistEditorProps) {
  const [setlist, setSetlist] = useState<Setlist>(initialSetlist);
  const [currentView, setCurrentView] = useState<'setlist' | 'music'>('setlist');
  const [selectedMusic, setSelectedMusic] = useState<Music | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [viewMode, setViewMode] = useState<'edit' | 'view'>('view');

  const handleMusicAdded = (music: Music) => {
    const updatedSetlist = {
      ...setlist,
      musics: [...setlist.musics, music],
      updatedAt: new Date(),
    };
    setSetlist(updatedSetlist);
    
    // Salvar com sistema robusto
    const allSetlists = robustStorage.loadSetlists() as Setlist[];
    const updatedSetlists = allSetlists.map((s: Setlist) => 
      s.id === setlist.id ? updatedSetlist : s
    );
    robustStorage.saveSetlists(updatedSetlists);
  };

  const handleEditMusic = (music: Music, mode: 'edit' | 'view' = 'edit') => {
    setSelectedMusic(music);
    setViewMode(mode);
    setCurrentView('music');
  };

  const handleDeleteMusic = (musicId: string) => {
    if (confirm('Tem certeza que deseja excluir esta música do setlist?')) {
      const updatedSetlist = {
        ...setlist,
        musics: setlist.musics.filter(m => m.id !== musicId),
        updatedAt: new Date(),
      };
      setSetlist(updatedSetlist);
      
      // Salvar com sistema robusto
      const allSetlists = robustStorage.loadSetlists() as Setlist[];
      const updatedSetlists = allSetlists.map((s: Setlist) => 
        s.id === setlist.id ? updatedSetlist : s
      );
      robustStorage.saveSetlists(updatedSetlists);
    }
  };

  const handleStartEditTitle = (music: Music) => {
    setEditingTitleId(music.id);
    setEditingTitleValue(music.title);
  };

  const handleSaveTitle = (musicId: string) => {
    const updatedSetlist = {
      ...setlist,
      musics: setlist.musics.map(m => 
        m.id === musicId ? { ...m, title: editingTitleValue, updatedAt: new Date() } : m
      ),
      updatedAt: new Date(),
    };
    setSetlist(updatedSetlist);
    
    // Salvar com sistema robusto
    const allSetlists = robustStorage.loadSetlists() as Setlist[];
    const updatedSetlists = allSetlists.map((s: Setlist) => 
      s.id === setlist.id ? updatedSetlist : s
    );
    robustStorage.saveSetlists(updatedSetlists);
    
    setEditingTitleId(null);
    setEditingTitleValue('');
  };

  const handleCancelEditTitle = () => {
    setEditingTitleId(null);
    setEditingTitleValue('');
  };

  const handleMusicUpdated = (updatedMusic: Music) => {
    const updatedSetlist = {
      ...setlist,
      musics: setlist.musics.map(m => m.id === updatedMusic.id ? updatedMusic : m),
      updatedAt: new Date(),
    };
    setSetlist(updatedSetlist);
    
    // Salvar com sistema robusto
    const allSetlists = robustStorage.loadSetlists() as Setlist[];
    const updatedSetlists = allSetlists.map((s: Setlist) => 
      s.id === setlist.id ? updatedSetlist : s
    );
    robustStorage.saveSetlists(updatedSetlists);
  };

  // Se estiver editando uma música
  if (currentView === 'music' && selectedMusic) {
    return (
      <SimpleMusicEditor
        music={selectedMusic}
        initialViewMode={viewMode}
        onClose={() => {
          setCurrentView('setlist');
          setSelectedMusic(null);
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onMusicUpdated={handleMusicUpdated as any}
      />
    );
  }
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold" style={{ 
                color: 'oklch(0.8 0.25 127)',
                textShadow: '0 0 10px oklch(0.8 0.25 127)'
              }}>
                {setlist.name}
              </h1>
              {setlist.description && (
                <p className="text-muted-foreground">{setlist.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => robustStorage.exportBackup()}
              title="Fazer backup dos dados"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Backup
            </Button>
            <Button variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </motion.div>

        {/* Info cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          <Card>
            <CardContent className="p-4 text-center">
              <Music className="h-8 w-8 mx-auto mb-2" style={{ color: 'oklch(0.8 0.25 127)' }} />
              <p className="text-2xl font-bold">{setlist.musics.length}</p>
              <p className="text-sm text-muted-foreground">Músicas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2" style={{ color: 'oklch(0.7 0.3 200)' }} />
              <p className="text-2xl font-bold">~{Math.ceil(setlist.musics.length * 3.5)}min</p>
              <p className="text-sm text-muted-foreground">Duração estimada</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-lg px-3 py-1 border rounded-md inline-block">
                {new Date(setlist.createdAt).toLocaleDateString('pt-BR')}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Criado em</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Add music button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <SearchMusicComponent onMusicAdded={handleMusicAdded} />
        </motion.div>

        {/* Music list */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {setlist.musics.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Music className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                  Setlist vazio
                </h3>
                <p className="text-muted-foreground mb-4">
                  Adicione músicas do CifraClub para começar a montar seu setlist
                </p>
                <p className="text-sm text-muted-foreground">
                  🎵 Busca REAL no CifraClub ativa!
                </p>
                <p className="text-sm text-muted-foreground">
                  🎼 Editor completo de cifras e letras
                </p>
                <p className="text-sm text-muted-foreground">
                  🎸 Transposição automática de acordes
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Músicas do Setlist ({setlist.musics.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2 p-4">
                  {setlist.musics.map((music, index) => (
                    <motion.div
                      key={music.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div style={{ 
                        backgroundColor: 'oklch(0.8 0.25 127)',
                        color: 'oklch(0.09 0 0)'
                      }} className="rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      
                      <div className="flex-1">
                        {editingTitleId === music.id ? (
                          <input
                            value={editingTitleValue}
                            onChange={(e) => setEditingTitleValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveTitle(music.id);
                              } else if (e.key === 'Escape') {
                                handleCancelEditTitle();
                              }
                            }}
                            onBlur={() => handleSaveTitle(music.id)}
                            className="font-semibold bg-transparent border-b border-blue-400 outline-none w-full"
                            autoFocus
                          />
                        ) : (
                          <h4 
                            className="font-semibold cursor-pointer hover:text-blue-400 transition-colors"
                            onClick={() => handleEditMusic(music, 'view')}
                            title="Clique para visualizar a música"
                          >
                            {music.title}
                          </h4>
                        )}
                        <p className="text-sm text-muted-foreground">{music.artist}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-background rounded-md border">
                          {music.currentKey}
                        </span>
                        
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleEditMusic(music, 'view')}
                            title="Visualizar música"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleEditMusic(music, 'edit')}
                            title="Editar música"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditTitle(music);
                            }}
                            title="Editar título"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMusic(music.id);
                            }}
                            className="text-red-400 hover:text-red-600"
                            title="Excluir música"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}