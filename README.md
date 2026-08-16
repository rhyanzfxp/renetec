# RENETEC — Sistema de Gestão de Produção

> Sistema web completo para gestão do chão de fábrica: apontamento de produção, controle de qualidade, retrabalho, metas e dashboard em tempo real.

![Node.js](https://img.shields.io/badge/Node.js-20_LTS-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-4.28-000000?logo=fastify&logoColor=white)

---

## 🏭 Módulos do Sistema

| Módulo | Perfil | Funcionalidade |
|:---|:---|:---|
| **Ordens de Serviço** | Admin | Criação, acompanhamento e atualização de OSs |
| **Produção** | Técnico | Apontamento de bancada com cronômetro e histórico |
| **Controle de Qualidade** | Inspetor CQ | Laudo de inspeção com equação matemática invariável |
| **Retrabalho** | Técnico | Gestão do reparo de peças reprovadas |
| **Metas Coletivas** | Todos | Termômetro de produção com gamificação |
| **TV Fábrica** | Todos | Dashboard public display em tempo real |
| **Auditoria** | Admin | Trilha de auditoria imutável de todas as ações |
| **WebSockets** | Todos | Eventos em tempo real (produção, CQ, retrabalho) |

---

## 🚀 Iniciando o Projeto Localmente

### Pré-requisitos
- Node.js v20+ 
- PostgreSQL 16+ (ou Supabase)

### 1. Clonar e instalar dependências

```bash
git clone https://github.com/seu-usuario/renetec.git
cd renetec

# Backend
cd backend && npm install
cp .env.example .env
# Edite .env com suas credenciais

# Frontend
cd ../frontend && npm install
```

### 2. Configurar banco de dados

```bash
cd backend

# Aplicar schema
npx prisma migrate dev

# Popular dados iniciais (usuários, motivos de reprovação)
npm run prisma:seed
```

### 3. Iniciar servidores de desenvolvimento

```bash
# Terminal 1 — Backend (porta 3333)
cd backend && npm run dev

# Terminal 2 — Frontend (porta 5173)
cd frontend && npm run dev
```

Acesse: **http://localhost:5173**

---

## 🔑 Credenciais de Desenvolvimento

| Perfil | E-mail | Senha |
|:---|:---|:---|
| Administrador | admin@renetec.com.br | renetec123 |
| Técnico | joao@renetec.com.br | renetec123 |
| Qualidade | qualidade@renetec.com.br | renetec123 |

---

## 🔐 Segurança

- **Helmet** — Headers HTTP seguros (CSP, HSTS, X-Frame-Options)
- **Rate Limit** — 120 requisições/min por IP em produção
- **JWT** — Tokens com expiração de 8h + Argon2id para senhas
- **RBAC** — Controle de acesso por perfil em todas as rotas
- **CORS** — Lista branca de origens em produção
- **Auditoria** — Trilha imutável de todas as ações críticas
- **Validação** — Zod em todas as entradas de API

---

## 📦 Stack Técnica

### Backend
| Lib | Uso |
|:---|:---|
| `fastify` | Framework HTTP de alta performance |
| `@fastify/jwt` | Autenticação JWT |
| `@fastify/websocket` | WebSockets para tempo real |
| `@fastify/helmet` | Headers HTTP de segurança |
| `@fastify/rate-limit` | Proteção anti-DDoS |
| `@fastify/cors` | Política de CORS |
| `prisma` | ORM type-safe para PostgreSQL |
| `argon2` | Hash de senhas (Argon2id) |
| `zod` | Validação de schemas |

### Frontend
| Lib | Uso |
|:---|:---|
| `react` 19 | UI declarativa com hooks |
| `vite` | Bundler ultra-rápido |
| `typescript` | Type safety end-to-end |
| `@tanstack/react-query` | Cache e sincronização de dados |
| `lucide-react` | Ícones |
| `tailwindcss` | Utilitários de estilo |
| `clsx` + `tailwind-merge` | Composição de classes dinâmicas |

---

## 📐 Linhagem de Estados

```
OS Criada
  └── Item(s) de OS
        └── Produção Iniciada (Técnico)
              └── Produção Finalizada (Apontamento)
                    └── CQ: Inspeção
                          ├── ✅ Aprovado → Contabilizado nas Metas
                          └── ❌ Reprovado → Retrabalho
                                  └── Retrabalho Concluído
                                        └── Re-teste no CQ
                                              └── ✅ Aprovado → Concluído
```

**Equação Invariável do CQ:** `Qtd Aprovada + Qtd Reprovada = Qtd Testada` (validada server-side com 400 Bad Request)

---

## 🧪 Testes

```bash
# Bateria de testes E2E completos (10 passos / linhagem industrial)
cd backend && npm run test:e2e
```

Resultado esperado: **10/10 ✅ PASS**

---

## 📖 Deploy em Produção

Consulte o [DEPLOY.md](./DEPLOY.md) para o guia completo de deploy com Supabase + Render + Netlify.

---

*Sistema desenvolvido para a RENETEC — Gestão de Produção Industrial.*
