import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { qualidadeApiService } from './teste.service';
import { osApiService } from '../os/os.service';
import type { HistoricoTesteItem } from './teste.types';
import type { TecnicoOption } from '../os/os.types';
import { Pencil, X, User, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface EditarLaudoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  teste: HistoricoTesteItem | null;
}

export const EditarLaudoModal: React.FC<EditarLaudoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  teste,
}) => {
  const [tecnicos, setTecnicos] = useState<TecnicoOption[]>([]);
  const [tecnicoId, setTecnicoId] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Carrega técnicos e pré-preenche com o atual
  useEffect(() => {
    if (!isOpen) return;
    osApiService.getTecnicos().then(setTecnicos).catch(() => {});
    if (teste) {
      // Resolve técnico atual: retrabalho > tecnicoAlocado > tecnico da produção
      const retTec = teste.retrabalhos?.[0]?.tecnicoResponsavel;
      const alocTec = teste.producao?.itemOrdemServico?.tecnicoAlocado;
      const prodTec = teste.producao?.tecnico;
      const tecAtual = retTec || alocTec || prodTec;
      setTecnicoId(tecAtual?.id || '');
      setObservacao(teste.observacao || '');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, teste]);

  const handleSalvar = async () => {
    if (!teste) return;
    setIsLoading(true);
    setError(null);
    try {
      await qualidadeApiService.editarTeste(teste.id, {
        tecnicoResponsavelId: tecnicoId || undefined,
        observacao: observacao || undefined,
      });
      setSuccess('Laudo corrigido com sucesso!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || 'Erro ao salvar correção. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !teste) return null;

  const numOS = teste.producao?.itemOrdemServico?.ordemServico?.numeroOS;
  const equipNome = teste.producao?.itemOrdemServico?.tipoEquipamento?.nome || 'Equipamento';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-surface-card border border-surface-border rounded-2xl shadow-xl z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Pencil className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                Corrigir Laudo de Inspeção
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                OS #{numOS || '—'} · {equipNome}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-muted text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-200">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Técnico de Reparo */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" />
              Técnico de Reparo
            </label>
            <select
              value={tecnicoId}
              onChange={(e) => setTecnicoId(e.target.value)}
              className="w-full h-9 px-3 bg-surface-base border border-surface-border rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            >
              <option value="">— Selecionar técnico —</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-500 dark:text-gray-500">
              Selecione o técnico correto que realizou o reparo deste lote.
            </p>
          </div>

          {/* Observação */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Observação
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              placeholder="Observação do laudo (opcional)..."
              className="w-full px-3 py-2 bg-surface-base border border-surface-border rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors resize-none"
            />
          </div>

          {/* Resumo do laudo */}
          <div className="p-3 rounded-lg bg-surface-base border border-surface-border/50 text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5">
            <p>
              <span className="font-medium text-gray-700 dark:text-gray-300">Aprovadas:</span>{' '}
              {teste.quantidadeAprovada} un &nbsp;·&nbsp;
              <span className="font-medium text-gray-700 dark:text-gray-300">Reprovadas:</span>{' '}
              {teste.quantidadeReprovada} un
            </p>
            <p>
              <span className="font-medium text-gray-700 dark:text-gray-300">Inspetor:</span>{' '}
              {teste.inspetor?.nome || 'CQ'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-surface-border">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSalvar}
            loading={isLoading}
            disabled={isLoading || !!success}
            leftIcon={<Pencil className="w-3.5 h-3.5" />}
          >
            Salvar Correção
          </Button>
        </div>
      </div>
    </div>
  );
};

