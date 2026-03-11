const { executeQuery, sql } = require('../config/database');
const { validarIdNumerico, sanitizarString } = require('../utils/validator');

/**
 * Lista todas as configurações de EDI
 */
async function listarConfigsEdi(filtros = {}) {
  try {
    console.log('🔍 listarConfigsEdi chamado com filtros:', filtros);
    let query = `
      SELECT 
        c.ID,
        c.COD_TRANSPORTADORA,
        e.FANTASIA as NOME_TRANSPORTADORA,
        c.NOME_ABREVIADO,
        c.TIPO_LAYOUT,
        c.GERA_ARQUIVO_EDI,
        c.ATIVO,
        c.DATA_CRIACAO,
        c.DATA_ALTERACAO
      FROM ORIENTE_CUSTOM.dbo.ROMANEIOEDI_CONFIG_TRANSPORTADORAS c WITH (NOLOCK)
      LEFT JOIN WMSRX_MTZ.dbo.entidade e WITH (NOLOCK) ON e.cod_entidade = c.COD_TRANSPORTADORA
      WHERE 1=1
    `;
    
    console.log('📝 Query montada:', query);
    
    const request = new sql.Request();
    
    if (filtros.codTransportadora) {
      if (!validarIdNumerico(filtros.codTransportadora)) {
        throw new Error('Código de transportadora inválido');
      }
      query += ` AND c.COD_TRANSPORTADORA = @codTransportadora`;
      request.input('codTransportadora', sql.Int, parseInt(filtros.codTransportadora, 10));
    }
    
    if (filtros.tipoLayout) {
      const layouts = ['VER002', 'GERAL'];
      if (!layouts.includes(filtros.tipoLayout)) {
        throw new Error('Tipo de layout inválido');
      }
      query += ` AND c.TIPO_LAYOUT = @tipoLayout`;
      request.input('tipoLayout', sql.VarChar(50), filtros.tipoLayout);
    }
    
    if (filtros.ativo !== undefined && filtros.ativo !== null && filtros.ativo !== '') {
      query += ` AND c.ATIVO = @ativo`;
      request.input('ativo', sql.Bit, filtros.ativo ? 1 : 0);
    }
    
    query += ` ORDER BY c.COD_TRANSPORTADORA, c.ID`;
    
    const result = await request.query(query);
    return result.recordset || [];
  } catch (error) {
    console.error('Erro ao listar configurações EDI:', error);
    throw error;
  }
}

/**
 * Busca configuração EDI por ID
 */
async function buscarConfigEdiPorId(id) {
  try {
    if (!validarIdNumerico(id)) {
      throw new Error('ID inválido');
    }
    
    const request = new sql.Request();
    request.input('id', sql.Int, parseInt(id, 10));
    
    const query = `
      SELECT 
        c.ID,
        c.COD_TRANSPORTADORA,
        e.FANTASIA as NOME_TRANSPORTADORA,
        c.NOME_ABREVIADO,
        c.TIPO_LAYOUT,
        c.GERA_ARQUIVO_EDI,
        c.ATIVO,
        c.DATA_CRIACAO,
        c.DATA_ALTERACAO
      FROM ORIENTE_CUSTOM.dbo.ROMANEIOEDI_CONFIG_TRANSPORTADORAS c WITH (NOLOCK)
      LEFT JOIN WMSRX_MTZ.dbo.entidade e WITH (NOLOCK) ON e.cod_entidade = c.COD_TRANSPORTADORA
      WHERE c.ID = @id
    `;
    
    const result = await request.query(query);
    return result.recordset && result.recordset.length > 0 ? result.recordset[0] : null;
  } catch (error) {
    console.error('Erro ao buscar configuração EDI:', error);
    throw error;
  }
}

/**
 * Adiciona nova configuração EDI
 */
async function adicionarConfigEdi(dados) {
  try {
    // Validar inputs
    if (!validarIdNumerico(dados.codTransportadora)) {
      throw new Error('Código de transportadora inválido');
    }
    
    const nomeAbreviado = sanitizarString(dados.nomeAbreviado);
    const layouts = ['VER002', 'GERAL'];
    if (!layouts.includes(dados.tipoLayout)) {
      throw new Error('Tipo de layout inválido');
    }
    
    // Validar se transportadora já possui configuração
    const requestCheck = new sql.Request();
    requestCheck.input('codTransportadora', sql.Int, parseInt(dados.codTransportadora, 10));
    
    const queryCheck = `
      SELECT ID FROM ORIENTE_CUSTOM.dbo.ROMANEIOEDI_CONFIG_TRANSPORTADORAS WITH (NOLOCK)
      WHERE COD_TRANSPORTADORA = @codTransportadora
    `;
    
    const existe = await requestCheck.query(queryCheck);
    if (existe.recordset && existe.recordset.length > 0) {
      throw new Error('Transportadora já possui configuração EDI cadastrada');
    }
    
    // Inserir nova configuração
    const requestInsert = new sql.Request();
    requestInsert.input('codTransportadora', sql.Int, parseInt(dados.codTransportadora, 10));
    requestInsert.input('nomeAbreviado', sql.VarChar(50), nomeAbreviado);
    requestInsert.input('tipoLayout', sql.VarChar(50), dados.tipoLayout);
    requestInsert.input('geraArquivoEdi', sql.Bit, dados.geraArquivoEdi ? 1 : 0);
    requestInsert.input('ativo', sql.Bit, dados.ativo ? 1 : 0);
    
    const query = `
      INSERT INTO ORIENTE_CUSTOM.dbo.ROMANEIOEDI_CONFIG_TRANSPORTADORAS 
        (COD_TRANSPORTADORA, NOME_ABREVIADO, TIPO_LAYOUT, GERA_ARQUIVO_EDI, ATIVO)
      VALUES 
        (@codTransportadora, @nomeAbreviado, @tipoLayout, @geraArquivoEdi, @ativo);
      
      SELECT SCOPE_IDENTITY() as ID;
    `;
    
    const result = await requestInsert.query(query);
    return result.recordset && result.recordset.length > 0 ? result.recordset[0].ID : null;
  } catch (error) {
    console.error('Erro ao adicionar configuração EDI:', error);
    throw error;
  }
}

