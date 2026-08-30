import React, { useState, useEffect } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { osApiService } from './os.service';
import type { ClienteOption, TipoEquipamentoOption, TecnicoOption, CreateOsPayload } from './os.types';
import { PlusCircle, AlertCircle, Building2, CheckCircle2 } from 'lucide-react';

interface CreateOsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateOsDrawer: React.FC<CreateOsDrawerProps> = ({ isOpen, onClose, onSuccess }) => {
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [tiposEquipamento, setTiposEquipamento] = useState<TipoEquipamentoOption[]>([]);
  const [tecnicos, setTecnicos] = useState<TecnicoOption[]>([]);

  // Cadastro rápido de empresa
  const [isAddingCliente, setIsAddingCliente] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [novoClienteDoc, setNovoClienteDoc] = useState('');
  const [novoClienteTel, setNovoClienteTel] = useState('');
  const [isSavingCliente, setIsSavingCliente] = useState(false);
  const [clienteSuccessMsg, setClienteSuccessMsg] = useState<string | null>(null);

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

  const handleSalvarNovoCliente = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!novoClienteNome.trim()) {
      setError('Informe o nome da nova empresa.');
      return;
    }
    try {
      setIsSavingCliente(true);
      setError(null);
      const novo = await osApiService.createCliente({
        nomeRazaoSocial: novoClienteNome.trim(),
        documento: novoClienteDoc.trim() || undefined,
        contatoTelefone: novoClienteTel.trim() || undefined,
      });

      const updatedList = await osApiService.getClientes();
      setClientes(updatedList);
      setClienteId(novo.id);

      setNovoClienteNome('');
      setNovoClienteDoc('');
      setNovoClienteTel('');
      setIsAddingCliente(false);
      setClienteSuccessMsg(`Empresa "${novo.nomeRazaoSocial}" cadastrada com sucesso!`);
      setTimeout(() => setClienteSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao cadastrar empresa.');
    } finally {
      setIsSavingCliente(false);
    }
  };


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
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">
              Cliente / Empresa <span className="text-brand-400">*</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setIsAddingCliente(!isAddingCliente);
                setError(null);
              }}
              className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              {isAddingCliente ? 'Fechar' : '+ Nova Empresa'}
            </button>
          </div>

          {isAddingCliente ? (
            <div className="p-3 bg-surface-base border border-brand-500/50 rounded-xl space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between border-b border-surface-border/50 pb-1.5">
                <span className="text-xs font-bold text-brand-300 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-brand-400" /> Cadastrar Nova Empresa
                </span>
                <span className="text-[10px] text-gray-400">Salva no sistema</span>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={novoClienteNome}
                  onChange={(e) => setNovoClienteNome(e.target.value)}
                  placeholder="Nome / Razão Social da Empresa *"
                  className="w-full h-8 px-2.5 bg-surface-card border border-surface-border rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={novoClienteDoc}
                    onChange={(e) => setNovoClienteDoc(e.target.value)}
                    placeholder="CNPJ / CPF (opcional)"
                    className="w-full h-8 px-2 bg-surface-card border border-surface-border rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                  />
                  <input
                    type="text"
                    value={novoClienteTel}
                    onChange={(e) => setNovoClienteTel(e.target.value)}
                    placeholder="Telefone (opcional)"
                    className="w-full h-8 px-2 bg-surface-card border border-surface-border rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsAddingCliente(false)}
                  className="px-2.5 py-1 text-xs text-gray-400 hover:text-white rounded transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarNovoCliente}
                  disabled={isSavingCliente || !novoClienteNome.trim()}
                  className="px-3 py-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-xs font-bold text-white rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                >
                  {isSavingCliente ? (
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Salvar Empresa
                </button>
              </div>
            </div>
          ) : (
            <select
              value={clienteId}
              onChange={(e) => {
                if (e.target.value === '__NOVA_EMPRESA__') {
                  setIsAddingCliente(true);
                } else {
                  setClienteId(e.target.value);
                }
              }}
              className="w-full h-10 px-3 bg-surface-card border border-surface-border rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {clientes.map((c) => (
                <option key={c.id} value={c.id} className="bg-surface-elevated text-gray-100">
                  {c.nomeRazaoSocial}
                </option>
              ))}
              <option value="__NOVA_EMPRESA__" className="bg-brand-950 text-brand-300 font-bold py-1">
                + Cadastrar Nova Empresa...
              </option>
            </select>
          )}

          {clienteSuccessMsg && (
            <p className="text-xs text-emerald-400 flex items-center gap-1 font-medium mt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> {clienteSuccessMsg}
            </p>
          )}
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
