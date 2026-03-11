import { LOCAL_API_URL } from '../config';

// Interface para resposta padrão da API
export interface ApiResponse<T = any> {
  erro: boolean;
  mensagem?: string;
  mensagemErro?: string;
  userData?: {
    userName: string;
    userLogin: string;
  };
  // Campos da API AD (login)
  usuario?: string;
  login?: string;
  email?: string;
  data?: T;
}

// Configuração padrão das requisições
const defaultHeaders = {
  'Content-Type': 'application/json',
};

// Função para obter headers com token JWT
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('authToken');
  return {
    ...defaultHeaders,
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

// Função genérica para fazer requisições
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${LOCAL_API_URL}/api/db${endpoint}`;
    
    // Obter token do localStorage
    const token = localStorage.getItem('authToken');
    
    const headers = {
      ...defaultHeaders,
      ...(token && { 'Authorization': `Bearer ${token}` }), // Adicionar token JWT
      ...options.headers,
    };
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();
    
    // Se token expirado ou inválido, fazer logout
    if (data.expirado || (response.status === 401 && data.mensagemErro?.includes('Token'))) {
      console.error('🔒 Token expirado ou inválido');
      localStorage.removeItem('authToken');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userData');
      window.location.href = '/login';
      return data;
    }
    
    return data;
  } catch (error) {
    console.error('Erro na requisição:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao conectar com o servidor. Verifique sua conexão.',
    };
  }
}

// Função específica para login
export async function loginUser(user: string, password: string): Promise<ApiResponse> {
  return apiRequest('/login', {
    method: 'POST',
    body: JSON.stringify({ user, password }),
  });
}

// Função para buscar relatório de romaneio
export async function getRelatorioRomaneio(dataInicio: string, dataFim: string): Promise<ApiResponse> {
  return apiRequest('/relatorio/romaneio', {
    method: 'POST',
    body: JSON.stringify({ dataInicio, dataFim }),
  });
}

// ========== NOVAS FUNÇÕES OTIMIZADAS ==========

/**
 * Busca visão agregada das transportadoras (para cards) - RÁPIDA
 * Retorna apenas totalizadores, sem detalhes de pedidos/volumes
 */
export async function getVisaoTransportadoras(dataInicio: string, dataFim: string): Promise<ApiResponse> {
  try {
    const url = `${LOCAL_API_URL}/api/db/romaneio/visao-transportadoras?dataInicio=${dataInicio}&dataFim=${dataFim}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return { erro: false, data };
  } catch (error) {
    console.error('Erro ao buscar visão de transportadoras:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao carregar dados das transportadoras.',
    };
  }
}

/**
 * Busca detalhes completos de uma transportadora específica
 * Chamado ao clicar em um card
 */
export async function getDetalhesTransportadora(
  codTransportadora: number,
  dataInicio: string,
  dataFim: string
): Promise<ApiResponse> {
  try {
    const url = `${LOCAL_API_URL}/api/db/romaneio/detalhes-transportadora/${codTransportadora}?dataInicio=${dataInicio}&dataFim=${dataFim}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return { erro: false, data };
  } catch (error) {
    console.error('Erro ao buscar detalhes da transportadora:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao carregar detalhes da transportadora.',
    };
  }
}

// ========== APIs EDI ==========

/**
 * Busca lista de transportadoras
 */
export async function getTransportadoras(): Promise<ApiResponse> {
  try {
    const url = `${LOCAL_API_URL}/api/db/edi/transportadoras`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return { erro: false, data };
  } catch (error) {
    console.error('Erro ao buscar transportadoras:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao carregar transportadoras.',
    };
  }
}

/**
 * Busca romaneios de uma transportadora
 */
export async function getRomaneioPorTransportadora(codTransportadora: number): Promise<ApiResponse> {
  try {
    const url = `${LOCAL_API_URL}/api/db/edi/romaneios/${codTransportadora}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return { erro: false, data };
  } catch (error) {
    console.error('Erro ao buscar romaneios:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao carregar romaneios.',
    };
  }
}

/**
 * Gera PDF de um romaneio e abre em nova aba
 */
export async function gerarPdfRomaneio(codEntrega: number): Promise<void> {
  try {
    const url = `${LOCAL_API_URL}/api/db/edi/gerar-pdf`;
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ codEntrega }),
    });
    
    if (!response.ok) {
      throw new Error('Erro ao gerar PDF');
    }
    
    // Converte resposta em blob
    const blob = await response.blob();
    
    // Cria URL temporária e abre em nova aba
    const pdfUrl = window.URL.createObjectURL(blob);
    window.open(pdfUrl, '_blank');
    
    // Libera memória após alguns segundos
    setTimeout(() => window.URL.revokeObjectURL(pdfUrl), 10000);
    
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  }
}

// ==================== EMAILS DE TRANSPORTADORAS ====================

/**
 * Busca todos os emails de transportadoras com filtros opcionais
 */
