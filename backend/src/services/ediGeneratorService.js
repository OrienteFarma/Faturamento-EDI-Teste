const { executeSankhyaQuery } = require('../config/sankhyaDatabase');
const { executeQuery, sql } = require('../config/database');
const { validarIdNumerico, validarArrayNumerico } = require('../utils/validator');
const fs = require('fs/promises');
const path = require('path');

/**
 * Busca configuração EDI da transportadora no servidor principal (192.168.1.240)
 */
async function buscarConfigEdiTransportadora(codTransportadora) {
  try {
    if (!validarIdNumerico(codTransportadora)) {
      console.error('Código de transportadora inválido:', codTransportadora);
      return null;
    }
    
    const request = new sql.Request();
    request.input('codTransportadora', sql.Int, parseInt(codTransportadora, 10));
    
    const query = `
      SELECT 
        ID,
        COD_TRANSPORTADORA,
        NOME_ABREVIADO,
        TIPO_LAYOUT,
        GERA_ARQUIVO_EDI,
        ATIVO
      FROM ORIENTE_CUSTOM.dbo.ROMANEIOEDI_CONFIG_TRANSPORTADORAS WITH (NOLOCK)
      WHERE COD_TRANSPORTADORA = @codTransportadora
        AND ATIVO = 1
    `;
    
    const result = await request.query(query);
    return result.recordset && result.recordset.length > 0 ? result.recordset[0] : null;
  } catch (error) {
    console.error('Erro ao buscar configuração EDI:', error);
    return null;
  }
}

/**
 * Gera dados EDI para transportadora 25211 (Layout VER002)
 */
