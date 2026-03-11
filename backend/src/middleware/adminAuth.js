/**
 * Middleware de autorização para rotas administrativas
 * Permite acesso apenas para usuários específicos
 */

const ADMIN_USERS = (process.env.ADMIN_USERS || 'adalbertosilva,albertojunio')
  .split(',')
  .map(u => u.trim().toLowerCase())
  .filter(Boolean);

/**
 * Verifica se o usuário tem permissão de administrador
 */
function verificarAdmin(req, res, next) {
  // Obter userLogin do token JWT decodificado (req.user é preenchido pelo verificarToken)
  const userLogin = req.user?.userLogin || req.headers['x-user-login'] || req.body?.userId || req.query?.userId;
  
  if (!userLogin) {
    return res.status(401).json({
      erro: true,
      mensagemErro: 'Usuário não identificado'
    });
  }

  if (!ADMIN_USERS.includes(userLogin.toLowerCase())) {
    console.log(`🚫 Acesso negado para usuário: ${userLogin}`);
    return res.status(403).json({
      erro: true,
      mensagemErro: 'Acesso negado. Esta funcionalidade é restrita a administradores.'
    });
  }

  console.log(`✅ Acesso admin autorizado para: ${userLogin}`);
  next();
}

module.exports = {
  verificarAdmin
};
