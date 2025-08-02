# Setlist Wade 🎸

Uma aplicação web moderna e responsiva para organização de setlists com letras e cifras de músicas.

## ✨ Funcionalidades

### 📱 **Interface Mobile-First**
- **Detecção automática** de dispositivos mobile
- **Interface simplificada** no mobile: apenas lista de músicas
- **Cabeçalho oculto** no mobile para maximizar espaço
- **Títulos clicáveis** que abrem letras em tela cheia
- **Design responsivo** para todos os tamanhos de tela

### 🎵 **Integração com CifraClub**
- **Importação completa** de letras e cifras do CifraClub
- **Suporte a slash chords** (A/C#, G/B, D/F#) com transposição correta
- **Parsing inteligente** que separa cifras e letras automaticamente
- **Detecção automática de tom** e transposição para C
- **Links originais preservados** para referência

### 🎼 **Editor de Músicas Avançado**
- **Edição inline de cifras** - clique em qualquer acorde para editar
- **Edição inline de letras** - clique em qualquer linha para editar
- **Transposição automática** - mudança de tom com recálculo de todos os acordes
- **Suporte completo a slash chords** em transposições
- **Visualização em tempo real** das mudanças

### 📋 **Gerenciamento de Setlists**
- **Criação de setlists personalizados** com nome e descrição
- **Organização** das músicas no setlist
- **Estatísticas** (número de músicas por setlist)
- **Backup automático** e manual

### 💾 **Sistema de Backup Robusto**
- **Multi-camadas**: localStorage, sessionStorage, IndexedDB
- **Backup automático** a cada alteração
- **Exportação manual** em JSON
- **Importação** de backups
- **Recuperação automática** em caso de falha

### 🎨 **Design Moderno**
- **Dark mode** com cores neon vibrantes
- **Interface intuitiva** com feedback visual
- **Animações suaves** usando Framer Motion
- **Mobile-optimized** para melhor experiência

## 🚀 **Tecnologias**

- **Next.js 15** - Framework React com App Router
- **TypeScript** - Tipagem estática para maior robustez
- **Tailwind CSS** - Estilização utilitária moderna
- **Framer Motion** - Animações fluidas
- **Axios + Cheerio** - Web scraping do CifraClub
- **Lucide React** - Ícones modernos

## 📱 **Experiência Mobile**

### Desktop:
- Interface completa com todos os recursos
- Criação e edição de setlists
- Importação do CifraClub
- Backup e exportação

### Mobile:
- **Lista limpa** de todas as músicas
- **Cabeçalho compacto** com contador
- **Títulos clicáveis** para visualização
- **Modo visualização** otimizado para leitura
- **Botão voltar** intuitivo

## 🌐 **Deploy**

Configurado para deploy automático no **Vercel**:
- **Build otimizado** para produção
- **Static exports** quando necessário
- **Domínio personalizado** suportado
- **HTTPS automático**
- **TailwindCSS** - Estilização moderna e responsiva
- **shadcn/ui** - Componentes de interface elegantes
- **Framer Motion** - Animações fluidas e profissionais
- **@dnd-kit** - Drag-and-drop nativo e acessível
- **chord-transposer** - Transposição musical precisa
- **jsPDF** - Geração de PDFs no client
- **Cheerio** - Web scraping do CifraClub
- **Axios** - Requisições HTTP

## 🛠️ Instalação e Uso

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Passos
1. **Clone o repositório**
   ```bash
   git clone [url-do-repositorio]
   cd setlist-wade
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Execute o servidor de desenvolvimento**
   ```bash
   npm run dev
   ```

4. **Abra no navegador**
   - Acesse `http://localhost:3000`
   - A aplicação iniciará no modo dark com o tema neon

## 📱 Como Usar

### Criando seu Primeiro Setlist
1. **Clique em "Criar Novo Setlist"** na página inicial
2. **Preencha o nome** (ex: "Show Rock in Rio 2024")
3. **Adicione uma descrição** opcional
4. **Clique em "Criar Setlist"**

### Adicionando Músicas
1. **Dentro do setlist**, clique em "Buscar Música no CifraClub"
2. **Digite o nome da música** ou artista (ex: "Imagine Dragons Radioactive")
3. **Selecione a música** nos resultados
4. **Clique em "Importar"** - a música será automaticamente processada

### Editando Músicas
1. **Clique no botão de editar** (ícone de lápis) em qualquer música
2. **Edite cifras**: clique em qualquer acorde para editar
3. **Edite letras**: clique em qualquer linha de letra para editar
4. **Mude o tom**: use o seletor de tom para transposição automática
5. **Salve as mudanças**: clique em "Salvar"

### Organizando o Setlist
- **Arraste e solte** as músicas para reordenar
- **Use o ícone de grip** (≡) para arrastar
- **A ordem é salva** automaticamente

### Exportando em PDF
1. **No editor do setlist**, clique em "Exportar PDF"
2. **O PDF será gerado** com formatação profissional
3. **Download automático** do arquivo

## 🎯 Funcionalidades Detalhadas

### Sistema de Transposição
- **Suporte completo** a todos os tipos de acordes
- **Transposição por semitons** precisa
- **Reconhecimento de enarmônicos** (C# = Db)
- **Preservação de características** do acorde (sus, add, dim, etc.)

### Busca no CifraClub
- **Web scraping responsável** via API routes do Next.js
- **Parsing inteligente** de conteúdo HTML
- **Extração automática** de metadados (tom, artista, título)
- **Fallback para dados mock** em caso de erro

### Interface Drag-and-Drop
- **Acessibilidade completa** com suporte a teclado
- **Feedback visual** durante o arraste
- **Snap automático** para posições válidas
- **Cancelamento** com tecla Escape

## 🔧 Estrutura do Projeto

```
setlist-wade/
├── src/
│   ├── app/                 # App Router do Next.js
│   │   ├── api/            # API routes (CifraClub scraping)
│   │   ├── globals.css     # Estilos globais e tema neon
│   │   ├── layout.tsx      # Layout principal
│   │   └── page.tsx        # Página inicial
│   ├── components/         # Componentes React
│   │   ├── ui/            # Componentes shadcn/ui
│   │   ├── HomePage.tsx    # Página inicial com lista de setlists
│   │   ├── SetlistEditor.tsx # Editor principal de setlists
│   │   ├── MusicEditor.tsx  # Editor de músicas individuais
│   │   └── SearchMusic.tsx  # Busca e importação do CifraClub
│   ├── contexts/          # Contextos React
│   │   └── SetlistContext.tsx # Gerenciamento de estado global
│   ├── types/             # Definições TypeScript
│   │   └── index.ts       # Tipos principais (Setlist, Music, etc.)
│   └── utils/             # Utilitários
│       ├── cifraclub.ts    # Funções de busca e parsing
│       ├── chordTransposer.ts # Transposição de acordes
│       └── pdfExporter.ts  # Exportação PDF
└── README.md
```

## 🎨 Tema e Cores

### Paleta Neon
- **Verde-limão neon**: `oklch(0.8 0.25 127)` - Elementos primários
- **Azul neon**: `oklch(0.7 0.3 200)` - Cifras e acentos
- **Roxo neon**: `oklch(0.75 0.35 280)` - Destacamentos
- **Rosa neon**: `oklch(0.8 0.4 330)` - Alertas e avisos
- **Ciano neon**: `oklch(0.75 0.3 180)` - Links e hovers

### Efeitos Especiais
- **Glow neon**: Box-shadows com cores vibrantes
- **Text shadow**: Efeito de brilho em textos importantes
- **Hover effects**: Transições suaves com mudança de cor
- **Dark background**: Fundo escuro para contraste máximo

## 📈 Próximas Funcionalidades

### Google Sheets Integration (Planejado)
- **Autenticação Google** para setlists pessoais
- **Sincronização em nuvem** automática
- **Compartilhamento** de setlists via link
- **Colaboração** em tempo real

### Funcionalidades Avançadas (Futuro)
- **Player de áudio** integrado
- **Metrônomo** embutido
- **Gravação de anotações** por música
- **Modo apresentação** full-screen
- **Setlists templates** pré-definidos

## 🤝 Contribuindo

1. **Fork** o projeto
2. **Crie uma branch** para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. **Abra um Pull Request**

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.

## 🎸 Feito com ♥ para músicos

Desenvolvido por **Wade** para facilitar a vida de músicos, bandas e produtores musicais que precisam organizar setlists de forma profissional e eficiente.

---

**Setlist Wade** - Transformando a organização musical! 🎵✨