async function gerarDadosEdiVER002(codigosEntrega) {
  try {
    // Validar array de códigos
    if (!validarArrayNumerico(codigosEntrega)) {
      throw new Error('Códigos de entrega inválidos');
    }
    
    // Remove o último dígito aleatório dos códigos de entrega (mantém apenas os 5 primeiros dígitos)
    const codigosFormatados = codigosEntrega.map(cod => {
      const codStr = cod.toString();
      return codStr.length > 5 ? codStr.substring(0, 5) : codStr;
    });
    
    // Validar códigos formatados
    const codigosValidados = codigosFormatados.filter(cod => validarIdNumerico(cod));
    
    if (codigosValidados.length === 0) {
      throw new Error('Nenhum código de entrega válido');
    }
    
    const codigosIn = codigosValidados.join(',');
    
    const query = `
      SELECT
        LEFT('VER002', 6) AS VER002,
        LEFT(ISNULL(FORMAT(TITULO.DTFATUR, 'ddMMyyyy'), '00000000'), 8) AS DATA_EMISSAO,
        LEFT(CONCAT(UPPER(PAR_CLI.NOMEPARC), REPLICATE(' ', 40)), 40) COLLATE SQL_Latin1_General_CP1251_CI_AS AS NOME_PARC,
        LEFT(CONCAT(UPPER(ENDE.NOMEEND), REPLICATE(' ', 40)), 40) COLLATE SQL_Latin1_General_CP1251_CI_AS AS ENDERECO,
        LEFT(CONCAT(UPPER(BAI.NOMEBAI), REPLICATE(' ', 20)), 20) COLLATE SQL_Latin1_General_CP1251_CI_AS AS NOME_BAIRRO,
        LEFT(CONCAT(UPPER(CID.NOMECID), REPLICATE(' ', 30)), 30) COLLATE SQL_Latin1_General_CP1251_CI_AS AS NOME_CIDADE,
        LEFT(UF.UF, 2) AS END_UF,
        LEFT(PAR_CLI.CGC_CPF, 14) AS CNPJ_FARMACIA,
        LEFT(CONCAT(REPLACE(REPLACE(PAR_CLI.IDENTINSCESTAD, '.', ''), '-', ''), REPLICATE(' ', 16)), 16) AS INSC_ESTADUAL,
        LEFT(PAR_CLI.CEP, 8) AS CEP_DEST,
        RIGHT(REPLICATE('0', 10) + LTRIM(STR(TITULO.QTDVOL * 100)), 10) AS QTD_VOL,
        REPLICATE('0', 12) AS ZERO1,
        REPLICATE('0', 12) AS ZERO2,
        REPLICATE('0', 12) AS ZERO3,
        RIGHT(REPLICATE('0', 12) + LTRIM(STR(REPLACE(REPLACE(CONVERT(DECIMAL(15,2), SUM(ITE.VLRTOT)), '.', ''), ',', ''))), 12) AS VALOR_PRODUTOS,
        REPLICATE('0', 8) AS ZERO4,
        RIGHT(REPLICATE('0', 10) + LTRIM(STR(TITULO.QTDVOL * 100)), 10) AS QTD_VOL2,
        RIGHT(REPLICATE('0', 12) + LTRIM(STR(REPLACE(REPLACE((CONVERT(DECIMAL(15,2), TITULO.VLRNOTA)), '.', ''), ',', ''))), 12) AS VALOR_NOTA,
        REPLICATE('0', 4) AS ZERO5,
        '38681730000178' AS CNPJ_EMISSOR,
        RIGHT(REPLICATE('0', 9) + LTRIM(STR(TITULO.NUMNOTA)), 9) AS NUMERO_NF,
        RIGHT(REPLICATE('0', 3) + LTRIM(STR(TITULO.SERIENOTA)), 3) AS SERIE_NF,
        RIGHT(REPLICATE(' ', 8) + CONVERT(VARCHAR, FORMAT(TITULO.DTALTER, 'ddMMyyyy')), 8) AS DATA_COLETA,
        ISNULL(CONVERT(VARCHAR, TITULO.SEQCARGA), '999999') AS SEQ_CARGA,
        RIGHT(REPLICATE('0', 9) + CONVERT(VARCHAR, (ISNULL(TITULO.AD_NUMPEDIDO_OL, TITULO.NUNOTA))), 9) AS NUM_PEDIDO_FORNECEDOR,
        RIGHT(REPLICATE('0', 44) + (TITULO.CHAVENFE), 44) AS CHAVE_NFE
      FROM
        SANKHYA_PROD.SANKHYA.TGFCAB AS titulo
        INNER JOIN SANKHYA_PROD.SANKHYA.TGFITE AS ITE ON ITE.NUNOTA = titulo.NUNOTA
        INNER JOIN SANKHYA_PROD.SANKHYA.TGFVAR AS var ON titulo.NUNOTA = var.NUNOTA AND ITE.SEQUENCIA = VAR.SEQUENCIA
        INNER JOIN (SELECT DISTINCT * FROM [192.168.3.230].[ORIENTE_CUSTOM].[dbo].[vw_wmsoper_integracao_transporte]) AS edi ON titulo.CODPARC = edi.codclientepolo AND var.NUNOTAORIG = edi.codpedidopolo
        INNER JOIN SANKHYA_PROD.SANKHYA.TGFPAR AS PAR_TRANS ON PAR_TRANS.CODPARC = TITULO.CODPARCTRANSP
        INNER JOIN SANKHYA_PROD.SANKHYA.TGFPAR AS PAR_CLI ON PAR_CLI.CODPARC = TITULO.CODPARC
        INNER JOIN SANKHYA_PROD.SANKHYA.TSIBAI AS BAI ON PAR_CLI.CODBAI = BAI.CODBAI
        INNER JOIN SANKHYA_PROD.SANKHYA.TSICID AS CID ON PAR_CLI.CODCID = CID.CODCID
        LEFT JOIN SANKHYA_PROD.SANKHYA.TSIEND AS ENDE ON PAR_CLI.CODEND = ENDE.CODEND
        LEFT JOIN SANKHYA_PROD.SANKHYA.TSIUFS AS UF ON CID.UF = UF.CODUF
      WHERE
        TITULO.TIPMOV IN ('V')
        AND edi.cod_entrega IN (${codigosIn})
      GROUP BY
        PAR_CLI.CGC_CPF,
        TITULO.NUNOTA,
        TITULO.AD_NUMPEDIDO_OL,
        TITULO.DTFATUR,
        PAR_CLI.NOMEPARC,
        PAR_CLI.CEP,
        TITULO.SERIENOTA,
        BAI.NOMEBAI,
        CID.NOMECID,
        UF.UF,
        TITULO.NUMNOTA,
        ENDE.NOMEEND,
        PAR_CLI.IDENTINSCESTAD,
        TITULO.QTDVOL,
        TITULO.CHAVENFE,
        TITULO.SEQCARGA,
        TITULO.VLRDESTAQUE,
        TITULO.DTALTER,
        TITULO.NUNOTA,
        TITULO.BH_CODROTAWMS,
        PAR_TRANS.NOMEPARC,
        TITULO.VLRNOTA
      ORDER BY
        TITULO.NUMNOTA ASC
    `;
    
    console.log(`📊 Executando query EDI para códigos: ${codigosFormatados.join(', ')}`);
    const dados = await executeSankhyaQuery(query);
    console.log(`✅ ${dados.length} registros encontrados para EDI`);
    
    return dados;
  } catch (error) {
    console.error('Erro ao gerar dados EDI VER002:', error);
    throw error;
  }
}

