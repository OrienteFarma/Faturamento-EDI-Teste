import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getTransportadoras, 
  getEmailsTransportadoras, 
  adicionarEmailTransportadora,
  atualizarStatusEmailTransportadora,
  deletarEmailTransportadora 
} from '../services/api';
import Toast from './Toast';
import './GerenciarEmailsTransportadoras.css';

interface GerenciarEmailsTransportadorasProps {
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

interface EmailTransportadora {
  ID: number;
  COD_TRANSPORTADORA: number;
  NOME_TRANSPORTADORA: string;
  EMAIL: string;
  ATIVO: number;
}

const GerenciarEmailsTransportadoras: React.FC<GerenciarEmailsTransportadorasProps> = ({ userData, onLogout }) => {
  const navigate = useNavigate();
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [emails, setEmails] = useState<EmailTransportadora[]>([]);
  const [emailsFiltrados, setEmailsFiltrados] = useState<EmailTransportadora[]>([]);
  
  // Filtros
  const [filtroTransportadora, setFiltroTransportadora] = useState<number | ''>('');
  const [filtroEmail, setFiltroEmail] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<number | ''>('');
  
  // Novo email
  const [showModalNovo, setShowModalNovo] = useState(false);
  const [novoEmail, setNovoEmail] = useState('');
  const [novaTransportadora, setNovaTransportadora] = useState<number | ''>('');
  
  // Confirmação de exclusão
  const [showModalExcluir, setShowModalExcluir] = useState(false);
  const [emailParaExcluir, setEmailParaExcluir] = useState<EmailTransportadora | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', JSON.stringify(newMode));
  };

  useEffect(() => {
    carregarTransportadoras();
    carregarEmails();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    let resultado = [...emails];
    
    // Filtro por transportadora
    if (filtroTransportadora !== '') {
      resultado = resultado.filter(e => e.COD_TRANSPORTADORA === filtroTransportadora);
    }
    
    // Filtro por email (pesquisa parcial)
    if (filtroEmail.trim()) {
      resultado = resultado.filter(e => 
        e.EMAIL.toLowerCase().includes(filtroEmail.toLowerCase())
      );
    }
    
    // Filtro por status
    if (filtroStatus !== '') {
      resultado = resultado.filter(e => e.ATIVO === filtroStatus);
    }
    
    setEmailsFiltrados(resultado);
  }, [emails, filtroTransportadora, filtroEmail, filtroStatus]);

