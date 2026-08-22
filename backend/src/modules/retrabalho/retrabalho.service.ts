import * as repo from './retrabalho.repository.js';
import type { ConcluirRetrabalhoInput } from './retrabalho.schema.js';
import { realtimeService } from '../realtime/realtime.service.js';
import { log } from '../auditoria/auditoria.service.js';

export async function getRetrabalhosPendentes(tecnicoId?: string) {
  return repo.getRetrabalhosPendentes(tecnicoId);
}

export async function iniciarRetrabalho(retrabalhoId: string, tecnicoId: string) {
  const ret = await repo.iniciarRetrabalho(retrabalhoId, tecnicoId);
  realtimeService.broadcast('retrabalho:iniciado', { retrabalho: ret });
  log({
    acao: 'RETRABALHO_INICIADO',
    usuarioId: tecnicoId,
    entidade: 'Retrabalho',
    entidadeId: retrabalhoId,
    descricao: 'Reparo corretivo iniciado pelo técnico.',
  }).catch(() => {});
  return ret;
}

export async function concluirRetrabalho(
  retrabalhoId: string,
  dados: ConcluirRetrabalhoInput
) {
  if (!dados.solucaoAplicada || dados.solucaoAplicada.trim().length < 5) {
    throw {
      statusCode: 400,
      message: 'Descreva a solução técnica aplicada com ao menos 5 caracteres.',
    };
  }

  const ret = await repo.concluirRetrabalho(retrabalhoId, dados);
  realtimeService.broadcast('retrabalho:concluido', { retrabalho: ret });
  realtimeService.broadcast('qualidade:novo_lote', { retrabalho: ret, reteste: true });
  log({
    acao: 'RETRABALHO_CONCLUIDO',
    entidade: 'Retrabalho',
    entidadeId: retrabalhoId,
    descricao: `Retrabalho concluído e encaminhado para re-teste. Solução: ${dados.solucaoAplicada.substring(0, 80)}.`,
    detalhes: { solucaoAplicada: dados.solucaoAplicada },
  }).catch(() => {});
  return ret;
}


export async function getHistoricoRetrabalhos(page: number, limit: number) {
  return repo.getHistoricoRetrabalhos(page, limit);
}
