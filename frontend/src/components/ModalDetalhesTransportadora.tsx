import React, { useState, useMemo } from 'react';
import './ModalDetalhesTransportadora.css';

interface VolumeDetalhes {
  volume: number;
  inicio: string | null;
  encerramento: string | null;
  data_embarque: string | null;
  quem_embarcou: string | null;
  tipo_volume: string | null;
}

interface PedidoDetalhes {
  cod_pedido: number;
  situacao_pedido: string;
  dh_digitacao: string;
  dh_ordem_movimentacao: string | null;
  dh_encerramento_movimentacao: string | null;
  pedido_volumes: number;
  valor_total: number;
  volumes: VolumeDetalhes[];
  totalVolumesEmbarcados: number;
  totalVolumesPendentes: number;
}

interface RomaneioDetalhado {
  cod_romaneio: number;
  rota: string;
  pedidos: PedidoDetalhes[];
}

interface TransportadoraAgrupada {
  nome: string;
  cod_transportador: number;
  romaneios: RomaneioDetalhado[];
  totalPedidos: number;
  totalVolumes: number;
  totalVolumesEmbarcados: number;
  totalVolumesPendentes: number;
  totalValor: number;
  percentualConclusao: number;
  todosPedidos: PedidoDetalhes[]; // Todos os pedidos da transportadora
}

interface ModalDetalhesTransportadoraProps {
  isOpen: boolean;
  onClose: () => void;
  transportadora: TransportadoraAgrupada;
}

type SortField = 'cod_pedido' | 'situacao_pedido' | 'valor_total' | 'pedido_volumes' | 'embarcados' | 'pendentes';
type SortDirection = 'asc' | 'desc';

