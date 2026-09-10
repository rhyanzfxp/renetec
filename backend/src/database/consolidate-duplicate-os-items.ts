import 'dotenv/config';
import { PrismaClient, StatusOS } from '@prisma/client';

const prisma = new PrismaClient();
const applyChanges = process.argv.includes('--apply');

const statusPrioridade: StatusOS[] = [
  'RETRABALHO',
  'AGUARDANDO_NOVO_TESTE',
  'AGUARDANDO_TESTE',
  'EM_PRODUCAO',
  'AGUARDANDO_PRODUCAO',
  'RECEBIDO',
  'AGUARDANDO_PECA',
  'AGUARDANDO_CLIENTE',
  'REPROVADO',
  'APROVADO',
  'SEM_REPARO',
  'CONCLUIDO',
  'CANCELADO',
];

function statusConsolidado(statuses: StatusOS[]): StatusOS {
  return statusPrioridade.find((status) => statuses.includes(status)) || statuses[0] || 'RECEBIDO';
}

async function main() {
  const itens = await prisma.itemOrdemServico.findMany({
    include: {
      ordemServico: { select: { numeroOS: true } },
      tipoEquipamento: { select: { nome: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const grupos = new Map<string, typeof itens>();
  for (const item of itens) {
    // Um mesmo equipamento pode coexistir em etapas diferentes (por exemplo,
    // parte aguardando CQ e parte em retrabalho). Essas etapas são necessárias
    // para a operação e não devem ser achatadas em uma linha só.
    const key = `${item.ordemServicoId}:${item.tipoEquipamentoId}:${item.statusItem}`;
    grupos.set(key, [...(grupos.get(key) || []), item]);
  }

  const duplicados = [...grupos.values()].filter((grupo) => grupo.length > 1);
  const resumo = duplicados.map((grupo) => ({
    numeroOS: grupo[0].ordemServico.numeroOS,
    equipamento: grupo[0].tipoEquipamento.nome,
    itens: grupo.length,
    quantidadeAtual: grupo.reduce((total, item) => total + item.quantidade, 0),
    status: grupo[0].statusItem,
  }));

  console.log(JSON.stringify({ modo: applyChanges ? 'APLICAR' : 'SIMULACAO', grupos: resumo }, null, 2));

  if (!applyChanges) {
    console.log('\nSimulação concluída. Rode novamente com --apply para consolidar esses grupos.');
    return;
  }

  for (const grupo of duplicados) {
    const [principal, ...repetidos] = grupo;
    const idsRepetidos = repetidos.map((item) => item.id);
    const statusFinal = statusConsolidado(grupo.map((item) => item.statusItem));
    const quantidadeFinal = grupo.reduce((total, item) => total + item.quantidade, 0);

    await prisma.$transaction(async (tx) => {
      await tx.producao.updateMany({
        where: { itemOrdemServicoId: { in: idsRepetidos } },
        data: { itemOrdemServicoId: principal.id },
      });
      await tx.retrabalho.updateMany({
        where: { itemOrdemServicoId: { in: idsRepetidos } },
        data: { itemOrdemServicoId: principal.id },
      });
      await tx.historicoStatus.updateMany({
        where: { itemOrdemServicoId: { in: idsRepetidos } },
        data: { itemOrdemServicoId: principal.id },
      });

      await tx.itemOrdemServico.update({
        where: { id: principal.id },
        data: {
          quantidade: quantidadeFinal,
          statusItem: statusFinal,
          tecnicoAlocadoId: principal.tecnicoAlocadoId || grupo.find((item) => item.tecnicoAlocadoId)?.tecnicoAlocadoId || null,
          defeitoRelatado: principal.defeitoRelatado || grupo.find((item) => item.defeitoRelatado)?.defeitoRelatado || null,
        },
      });
      await tx.itemOrdemServico.deleteMany({ where: { id: { in: idsRepetidos } } });

      await tx.auditoriaLog.create({
        data: {
          entidade: 'ItemOrdemServico',
          registroId: principal.id,
          acao: 'CONSOLIDACAO_ITENS_OS',
          dadosAnteriores: {
            itemIds: grupo.map((item) => item.id),
            quantidade: grupo.map((item) => item.quantidade),
            status: grupo.map((item) => item.statusItem),
          },
          dadosNovos: {
            numeroOS: principal.ordemServico.numeroOS,
            equipamento: principal.tipoEquipamento.nome,
            quantidade: quantidadeFinal,
            status: statusFinal,
          },
        },
      });
    });
  }

  console.log(`\nConsolidação concluída: ${duplicados.length} grupo(s) de itens foram unificados sem remover apontamentos, testes ou retrabalhos.`);
}

main()
  .catch((error) => {
    console.error('Falha na consolidação de itens duplicados:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
