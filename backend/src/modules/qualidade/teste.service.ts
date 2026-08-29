import * as repo from './teste.repository.js';
import type { RealizarTesteInput } from './teste.schema.js';
import { realtimeService } from '../realtime/realtime.service.js';
import { log } from '../auditoria/auditoria.service.js';

export async function getMotivosReprovacao() {
  return repo.getMotivosReprovacao();
}

export async function getFilaTestes() {
  return repo.getFilaTestes();
}

export async function realizarTeste(inspetorId: string, dados: RealizarTesteInput) {
  // Validação estrita da equação invariável de negócio
  if (dados.quantidadeAprovada + dados.quantidadeReprovada !== dados.quantidadeTestada) {
    throw {
      statusCode: 400,
      message: 'Inconsistência quantitativa: Aprovados + Reprovados deve ser igual a Testados.',
    };
  }

  if (dados.quantidadeReprovada > 0 && !dados.motivoReprovacaoId) {
    throw {
      statusCode: 400,
      message: 'É obrigatório selecionar um motivo de reprovação para os itens não-conformes.',
    };
  }

  const teste = await repo.realizarTeste(inspetorId, dados);

  if (dados.quantidadeReprovada > 0) {
    realtimeService.broadcast('qualidade:reprovado', { teste });
    realtimeService.broadcast('retrabalho:criado', {
      testeId: teste.id,
      tecnicoResponsavelId: dados.tecnicoResponsavelId,
      quantidadeReprovada: dados.quantidadeReprovada,
      detalhesDefeito: dados.detalhesDefeito || dados.observacao,
    });
    log({
      acao: 'TESTE_REPROVADO',
      usuarioId: inspetorId,
      entidade: 'Teste',
      entidadeId: teste.id,
      descricao: `Laudo de CQ: ${dados.quantidadeAprovada} aprovadas, ${dados.quantidadeReprovada} reprovadas (encaminhadas para retrabalho).`,
      detalhes: { quantidadeAprovada: dados.quantidadeAprovada, quantidadeReprovada: dados.quantidadeReprovada },
    }).catch(() => {});
  }

  if (dados.quantidadeAprovada > 0) {
    realtimeService.broadcast('qualidade:aprovado', { teste });
    realtimeService.broadcast('meta:atualizada', { aprovadas: dados.quantidadeAprovada });
    log({
      acao: 'TESTE_APROVADO',
      usuarioId: inspetorId,
      entidade: 'Teste',
      entidadeId: teste.id,
      descricao: `Lote com peças aprovadas no CQ: ${dados.quantidadeAprovada} unidades.`,
      detalhes: { quantidadeAprovada: dados.quantidadeAprovada },
    }).catch(() => {});
  }

  // Notificação geral para atualizar Dashboard Gerencial, TV da Fábrica e Metas em tempo real
  realtimeService.broadcast('dashboard:atualizado', { testeId: teste.id });

  return teste;
}


export async function getHistoricoTestes(page: number, limit: number) {
  return repo.getHistoricoTestes(page, limit);
}