/**
 * Formata dados no layout VER002
 */
function formatarDadosVER002(dados) {
  let textOutput = '';
  
  dados.forEach(row => {
    const line = 
      `${row.VER002}` +
      `${row.DATA_EMISSAO}` +
      `${row.NOME_PARC}` +
      `${row.ENDERECO}` +
      `${row.NOME_BAIRRO}` +
      `${row.NOME_CIDADE}` +
      `${row.END_UF}` +
      `${row.CNPJ_FARMACIA}` +
      `${row.INSC_ESTADUAL}` +
      `${row.CEP_DEST}` +
      `${row.QTD_VOL}` +
      `${row.ZERO1}` +
      `${row.ZERO2}` +
      `${row.ZERO3}` +
      `${row.VALOR_PRODUTOS}` +
      `${row.ZERO4}` +
      `${row.QTD_VOL2}` +
      `${row.VALOR_NOTA}` +
      `${row.ZERO5}` +
      `${row.CNPJ_EMISSOR}` +
      `${row.NUMERO_NF}` +
      `${row.SERIE_NF}` +
      `${row.DATA_COLETA}` +
      `${row.SEQ_CARGA}` +
      `${row.NUM_PEDIDO_FORNECEDOR}` +
      `${row.CHAVE_NFE}`;
    
    textOutput += line + '\n';
  });
  
  return textOutput.trim();
}

/**
 * Gera nome do arquivo EDI
 */
function gerarNomeArquivoEdi(nomeAbreviado) {
  const agora = new Date();
  const dataHora = agora.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
  
  // Extrair partes: "23/01/2026, 16:45" -> dia, mes, ano, hora, minuto
  const match = dataHora.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2})/);
  if (match) {
    const [, dia, mes, ano, hora, minuto] = match;
    return `${nomeAbreviado}_${dia}-${mes}-${ano}_${hora}${minuto}.txt`;
  }
  
  // Fallback se regex falhar
  return `${nomeAbreviado}_${Date.now()}.txt`;
}

/**
 * Salva arquivo EDI no servidor
 */
async function salvarArquivoEdi(conteudo, nomeArquivo) {
  try {
    const pastaEdi = process.env.CAMINHO_EDI || '/mnt/sankhya/repositorio/Integracao/Faturamento/EDI';
    const caminhoCompleto = path.join(pastaEdi, nomeArquivo);
    
    console.log(`📁 Salvando arquivo EDI em: ${caminhoCompleto}`);
    
    // Criar pasta se não existir
    await fs.mkdir(pastaEdi, { recursive: true });
    
    // Salvar arquivo
    await fs.writeFile(caminhoCompleto, conteudo, 'utf8');
    
    console.log(`✅ Arquivo EDI salvo com sucesso: ${nomeArquivo}`);
    return caminhoCompleto;
  } catch (error) {
    console.error('❌ Erro ao salvar arquivo EDI:', error);
    throw error;
  }
}

/**
 * Função principal para gerar arquivo EDI
 */
