import React, { useState, useEffect } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { osApiService } from './os.service';
import type { ClienteOption, TipoEquipamentoOption, TecnicoOption, CreateOsPayload } from './os.types';
import { PlusCircle, AlertCircle } from 'lucide-react';

interface CreateOsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateOsDrawer: React.FC<CreateOsDrawerProps> = ({ isOpen, onClose, onSuccess }) => {
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [tiposEquipamento, setTiposEquipamento] = useState<TipoEquipamentoOption[]>([]);
  const [tecnicos, setTecnicos] = useState<TecnicoOption[]>([]);

  // Campos do formulário
  const [clienteId, setClienteId] = useState('');
  const [prioridade, setPrioridade] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'>('MEDIA');
  const [valorOrcamento, setValorOrcamento] = useState<string>('');
  const [observacoes, setObservacoes] = useState('');

  // Item do Lote
  const [tipoEquipamentoId, setTipoEquipamentoId] = useState('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [defeitoRelatado, setDefeitoRelatado] = useState('');
  const [tecnicoAlocadoId, setTecnicoAlocadoId] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Carrega dados para os selects
      Promise.all([
        osApiService.getClientes(),
        osApiService.getTiposEquipamento(),
        osApiService.getTecnicos(),
      ]).then(([c, e, t]) => {
        setClientes(c);
        setTiposEquipamento(e);
        setTecnicos(t);
        if (c.length > 0) setClienteId(c[0].id);
        if (e.length > 0) setTipoEquipamentoId(e[0].id);
        if (t.length > 0) setTecnicoAlocadoId(t[0].id);
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId || !tipoEquipamentoId || !defeitoRelatado) {
      setError('Por favor preencha os campos obrigatórios.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const payload: CreateOsPayload = {
        clienteId,
        prioridade,
        valorOrcamento: valorOrcamento ? parseFloat(valorOrcamento.replace(',', '.')) : undefined,
        observacoes: observacoes || undefined,
        itens: [
          {
            tipoEquipamentoId,
            quantidade: Number(quantidade),
            defeitoRelatado,
            tecnicoAlocadoId: tecnicoAlocadoId || undefined,
          },
        ],
      };

      await osApiService.create(payload);
      onSuccess();
      onClose();
      // Reseta form
      setQuantidade(1);
      setDefeitoRelatado('');
      setObservacoes('');
      setValorOrcamento('');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Erro ao criar Ordem de Serviço.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Ordem de Serviço"
      subtitle="Cadastre o equipamento recebido e atribua ao técnico"
      width="max-w-lg"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isLoading}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Cadastrar OS
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Cliente */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">
            Cliente / Empresa <span className="text-brand-400">*</span>
          </label>
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="w-full h-10 px-3 bg-surface-card border border-surface-border rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {clientes.map((c) => (
              <option key={c.id} value={c.id} className="bg-surface-elevated text-gray-100">
                {c.nomeRazaoSocial}
              </option>
            ))}
          </select>
        </div>

        {/* Equipamento */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">
            Tipo de Equipamento <span className="text-brand-400">*</span>
          </label>
          <select
            value={tipoEquipamentoId}
            onChange={(e) => setTipoEquipamentoId(e.target.value)}
            className="w-full h-10 px-3 bg-surface-card border border-surface-border rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {tiposEquipamento.map((e) => (
              <option key={e.id} value={e.id} className="bg-surface-elevated text-gray-100">
                {e.nome} {e.pontos ? `• ${e.pontos} pt${e.pontos > 1 ? 's' : ''}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Grid: Quantidade & Prioridade */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Quantidade de Itens"
            type="number"
            value={quantidade === 0 ? '' : quantidade}
            onChange={(e) => {
              const v = e.target.value;
              setQuantidade(v === '' ? 0 : Math.max(0, parseInt(v.replace(/\D/g, '')) || 0));
            }}
            placeholder="1"
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">
              Prioridade
            </label>
            <select
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as any)}
              className="w-full h-10 px-3 bg-surface-card border border-surface-border rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="BAIXA" className="bg-surface-elevated">Baixa</option>
              <option value="MEDIA" className="bg-surface-elevated">Média</option>
              <option value="ALTA" className="bg-surface-elevated">Alta</option>
              <option value="URGENTE" className="bg-surface-elevated">Urgente</option>
            </select>
          </div>
        </div>

        {/* Técnico Responsável */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">
            Atribuir Técnico de Produção
          </label>
          <select
            value={tecnicoAlocadoId}
            onChange={(e) => setTecnicoAlocadoId(e.target.value)}
            className="w-full h-10 px-3 bg-surface-card border border-surface-border rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id} className="bg-surface-elevated text-gray-100">
                {t.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Defeito Relatado */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">
            Defeito Relatado / Sintomas <span className="text-brand-400">*</span>
          </label>
          <textarea
            rows={3}
            value={defeitoRelatado}
            onChange={(e) => setDefeitoRelatado(e.target.value)}
            placeholder="Descreva detalhadamente o problema relatado pelo cliente..."
            className="w-full p-3 bg-surface-card border border-surface-border rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder-gray-500"
            required
          />
        </div>

        {/* Valor do Orçamento (Opcional) */}
        <Input
          label="Valor do Orçamento (R$)"
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          value={valorOrcamento}
          onChange={(e) => {
            // Permite vírgula e ponto como separador decimal
            const v = e.target.value.replace(/[^0-9.,]/g, '');
            setValorOrcamento(v);
          }}
        />

        {/* Observações Gerais */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">
            Observações Internas
          </label>
          <textarea
            rows={2}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Instruções adicionais ou peças enviadas pelo cliente..."
            className="w-full p-3 bg-surface-card border border-surface-border rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder-gray-500"
          />
        </div>
      </form>
    </Drawer>
  );
};
