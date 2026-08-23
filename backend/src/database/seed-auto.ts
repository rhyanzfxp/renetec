import { prisma } from './prisma.js';
import argon2 from 'argon2';
import { PerfilUsuario, CategoriaReprovacao } from '@prisma/client';

let isSeeding = false;
let isSeeded = false;

export async function ensureDatabaseSeeded(): Promise<void> {
  if (isSeeded || isSeeding) return;
  isSeeding = true;

  try {
    const senhaPadraoHash = await argon2.hash('renetec123');

    // 1. USUÁRIOS
    const usuariosBase = [
      { nome: 'Administrador Renetec', email: 'admin@renetec.com.br', perfil: PerfilUsuario.ADMIN },
      { nome: 'João', email: 'joao@renetec.com.br', perfil: PerfilUsuario.TECNICO },
      { nome: 'Samuel', email: 'samuel@renetec.com.br', perfil: PerfilUsuario.TECNICO },
      { nome: 'Joás', email: 'joas@renetec.com.br', perfil: PerfilUsuario.TECNICO },
      { nome: 'Rhyan', email: 'rhyan@renetec.com.br', perfil: PerfilUsuario.QUALIDADE },
      { nome: 'Luana', email: 'luana@renetec.com.br', perfil: PerfilUsuario.ADMIN },
      { nome: 'Controle de Qualidade', email: 'qualidade@renetec.com.br', perfil: PerfilUsuario.QUALIDADE },
    ];

    for (const u of usuariosBase) {
      await prisma.usuario.upsert({
        where: { email: u.email },
        update: { nome: u.nome, perfil: u.perfil, ativo: true },
        create: {
          nome: u.nome,
          email: u.email,
          senhaHash: senhaPadraoHash,
          perfil: u.perfil,
          ativo: true,
        },
      });
    }

    // 2. CLIENTES OFICIAIS
    const clientesBase = [
      {
        nomeRazaoSocial: 'MARANET Telecomunicações',
        documento: '12.345.678/0001-90',
        contatoTelefone: '(98) 98765-4321',
        email: 'operacoes@maranet.com.br',
        endereco: 'Av. Principal, 1000 - São Luís, MA',
      },
      {
        nomeRazaoSocial: 'Solar Power Brasil Ltda',
        documento: '98.765.432/0001-10',
        contatoTelefone: '(11) 91234-5678',
        email: 'contato@solarpower.com.br',
        endereco: 'Rua das Palmeiras, 450 - Campinas, SP',
      },
      {
        nomeRazaoSocial: 'Indústria Metalúrgica Horizonte S.A.',
        documento: '45.123.789/0001-55',
        contatoTelefone: '(31) 98888-7777',
        email: 'suprimentos@horizonte.ind.br',
        endereco: 'Distrito Industrial, Lote 12 - Contagem, MG',
      },
    ];

    for (const c of clientesBase) {
      await prisma.cliente.upsert({
        where: { documento: c.documento },
        update: { nomeRazaoSocial: c.nomeRazaoSocial, contatoTelefone: c.contatoTelefone, email: c.email },
        create: c,
      });
    }

    // 3. CATÁLOGO OFICIAL DE EQUIPAMENTOS
    const equipamentosBase = [
      { nome: 'ONU simples', marca: 'Geral / Huawei / ZTE', modelo: 'Reparo padrão', tempoEstimadoMinutos: 30 },
      { nome: 'Roteador GIGA/ONT/', marca: 'Weg / TP-Link / Intelbras', modelo: 'Reparo/manutenção', tempoEstimadoMinutos: 45 },
      { nome: 'Rádio / SXT / Nano / Airgrid / LiteBeam', marca: 'MikroTik / Ubiquiti', modelo: 'Reparo/manutenção', tempoEstimadoMinutos: 45 },
      { nome: 'RB/BASEBOX/', marca: 'MikroTik', modelo: 'Conforme avaliação', tempoEstimadoMinutos: 60 },
      { nome: 'Placa / PACPON', marca: 'Diversas', modelo: 'Reparo/manutenção', tempoEstimadoMinutos: 60 },
      { nome: 'CCR/MIMOSAS/RADIOS AC', marca: 'MikroTik / Mimosa', modelo: 'Equipamento de maior complexidade', tempoEstimadoMinutos: 75 },
      { nome: 'OLT/SWITCH/NE E OUTROS', marca: 'Huawei / Cisco / Fiberhome', modelo: 'Equipamento complexo', tempoEstimadoMinutos: 90 },
      { nome: 'Reparo eletrônico / diagnóstico complexo', marca: 'Especial', modelo: 'Serviço especial', tempoEstimadoMinutos: 90 },
    ];

    for (const eq of equipamentosBase) {
      const existe = await prisma.tipoEquipamento.findFirst({
        where: { nome: { contains: eq.nome.split('/')[0].trim(), mode: 'insensitive' } },
      });
      if (!existe) {
        await prisma.tipoEquipamento.create({ data: eq });
      }
    }

    // 4. MOTIVOS DE REPROVAÇÃO
    const motivosBase = [
      { codigo: 'MOT-01', descricao: 'Falha de Solda / Curto em Trilha', categoria: CategoriaReprovacao.SOLDA },
      { codigo: 'MOT-02', descricao: 'Componente Queimado / Defeito de Semicondutor', categoria: CategoriaReprovacao.COMPONENTE_QUEIMADO },
      { codigo: 'MOT-03', descricao: 'Falha Lógica / Microcontrolador não Inicializa', categoria: CategoriaReprovacao.FALHA_LOGICA },
      { codigo: 'MOT-04', descricao: 'Problema Mecânico / Conector Danificado', categoria: CategoriaReprovacao.MECANICO },
      { codigo: 'MOT-05', descricao: 'Desvio de Calibração / Tensão Fora da Faixa', categoria: CategoriaReprovacao.CALIBRACAO },
      { codigo: 'MOT-06', descricao: 'Outro Defeito Identificado no Teste de Carga', categoria: CategoriaReprovacao.OUTRO },
    ];

    for (const m of motivosBase) {
      await prisma.motivoReprovacao.upsert({
        where: { codigo: m.codigo },
        update: { descricao: m.descricao, categoria: m.categoria, ativo: true },
        create: { codigo: m.codigo, descricao: m.descricao, categoria: m.categoria, ativo: true },
      });
    }

    // 5. CONFIGURAÇÃO DE META DO MÊS ATUAL
    const agora = new Date();
    const mesAtual = agora.getMonth() + 1;
    const anoAtual = agora.getFullYear();

    await prisma.metaConfig.upsert({
      where: {
        mesReferencia_anoReferencia: { mesReferencia: mesAtual, anoReferencia: anoAtual },
      },
      update: {},
      create: {
        mesReferencia: mesAtual,
        anoReferencia: anoAtual,
        metaBronze: 250,
        metaPrata: 300,
        metaOuro: 350,
        ativo: true,
      },
    });

    isSeeded = true;
    console.log('✅ Base de dados Supabase auto-inicializada com sucesso (Usuários, Clientes, Equipamentos, Motivos e Metas).');
  } catch (err) {
    console.error('⚠️ Aviso na auto-inicialização do banco:', err);
  } finally {
    isSeeding = false;
  }
}
