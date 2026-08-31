import React, { useState } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { metaApiService } from './meta.service';
import type { MetaAtualData } from './meta.types';
import { Settings2, AlertTriangle, Sparkles } from 'lucide-react';

interface ConfigMetaModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: MetaAtualData;
  onSuccess: () => void;
}

export const ConfigMetaModal: React.FC<ConfigMetaModalProps> = ({
  isOpen,
  onClose,
  currentData,
  onSuccess,
}) => {
  const [base, setBase] = useState(String(currentData.metaBase || 250));
  const [alvo, setAlvo] = useState(String(currentData.metaAlvo || 300));
  const [excelencia, setExcelencia] = useState(String(currentData.metaExcelencia || 350));
  const [isPiloto, setIsPiloto] = useState(Boolean(currentData.isPeriodoPiloto));
  const [pilotoMinima, setPilotoMinima] = useState('160');
  const [pilotoAlvo, setPilotoAlvo] = useState('190');
  const [pilotoExcelencia, setPilotoExcelencia] = useState('220');
  const [retrabalhoMaximo, setRetrabalhoMaximo] = useState(String(currentData.limiteRetrabalhoPct || 5));
  const [fundoBonusPct, setFundoBonusPct] = useState(String(Number(((currentData.percentualFundoBonus || 0.015) * 100).toFixed(1))));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && currentData) {
      setBase(String(currentData.metaBase || 250));
      setAlvo(String(currentData.metaAlvo || 300));
      setExcelencia(String(currentData.metaExcelencia || 350));
      setIsPiloto(Boolean(currentData.isPeriodoPiloto));
      setRetrabalhoMaximo(String(currentData.limiteRetrabalhoPct || 5));
      setFundoBonusPct(String(Number(((currentData.percentualFundoBonus || 0.015) * 100).toFixed(1))));
      setErrorMessage(null);
    }
  }, [isOpen, currentData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nBase = parseInt(base.replace(/\D/g, '')) || 0;
    const nAlvo = parseInt(alvo.replace(/\D/g, '')) || 0;
    const nExcelencia = parseInt(excelencia.replace(/\D/g, '')) || 0;
    const nPilotoMin = parseInt(pilotoMinima.replace(/\D/g, '')) || 0;
    const nPilotoAlvo = parseInt(pilotoAlvo.replace(/\D/g, '')) || 0;
    const nPilotoExc = parseInt(pilotoExcelencia.replace(/\D/g, '')) || 0;
    const nRetrabalho = parseFloat(retrabalhoMaximo.replace(',', '.')) || 0;
    const nFundoBonus = parseFloat(fundoBonusPct.replace(',', '.')) || 0;

    if (!isPiloto && (nBase >= nAlvo || nAlvo >= nExcelencia)) {
      setErrorMessage('A hierarquia de metas regulares deve obedecer: Base < Alvo < Excelência.');
      return;
    }
    if (isPiloto && (nPilotoMin >= nPilotoAlvo || nPilotoAlvo >= nPilotoExc)) {
      setErrorMessage('A hierarquia do período piloto deve obedecer: Mínima < Alvo < Excelência.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await metaApiService.updateConfig({
        metaBase: nBase,
        metaAlvo: nAlvo,
        metaExcelencia: nExcelencia,
        isPeriodoPiloto: isPiloto,
        metaPilotoMinima: nPilotoMin,
        metaPilotoAlvo: nPilotoAlvo,
        metaPilotoExcelencia: nPilotoExc,
        retrabalhoMaximo: nRetrabalho / 100,
        percentualFundoBonus: nFundoBonus / 100,
        mesReferencia: currentData.mesReferencia,
        anoReferencia: currentData.anoReferencia,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(e.response?.data?.message || 'Falha ao atualizar parâmetros de metas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Configurar Metas & Regras Oficiais"
      subtitle={`Parâmetros de ${currentData.nomeMes} / ${currentData.anoReferencia}`}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            leftIcon={<Settings2 className="w-4 h-4" />}
          >
            Salvar Parâmetros
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 flex items-center gap-2 text-xs text-red-300">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Toggle Período Piloto */}
        <div className="p-3.5 rounded-xl bg-surface-elevated border border-surface-border space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Período Piloto (12/08 a 31/08)
              </span>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Ajusta as faixas de metas para o período proporcional de agosto.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPiloto}
                onChange={(e) => setIsPiloto(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-base peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </div>

        {isPiloto ? (
          /* Metas do Período Piloto */
          <div className="space-y-3 p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Faixas do Período Piloto (Pontos)
            </h4>
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-semibold text-amber-200">
                  Meta Piloto Mínima (Pontos)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={pilotoMinima}
                  onChange={(e) => setPilotoMinima(e.target.value.replace(/\D/g, ''))}
                  placeholder="160"
                  className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 tabular-nums font-bold mt-1"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-emerald-200">
                  Meta Piloto Alvo (Pontos)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={pilotoAlvo}
                  onChange={(e) => setPilotoAlvo(e.target.value.replace(/\D/g, ''))}
                  placeholder="190"
                  className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 tabular-nums font-bold mt-1"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-yellow-200">
                  Meta Piloto Excelência (Pontos)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={pilotoExcelencia}
                  onChange={(e) => setPilotoExcelencia(e.target.value.replace(/\D/g, ''))}
                  placeholder="220"
                  className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 tabular-nums font-bold mt-1"
                  required
                />
              </div>
            </div>
          </div>
        ) : (
          /* Metas Oficiais Regulares */
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-amber-300">
                Meta Base (Pontos) — Sem bônus coletivo
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={base}
                onChange={(e) => setBase(e.target.value.replace(/\D/g, ''))}
                placeholder="250"
                className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 tabular-nums font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-emerald-300">
                Meta Alvo (Pontos) — 100% do bônus coletivo
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={alvo}
                onChange={(e) => setAlvo(e.target.value.replace(/\D/g, ''))}
                placeholder="300"
                className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 tabular-nums font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-yellow-400">
                Meta Excelência (Pontos) — 125% do bônus coletivo (Teto)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={excelencia}
                onChange={(e) => setExcelencia(e.target.value.replace(/\D/g, ''))}
                placeholder="350"
                className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 tabular-nums font-bold"
                required
              />
            </div>
          </div>
        )}

        {/* Parâmetros de Qualidade & Bônus */}
        <div className="space-y-3 pt-2 border-t border-surface-border/60">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-300">
                Retrabalho Máximo (%)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={retrabalhoMaximo}
                onChange={(e) => setRetrabalhoMaximo(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="5.0"
                className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 tabular-nums"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-300">
                Fundo de Bônus (% Faturamento)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={fundoBonusPct}
                onChange={(e) => setFundoBonusPct(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="1.5"
                className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 tabular-nums"
                required
              />
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-surface-elevated border border-surface-border/60 text-xs text-gray-300 space-y-1">
          <p className="font-semibold text-gray-200">Parâmetros Oficiais da Planilha Renetec:</p>
          <p className="text-gray-400">
            • Metas: Base 250 pts • Alvo 300 pts • Excelência 350 pts.<br />
            • Piloto: Mínima 160 pts • Alvo 190 pts • Excelência 220 pts.<br />
            • Qualidade: Máx 5% Retrabalho • Fundo Bônus: 1,5% (70% Coletivo / 30% Individual).
          </p>
        </div>
      </form>
    </Drawer>
  );
};
