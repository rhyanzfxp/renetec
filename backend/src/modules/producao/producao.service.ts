import * as repo from './producao.repository.js';
import type { FinalizarProducaoInput } from './producao.schema.js';
import { realtimeService } from '../realtime/realtime.service.js';
import { log } from '../auditoria/auditoria.service.js';
import { getMetasAtual } from '../meta/meta.service.js';

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

  // Atualiza meta coletiva em tempo real após produção finalizada
  getMetasAtual().then((metas) => {
    realtimeService.broadcast('meta:atualizada', { metas });
  }).catch(() => {});

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

// ─── Apontamento de Lote do Técnico (Ex: OS #1920 com 12 ONTs, 2 CCRs, 10 ONUs) ──
export async function apontarLoteTecnico(
  tecnicoId: string,
  tecnicoNome: string,
  dados: any
) {
  const { osService } = await import('../os/os.service.js');
  const [tipos, clientes] = await Promise.all([
    osService.getTiposEquipamento(),
    osService.getClientes(),
  ]);
  const tiposEquipMap = Object.fromEntries(tipos.map((e) => [e.id, e]));
  const clientesMap = Object.fromEntries(clientes.map((c) => [c.id, c]));
  const clienteInfo = clientesMap[dados.clienteId || 'cli-01'];

  const resultado = await repo.criarApontamentoLote(
    tecnicoId,
    tecnicoNome,
    dados,
    tiposEquipMap,
    clienteInfo
  );

  const totalUnidades = dados.itens.reduce((acc: number, it: any) => acc + Number(it.quantidade), 0);

  // Broadcasts em tempo real para TV, CQ, Dashboard e Técnicos
  realtimeService.broadcast('os:criada', { os: resultado.ordemServico });
  if (dados.enviarDiretoTeste) {
    realtimeService.broadcast('qualidade:novo_lote', {
      os: resultado.ordemServico,
      itens: resultado.itens,
      tecnicoNome,
    });
    realtimeService.broadcast('producao:finalizada', {
      producoes: resultado.producoes,
      tecnicoNome,
    });
    // Atualiza meta coletiva em tempo real após lote aprovado diretamente
    getMetasAtual().then((metas) => {
      realtimeService.broadcast('meta:atualizada', { metas });
    }).catch(() => {});
  } else {
    realtimeService.broadcast('producao:iniciada', {
      os: resultado.ordemServico,
      tecnicoNome,
    });
  }

  log({
    acao: 'APONTAMENTO_LOTE_TECNICO',
    usuarioId: tecnicoId,
    entidade: 'Producao',
    entidadeId: resultado.ordemServico.id,
    descricao: `Técnico ${tecnicoNome} apontou lote da OS #${resultado.ordemServico.numeroOS} com ${totalUnidades} unidades (${dados.itens.length} tipo(s) de equipamento).`,
    detalhes: {
      numeroOS: resultado.ordemServico.numeroOS,
      totalUnidades,
      enviarDiretoTeste: dados.enviarDiretoTeste,
      itens: dados.itens,
    },
  }).catch(() => {});

  return resultado;
}

