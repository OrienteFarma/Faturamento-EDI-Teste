import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRelatorioRomaneio, getVisaoTransportadoras, getDetalhesTransportadora } from '../services/api';
import Modal from './Modal';
import ModalDetalhesTransportadora from './ModalDetalhesTransportadora';
import './Home.css';

// Lista de usuários com permissão de administrador (lida do .env via import.meta.env)
const ADMIN_USERS = (import.meta.env.VITE_ADMIN_USERS || 'adalbertosilva,albertojunio')
  .split(',')
  .map(u => u.trim().toLowerCase())
  .filter(Boolean);

interface HomeProps {
  userData: {
    userName: string;
    userLogin: string;
  };
  onLogout: () => void;
}

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
  dadosCompletos: any[];
  todosPedidos: PedidoDetalhes[];
}

const Home: React.FC<HomeProps> = ({ userData, onLogout }) => {
  const navigate = useNavigate();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [transportadoras, setTransportadoras] = useState<TransportadoraAgrupada[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCards, setLoadingCards] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'error' | 'success'>('error');
  const [transportadoraSelecionada, setTransportadoraSelecionada] = useState<TransportadoraAgrupada | null>(null);
  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true; // Dark mode ativado por padrão
  });

  // Calcula data mínima permitida (3 meses atrás, dia 1)
  const getDataMinima = () => {
    const hoje = new Date();
    const dataMinima = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    return dataMinima.toISOString().split('T')[0];
  };

  const dataMinima = getDataMinima();

  useEffect(() => {
    // Define data atual
    const hoje = new Date().toISOString().split('T')[0];
    setDataInicio(hoje);
    setDataFim(hoje);
    
    // Carrega dados inicial apenas se não houver dados carregados (primeiro acesso após login)
    if (transportadoras.length === 0) {
      carregarRelatorio(hoje, hoje);
    }
  }, []);

  useEffect(() => {
    // Aplica ou remove o dark mode
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
    // Salva preferência
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const carregarRelatorio = async (inicio: string, fim: string) => {
    setIsLoading(true);
    try {
      const response = await getVisaoTransportadoras(inicio, fim);
      
      if (response.erro) {
        setModalMessage(response.mensagemErro || 'Erro ao carregar relatório.');
        setModalType('error');
        setModalOpen(true);
        setTransportadoras([]);
      } else {
        const dados = response.data || [];
        
        // Verifica se há dados
        if (dados.length === 0) {
          setTransportadoras([]);
        } else {
          // Transforma dados agregados em formato esperado pelos cards
          const transportadorasFormatadas = dados.map((item: any) => ({
            nome: item.nome_transportadora || 'Sem Transportadora',
            cod_transportador: item.cod_transportadora || 0,
            romaneios: [],
            totalPedidos: item.total_pedidos || 0,
            totalVolumes: item.total_volumes || 0,
            totalVolumesEmbarcados: item.volumes_embarcados || 0,
            totalVolumesPendentes: item.volumes_pendentes || 0,
            totalValor: parseFloat(item.valor_total) || 0,
            percentualConclusao: item.total_volumes > 0 
              ? Math.round((item.volumes_embarcados / item.total_volumes) * 100) 
              : 0,
            dadosCompletos: [],
            todosPedidos: [],
            _detalhesCarregados: false // Flag para controlar se já carregou detalhes
          }));
          
          setTransportadoras(transportadorasFormatadas);
        }
      }
    } catch (error) {
      setModalMessage('Erro ao carregar relatório.');
      setModalType('error');
      setModalOpen(true);
      setTransportadoras([]);
    } finally {
      setIsLoading(false);
    }
  };

  const agruparPorTransportadora = (dados: any[]) => {
    const agrupado: { [key: string]: TransportadoraAgrupada } = {};

    // Debug: verificar se há registros sem transportadora
    const semTransportadora = dados.filter(d => {
      const temNome = d.nome_transportadora && d.nome_transportadora.trim();
      const temCod = d.cod_transportadora;
      return !temNome || !temCod;
    });
    
    if (semTransportadora.length > 0) {
      console.warn('⚠️ FRONTEND: Encontrados registros sem transportadora:', semTransportadora.length);
      console.log('Exemplo completo:', semTransportadora[0]);
      console.log('Campos do exemplo:', {
        cod_pedido: semTransportadora[0].cod_pedido,
        nome_transportadora: semTransportadora[0].nome_transportadora,
        cod_transportadora: semTransportadora[0].cod_transportadora,
        data_embarque: semTransportadora[0].data_embarque,
        cod_romaneio: semTransportadora[0].cod_romaneio
      });
    } else {
      console.log('✅ FRONTEND: Todos os registros têm transportadora');
    }

    dados.forEach(item => {
      // Trata string vazia, null, undefined e espaços em branco
      const nomeTransp = (item.nome_transportadora && item.nome_transportadora.trim()) || 'Sem Transportadora';
      const codTransp = item.cod_transportadora || item.cod_transportador || 0;
      
      if (!agrupado[nomeTransp]) {
        agrupado[nomeTransp] = {
          nome: nomeTransp,
          cod_transportador: codTransp,
          romaneios: [],
          totalPedidos: 0,
          totalVolumes: 0,
          totalVolumesEmbarcados: 0,
          totalVolumesPendentes: 0,
          totalValor: 0,
          percentualConclusao: 0,
          dadosCompletos: [],
          todosPedidos: [] // Inicializa array de todos os pedidos
        };
      }

      agrupado[nomeTransp].dadosCompletos.push(item);
    });

    // Processa cada transportadora
    const resultado = Object.values(agrupado).map(transp => {
      // Agrupa por romaneio -> pedido -> volume
      const pedidosMap: { [key: number]: PedidoDetalhes } = {};
      const romaneiosMap: { [key: number]: RomaneioDetalhado } = {};

      transp.dadosCompletos.forEach(item => {
        // Agrupa pedidos
        if (!pedidosMap[item.cod_pedido]) {
          pedidosMap[item.cod_pedido] = {
            cod_pedido: item.cod_pedido,
            situacao_pedido: item.situacao_pedido,
            dh_digitacao: item.dh_digitacao,
            dh_ordem_movimentacao: item.dh_ordem_movimentacao,
            dh_encerramento_movimentacao: item.dh_encerramento_movimentacao,
            pedido_volumes: item.pedido_volumes,
            valor_total: parseFloat(item.valor_total) || 0,
            volumes: [],
            totalVolumesEmbarcados: 0,
            totalVolumesPendentes: 0
          };
        }

        // Adiciona volume ao pedido
        const volumeEmbarcado = item.data_embarque !== null;
        pedidosMap[item.cod_pedido].volumes.push({
          volume: item.volume,
          inicio: item.inicio,
          encerramento: item.encerramento,
          data_embarque: item.data_embarque,
          quem_embarcou: item.quem_embarcou,
          tipo_volume: item.tipo_volume
        });

        if (volumeEmbarcado) {
          pedidosMap[item.cod_pedido].totalVolumesEmbarcados++;
        } else {
          pedidosMap[item.cod_pedido].totalVolumesPendentes++;
        }

        // Agrupa romaneios
        if (item.cod_romaneio && !romaneiosMap[item.cod_romaneio]) {
          romaneiosMap[item.cod_romaneio] = {
            cod_romaneio: item.cod_romaneio,
            rota: item.rota,
            pedidos: []
          };
        }
      });

      // Organiza pedidos dentro dos romaneios
      Object.values(pedidosMap).forEach(pedido => {
        const primeiroItem = transp.dadosCompletos.find((d: any) => d.cod_pedido === pedido.cod_pedido);
        if (primeiroItem && primeiroItem.cod_romaneio && romaneiosMap[primeiroItem.cod_romaneio]) {
          romaneiosMap[primeiroItem.cod_romaneio].pedidos.push(pedido);
        }
      });

      transp.romaneios = Object.values(romaneiosMap);
      transp.totalPedidos = Object.keys(pedidosMap).length;
      
      // Adiciona TODOS os pedidos na propriedade todosPedidos
      transp.todosPedidos = Object.values(pedidosMap).map(pedido => {
        // Garante que a contagem de volumes está correta
        const volumesReais = pedido.volumes.length;
        const embarcadosReais = pedido.volumes.filter(v => v.data_embarque !== null).length;
        const pendentesReais = pedido.volumes.filter(v => v.data_embarque === null).length;
        
        // Debug para pedidos com inconsistência
        if (volumesReais === 0 && pedido.pedido_volumes > 0) {
          console.warn(`⚠️ Pedido ${pedido.cod_pedido}: pedido_volumes=${pedido.pedido_volumes} mas volumes.length=${volumesReais}`);
        }
        
        return {
          ...pedido,
          totalVolumesEmbarcados: embarcadosReais,
          totalVolumesPendentes: pendentesReais
        };
      });
      
      // Calcula totais
      Object.values(pedidosMap).forEach(pedido => {
        transp.totalVolumes += pedido.volumes.length;
        transp.totalVolumesEmbarcados += pedido.totalVolumesEmbarcados;
        transp.totalVolumesPendentes += pedido.totalVolumesPendentes;
        transp.totalValor += pedido.valor_total;
      });

      // Calcula percentual de conclusão
      transp.percentualConclusao = transp.totalVolumes > 0
        ? Math.round((transp.totalVolumesEmbarcados / transp.totalVolumes) * 100)
        : 0;

      return transp;
    });

    setTransportadoras(resultado);
  };

  const getProgressColor = (percentual: number): string => {
    if (percentual >= 100) return '#10b981'; // Verde
    if (percentual >= 80) return '#3b82f6'; // Azul
    if (percentual >= 50) return '#f59e0b'; // Laranja
    return '#ef4444'; // Vermelho
  };

  const handleCardClick = async (transportadora: TransportadoraAgrupada) => {
    // Se já carregou detalhes antes, apenas abre o modal
    if ((transportadora as any)._detalhesCarregados) {
      setTransportadoraSelecionada(transportadora);
      setModalDetalhesOpen(true);
      return;
    }

    // Marca como loading
    setLoadingCards(prev => new Set(prev).add(transportadora.cod_transportador));

    try {
      // Busca detalhes da transportadora
      const response = await getDetalhesTransportadora(
        transportadora.cod_transportador,
        dataInicio,
        dataFim
      );

      if (response.erro) {
        setModalMessage(response.mensagemErro || 'Erro ao carregar detalhes.');
        setModalType('error');
        setModalOpen(true);
        return;
      }

      const dados = response.data || [];
      console.log(`📦 Processando ${dados.length} registros...`);

      // Agrupa os dados detalhados
      const transportadoraComDetalhes = { ...transportadora };
      transportadoraComDetalhes.dadosCompletos = dados;

      // Processa os dados em lote para não travar a UI
      const pedidosMap: { [key: number]: PedidoDetalhes } = {};
      const romaneiosMap: { [key: number]: RomaneioDetalhado } = {};

      const LOTE_SIZE = 1000;
      for (let i = 0; i < dados.length; i += LOTE_SIZE) {
        const lote = dados.slice(i, i + LOTE_SIZE);
        
        // Aguarda próximo frame para não travar a UI
        await new Promise(resolve => setTimeout(resolve, 0));
        
        lote.forEach((item: any) => {
          // Agrupa pedidos
          if (!pedidosMap[item.cod_pedido]) {
            pedidosMap[item.cod_pedido] = {
              cod_pedido: item.cod_pedido,
              situacao_pedido: item.situacao_pedido,
              dh_digitacao: item.dh_digitacao,
              dh_ordem_movimentacao: item.dh_ordem_movimentacao,
              dh_encerramento_movimentacao: item.dh_encerramento_movimentacao,
              pedido_volumes: item.pedido_volumes,
              valor_total: parseFloat(item.valor_total) || 0,
              volumes: [],
              totalVolumesEmbarcados: 0,
              totalVolumesPendentes: 0
            };
          }

          // Adiciona volume ao pedido
          const volumeEmbarcado = item.data_embarque !== null;
          pedidosMap[item.cod_pedido].volumes.push({
            volume: item.volume,
            inicio: item.inicio,
            encerramento: item.encerramento,
            data_embarque: item.data_embarque,
            quem_embarcou: item.quem_embarcou,
            tipo_volume: item.tipo_volume
          });

          if (volumeEmbarcado) {
            pedidosMap[item.cod_pedido].totalVolumesEmbarcados++;
          } else {
            pedidosMap[item.cod_pedido].totalVolumesPendentes++;
          }

          // Agrupa romaneios
          if (item.cod_romaneio && !romaneiosMap[item.cod_romaneio]) {
            romaneiosMap[item.cod_romaneio] = {
              cod_romaneio: item.cod_romaneio,
              rota: item.rota,
              pedidos: []
            };
          }
        });
      }

      console.log(`✅ Processamento concluído: ${Object.keys(pedidosMap).length} pedidos`);

      // Organiza pedidos dentro dos romaneios
      Object.values(pedidosMap).forEach(pedido => {
        const primeiroItem = dados.find((d: any) => d.cod_pedido === pedido.cod_pedido);
        if (primeiroItem && primeiroItem.cod_romaneio && romaneiosMap[primeiroItem.cod_romaneio]) {
          romaneiosMap[primeiroItem.cod_romaneio].pedidos.push(pedido);
        }
      });

      transportadoraComDetalhes.romaneios = Object.values(romaneiosMap);
      transportadoraComDetalhes.todosPedidos = Object.values(pedidosMap);
      (transportadoraComDetalhes as any)._detalhesCarregados = true;

      // Atualiza a transportadora no estado
      setTransportadoras(prev => 
        prev.map(t => 
          t.cod_transportador === transportadora.cod_transportador 
            ? transportadoraComDetalhes 
            : t
        )
      );

      // Abre o modal com os detalhes
      setTransportadoraSelecionada(transportadoraComDetalhes);
      setModalDetalhesOpen(true);

    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      setModalMessage('Erro ao carregar detalhes da transportadora.');
      setModalType('error');
      setModalOpen(true);
    } finally {
      // Remove do loading
      setLoadingCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(transportadora.cod_transportador);
        return newSet;
      });
    }
  };

  const handleFiltrar = () => {
    if (!dataInicio || !dataFim) {
      setModalMessage('Por favor, preencha as datas.');
      setModalType('error');
      setModalOpen(true);
      return;
    }
    carregarRelatorio(dataInicio, dataFim);
  };

  const handleLogout = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('isAuthenticated');
    onLogout();
    navigate('/login');
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <div className="header-logo">
            <img 
              src="https://bussola.orientefarma.com.br/assets/images/ORIENTE-MARCA-FINAL.png" 
              alt="Oriente Farma" 
              className="header-logo-image"
            />
          </div>
          <div className="header-user">
            <div className="user-info">
              <span className="user-name">{userData.userName.toLocaleUpperCase()}</span>
              <span className="user-login">{userData.userLogin.toLocaleLowerCase()}</span>
            </div>
            <button onClick={toggleDarkMode} className="theme-toggle-button" title={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}>
              {isDarkMode ? (
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 3V4M12 20V21M4 12H3M6.31412 6.31412L5.5 5.5M17.6859 6.31412L18.5 5.5M6.31412 17.69L5.5 18.5M17.6859 17.69L18.5 18.5M21 12H20M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor"/>
                </svg>
              )}
            </button>
            <button onClick={handleLogout} className="logout-button">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="home-main">
        <div className="filters-section">
          <div className="filters-header">
            <h2>Relatório de Romaneios</h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {ADMIN_USERS.includes(userData.userLogin?.toLowerCase()) && (
                <button onClick={() => navigate('/gerenciar-emails')} className="btn-gerar-edi" style={{ background: '#10b981' }}>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C19.5304 19 20.0391 18.7893 20.4142 18.4142C20.7893 18.0391 21 17.5304 21 17V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Gerenciar Transportadoras
                </button>
              )}
              <button onClick={() => navigate('/gerar-romaneio-edi')} className="btn-gerar-edi">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M9 12H15M12 9V15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Gerar Romaneio/EDI
              </button>
            </div>
          </div>
          <div className="filters-container">
            <div className="filter-group">
              <label htmlFor="dataInicio">Data Início</label>
              <input
                id="dataInicio"
                type="date"
                value={dataInicio}
                min={dataMinima}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDataInicio(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="dataFim">Data Fim</label>
              <input
                id="dataFim"
                type="date"
                value={dataFim}
                min={dataMinima}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDataFim(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <button onClick={handleFiltrar} disabled={isLoading} className="filter-button">
              {isLoading ? 'Carregando...' : 'Consultar'}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando relatório...</p>
          </div>
        ) : transportadoras.length > 0 ? (
          <div className="transportadoras-grid">
            {transportadoras.map((transp, index) => {
              const isCardLoading = loadingCards.has(transp.cod_transportador);
              return (
                <div 
                  key={index} 
                  className={`transportadora-card ${isCardLoading ? 'loading' : ''}`}
                  onClick={() => !isCardLoading && handleCardClick(transp)}
                  style={{ cursor: isCardLoading ? 'wait' : 'pointer' }}
                >
                  {isCardLoading && (
                    <div className="card-loading-overlay">
                      <div className="loading-spinner"></div>
                      <span>Carregando detalhes...</span>
                    </div>
                  )}
                  <div className="transportadora-header">
                    <h3>{transp.nome}</h3>
                    <span className="romaneios-count">
                      {(transp as any)._detalhesCarregados ? `${transp.romaneios.length} romaneio(s)` : 'Clique para detalhes'}
                    </span>
                  </div>
                <div className="transportadora-body">
                  <div className="chart-container">
                    <svg viewBox="0 0 100 100" className="circular-chart">
                      <circle
                        className="circle-bg"
                        cx="50"
                        cy="50"
                        r="45"
                      />
                      <circle
                        className="circle-progress"
                        cx="50"
                        cy="50"
                        r="45"
                        strokeDasharray={`${transp.percentualConclusao * 2.827} 282.7`}
                        style={{ stroke: getProgressColor(transp.percentualConclusao) }}
                      />
                    </svg>
                    <div className="chart-label">
                      <span className="percentage" style={{ color: getProgressColor(transp.percentualConclusao) }}>
                        {transp.percentualConclusao}%
                      </span>
                      <span className="label-text">Concluído</span>
                    </div>
                  </div>
                  <div className="transportadora-stats">
                    <div className="stats-top-row">
                      <div className="stat-item">
                        <span className="stat-label">Pedidos</span>
                        <span className="stat-value">{transp.totalPedidos}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Volumes</span>
                        <span className="stat-value">{transp.totalVolumes}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Pendentes</span>
                        <span className="stat-value warning">{transp.totalVolumesPendentes}</span>
                      </div>
                    </div>
                    <div className="stat-item stat-total">
                      <span className="stat-label">Valor Total</span>
                      <span className="stat-value">R$ {transp.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>Nenhum romaneio encontrado para o período selecionado.</p>
          </div>
        )}
      </main>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalType === 'error' ? 'Erro' : 'Sucesso'}
        type={modalType}
      >
        <p style={{ margin: 0 }}>{modalMessage}</p>
      </Modal>

      {transportadoraSelecionada && (
        <ModalDetalhesTransportadora
          isOpen={modalDetalhesOpen}
          onClose={() => {
            setModalDetalhesOpen(false);
            setTransportadoraSelecionada(null);
          }}
          transportadora={transportadoraSelecionada}
        />
      )}

      <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-info">
            <p className="footer-title">Sistema de Romaneio/EDI - Oriente Farma</p>
            <p className="footer-copyright">© 2026 Oriente Farma. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
