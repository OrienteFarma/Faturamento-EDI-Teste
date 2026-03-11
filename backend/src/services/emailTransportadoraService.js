const { executeQuery, sql } = require('../config/database');
const { validarEmail, validarIdNumerico } = require('../utils/validator');

/**
 * Buscar todos os emails de transportadoras com filtros
 */
async function buscarEmailsTransportadoras(filtros = {}) {
  try {
    const request = new sql.Request();
    
    let query = `
      SELECT 
        e.ID,
        e.COD_TRANSPORTADORA,
        t.fantasia as NOME_TRANSPORTADORA,
        e.EMAIL,
        e.ATIVO
      FROM ORIENTE_CUSTOM.dbo.ROMANEIOEDI_EMAIL_TRANSPORTADORAS e WITH (NOLOCK)
      LEFT JOIN WMSRX_MTZ.dbo.entidade t WITH (NOLOCK) ON t.cod_entidade = e.COD_TRANSPORTADORA
      WHERE 1=1
    `;
    
    // Filtro por transportadora (validado)
    if (filtros.codTransportadora) {
      if (!validarIdNumerico(filtros.codTransportadora)) {
        throw new Error('Código de transportadora inválido');
      }
      query += ` AND e.COD_TRANSPORTADORA = @codTransportadora`;
      request.input('codTransportadora', sql.Int, parseInt(filtros.codTransportadora, 10));
    }
    
    // Filtro por status (ativo/inativo)
    if (filtros.ativo !== undefined && filtros.ativo !== null) {
      query += ` AND e.ATIVO = @ativo`;
      request.input('ativo', sql.Bit, filtros.ativo ? 1 : 0);
    }
    
    // Filtro por email (pesquisa parcial - sanitizado)
    if (filtros.email) {
      const emailLimpo = filtros.email.replace(/[%_\[\]]/g, ''); // Remove wildcards SQL
      query += ` AND e.EMAIL LIKE @email`;
      request.input('email', sql.VarChar, `%${emailLimpo}%`);
    }
    
    query += ` ORDER BY t.fantasia, e.EMAIL`;
    
    const result = await request.query(query);
    const dados = result.recordset;
    
    return {
      erro: false,
      data: dados
    };
  } catch (error) {
    console.error('Erro ao buscar emails de transportadoras:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao buscar emails de transportadoras'
    };
  }
}

/**
 * Buscar emails ativos de uma transportadora específica
 */
async function buscarEmailsAtivosPorTransportadora(codTransportadora) {
  try {
    if (!validarIdNumerico(codTransportadora)) {
      throw new Error('Código de transportadora inválido');
    }
    
    const request = new sql.Request();
    request.input('codTransportadora', sql.Int, parseInt(codTransportadora, 10));
    
    const query = `
      SELECT EMAIL
      FROM ORIENTE_CUSTOM.dbo.ROMANEIOEDI_EMAIL_TRANSPORTADORAS WITH (NOLOCK)
      WHERE COD_TRANSPORTADORA = @codTransportadora
        AND ATIVO = 1
      ORDER BY EMAIL
    `;
    
    const result = await request.query(query);
    const dados = result.recordset;
    
    return {
      erro: false,
      data: dados.map(r => r.EMAIL)
    };
  } catch (error) {
    console.error('Erro ao buscar emails ativos:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao buscar emails ativos'
    };
  }
}

/**
 * Adicionar novo email de transportadora
 */
async function adicionarEmailTransportadora(codTransportadora, email) {
  try {
    // Validações
    if (!validarIdNumerico(codTransportadora)) {
      return {
        erro: true,
        mensagemErro: 'Código de transportadora inválido'
      };
    }
    
    if (!validarEmail(email)) {
      return {
        erro: true,
        mensagemErro: 'Email inválido'
      };
    }
    
    // Verificar se o email já existe para esta transportadora específica
    const requestVerifica = new sql.Request();
    requestVerifica.input('codTransportadora', sql.Int, parseInt(codTransportadora, 10));
    requestVerifica.input('email', sql.VarChar(200), email);
    
    const verificaQuery = `
      SELECT COUNT(*) as total
      FROM ORIENTE_CUSTOM.dbo.ROMANEIOEDI_EMAIL_TRANSPORTADORAS WITH (NOLOCK)
      WHERE COD_TRANSPORTADORA = @codTransportadora
        AND EMAIL = @email
    `;
    
    const verificacao = await requestVerifica.query(verificaQuery);
    const dados = verificacao.recordset;
    
    if (dados[0].total > 0) {
      return {
        erro: true,
        mensagemErro: 'Este email já está cadastrado para esta transportadora'
      };
    }
    
    // Inserir o novo email
    const requestInsert = new sql.Request();
    requestInsert.input('codTransportadora', sql.Int, parseInt(codTransportadora, 10));
    requestInsert.input('email', sql.VarChar(200), email);
    
    const query = `
      INSERT INTO ORIENTE_CUSTOM.dbo.ROMANEIOEDI_EMAIL_TRANSPORTADORAS 
        (COD_TRANSPORTADORA, EMAIL, ATIVO)
      VALUES 
        (@codTransportadora, @email, 1);
      
      SELECT SCOPE_IDENTITY() as ID;
    `;
    
    const result = await requestInsert.query(query);
    const resultData = result.recordset;
    
    return {
      erro: false,
      mensagem: 'Email adicionado com sucesso',
      data: { id: resultData[0].ID }
    };
  } catch (error) {
    console.error('Erro ao adicionar email:', error);
    
    return {
      erro: true,
      mensagemErro: 'Erro ao adicionar email'
    };
  }
}

/**
 * Atualizar status (ativo/inativo) de um email
 */
async function atualizarStatusEmail(id, ativo) {
  try {
    if (!validarIdNumerico(id)) {
      return {
        erro: true,
        mensagemErro: 'ID inválido'
      };
    }
    
    const request = new sql.Request();
    request.input('id', sql.Int, parseInt(id, 10));
    request.input('ativo', sql.Bit, ativo ? 1 : 0);
    
    const query = `
      UPDATE ORIENTE_CUSTOM.dbo.ROMANEIOEDI_EMAIL_TRANSPORTADORAS
      SET ATIVO = @ativo
      WHERE ID = @id
    `;
    
    await request.query(query);
    
    return {
      erro: false,
      mensagem: `Email ${ativo ? 'ativado' : 'inativado'} com sucesso`
    };
  } catch (error) {
    console.error('Erro ao atualizar status do email:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao atualizar status do email'
    };
  }
}

/**
 * Deletar email
 */
async function deletarEmail(id) {
  try {
    if (!validarIdNumerico(id)) {
      return {
        erro: true,
        mensagemErro: 'ID inválido'
      };
    }
    
    const request = new sql.Request();
    request.input('id', sql.Int, parseInt(id, 10));
    
    const query = `
      DELETE FROM ORIENTE_CUSTOM.dbo.ROMANEIOEDI_EMAIL_TRANSPORTADORAS
      WHERE ID = @id
    `;
    
    await request.query(query);
    
    return {
      erro: false,
      mensagem: 'Email deletado com sucesso'
    };
  } catch (error) {
    console.error('Erro ao deletar email:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao deletar email'
    };
  }
}

module.exports = {
  buscarEmailsTransportadoras,
  buscarEmailsAtivosPorTransportadora,
  adicionarEmailTransportadora,
  atualizarStatusEmail,
  deletarEmail
};