/**
 * Atualiza configuração EDI
 */
async function atualizarConfigEdi(id, dados) {
  try {
    if (!validarIdNumerico(id)) {
      throw new Error('ID inválido');
    }
    
    const nomeAbreviado = sanitizarString(dados.nomeAbreviado);
    const layouts = ['VER002', 'GERAL'];
    if (!layouts.includes(dados.tipoLayout)) {
      throw new Error('Tipo de layout inválido');
    }
    
    const request = new sql.Request();
    request.input('id', sql.Int, parseInt(id, 10));
    request.input('nomeAbreviado', sql.VarChar(50), nomeAbreviado);
    request.input('tipoLayout', sql.VarChar(50), dados.tipoLayout);
    request.input('geraArquivoEdi', sql.Bit, dados.geraArquivoEdi ? 1 : 0);
    request.input('ativo', sql.Bit, dados.ativo ? 1 : 0);
    
    const query = `
      UPDATE ORIENTE_CUSTOM.dbo.ROMANEIOEDI_CONFIG_TRANSPORTADORAS
      SET 
        NOME_ABREVIADO = @nomeAbreviado,
        TIPO_LAYOUT = @tipoLayout,
        GERA_ARQUIVO_EDI = @geraArquivoEdi,
        ATIVO = @ativo,
        DATA_ALTERACAO = GETDATE()
      WHERE ID = @id
    `;
    
    await request.query(query);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar configuração EDI:', error);
    throw error;
  }
}

/**
 * Atualiza status da configuração EDI
 */
async function atualizarStatusConfigEdi(id, ativo) {
  try {
    if (!validarIdNumerico(id)) {
      throw new Error('ID inválido');
    }
    
    const request = new sql.Request();
    request.input('id', sql.Int, parseInt(id, 10));
    request.input('ativo', sql.Bit, ativo ? 1 : 0);
    
    const query = `
      UPDATE ORIENTE_CUSTOM.dbo.ROMANEIOEDI_CONFIG_TRANSPORTADORAS
      SET 
        ATIVO = @ativo,
        DATA_ALTERACAO = GETDATE()
      WHERE ID = @id
    `;
    
    await request.query(query);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar status da configuração EDI:', error);
    throw error;
  }
}

/**
 * Deleta configuração EDI
 */
async function deletarConfigEdi(id) {
  try {
    if (!validarIdNumerico(id)) {
      throw new Error('ID inválido');
    }
    
    const request = new sql.Request();
    request.input('id', sql.Int, parseInt(id, 10));
    
    const query = `
      DELETE FROM ORIENTE_CUSTOM.dbo.ROMANEIOEDI_CONFIG_TRANSPORTADORAS
      WHERE ID = @id
    `;
    
    await request.query(query);
    return true;
  } catch (error) {
    console.error('Erro ao deletar configuração EDI:', error);
    throw error;
  }
}

/**
 * Buscar transportadoras disponíveis (que não têm configuração EDI)
 */
async function buscarTransportadorasDisponiveis() {
  try {
    const query = `
      SELECT 
        e.cod_entidade as codigo,
        e.fantasia
      FROM WMSRX_MTZ.dbo.entidade e WITH (NOLOCK)
      WHERE e.cod_tipo = 2 -- Tipo 2 = Transportadora
        AND e.cod_entidade NOT IN (
          SELECT COD_TRANSPORTADORA 
          FROM ORIENTE_CUSTOM.dbo.ROMANEIOEDI_CONFIG_TRANSPORTADORAS WITH (NOLOCK)
        )
      ORDER BY e.fantasia
    `;
    
    const result = await executeQuery(query);
    return result || [];
  } catch (error) {
    console.error('Erro ao buscar transportadoras disponíveis:', error);
    throw error;
  }
}

module.exports = {
  listarConfigsEdi,
  buscarConfigEdiPorId,
  adicionarConfigEdi,
  atualizarConfigEdi,
  atualizarStatusConfigEdi,
  deletarConfigEdi,
  buscarTransportadorasDisponiveis
};
