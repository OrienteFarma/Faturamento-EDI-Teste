const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

const API_BASE_URL = process.env.API_BASE_URL || 'https://n8n-webhook.orientefarma.com.br/webhook/faturamento/romaneio_edi';
const API_AUTH_HEADER = process.env.API_AUTH_HEADER || 'KehdNqH-!kGRiqjXbrWnwgBrvffi*PYdWWkgoi3*svQ6UR4@Xb';

// Rotas otimizadas de romaneio
const romaneioOtimizado = require('./romaneio-otimizado');

// Log das rotas registradas
console.log('🔧 Registrando rotas da API...');

// Rota de Login
router.post('/login', async (req, res) => {
  console.log('📥 POST /api/login');
  try {
    const { user, password } = req.body;

    if (!user || !password) {
      return res.json({
        erro: true,
        mensagemErro: 'Usuário e senha são obrigatórios.'
      });
    }

    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_AUTH_HEADER
      },
      body: JSON.stringify({ user, password })
    });

    const data = await response.json();

    // Se a resposta é um array, pega o primeiro elemento
    if (Array.isArray(data) && data.length > 0) {
      return res.json(data[0]);
    }

    res.json(data);
  } catch (error) {
    console.error('Erro na rota de login:', error);
    res.json({
      erro: true,
      mensagemErro: 'Erro ao processar login. Tente novamente.'
    });
  }
});

// Rota de Relatório Romaneio
router.post('/relatorio/romaneio', async (req, res) => {
  console.log('📥 POST /api/relatorio/romaneio');
  console.log('Body:', req.body);
  try {
    const { dataInicio, dataFim } = req.body;

    const response = await fetch(`${API_BASE_URL}/relatorio/romaneio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_AUTH_HEADER
      },
      body: JSON.stringify({ dataInicio, dataFim })
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Erro na rota de relatório:', error);
    res.json({
      erro: true,
      mensagemErro: 'Erro ao buscar relatório. Tente novamente.'
    });
  }
});

// Rotas otimizadas de romaneio
router.use('/romaneio', romaneioOtimizado);

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend is running',
    timestamp: new Date().toISOString()
  });
});

console.log('✅ Rotas registradas: /login, /relatorio/romaneio, /romaneio/visao-transportadoras, /romaneio/detalhes-transportadora, /health');

module.exports = router;
