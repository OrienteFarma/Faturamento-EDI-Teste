/**
 * Middleware de autenticação JWT
 * Valida token em todas as requisições protegidas
 */

const jwt = require('jsonwebtoken');

// Chave secreta para assinar tokens (em produção, usar variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || 'oriente-farma-secret-key-2026';
const JWT_EXPIRES_IN = '10h'; // 10 horas

/**
 * Gera token JWT para usuário autenticado
 */
function gerarToken(userData) {
  return jwt.sign(
    {
      userLogin: userData.userLogin,
      userName: userData.userName,
      userEmail: userData.userEmail
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Middleware para verificar token JWT
 */
function verificarToken(req, res, next) {
  // Extrair token do header Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      erro: true,
      mensagemErro: 'Token de autenticação não fornecido',
      expirado: false
    });
  }

  try {
    // Verificar e decodificar token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Adicionar dados do usuário à requisição
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Token inválido:', error.message);
    
    return res.status(401).json({
      erro: true,
      mensagemErro: 'Token de autenticação inválido ou expirado',
      expirado: error.name === 'TokenExpiredError'
    });
  }
}

/**
 * Middleware opcional - apenas adiciona dados do usuário se token válido
 */
function verificarTokenOpcional(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Token inválido, mas continua sem autenticação
      console.warn('⚠️ Token inválido (opcional):', error.message);
    }
  }
  
  next();
}

module.exports = {
  gerarToken,
  verificarToken,
  verificarTokenOpcional,
  JWT_SECRET
};
