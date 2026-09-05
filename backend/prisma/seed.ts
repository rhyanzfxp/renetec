import { PrismaClient, PerfilUsuario, PrioridadeOS, StatusOS, CategoriaReprovacao } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed do Banco de Dados Renetec 2026...');

  const senhaPadraoHash = await argon2.hash('renetec123');

  // 1. Criar Usuários Oficiais
  console.log('👤 Criando usuários da equipe oficial...');
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@renetec.com.br' },
    update: {},
    create: {
      nome: 'Administrador Renetec',
      email: 'admin@renetec.com.br',
      senhaHash: senhaPadraoHash,
      perfil: PerfilUsuario.ADMIN,
      ativo: true,
    },
  });

  const samuel = await prisma.usuario.upsert({
    where: { email: 'samuel@renetec.com.br' },
    update: {},
    create: {
      nome: 'Samuel',
      email: 'samuel@renetec.com.br',
      senhaHash: senhaPadraoHash,
      perfil: PerfilUsuario.TECNICO,
      ativo: true,
    },
  });

  const joao = await prisma.usuario.upsert({
    where: { email: 'joao@renetec.com.br' },
    update: {},
    create: {
      nome: 'João',
      email: 'joao@renetec.com.br',
      senhaHash: senhaPadraoHash,
      perfil: PerfilUsuario.TECNICO,
      ativo: true,
    },
  });

  const joas = await prisma.usuario.upsert({
    where: { email: 'joas@renetec.com.br' },
    update: {},
    create: {
      nome: 'Joás',
      email: 'joas@renetec.com.br',
      senhaHash: senhaPadraoHash,
      perfil: PerfilUsuario.TECNICO,
      ativo: true,
    },
  });

  const rhyan = await prisma.usuario.upsert({
    where: { email: 'rhyan@renetec.com.br' },
    update: {},
    create: {
      nome: 'Rhyan',
      email: 'rhyan@renetec.com.br',
      senhaHash: senhaPadraoHash,
      perfil: PerfilUsuario.QUALIDADE,
      ativo: true,
    },
  });

  const luana = await prisma.usuario.upsert({
    where: { email: 'luana@renetec.com.br' },
    update: {},
    create: {
      nome: 'Luana',
      email: 'luana@renetec.com.br',
      senhaHash: senhaPadraoHash,
      perfil: PerfilUsuario.ADMIN,
      ativo: true,
    },
  });

  // 2. Criar Clientes Oficiais (MARANET)
  console.log('🏢 Criando clientes oficiais...');
  const maranet = await prisma.cliente.upsert({
    where: { documento: '12.345.678/0001-90' },
    update: {},
    create: {
      nomeRazaoSocial: 'MARANET Telecomunicações',
      documento: '12.345.678/0001-90',
      contatoTelefone: '(98) 98765-4321',
      email: 'operacoes@maranet.com.br',
      endereco: 'Av. Principal, 1000 - São Luís, MA',
    },
  });

  // 3. Criar Tipos de Equipamentos Oficiais (8 Equipamentos com Pontos)
  console.log('⚡ Criando catálogo de equipamentos oficiais da tabela de pontuação...');
  const equipamentos = [
    { nome: 'ONU simples', marca: 'Geral', modelo: 'Reparo padrão (1.0 pt)', tempoEstimadoMinutos: 30 },
    { nome: 'Roteador GIGA', marca: 'Weg / TP-Link / Intelbras', modelo: 'Reparo/manutenção (1.5 pts)', tempoEstimadoMinutos: 45 },
    { nome: 'ONT', marca: 'Huawei / ZTE / Geral', modelo: 'Reparo/manutenção (1.5 pts)', tempoEstimadoMinutos: 45 },
    { nome: 'SXT', marca: 'MikroTik', modelo: 'Reparo/manutenção (1.5 pts)', tempoEstimadoMinutos: 45 },
    { nome: 'Nano / LiteBeam / AirGrid', marca: 'Ubiquiti', modelo: 'Reparo/manutenção (1.5 pts)', tempoEstimadoMinutos: 45 },
    { nome: 'Rádio 5GHz', marca: 'MikroTik / Ubiquiti', modelo: 'Reparo/manutenção (1.5 pts)', tempoEstimadoMinutos: 45 },
    { nome: 'RouterBoard (RB)', marca: 'MikroTik', modelo: 'Conforme avaliação (2.0 pts)', tempoEstimadoMinutos: 60 },
    { nome: 'BaseBox', marca: 'MikroTik', modelo: 'Reparo/manutenção (2.0 pts)', tempoEstimadoMinutos: 60 },
    { nome: 'Placa de Controle', marca: 'Diversas', modelo: 'Reparo/manutenção (2.0 pts)', tempoEstimadoMinutos: 60 },
    { nome: 'Fonte PACPON / Nobreak DC', marca: 'Diversas', modelo: 'Reparo de fonte (2.0 pts)', tempoEstimadoMinutos: 60 },
    { nome: 'CCR / Roteador de Borda', marca: 'MikroTik', modelo: 'Equipamento de maior complexidade (2.5 pts)', tempoEstimadoMinutos: 75 },
    { nome: 'Mimosa / Rádios AC', marca: 'Mimosa / Ubiquiti', modelo: 'Equipamento avançado (2.5 pts)', tempoEstimadoMinutos: 75 },
    { nome: 'OLT', marca: 'Huawei / Fiberhome / ZTE', modelo: 'Equipamento complexo (3.0 pts)', tempoEstimadoMinutos: 90 },
    { nome: 'Switch', marca: 'Huawei / Cisco / Datacom', modelo: 'Switch gerenciável (3.0 pts)', tempoEstimadoMinutos: 90 },
    { nome: 'NE / Outros', marca: 'Diversas', modelo: 'Equipamento especial (3.0 pts)', tempoEstimadoMinutos: 90 },
    { nome: 'Reparo eletrônico / diagnóstico complexo', marca: 'Especializado', modelo: 'Serviço especial (3.0 pts)', tempoEstimadoMinutos: 90 },
  ];

  for (const eq of equipamentos) {
    await prisma.tipoEquipamento.create({
      data: eq,
    });
  }

  // 4. Criar Motivos de Reprovação Padronizados
  console.log('⚠️ Criando motivos de reprovação...');
  const motivos = [
    { codigo: 'MOT-01', descricao: 'Solda fria / Falso contato em terminais', categoria: CategoriaReprovacao.SOLDA },
    { codigo: 'MOT-02', descricao: 'Componente semicondutor queimado / curto', categoria: CategoriaReprovacao.COMPONENTE_QUEIMADO },
    { codigo: 'MOT-03', descricao: 'Falha lógica / Erro no firmware de controle', categoria: CategoriaReprovacao.FALHA_LOGICA },
    { codigo: 'MOT-04', descricao: 'Dano mecânico estrutural ou conector avariado', categoria: CategoriaReprovacao.MECANICO },
    { codigo: 'MOT-05', descricao: 'Calibração / Tensão de saída fora da tolerância (+/- 2%)', categoria: CategoriaReprovacao.CALIBRACAO },
  ];

  for (const m of motivos) {
    await prisma.motivoReprovacao.upsert({
      where: { codigo: m.codigo },
      update: {},
      create: m,
    });
  }

  // 5. Criar Configuração de Metas (Base 250, Alvo 300, Excelência 350)
  console.log('🎯 Criando configuração de metas oficiais...');
  const hoje = new Date();
  await prisma.metaConfig.upsert({
    where: {
      mesReferencia_anoReferencia: {
        mesReferencia: hoje.getMonth() + 1,
        anoReferencia: hoje.getFullYear(),
      },
    },
    update: {},
    create: {
      mesReferencia: hoje.getMonth() + 1,
      anoReferencia: hoje.getFullYear(),
      metaBronze: 250, // Base
      metaPrata: 300,  // Alvo
      metaOuro: 350,   // Excelência
      ativo: true,
    },
  });

  console.log('✅ Seed finalizado com sucesso!');
  console.log(`- Administrador: ${admin.email} (senha: renetec123)`);
  console.log(`- Técnicos: Samuel, João, Joás (senha: renetec123)`);
  console.log(`- Qualidade/Testes: ${rhyan.email} (senha: renetec123)`);
  console.log(`- Atendimento/Comercial: ${luana.email} (senha: renetec123)`);
  console.log(`- Cliente Principal: ${maranet.nomeRazaoSocial}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
