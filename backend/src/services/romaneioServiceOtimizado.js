const { executeQuery, sql } = require('../config/database');

/**
 * Busca visão agregada de transportadoras (para cards)
 * Retorna apenas totalizadores por transportadora, sem detalhes de pedidos/volumes
 * MUITO mais rápida que a consulta completa
 */
async function buscarVisaoTransportadoras(dataInicio, dataFim) {
  try {
    const startTime = Date.now();
    console.log(`🔍 Iniciando consulta AGREGADA de ${dataInicio} até ${dataFim}...`);
    
    const query = `
      WITH PedidosUnicos AS (
        SELECT DISTINCT
          p.cod_pedido,
          p.valor_total,
          ro.cod_transportadora,
          e.fantasia as nome_transportadora
        FROM WMSRX_MTZ.dbo.pedido p WITH (NOLOCK)
          INNER JOIN WMSRX_MTZ.dbo.entidade_ender en WITH (NOLOCK)
            ON p.cod_entidade = en.cod_entidade
          INNER JOIN WMSRX_MTZ.dbo.transportadora_rota ro WITH (NOLOCK)
            ON en.cod_rota = ro.cod_rota
          LEFT JOIN WMSRX_MTZ.dbo.entidade e WITH (NOLOCK)
            ON ro.cod_transportadora = e.cod_entidade
        WHERE CONVERT(date, p.prenota) BETWEEN @dataInicio AND @dataFim
          AND p.operacao = 1 
          AND p.cod_situacao IN (2,3,4)
      )
      SELECT 
        ro.cod_transportadora,
        MAX(e.fantasia) as nome_transportadora,
        COUNT(DISTINCT p.cod_pedido) as total_pedidos,
        COUNT(pv.volume) as total_volumes,
        SUM(CASE WHEN v.data_embarque IS NOT NULL THEN 1 ELSE 0 END) as volumes_embarcados,
        SUM(CASE WHEN v.data_embarque IS NULL THEN 1 ELSE 0 END) as volumes_pendentes,
        (SELECT SUM(pu.valor_total) FROM PedidosUnicos pu WHERE pu.cod_transportadora = ro.cod_transportadora) as valor_total,
        COUNT(DISTINCT r.cod_romaneio) as total_romaneios
      FROM WMSRX_MTZ.dbo.pedido p WITH (NOLOCK)
        INNER JOIN WMSRX_MTZ.dbo.pedido_volume pv WITH (NOLOCK)
          ON p.cod_pedido = pv.cod_pedido
        INNER JOIN WMSRX_MTZ.dbo.entidade_ender en WITH (NOLOCK)
          ON p.cod_entidade = en.cod_entidade
        INNER JOIN WMSRX_MTZ.dbo.transportadora_rota ro WITH (NOLOCK)
          ON en.cod_rota = ro.cod_rota
        LEFT JOIN WMSRX_MTZ.dbo.pedido_romaneio pr WITH (NOLOCK)
          ON pr.cod_pedido = p.cod_pedido
        LEFT JOIN WMSRX_MTZ.dbo.romaneio r WITH (NOLOCK)
          ON pr.cod_romaneio = r.cod_romaneio
        LEFT JOIN WMSRX_MTZ.dbo.pedido_volume_carregamento v WITH (NOLOCK)
          ON p.cod_pedido = v.cod_pedido
        LEFT JOIN WMSRX_MTZ.dbo.entidade e WITH (NOLOCK)
          ON ro.cod_transportadora = e.cod_entidade
      WHERE CONVERT(date, p.prenota) BETWEEN @dataInicio AND @dataFim
        AND p.operacao = 1 
        AND p.cod_situacao IN (2,3,4)
      GROUP BY 
        ro.cod_transportadora
      ORDER BY MAX(e.fantasia)
    `;
    
    const queryStartTime = Date.now();
    const result = await executeQuery(query, { 
      dataInicio, 
      dataFim 
    });
    const queryEndTime = Date.now();
    
    const totalTime = ((queryEndTime - startTime) / 1000).toFixed(2);
    const queryTime = ((queryEndTime - queryStartTime) / 1000).toFixed(2);
    
    console.log(`✅ Consulta AGREGADA: ${queryTime}s | Total: ${totalTime}s | Transportadoras: ${result.length}`);
    
    return result || [];
  } catch (error) {
    console.error('Erro ao buscar visão agregada de transportadoras:', error);
    throw error;
  }
}

