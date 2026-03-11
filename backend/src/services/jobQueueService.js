/**
 * Serviço de Fila de Jobs
 * Gerencia processamento assíncrono de tarefas pesadas (envio de emails, geração de arquivos)
 */

class JobQueueService {
  constructor() {
    this.jobs = new Map(); // Map<jobId, jobData>
    this.processing = new Set(); // Set de jobIds em processamento
    this.maxConcurrent = 3; // Máximo de jobs simultâneos
  }

  /**
   * Cria um novo job e retorna o ID
   */
  createJob(type, data, userId) {
    const jobId = this.generateJobId();
    const job = {
      id: jobId,
      type, // 'enviar-email', 'gerar-edi', etc
      data,
      userId,
      status: 'pending', // pending, processing, completed, failed
      progress: 0,
      result: null,
      error: null,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null
    };

    this.jobs.set(jobId, job);
    
    // Inicia processamento se houver capacidade
    this.processNext();
    
    return jobId;
  }

  /**
   * Processa o próximo job da fila
   */
  async processNext() {
    // Verifica se já atingiu o limite de processamento simultâneo
    if (this.processing.size >= this.maxConcurrent) {
      return;
    }

    // Busca próximo job pendente
    const pendingJob = Array.from(this.jobs.values()).find(
      job => job.status === 'pending'
    );

    if (!pendingJob) {
      return;
    }

    // Marca como processando
    pendingJob.status = 'processing';
    pendingJob.startedAt = new Date();
    this.processing.add(pendingJob.id);

    try {
      // Processa o job (cada tipo tem seu handler)
      const handler = this.getHandler(pendingJob.type);
      if (!handler) {
        throw new Error(`Handler não encontrado para tipo: ${pendingJob.type}`);
      }

      // Timeout de 5 minutos para processar job
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: Job excedeu 5 minutos de processamento')), 5 * 60 * 1000);
      });

      const result = await Promise.race([
        handler(pendingJob.data, (progress) => {
          pendingJob.progress = progress;
        }),
        timeoutPromise
      ]);

      // Job concluído com sucesso
      pendingJob.status = 'completed';
      pendingJob.result = result;
      pendingJob.completedAt = new Date();
      pendingJob.progress = 100;

    } catch (error) {
      // Job falhou
      pendingJob.status = 'failed';
      pendingJob.error = error.message;
      pendingJob.completedAt = new Date();
      console.error(`❌ Job ${pendingJob.id} (${pendingJob.type}) falhou:`, error.message);
      console.error('Stack trace:', error.stack);
    } finally {
      // Remove do conjunto de processamento
      this.processing.delete(pendingJob.id);
      
      // Tenta processar próximo job
      this.processNext();
    }
  }

  /**
   * Retorna o handler apropriado para o tipo de job
   */
  getHandler(type) {
    const handlers = {
      'enviar-email': this.handleEnviarEmail.bind(this),
      'gerar-edi': this.handleGerarEdi.bind(this)
    };
    return handlers[type];
  }

  /**
   * Handler para envio de email
   */
  async handleEnviarEmail(data, updateProgress) {
    const { enviarEmailComPdfs } = require('./emailService');
    const { gerarPdfRomaneio } = require('./pdfService');
    const { gerarArquivoEdi } = require('./ediGeneratorService');

    console.log('🔍 Job handleEnviarEmail - Dados recebidos:', {
      codTransportadora: data.codTransportadora,
      codigosEntrega: data.codigosEntrega,
      qtdCodigos: data.codigosEntrega?.length,
      dataInicio: data.dataInicio,
      dataFim: data.dataFim,
      nomeTransportadora: data.nomeTransportadora
    });

    updateProgress(10);

    // Gera PDFs com tratamento de erro individual
    const pdfsGerados = [];
    for (let i = 0; i < data.codigosEntrega.length; i++) {
      try {
        console.log(`📄 Gerando PDF ${i + 1}/${data.codigosEntrega.length} para entrega ${data.codigosEntrega[i]}...`);
        const pdf = await gerarPdfRomaneio(data.codigosEntrega[i]);
        pdfsGerados.push(pdf);
        updateProgress(10 + (i + 1) / data.codigosEntrega.length * 40);
        console.log(`✅ PDF ${i + 1}/${data.codigosEntrega.length} gerado com sucesso`);
      } catch (pdfError) {
        console.error(`❌ Erro ao gerar PDF para entrega ${data.codigosEntrega[i]}:`, pdfError.message);
        throw new Error(`Falha ao gerar PDF para entrega ${data.codigosEntrega[i]}: ${pdfError.message}`);
      }
    }

    updateProgress(50);

    // Gera arquivo EDI se necessário
    let arquivoEdi = null;
    if (data.geraArquivoEdi) {
      arquivoEdi = await gerarArquivoEdi(
        data.codTransportadora,
        data.codigosEntrega,
        data.nomeTransportadora
      );
      updateProgress(70);
    }

    // Envia email
    const transportadora = {
      codigo: data.codTransportadora,
      nome: data.nomeTransportadora
    };

    // Usar a data mais recente dos romaneios para o assunto
    const dataAssunto = data.dataFim || new Date().toISOString().split('T')[0];

    const resultado = await enviarEmailComPdfs(
      pdfsGerados,
      transportadora,
      dataAssunto,
      arquivoEdi
    );

    updateProgress(100);

    return {
      sucesso: true,
      emailsEnviados: resultado.emailsEnviados || 0,
      pdfsGerados: pdfsGerados.length,
      ediGerado: !!arquivoEdi,
      transportadora: data.nomeTransportadora,
      nomeTransportadora: data.nomeTransportadora
    };
  }

  /**
   * Handler para geração de EDI
   */
  async handleGerarEdi(data, updateProgress) {
    const { gerarArquivoEdi } = require('./ediGeneratorService');
    
    updateProgress(30);
    
    const arquivoEdi = await gerarArquivoEdi(
      data.codTransportadora,
      data.codigosEntrega,
      data.nomeTransportadora
    );
    
    updateProgress(100);
    
    return {
      sucesso: true,
      arquivo: arquivoEdi,
      nomeTransportadora: data.nomeTransportadora
    };
  }

  /**
   * Busca status de um job
   */
  getJobStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      // Incluir nome da transportadora dos dados do job
      transportadora: job.data?.nomeTransportadora
    };
  }

  /**
   * Busca todos os jobs de um usuário
   */
  getUserJobs(userId, limit = 20) {
    const userJobs = Array.from(this.jobs.values())
      .filter(job => job.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt
      }));

    return userJobs;
  }

  /**
   * Limpa jobs antigos (mais de 1 hora)
   */
  cleanOldJobs() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.completedAt && job.completedAt < oneHourAgo) {
        this.jobs.delete(jobId);
      }
    }
  }

  /**
   * Gera ID único para job
   */
  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton
const jobQueue = new JobQueueService();

// Limpa jobs antigos a cada 15 minutos
setInterval(() => {
  jobQueue.cleanOldJobs();
}, 15 * 60 * 1000);

module.exports = jobQueue;
