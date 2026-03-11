import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getConfigsEdi, 
  adicionarConfigEdi, 
  atualizarConfigEdi,
  atualizarStatusConfigEdi,
  deletarConfigEdi,
  getTransportadoras
} from '../services/api';
import './GerenciarConfigsEDI.css';

interface ConfigEdi {
  ID: number;
  COD_TRANSPORTADORA: number;
  NOME_TRANSPORTADORA: string;
  NOME_ABREVIADO: string;
  TIPO_LAYOUT: string;
  GERA_ARQUIVO_EDI: number;
  ATIVO: number;
  DATA_CRIACAO: string;
  DATA_ALTERACAO: string;
}

interface Transportadora {
  cod_transportadora: number;
  nome_transportadora: string;
}

interface GerenciarConfigsEDIProps {
  userData: {
    userName: string;
    userLogin: string;
  };
  onLogout: () => void;
}

const GerenciarConfigsEDI: React.FC<GerenciarConfigsEDIProps> = ({ userData, onLogout }) => {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<ConfigEdi[]>([]);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<ConfigEdi | null>(null);
  const [configToEdit, setConfigToEdit] = useState<ConfigEdi | null>(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  // Aplicar dark mode ao carregar
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem('darkMode', newMode.toString());
      if (newMode) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
      return newMode;
    });
  };

  // Filtros
  const [filtroTransportadora, setFiltroTransportadora] = useState('');
  const [filtroLayout, setFiltroLayout] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('');

  // Formulário nova config
  const [novaConfig, setNovaConfig] = useState({
    codTransportadora: '',
    nomeAbreviado: '',
    tipoLayout: 'VER002',
    geraArquivoEdi: 1,
    ativo: 1
  });

  // Formulário edição
  const [editConfig, setEditConfig] = useState({
    nomeAbreviado: '',
    tipoLayout: '',
    geraArquivoEdi: 1,
    ativo: 1
  });

  useEffect(() => {
    carregarTransportadoras();
    carregarConfigs();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 10000);
  };

  const carregarTransportadoras = async () => {
    try {
      const response = await getTransportadoras();
      if (!response.erro && response.dados) {
        setTransportadoras(response.dados);
      }
    } catch (error) {
      console.error('Erro ao carregar transportadoras:', error);
    }
  };

  const carregarConfigs = async () => {
    try {
      setLoading(true);
      const filtros: any = {};
      if (filtroTransportadora) filtros.codTransportadora = filtroTransportadora;
      if (filtroLayout) filtros.tipoLayout = filtroLayout;
      if (filtroAtivo !== '') filtros.ativo = filtroAtivo;

      const response = await getConfigsEdi(filtros);
      if (!response.erro && response.dados) {
        setConfigs(response.dados);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      showToast('Erro ao carregar configurações', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdicionarConfig = async () => {
    try {
      if (!novaConfig.codTransportadora || !novaConfig.nomeAbreviado) {
        showToast('Preencha todos os campos obrigatórios', 'error');
        return;
      }

      const response = await adicionarConfigEdi(
        parseInt(novaConfig.codTransportadora),
        novaConfig.nomeAbreviado,
        novaConfig.tipoLayout,
        novaConfig.geraArquivoEdi,
        novaConfig.ativo
      );

      if (!response.erro) {
        showToast('Configuração adicionada com sucesso!', 'success');
        setShowModal(false);
        setNovaConfig({
          codTransportadora: '',
          nomeAbreviado: '',
          tipoLayout: 'VER002',
          geraArquivoEdi: 1,
          ativo: 1
        });
        carregarConfigs();
      } else {
        showToast(response.mensagemErro || 'Erro ao adicionar configuração', 'error');
      }
    } catch (error: any) {
      console.error('Erro ao adicionar configuração:', error);
      showToast(error.message || 'Erro ao adicionar configuração', 'error');
    }
  };

  const handleEditarConfig = async () => {
    if (!configToEdit) return;

    try {
      if (!editConfig.nomeAbreviado) {
        showToast('Preencha todos os campos obrigatórios', 'error');
        return;
      }

      const response = await atualizarConfigEdi(
        configToEdit.ID,
        editConfig.nomeAbreviado,
        editConfig.tipoLayout,
        editConfig.geraArquivoEdi,
        editConfig.ativo
      );

      if (!response.erro) {
        showToast('Configuração atualizada com sucesso!', 'success');
        setShowEditModal(false);
        setConfigToEdit(null);
        carregarConfigs();
      } else {
        showToast(response.mensagemErro || 'Erro ao atualizar configuração', 'error');
      }
    } catch (error: any) {
      console.error('Erro ao atualizar configuração:', error);
      showToast(error.message || 'Erro ao atualizar configuração', 'error');
    }
  };

  const handleToggleStatus = async (config: ConfigEdi) => {
    try {
      const novoStatus = config.ATIVO === 1 ? 0 : 1;
      const response = await atualizarStatusConfigEdi(config.ID, novoStatus);

      if (!response.erro) {
        showToast(
          novoStatus === 1 ? 'Configuração ativada!' : 'Configuração desativada!',
          'success'
        );
        carregarConfigs();
      } else {
        showToast(response.mensagemErro || 'Erro ao atualizar status', 'error');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      showToast('Erro ao atualizar status', 'error');
    }
  };

  const handleDeleteConfig = async () => {
    if (!configToDelete) return;

    try {
      const response = await deletarConfigEdi(configToDelete.ID);

      if (!response.erro) {
        showToast('Configuração deletada com sucesso!', 'success');
        setShowDeleteModal(false);
        setConfigToDelete(null);
        carregarConfigs();
      } else {
        showToast(response.mensagemErro || 'Erro ao deletar configuração', 'error');
      }
    } catch (error) {
      console.error('Erro ao deletar configuração:', error);
      showToast('Erro ao deletar configuração', 'error');
    }
  };

  const openEditModal = (config: ConfigEdi) => {
    setConfigToEdit(config);
    setEditConfig({
      nomeAbreviado: config.NOME_ABREVIADO,
      tipoLayout: config.TIPO_LAYOUT,
      geraArquivoEdi: config.GERA_ARQUIVO_EDI,
      ativo: config.ATIVO
    });
    setShowEditModal(true);
  };

  const limparFiltros = () => {
    setFiltroTransportadora('');
    setFiltroLayout('');
    setFiltroAtivo('');
  };

  useEffect(() => {
    carregarConfigs();
  }, [filtroTransportadora, filtroLayout, filtroAtivo]);

  return (
    <div className="gerenciar-configs-edi-container">
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
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            <button onClick={onLogout} className="logout-button">Sair</button>
          </div>
        </div>
      </header>

      <div className="gerenciar-configs-edi">
        <div className="configs-edi-header">
          <div className="configs-title-section">
            <button onClick={() => navigate('/gerenciar-emails')} className="btn-voltar-configs">
              ← Voltar
            </button>
            <h2>Configurações EDI</h2>
          </div>
          <button className="btn-adicionar" onClick={() => setShowModal(true)}>
            + Nova Configuração
          </button>
        </div>

      {/* Filtros */}
      <div className="filtros-configs">
        <div className="filtro-group">
          <label>Transportadora:</label>
          <select
            value={filtroTransportadora}
            onChange={(e) => setFiltroTransportadora(e.target.value)}
          >
            <option value="">Todas</option>
            {transportadoras.map((t) => (
              <option key={t.cod_transportadora} value={t.cod_transportadora}>
                {t.cod_transportadora} - {t.nome_transportadora}
              </option>
            ))}
          </select>
        </div>

        <div className="filtro-group">
          <label>Layout:</label>
          <select value={filtroLayout} onChange={(e) => setFiltroLayout(e.target.value)}>
            <option value="">Todos</option>
            <option value="VER002">VER002</option>
            <option value="GERAL">GERAL</option>
          </select>
        </div>

        <div className="filtro-group">
          <label>Status:</label>
          <select value={filtroAtivo} onChange={(e) => setFiltroAtivo(e.target.value)}>
            <option value="">Todos</option>
            <option value="1">Ativo</option>
            <option value="0">Inativo</option>
          </select>
        </div>

        <button className="btn-limpar-filtros" onClick={limparFiltros}>
          Limpar Filtros
        </button>
      </div>

      {/* Tabela */}
      <div className="configs-table-container">
        {loading ? (
          <div className="loading">Carregando...</div>
        ) : (
          <table className="configs-table">
            <thead>
              <tr>
                <th>Cód. Transp.</th>
                <th>Transportadora</th>
                <th>Nome Abreviado</th>
                <th>Layout</th>
                <th>Gera Arquivo</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {configs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="sem-dados">
                    Nenhuma configuração encontrada
                  </td>
                </tr>
              ) : (
                configs.map((config) => (
                  <tr key={config.ID}>
                    <td>{config.COD_TRANSPORTADORA}</td>
                    <td>{config.NOME_TRANSPORTADORA || 'N/A'}</td>
                    <td>{config.NOME_ABREVIADO}</td>
                    <td>
                      <span className="badge-layout">{config.TIPO_LAYOUT}</span>
                    </td>
                    <td>
                      <span className={`badge-gera ${config.GERA_ARQUIVO_EDI === 1 ? 'sim' : 'nao'}`}>
                        {config.GERA_ARQUIVO_EDI === 1 ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-status ${config.ATIVO === 1 ? 'ativo' : 'inativo'}`}>
                        {config.ATIVO === 1 ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="acoes-cell">
                      <button
                        className="btn-editar"
                        onClick={() => openEditModal(config)}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        className={`btn-toggle ${config.ATIVO === 1 ? 'desativar' : 'ativar'}`}
                        onClick={() => handleToggleStatus(config)}
                        title={config.ATIVO === 1 ? 'Inativar' : 'Ativar'}
                      >
                        {config.ATIVO === 1 ? '🔒' : '🔓'}
                      </button>
                      <button
                        className="btn-deletar"
                        onClick={() => {
                          setConfigToDelete(config);
                          setShowDeleteModal(true);
                        }}
                        title="Deletar"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Adicionar */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Nova Configuração EDI</h3>
            <div className="form-group">
              <label>Transportadora: *</label>
              <select
                value={novaConfig.codTransportadora}
                onChange={(e) =>
                  setNovaConfig({ ...novaConfig, codTransportadora: e.target.value })
                }
              >
                <option value="">Selecione...</option>
                {transportadoras.map((t) => (
                  <option key={t.cod_transportadora} value={t.cod_transportadora}>
                    {t.cod_transportadora} - {t.nome_transportadora}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Nome Abreviado: *</label>
              <input
                type="text"
                placeholder="Ex: TRANSP25211"
                value={novaConfig.nomeAbreviado}
                onChange={(e) =>
                  setNovaConfig({ ...novaConfig, nomeAbreviado: e.target.value.toUpperCase() })
                }
                maxLength={20}
              />
            </div>
            <div className="form-group">
              <label>Tipo de Layout: *</label>
              <select
                value={novaConfig.tipoLayout}
                onChange={(e) => setNovaConfig({ ...novaConfig, tipoLayout: e.target.value })}
              >
                <option value="VER002">VER002</option>
                <option value="GERAL">GERAL</option>
              </select>
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={novaConfig.geraArquivoEdi === 1}
                  onChange={(e) =>
                    setNovaConfig({ ...novaConfig, geraArquivoEdi: e.target.checked ? 1 : 0 })
                  }
                />
                Gerar Arquivo EDI
              </label>
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={novaConfig.ativo === 1}
                  onChange={(e) => setNovaConfig({ ...novaConfig, ativo: e.target.checked ? 1 : 0 })}
                />
                Ativo
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn-cancelar" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button className="btn-salvar" onClick={handleAdicionarConfig}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {showEditModal && configToEdit && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Editar Configuração EDI</h3>
            <div className="form-group">
              <label>Transportadora:</label>
              <input
                type="text"
                value={`${configToEdit.COD_TRANSPORTADORA} - ${configToEdit.NOME_TRANSPORTADORA}`}
                disabled
                className="input-disabled"
              />
            </div>
            <div className="form-group">
              <label>Nome Abreviado: *</label>
              <input
                type="text"
                value={editConfig.nomeAbreviado}
                onChange={(e) =>
                  setEditConfig({ ...editConfig, nomeAbreviado: e.target.value.toUpperCase() })
                }
                maxLength={20}
              />
            </div>
            <div className="form-group">
              <label>Tipo de Layout: *</label>
              <select
                value={editConfig.tipoLayout}
                onChange={(e) => setEditConfig({ ...editConfig, tipoLayout: e.target.value })}
              >
                <option value="VER002">VER002</option>
                <option value="GERAL">GERAL</option>
              </select>
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={editConfig.geraArquivoEdi === 1}
                  onChange={(e) =>
                    setEditConfig({ ...editConfig, geraArquivoEdi: e.target.checked ? 1 : 0 })
                  }
                />
                Gerar Arquivo EDI
              </label>
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={editConfig.ativo === 1}
                  onChange={(e) => setEditConfig({ ...editConfig, ativo: e.target.checked ? 1 : 0 })}
                />
                Ativo
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn-cancelar" onClick={() => setShowEditModal(false)}>
                Cancelar
              </button>
              <button className="btn-salvar" onClick={handleEditarConfig}>
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Deletar */}
      {showDeleteModal && configToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content modal-delete" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmar Exclusão</h3>
            <p>
              Deseja realmente deletar a configuração da transportadora{' '}
              <strong>{configToDelete.NOME_TRANSPORTADORA}</strong> (Código:{' '}
              {configToDelete.COD_TRANSPORTADORA})?
            </p>
            <div className="modal-actions">
              <button className="btn-cancelar" onClick={() => setShowDeleteModal(false)}>
                Cancelar
              </button>
              <button className="btn-deletar-confirmar" onClick={handleDeleteConfig}>
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
      </div>
    </div>
  );
};

export default GerenciarConfigsEDI;
