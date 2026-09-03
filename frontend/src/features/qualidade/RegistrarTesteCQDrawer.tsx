import React, { useState, useEffect, useRef } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { osApiService } from '../os/os.service';
import { qualidadeApiService } from './teste.service';
import type { TipoEquipamentoOption, TecnicoOption } from '../os/os.types';
import type { MotivoReprovacaoData } from './teste.types';
import { useAuth } from '../auth/AuthContext';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  RotateCcw,
  Calendar,
  Clock,
  Wrench,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface RegistrarTesteCQDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RegistrarTesteCQDrawer: React.FC<RegistrarTesteCQDrawerProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [tecnicos, setTecnicos] = useState<TecnicoOption[]>([]);
  const [tiposEquipamento, setTiposEquipamento] = useState<TipoEquipamentoOption[]>([]);
  const [motivos, setMotivos] = useState<MotivoReprovacaoData[]>([]);

  // Campos do formulário de CQ
  const [tecnicoId, setTecnicoId] = useState<string>('');
  const [tipoEquipamentoId, setTipoEquipamentoId] = useState<string>('');
  const [numeroOS, setNumeroOS] = useState<string>('');
  const [dataTeste, setDataTeste] = useState<string>(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  });
  const [horaTeste, setHoraTeste] = useState<string>(() => {
    const hoje = new Date();
    const horas = String(hoje.getHours()).padStart(2, '0');
    const minutos = String(hoje.getMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
  });

  const [quantidadeTestada, setQuantidadeTestada] = useState<number>(0);
  const [quantidadeAprovada, setQuantidadeAprovada] = useState<number>(0);
  const [quantidadeReprovada, setQuantidadeReprovada] = useState<number>(0);

  // Retrabalho
  const [tecnicoDestinoId, setTecnicoDestinoId] = useState<string>('');
  const [motivoReprovacaoId, setMotivoReprovacaoId] = useState<string>('mot-01');
  const [detalhesDefeito, setDetalhesDefeito] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      isSubmittingRef.current = false;
      Promise.all([
        osApiService.getTecnicos(),
        osApiService.getTiposEquipamento(),
        qualidadeApiService.getMotivos(),
      ])
        .then(([tecs, equips, mots]) => {
          setTecnicos(tecs);
          setTiposEquipamento(equips);
          setMotivos(mots);

          if (tecs.length > 0) {
            setTecnicoId(tecs[0].id);
            setTecnicoDestinoId(tecs[0].id);
          }
          if (equips.length > 0) {
            setTipoEquipamentoId(equips[0].id);
          }
          if (mots.length > 0) {
            setMotivoReprovacaoId(mots[0].id);
          }

          // Reset formulário
          setNumeroOS('');
          setQuantidadeTestada(10);
          setQuantidadeAprovada(10);
          setQuantidadeReprovada(0);
          setDetalhesDefeito('');
          setObservacao('');
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Se o técnico responsável mudar, atualiza o técnico padrão de destino do retrabalho
  const handleTecnicoChange = (newTecId: string) => {
    setTecnicoId(newTecId);
    setTecnicoDestinoId(newTecId);
  };

  const totalCalculado = Number(quantidadeAprovada) + Number(quantidadeReprovada);
  const isSomaValida = totalCalculado === Number(quantidadeTestada) && Number(quantidadeTestada) > 0;

  const selectedEquip = tiposEquipamento.find((e) => e.id === tipoEquipamentoId);
  const ptsUnit = selectedEquip?.pontos || 1.0;
  const ptsEstimadosAprovados = Number(quantidadeAprovada) * ptsUnit;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current || isLoading) return;

    if (!isSomaValida) {
      setErrorMessage(
        `A soma de Aprovadas (${quantidadeAprovada}) + Reprovadas (${quantidadeReprovada}) = ${totalCalculado} un deve ser igual ao Total Testado (${quantidadeTestada} un).`
      );
      return;
    }

    if (quantidadeReprovada > 0 && !detalhesDefeito.trim() && !observacao.trim()) {
      setErrorMessage('Informe a descrição do defeito/não-conformidade para o técnico orientar o retrabalho.');
      return;
    }

    try {
      isSubmittingRef.current = true;
      setIsLoading(true);
      setErrorMessage(null);

      let timestampISO: string;
      if (dataTeste && horaTeste) {
        const [ano, mes, dia] = dataTeste.split('-').map(Number);
        const [horas, minutos] = horaTeste.split(':').map(Number);
        const dataLocal = new Date(ano, mes - 1, dia, horas || 0, minutos || 0, 0);
        timestampISO = isNaN(dataLocal.getTime()) ? new Date().toISOString() : dataLocal.toISOString();
      } else {
        timestampISO = new Date().toISOString();
      }

      const numParsed = numeroOS.trim() ? parseInt(numeroOS.replace(/\D/g, '')) : undefined;

      await qualidadeApiService.realizarTeste({
        itemOrdemServicoId: 'item-direto',
        producaoId: 'prod-direto',
        numeroOS: numParsed && !isNaN(numParsed) ? numParsed : undefined,
        tipoEquipamentoId: tipoEquipamentoId || (tiposEquipamento[0]?.id || undefined),
        tecnicoResponsavelId: tecnicoId || undefined,
        tecnicoDestinoId: tecnicoDestinoId || tecnicoId || undefined,
        dataTeste: timestampISO,
        quantidadeTestada: Number(quantidadeTestada),
        quantidadeAprovada: Number(quantidadeAprovada),
        quantidadeReprovada: Number(quantidadeReprovada),
        motivoReprovacaoId: quantidadeReprovada > 0 ? (motivoReprovacaoId || 'mot-01') : undefined,
        detalhesDefeito: quantidadeReprovada > 0 ? (detalhesDefeito.trim() || observacao.trim() || 'Defeito registrado no CQ') : undefined,
        observacao: observacao.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Erro ao registrar apontamento de testes do CQ.');
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Registro de Testes CQ (Controle de Qualidade)"
      subtitle={`Inspetor: ${user?.nome || 'Controle de Qualidade'} — Aponte os testes realizados no dia`}
      width="max-w-2xl"
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
            <span className="font-bold text-emerald-400 tabular-nums flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> +{quantidadeAprovada} aprovadas
            </span>
            {quantidadeReprovada > 0 && (
              <>
                <span className="text-gray-500">•</span>
                <span className="text-amber-400 font-bold tabular-nums flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5" /> {quantidadeReprovada} retrabalho
                </span>
              </>
            )}
            <span className="text-gray-500">•</span>
            <span className="text-amber-300 font-bold tabular-nums">
              ~{ptsEstimadosAprovados.toFixed(1)} pts
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              variant={quantidadeReprovada > 0 ? 'warning' : 'success'}
              size="sm"
              onClick={handleSubmit}
              disabled={isLoading || !isSomaValida}
              loading={isLoading}
              leftIcon={<FileCheck className="w-4 h-4" />}
              className={quantidadeReprovada > 0 ? 'font-bold' : 'shadow-glow-success font-bold'}
            >
              {quantidadeReprovada > 0 ? 'Gravar Laudo com Retrabalho' : 'Aprovar e Pontuar na Meta'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-sm">
        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800/40 flex items-start gap-2.5 text-xs text-red-300">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. IDENTIFICAÇÃO DO TESTE (DATA, TÉCNICO, OS, EQUIPAMENTO) */}
        <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-400" /> Dados da Inspeção & Bancada
            </span>
            <span className="text-[11px] text-gray-400">
              Inspetor de CQ: <strong className="text-white">{user?.nome || 'Rhyan'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-400" /> Data do Teste
              </label>
              <input
                type="date"
                value={dataTeste}
                onChange={(e) => setDataTeste(e.target.value)}
                className="w-full h-10 px-3 bg-[#12161f] border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Horário
              </label>
              <input
                type="time"
                value={horaTeste}
                onChange={(e) => setHoraTeste(e.target.value)}
                className="w-full h-10 px-3 bg-[#12161f] border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                Número da OS <span className="text-gray-500 text-[11px] font-normal">(Opcional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-sm">#</span>
                <input
                  type="text"
                  value={numeroOS}
                  onChange={(e) => setNumeroOS(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Auto se vazio"
                  className="w-full h-10 pl-7 pr-3 bg-surface-base border border-surface-border rounded-lg text-xs text-white font-mono font-bold focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-sky-400" /> Técnico que Reparou o Equipamento <span className="text-brand-400">*</span>
              </label>
              <select
                value={tecnicoId}
                onChange={(e) => handleTecnicoChange(e.target.value)}
                className="w-full h-10 px-3 bg-[#12161f] border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-brand-500 font-medium"
              >
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#181d26] text-white py-1">
                    {t.nome} {t.funcao ? `(${t.funcao})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-emerald-400" /> Modelo do Equipamento <span className="text-brand-400">*</span>
              </label>
              <select
                value={tipoEquipamentoId}
                onChange={(e) => setTipoEquipamentoId(e.target.value)}
                className="w-full h-10 px-3 bg-[#12161f] border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-brand-500 font-medium"
              >
                {tiposEquipamento.map((eq) => {
                  const pts = eq.pontos ?? 1;
                  return (
                    <option key={eq.id} value={eq.id} className="bg-[#181d26] text-white py-1">
                      {eq.nome} ({pts} pt{pts > 1 ? 's' : ''})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* 2. QUANTITATIVO: TESTADAS, APROVADAS E RETRABALHO */}
        <div className="p-4 rounded-xl bg-surface-base border border-surface-border space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-400" /> Contagem Diária de Testes
            </label>
            <span className="text-xs text-amber-400 font-semibold tabular-nums">
              {ptsUnit} pt/un • {ptsEstimadosAprovados.toFixed(1)} pts na aprovação
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1">
                Total Testado Hoje
              </label>
              <input
                type="number"
                min="1"
                value={quantidadeTestada === 0 ? '' : quantidadeTestada}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  const v = raw === '' ? 0 : parseInt(raw);
                  setQuantidadeTestada(v);
                  if (raw !== '') {
                    setQuantidadeAprovada(v);
                    setQuantidadeReprovada(0);
                  }
                }}
                placeholder="Ex: 20"
                className="w-full h-10 px-3 bg-[#141923] border border-surface-border rounded-lg text-sm text-center text-white font-mono font-bold focus:outline-none focus:border-brand-500"
                required
              />
              <span className="text-[10px] text-gray-400 block text-center">Volume testado no dia</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Aprovadas (Para a Meta)
              </label>
              <input
                type="number"
                min="0"
                value={quantidadeAprovada === 0 ? '' : quantidadeAprovada}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  const v = raw === '' ? 0 : Math.min(quantidadeTestada, Math.max(0, parseInt(raw)));
                  setQuantidadeAprovada(v === 0 && raw === '' ? 0 : v);
                  if (raw !== '') setQuantidadeReprovada(Math.max(0, quantidadeTestada - v));
                }}
                placeholder="0"
                className="w-full h-10 px-3 bg-[#141923] border border-emerald-500/50 rounded-lg text-sm text-center text-emerald-300 font-mono font-black focus:outline-none focus:border-emerald-400 ring-1 ring-emerald-500/30"
                required
              />
              <span className="text-[10px] text-emerald-400/80 block text-center font-medium">Pontuam na hora</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-red-400 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Retrabalho / Reprovadas
              </label>
              <input
                type="number"
                min="0"
                value={quantidadeReprovada === 0 ? '' : quantidadeReprovada}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  const v = raw === '' ? 0 : Math.min(quantidadeTestada, Math.max(0, parseInt(raw)));
                  setQuantidadeReprovada(v === 0 && raw === '' ? 0 : v);
                  if (raw !== '') setQuantidadeAprovada(Math.max(0, quantidadeTestada - v));
                }}
                placeholder="0"
                className="w-full h-10 px-3 bg-[#141923] border border-red-500/40 rounded-lg text-sm text-center text-red-300 font-mono font-bold focus:outline-none focus:border-red-500"
                required
              />
              <span className="text-[10px] text-red-400/80 block text-center font-medium">Voltam ao técnico</span>
            </div>
          </div>

          {/* Validação de Soma */}
          <div
            className={`p-2.5 rounded-lg flex items-center justify-between text-xs font-semibold ${
              isSomaValida
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                : 'bg-red-950/40 text-red-300 border border-red-800/40 animate-pulse'
            }`}
          >
            <span>
              Validação: <strong className="tabular-nums">{quantidadeAprovada}</strong> (Aprov.) +{' '}
              <strong className="tabular-nums">{quantidadeReprovada}</strong> (Retrabalho) ={' '}
              <strong className="tabular-nums">{totalCalculado}</strong> / {quantidadeTestada} un testadas
            </span>
            <span>{isSomaValida ? '✅ Equação OK' : '⚠️ Divergência na soma'}</span>
          </div>
        </div>

        {/* 3. RETRABALHO E NÃO-CONFORMIDADE (CONDICIONAL SE REPROVADA > 0) */}
        {quantidadeReprovada > 0 && (
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-3.5 animate-fadeIn shadow-panel">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" /> Destino do Retrabalho & Não-Conformidade
              </span>
              <span className="text-[11px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded font-bold">
                {quantidadeReprovada} un para correção
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Para qual Técnico que voltou? <span className="text-amber-400">*</span>
                </label>
                <select
                  value={tecnicoDestinoId}
                  onChange={(e) => setTecnicoDestinoId(e.target.value)}
                  className="w-full h-10 px-3 bg-[#141923] border border-amber-500/40 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  {tecnicos.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#181d26] text-white py-1">
                      {t.nome} (Devolução)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">
                  Motivo da Não-Conformidade <span className="text-amber-400">*</span>
                </label>
                <select
                  value={motivoReprovacaoId}
                  onChange={(e) => setMotivoReprovacaoId(e.target.value)}
                  className="w-full h-10 px-3 bg-[#141923] border border-amber-500/40 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  {motivos.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#181d26] text-white py-1">
                      {m.codigo} - {m.descricao}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-amber-300">
                Descrição do Defeito Detectado / Orientação para o Técnico <span className="text-amber-400">*</span>
              </label>
              <textarea
                rows={2}
                value={detalhesDefeito}
                onChange={(e) => setDetalhesDefeito(e.target.value)}
                placeholder="Ex: Não ligou na carga máxima, ressoldar capacitor C12 e verificar tensão na saída."
                className="w-full bg-[#12161f] border border-amber-500/40 rounded-lg p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 resize-none"
                required
              />
            </div>
          </div>
        )}

        {/* 4. OBSERVAÇÃO GERAL */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Observação Geral do Laudo (Opcional)
          </label>
          <textarea
            rows={2}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex: Lote testado e validado em bancada de carga. FPY 90%."
            className="w-full bg-surface-base border border-surface-border rounded-lg p-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
          />
        </div>
      </form>
    </Drawer>
  );
};
