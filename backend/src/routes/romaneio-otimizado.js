const express = require('express');
const router = express.Router();
const { buscarVisaoTransportadoras, buscarDetalhesTransportadora } = require('../services/romaneioServiceOtimizado');

/**
 * GET /api/romaneio/visao-transportadoras
 * Retorna visão agregada (cards) - RÁPIDA
 */
router.get('/visao-transportadoras', async (req, res) => {
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

/**
 * GET /api/romaneio/detalhes-transportadora/:codTransportadora
 * Retorna detalhes completos de uma transportadora - chamado ao clicar no card
 */
router.get('/detalhes-transportadora/:codTransportadora', async (req, res) => {
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

module.exports = router;
