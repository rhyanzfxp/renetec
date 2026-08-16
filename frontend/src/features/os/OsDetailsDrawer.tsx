import React, { useState } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { OrdemServicoData } from './os.types';
import { osApiService } from './os.service';
import type { StatusOS } from '../../types/auth';
import { Play, PauseCircle, Clock, ArrowRight } from 'lucide-react';

interface OsDetailsDrawerProps {
  os: OrdemServicoData | null;
  onClose: () => void;
  onStatusUpdated: () => void;
}

export const OsDetailsDrawer: React.FC<OsDetailsDrawerProps> = ({ os, onClose, onStatusUpdated }) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!os) return null;

  const handleUpdateStatus = async (newStatus: StatusOS) => {
    try {
      setIsLoading(true);
      await osApiService.updateStatus(os.id, newStatus);
      onStatusUpdated();
      onClose();
    } catch (err) {
      alert('Erro ao atualizar status da OS.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer
      isOpen={!!os}
      onClose={onClose}
      title={`Ordem de Serviço #${os.numeroOS}`}
      subtitle={`Cliente: ${os.cliente.nomeRazaoSocial}`}
      width="max-w-lg"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2 w-full">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Fechar
          </Button>

          {os.status === 'RECEBIDO' && (
            <Button
              variant="primary"
              size="sm"
              isLoading={isLoading}
              onClick={() => handleUpdateStatus('AGUARDANDO_PRODUCAO')}
              leftIcon={<ArrowRight className="w-4 h-4" />}
            >
              Liberar p/ Produção
            </Button>
          )}

          {os.status === 'AGUARDANDO_PRODUCAO' && (
            <Button
              variant="warning"
              size="sm"
              isLoading={isLoading}
              onClick={() => handleUpdateStatus('AGUARDANDO_PECA')}
              leftIcon={<PauseCircle className="w-4 h-4" />}
            >
              Aguardando Peça
            </Button>
          )}

          {os.status === 'AGUARDANDO_PECA' && (
            <Button
              variant="primary"
              size="sm"
              isLoading={isLoading}
              onClick={() => handleUpdateStatus('AGUARDANDO_PRODUCAO')}
              leftIcon={<Play className="w-4 h-4" />}
            >
              Retomar Produção
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6 text-sm">
        {/* Status e Prioridade */}
        <div className="p-4 rounded-xl bg-surface-elevated border border-surface-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Status Operacional
            </span>
            <StatusBadge status={os.status} size="md" />
          </div>
          <div className="flex items-center justify-between border-t border-surface-border/50 pt-2 text-xs">
            <span className="text-gray-400">Prioridade da OS:</span>
            <StatusBadge prioridade={os.prioridade} size="sm" />
          </div>
          {os.valorOrcamento && (
            <div className="flex items-center justify-between border-t border-surface-border/50 pt-2 text-xs">
              <span className="text-gray-400">Valor Orçado:</span>
              <span className="text-white font-bold tabular-nums">
                R$ {os.valorOrcamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* Itens e Equipamentos */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Itens do Lote ({os.itens.length})
          </h4>
          <div className="space-y-2.5">
            {os.itens.map((item, idx) => (
              <div key={item.id || idx} className="p-3.5 rounded-lg bg-surface-card border border-surface-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{item.tipoEquipamento.nome}</span>
                  <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 text-xs font-bold tabular-nums border border-brand-500/30">
                    {item.quantidade} un
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  <span className="text-gray-300 font-medium">Técnico Alocado: </span>
                  {item.tecnicoAlocado?.nome || 'Não atribuído'}
                </div>
                <div className="p-2.5 rounded bg-surface-base border border-surface-border/80 text-xs text-gray-300">
                  <span className="font-semibold text-gray-400 block mb-1">Defeito Relatado:</span>
                  {item.defeitoRelatado}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Observações */}
        {os.observacoes && (
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Observações Gerais
            </h4>
            <p className="p-3 rounded-lg bg-surface-card border border-surface-border text-xs text-gray-300">
              {os.observacoes}
            </p>
          </div>
        )}

        {/* Timestamps */}
        <div className="space-y-2 border-t border-surface-border pt-4 text-xs text-gray-400">
          <div className="flex justify-between">
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Entrada no Sistema:</span>
            <span className="text-gray-200 tabular-nums">{new Date(os.dataEntrada).toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