async function gerarArquivoEdi(codTransportadora, codigosEntrega) {
  try {
    console.log(`📄 Iniciando geração de arquivo EDI para transportadora ${codTransportadora}`);
    
    // Buscar configuração da transportadora
    const config = await buscarConfigEdiTransportadora(codTransportadora);
    
    if (!config) {
      console.log(`⚠️ Transportadora ${codTransportadora} não possui configuração EDI`);
      return null;
    }
    
    if (config.GERA_ARQUIVO_EDI !== 1) {
      console.log(`⚠️ Geração de arquivo EDI desabilitada para transportadora ${codTransportadora}`);
      return null;
    }
    
    // Gerar dados conforme o layout
    let dados, conteudo;
    
    switch (config.TIPO_LAYOUT) {
      case 'VER002':
        dados = await gerarDadosEdiVER002(codigosEntrega);
        if (!dados || dados.length === 0) {
          console.log('⚠️ Nenhum dado encontrado para gerar EDI');
          return null;
        }
        conteudo = formatarDadosVER002(dados);
        break;
      
      case 'GERAL':
        dados = await gerarDadosEdiGERAL(codigosEntrega);
        if (!dados || dados.length === 0) {
          console.log('⚠️ Nenhum dado encontrado para gerar EDI');
          return null;
        }
        conteudo = formatarDadosGERAL(dados);
        break;
        
      default:
        throw new Error(`Layout ${config.TIPO_LAYOUT} não implementado`);
    }
    
    // Gerar nome do arquivo
    const nomeArquivo = gerarNomeArquivoEdi(config.NOME_ABREVIADO);
    
    // Salvar arquivo
    await salvarArquivoEdi(conteudo, nomeArquivo);
    
    // Retornar buffer e informações
    return {
      nomeArquivo,
      conteudo,
      buffer: Buffer.from(conteudo, 'utf8'),
      registros: dados.length
    };
    // Validar array de códigos
    if (!validarArrayNumerico(codigosEntrega)) {
      throw new Error('Códigos de entrega inválidos');
    }
    
    const codigosValidados = codigosEntrega.filter(cod => validarIdNumerico(cod));
    
    if (codigosValidados.length === 0) {
      throw new Error('Nenhum código de entrega válido');
    }
    
    const codigosIn = codigosValidados
  } catch (error) {
    console.error('Erro ao gerar arquivo EDI:', error);
    throw error;
  }
}

/**
 * Gera dados EDI para Layout GERAL
 */
