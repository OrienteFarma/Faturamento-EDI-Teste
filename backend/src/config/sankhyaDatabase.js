const sql = require('mssql');

// Configuração da conexão com SQL Server SANKHYA (192.168.3.63)
const sankhyaConfig = {
  server: '192.168.3.63',
  database: 'SANKHYA_PROD',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
    connectionTimeout: 60000,
    requestTimeout: 180000, // 3 minutos para queries pesadas
    useUTC: false,
    instanceName: '', // Força conexão sem instância nomeada
  },
  pool: {
    max: 10,
    min: 1,
    idleTimeoutMillis: 60000,
  },
};

let sankhyaPool = null;

/**
 * Obtém ou cria o pool de conexão do Sankhya
 */
async function getSankhyaPool() {
  // Verifica se precisa recriar o pool
  if (sankhyaPool) {
    // Se o pool existe mas não é o servidor correto, fecha e recria
    if (sankhyaPool.config && sankhyaPool.config.server !== '192.168.3.63') {
      console.log(`⚠️ Pool conectado no servidor errado (${sankhyaPool.config.server}). Reconectando...`);
      try {
        await sankhyaPool.close();
      } catch (err) {
        console.log('Erro ao fechar pool antigo:', err.message);
      }
      sankhyaPool = null;
    }
  }
  
  if (!sankhyaPool || !sankhyaPool.connected) {
    try {
      // Cria uma nova instância de ConnectionPool para evitar conflito com outras conexões
      sankhyaPool = new sql.ConnectionPool(sankhyaConfig);
      await sankhyaPool.connect();
      console.log(`✅ Conectado ao SQL Server SANKHYA - Servidor: ${sankhyaPool.config.server} - Database: ${sankhyaPool.config.database}`);
      
      // Handler para reconexão automática
      sankhyaPool.on('error', err => {
        console.error('❌ Erro no pool de conexão Sankhya:', err);
        sankhyaPool = null;
      });
    } catch (error) {
      console.error('❌ Erro ao conectar com SQL Server SANKHYA:', error);
      sankhyaPool = null;
      throw error;
    }
  }
  return sankhyaPool;
}

/**
 * Executa uma query no banco Sankhya
 */
async function executeSankhyaQuery(query, params = {}) {
  try {
    const pool = await getSankhyaPool();
    console.log(`🔍 Executando query no servidor: ${pool.config.server} - Database: ${pool.config.database}`);
    
    const request = pool.request();
    
    // Adiciona parâmetros à request
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
    
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error('❌ Erro ao executar query Sankhya:', error);
    throw error;
  }
}

/**
 * Fecha o pool de conexão do Sankhya
 */
async function closeSankhyaPool() {
  if (sankhyaPool) {
    try {
      await sankhyaPool.close();
      sankhyaPool = null;
      console.log('✅ Pool de conexão Sankhya fechado');
    } catch (error) {
      console.error('❌ Erro ao fechar pool Sankhya:', error);
    }
  }
}

module.exports = {
  sankhyaConfig,
  getSankhyaPool,
  executeSankhyaQuery,
  closeSankhyaPool,
  sql
};
