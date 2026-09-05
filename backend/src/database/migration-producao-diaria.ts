import { prisma } from './prisma.js';

export async function migrateExistingProducoes() {
  console.log('🔄 Iniciando migração segura de dados legados em producoes...');
  try {
    const producoes = await prisma.producao.findMany({
      where: {
        AND: [
          { quantidadeReparada: 0 },
          { quantidadeSemDefeito: 0 },
          { quantidadeSucata: 0 },
        ],
      },
      include: {
        itemOrdemServico: true,
      },
    });

    console.log(`📊 Encontradas ${producoes.length} produções para verificar e migrar...`);

    let atualizadas = 0;

    for (const p of producoes) {
      const texto = `${p.observacao || ''} ${p.servicoRealizado || ''} ${p.itemOrdemServico?.defeitoRelatado || ''}`.toLowerCase();
      let rep = 0;
      let semDef = 0;
      let suc = 0;

      const isSemDefeitoTotal =
        texto.includes('categoria: sem_defeito') ||
        texto.includes('sem defeito aparente') ||
        (p.itemOrdemServico?.defeitoRelatado || '').toLowerCase().startsWith('sem defeito');

      // Tenta regex "Hoje: X rep, Y sem def, Z sucata"
      const matchHoje = texto.match(/hoje:\s*(\d+)\s*rep.*?(\d+)\s*sem\s*def.*?(\d+)\s*suc/i);
      if (matchHoje) {
        rep = parseInt(matchHoje[1]) || 0;
        semDef = parseInt(matchHoje[2]) || 0;
        suc = parseInt(matchHoje[3]) || 0;
      } else {
        // Tenta outros padrões
        const matchRep = texto.match(/reparadas?:\s*(\d+)/i) || texto.match(/(\d+)\s*reparadas?/i) || texto.match(/(\d+)\s*rep/i);
        const matchSuc = texto.match(/sucata:\s*(\d+)/i) || texto.match(/(\d+)\s*sucata/i);
        const matchSemDef = texto.match(/sem defeito:\s*(\d+)/i) || texto.match(/(\d+)\s*sem def/i);

        if (isSemDefeitoTotal) {
          semDef = matchSemDef ? parseInt(matchSemDef[1]) : (p.quantidadeProduzida || 1);
          rep = 0;
        } else {
          rep = matchRep ? parseInt(matchRep[1]) : (p.quantidadeProduzida || 1);
          semDef = matchSemDef ? parseInt(matchSemDef[1]) : 0;
        }
        suc = matchSuc ? parseInt(matchSuc[1]) : 0;
      }

      // Se tudo ficou zero mas havia quantidadeProduzida
      if (rep === 0 && semDef === 0 && suc === 0 && p.quantidadeProduzida > 0) {
        if (isSemDefeitoTotal) {
          semDef = p.quantidadeProduzida;
        } else {
          rep = p.quantidadeProduzida;
        }
      }

      const dataProd = p.dataFim || p.dataInicio || p.createdAt;

      await prisma.producao.update({
        where: { id: p.id },
        data: {
          quantidadeReparada: rep,
          quantidadeSemDefeito: semDef,
          quantidadeSucata: suc,
          dataProducao: dataProd,
        },
      });

      atualizadas++;
    }

    console.log(`✅ Migração concluída: ${atualizadas} produções atualizadas com dados tipados!`);
  } catch (err) {
    console.error('❌ Erro na migração de producoes:', err);
  }
}

// Executar se chamado diretamente
if (process.argv[1]?.endsWith('migration-producao-diaria.ts') || process.argv[1]?.endsWith('migration-producao-diaria.js')) {
  migrateExistingProducoes().then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