/**
 * Busca detalhes completos de uma transportadora específica
 * Chamado ao clicar em um card
 */
async function buscarDetalhesTransportadora(dataInicio, dataFim, codTransportadora) {
  try {
    const startTime = Date.now();
    console.log(`🔍 Buscando detalhes da transportadora ${codTransportadora}...`);
    
    const query = `
      SELECT 
        cast(p.cod_prenota as varchar) + cast(oriente_custom.dbo.CalcDigitoMod11(p.cod_prenota) as varchar) as cod_pedido,
        CASE
          WHEN p.cod_situacao = 2 THEN 'Em movimentacao'
          WHEN p.cod_situacao = 3 THEN 'Movimentado'
          WHEN p.cod_situacao = 4 THEN 'Concluido'
          ELSE 'outro'
        END as situacao_pedido,
        p.digitacao as dh_digitacao,
        p.prenota as dh_ordem_movimentacao,
        p.encerramento_PN as dh_encerramento_movimentacao,
        p.volumes as pedido_volumes,
        p.valor_total,
        v.volume,
        v.inicio,
        v.encerramento,
        vl.data_embarque,
        CASE WHEN v.tipo_caixa = 1 THEN 'CAIXA 1' WHEN v.tipo_caixa = 2 THEN 'ISOP_44L' ELSE 'FECHADA' END as tipo_volume,
        CASE 
          WHEN TRY_CAST(vl.quem_embarcou AS INT) > 0 
          THEN (SELECT fantasia FROM WMSRX_MTZ.dbo.entidade WHERE cod_entidade = CAST(vl.quem_embarcou AS INT))
          ELSE vl.quem_embarcou 
        END as quem_embarcou,
        ro.cod_transportadora,
        e.fantasia as nome_transportadora,
        r.cod_romaneio,
        ro.cod_rota as rota
      FROM WMSRX_MTZ.dbo.pedido p WITH (NOLOCK)
        INNER JOIN WMSRX_MTZ.dbo.pedido_volume v WITH (NOLOCK)
          ON p.cod_pedido = v.cod_pedido
        LEFT JOIN WMSRX_MTZ.dbo.pedido_volume_carregamento vl WITH (NOLOCK)
          ON p.cod_pedido = vl.cod_pedido AND v.volume = vl.volume
        INNER JOIN WMSRX_MTZ.dbo.entidade_ender en WITH (NOLOCK)
          ON p.cod_entidade = en.cod_entidade
        INNER JOIN WMSRX_MTZ.dbo.transportadora_rota ro WITH (NOLOCK)
          ON en.cod_rota = ro.cod_rota
        LEFT JOIN WMSRX_MTZ.dbo.pedido_romaneio pr WITH (NOLOCK)
          ON pr.cod_pedido = p.cod_pedido
        LEFT JOIN WMSRX_MTZ.dbo.romaneio r WITH (NOLOCK)
          ON pr.cod_romaneio = r.cod_romaneio
        LEFT JOIN WMSRX_MTZ.dbo.entidade e WITH (NOLOCK)
          ON ro.cod_transportadora = e.cod_entidade
      WHERE CONVERT(date, p.prenota) BETWEEN @dataInicio AND @dataFim
        AND p.operacao = 1 
        AND p.cod_situacao IN (2,3,4)
        AND ro.cod_transportadora = @codTransportadora
      ORDER BY p.cod_pedido, v.volume
    `;
    
    const queryStartTime = Date.now();
    const result = await executeQuery(query, { 
      dataInicio, 
      dataFim,
      codTransportadora
    });
    
    // DEBUG: Log para verificar o valor retornado
    if (result && result.length > 0) {
      console.log('🔍 DEBUG quem_embarcou:', {
        primeiro_registro: result[0].quem_embarcou,
        tipo: typeof result[0].quem_embarcou
      });
    }
    
    
    return result || [];
  } catch (error) {
    console.error('Erro ao buscar detalhes da transportadora:', error);
    throw error;
  }
}

module.exports = {
  buscarVisaoTransportadoras,
  buscarDetalhesTransportadora,
};