  const carregarTransportadoras = async () => {
    try {
      const response = await getTransportadoras();
      if (!response.erro) {
        setTransportadoras(response.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar transportadoras:', error);
    }
  };

  const carregarEmails = async () => {
    setIsLoading(true);
    try {
      const response = await getEmailsTransportadoras();
      if (response.erro) {
        setToast({ message: response.mensagemErro || 'Erro ao carregar emails', type: 'error' });
        setEmails([]);
      } else {
        setEmails(response.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar emails:', error);
      setToast({ message: 'Erro ao carregar emails. Tente novamente.', type: 'error' });
      setEmails([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbrirModalNovo = () => {
    setNovoEmail('');
    setNovaTransportadora('');
    setShowModalNovo(true);
  };

  const handleFecharModalNovo = () => {
    setShowModalNovo(false);
    setNovoEmail('');
    setNovaTransportadora('');
  };

  const handleAdicionarEmail = async () => {
    if (!novaTransportadora || !novoEmail.trim()) {
      setToast({ message: 'Preencha todos os campos', type: 'error' });
      return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(novoEmail)) {
      setToast({ message: 'Email inválido', type: 'error' });
      return;
    }
    
    try {
      const response = await adicionarEmailTransportadora(novaTransportadora as number, novoEmail);
      
      if (response.erro) {
        setToast({ message: response.mensagemErro || 'Erro ao adicionar email', type: 'error' });
      } else {
        setToast({ message: 'Email adicionado com sucesso!', type: 'success' });
        handleFecharModalNovo();
        carregarEmails();
      }
    } catch (error) {
      console.error('Erro ao adicionar email:', error);
      setToast({ message: 'Erro ao adicionar email. Tente novamente.', type: 'error' });
    }
  };

  const handleToggleStatus = async (email: EmailTransportadora) => {
    try {
      const novoStatus = email.ATIVO === 1 ? 0 : 1;
      const response = await atualizarStatusEmailTransportadora(email.ID, novoStatus);
      
      if (response.erro) {
        setToast({ message: response.mensagemErro || 'Erro ao atualizar status', type: 'error' });
      } else {
        setToast({ 
          message: `Email ${novoStatus === 1 ? 'ativado' : 'inativado'} com sucesso!`, 
          type: 'success' 
        });
        carregarEmails();
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setToast({ message: 'Erro ao atualizar status. Tente novamente.', type: 'error' });
    }
  };

  const handleAbrirModalExcluir = (email: EmailTransportadora) => {
    setEmailParaExcluir(email);
    setShowModalExcluir(true);
  };

  const handleFecharModalExcluir = () => {
    setShowModalExcluir(false);
    setEmailParaExcluir(null);
  };

  const handleConfirmarExclusao = async () => {
    if (!emailParaExcluir) return;
    
    try {
      const response = await deletarEmailTransportadora(emailParaExcluir.ID);
      
      if (response.erro) {
        setToast({ message: response.mensagemErro || 'Erro ao deletar email', type: 'error' });
      } else {
        setToast({ message: 'Email deletado com sucesso!', type: 'success' });
        handleFecharModalExcluir();
        carregarEmails();
      }
    } catch (error) {
      console.error('Erro ao deletar email:', error);
      setToast({ message: 'Erro ao deletar email. Tente novamente.', type: 'error' });
    }
  };

  const limparFiltros = () => {
    setFiltroTransportadora('');
    setFiltroEmail('');
    setFiltroStatus('');
  };

  return (
    <div className="gerenciar-emails-container">
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

      <div className="gerenciar-emails-content">
        <div className="page-header">
          <div className="page-title-section">
            <button onClick={() => navigate('/home')} className="btn-voltar">
              ← Voltar
            </button>
            <h1>Gerenciar Transportadoras</h1>
          </div>
          <div className="header-actions">
            <button onClick={() => navigate('/gerenciar-configs-edi')} className="btn-config-edi">
              ⚙️ Configurações EDI
            </button>
            <button onClick={handleAbrirModalNovo} className="btn-novo-email">
              + Novo Email
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="filtros-section">
          <div className="filtros-grid">
            <div className="filtro-item">
              <label>Transportadora</label>
              <select 
                value={filtroTransportadora} 
                onChange={(e) => setFiltroTransportadora(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="select-filtro"
              >
                <option value="">Todas</option>
                {transportadoras.map(t => (
                  <option key={t.cod_transportadora} value={t.cod_transportadora}>
                    {t.nome_transportadora}
                  </option>
                ))}
              </select>
            </div>

            <div className="filtro-item">
              <label>Email</label>
              <input 
                type="text"
                value={filtroEmail}
                onChange={(e) => setFiltroEmail(e.target.value)}
                placeholder="Buscar por email..."
                className="input-filtro"
              />
            </div>

            <div className="filtro-item">
              <label>Status</label>
              <select 
                value={filtroStatus} 
                onChange={(e) => setFiltroStatus(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="select-filtro"
              >
                <option value="">Todos</option>
                <option value="1">Ativo</option>
                <option value="0">Inativo</option>
              </select>
            </div>

            <div className="filtro-item filtro-actions">
              <button onClick={limparFiltros} className="btn-limpar-filtros">
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de Emails */}
        <div className="emails-table-container">
          {isLoading ? (
            <div className="loading">Carregando...</div>
          ) : emailsFiltrados.length === 0 ? (
            <div className="no-data">Nenhum email encontrado</div>
          ) : (
            <table className="emails-table">
              <thead>
                <tr>
                  <th>Transportadora</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th className="actions-column">Ações</th>
                </tr>
              </thead>
              <tbody>
                {emailsFiltrados.map(email => (
                  <tr key={email.ID} className={email.ATIVO === 0 ? 'email-inativo' : ''}>
                    <td>{email.NOME_TRANSPORTADORA}</td>
                    <td>{email.EMAIL}</td>
                    <td>
                      <span className={`status-badge ${email.ATIVO === 1 ? 'status-ativo' : 'status-inativo'}`}>
                        {email.ATIVO === 1 ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button 
                        onClick={() => handleToggleStatus(email)}
                        className={`btn-action ${email.ATIVO === 1 ? 'btn-inativar' : 'btn-ativar'}`}
                        title={email.ATIVO === 1 ? 'Inativar' : 'Ativar'}
                      >
                        {email.ATIVO === 1 ? '🔒' : '🔓'}
                      </button>
                      <button 
                        onClick={() => handleAbrirModalExcluir(email)}
                        className="btn-action btn-excluir"
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="emails-resumo">
          <p>Total de emails: <strong>{emailsFiltrados.length}</strong></p>
          <p>Ativos: <strong>{emailsFiltrados.filter(e => e.ATIVO === 1).length}</strong></p>
          <p>Inativos: <strong>{emailsFiltrados.filter(e => e.ATIVO === 0).length}</strong></p>
        </div>
      </div>

      {/* Modal Novo Email */}
      {showModalNovo && (
        <div className="modal-overlay" onClick={handleFecharModalNovo}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Adicionar Novo Email</h2>
            
            <div className="form-group">
              <label htmlFor="novaTransportadora">
                Transportadora <span className="required">*</span>
              </label>
              <select 
                id="novaTransportadora"
                value={novaTransportadora}
                onChange={(e) => setNovaTransportadora(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="select-input"
              >
                <option value="">Selecione uma transportadora</option>
                {transportadoras.map(t => (
                  <option key={t.cod_transportadora} value={t.cod_transportadora}>
                    {t.nome_transportadora}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="novoEmail">
                Email <span className="required">*</span>
              </label>
              <input 
                type="email"
                id="novoEmail"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                placeholder="exemplo@email.com"
                className="text-input"
              />
            </div>

            <div className="modal-actions">
              <button onClick={handleFecharModalNovo} className="btn-cancelar">
                Cancelar
              </button>
              <button 
                onClick={handleAdicionarEmail} 
                className="btn-confirmar"
                disabled={!novaTransportadora || !novoEmail.trim()}
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {showModalExcluir && emailParaExcluir && (
        <div className="modal-overlay" onClick={handleFecharModalExcluir}>
          <div className="modal-content modal-excluir" onClick={(e) => e.stopPropagation()}>
            <h2>Confirmar Exclusão</h2>
            <p>Tem certeza que deseja excluir o email?</p>
            
            <div className="email-info-excluir">
              <p><strong>Transportadora:</strong> {emailParaExcluir.NOME_TRANSPORTADORA}</p>
              <p><strong>Email:</strong> {emailParaExcluir.EMAIL}</p>
            </div>

            <p className="warning-text">⚠️ Esta ação não pode ser desfeita!</p>

            <div className="modal-actions">
              <button onClick={handleFecharModalExcluir} className="btn-cancelar">
                Cancelar
              </button>
              <button onClick={handleConfirmarExclusao} className="btn-confirmar btn-danger">
                Confirmar Exclusão
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

export default GerenciarEmailsTransportadoras;
