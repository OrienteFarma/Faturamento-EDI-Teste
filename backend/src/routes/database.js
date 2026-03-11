const express = require("express");
const router = express.Router();
const authService = require('../services/authService');
const romaneioService = require('../services/romaneioService');
const { buscarVisaoTransportadoras, buscarDetalhesTransportadora } = require('../services/romaneioServiceOtimizado');
const { buscarTransportadoras, buscarRomaneioPorTransportadora } = require('../services/ediService');
const { gerarPdfRomaneio, gerarPdfVisualizacao } = require('../services/pdfService');
const { enviarEmailComPdfs } = require('../services/emailService');
const { gerarArquivoEdi, buscarConfigEdiTransportadora } = require('../services/ediGeneratorService');
const { loginLimiter, writeLimiter } = require('../middleware/rateLimiter');
const { verificarAdmin } = require('../middleware/adminAuth');
const { gerarToken, verificarToken } = require('../middleware/jwtAuth');
const { validarIdNumerico, validarData, validarArrayNumerico } = require('../utils/validator');
const jobQueue = require('../services/jobQueueService');
const { 
  buscarEmailsTransportadoras, 
  buscarEmailsAtivosPorTransportadora,
  adicionarEmailTransportadora, 
  atualizarStatusEmail, 
  deletarEmail 
} = require('../services/emailTransportadoraService');
const {
  listarConfigsEdi,
  buscarConfigEdiPorId,
  adicionarConfigEdi,
  atualizarConfigEdi,
  atualizarStatusConfigEdi,
  deletarConfigEdi,
  buscarTransportadorasDisponiveis
} = require('../services/configEdiService');

// Rota de Login usando API AD
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { user, password } = req.body;

    if (!user || !password) {
      return res.json({
        erro: true,
        mensagemErro: 'Usuário e senha são obrigatórios.'
      });
    }

    const result = await authService.validarLogin(user, password);
    
    // Se login bem-sucedido, gerar token JWT
    if (!result.erro && result.login) {
      const userData = {
        userLogin: result.login,
        userName: result.usuario,
        userEmail: result.email
      };
      const token = gerarToken(userData);
      result.token = token;
      console.log(`✅ Token JWT gerado para usuário: ${result.login}`);
    }
    
    res.json(result);
  } catch (error) {
    res.json({
      erro: true,
      mensagemErro: 'Erro ao processar login. Tente novamente.'
    });
  }
});

// Rota de Relatório Romaneio usando SQL Server
router.post('/relatorio/romaneio', verificarToken, async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.body;

    if (!dataInicio || !dataFim) {
      return res.json({
        erro: true,
        mensagemErro: 'Datas de início e fim são obrigatórias.'
      });
    }
    
    if (!validarData(dataInicio) || !validarData(dataFim)) {
      return res.json({
        erro: true,
        mensagemErro: 'Formato de data inválido. Use YYYY-MM-DD.'
      });
    }

    const result = await romaneioService.buscarRelatorioRomaneio(dataInicio, dataFim);
    res.json(result);
  } catch (error) {
    res.json({
      erro: true,
      mensagemErro: 'Erro ao buscar relatório. Tente novamente.'
    });
  }
});

// ========== ROTAS OTIMIZADAS ==========

// Rota de visão agregada de transportadoras (rápida)
router.get('/romaneio/visao-transportadoras', verificarToken, async (req, res) => {
  console.log('📥 GET /api/db/romaneio/visao-transportadoras');
  try {
    const { dataInicio, dataFim } = req.query;
    
    if (!dataInicio || !dataFim) {
      return res.status(400).json({ 
        erro: true, 
        mensagem: 'Parâmetros dataInicio e dataFim são obrigatórios' 
      });
    }
    
    const resultado = await buscarVisaoTransportadoras(dataInicio, dataFim);
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao buscar visão de transportadoras:', error);
    res.status(500).json({ 
      erro: true, 
      mensagem: 'Erro ao buscar dados das transportadoras' 
    });
  }
});