const ModalDetalhesTransportadora: React.FC<ModalDetalhesTransportadoraProps> = ({
  isOpen,
  onClose,
  transportadora
}) => {
  const [expandedPedidos, setExpandedPedidos] = useState<Set<number>>(new Set());
  const [filtroSituacao, setFiltroSituacao] = useState<string>('');
  const [filtroPedido, setFiltroPedido] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('cod_pedido');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Filtros de volumes
  const [filtroVolume, setFiltroVolume] = useState<string>('');
  const [statusVolumeSelecionados, setStatusVolumeSelecionados] = useState<Set<string>>(new Set(['embarcado', 'pendente']));
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<{ [key: number]: boolean }>({});

  if (!isOpen) return null;

  const togglePedido = (codPedido: number) => {
    setExpandedPedidos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(codPedido)) {
        newSet.delete(codPedido);
      } else {
        newSet.add(codPedido);
      }
      return newSet;
    });
  };

  const toggleStatusDropdown = (codPedido: number) => {
    setStatusDropdownOpen(prev => ({
      ...prev,
      [codPedido]: !prev[codPedido]
    }));
  };

  const toggleStatusVolume = (status: string) => {
    setStatusVolumeSelecionados(prev => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  const filtrarVolumes = (volumes: VolumeDetalhes[]) => {
    return volumes.filter(volume => {
      const volumeStatus = volume.data_embarque ? 'embarcado' : 'pendente';
      const passaFiltroStatus = statusVolumeSelecionados.has(volumeStatus);
      const passaFiltroVolume = filtroVolume === '' || volume.volume.toString().includes(filtroVolume);
      return passaFiltroStatus && passaFiltroVolume;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Usa os pedidos diretos da transportadora (inclui pedidos com e sem romaneio)
  const todosPedidos = useMemo(() => {
    return transportadora.todosPedidos.map(pedido => {
      // Busca o romaneio/rota se existir (pode ser null para pedidos sem romaneio)
      const pedidoComRomaneio = transportadora.romaneios
        .flatMap(r => r.pedidos.map(p => ({ ...p, romaneio: r.rota, cod_romaneio: r.cod_romaneio })))
        .find(p => p.cod_pedido === pedido.cod_pedido);
      
      return {
        ...pedido,
        romaneio: pedidoComRomaneio?.romaneio || 'Sem romaneio',
        cod_romaneio: pedidoComRomaneio?.cod_romaneio || null
      };
    });
  }, [transportadora]);

  // Filtra e ordena pedidos
  const pedidosFiltrados = useMemo(() => {
    let filtrados = todosPedidos;

    if (filtroSituacao) {
      filtrados = filtrados.filter(p => p.situacao_pedido.toLowerCase().includes(filtroSituacao.toLowerCase()));
    }

    if (filtroPedido) {
      filtrados = filtrados.filter(p => p.cod_pedido.toString().includes(filtroPedido));
    }

    // Ordenação
    filtrados.sort((a, b) => {
      let compareValue = 0;
      
      if (sortField === 'cod_pedido') {
        compareValue = a.cod_pedido - b.cod_pedido;
      } else if (sortField === 'situacao_pedido') {
        compareValue = a.situacao_pedido.localeCompare(b.situacao_pedido);
      } else if (sortField === 'valor_total') {
        compareValue = a.valor_total - b.valor_total;
      } else if (sortField === 'pedido_volumes') {
        compareValue = a.volumes.length - b.volumes.length;
      } else if (sortField === 'embarcados') {
        compareValue = a.totalVolumesEmbarcados - b.totalVolumesEmbarcados;
      } else if (sortField === 'pendentes') {
        compareValue = a.totalVolumesPendentes - b.totalVolumesPendentes;
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    return filtrados;
  }, [todosPedidos, filtroSituacao, filtroPedido, sortField, sortDirection]);

  const formatDateTime = (date: string | null) => {
    if (!date) return '-';
    // Formata ISO UTC para dd/MM/yyyy HH:mm, sem alterar horário
    // Exemplo: 2026-01-26T13:19:18.443Z => 26/01/2026 13:19
    const match = date.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}`;
    }
    return date;
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return <span className="sort-icon">⇅</span>;
    return <span className="sort-icon active">{sortDirection === 'asc' ? '▲' : '▼'}</span>;
  };

  return (
    <div className="modal-detalhes-overlay" onClick={onClose}>
      <div className="modal-detalhes-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-detalhes-header">
          <div>
            <h2>{transportadora.nome}</h2>
            <div className="header-stats">
              <span>Pedidos: {transportadora.totalPedidos}</span>
              <span>Volumes: {transportadora.totalVolumes}</span>
              <span>Embarcados: {transportadora.totalVolumesEmbarcados}</span>
              <span>Pendentes: {transportadora.totalVolumesPendentes}</span>
              <span>Valor: R$ {transportadora.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <button className="modal-detalhes-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-detalhes-filters">
          <input
            type="text"
            placeholder="Filtrar por pedido..."
            value={filtroPedido}
            onChange={(e) => setFiltroPedido(e.target.value)}
            className="filter-input"
          />
          <input
            type="text"
            placeholder="Filtrar por situação..."
            value={filtroSituacao}
            onChange={(e) => setFiltroSituacao(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="modal-detalhes-body">
          <table className="table-pedidos">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th onClick={() => handleSort('cod_pedido')} className="sortable">
                  Prenota <SortIcon field="cod_pedido" />
                </th>
                <th>Rota</th>
                <th onClick={() => handleSort('situacao_pedido')} className="sortable">
                  Situação <SortIcon field="situacao_pedido" />
                </th>
                <th>Digitação</th>
                <th onClick={() => handleSort('pedido_volumes')} className="sortable">
                  Vol. <SortIcon field="pedido_volumes" />
                </th>
                <th onClick={() => handleSort('embarcados')} className="sortable">
                  Embarcados <SortIcon field="embarcados" />
                </th>
                <th onClick={() => handleSort('pendentes')} className="sortable">
                  Pendentes <SortIcon field="pendentes" />
                </th>
                <th onClick={() => handleSort('valor_total')} className="sortable">
                  Valor <SortIcon field="valor_total" />
                </th>
              </tr>
            </thead>
            <tbody>
              {pedidosFiltrados.map((pedido) => (
                <React.Fragment key={pedido.cod_pedido}>
                  <tr className="pedido-row" onClick={() => togglePedido(pedido.cod_pedido)}>
                    <td>
                      <span className={`expand-icon ${expandedPedidos.has(pedido.cod_pedido) ? 'expanded' : ''}`}>
                        ▶
                      </span>
                    </td>
                    <td className="pedido-cod">{pedido.cod_pedido}</td>
                    <td>{pedido.romaneio}</td>
                    <td>
                      <span className={`status-badge status-${pedido.situacao_pedido.toLowerCase().replace(' ', '-')}`}>
                        {pedido.situacao_pedido}
                      </span>
                    </td>
                    <td>{formatDateTime(pedido.dh_digitacao)}</td>
                    <td>{pedido.volumes.length}</td>
                    <td className="embarcado">{pedido.totalVolumesEmbarcados}</td>
                    <td className={`pendente ${pedido.totalVolumesPendentes > 0 ? 'pendente-realce' : ''}`}>
                      {pedido.totalVolumesPendentes}
                    </td>
                    <td className="valor">R$ {pedido.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {expandedPedidos.has(pedido.cod_pedido) && (
                    <tr className="volumes-row">
                      <td colSpan={9}>
                        <div className="volumes-container">
                          <div className="volumes-header">
                            <h4>Volumes do Pedido {pedido.cod_pedido}</h4>
                            <div className="volumes-filters">
                              <input
                                type="text"
                                placeholder="Filtrar por volume..."
                                value={filtroVolume}
                                onChange={(e) => setFiltroVolume(e.target.value)}
                                className="filter-input-small"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="status-filter-dropdown">
                                <button 
                                  className="status-filter-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleStatusDropdown(pedido.cod_pedido);
                                  }}
                                >
                                  Status: {statusVolumeSelecionados.size === 2 ? 'Todos' : 
                                           statusVolumeSelecionados.has('embarcado') ? 'Embarcado' : 
                                           statusVolumeSelecionados.has('pendente') ? 'Pendente' : 'Nenhum'}
                                  <span className="dropdown-arrow">▼</span>
                                </button>
                                {statusDropdownOpen[pedido.cod_pedido] && (
                                  <div className="status-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                    <label className="status-option">
                                      <input
                                        type="checkbox"
                                        checked={statusVolumeSelecionados.has('embarcado')}
                                        onChange={() => toggleStatusVolume('embarcado')}
                                      />
                                      <span>✓ Embarcado</span>
                                    </label>
                                    <label className="status-option">
                                      <input
                                        type="checkbox"
                                        checked={statusVolumeSelecionados.has('pendente')}
                                        onChange={() => toggleStatusVolume('pendente')}
                                      />
                                      <span>❌ A embarcar</span>
                                    </label>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <table className="table-volumes">
                            <thead>
                              <tr>
                                <th>Volume</th>
                                <th>Tipo</th>
                                <th>Início</th>
                                <th>Encerramento</th>
                                <th>Data Embarcado</th>
                                <th>Quem Embarcou</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filtrarVolumes(pedido.volumes).map((volume, idx) => (
                                <tr key={idx}>
                                  <td>{volume.volume}</td>
                                  <td>{volume.tipo_volume || '-'}</td>
                                  <td>{formatDateTime(volume.inicio)}</td>
                                  <td>{formatDateTime(volume.encerramento)}</td>
                                  <td>{formatDateTime(volume.data_embarque)}</td>
                                  <td>{volume.quem_embarcou || '-'}</td>
                                  <td>
                                    <span className={`volume-status ${volume.data_embarque ? 'embarcado' : 'pendente'}`}>
                                      {volume.data_embarque ? '✔ Embarcado' : '❌A embarcar'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {filtrarVolumes(pedido.volumes).length === 0 && (
                            <div className="empty-volumes">
                              Nenhum volume encontrado com os filtros aplicados.
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {pedidosFiltrados.length === 0 && (
            <div className="empty-results">
              Nenhum pedido encontrado com os filtros aplicados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalDetalhesTransportadora;
