const fetch = require('node-fetch');

const LOGIN_API_URL = process.env.LOGIN_API_URL || 'https://app-web-api-login-ad.n6qj8t.easypanel.host/auth';
const LOGIN_API_TOKEN = process.env.LOGIN_API_TOKEN || 'kqT3rTT!YGYK-onHPXcCGroe3rD2kTLLcxtAaGa-AbBB6_qn6e';

/**
 * Validação de login via API Active Directory
 */
async function validarLogin(user, password) {
  try {
    console.log('🔑 Tentando login para usuário:', user);
    console.log('📡 API URL:', LOGIN_API_URL);
    
    const response = await fetch(LOGIN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOGIN_API_TOKEN}`
      },
      body: JSON.stringify({ user, password })
    });

    const data = await response.json();
    console.log('📥 Resposta da API AD:', JSON.stringify(data, null, 2));
    console.log('📊 Status HTTP:', response.status);
    
    // Verifica se houve erro HTTP (401, 400, etc)
    if (!response.ok || data.error) {
      console.log('❌ Login falhou - credenciais inválidas');
      return {
        erro: true,
        mensagemErro: 'Usuário ou senha inválidos.'
      };
    }
    
    // Login bem-sucedido
    if (data.success && data.user_info) {
      console.log('✅ Login bem-sucedido:', data.user_info.username);


      // Lê variáveis do .env para usuários admin e comuns
      const adminEnv = process.env.ADMIN_USERS || '';
      const commonEnv = process.env.COMMON_USERS || '';
      const ADMIN_USERS = adminEnv.split(',').map(u => u.trim().toLowerCase()).filter(Boolean);
      const COMMON_USERS = commonEnv.split(',').map(u => u.trim().toLowerCase()).filter(Boolean);
      const userLogin = data.user_info.username?.toLowerCase();

      if (!ADMIN_USERS.includes(userLogin) && !COMMON_USERS.includes(userLogin)) {
        console.log('🚫 Login bloqueado para usuário não autorizado:', userLogin);
        return {
          erro: true,
          mensagemErro: 'Usuário não autorizado a acessar o sistema.'
        };
      }

      // Trata o email que pode vir como string "[]" ou array vazio
      let email = '';
      if (data.user_info.email) {
        if (typeof data.user_info.email === 'string') {
          email = data.user_info.email === '[]' ? '' : data.user_info.email;
        } else if (Array.isArray(data.user_info.email) && data.user_info.email.length > 0) {
          email = data.user_info.email[0];
        }
      }

      return {
        erro: false,
        usuario: data.user_info.display_name || data.user_info.common_name,
        login: data.user_info.username,
        email: email
      };
    }
    
    // Resposta inesperada
    console.log('⚠️ Resposta inesperada da API AD');
    return {
      erro: true,
      mensagemErro: 'Erro ao processar login. Tente novamente.'
    };
    
  } catch (error) {
    console.error('❌ Erro ao validar login na API AD:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao processar login. Tente novamente.'
    };
  }
}

module.exports = {
  validarLogin,
};