// Rota de detalhes de transportadora específica
router.get('/romaneio/detalhes-transportadora/:codTransportadora', verificarToken, async (req, res) => {
  console.log('📥 GET /api/db/romaneio/detalhes-transportadora/:codTransportadora');
  try {
    const { codTransportadora } = req.params;
    const { dataInicio, dataFim } = req.query;
    
    if (!dataInicio || !dataFim) {
      return res.status(400).json({ 
        erro: true, 
        mensagem: 'Parâmetros dataInicio e dataFim são obrigatórios' 
      });
    }
    
    if (!codTransportadora) {
      return res.status(400).json({ 
        erro: true, 
        mensagem: 'Código da transportadora é obrigatório' 
      });
    }
    
    const resultado = await buscarDetalhesTransportadora(dataInicio, dataFim, codTransportadora);
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao buscar detalhes da transportadora:', error);
    res.status(500).json({ 
      erro: true, 
      mensagem: 'Erro ao buscar detalhes da transportadora' 
    });
  }
});

// ========== ROTAS EDI ==========

// Rota para listar transportadoras
router.get('/edi/transportadoras', verificarToken, async (req, res) => {
  console.log('📥 GET /api/db/edi/transportadoras');
  try {
    const resultado = await buscarTransportadoras();
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao buscar transportadoras:', error);
    res.status(500).json({ 
      erro: true, 
      mensagem: 'Erro ao buscar transportadoras' 
    });
  }
});

// Rota para listar romaneios de uma transportadora
router.get('/edi/romaneios/:codTransportadora', verificarToken, async (req, res) => {
  console.log('📥 GET /api/db/edi/romaneios/:codTransportadora');
  try {
    const { codTransportadora } = req.params;
    
    if (!codTransportadora) {
      return res.status(400).json({ 
        erro: true, 
        mensagem: 'Código da transportadora é obrigatório' 
      });
    }
    
    const resultado = await buscarRomaneioPorTransportadora(codTransportadora);
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao buscar romaneios:', error);
    res.status(500).json({ 
      erro: true, 
      mensagem: 'Erro ao buscar romaneios' 
    });
  }
});

// ============================================
// ROTAS DE JOBS ASSÍNCRONOS (Sistema de Fila)
// ============================================

// Criar job para envio de email assíncrono
router.post('/jobs/enviar-email', verificarToken, async (req, res) => {
  console.log('📥 POST /api/db/jobs/enviar-email');
  try {
    const { 
      codTransportadora, 
      codigosEntrega, 
      dataInicio, 
      dataFim,
      nomeTransportadora,
      geraArquivoEdi,
      userId 
    } = req.body;

    // Validações
    if (!codTransportadora || !codigosEntrega || !Array.isArray(codigosEntrega)) {
      return res.status(400).json({
        erro: true,
        mensagemErro: 'Dados inválidos para criação do job'
      });
    }

    // Cria job na fila
    const jobId = jobQueue.createJob('enviar-email', {
      codTransportadora,
      codigosEntrega,
      dataInicio,
      dataFim,
      nomeTransportadora,
      geraArquivoEdi
    }, userId || 'sistema');

    res.json({
      erro: false,
      mensagem: 'Job criado com sucesso. Processamento iniciado em background.',
      jobId,
      status: 'pending'
    });

  } catch (error) {
    console.error('Erro ao criar job:', error);
    res.status(500).json({
      erro: true,
      mensagemErro: 'Erro ao criar job de envio'
    });
  }
});

// Buscar status de um job específico
router.get('/jobs/:jobId', verificarToken, async (req, res) => {
  console.log('📥 GET /api/db/jobs/:jobId');
  try {
    const { jobId } = req.params;
    
    const status = jobQueue.getJobStatus(jobId);
    
    if (!status) {
      return res.status(404).json({
        erro: true,
        mensagemErro: 'Job não encontrado'
      });
    }

    res.json({
      erro: false,
      dados: status
    });

  } catch (error) {
    console.error('Erro ao buscar status do job:', error);
    res.status(500).json({
      erro: true,
      mensagemErro: 'Erro ao buscar status do job'
    });
  }
});

// Listar jobs do usuário
router.get('/jobs', verificarToken, async (req, res) => {
  console.log('📥 GET /api/db/jobs');
  try {
    const { userId, limit } = req.query;
    
    const jobs = jobQueue.getUserJobs(userId || 'sistema', parseInt(limit) || 20);
    
    res.json({
      erro: false,
      dados: jobs
    });

  } catch (error) {
    console.error('Erro ao listar jobs:', error);
    res.status(500).json({
      erro: true,
      mensagemErro: 'Erro ao listar jobs'
    });
  }
});

