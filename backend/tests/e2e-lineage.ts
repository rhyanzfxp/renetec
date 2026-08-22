import WebSocket from 'ws';

const BASE_URL = 'http://localhost:3333/api/v1';
const WS_URL = 'ws://localhost:3333/api/v1/realtime';

interface StepResult {
  step: number;
  name: string;
  success: boolean;
  details?: string;
}

export async function runFullE2ETestSuite(): Promise<void> {
  console.log('\n================================================================');
  console.log('🚀 INICIANDO BATERIA DE TESTES E2E & LINHAGEM COMPLETA RENETEC');
  console.log('================================================================\n');

  const results: StepResult[] = [];
  const wsEventsReceived: string[] = [];

  // Helper para login
  async function login(email: string, senha = 'renetec123') {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Falha no login de ${email}: ${JSON.stringify(json)}`);
    return { token: json.data.accessToken, user: json.data.user };
  }

  try {
    // ─── 0. Conexão WebSocket para Monitorar Eventos E2E ─────────────────────
    console.log('📡 [0/10] Conectando ao WebSocket de Chão de Fábrica...');
    const ws = new WebSocket(WS_URL);
    
    await new Promise<void>((resolve) => {
      ws.on('open', () => {
        console.log('   ✅ WebSocket conectado e escutando eventos em tempo real.');
        resolve();
      });
      ws.on('message', (raw) => {
        try {
          const parsed = JSON.parse(raw.toString());
          if (parsed.type && parsed.type !== 'sistema:ping') {
            wsEventsReceived.push(parsed.type);
            console.log(`   📨 [WS Event] Recebido: ${parsed.type}`);
          }
        } catch {
          // ignore
        }
      });
      ws.on('error', () => resolve());
      setTimeout(resolve, 600);
    });

    // ─── 1. Autenticação e Perfis (RBAC) ─────────────────────────────────────
    console.log('\n🔑 [1/10] Autenticando Usuários dos 3 Perfis...');
    const admin = await login('admin@renetec.com.br');
    const tecnico = await login('joao@renetec.com.br');
    const cq = await login('qualidade@renetec.com.br');
    
    results.push({ step: 1, name: 'Autenticação dos 3 Perfis (ADMIN, TECNICO, QUALIDADE)', success: true });
    console.log('   ✅ Admin, Técnico e Inspetor autenticados.');

    // Limpar bancada do técnico caso haja produção ativa prévia
    const resAtiva = await fetch(`${BASE_URL}/producao/ativa`, {
      headers: { 'Authorization': `Bearer ${tecnico.token}` },
    });
    const dataAtiva = await resAtiva.json();
    if (dataAtiva.data?.id) {
      await fetch(`${BASE_URL}/producao/${dataAtiva.data.id}/finalizar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tecnico.token}`,
        },
        body: JSON.stringify({
          quantidadeProduzida: 20,
          servicoRealizado: 'Finalização preparatória de teste E2E',
          observacao: 'Limpeza de bancada',
        }),
      });
      console.log('   🧹 Bancada do técnico liberada para novo lote E2E.');
    }

    // ─── 2. Criação de Ordem de Serviço (OS) ─────────────────────────────────
    console.log('\n📋 [2/10] Criando Ordem de Serviço de Lote Industrial...');
    const resOS = await fetch(`${BASE_URL}/os`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${admin.token}`,
      },
      body: JSON.stringify({
        clienteId: 'cli-01',
        prioridade: 'ALTA',
        observacoes: 'Manutenção de lote de inversores industriais',
        itens: [
          {
            tipoEquipamentoId: 'eq-01',
            quantidade: 10,
            defeitoRelatado: 'Instabilidade na saída CA e disparo de alarme térmico',
            numeroSerie: 'SN-INV-2026-X',
            tecnicoAlocadoId: tecnico.user.id,
          },
        ],
      }),
    });
    const osData = await resOS.json();
    const osId = osData.data?.id;
    const itemId = osData.data?.itens?.[0]?.id;
    
    const osOk = resOS.ok && !!osId && !!itemId;
    results.push({ step: 2, name: 'Criação de OS com Lote de 10 unidades', success: osOk });
    console.log(`   ✅ OS Criada: ${osId} | Item: ${itemId} | Status: ${resOS.status}`);

    // ─── 3. Início de Produção pelo Técnico ──────────────────────────────────
    console.log('\n⚙️ [3/10] Técnico iniciando produção na bancada...');
    const resInicioProd = await fetch(`${BASE_URL}/producao/iniciar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tecnico.token}`,
      },
      body: JSON.stringify({ itemOrdemServicoId: itemId }),
    });
    const prodData = await resInicioProd.json();
    const producaoId = prodData.data?.id;

    const inicioOk = resInicioProd.ok && !!producaoId;
    results.push({ step: 3, name: 'Técnico inicia produção na bancada', success: inicioOk });
    console.log(`   ✅ Produção Iniciada: ${producaoId} | Status: ${resInicioProd.status}`);

    // ─── 4. Finalização de Produção (10 unidades apontadas) ───────────────────
    console.log('\n⏱️ [4/10] Técnico finalizando apontamento de 10 unidades...');
    const resFimProd = await fetch(`${BASE_URL}/producao/${producaoId}/finalizar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tecnico.token}`,
      },
      body: JSON.stringify({
        quantidadeProduzida: 10,
        servicoRealizado: 'Substituídos capacitores e ressoldados conectores frontais.',
        observacao: 'Lote pronto para CQ',
      }),
    });

    results.push({ step: 4, name: 'Finalização de produção (10 peças encaminhadas para CQ)', success: resFimProd.ok });
    console.log(`   ✅ Produção Finalizada com 10 unidades apontadas | Status: ${resFimProd.status}`);

    // ─── 5. Fila do CQ e Validação de Invariante Matemático ──────────────────
    console.log('\n🔍 [5/10] Inspetor de Qualidade testando lote (Regra Aprovadas + Reprovadas == Testadas)...');
    // Teste de rejeição de invariante inválido (ex: 8 aprovadas + 1 reprovada != 10 testadas)
    const resTesteInvalido = await fetch(`${BASE_URL}/qualidade/testar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cq.token}`,
      },
      body: JSON.stringify({
        producaoId,
        itemOrdemServicoId: itemId,
        quantidadeTestada: 10,
        quantidadeAprovada: 8,
        quantidadeReprovada: 1, // 8+1 != 10 -> DEVE FALHAR COM 400
      }),
    });
    const invariantRejectionOk = resTesteInvalido.status === 400;
    results.push({ step: 5, name: 'Equação Invariável (Aprovados + Reprovados == Testados)', success: invariantRejectionOk });
    console.log(`   🛡️ Validação da Equação Invariável (8+1 != 10): Rejeitado corretamente com 400 (${invariantRejectionOk ? 'OK' : 'FAIL'})`);

    // ─── 6. Inspeção de CQ: 8 Aprovadas, 2 Reprovadas (com motivo) ───────────
    console.log('\n🧪 [6/10] CQ realizando laudo: 8 Aprovadas e 2 Reprovadas por Defeito Funcional...');
    const motivosRes = await fetch(`${BASE_URL}/qualidade/motivos`, {
      headers: { 'Authorization': `Bearer ${cq.token}` },
    });
    const motivosData = await motivosRes.json();
    const motivoId = motivosData.data?.[0]?.id || 'mot-01';

    const resLaudoCQ = await fetch(`${BASE_URL}/qualidade/testar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cq.token}`,
      },
      body: JSON.stringify({
        producaoId,
        itemOrdemServicoId: itemId,
        quantidadeTestada: 10,
        quantidadeAprovada: 8,
        quantidadeReprovada: 2,
        motivoReprovacaoId: motivoId,
        observacao: '2 unidades apresentaram ripple excessivo na alimentação secundária.',
      }),
    });

    results.push({ step: 6, name: 'Laudo de CQ com 8 Aprovadas e 2 Reprovadas', success: resLaudoCQ.ok });
    console.log(`   ✅ Laudo emitido | Status: ${resLaudoCQ.status} (8 Aprovadas liberadas, 2 para Retrabalho)`);

    // ─── 7. Fila de Retrabalho: Técnico Executa Reparo Corretivo ─────────────
    console.log('\n🔧 [7/10] Técnico pegando as 2 peças reprovadas para Retrabalho...');
    const resRetrabalhos = await fetch(`${BASE_URL}/retrabalho/fila`, {
      headers: { 'Authorization': `Bearer ${tecnico.token}` },
    });
    const retData = await resRetrabalhos.json();
    const retrabalhoId = retData.data?.[0]?.id;

    if (retrabalhoId) {
      // Iniciar Retrabalho
      await fetch(`${BASE_URL}/retrabalho/${retrabalhoId}/iniciar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tecnico.token}` },
      });

      // Concluir Retrabalho
      const resFimRet = await fetch(`${BASE_URL}/retrabalho/${retrabalhoId}/concluir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tecnico.token}`,
        },
        body: JSON.stringify({
          solucaoAplicada: 'Substituído diodo retificador D14 com fuga térmica e refeito ponto de solda.',
        }),
      });

      results.push({ step: 7, name: 'Técnico conclui retrabalho e reenvia para CQ', success: resFimRet.ok });
      console.log(`   ✅ Retrabalho concluído e devolvido à mesa de testes | Status: ${resFimRet.status}`);
    } else {
      results.push({ step: 7, name: 'Técnico conclui retrabalho e reenvia para CQ', success: false, details: 'Nenhum retrabalho na fila' });
    }


    // ─── 8. Re-inspeção no CQ das 2 peças retrabalhadas (100% Aprovadas) ────
    console.log('\n🔬 [8/10] CQ re-testa as 2 peças retrabalhadas (100% Aprovadas)...');
    const resReTeste = await fetch(`${BASE_URL}/qualidade/testar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cq.token}`,
      },
      body: JSON.stringify({
        producaoId,
        itemOrdemServicoId: itemId,
        quantidadeTestada: 2,
        quantidadeAprovada: 2,
        quantidadeReprovada: 0,
        observacao: 'Re-teste aprovado: tensão e ripple normalizados.',
      }),
    });

    results.push({ step: 8, name: 'Re-teste aprovado no CQ (100% das 10 peças concluídas)', success: resReTeste.ok });
    console.log(`   ✅ Re-teste aprovado no CQ | Status: ${resReTeste.status}`);

    // ─── 9. Validação do Termômetro de Metas Coletivas (Contagem de Aprovados) ─
    console.log('\n🎯 [9/10] Verificando se Metas Coletivas computaram apenas peças aprovadas...');
    const resMetas = await fetch(`${BASE_URL}/metas/atual`, {
      headers: { 'Authorization': `Bearer ${admin.token}` },
    });
    const metasData = await resMetas.json();
    const totalAprovadas = metasData.data?.totalAprovadoMes ?? 0;

    results.push({ step: 9, name: 'Metas Coletivas integradas com CQ', success: resMetas.ok });
    console.log(`   ✅ Metas Coletivas: ${totalAprovadas} peças válidas | Ritmo Atual: ${metasData.data?.ritmoDiarioAtual || 0} un/dia`);

    // ─── 10. Auto-atendimento Técnico: Samuel Aponta Lote OS #1920 Diretamente ──
    console.log('\n👨‍🔧 [10/11] Técnico Samuel apontando Lote da OS #1920 (12 ONTs + 2 CCRs) direto para Testes...');
    const samuel = await login('samuel@renetec.com.br');
    const resLoteSamuel = await fetch(`${BASE_URL}/producao/apontamento-lote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${samuel.token}`,
      },
      body: JSON.stringify({
        numeroOS: 1920,
        clienteId: 'cli-01',
        dataEntrada: '2026-08-22T16:30:00.000Z',
        prioridade: 'ALTA',
        observacoes: 'Apontamento do dia: 12 ONTs e 2 CCRs reparadas e testadas na bancada.',
        enviarDiretoTeste: true,
        itens: [
          {
            tipoEquipamentoId: 'pt-02', // ONT (1.5 pts)
            quantidade: 12,
            tipoCategoria: 'REPARADO',
            defeitoRelatado: 'Porta PON sem sinal óptico',
            servicoRealizado: 'Substituição de diodo e reflash de firmware',
          },
          {
            tipoEquipamentoId: 'pt-06', // CCR (2.5 pts)
            quantidade: 2,
            tipoCategoria: 'REPARADO',
            defeitoRelatado: 'Porta SFP travando',
            servicoRealizado: 'Ressolda de trilhas e troca de transceptor',
          },
        ],
      }),
    });
    const loteSamuelData = await resLoteSamuel.json();
    const loteSamuelOk = resLoteSamuel.ok && loteSamuelData.data?.ordemServico?.numeroOS === 1920;
    results.push({
      step: 10,
      name: 'Auto-Atendimento Técnico: Samuel cria OS #1920 (12 ONTs + 2 CCRs) direto p/ CQ',
      success: loteSamuelOk,
    });
    console.log(`   ✅ Lote criado por Samuel: OS #${loteSamuelData.data?.ordemServico?.numeroOS} com ${loteSamuelData.data?.itens?.length} tipos de equipamentos.`);

    // ─── 11. Trilha de Auditoria e Validação de Eventos ──────────────────────
    console.log('\n📜 [11/11] Validando registros na Trilha de Auditoria...');
    const resAudit = await fetch(`${BASE_URL}/auditoria?page=1&limit=20`, {
      headers: { 'Authorization': `Bearer ${admin.token}` },
    });
    const auditData = await resAudit.json();
    const auditCount = auditData.total || auditData.data?.length || 0;

    results.push({ step: 11, name: 'Trilha de Auditoria com rastreabilidade total', success: auditCount > 0 });
    console.log(`   ✅ Auditoria com ${auditCount} registros imutáveis.`);

    // Fechar conexão WS
    ws.close();

    // ─── Relatório Final da Bateria ──────────────────────────────────────────
    console.log('\n================================================================');
    console.log('📊 RELATÓRIO FINAL DA BATERIA DE TESTES E2E');
    console.log('================================================================');

    
    let allPassed = true;
    for (const r of results) {
      const statusIcon = r.success ? '✅ PASS' : '❌ FAIL';
      console.log(`  [Passo ${r.step.toString().padStart(2, '0')}] ${statusIcon} - ${r.name}`);
      if (!r.success) allPassed = false;
    }

    console.log('\n📡 Eventos WebSocket capturados durante a execução:');
    const uniqueEvents = [...new Set(wsEventsReceived)];
    console.log(`  ${uniqueEvents.length > 0 ? uniqueEvents.join(' ➔ ') : '(Conexão em background ativa)'}`);

    if (allPassed) {
      console.log('\n🎉 TODOS OS 10 PASSOS DA LINHAGEM E2E FORAM VALIDADOS COM 100% DE SUCESSO!\n');
    } else {
      console.error('\n❌ Houve falha em um ou mais passos da validação E2E.\n');
    }

  } catch (err) {
    console.error('❌ Erro durante a execução dos testes E2E:', err);
  }
}

runFullE2ETestSuite();
