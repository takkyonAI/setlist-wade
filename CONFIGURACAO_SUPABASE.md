# 🚀 Configuração do Supabase (Banco de Dados Online)

## 📋 **O que é isso?**

O Supabase é um banco de dados PostgreSQL **gratuito** na nuvem que permitirá sincronizar suas setlists entre **todos os dispositivos** (celular, tablet, desktop).

---

## 🎯 **PASSO A PASSO - CONFIGURAÇÃO RÁPIDA:**

### **1. Criar conta no Supabase** ⭐
- Acesse: https://supabase.com
- Clique em **"Start your project"**
- Faça login com Google/GitHub
- **100% GRATUITO** até 500MB de dados

### **2. Criar novo projeto** 🆕
- Clique em **"New Project"**
- **Nome**: `setlist-wade`
- **Database Password**: Crie uma senha forte (ex: `MinhaSenh@123!`)
- **Region**: South America (São Paulo) 
- Clique **"Create new project"**
- ⏰ Aguarde ~2 minutos para criação

### **3. Configurar banco de dados** 🗄️
- No painel do Supabase, vá em **"SQL Editor"** (ícone de banco no menu)
- Clique **"New query"**
- **Cole TODO o conteúdo** do arquivo `sql/setup.sql` 
- Clique **"RUN"** ▶️
- ✅ Deve aparecer "Success. No rows returned"

### **4. Obter chaves de acesso** 🔑
- Vá em **"Settings"** → **"API"**
- Copie os valores:
  - **Project URL**: `https://seuprojetoid.supabase.co`
  - **anon/public key**: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...`

### **5. Configurar variáveis de ambiente** ⚙️

Crie um arquivo `.env.local` na raiz do projeto:

\`\`\`bash
# Cole suas chaves aqui (substituir pelos valores reais):
NEXT_PUBLIC_SUPABASE_URL=https://seuprojetoid.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
\`\`\`

### **6. Restart da aplicação** 🔄
```bash
# Parar aplicação (Ctrl+C se estiver rodando)
# Depois executar:
npm run dev
```

---

## ✅ **COMO SABER SE FUNCIONOU:**

1. **Acesse a aplicação**
2. **Procure pelo indicador "Online"** na tela principal (bolinha verde)
3. **Clique em "Sincronizar"**
4. **Mensagem de sucesso** deve aparecer

---

## 🌐 **COMO FUNCIONA:**

### **📱 No seu celular:**
1. Acesse o site: `https://setlist-wade.vercel.app`
2. Clique **"Sincronizar"** → **Download** ⬇️
3. Todas suas setlists aparecerão automaticamente!

### **💻 No desktop:**
1. Crie/edite setlists normalmente
2. Clique **"Sincronizar"** → **Upload** ⬆️ 
3. Dados ficam salvos na nuvem

### **🔄 Sincronização automática:**
- **Híbrido**: Funciona offline + online
- **Backup automático**: Dados sempre seguros
- **Multi-dispositivo**: Acesse de qualquer lugar

---

## 🆘 **PROBLEMAS COMUNS:**

### **❌ "Offline" sempre:**
- Verifique se as variáveis `.env.local` estão corretas
- Restart a aplicação (`npm run dev`)
- Confirme que o SQL foi executado no Supabase

### **❌ Erro de "unauthorized":**
- Verifique a `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Confirme que as políticas RLS estão configuradas (SQL script)

### **❌ Dados não sincronizam:**
- Clique primeiro em **Upload** ⬆️ (enviar dados locais)
- Depois **Download** ⬇️ (baixar dados atualizados)
- Use **"Sincronizar"** para fazer ambos automaticamente

---

## 💡 **DICAS:**

- **Sempre grátis**: 500MB é suficiente para milhares de músicas
- **Backup local**: Dados continuam funcionando offline
- **Versão na nuvem**: Sempre disponível em qualquer dispositivo
- **Performance**: Sincronização só quando necessário

---

## 🎉 **PRONTO!**

Agora suas setlists ficam **sincronizadas automaticamente** entre todos os dispositivos!

**Teste agora**: Crie uma setlist no desktop → Acesse no celular → Dados estarão lá! 🎸✨