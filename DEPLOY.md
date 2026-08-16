# 🚀 Guia Oficial de Deploy — RENETEC 2026
### Stack de Produção: Supabase (PostgreSQL) + Render (Backend API/WS) + Vercel (Frontend React)

---

## 📋 Resumo da Arquitetura

| Serviço | Plataforma | O que hospeda | Custo |
|---|---|---|---|
| **Banco de Dados** | **Supabase** | PostgreSQL Gerenciado + Backups automáticos | Gratuito |
| **Backend API** | **Render.com** | Node.js Fastify + WebSockets (TV Fábrica) | Gratuito |
| **Frontend Web** | **Vercel** | React Vite + CDN Global Ultrarrápida + SSL | Gratuito |

---

## 🟢 ETAPA 1: Criar o Banco no Supabase (2 minutos)

1. Acesse **[supabase.com](https://supabase.com)** e crie uma conta gratuita.
2. Clique em **"New Project"**.
3. Defina:
   - **Name:** `renetec-db`
   - **Database Password:** Escolha uma senha forte (anote-a!).
   - **Region:** `South America (São Paulo)` (para menor latência).
4. Clique em **"Create new project"** e aguarde ~1 minuto.
5. Quando o projeto abrir, vá em:
   - ⚙️ **Project Settings** (ícone de engrenagem no canto inferior esquerdo) → **Database**.
   - Na seção **Connection string**, selecione a aba **URI**.
   - Copie a string de conexão (URI do Transaction Pooler).
   - O formato será parecido com:
     `postgres://[usuario]:[senha]@[host]:6543/[banco]`

---

## 🟢 ETAPA 2: Aplicar as Tabelas e Logins Iniciais (1 minuto)

No seu terminal local (no VS Code / terminal do projeto):

```bash
cd backend

# No arquivo .env do backend, configure sua DATABASE_URL do Supabase.
# Em seguida, execute:
npx prisma db push

# E popule com os usuários oficiais e os 8 equipamentos:
npm run db:seed
```

*(Pronto! Seu banco no Supabase já está estruturado com todos os logins e catálogo de equipamentos).*

---

## 🟢 ETAPA 3: Subir o Backend no Render.com (3 minutos)

1. Suba seu projeto no **GitHub** (se ainda não estiver).
2. Acesse **[render.com](https://render.com)** e faça login com seu GitHub.
3. Clique em **New +** → **Web Service**.
4. Conecte o repositório do projeto `Renetec`.
5. Preencha as configurações:
   - **Name:** `renetec-api`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
6. Clique na seção **Environment Variables** (Variáveis de Ambiente) e adicione:

| Chave (Key) | Valor (Value) |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3333` |
| `HOST` | `0.0.0.0` |
| `DATABASE_URL` | Sua URL do Supabase (com `?pgbouncer=true`) |
| `DIRECT_URL` | Sua URL direta do Supabase (porta 5432) |
| `JWT_SECRET` | Uma senha secreta longa com mais de 32 letras/números |
| `CORS_ORIGIN` | `*` (ou o link da sua Vercel após criar o frontend) |
| `RATE_LIMIT_MAX` | `1000` |

7. Clique em **"Deploy Web Service"**.
8. Ao finalizar, o Render vai gerar a sua URL do backend (ex: `https://renetec-api.onrender.com`). Guarde essa URL!

---

## 🟢 ETAPA 4: Subir o Frontend na Vercel (2 minutos)

1. Acesse **[vercel.com](https://vercel.com)** e faça login com seu GitHub.
2. Clique em **"Add New..."** → **"Project"**.
3. Selecione o repositório `Renetec`.
4. Configure:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Clique em **Edit** e selecione a pasta `frontend`.
5. Na seção **Environment Variables**, adicione:

| Chave (Key) | Valor (Value) |
|---|---|
| `VITE_API_URL` | `https://renetec-api.onrender.com/api/v1` *(substitua pela sua URL do Render)* |
| `VITE_WS_URL` | `wss://renetec-api.onrender.com/api/v1/realtime` *(a mesma URL, mas começando com `wss://`)* |

6. Clique em **"Deploy"**.

---

## 🎉 TUDO PRONTO!

O seu sistema estará no ar no link fornecido pela Vercel (ex: `https://renetec.vercel.app`).

### 👤 Logins Oficiais para Acessar:
- **Administrador:** `admin@renetec.com.br` / senha `renetec123`
- **Comercial / Gestão:** `luana@renetec.com.br` / senha `renetec123`
- **Técnicos de Produção:** `samuel@renetec.com.br`, `joao@renetec.com.br`, `joas@renetec.com.br` / senha `renetec123`
- **Controle de Qualidade:** `rhyan@renetec.com.br` / senha `renetec123`
