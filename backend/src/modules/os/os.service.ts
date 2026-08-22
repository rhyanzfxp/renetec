import { osRepository, OsListItem } from './os.repository.js';
import { CreateOsInput } from './os.schema.js';
import { StatusOS } from '@prisma/client';
import { TABELA_PONTUACAO_OFICIAL } from '../meta/meta.repository.js';
import { realtimeService } from '../realtime/realtime.service.js';
import { log } from '../auditoria/auditoria.service.js';

export class OsService {
  // Lista de clientes oficiais da Renetec
  getClientes() {
    return [
      { id: 'cli-01', nomeRazaoSocial: 'MARANET Telecomunicações', documento: '12.345.678/0001-90' },
      { id: 'cli-02', nomeRazaoSocial: 'Solar Power Brasil Ltda', documento: '98.765.432/0001-10' },
      { id: 'cli-03', nomeRazaoSocial: 'Indústria Metalúrgica Horizonte S.A.', documento: '45.123.789/0001-55' },
    ];
  }

  // Lista de tipos de equipamentos com pontuação oficial
  getTiposEquipamento() {
    return TABELA_PONTUACAO_OFICIAL.map((t) => ({
      id: t.id,
      nome: t.equipamentoServico,
      marca: 'Renetec Telecom / Geral',
      modelo: t.observacao,
      tempoEstimadoMinutos: Math.round(t.pontos * 30),
      pontos: t.pontos,
    }));
  }

  // Lista de técnicos da equipe oficial Renetec
  getTecnicos() {
    return [
      { id: 'colab-samuel', nome: 'Samuel', email: 'samuel@renetec.com.br', funcao: 'Produção' },
      { id: 'colab-joao', nome: 'João', email: 'joao@renetec.com.br', funcao: 'Produção' },
      { id: 'colab-joas', nome: 'Joás', email: 'joas@renetec.com.br', funcao: 'Produção' },
      { id: 'colab-rhyan', nome: 'Rhyan', email: 'rhyan@renetec.com.br', funcao: 'Qualidade/Testes' },
      { id: 'colab-luana', nome: 'Luana', email: 'luana@renetec.com.br', funcao: 'Atendimento/Comercial' },
    ];
  }

  async list(filters: {
    search?: string;
    status?: string;
    tecnicoId?: string;
    clienteId?: string;
    page: number;
    limit: number;
  }) {
    return osRepository.list(filters);
  }

  async getById(id: string) {
    const os = await osRepository.findById(id);
    if (!os) {
      throw new Error('OS_NAO_ENCONTRADA');
    }
    return os;
  }

  async create(data: CreateOsInput, usuarioId: string) {
    const clientesMap = Object.fromEntries(this.getClientes().map((c) => [c.id, c]));
    const tiposEquipMap = Object.fromEntries(this.getTiposEquipamento().map((e) => [e.id, e]));
    const tecnicosMap = Object.fromEntries(this.getTecnicos().map((t) => [t.id, t]));

    const newOs = await osRepository.create(data, clientesMap, tiposEquipMap, tecnicosMap);
    
    realtimeService.broadcast('os:criada', { os: newOs });
    if (newOs.status === 'AGUARDANDO_TESTE') {
      realtimeService.broadcast('qualidade:novo_lote', { os: newOs });
    }

    log({
      acao: 'OS_CRIADA',
      usuarioId,
      entidade: 'OrdemServico',
      entidadeId: newOs.id,
      descricao: `OS #${newOs.numeroOS} cadastrada com ${newOs.itens.length} tipo(s) de equipamento(s). Status inicial: ${newOs.status}`,
      detalhes: { numeroOS: newOs.numeroOS, status: newOs.status, itens: newOs.itens },
    }).catch(() => {});

    return newOs;
  }

  async updateStatus(id: string, newStatus: StatusOS, observacao?: string, usuarioId?: string) {
    const os = await osRepository.findById(id);
    if (!os) {
      throw new Error('OS_NAO_ENCONTRADA');
    }

    const updated = await osRepository.updateStatus(id, newStatus, observacao);
    if (updated) {
      realtimeService.broadcast('os:criada', { os: updated });
      if (newStatus === 'AGUARDANDO_TESTE') {
        realtimeService.broadcast('qualidade:novo_lote', { os: updated });
      }
    }

    log({
      acao: 'OS_STATUS_ATUALIZADO',
      usuarioId,
      entidade: 'OrdemServico',
      entidadeId: id,
      descricao: `Status da OS atualizado para ${newStatus}.`,
      detalhes: { statusAnterior: os.status, statusNovo: newStatus, observacao },
    }).catch(() => {});

    return updated;
  }
}

export const osService = new OsService();

