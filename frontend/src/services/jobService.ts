import { apiRequest } from './api';

export interface JobStatus {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  createdAt: string;
  completedAt?: string;
  transportadora?: string;
}

/**
 * Cria um job de envio de email assíncrono
 */
export async function criarJobEnviarEmail(dados: {
  codTransportadora: number;
  codigosEntrega: number[];
  dataInicio: string;
  dataFim: string;
  nomeTransportadora: string;
  geraArquivoEdi: boolean;
  userId: string;
}): Promise<{ erro: boolean; jobId?: string; mensagemErro?: string }> {
  const response = await apiRequest('/jobs/enviar-email', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
  
  return response;
}

/**
 * Busca status de um job específico
 */
export async function buscarStatusJob(jobId: string): Promise<{ erro: boolean; dados?: JobStatus; mensagemErro?: string }> {
  const response = await apiRequest(`/jobs/${jobId}`, {
    method: 'GET'
  });
  
  return response;
}

/**
 * Lista todos os jobs do usuário
 */
export async function listarJobsUsuario(userId: string, limit = 20): Promise<{ erro: boolean; dados?: JobStatus[]; mensagemErro?: string }> {
  const response = await apiRequest(`/jobs?userId=${userId}&limit=${limit}`, {
    method: 'GET'
  });
  
  return response;
}

/**
 * Hook para monitorar um job com polling
 */
export class JobMonitor {
  private jobId: string;
  private pollingInterval: number;
  private intervalId: NodeJS.Timeout | null = null;
  private onUpdate: (status: JobStatus) => void;
  private onComplete: (result: any) => void;
  private onError: (error: string) => void;

  constructor(
    jobId: string,
    onUpdate: (status: JobStatus) => void,
    onComplete: (result: any) => void,
    onError: (error: string) => void,
    pollingInterval = 2000 // 2 segundos
  ) {
    this.jobId = jobId;
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
    this.onError = onError;
    this.pollingInterval = pollingInterval;
  }

  /**
   * Inicia o monitoramento
   */
  start() {
    this.checkStatus(); // Primeira verificação imediata
    
    this.intervalId = setInterval(() => {
      this.checkStatus();
    }, this.pollingInterval);
  }

  /**
   * Para o monitoramento
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Verifica status do job
   */
  private async checkStatus() {
    try {
      const response = await buscarStatusJob(this.jobId);
      
      if (response.erro || !response.dados) {
        this.stop();
        this.onError(response.mensagemErro || 'Erro ao buscar status do job');
        return;
      }

      const status = response.dados;
      this.onUpdate(status);

      // Se completou ou falhou, para o polling
      if (status.status === 'completed') {
        this.stop();
        this.onComplete(status.result);
      } else if (status.status === 'failed') {
        this.stop();
        this.onError(status.error || 'Job falhou');
      }
    } catch (error) {
      this.stop();
      this.onError('Erro ao verificar status do job');
    }
  }
}
