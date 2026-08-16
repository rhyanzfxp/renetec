import React, { useState, useEffect, useCallback } from 'react';
import { osApiService } from './os.service';
import type { OrdemServicoData } from './os.types';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Tabs } from '../../components/ui/Tabs';
import type { TabItem } from '../../components/ui/Tabs';
import { CreateOsDrawer } from './CreateOsDrawer';
import { OsDetailsDrawer } from './OsDetailsDrawer';
import { useAuth } from '../auth/AuthContext';
import { Search, Plus, RefreshCw } from 'lucide-react';

interface OsListPageProps {
  onlyMine?: boolean;
}

export const OsListPage: React.FC<OsListPageProps> = ({ onlyMine = false }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrdemServicoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('TODOS');
  
  // Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOs, setSelectedOs] = useState<OrdemServicoData | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (selectedStatus !== 'TODOS') params.status = selectedStatus;
      if (onlyMine && user?.perfil === 'TECNICO') {
        params.tecnicoId = user.id;
      }

      const res = await osApiService.list(params);
      if (res?.data) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Erro ao buscar OSs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedStatus, onlyMine, user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const tabs: TabItem[] = [
    { id: 'TODOS', label: 'Todas as OS' },
    { id: 'RECEBIDO', label: 'Recebido' },
    { id: 'AGUARDANDO_PRODUCAO', label: 'Aguardando Produção' },
    { id: 'EM_PRODUCAO', label: 'Em Produção' },
    { id: 'AGUARDANDO_TESTE', label: 'Aguardando Teste' },
    { id: 'RETRABALHO', label: 'Retrabalho' },
    { id: 'CONCLUIDO', label: 'Concluído' },
  ];

  const columns: Column<OrdemServicoData>[] = [
    {
      key: 'numeroOS',
      header: 'Número',
      width: '90px',
      render: (row) => <span className="font-bold text-white tabular-nums">#{row.numeroOS}</span>,
    },
    {
      key: 'cliente',
      header: 'Cliente / Equipamento',
      render: (row) => {
        const item = row.itens[0];
        return (
          <div>
            <p className="font-medium text-white truncate max-w-xs">{row.cliente.nomeRazaoSocial}</p>
            {item && (
              <p className="text-[11px] text-gray-400 truncate max-w-xs">
                {item.tipoEquipamento.nome} {item.tipoEquipamento.marca ? `(${item.tipoEquipamento.marca})` : ''}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'quantidade',
      header: 'Lote',
      width: '80px',
      align: 'center',
      render: (row) => {
        const total = row.itens.reduce((acc, it) => acc + it.quantidade, 0);
        return <span className="font-semibold text-gray-200 tabular-nums">{total} un</span>;
      },
    },
    {
      key: 'prioridade',
      header: 'Prioridade',
      width: '100px',
      render: (row) => <StatusBadge prioridade={row.prioridade} size="sm" />,
    },
    {
      key: 'status',
      header: 'Status',
      width: '170px',
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      key: 'tecnico',
      header: 'Técnico',
      width: '140px',
      render: (row) => {
        const tec = row.itens[0]?.tecnicoAlocado?.nome;
        return <span className="text-gray-300 text-xs">{tec || '—'}</span>;
      },
    },
    {
      key: 'acoes',
      header: 'Ação',
      width: '110px',
      align: 'right',
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedOs(row);
          }}
        >
          Ver OS
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Top Controls: Search + Refresh + New OS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar por número, cliente ou equipamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={fetchOrders}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Atualizar
          </Button>

          {user?.perfil === 'ADMIN' && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Nova Ordem de Serviço
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Filter */}
      <Tabs tabs={tabs} activeTab={selectedStatus} onChange={setSelectedStatus} />

      {/* OS Table */}
      <Table<OrdemServicoData>
        columns={columns}
        data={orders}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage={
          search || selectedStatus !== 'TODOS'
            ? 'Nenhuma Ordem de Serviço encontrada com os filtros selecionados.'
            : 'Nenhuma Ordem de Serviço cadastrada.'
        }
        onRowClick={(row) => setSelectedOs(row)}
      />

      {/* Create OS Drawer */}
      <CreateOsDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchOrders}
      />

      {/* OS Details Drawer */}
      <OsDetailsDrawer
        os={selectedOs}
        onClose={() => setSelectedOs(null)}
        onStatusUpdated={fetchOrders}
      />
    </div>
  );
};