// Rota para gerar PDFs e enviar por email
router.post('/edi/gerar-e-enviar', verificarToken, async (req, res) => {
  console.log('📥 POST /api/db/edi/gerar-e-enviar');
  try {
    const { codEntregas, transportadora, dataAssunto } = req.body;
    
    if (!codEntregas || codEntregas.length === 0) {
      return res.status(400).json({ 
        erro: true, 
        mensagem: 'Nenhum código de entrega fornecido' 
      });
    }

    console.log(`📄 Gerando ${codEntregas.length} PDFs...`);
    
    // Gerar todos os PDFs
    const pdfs = [];
    for (const item of codEntregas) {
      const pdf = await gerarPdfRomaneio(item.cod_entrega);
      pdfs.push({
        codEntrega: item.cod_entrega,
        codEntregaDisplay: item.cod_entrega_display,
        totalPedidos: item.total_pedidos,
        totalVolumes: item.total_volumes,
        valorTotal: item.valor_total,
        buffer: pdf
      });
    }
    
    console.log(`✅ ${pdfs.length} PDFs gerados com sucesso`);
    
    // Tentar gerar arquivo EDI (se configurado para a transportadora)
    let arquivoEdi = null;
    try {
      const codigosEntrega = codEntregas.map(item => item.cod_entrega);
      arquivoEdi = await gerarArquivoEdi(transportadora.codigo, codigosEntrega);
      
      if (arquivoEdi) {
        console.log(`✅ Arquivo EDI gerado: ${arquivoEdi.nomeArquivo} (${arquivoEdi.registros} registros)`);
      }
    } catch (errorEdi) {
      console.error('❌ Erro ao gerar arquivo EDI:', errorEdi);
      
      // Verificar se a transportadora está configurada para gerar EDI
      const configEdi = await buscarConfigEdiTransportadora(transportadora.codigo);
      
      if (configEdi && configEdi.GERA_ARQUIVO_EDI === 1) {
        // Se está configurado para gerar EDI e deu erro, abortar todo o processo
        console.error('⚠️ Transportadora configurada para gerar EDI - abortando envio');
        return res.status(500).json({ 
          erro: true, 
          mensagem: 'Erro ao gerar arquivo EDI',
          detalhes: errorEdi.message
        });
      }
      
      // Se não está configurado para gerar EDI, continua sem EDI
      console.log('⚠️ Continuando sem EDI (não configurado ou desabilitado)');
    }
    
    // Enviar email com os PDFs e arquivo EDI (se gerado)
    const resultado = await enviarEmailComPdfs(pdfs, transportadora, dataAssunto, arquivoEdi);
    
    let mensagem = `${pdfs.length} romaneio(s) gerado(s) e enviado(s) por email com sucesso`;
    if (arquivoEdi) {
      mensagem += ` (com arquivo EDI: ${arquivoEdi.nomeArquivo})`;
    }
    
    res.json({ 
      sucesso: true, 
      mensagem: mensagem,
      messageId: resultado.messageId,
      arquivoEdi: arquivoEdi ? arquivoEdi.nomeArquivo : null
    });
    
  } catch (error) {
    console.error('Erro ao gerar PDFs e enviar email:', error);
    res.status(500).json({ 
      erro: true, 
      mensagem: 'Erro ao gerar romaneios e enviar email',
      detalhes: error.message
    });
  }
});

