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
    // Migração de compatibilidade: desmembra TODOS os equipamentos que estavam agrupados com barras
    
    // A. Roteador GIGA e ONT
    const legadoRoteador = await prisma.tipoEquipamento.findFirst({
      where: { nome: { contains: 'Roteador GIGA/ONT', mode: 'insensitive' } },
    });
    if (legadoRoteador) {
      await prisma.tipoEquipamento.update({
        where: { id: legadoRoteador.id },
        data: { nome: 'Roteador GIGA', marca: 'Weg / TP-Link / Intelbras', modelo: 'Reparo/manutenção (1.5 pts)', tempoEstimadoMinutos: 45 },
      });
      const ontExiste = await prisma.tipoEquipamento.findFirst({ where: { nome: { equals: 'ONT', mode: 'insensitive' } } });
      if (!ontExiste) {
        await prisma.tipoEquipamento.create({
          data: { nome: 'ONT', marca: 'Huawei / ZTE / Geral', modelo: 'Reparo/manutenção (1.5 pts)', tempoEstimadoMinutos: 45 },
        });
      }
    }

    // B. RB e BaseBox
    const legadoRb = await prisma.tipoEquipamento.findFirst({
      where: { nome: { contains: 'RB/BASEBOX', mode: 'insensitive' } },
    });
    if (legadoRb) {
      await prisma.tipoEquipamento.update({
        where: { id: legadoRb.id },
        data: { nome: 'RouterBoard (RB)', marca: 'MikroTik', modelo: 'Reparo/manutenção (2.0 pts)', tempoEstimadoMinutos: 60 },
      });
      const baseBoxExiste = await prisma.tipoEquipamento.findFirst({ where: { nome: { equals: 'BaseBox', mode: 'insensitive' } } });
      if (!baseBoxExiste) {
        await prisma.tipoEquipamento.create({
          data: { nome: 'BaseBox', marca: 'MikroTik', modelo: 'Reparo/manutenção (2.0 pts)', tempoEstimadoMinutos: 60 },
        });
      }
    }

    // C. Placa e PACPON
    const legadoPlaca = await prisma.tipoEquipamento.findFirst({
      where: { nome: { contains: 'Placa / PACPON', mode: 'insensitive' } },
    });
    if (legadoPlaca) {
      await prisma.tipoEquipamento.update({
        where: { id: legadoPlaca.id },
        data: { nome: 'Placa de Controle', marca: 'Diversas', modelo: 'Reparo/manutenção (2.0 pts)', tempoEstimadoMinutos: 60 },
      });
      const pacponExiste = await prisma.tipoEquipamento.findFirst({ where: { nome: { contains: 'PACPON', mode: 'insensitive' } } });
      if (!pacponExiste) {
        await prisma.tipoEquipamento.create({
          data: { nome: 'Fonte PACPON / Nobreak DC', marca: 'Diversas', modelo: 'Reparo de fonte (2.0 pts)', tempoEstimadoMinutos: 60 },
        });
      }
    }

    // D. CCR e Mimosa / Rádios AC
    const legadoCcr = await prisma.tipoEquipamento.findFirst({
      where: { nome: { contains: 'CCR/MIMOSAS', mode: 'insensitive' } },
    });
    if (legadoCcr) {
      await prisma.tipoEquipamento.update({
        where: { id: legadoCcr.id },
        data: { nome: 'CCR / Roteador de Borda', marca: 'MikroTik', modelo: 'Reparo avançado (2.5 pts)', tempoEstimadoMinutos: 75 },
      });
      const mimosaExiste = await prisma.tipoEquipamento.findFirst({ where: { nome: { contains: 'Mimosa', mode: 'insensitive' } } });
      if (!mimosaExiste) {
        await prisma.tipoEquipamento.create({
          data: { nome: 'Mimosa / Rádios AC', marca: 'Mimosa / Ubiquiti', modelo: 'Reparo de RF (2.5 pts)', tempoEstimadoMinutos: 75 },
        });
      }
    }

    // E. OLT, Switch e NE
    const legadoOlt = await prisma.tipoEquipamento.findFirst({
      where: { nome: { contains: 'OLT/SWITCH', mode: 'insensitive' } },
    });
    if (legadoOlt) {
      await prisma.tipoEquipamento.update({
        where: { id: legadoOlt.id },
        data: { nome: 'OLT', marca: 'Huawei / Fiberhome / ZTE', modelo: 'Equipamento complexo (3.0 pts)', tempoEstimadoMinutos: 90 },
      });
      const switchExiste = await prisma.tipoEquipamento.findFirst({ where: { nome: { equals: 'Switch', mode: 'insensitive' } } });
      if (!switchExiste) {
        await prisma.tipoEquipamento.create({
          data: { nome: 'Switch', marca: 'Huawei / Cisco / Datacom', modelo: 'Switch gerenciável (3.0 pts)', tempoEstimadoMinutos: 90 },
        });
      }
      const neExiste = await prisma.tipoEquipamento.findFirst({ where: { nome: { equals: 'NE / Outros', mode: 'insensitive' } } });
      if (!neExiste) {
        await prisma.tipoEquipamento.create({
          data: { nome: 'NE / Outros', marca: 'Diversas', modelo: 'Equipamento especial (3.0 pts)', tempoEstimadoMinutos: 90 },
        });
      }
    }

    // F. Rádio, SXT, Nano / LiteBeam / Airgrid
    const legadoRadio = await prisma.tipoEquipamento.findFirst({
      where: { nome: { contains: 'SXT / Nano', mode: 'insensitive' } },
    });
    if (legadoRadio) {
      await prisma.tipoEquipamento.update({
        where: { id: legadoRadio.id },
        data: { nome: 'Rádio 5GHz', marca: 'MikroTik / Ubiquiti', modelo: 'Reparo/manutenção (1.5 pts)', tempoEstimadoMinutos: 45 },
      });
      const sxtExiste = await prisma.tipoEquipamento.findFirst({ where: { nome: { equals: 'SXT', mode: 'insensitive' } } });
      if (!sxtExiste) {
        await prisma.tipoEquipamento.create({
          data: { nome: 'SXT', marca: 'MikroTik', modelo: 'Reparo/manutenção (1.5 pts)', tempoEstimadoMinutos: 45 },
        });
      }
      const nanoExiste = await prisma.tipoEquipamento.findFirst({ where: { nome: { contains: 'Nano', mode: 'insensitive' } } });
      if (!nanoExiste) {
        await prisma.tipoEquipamento.create({
          data: { nome: 'Nano / LiteBeam / AirGrid', marca: 'Ubiquiti', modelo: 'Reparo/manutenção (1.5 pts)', tempoEstimadoMinutos: 45 },
        });
      }
    }

    const equipamentosBase = [
      { nome: 'ONU simples', marca: 'Geral / Huawei / ZTE', modelo: 'Reparo padrão (1.0 pt)', tempoEstimadoMinutos: 30 },
      { nome: 'Roteador GIGA', marca: 'Weg / TP-Link / Intelbras', modelo: 'Reparo/manutenção (1.5 pts)', tempoEstimadoMinutos: 45 },
      { nome: 'ONT', marca: 'Huawei / ZTE / Geral', modelo: 'Reparo/manutenção (1.5 pts)', tempoEstimadoMinutos: 45 },
      { nome: 'SXT', marca: 'MikroTik', modelo: 'Reparo/manutenção (1.5 pts)', tempoEstimadoMinutos: 45 },
      { nome: 'Nano / LiteBeam / AirGrid', marca: 'Ubiquiti', modelo: 'Reparo/manutenção (1.5 pts)', tempoEstimadoMinutos: 45 },
      { nome: 'Rádio 5GHz', marca: 'MikroTik / Ubiquiti', modelo: 'Reparo/manutenção (1.5 pts)', tempoEstimadoMinutos: 45 },
      { nome: 'RouterBoard (RB)', marca: 'MikroTik', modelo: 'Conforme avaliação (2.0 pts)', tempoEstimadoMinutos: 60 },
      { nome: 'BaseBox', marca: 'MikroTik', modelo: 'Reparo/manutenção (2.0 pts)', tempoEstimadoMinutos: 60 },
      { nome: 'Placa de Controle', marca: 'Diversas', modelo: 'Reparo/manutenção (2.0 pts)', tempoEstimadoMinutos: 60 },
      { nome: 'Fonte PACPON / Nobreak DC', marca: 'Diversas', modelo: 'Reparo/manutenção (2.0 pts)', tempoEstimadoMinutos: 60 },
      { nome: 'CCR / Roteador de Borda', marca: 'MikroTik', modelo: 'Equipamento de maior complexidade (2.5 pts)', tempoEstimadoMinutos: 75 },
      { nome: 'Mimosa / Rádios AC', marca: 'Mimosa / Ubiquiti', modelo: 'Equipamento avançado (2.5 pts)', tempoEstimadoMinutos: 75 },
      { nome: 'OLT', marca: 'Huawei / Fiberhome / ZTE', modelo: 'Equipamento complexo (3.0 pts)', tempoEstimadoMinutos: 90 },
      { nome: 'Switch', marca: 'Huawei / Cisco / Datacom', modelo: 'Switch gerenciável (3.0 pts)', tempoEstimadoMinutos: 90 },
      { nome: 'NE / Outros', marca: 'Diversas', modelo: 'Equipamento especial (3.0 pts)', tempoEstimadoMinutos: 90 },
      { nome: 'Reparo eletrônico / diagnóstico complexo', marca: 'Especial', modelo: 'Serviço especial (3.0 pts)', tempoEstimadoMinutos: 90 },
    ];

    for (const eq of equipamentosBase) {
      const existe = await prisma.tipoEquipamento.findFirst({
        where: { nome: { equals: eq.nome, mode: 'insensitive' } },
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
