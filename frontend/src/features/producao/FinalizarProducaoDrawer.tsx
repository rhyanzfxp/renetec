import React, { useState } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { producaoApiService } from './producao.service';
import type { ProducaoAtivaData } from './producao.types';
import { CheckCircle2, AlertCircle, Wrench } from 'lucide-react';

interface FinalizarProducaoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  producao: ProducaoAtivaData | null;
  tempoDecorrido: string;
  onSuccess: () => void;
}

export const FinalizarProducaoDrawer: React.FC<FinalizarProducaoDrawerProps> = ({
  isOpen,
  onClose,
  producao,
  tempoDecorrido,
  onSuccess,
}) => {
  const maxQtd = producao?.itemOrdemServico?.quantidade || 1;
  const [quantidade, setQuantidade] = useState<number>(maxQtd);
  const [servicoRealizado, setServicoRealizado] = useState('');
  const [observacao, setObservacao] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sincroniza quantidade com o lote ao abrir
  React.useEffect(() => {
    if (producao) {
      setQuantidade(producao.itemOrdemServico.quantidade);
      setServicoRealizado('');
      setObservacao('');
      setErrorMessage(null);
    }
  }, [producao]);

  if (!producao) return null;

  const handleFinalizar = async (enviarAoCQ: boolean) => {
    if (!servicoRealizado.trim() || servicoRealizado.trim().length < 3) {
      setErrorMessage('Descreva o serviço realizado.');
      return;
    }

    if (quantidade < 1 || quantidade > maxQtd) {
      setErrorMessage(`A quantidade deve estar entre 1 e ${maxQtd} unidades.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await producaoApiService.finalizarProducao(producao.id, {
        quantidadeProduzida: Number(quantidade),
        servicoRealizado: servicoRealizado.trim(),
        observacao: observacao.trim() || undefined,
        enviarAoCQ,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(e.response?.data?.message || 'Falha ao salvar lote de produção.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const item = producao.itemOrdemServico;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Concluir Produção de Bancada"
      subtitle={`OS #${item.ordemServico.numeroOS} — ${item.ordemServico.cliente.nomeRazaoSocial}`}
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 w-full">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleFinalizar(false)}
              disabled={isSubmitting}
              loading={isSubmitting}
              className="text-xs"
              title="Salva as peças feitas e mantém o lote na sua bancada para continuar outro dia"
            >
              💾 Salvar na Bancada
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={() => handleFinalizar(true)}
              disabled={isSubmitting}
              loading={isSubmitting}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              className="text-xs font-bold shadow-glow-success"
              title="Finaliza a caixa e envia as unidades para o CQ testar"
            >
              ⚡ Enviar ao CQ
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-5 text-sm">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Resumo do Lote em Execução */}
        <div className="p-3.5 rounded-lg bg-surface-elevated border border-surface-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Equipamento em Bancada</span>
            <StatusBadge prioridade={item.ordemServico.prioridade} size="sm" />
          </div>
          <p className="text-sm font-bold text-white">
            {item.tipoEquipamento.nome} {item.tipoEquipamento.marca ? `(${item.tipoEquipamento.marca})` : ''}
          </p>
          <div className="flex justify-between text-xs text-gray-300 pt-1 border-t border-surface-border/50">
            <span>Tempo em Execução:</span>
            <span className="text-amber-400 font-bold tabular-nums">{tempoDecorrido}</span>
          </div>
        </div>

        {/* Defeito que havia sido relatado */}
        {item.defeitoRelatado && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Defeito Inicial Relatado
            </label>
            <div className="p-2.5 rounded-lg bg-surface-base border border-surface-border text-xs text-gray-300">
              {item.defeitoRelatado}
            </div>
          </div>
        )}

        {/* Quantidade Concluída */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase text-gray-300 tracking-wider">
            Quantidade Concluída no Lote (unidades) <span className="text-red-400">*</span>
          </label>
          <Input
            type="number"
            value={quantidade === 0 ? '' : quantidade}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '');
              setQuantidade(raw === '' ? 0 : Math.min(maxQtd, Math.max(0, parseInt(raw))));
            }}
            placeholder="0"
            required
            helperText={`Total de unidades do lote nesta OS: ${maxQtd} un`}
          />
        </div>

        {/* Serviço Realizado */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase text-gray-300 tracking-wider">
            Serviço Realizado / Reparos Feitos <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <textarea
              value={servicoRealizado}
              onChange={(e) => setServicoRealizado(e.target.value)}
              rows={3}
              placeholder="Ex: Troca dos capacitores estufados, ressolda da ponte retificadora e aplicação de verniz de proteção."
              required
              className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
            />
          </div>
        </div>

        {/* Observações Complementares */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase text-gray-300 tracking-wider">
            Observações para o Controle de Qualidade (Opcional)
          </label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={2}
            placeholder="Ex: Testar com atenção o canal 2 em 220V."
            className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
          />
        </div>

        <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-300">
          <p className="font-semibold flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-indigo-400" /> Próxima Etapa Operacional:
          </p>
          <p className="mt-1 text-gray-400">
            Ao finalizar, o status do lote mudará para <strong className="text-indigo-300">Aguardando Teste</strong> e estará visível na bancada de Controle de Qualidade (CQ).
          </p>
        </div>
      </form>
    </Drawer>
  );
};