export async function getEmailsTransportadoras(filtros?: {
  codTransportadora?: number;
  ativo?: number;
  email?: string;
}): Promise<ApiResponse> {
  try {
    const params = new URLSearchParams();
    
    if (filtros?.codTransportadora) {
      params.append('codTransportadora', filtros.codTransportadora.toString());
    }
    if (filtros?.ativo !== undefined) {
      params.append('ativo', filtros.ativo.toString());
    }
    if (filtros?.email) {
      params.append('email', filtros.email);
    }
    
    const queryString = params.toString();
    const url = `${LOCAL_API_URL}/api/db/emails-transportadoras${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar emails:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao carregar emails de transportadoras.',
    };
  }
}

/**
 * Busca emails ativos de uma transportadora específica
 */
export async function getEmailsAtivosPorTransportadora(
  codTransportadora: number
): Promise<ApiResponse<string[]>> {
  try {
    const url = `${LOCAL_API_URL}/api/db/emails-transportadoras/ativos/${codTransportadora}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar emails ativos:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao carregar emails ativos.',
    };
  }
}

/**
 * Adiciona novo email de transportadora
 */
export async function adicionarEmailTransportadora(
  codTransportadora: number, 
  email: string
): Promise<ApiResponse> {
  try {
    const url = `${LOCAL_API_URL}/api/db/emails-transportadoras`;
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ codTransportadora, email }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao adicionar email:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao adicionar email.',
    };
  }
}

/**
 * Atualiza status (ativo/inativo) de um email
 */
export async function atualizarStatusEmailTransportadora(
  id: number, 
  ativo: number
): Promise<ApiResponse> {
  try {
    const url = `${LOCAL_API_URL}/api/db/emails-transportadoras/${id}/status`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ativo }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao atualizar status do email.',
    };
  }
}

/**
 * Deleta um email
 */
export async function deletarEmailTransportadora(id: number): Promise<ApiResponse> {
  try {
    const url = `${LOCAL_API_URL}/api/db/emails-transportadoras/${id}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao deletar email:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao deletar email.',
    };
  }
}

// ============================================
// CONFIGURAÇÕES EDI
// ============================================

/**
 * Lista configurações EDI com filtros opcionais
 */
export async function getConfigsEdi(filtros?: {
  codTransportadora?: number;
  tipoLayout?: string;
  ativo?: number;
}): Promise<ApiResponse> {
  try {
    const params = new URLSearchParams();
    if (filtros?.codTransportadora) params.append('codTransportadora', filtros.codTransportadora.toString());
    if (filtros?.tipoLayout) params.append('tipoLayout', filtros.tipoLayout);
    if (filtros?.ativo !== undefined) params.append('ativo', filtros.ativo.toString());

    const url = `${LOCAL_API_URL}/api/db/configs-edi${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar configurações EDI:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao carregar configurações EDI.',
    };
  }
}

/**
 * Busca configuração EDI por ID
 */
export async function getConfigEdiPorId(id: number): Promise<ApiResponse> {
  try {
    const url = `${LOCAL_API_URL}/api/db/configs-edi/${id}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar configuração EDI:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao buscar configuração EDI.',
    };
  }
}

/**
 * Adiciona nova configuração EDI
 */
export async function adicionarConfigEdi(
  codTransportadora: number,
  nomeAbreviado: string,
  tipoLayout: string,
  geraArquivoEdi: number,
  ativo: number
): Promise<ApiResponse> {
  try {
    const url = `${LOCAL_API_URL}/api/db/configs-edi`;
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        codTransportadora,
        nomeAbreviado,
        tipoLayout,
        geraArquivoEdi,
        ativo
      }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao adicionar configuração EDI:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao adicionar configuração EDI.',
    };
  }
}

/**
 * Atualiza configuração EDI
 */
export async function atualizarConfigEdi(
  id: number,
  nomeAbreviado: string,
  tipoLayout: string,
  geraArquivoEdi: number,
  ativo: number
): Promise<ApiResponse> {
  try {
    const url = `${LOCAL_API_URL}/api/db/configs-edi/${id}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        nomeAbreviado,
        tipoLayout,
        geraArquivoEdi,
        ativo
      }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao atualizar configuração EDI:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao atualizar configuração EDI.',
    };
  }
}

/**
 * Atualiza status da configuração EDI
 */
export async function atualizarStatusConfigEdi(id: number, ativo: number): Promise<ApiResponse> {
  try {
    const url = `${LOCAL_API_URL}/api/db/configs-edi/${id}/status`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ativo }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao atualizar status da configuração EDI.',
    };
  }
}

/**
 * Deleta configuração EDI
 */
export async function deletarConfigEdi(id: number): Promise<ApiResponse> {
  try {
    const url = `${LOCAL_API_URL}/api/db/configs-edi/${id}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao deletar configuração EDI:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao deletar configuração EDI.',
    };
  }
}

/**
 * Busca transportadoras disponíveis (sem configuração EDI)
 */
export async function getTransportadorasDisponiveisEdi(): Promise<ApiResponse> {
  try {
    const url = `${LOCAL_API_URL}/api/db/configs-edi/transportadoras/disponiveis`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar transportadoras disponíveis:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao buscar transportadoras disponíveis.',
    };
  }
}
