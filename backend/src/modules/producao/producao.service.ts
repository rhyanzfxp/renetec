import * as repo from './producao.repository.js';
import type { FinalizarProducaoInput } from './producao.schema.js';
import { realtimeService } from '../realtime/realtime.service.js';
import { log } from '../auditoria/auditoria.service.js';
import { getMetasAtual } from '../meta/meta.service.js';

// ─── Fila do técnico ──────────────────────────────────────────────────────────
export async function getMinhaFila(tecnicoId: string) {
  return repo.getMinhaFila(tecnicoId);
}

// ─── Todas as caixas / OSs do técnico (bancada, fila, teste) ──────────────────
export async function getMinhasCaixas(tecnicoId: string) {
  return repo.getMinhasCaixas(tecnicoId);
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

// ─── Pausar produção na bancada ───────────────────────────────────────────────
export async function pausarProducao(
  producaoId: string | undefined,
  tecnicoId: string,
  observacao?: string
) {
  const producaoAtiva = await repo.getProducaoAtiva(tecnicoId);

  const targetId = producaoId || producaoAtiva?.id;
  if (!targetId) {
    throw {
      statusCode: 404,
      message: 'Nenhuma produção ativa encontrada para pausar.',
    };
  }

  const pausada = await repo.pausarProducao(targetId, observacao);
  realtimeService.broadcast('producao:finalizada', { producao: pausada, pausado: true });
  realtimeService.broadcast('producao:pausada', { producao: pausada });

  log({
    acao: 'PRODUCAO_PAUSADA',
    usuarioId: tecnicoId,
    entidade: 'Producao',
    entidadeId: targetId,
    descricao: `Produção da OS #${pausada.itemOrdemServico.ordemServico.numeroOS} pausada na bancada pelo técnico para continuação posterior.`,
    detalhes: { producaoId: targetId },
  }).catch(() => {});

  return pausada;
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
  const isAoVivo = dados.modoOperacao === 'INICIAR_PRODUCAO' || dados.iniciarProducaoAoVivo === true;
  const isDiretoCQ = dados.modoOperacao === 'DESPACHAR_CQ' || (dados.enviarDiretoTeste === true && !isAoVivo && dados.modoOperacao !== 'SALVAR_BANCADA');

  // Broadcasts em tempo real para TV, CQ, Dashboard e Técnicos
  realtimeService.broadcast('os:criada', { os: resultado.ordemServico });
  if (isDiretoCQ) {
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
  } else if (isAoVivo) {
    realtimeService.broadcast('producao:iniciada', {
      os: resultado.ordemServico,
      producoes: resultado.producoes,
      tecnicoNome,
    });
  } else {
    realtimeService.broadcast('producao:salva', {
      os: resultado.ordemServico,
      tecnicoNome,
    });
  }

  log({
    acao: isAoVivo ? 'PRODUCAO_INICIADA_AO_VIVO' : 'APONTAMENTO_LOTE_TECNICO',
    usuarioId: tecnicoId,
    entidade: 'Producao',
    entidadeId: resultado.ordemServico.id,
    descricao: isAoVivo
      ? `Técnico ${tecnicoNome} iniciou produção ao vivo da OS #${resultado.ordemServico.numeroOS} (${totalUnidades} un).`
      : `Técnico ${tecnicoNome} apontou lote da OS #${resultado.ordemServico.numeroOS} com ${totalUnidades} unidades (${dados.itens.length} tipo(s) de equipamento).`,
    detalhes: {
      numeroOS: resultado.ordemServico.numeroOS,
      totalUnidades,
      enviarDiretoTeste: dados.enviarDiretoTeste,
      iniciarProducaoAoVivo: isAoVivo,
      modoOperacao: dados.modoOperacao,
      itens: dados.itens,
    },
  }).catch(() => {});

  return resultado;
}

// ─── Despacha um item de bancada salvo (EM_PRODUCAO) para teste no CQ ─────────
export async function despacharItemParaCQ(itemOrdemServicoId: string, tecnicoId: string, tecnicoNome: string) {
  const item = await repo.despacharItemParaCQ(itemOrdemServicoId, tecnicoId);

  // Broadcast em tempo real para a tela do testador de CQ
  realtimeService.broadcast('qualidade:novo_lote', {
    item,
    tecnicoNome,
  });
  realtimeService.broadcast('producao:finalizada', {
    item,
    tecnicoNome,
  });

  log({
    acao: 'LOTE_DESPACHADO_CQ',
    usuarioId: tecnicoId,
    entidade: 'ItemOrdemServico',
    entidadeId: itemOrdemServicoId,
    descricao: `Técnico ${tecnicoNome} concluiu caixa e despachou OS #${item.ordemServico.numeroOS} (${item.quantidade} un de ${item.tipoEquipamento.nome}) para o Controle de Qualidade.`,
    detalhes: { itemOrdemServicoId, quantidade: item.quantidade },
  }).catch(() => {});

  return item;
}

// ─── Listar Minhas OS em Andamento (com histórico e separação por tipo) ────────
export async function getMinhasOsEmAndamento(tecnicoId: string) {
  return repo.getMinhasOsEmAndamento(tecnicoId);
}

// ─── Listar Produção de Hoje do Técnico ───────────────────────────────────────
export async function getProducaoHoje(tecnicoId: string) {
  return repo.getProducaoHojeTecnico(tecnicoId);
}

// ─── Concluir Ordem de Serviço Definitivamente ────────────────────────────────
export async function concluirOrdemServico(
  osIdOrNumero: string,
  tecnicoId: string,
  tecnicoNome: string,
  observacao?: string
) {
  const osConcluida = await repo.concluirOrdemServico(osIdOrNumero, tecnicoId, observacao);

  realtimeService.broadcast('os:concluida', {
    os: osConcluida,
    tecnicoNome,
  });
  realtimeService.broadcast('dashboard:atualizado', { osId: osConcluida.id });

  log({
    acao: 'OS_CONCLUIDA',
    usuarioId: tecnicoId,
    entidade: 'OrdemServico',
    entidadeId: osConcluida.id,
    descricao: `Técnico ${tecnicoNome} concluiu a OS #${osConcluida.numeroOS} definitivamente.`,
    detalhes: { numeroOS: osConcluida.numeroOS, observacao },
  }).catch(() => {});

  return osConcluida;
}



