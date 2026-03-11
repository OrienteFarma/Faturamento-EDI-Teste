const rateLimit = require('express-rate-limit');

/**
 * Rate limiter para login - previne força bruta
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 tentativas
  message: {
    erro: true,
    mensagemErro: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Rastreia por IP + username
  keyGenerator: (req) => {
    return `${req.ip}-${req.body.user || 'unknown'}`;
  }
});

/**
 * Rate limiter geral para APIs sensíveis
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // 500 requisições (uso normal da aplicação)
  message: {
    erro: true,
    mensagemErro: 'Muitas requisições. Aguarde alguns minutos e tente novamente.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter estrito para operações de escrita
 */
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 operações por minuto
  message: {
    erro: true,
    mensagemErro: 'Muitas operações de escrita. Aguarde um minuto e tente novamente.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  loginLimiter,
  apiLimiter,
  writeLimiter
};
