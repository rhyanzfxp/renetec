import { prisma } from '../src/database/prisma.js';
import * as producaoRepository from '../src/modules/producao/producao.repository.js';
import * as producaoService from '../src/modules/producao/producao.service.js';

interface TestStepResult {
  step: number;
  description: string;
  passed: boolean;
  details: string;
}

async function runFluxoOsTestSuite() {
  console.log('================================================================');
  console.log('🧪 BATERIA DE TESTES AUTOMATIZADOS: FLUXO DE OS E PRODUÇÃO DIÁRIA');
  console.log('================================================================\n');

  const results: TestStepResult[] = [];

  function record(step: number, description: string, passed: boolean, details: string) {
    results.push({ step, description, passed, details });
    const icon = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${icon} [Passo ${step}] ${description}`);
    console.log(`       ↳ ${details}`);
  }

  try {
    // ─── Setup Inicial: Obter Técnico, Cliente e TipoEquipamento ─────────────
    let tecnico = await prisma.usuario.findFirst({
      where: { perfil: 'TECNICO', ativo: true },
    });
    if (!tecnico) {
      tecnico = await prisma.usuario.findFirst();
    }
    if (!tecnico) throw new Error('Nenhum usuário encontrado no banco.');

    let cliente = await prisma.cliente.findFirst();
    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: { nomeRazaoSocial: 'Cliente Teste Automatizado', documento: '00.000.000/0001-00' },
      });
    }

    let tipoEquip = await prisma.tipoEquipamento.findFirst();
    if (!tipoEquip) {
      tipoEquip = await prisma.tipoEquipamento.create({
        data: { nome: 'Roteador Teste Gigas', modelo: 'RT-TEST', categoria: 'ROTEADOR', pontos: 1.5 },
      });
    }

    // Gera um número de OS exclusivo para este teste
    const numeroOsTeste = 90000 + Math.floor(Math.random() * 9000);
    console.log(`📋 Ambiente de teste configurado:`);
    console.log(`   - Técnico: ${tecnico.nome} (${tecnico.id})`);
    console.log(`   - Cliente: ${cliente.nomeRazaoSocial} (${cliente.id})`);
    console.log(`   - Tipo Equipamento: ${tipoEquip.nome} (${tipoEquip.id})`);
    console.log(`   - Número OS de Teste: #${numeroOsTeste}\n`);

    // Datas simuladas: Dia 1 (ontem ou data passada) e Dia 2 (hoje)
    const dataDia1 = new Date();
    dataDia1.setDate(dataDia1.getDate() - 1);
    dataDia1.setHours(10, 0, 0, 0);

    const dataDia2 = new Date();
    dataDia2.setHours(14, 0, 0, 0);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Técnico cria OS e aponta 10 equipamentos reparados no Dia 1
    // ─────────────────────────────────────────────────────────────────────────
    const loteDia1 = await producaoService.apontarLoteTecnico(tecnico.id, tecnico.nome, {
      numeroOS: numeroOsTeste,
      clienteId: cliente.id,
      dataEntrada: dataDia1.toISOString(),
      dataProducao: dataDia1.toISOString(),
      prioridade: 'MEDIA',
      observacoes: 'Apontamento Dia 1 - Teste Automatizado',
      modoOperacao: 'SALVAR_BANCADA',
      itens: [
        {
          tipoEquipamentoId: tipoEquip.id,
          quantidade: 10,
          quantidadeTotalCaixa: 10,
          quantidadeReparada: 10,
          quantidadeSemDefeito: 0,
          quantidadeSucata: 0,
          quantidadeRestante: 0,
          tipoCategoria: 'REPARADO',
          defeitoRelatado: 'Defeito teste Dia 1',
          servicoRealizado: 'Troca de capacitores Dia 1',
        },
      ],
    });

    record(
      1,
      'Técnico cria OS e aponta 10 equipamentos reparados no Dia 1',
      loteDia1.ordemServico.numeroOS === numeroOsTeste && loteDia1.itens.length === 1,
      `OS #${loteDia1.ordemServico.numeroOS} criada com sucesso com ${loteDia1.itens[0]?.quantidade} equipamentos apontados.`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Salva a produção -> OS continua em andamento
    // ─────────────────────────────────────────────────────────────────────────
    const osAposDia1 = await prisma.ordemServico.findUnique({
      where: { id: loteDia1.ordemServico.id },
    });

    const osContinuaEmAndamento = osAposDia1?.status === 'EM_PRODUCAO' && osAposDia1.dataConclusao === null;
    record(
      2,
      'Salva a produção -> OS continua em andamento (status = EM_PRODUCAO, dataConclusao = null)',
      Boolean(osContinuaEmAndamento),
      `Status atual: ${osAposDia1?.status} | dataConclusao: ${osAposDia1?.dataConclusao}`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Produção do Dia 1 contabiliza 10 equipamentos
    // ─────────────────────────────────────────────────────────────────────────
    const producoesDia1 = await prisma.producao.findMany({
      where: {
        tecnicoId: tecnico.id,
        itemOrdemServico: { ordemServicoId: loteDia1.ordemServico.id },
      },
    });

    const somaProducaoDia1 = producoesDia1.reduce((acc, p) => acc + (p.quantidadeReparada || p.quantidadeProduzida), 0);
    record(
      3,
      'Produção do Dia 1 contabiliza exatamente 10 equipamentos',
      somaProducaoDia1 === 10,
      `Total apontado no Dia 1: ${somaProducaoDia1} reparados (esperado: 10).`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Acumulado da OS contabiliza 10 equipamentos
    // ─────────────────────────────────────────────────────────────────────────
    const osEmAndamentoAposDia1 = await producaoRepository.getMinhasOsEmAndamento(tecnico.id);
    const osNoAndamentoDia1 = osEmAndamentoAposDia1.find((o) => o.numeroOS === numeroOsTeste);

    const acumuladoDia1Ok =
      osNoAndamentoDia1 !== undefined &&
      osNoAndamentoDia1.totalGeralReparado === 10 &&
      osNoAndamentoDia1.totalGeralEquipamentos === 10;

    record(
      4,
      'Acumulado da OS contabiliza 10 equipamentos',
      Boolean(acumuladoDia1Ok),
      `Acumulado na OS: ${osNoAndamentoDia1?.totalGeralReparado} reparados / ${osNoAndamentoDia1?.totalGeralEquipamentos} total.`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 5. No Dia 2, técnico continua a mesma OS
    // ─────────────────────────────────────────────────────────────────────────
    const loteDia2 = await producaoService.apontarLoteTecnico(tecnico.id, tecnico.nome, {
      numeroOS: numeroOsTeste, // Mesma OS!
      clienteId: cliente.id,
      dataEntrada: dataDia2.toISOString(),
      dataProducao: dataDia2.toISOString(),
      prioridade: 'MEDIA',
      observacoes: 'Apontamento Dia 2 - Continuação da OS',
      modoOperacao: 'SALVAR_BANCADA',
      itens: [
        {
          tipoEquipamentoId: tipoEquip.id,
          quantidade: 8,
          quantidadeTotalCaixa: 18,
          quantidadeReparada: 8,
          quantidadeSemDefeito: 0,
          quantidadeSucata: 0,
          quantidadeRestante: 0,
          tipoCategoria: 'REPARADO',
          defeitoRelatado: 'Defeito teste Dia 2',
          servicoRealizado: 'Troca de fontes Dia 2',
        },
      ],
    });

    record(
      5,
      'No Dia 2, técnico continua a mesma OS passando numeroOS existente',
      loteDia2.ordemServico.id === loteDia1.ordemServico.id,
      `OS resolvida: ID ${loteDia2.ordemServico.id} (idêntico ao ID do Dia 1).`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Sistema não cria nova OS duplicada
    // ─────────────────────────────────────────────────────────────────────────
    const totalOsComNumero = await prisma.ordemServico.count({
      where: { numeroOS: numeroOsTeste },
    });

    const totalItensNaOs = await prisma.itemOrdemServico.count({
      where: { ordemServicoId: loteDia1.ordemServico.id },
    });

    record(
      6,
      'Sistema NÃO cria nova OS duplicada no banco de dados',
      totalOsComNumero === 1 && totalItensNaOs === 1,
      `Total de OSs com número #${numeroOsTeste}: ${totalOsComNumero} (esperado: 1). Itens de OS: ${totalItensNaOs} (reutilizado sem duplicação).`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Técnico aponta mais 8 equipamentos no Dia 2
    // ─────────────────────────────────────────────────────────────────────────
    const apontamentoDia2Ok = loteDia2.producoes && loteDia2.producoes.length > 0 && loteDia2.producoes[0].quantidadeReparada === 8;

    record(
      7,
      'Técnico aponta mais 8 equipamentos no Dia 2',
      Boolean(apontamentoDia2Ok),
      `Novo registro de produção criado com quantidadeReparada = ${loteDia2.producoes[0]?.quantidadeReparada}.`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 8. Produção do Dia 2 contabiliza 8 equipamentos (sem somar com o Dia 1)
    // ─────────────────────────────────────────────────────────────────────────
    // Consulta estrita por data do Dia 2
    const inicioDia2 = new Date(dataDia2);
    inicioDia2.setHours(0, 0, 0, 0);
    const fimDia2 = new Date(dataDia2);
    fimDia2.setHours(23, 59, 59, 999);

    const producoesHoje = await prisma.producao.findMany({
      where: {
        tecnicoId: tecnico.id,
        itemOrdemServico: { ordemServicoId: loteDia1.ordemServico.id },
        dataProducao: { gte: inicioDia2, lte: fimDia2 },
      },
    });

    const somaProducaoDia2 = producoesHoje.reduce((acc, p) => acc + (p.quantidadeReparada || p.quantidadeProduzida), 0);

    record(
      8,
      'Produção do Dia 2 contabiliza 8 equipamentos isoladamente',
      somaProducaoDia2 === 8,
      `Produção isolada do Dia 2: ${somaProducaoDia2} (esperado: 8). O Dia 1 não foi somado na produção do Dia 2.`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 9. Acumulado da OS passa para 18 equipamentos (10 + 8)
    // ─────────────────────────────────────────────────────────────────────────
    const osEmAndamentoAposDia2 = await producaoRepository.getMinhasOsEmAndamento(tecnico.id);
    const osNoAndamentoDia2 = osEmAndamentoAposDia2.find((o) => o.numeroOS === numeroOsTeste);

    const acumuladoFinalOk =
      osNoAndamentoDia2 !== undefined &&
      osNoAndamentoDia2.totalGeralReparado === 18 &&
      osNoAndamentoDia2.totalGeralEquipamentos === 18;

    record(
      9,
      'Acumulado da OS passa para 18 equipamentos (10 Dia 1 + 8 Dia 2 = 18)',
      Boolean(acumuladoFinalOk),
      `Acumulado total da OS: ${osNoAndamentoDia2?.totalGeralReparado} reparadas / ${osNoAndamentoDia2?.totalGeralEquipamentos} total.`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 10. Técnico conclui a OS -> status passa para Concluído com data de conclusão
    // ─────────────────────────────────────────────────────────────────────────
    const osConcluida = await producaoRepository.concluirOrdemServico(
      numeroOsTeste,
      tecnico.id,
      'OS concluída com 18 equipamentos consertados no teste automatizado.'
    );

    const osNoAndamentoAposConclusao = await producaoRepository.getMinhasOsEmAndamento(tecnico.id);
    const aindaEstaEmAndamento = osNoAndamentoAposConclusao.some((o) => o.numeroOS === numeroOsTeste);

    const conclusaoOk =
      osConcluida.status === 'CONCLUIDO' &&
      osConcluida.dataConclusao !== null &&
      !aindaEstaEmAndamento;

    record(
      10,
      'Técnico conclui a OS -> status = CONCLUIDO com dataConclusao preenchida e sai da lista de em andamento',
      Boolean(conclusaoOk),
      `Status: ${osConcluida.status} | dataConclusao: ${osConcluida.dataConclusao?.toISOString()} | Saiu de em andamento: ${!aindaEstaEmAndamento}`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 11. Bônus: Teste de Idempotência (Prevenção de Duplo Clique)
    // ─────────────────────────────────────────────────────────────────────────
    const chaveIdempotencia = `idemp-test-${Date.now()}`;
    const apontamentoIdemp1 = await producaoService.apontarLoteTecnico(tecnico.id, tecnico.nome, {
      clienteId: cliente.id,
      prioridade: 'MEDIA',
      idempotencyKey: chaveIdempotencia,
      modoOperacao: 'SALVAR_BANCADA',
      itens: [
        {
          tipoEquipamentoId: tipoEquip.id,
          quantidade: 5,
          quantidadeTotalCaixa: 5,
          quantidadeReparada: 5,
          quantidadeSemDefeito: 0,
          quantidadeSucata: 0,
          quantidadeRestante: 0,
          tipoCategoria: 'REPARADO',
          defeitoRelatado: 'Idempotency test 1',
          servicoRealizado: 'Teste de duplo clique',
        },
      ],
    });

    // Chamada idêntica simulando clique duplo com a mesma chave:
    const apontamentoIdemp2 = await producaoService.apontarLoteTecnico(tecnico.id, tecnico.nome, {
      clienteId: cliente.id,
      prioridade: 'MEDIA',
      idempotencyKey: chaveIdempotencia,
      modoOperacao: 'SALVAR_BANCADA',
      itens: [
        {
          tipoEquipamentoId: tipoEquip.id,
          quantidade: 5,
          quantidadeTotalCaixa: 5,
          quantidadeReparada: 5,
          quantidadeSemDefeito: 0,
          quantidadeSucata: 0,
          quantidadeRestante: 0,
          tipoCategoria: 'REPARADO',
          defeitoRelatado: 'Idempotency test 2',
          servicoRealizado: 'Teste de duplo clique',
        },
      ],
    });

    const producoesIdemp = await prisma.producao.findMany({
      where: { idempotencyKey: { startsWith: chaveIdempotencia } },
    });

    record(
      11,
      '[BÔNUS] Idempotência / Prevenção de Duplo Clique',
      producoesIdemp.length === 1 && apontamentoIdemp2.ordemServico.id === apontamentoIdemp1.ordemServico.id,
      `Chamadas com a mesma chave geraram exatamente ${producoesIdemp.length} registro no banco (sem duplicatas).`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 12: Despacho da OS inteira para o CQ (AGUARDANDO_TESTE)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- PASSO 12: Despacho da OS inteira para o CQ ---');
    const osDespachada = await producaoRepository.despacharOrdemServicoParaCQ(
      loteDia1.ordemServico.id,
      tecnico.id,
      'Lote pronto para testes funcionais no CQ'
    );

    const osAguardandoTeste = await prisma.ordemServico.findUnique({
      where: { id: loteDia1.ordemServico.id },
      include: { itens: true },
    });

    const todosItensAguardandoTeste = osAguardandoTeste?.itens.every(
      (it) => it.statusItem === 'AGUARDANDO_TESTE'
    );

    record(
      12,
      'Despacho da OS inteira para o Controle de Qualidade (CQ)',
      osAguardandoTeste?.status === 'AGUARDANDO_TESTE' && Boolean(todosItensAguardandoTeste),
      `OS #${osAguardandoTeste?.numeroOS} status: "${osAguardandoTeste?.status}", todos os ${osAguardandoTeste?.itens.length} itens com statusItem: "AGUARDANDO_TESTE".`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 13: Exclusão de OS Errada / Incorreta pelo Técnico
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- PASSO 13: Exclusão de OS Errada pelo Técnico ---');
    // Cria uma OS simulando um erro de digitação do técnico
    const osErradaNum = 99900 + Math.floor(Math.random() * 90);
    const osErradaLote = await producaoService.apontarLoteTecnico(
      tecnico.id,
      tecnico.nome,
      {
        numeroOS: osErradaNum,
        clienteId: cliente.id,
        dataEntrada: new Date().toISOString(),
        dataProducao: new Date().toISOString(),
        prioridade: 'MEDIA',
        observacoes: 'OS aberta por engano',
        modoOperacao: 'SALVAR_BANCADA',
        itens: [
          {
            tipoEquipamentoId: tipoEquip.id,
            quantidade: 2,
            quantidadeTotalCaixa: 2,
            quantidadeReparada: 2,
            quantidadeSemDefeito: 0,
            quantidadeSucata: 0,
            quantidadeRestante: 0,
            tipoCategoria: 'REPARADO',
            defeitoRelatado: 'OS errada',
            servicoRealizado: 'Engano',
          },
        ],
      }
    );

    // Técnico clica em "Excluir OS"
    await producaoRepository.excluirOrdemServico(osErradaLote.ordemServico.id, tecnico.id);

    // Verifica que a OS e seus itens foram completamente eliminados do banco
    const osExcluidaDb = await prisma.ordemServico.findUnique({
      where: { id: osErradaLote.ordemServico.id },
    });
    const itensOrfaos = await prisma.itemOrdemServico.findMany({
      where: { ordemServicoId: osErradaLote.ordemServico.id },
    });

    record(
      13,
      'Exclusão de OS Errada pelo Técnico (Cascade Limpo)',
      osExcluidaDb === null && itensOrfaos.length === 0,
      `OS #${osErradaNum} e todos os seus itens associados foram removidos do banco com sucesso.`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Limpeza de registros de teste
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n🧹 Limpando dados criados durante os testes automatizados...');
    await prisma.producao.deleteMany({
      where: {
        OR: [
          { itemOrdemServico: { ordemServicoId: loteDia1.ordemServico.id } },
          { idempotencyKey: { startsWith: chaveIdempotencia } },
        ],
      },
    });
    await prisma.itemOrdemServico.deleteMany({
      where: {
        OR: [
          { ordemServicoId: loteDia1.ordemServico.id },
          { ordemServicoId: apontamentoIdemp1.ordemServico.id },
        ],
      },
    });
    await prisma.ordemServico.deleteMany({
      where: {
        id: { in: [loteDia1.ordemServico.id, apontamentoIdemp1.ordemServico.id] },
      },
    });
    console.log('   ✅ Limpeza concluída com sucesso.');

    // ─────────────────────────────────────────────────────────────────────────
    // Resumo Final
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n================================================================');
    console.log('📊 RESUMO DA BATERIA DE TESTES AUTOMATIZADOS:');
    console.log('================================================================');
    const totalPassed = results.filter((r) => r.passed).length;
    console.log(`Total de testes: ${results.length}`);
    console.log(`Aprovados: ${totalPassed} / ${results.length}`);

    if (totalPassed === results.length) {
      console.log(`\n🎉 TODOS OS ${results.length} TESTES PASSARAM COM 100% DE SUCESSO! 🎉\n`);
    } else {
      console.error('\n⚠️ ALGUNS TESTES FALHARAM! Verifique os detalhes acima.\n');
    }
  } catch (err: any) {
    console.error('❌ Erro fatal durante a execução dos testes:', err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

runFluxoOsTestSuite();
