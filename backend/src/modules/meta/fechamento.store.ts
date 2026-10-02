import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface FechamentoTecnico {
  tecnicoId: string;
  tecnicoNome: string;
  funcao: string;
  pontos: number;
  reparados: number;
  semDefeito: number;
  sucata: number;
  retrabalhos: number;
  testados?: number;
  aprovados?: number;
  reprovados?: number;
  pesoBonus?: number;
  metaIndividualCumprida?: boolean;
}

export interface FechamentoMensal {
  mesReferencia: number;
  anoReferencia: number;
  pontosTotais: number;
  metaBase: number;
  metaAlvo: number;
  metaExcelencia: number;
  statusMeta: 'META_EXCELENCIA' | 'META_ALVO' | 'META_BASE' | 'ABAIXO_DA_META';
  statusMetaLabel: string;
  totalReparadas: number;
  totalSucata: number;
  totalSemDefeito: number;
  totalRetrabalho: number;
  totalLancamentos: number;
  faturamentoLancado: number;
  faturamentoRecebido: number;
  taxaRetrabalho: number;
  fpyGeral: number;
  leadTimeMedioGeralMinutos: number;
  tecnicos: FechamentoTecnico[];
  fechadoEm: string;
  fechadoPor?: string;
  observacoes?: string;
}

// ─── Dados Oficiais e Históricos Homologados (ex: Setembro de 2026) ───────────
const FECHAMENTOS_INICIAIS: Record<string, FechamentoMensal> = {
  '2026-09': {
    mesReferencia: 9,
    anoReferencia: 2026,
    pontosTotais: 512.5,
    metaBase: 250,
    metaAlvo: 300,
    metaExcelencia: 350,
    statusMeta: 'META_EXCELENCIA',
    statusMetaLabel: '🏆 META EXCELÊNCIA',
    totalReparadas: 772,
    totalSucata: 94,
    totalSemDefeito: 5,
    totalRetrabalho: 45,
    totalLancamentos: 116,
    faturamentoLancado: 0.0,
    faturamentoRecebido: 0.0,
    taxaRetrabalho: 5.8,
    fpyGeral: 94.5,
    leadTimeMedioGeralMinutos: 38,
    fechadoEm: '2026-09-30T23:59:59.000Z',
    fechadoPor: 'Administrador Renetec',
    observacoes: 'Fechamento oficial de Setembro/2026 homologado pela gestão.',
    tecnicos: [
      {
        tecnicoId: '11e5d47e-ceb5-4b75-ba60-632e9bcfcf8d',
        tecnicoNome: 'Samuel',
        funcao: 'Produção',
        pontos: 263.5,
        reparados: 406,
        sucata: 56,
        semDefeito: 2,
        retrabalhos: 25,
        testados: 0,
        aprovados: 0,
        reprovados: 0,
        pesoBonus: 0.22,
        metaIndividualCumprida: true,
      },
      {
        tecnicoId: '18a20cb3-c16d-4901-95fa-5dfcc0ffbab6',
        tecnicoNome: 'João',
        funcao: 'Produção',
        pontos: 108.0,
        reparados: 185,
        sucata: 12,
        semDefeito: 2,
        retrabalhos: 8,
        testados: 0,
        aprovados: 0,
        reprovados: 0,
        pesoBonus: 0.22,
        metaIndividualCumprida: true,
      },
      {
        tecnicoId: '69f46d06-4e1e-4aa1-84bd-d38a17864d2e',
        tecnicoNome: 'Joás',
        funcao: 'Produção',
        pontos: 141.0,
        reparados: 181,
        sucata: 26,
        semDefeito: 1,
        retrabalhos: 12,
        testados: 0,
        aprovados: 0,
        reprovados: 0,
        pesoBonus: 0.22,
        metaIndividualCumprida: true,
      },
      {
        tecnicoId: '7037cdc1-1819-4cb8-ba10-75042d7f4fab',
        tecnicoNome: 'Rhyan',
        funcao: 'Qualidade/Testes',
        pontos: 512.5,
        reparados: 0,
        sucata: 0,
        semDefeito: 0,
        retrabalhos: 0,
        testados: 270,
        aprovados: 229,
        reprovados: 37,
        pesoBonus: 0.17,
        metaIndividualCumprida: true,
      },
      {
        tecnicoId: 'cee48493-d9cf-4a3d-9b32-94d8475d3bbb',
        tecnicoNome: 'Luana',
        funcao: 'Atendimento/Comercial',
        pontos: 0.0,
        reparados: 0,
        sucata: 0,
        semDefeito: 0,
        retrabalhos: 0,
        testados: 0,
        aprovados: 0,
        reprovados: 0,
        pesoBonus: 0.17,
        metaIndividualCumprida: true,
      },
      {
        tecnicoId: '98a08c37-f016-4ea9-ad16-fc35d0d40980',
        tecnicoNome: 'Controle de Qualidade',
        funcao: 'Qualidade/Testes',
        pontos: 0.0,
        reparados: 0,
        sucata: 0,
        semDefeito: 0,
        retrabalhos: 0,
        testados: 0,
        aprovados: 0,
        reprovados: 0,
        pesoBonus: 0.0,
        metaIndividualCumprida: true,
      },
    ],
  },
};

// Caminho de persistência em disco fixo em backend/src/database/fechamentos_historicos.json
function getStorageFilePath(): string {
  const cwd = process.cwd();
  if (cwd.endsWith('backend')) {
    return path.resolve(cwd, 'src/database/fechamentos_historicos.json');
  }
  return path.resolve(cwd, 'backend/src/database/fechamentos_historicos.json');
}

const STORAGE_FILE = getStorageFilePath();

function carregarFechamentos(): Record<string, FechamentoMensal> {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...FECHAMENTOS_INICIAIS, ...parsed };
    }
  } catch (err) {
    console.error('[FechamentoStore] Erro ao carregar arquivo de fechamentos:', err);
  }
  return { ...FECHAMENTOS_INICIAIS };
}

function salvarEmDisco(fechamentos: Record<string, FechamentoMensal>): void {
  try {
    const dir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(fechamentos, null, 2), 'utf-8');
  } catch (err) {
    console.error('[FechamentoStore] Erro ao salvar fechamentos em disco:', err);
  }
}

// Inicializa o arquivo se ainda não existir
if (!fs.existsSync(STORAGE_FILE)) {
  salvarEmDisco(FECHAMENTOS_INICIAIS);
}

export function getFechamentoMensalOficial(mes: number, ano: number): FechamentoMensal | null {
  const chave = `${ano}-${String(mes).padStart(2, '0')}`;
  const todos = carregarFechamentos();
  return todos[chave] || null;
}

export const getFechamentoMensal = getFechamentoMensalOficial;

export function salvarFechamentoMensalOficial(fechamento: FechamentoMensal): void {
  const chave = `${fechamento.anoReferencia}-${String(fechamento.mesReferencia).padStart(2, '0')}`;
  const todos = carregarFechamentos();
  todos[chave] = fechamento;
  salvarEmDisco(todos);
}

export const salvarFechamentoMensal = salvarFechamentoMensalOficial;

export function getChavesMesesFechados(): string[] {
  const todos = carregarFechamentos();
  return Object.keys(todos).sort().reverse();
}