async function gerarDadosEdiGERAL(codigosEntrega) {
  try {
    const codigosIn = codigosEntrega.join(',');
    
    const query = `
      SELECT
        RIGHT(REPLICATE('0', 44) + (TITULO.CHAVENFE), 44) AS CHAVE_NFE,
        RIGHT(REPLICATE('0', 9 ) + LTRIM(STR(TITULO.NUMNOTA)), 9) AS NUMERO_NF,
        CONVERT(VARCHAR,ISNULL(FORMAT(TITULO.DTFATUR, 'yyyyMMdd'), '00000000'),112) AS DATA_EMISSAO,
        '38681730000178' AS CNPJ_EMISSOR,
        RIGHT(REPLICATE('0', 14) + (PAR_CLI.CGC_CPF), 14) AS CNPJ_FARMACIA,
        LEFT(CONCAT(UPPER(PAR_CLI.RAZAOSOCIAL), REPLICATE(' ', 60)), 60) COLLATE SQL_Latin1_General_CP1251_CI_AS AS NOME_PARC,
        LEFT(CONCAT(UPPER(ENDE.NOMEEND), REPLICATE(' ', 60)), 60) COLLATE SQL_Latin1_General_CP1251_CI_AS AS ENDERECO,
        RIGHT(REPLICATE('0', 10) + (PAR_CLI.NUMEND), 10) AS NUM_ENDE,
        LEFT(CONCAT(UPPER(BAI.NOMEBAI), REPLICATE(' ', 60)), 60) COLLATE SQL_Latin1_General_CP1251_CI_AS AS NOME_BAIRRO,
        LEFT(CONCAT(CID.CODMUNFIS, REPLICATE('0', 7)), 7) AS NOME_CIDADE,
        LEFT(CONCAT(PAR_CLI.CEP, REPLICATE('0', 8)), 8) AS CEP_DEST,
        RIGHT(REPLICATE('0', 16) + LTRIM(REPLACE(REPLACE(PAR_CLI.IDENTINSCESTAD, '.', ''), '-', '')), 16) AS INSC_ESTADUAL,
        RIGHT(REPLICATE('0', 15) + LTRIM(CONVERT(VARCHAR,CONVERT(DECIMAL(15,2),TITULO.VLRNOTA - TITULO.VLRDESTAQUE))), 15) AS VALOR_NOTA,
        RIGHT(REPLICATE('0', 3) + LTRIM(TITULO.QTDVOL), 3) AS QTD_VOL,
        '000000.000' AS PESOLIQ,
        '000000.000' AS PESOBRU,
        CONVERT(VARCHAR,DATEADD(dd,90,TITULO.DTFATUR),112) as VEN_NFE
      FROM
        SANKHYA_PROD.SANKHYA.TGFCAB as titulo
        inner join SANKHYA_PROD.SANKHYA.TGFVAR as var 
          on titulo.NUNOTA = var.NUNOTA 
        inner join SANKHYA_PROD.SANKHYA.TGFCAB as pedido
          on var.NUNOTAORIG = pedido.NUNOTA
        inner join [192.168.3.230].[ORIENTE_CUSTOM].[dbo].[vw_wmsoper_integracao_transporte] as edi
          on titulo.CODPARC = edi.codclientepolo and pedido.NUNOTA  = edi.codpedidopolo
        inner join SANKHYA_PROD.SANKHYA.TGFPAR as PAR_TRANS 
          ON PAR_TRANS.CODPARC = TITULO.CODPARCTRANSP 
        inner join SANKHYA_PROD.SANKHYA.TGFPAR as PAR_CLI
          ON PAR_CLI.CODPARC = TITULO.CODPARC 
        inner join SANKHYA_PROD.SANKHYA.TSIBAI as BAI 
          ON PAR_CLI.CODBAI = BAI.CODBAI
        inner join SANKHYA_PROD.SANKHYA.TSICID CID 
          ON PAR_CLI.CODCID = CID.CODCID
        left join SANKHYA_PROD.SANKHYA.TSIEND ENDE 
          ON PAR_CLI.CODEND = ENDE.CODEND
        left join SANKHYA_PROD.SANKHYA.TSIUFS UF 
          ON CID.UF = UF.CODUF
      WHERE
        TITULO.TIPMOV in ('V')
        AND edi.cod_entrega in (${codigosIn})
      GROUP BY
        PAR_CLI.CGC_CPF,
        TITULO.NUNOTA,
        TITULO.AD_NUMPEDIDO_OL,
        TITULO.DTFATUR,
        PAR_CLI.NOMEPARC,
        PAR_CLI.CEP,
        TITULO.SERIENOTA,
        BAI.NOMEBAI,
        CID.CODMUNFIS,
        UF.UF,
        TITULO.NUMNOTA,
        ENDE.NOMEEND,
        PAR_CLI.IDENTINSCESTAD,
        TITULO.QTDVOL,
        TITULO.CHAVENFE,
        TITULO.SEQCARGA,
        TITULO.VLRNOTA,
        TITULO.VLRDESTAQUE,
        TITULO.DTALTER,
        TITULO.NUNOTA,
        TITULO.BH_CODROTAWMS,
        PAR_TRANS.NOMEPARC,
        PAR_CLI.numend,
        PAR_CLI.RAZAOSOCIAL,
        TITULO.DTFATUR
      ORDER BY
        TITULO.NUMNOTA ASC
    `;
    
    console.log(`📊 Buscando dados GERAL para entregas: ${codigosIn}`);
    const dados = await executeSankhyaQuery(query);
    console.log(`✅ ${dados.length} registros encontrados para layout GERAL`);
    
    return dados;
  } catch (error) {
    console.error('Erro ao gerar dados EDI GERAL:', error);
    throw error;
  }
}

/**
 * Formata dados do layout GERAL para string EDI
 */
function formatarDadosGERAL(dados) {
  return dados.map(registro => {
    return [
      registro.CHAVE_NFE,
      registro.NUMERO_NF,
      registro.DATA_EMISSAO,
      registro.CNPJ_EMISSOR,
      registro.CNPJ_FARMACIA,
      registro.NOME_PARC,
      registro.ENDERECO,
      registro.NUM_ENDE,
      registro.NOME_BAIRRO,
      registro.NOME_CIDADE,
      registro.CEP_DEST,
      registro.INSC_ESTADUAL,
      registro.VALOR_NOTA,
      registro.QTD_VOL,
      registro.PESOLIQ,
      registro.PESOBRU,
      registro.VEN_NFE
    ].join('');
  }).join('\n');
}

module.exports = {
  buscarConfigEdiTransportadora,
  gerarArquivoEdi,
  gerarDadosEdiVER002,
  formatarDadosVER002,
  gerarDadosEdiGERAL,
  formatarDadosGERAL,
  gerarNomeArquivoEdi
};
