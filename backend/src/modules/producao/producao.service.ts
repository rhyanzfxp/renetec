import * as repo from './producao.repository.js';
import type { FinalizarProducaoInput } from './producao.schema.js';
import { realtimeService } from '../realtime/realtime.service.js';
import { log } from '../auditoria/auditoria.service.js';

// ─── Fila do técnico ──────────────────────────────────────────────────────────
export async function getMinhaFila(tecnicoId: string) {
  return repo.getMinhaFila(tecnicoId);
}

// ─── Produção ativa ───────────────────────────────────────────────────────────
export async function getProducaoAtiva(tecnicoId: string) {
  return repo.getProducaoAtiva(tecnicoId);
}

// ─── Iniciar produção com validações de negócio ───────────────────────────────
export async function iniciarProducao(itemOrdemServicoId: string, tecnicoId: string) {
  // Regra: técnico não pode ter 2 produções ativas ao mesmo tempo
  const ativa = await repo.getProducaoAtiva(tecnicoId);
  if (ativa) {
    throw {
      statusCode: 409,
      message: 'Você já possui uma produção em andamento. Finalize antes de iniciar outra.',
      producaoAtiva: ativa,
    };
  }

  // Regra: não pode iniciar o mesmo item duas vezes
  const duplicado = await repo.getProducaoAtivaNoItem(itemOrdemServicoId, tecnicoId);
  if (duplicado) {
    throw {
      statusCode: 409,
      message: 'Este item já possui uma produção em andamento.',
    };
  }

  const producao = await repo.iniciarProducao(itemOrdemServicoId, tecnicoId);
  realtimeService.broadcast('producao:iniciada', { producao });
  log({
    acao: 'PRODUCAO_INICIADA',
    usuarioId: tecnicoId,
    entidade: 'Producao',
    entidadeId: producao.id,
    descricao: `Produção iniciada pelo técnico.`,
    detalhes: { itemOrdemServicoId },
  }).catch(() => {});
  return producao;
}

// ─── Finalizar produção ───────────────────────────────────────────────────────
export async function finalizarProducao(
  producaoId: string,
  tecnicoId: string,
  dados: FinalizarProducaoInput
) {
  // Verificar que a produção pertence ao técnico
  const producaoAtiva = await repo.getProducaoAtiva(tecnicoId);

  if (!producaoAtiva || producaoAtiva.id !== producaoId) {
    throw {
      statusCode: 403,
      message: 'Você não tem permissão para finalizar esta produção.',
    };
  }

  const finalizada = await repo.finalizarProducao(producaoId, dados);
  realtimeService.broadcast('producao:finalizada', { producao: finalizada });
  log({
    acao: 'PRODUCAO_FINALIZADA',
    usuarioId: tecnicoId,
    entidade: 'Producao',
    entidadeId: producaoId,
    descricao: `Produção finalizada: ${dados.quantidadeProduzida} unidades apontadas.`,
    detalhes: { quantidadeProduzida: dados.quantidadeProduzida },
  }).catch(() => {});
  return finalizada;
}

// ─── Histórico ────────────────────────────────────────────────────────────────
export async function getHistoricoProducao(tecnicoId: string, page: number, limit: number) {
  return repo.getHistoricoProducao(tecnicoId, page, limit);
}
