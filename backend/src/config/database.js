const sql = require('mssql');

// Configuração da conexão com SQL Server
const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
    connectionTimeout: 60000, // 60 segundos
    requestTimeout: 120000, // 120 segundos para queries pesadas
    // Otimizações para grandes volumes de dados
    useUTC: false, // Evita conversão de timezone desnecessária
    parseJSON: false, // Desabilita parsing automático de JSON
    rowCollectionOnRequestCompletion: true, // Coleta todas as linhas de uma vez
  },
  pool: {
    max: 20, // Aumenta pool para melhor performance
    min: 2, // Mantém conexões mínimas abertas
    idleTimeoutMillis: 60000,
  },
};

let pool = null;

/**
 * Obtém ou cria uma conexão pool com o SQL Server
 */
async function getPool() {
  if (!pool) {
    try {
      pool = await sql.connect(config);
      console.log('✅ Conectado ao SQL Server');
      
      // Listener para reconexão em caso de erro
      pool.on('error', err => {
        console.error('❌ Erro no pool de conexão:', err);
        pool = null;
      });
    } catch (err) {
      console.error('❌ Erro ao conectar no SQL Server:', err);
      throw err;
    }
  }
  return pool;
}

/**
 * Executa uma query no banco de dados com otimizações para grandes volumes
 */
async function executeQuery(query, params = {}, timeout = 120000) {
  try {
    const pool = await getPool();
    const request = pool.request();
    
    // Define timeout específico para este request
    request.timeout = timeout;
    
    // Otimizações para grandes volumes de dados
    request.stream = false; // Modo bulk, não streaming
    request.multiple = false; // Apenas um recordset
    
    // Adiciona parâmetros à query
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
    
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    console.error('❌ Erro ao executar query:', err);
    throw err;
  }
}

/**
 * Fecha a conexão com o banco (usar apenas no encerramento da aplicação)
 */
async function closePool() {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('🔌 Conexão com SQL Server fechada');
  }
}

module.exports = {
  getPool,
  executeQuery,
  closePool,
  sql,
};