// Rota para gerar PDF do romaneio (apenas visualização)
router.post('/edi/gerar-pdf', verificarToken, async (req, res) => {
  console.log('📥 POST /api/db/edi/gerar-pdf');
  try {
    const { codEntrega } = req.body;
    
    if (!codEntrega) {
      return res.status(400).json({ 
        erro: true, 
        mensagem: 'Código de entrega é obrigatório' 
      });
    }
    
    const pdf = await gerarPdfVisualizacao(codEntrega);
    
    // Retorna o PDF como buffer para o frontend
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="romaneio_${codEntrega}.pdf"`);
    res.send(pdf);
    
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).json({ 
      erro: true, 
      mensagem: 'Erro ao gerar PDF do romaneio',
      detalhes: error.message
    });
  }
});

// ==================== ROTAS DE GERENCIAMENTO DE EMAILS DE TRANSPORTADORAS ====================

// Buscar emails de transportadoras com filtros
router.get('/emails-transportadoras', verificarToken, async (req, res) => {
  console.log('📥 GET /api/db/emails-transportadoras');
  try {
    const filtros = {
      codTransportadora: req.query.codTransportadora ? parseInt(req.query.codTransportadora) : undefined,
      ativo: req.query.ativo !== undefined ? parseInt(req.query.ativo) : undefined,
      email: req.query.email
    };
    
    const result = await buscarEmailsTransportadoras(filtros);
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar emails:', error);
    res.status(500).json({
      erro: true,
      mensagemErro: 'Erro ao buscar emails de transportadoras',
      detalhes: error.message
    });
  }
});

// Buscar emails ativos de uma transportadora específica
router.get('/emails-transportadoras/ativos/:codTransportadora', verificarToken, async (req, res) => {
  console.log('📥 GET /api/db/emails-transportadoras/ativos/:codTransportadora');
  try {
    const codTransportadora = parseInt(req.params.codTransportadora);
    const result = await buscarEmailsAtivosPorTransportadora(codTransportadora);
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar emails ativos:', error);
    res.status(500).json({
      erro: true,
      mensagemErro: 'Erro ao buscar emails ativos',
      detalhes: error.message
    });
  }
});

// Adicionar novo email
router.post('/emails-transportadoras', verificarToken, verificarAdmin, async (req, res) => {
  console.log('📥 POST /api/db/emails-transportadoras');
  try {
    const { codTransportadora, email } = req.body;
    
    if (!codTransportadora || !email) {
      return res.status(400).json({
        erro: true,
        mensagemErro: 'Código da transportadora e email são obrigatórios'
      });
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        erro: true,
        mensagemErro: 'Email inválido'
      });
    }
    
    const result = await adicionarEmailTransportadora(codTransportadora, email);
    res.json(result);
  } catch (error) {
    console.error('Erro ao adicionar email:', error);
    res.status(500).json({
      erro: true,
      mensagemErro: 'Erro ao adicionar email',
      detalhes: error.message
    });
  }
});

// Atualizar status do email
router.patch('/emails-transportadoras/:id/status', verificarToken, verificarAdmin, async (req, res) => {
  console.log('📥 PATCH /api/db/emails-transportadoras/:id/status');
  try {
    const id = parseInt(req.params.id);
    const { ativo } = req.body;
    
    if (ativo === undefined) {
      return res.status(400).json({
        erro: true,
        mensagemErro: 'Status é obrigatório'
      });
    }
    
    const result = await atualizarStatusEmail(id, ativo ? 1 : 0);
    res.json(result);
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({
      erro: true,
      mensagemErro: 'Erro ao atualizar status do email',
      detalhes: error.message
    });
  }
});

// Deletar email
router.delete('/emails-transportadoras/:id', verificarToken, verificarAdmin, async (req, res) => {
  console.log('📥 DELETE /api/db/emails-transportadoras/:id');
  try {
    const id = parseInt(req.params.id);
    const result = await deletarEmail(id);
    res.json(result);
  } catch (error) {
    console.error('Erro ao deletar email:', error);
    res.status(500).json({
      erro: true,
      mensagemErro: 'Erro ao deletar email',
      detalhes: error.message
    });
  }
});

// ============================================
// ROTAS DE CONFIGURAÇÃO EDI
// ============================================

// Listar configurações EDI
router.get('/configs-edi', verificarToken, async (req, res) => {
  console.log('📥 GET /api/db/configs-edi');
  try {
    const filtros = {
      codTransportadora: req.query.codTransportadora,
      tipoLayout: req.query.tipoLayout,
      ativo: req.query.ativo
    };
    
    const configs = await listarConfigsEdi(filtros);
    res.json({
      erro: false,
      dados: configs
    });
  } catch (error) {
    console.error('Erro ao listar configurações EDI:', error);
    res.status(500).json({
      erro: true,
      mensagemErro: 'Erro ao listar configurações EDI',
      detalhes: error.message
    });
  }
});

// Buscar transportadoras disponíveis (sem configuração EDI) - DEVE VIR ANTES DA ROTA :id
router.get('/configs-edi/transportadoras/disponiveis', verificarToken, async (req, res) => {
  console.log('📥 GET /api/db/configs-edi/transportadoras/disponiveis');
  try {
    const result = await buscarTransportadorasDisponiveis();
    res.json({
      erro: false,
      dados: result
    });
  } catch (error) {
    console.error('Erro ao buscar transportadoras disponíveis:', error);
    res.status(500).json({
      erro: true,
      mensagemErro: 'Erro ao buscar transportadoras disponíveis',
      detalhes: error.message
    });
  }
});

// Buscar configuração EDI por ID
router.get('/configs-edi/:id', verificarToken, async (req, res) => {
  console.log('📥 GET /api/db/configs-edi/:id');
  try {
    const id = parseInt(req.params.id);
    const config = await buscarConfigEdiPorId(id);
    
    if (!config) {
      return res.status(404).json({
        erro: true,
        mensagemErro: 'Configuração EDI não encontrada'
      });
    }
    
    res.json({
      erro: false,
      dados: config
    });
  } catch (error) {
    console.error('Erro ao buscar configuração EDI:', error);
    res.status(500).json({
      erro: true,
      mensagemErro: 'Erro ao buscar configuração EDI',
      detalhes: error.message
    });
  }
});

// Adicionar configuração EDI
router.post('/configs-edi', verificarToken, verificarAdmin, async (req, res) => {
  console.log('📥 POST /api/db/configs-edi');
  try {
    const { codTransportadora, nomeAbreviado, tipoLayout, geraArquivoEdi, ativo } = req.body;
    
    if (!codTransportadora || !nomeAbreviado || !tipoLayout) {
      return res.status(400).json({
        erro: true,
        mensagemErro: 'Código da transportadora, nome abreviado e tipo de layout são obrigatórios'
      });
    }
    
    const dados = {
      codTransportadora,
      nomeAbreviado,
      tipoLayout,
      geraArquivoEdi: geraArquivoEdi !== undefined ? geraArquivoEdi : 1,
      ativo: ativo !== undefined ? ativo : 1
    };
    
    const id = await adicionarConfigEdi(dados);
    res.json({
      erro: false,
      mensagem: 'Configuração EDI adicionada com sucesso',
      id
    });
  } catch (error) {
    console.error('Erro ao adicionar configuração EDI:', error);
    res.status(500).json({
      erro: true,
      mensagemErro: error.message || 'Erro ao adicionar configuração EDI',
      detalhes: error.message
    });
  }
});

// Atualizar configuração EDI
router.put('/configs-edi/:id', verificarToken, verificarAdmin, async (req, res) => {
  console.log('📥 PUT /api/db/configs-edi/:id');
  try {
    const id = parseInt(req.params.id);
    const { nomeAbreviado, tipoLayout, geraArquivoEdi, ativo } = req.body;
    
    if (!nomeAbreviado || !tipoLayout) {
      return res.status(400).json({
        erro: true,
        mensagemErro: 'Nome abreviado e tipo de layout são obrigatórios'
      });
    }
    
    const dados = {
      nomeAbreviado,
      tipoLayout,
      geraArquivoEdi: geraArquivoEdi !== undefined ? geraArquivoEdi : 1,
      ativo: ativo !== undefined ? ativo : 1
    };
    
    await atualizarConfigEdi(id, dados);
    res.json({
      erro: false,
      mensagem: 'Configuração EDI atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar configuração EDI:', error);
    res.status(500).json({
      erro: true,
      mensagemErro: 'Erro ao atualizar configuração EDI',
      detalhes: error.message
    });
  }
});

// Atualizar status da configuração EDI
router.patch('/configs-edi/:id/status', verificarAdmin, async (req, res) => {
  console.log('📥 PATCH /api/db/configs-edi/:id/status');
  try {
    const id = parseInt(req.params.id);
    const { ativo } = req.body;
    
    if (ativo === undefined) {
      return res.status(400).json({
        erro: true,
        mensagemErro: 'Status é obrigatório'
      });
    }
    
    await atualizarStatusConfigEdi(id, ativo ? 1 : 0);
    res.json({
      erro: false,
      mensagem: 'Status atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({
      erro: true,
      mensagemErro: 'Erro ao atualizar status da configuração EDI',
      detalhes: error.message
    });
  }
});

// Deletar configuração EDI
router.delete('/configs-edi/:id', verificarAdmin, async (req, res) => {
  console.log('📥 DELETE /api/db/configs-edi/:id');
  try {
    const id = parseInt(req.params.id);
    await deletarConfigEdi(id);
    res.json({
      erro: false,
      mensagem: 'Configuração EDI deletada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar configuração EDI:', error);
    res.status(500).json({
      erro: true,
      mensagemErro: 'Erro ao deletar configuração EDI',
      detalhes: error.message
    });
  }
});

module.exports = router;
