import { prisma, isDatabaseReady } from './prisma.js';

export function isValidUuid(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export const USUARIOS_CONHECIDOS = [
  { id: 'usr-admin-01', tecId: 'colab-admin', nome: 'Administrador Renetec', email: 'admin@renetec.com.br', perfil: 'ADMIN' },
  { id: 'usr-tecnico-01', tecId: 'colab-joao', nome: 'João', email: 'joao@renetec.com.br', perfil: 'TECNICO' },
  { id: 'usr-tecnico-02', tecId: 'colab-samuel', nome: 'Samuel', email: 'samuel@renetec.com.br', perfil: 'TECNICO' },
  { id: 'usr-tecnico-03', tecId: 'colab-joas', nome: 'Joás', email: 'joas@renetec.com.br', perfil: 'TECNICO' },
  { id: 'usr-qualidade-01', tecId: 'colab-rhyan', nome: 'Rhyan', email: 'rhyan@renetec.com.br', perfil: 'QUALIDADE' },
  { id: 'usr-admin-02', tecId: 'colab-luana', nome: 'Luana', email: 'luana@renetec.com.br', perfil: 'ADMIN' },
];

/**
 * Retorna todos os IDs possíveis (DB UUID, mock ID, colab-id) associados a um usuário/técnico
 */
export async function getTecnicoAliasIds(tecnicoIdOrNome: string): Promise<string[]> {
  const ids = new Set<string>();
  if (tecnicoIdOrNome) ids.add(tecnicoIdOrNome);

  const norm = (tecnicoIdOrNome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const matched = USUARIOS_CONHECIDOS.find((u) => {
    const nomeNorm = u.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return u.id === tecnicoIdOrNome || u.tecId === tecnicoIdOrNome || norm.includes(nomeNorm) || (norm.length > 2 && nomeNorm.includes(norm));
  });

  if (matched) {
    ids.add(matched.id);
    if (matched.tecId) ids.add(matched.tecId);
  }

  if (isDatabaseReady()) {
    try {
      const orConditions: any[] = [];
      if (isValidUuid(tecnicoIdOrNome)) {
        orConditions.push({ id: tecnicoIdOrNome });
      }
      if (matched) {
        orConditions.push({ email: matched.email });
        orConditions.push({ nome: { contains: matched.nome, mode: 'insensitive' } });
      } else if (tecnicoIdOrNome) {
        orConditions.push({ nome: { contains: tecnicoIdOrNome.replace(/usr-|colab-/g, ''), mode: 'insensitive' } });
      }

      if (orConditions.length > 0) {
        const dbUsers = await prisma.usuario.findMany({
          where: { OR: orConditions },
          select: { id: true },
        });
        for (const u of dbUsers) {
          ids.add(u.id);
        }
      }
    } catch {
      // ignore
    }
  }

  return Array.from(ids);
}

/**
 * Garante que um ID de usuário válido no PostgreSQL seja retornado para uso em Foreign Keys
 */
export async function ensureUsuarioDbId(
  tecnicoIdOrNome?: string,
  fallbackPerfil: 'ADMIN' | 'TECNICO' | 'QUALIDADE' = 'TECNICO'
): Promise<string> {
  if (!isDatabaseReady()) return tecnicoIdOrNome || 'usr-tecnico-01';

  try {
    if (tecnicoIdOrNome) {
      // 1. Tenta achar pelo ID exato se for UUID válido
      if (isValidUuid(tecnicoIdOrNome)) {
        const byId = await prisma.usuario.findUnique({ where: { id: tecnicoIdOrNome } });
        if (byId) return byId.id;
      }

      // 2. Tenta achar pelos usuários conhecidos
      const norm = tecnicoIdOrNome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const matched = USUARIOS_CONHECIDOS.find((u) => {
        const nomeNorm = u.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return u.id === tecnicoIdOrNome || u.tecId === tecnicoIdOrNome || norm.includes(nomeNorm) || (norm.length > 2 && nomeNorm.includes(norm));
      });

      if (matched) {
        const byEmailOrNome = await prisma.usuario.findFirst({
          where: { OR: [{ email: matched.email }, { nome: { contains: matched.nome, mode: 'insensitive' } }] },
        });
        if (byEmailOrNome) return byEmailOrNome.id;

        // Se não achou no banco, cria o usuário conhecido no banco
        const created = await prisma.usuario.create({
          data: {
            nome: matched.nome,
            email: matched.email,
            senhaHash: '$argon2id$v=19$m=65536,t=3,p=4$8W3n2Q0r9Z4b6X1',
            perfil: matched.perfil as any,
            ativo: true,
          },
        });
        return created.id;
      } else {
        const byName = await prisma.usuario.findFirst({
          where: { nome: { contains: tecnicoIdOrNome.replace(/usr-|colab-/g, ''), mode: 'insensitive' } },
        });
        if (byName) return byName.id;
      }
    }

    // 3. Fallback: pega qualquer usuário do perfil ou cria um
    const anyUser = await prisma.usuario.findFirst({ where: { perfil: fallbackPerfil } });
    if (anyUser) return anyUser.id;

    const novo = await prisma.usuario.create({
      data: {
        nome: tecnicoIdOrNome || 'Técnico Renetec',
        email: `tecnico-${Date.now()}@renetec.com.br`,
        senhaHash: '$argon2id$v=19$m=65536,t=3,p=4$8W3n2Q0r9Z4b6X1',
        perfil: fallbackPerfil,
        ativo: true,
      },
    });
    return novo.id;
  } catch (err) {
    console.error('[ensureUsuarioDbId] Erro ao resolver usuário no banco:', err);
    return tecnicoIdOrNome || 'usr-tecnico-01';
  }
}
