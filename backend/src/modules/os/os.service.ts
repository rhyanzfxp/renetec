import { osRepository } from './os.repository.js';
import { CreateOsInput, CreateClienteInput } from './os.schema.js';
import { StatusOS } from '@prisma/client';
import { prisma, isDatabaseReady } from '../../database/prisma.js';
import { TABELA_PONTUACAO_OFICIAL } from '../meta/meta.repository.js';
import { realtimeService } from '../realtime/realtime.service.js';
import { log } from '../auditoria/auditoria.service.js';

let fallbackClientes = [
  { id: 'cli-01', nomeRazaoSocial: 'MARANET Telecomunicações', documento: '12.345.678/0001-90', contatoTelefone: '(98) 98765-4321', email: 'operacoes@maranet.com.br' },
  { id: 'cli-02', nomeRazaoSocial: 'Solar Power Brasil Ltda', documento: '98.765.432/0001-10', contatoTelefone: '(11) 91234-5678', email: 'contato@solarpower.com.br' },
  { id: 'cli-03', nomeRazaoSocial: 'Indústria Metalúrgica Horizonte S.A.', documento: '45.123.789/0001-55', contatoTelefone: '(31) 98888-7777', email: 'suprimentos@horizonte.ind.br' },
];

export class OsService {
  // Lista de clientes oficiais da Renetec
  async getClientes() {
    if (isDatabaseReady()) {
      try {
        const clientes = await prisma.cliente.findMany({
          where: { ativo: true },
          orderBy: { nomeRazaoSocial: 'asc' },
        });
        if (clientes.length > 0) {
          return clientes.map((c) => ({
            id: c.id,
            nomeRazaoSocial: c.nomeRazaoSocial,
            documento: c.documento || '',
            contatoTelefone: c.contatoTelefone,
            email: c.email,
          }));
        }
      } catch {
        // fallback
      }
    }

    return fallbackClientes;
  }

  // Cadastra um novo cliente / empresa no sistema
  async createCliente(data: CreateClienteInput, usuarioId?: string) {
    const nomeLimpo = data.nomeRazaoSocial.trim();
    const docLimpo = data.documento?.trim() || null;
    const telLimpo = data.contatoTelefone?.trim() || null;
    const emailLimpo = data.email?.trim() || null;
    const enderecoLimpo = data.endereco?.trim() || null;

    let clienteRetorno: { id: string; nomeRazaoSocial: string; documento?: string | null; contatoTelefone?: string | null; email?: string | null };

    if (isDatabaseReady()) {
      try {
        // Verifica se já existe por nome ou documento
        const existing = await prisma.cliente.findFirst({
          where: {
            OR: [
              { nomeRazaoSocial: { equals: nomeLimpo, mode: 'insensitive' } },
              ...(docLimpo ? [{ documento: docLimpo }] : []),
            ],
          },
        });

        if (existing) {
          clienteRetorno = {
            id: existing.id,
            nomeRazaoSocial: existing.nomeRazaoSocial,
            documento: existing.documento || '',
            contatoTelefone: existing.contatoTelefone,
            email: existing.email,
          };
        } else {
          const novo = await prisma.cliente.create({
            data: {
              nomeRazaoSocial: nomeLimpo,
              documento: docLimpo,
              contatoTelefone: telLimpo,
              email: emailLimpo,
              endereco: enderecoLimpo,
              ativo: true,
            },
          });

          clienteRetorno = {
            id: novo.id,
            nomeRazaoSocial: novo.nomeRazaoSocial,
            documento: novo.documento || '',
            contatoTelefone: novo.contatoTelefone,
            email: novo.email,
          };
        }
      } catch (err) {
        console.error('[OsService.createCliente] Erro ao salvar no banco, usando fallback em memória:', err);
        // Fallback em memória
        const fallbackId = `cli-${Date.now()}`;
        const novoFallback = {
          id: fallbackId,
          nomeRazaoSocial: nomeLimpo,
          documento: docLimpo || '',
          contatoTelefone: telLimpo || '',
          email: emailLimpo || '',
        };
        fallbackClientes.push(novoFallback);
        clienteRetorno = novoFallback;
      }
    } else {
      const fallbackId = `cli-${Date.now()}`;
      const novoFallback = {
        id: fallbackId,
        nomeRazaoSocial: nomeLimpo,
        documento: docLimpo || '',
        contatoTelefone: telLimpo || '',
        email: emailLimpo || '',
      };
      fallbackClientes.push(novoFallback);
      clienteRetorno = novoFallback;
    }

    // Notifica em tempo real
    realtimeService.broadcast('cliente:criado', { cliente: clienteRetorno });

    if (usuarioId) {
      log({
        acao: 'CLIENTE_CRIADO',
        usuarioId,
        entidade: 'Cliente',
        entidadeId: clienteRetorno.id,
        descricao: `Novo cliente/empresa cadastrado: ${clienteRetorno.nomeRazaoSocial}`,
        detalhes: { cliente: clienteRetorno },
      }).catch(() => {});
    }

    return clienteRetorno;
  }


  // Lista de tipos de equipamentos com pontuação oficial
  async getTiposEquipamento() {
    if (isDatabaseReady()) {
      try {
        const tipos = await prisma.tipoEquipamento.findMany({
          where: { ativo: true },
          orderBy: { nome: 'asc' },
        });
        if (tipos.length > 0) {
          return tipos.map((t) => {
            const matched = TABELA_PONTUACAO_OFICIAL.find((p) =>
              t.nome.toLowerCase().includes(p.equipamentoServico.toLowerCase().split('/')[0].trim())
            );
            const pontos = matched ? matched.pontos : 1.5;
            return {
              id: t.id,
              nome: t.nome,
              marca: t.marca || 'Renetec Telecom / Geral',
              modelo: t.modelo || 'Padrão',
              tempoEstimadoMinutos: t.tempoEstimadoMinutos || Math.round(pontos * 30),
              pontos,
            };
          });
        }
      } catch {
        // fallback
      }
    }

    return TABELA_PONTUACAO_OFICIAL.map((t) => ({
      id: t.id,
      nome: t.equipamentoServico,
      marca: 'Renetec Telecom / Geral',
      modelo: t.observacoes,
      tempoEstimadoMinutos: Math.round(t.pontos * 30),
      pontos: t.pontos,
    }));
  }

  // Lista de técnicos da equipe oficial Renetec
  async getTecnicos() {
    if (isDatabaseReady()) {
      try {
        const tecnicos = await prisma.usuario.findMany({
          where: { ativo: true },
          orderBy: { nome: 'asc' },
        });
        if (tecnicos.length > 0) {
          return tecnicos.map((u) => ({
            id: u.id,
            nome: u.nome,
            email: u.email,
            funcao: u.perfil === 'QUALIDADE' ? 'Qualidade/Testes' : (u.perfil === 'ADMIN' ? 'Atendimento/Comercial' : 'Produção'),
          }));
        }
      } catch {
        // fallback
      }
    }

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
    const [clientes, tipos, tecnicos] = await Promise.all([
      this.getClientes(),
      this.getTiposEquipamento(),
      this.getTecnicos(),
    ]);

    const clientesMap = Object.fromEntries(clientes.map((c) => [c.id, c]));
    const tiposEquipMap = Object.fromEntries(tipos.map((e) => [e.id, e]));
    const tecnicosMap = Object.fromEntries(tecnicos.map((t) => [t.id, t]));

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
      acao: 'OS_STATUS_ALTERADO',
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
