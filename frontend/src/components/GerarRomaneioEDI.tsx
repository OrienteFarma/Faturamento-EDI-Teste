import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransportadoras, getRomaneioPorTransportadora, gerarPdfRomaneio, getEmailsAtivosPorTransportadora, getConfigsEdi } from '../services/api';
import { criarJobEnviarEmail } from '../services/jobService';
import Toast from './Toast';
import './GerarRomaneioEDI.css';

interface GerarRomaneioEDIProps {
  userData: {
    userName: string;
    userLogin: string;
  };
  onLogout: () => void;
}

interface Transportadora {
  cod_transportadora: number;
  nome_transportadora: string;
}

interface Romaneio {
  cod_entrega: number;
  cod_entrega_display: string;
  data_romaneio: string;
  total_rotas: number;
  total_romaneios: number;
  total_pedidos: number;
  total_volumes: number;
  volumes_pendentes: number;
  valor_total: number;
}

const GerarRomaneioEDI: React.FC<GerarRomaneioEDIProps> = ({ userData, onLogout }) => {
  const navigate = useNavigate();
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [transportadoraSelecionada, setTransportadoraSelecionada] = useState<number | null>(null);
  const [romaneios, setRomaneios] = useState<Romaneio[]>([]);
  const [romaneiosFiltrados, setRomaneiosFiltrados] = useState<Romaneio[]>([]);
  const [romaneiosSelecionados, setRomaneiosSelecionados] = useState<Romaneio[]>([]);
  const [filtroRomaneio, setFiltroRomaneio] = useState('');
  const [filtrarApenasPendentes, setFiltrarApenasPendentes] = useState(false);
  const [filtroData, setFiltroData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [showConfirmacaoModal, setShowConfirmacaoModal] = useState(false);
  const [dataParaAssunto, setDataParaAssunto] = useState('');
  const [emailsDestinatarios, setEmailsDestinatarios] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });

  console.log('GerarRomaneioEDI montado', { userData });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(!isDarkMode));
  };

  const handleLogout = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('isAuthenticated');
    onLogout();
    navigate('/login');
  };

  const handleVoltar = () => {
    navigate('/home');
  };

  // Carregar transportadoras ao montar
  useEffect(() => {
    carregarTransportadoras();
  }, []);

  // Filtrar romaneios quando o filtro muda
  useEffect(() => {
    if (filtroRomaneio.trim() === '') {
      setRomaneiosFiltrados(romaneios);
    } else {
      const filtrados = romaneios.filter(r => 
        r.cod_entrega.toString().includes(filtroRomaneio) ||
        r.cod_entrega_display.includes(filtroRomaneio)
      );
      setRomaneiosFiltrados(filtrados);
    }
  }, [filtroRomaneio, romaneios]);

  const carregarTransportadoras = async () => {
    try {
      const response = await getTransportadoras();
      if (response.erro) {
        console.error('Erro ao carregar transportadoras:', response.mensagemErro);
      } else {
        setTransportadoras(response.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar transportadoras:', error);
    }
  };

  const carregarRomaneios = async (codTransportadora: number) => {
    setIsLoading(true);
    try {
      console.log('Carregando romaneios para transportadora:', codTransportadora);
      const response = await getRomaneioPorTransportadora(codTransportadora);
      console.log('Resposta da API:', response);
      
      if (response.erro) {
        console.error('Erro ao carregar romaneios:', response.mensagemErro);
        setRomaneios([]);
        setRomaneiosFiltrados([]);
      } else {
        // Garantir que seja sempre array
        const dados = Array.isArray(response.data) ? response.data : [];
        console.log('Romaneios recebidos:', dados.length);
        setRomaneios(dados);
        setRomaneiosFiltrados(dados);
      }
    } catch (error) {
      console.error('Erro exception ao carregar romaneios:', error);
      setRomaneios([]);
      setRomaneiosFiltrados([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelecionarTransportadora = (codTransportadora: number) => {
    setTransportadoraSelecionada(codTransportadora);
    setRomaneiosSelecionados([]);
    setFiltroRomaneio('');
    setFiltrarApenasPendentes(false);
    setFiltroData('');
    carregarRomaneios(codTransportadora);
  };

  // Filtrar romaneios quando mudar o filtro ou a lista
  useEffect(() => {
    let resultado = [...romaneios];

    // Filtro por texto (código de entrega)
    if (filtroRomaneio.trim()) {
      resultado = resultado.filter(rom => 
        rom.cod_entrega_display.includes(filtroRomaneio.trim()) ||
        rom.cod_entrega.toString().includes(filtroRomaneio.trim())
      );
    }

    // Filtro por data
    if (filtroData) {
      resultado = resultado.filter(rom => rom.data_romaneio === filtroData);
    }

    // Filtro de apenas pendentes
    if (filtrarApenasPendentes) {
      resultado = resultado.filter(rom => rom.volumes_pendentes > 0);
    }

    setRomaneiosFiltrados(resultado);
  }, [filtroRomaneio, filtroData, filtrarApenasPendentes, romaneios]);

  const handleAdicionarRomaneio = (romaneio: Romaneio) => {
    // Verifica se já foi adicionado
    const jaAdicionado = romaneiosSelecionados.some(r => r.cod_entrega === romaneio.cod_entrega);
    
    if (jaAdicionado) {
      // Remove se já estava adicionado (toggle)
      setRomaneiosSelecionados(romaneiosSelecionados.filter(r => r.cod_entrega !== romaneio.cod_entrega));
    } else {
      // Adiciona se não estava
      setRomaneiosSelecionados([...romaneiosSelecionados, romaneio]);
    }
  };

  const handleRemoverRomaneio = (codEntrega: number) => {
    setRomaneiosSelecionados(romaneiosSelecionados.filter(r => r.cod_entrega !== codEntrega));
  };

  const isRomaneioSelecionado = (codEntrega: number) => {
    return romaneiosSelecionados.some(r => r.cod_entrega === codEntrega);
  };

  const handleAbrirModalConfirmacao = async () => {
    if (romaneiosSelecionados.length === 0) {
      setToast({ message: 'Selecione pelo menos um romaneio para gerar e enviar.', type: 'info' });
      return;
    }
    
    // Buscar emails ativos da transportadora
    if (transportadoraSelecionada) {
      try {
        const response = await getEmailsAtivosPorTransportadora(transportadoraSelecionada);
        if (response.erro || !response.data || response.data.length === 0) {
          setToast({ 
            message: 'Nenhum email ativo encontrado para esta transportadora. Configure os emails antes de enviar.', 
            type: 'error' 
          });
          return;
        }
        setEmailsDestinatarios(response.data);
      } catch (error) {
        console.error('Erro ao buscar emails:', error);
        setToast({ message: 'Erro ao buscar emails destinatários.', type: 'error' });
        return;
      }
    }
    
    setShowConfirmacaoModal(true);
  };

  const handleCancelarConfirmacao = () => {
    setShowConfirmacaoModal(false);
  };

  const handleConfirmarEnvio = async () => {
    // Validar se a data foi preenchida
    if (!dataParaAssunto || dataParaAssunto.trim() === '') {
      setToast({ message: 'Por favor, preencha a data do assunto antes de enviar.', type: 'error' });
      return;
    }

    try {
      setGerandoPdf(true);
      setShowConfirmacaoModal(false);

      const transportadora = transportadoras.find(t => t.cod_transportadora === transportadoraSelecionada);
      
      // Buscar configuração EDI da transportadora
      const configResponse = await getConfigsEdi({ codTransportadora: transportadoraSelecionada });
      const configEdi = configResponse.dados?.[0];

      // Extrair e converter datas dos romaneios selecionados
      // data_romaneio vem como "dd/mm/yyyy", precisa converter para "yyyy-mm-dd"
      const converterData = (dataStr: string) => {
        const [dia, mes, ano] = dataStr.split('/');
        return `${ano}-${mes}-${dia}`;
      };

      const datasRomaneios = romaneiosSelecionados
        .map(r => converterData(r.data_romaneio))
        .sort();
      
      const dataInicio = datasRomaneios[0]; // Primeira data (mais antiga)
      const dataFim = datasRomaneios[datasRomaneios.length - 1]; // Última data (mais recente)

      console.log('📅 Datas extraídas:', { dataInicio, dataFim, datasRomaneios });

      // Criar job assíncrono
      const response = await criarJobEnviarEmail({
        codTransportadora: transportadoraSelecionada,
        codigosEntrega: romaneiosSelecionados.map(r => r.cod_entrega),
        dataInicio: dataInicio,
        dataFim: dataFim,
        nomeTransportadora: transportadora?.nome_transportadora || 'Não informado',
        geraArquivoEdi: configEdi?.GERA_ARQUIVO_EDI === 1,
        userId: userData.userLogin
      });

      if (response.erro) {
        throw new Error(response.mensagemErro || 'Erro ao criar job');
      }

      // Adicionar notificação para monitorar o job
      if (window.addJobNotification && response.jobId) {
        window.addJobNotification(response.jobId);
      }

      setToast({ 
        message: `Processamento iniciado! Você será notificado quando concluir. Você pode continuar selecionando outras transportadoras.`, 
        type: 'success' 
      });
      
      // Limpar seleção
      setRomaneiosSelecionados([]);
      
    } catch (error) {
      console.error('Erro ao iniciar processamento:', error);
      setToast({ message: 'Erro ao iniciar processamento. Tente novamente.', type: 'error' });
    } finally {
      setGerandoPdf(false);
    }
  };

  const handleVisualizarPdf = async (codEntrega: number) => {
    try {
      setGerandoPdf(true);
      await gerarPdfRomaneio(codEntrega);
      setToast({ message: 'PDF gerado e aberto em nova aba!', type: 'success' });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setToast({ message: 'Erro ao gerar PDF. Tente novamente.', type: 'error' });
    } finally {
      setGerandoPdf(false);
    }
  };

  const calcularTotais = () => {
    return romaneiosSelecionados.reduce((acc, rom) => {
      acc.volumes += rom.total_volumes;
      acc.valor += rom.valor_total;
      return acc;
    }, { volumes: 0, valor: 0 });
  };

  return (
    <div className="gerar-romaneio-container">
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

      <main className="gerar-romaneio-main">
        <div className="page-header">
          <button onClick={handleVoltar} className="btn-voltar">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Voltar
          </button>
          <h1>Gerar Romaneio e EDI</h1>
        </div>

        <div className="content-wrapper">
          {/* Seleção de Transportadora */}
          <section className="section-transportadora">
            <h2>1. Selecione a Transportadora</h2>
            <div className="transportadoras-list">
              {transportadoras.map(transp => (
                <button
                  key={transp.cod_transportadora}
                  className={`transportadora-item ${transportadoraSelecionada === transp.cod_transportadora ? 'selected' : ''}`}
                  onClick={() => handleSelecionarTransportadora(transp.cod_transportadora)}
                >
                  <span className="transp-codigo">{transp.cod_transportadora}</span>
                  <span className="transp-nome">{transp.nome_transportadora}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Listagem de Romaneios */}
          {transportadoraSelecionada && (
            <section className="section-romaneios">
              <h2>2. Selecione os Romaneios</h2>
              
              <div className="filtros-container">
                <input
                  type="text"
                  placeholder="Filtrar por número do romaneio..."
                  value={filtroRomaneio}
                  onChange={(e) => setFiltroRomaneio(e.target.value)}
                  className="input-filtro"
                />
                
                <input
                  type="date"
                  value={filtroData}
                  onChange={(e) => setFiltroData(e.target.value ? new Date(e.target.value + 'T00:00:00').toLocaleDateString('pt-BR') : '')}
                  className="input-filtro-data"
                  title="Filtrar por data"
                />
                
                <label className="checkbox-filtro">
                  <input
                    type="checkbox"
                    checked={filtrarApenasPendentes}
                    onChange={(e) => setFiltrarApenasPendentes(e.target.checked)}
                  />
                  <span>Apenas com volumes pendentes</span>
                </label>
              </div>

              {isLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Carregando romaneios...</p>
                </div>
              ) : (
                <div className="romaneios-list">
                  {romaneiosFiltrados.length === 0 ? (
                    <p className="empty-message">Nenhum romaneio encontrado.</p>
                  ) : (
                    romaneiosFiltrados.map(romaneio => (
                      <div
                        key={romaneio.cod_entrega}
                        className={`romaneio-item ${isRomaneioSelecionado(romaneio.cod_entrega) ? 'added' : ''} ${romaneio.volumes_pendentes > 0 ? 'com-pendencias' : ''}`}
                        onClick={() => handleAdicionarRomaneio(romaneio)}
                      >
                        <div className="romaneio-header">
                          <div className="romaneio-numero-container">
                            <span className="romaneio-numero">{romaneio.cod_entrega_display}</span>
                            <span className="romaneio-entrega">{romaneio.total_romaneios} entrega(s)</span>
                            <span className="romaneio-data">📅 {romaneio.data_romaneio}</span>
                          </div>
                          <div className="romaneio-actions">
                            <button
                              className="btn-visualizar-pdf"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVisualizarPdf(romaneio.cod_entrega);
                              }}
                              disabled={gerandoPdf}
                              title="Visualizar PDF"
                            >
                              <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              PDF
                            </button>
                          </div>
                          {romaneio.volumes_pendentes > 0 && (
                            <span className="badge-pendencia">
                              {romaneio.volumes_pendentes} vol. pendente(s)
                            </span>
                          )}
                          {isRomaneioSelecionado(romaneio.cod_entrega) && (
                            <span className="badge-adicionado">✓ Adicionado</span>
                          )}
                        </div>
                        <div className="romaneio-info">
                          <span>Qtd. Rotas: {romaneio.total_rotas}</span>
                          <span>Pedidos: {romaneio.total_pedidos}</span>
                          <span>Volumes: {romaneio.total_volumes}</span>
                          <span>Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(romaneio.valor_total || 0)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          )}

          {/* Romaneios Selecionados */}
          {romaneiosSelecionados.length > 0 && (
            <section className="section-selecionados">
              <div className="selecionados-header">
                <h2>3. Romaneios Selecionados ({romaneiosSelecionados.length})</h2>
                <button
                  className="btn-gerar-todos"
                  onClick={handleAbrirModalConfirmacao}
                  disabled={gerandoPdf}
                >
                  {gerandoPdf ? 'Processando...' : 'Gerar e Enviar por Email'}
                </button>
              </div>
              <div className="selecionados-list">
                {romaneiosSelecionados.map(romaneio => (
                  <div key={romaneio.cod_entrega} className="selecionado-item">
                    <div className="selecionado-info">
                      <span className="numero">#{romaneio.cod_entrega_display}</span>
                      <span className="rota">{romaneio.total_rotas} rota(s)</span>
                      <span className="volumes">{romaneio.total_volumes} volumes</span>
                      <span className="valor">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(romaneio.valor_total || 0)}</span>
                      {romaneio.volumes_pendentes > 0 && (
                        <span className="pendencias">⚠️ {romaneio.volumes_pendentes} pendente(s)</span>
                      )}
                    </div>
                    <div className="selecionado-actions">
                      <button
                        className="btn-remover"
                        onClick={() => handleRemoverRomaneio(romaneio.cod_entrega)}
                        title="Remover"
                      >
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Modal de Confirmação */}
      {showConfirmacaoModal && (
        <div className="modal-overlay" onClick={handleCancelarConfirmacao}>
          <div className="modal-content modal-confirmacao" onClick={(e) => e.stopPropagation()}>
            <h2>Confirmar Envio</h2>
            <p>Você está prestes a gerar e enviar os seguintes romaneios por email:</p>
            
            <div className="confirmacao-info">
              <div className="info-item">
                <strong>Transportadora:</strong>
                <span>{transportadoras.find(t => t.cod_transportadora === transportadoraSelecionada)?.nome_transportadora}</span>
              </div>
              
              <div className="info-item">
                <strong>Quantidade de romaneios:</strong>
                <span>{romaneiosSelecionados.length}</span>
              </div>
              
              <div className="info-item">
                <strong>Total de volumes:</strong>
                <span>{calcularTotais().volumes}</span>
              </div>
              
              <div className="info-item">
                <strong>Valor total:</strong>
                <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calcularTotais().valor)}</span>
              </div>
            </div>

            <div className="romaneios-lista-confirmacao">
              <strong>Códigos de entrega:</strong>
              <div className="codigos-grid">
                {romaneiosSelecionados.map(rom => (
                  <span key={rom.cod_entrega} className="codigo-badge">
                    {rom.cod_entrega_display}
                  </span>
                ))}
              </div>
            </div>

            <div className="email-info">
              <div style={{ marginBottom: '1rem' }}>
                <p><strong>Destinatário(s):</strong></p>
                <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {emailsDestinatarios.map((email, index) => (
                    <span key={index} className="codigo-badge" style={{ fontSize: '0.8125rem' }}>
                      {email}
                    </span>
                  ))}
                </div>
              </div>
              <p><strong>Assunto:</strong> ORIENTE FARMA - Envio de Romaneio/EDI - {transportadoras.find(t => t.cod_transportadora === transportadoraSelecionada)?.nome_transportadora} - {dataParaAssunto ? new Date(dataParaAssunto + 'T12:00:00').toLocaleDateString('pt-BR') : '[Selecione a data]'}</p>
              
              <div className="input-data-assunto">
                <label htmlFor="dataAssunto"><strong>Data do Assunto: <span style={{color: '#ef4444'}}>*</span></strong></label>
                <input 
                  type="date" 
                  id="dataAssunto"
                  value={dataParaAssunto}
                  onChange={(e) => setDataParaAssunto(e.target.value)}
                  className="input-filtro-data"
                  required
                />
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-cancelar" 
                onClick={handleCancelarConfirmacao}
                disabled={gerandoPdf}
              >
                Cancelar
              </button>
              <button 
                className="btn-confirmar" 
                onClick={handleConfirmarEnvio}
                disabled={gerandoPdf || !dataParaAssunto || dataParaAssunto.trim() === ''}
              >
                {gerandoPdf ? 'Processando...' : 'Confirmar e Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

    </div>
  );
};

export default GerarRomaneioEDI;
