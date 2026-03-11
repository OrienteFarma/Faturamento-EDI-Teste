const { executeQuery, sql } = require('../config/database');

/**
 * Busca relatório de romaneios por período
 * 
 * Para melhor performance, recomenda-se criar os seguintes índices no SQL Server:
 * CREATE INDEX IX_pedido_data_exportacao_operacao_situacao ON WMSRX_MTZ.dbo.pedido(data_exportacao, operacao, cod_situacao)
 * CREATE INDEX IX_pedido_volume_cod_pedido ON WMSRX_MTZ.dbo.pedido_volume(cod_pedido)
 * CREATE INDEX IX_entidade_ender_cod_entidade ON WMSRX_MTZ.dbo.entidade_ender(cod_entidade, cod_rota)
 * CREATE INDEX IX_transportadora_rota_cod_rota ON WMSRX_MTZ.dbo.transportadora_rota(cod_rota, cod_transportadora)
 * CREATE INDEX IX_pedido_romaneio_cod_pedido ON WMSRX_MTZ.dbo.pedido_romaneio(cod_pedido)
 */
async function buscarRelatorioRomaneio(dataInicio, dataFim) {
  try {
    const startTime = Date.now();
    console.log(`🔍 Iniciando consulta de ${dataInicio} até ${dataFim}...`);
    
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
        v.data_volume_embarcado,
        CASE WHEN v.tipo_caixa = 1 THEN 'CAIXA 1' WHEN v.tipo_caixa = 2 THEN 'ISOP_44L' ELSE 'FECHADA' END as tipo_volume,
        CASE 
          WHEN TRY_CAST(v.quem_embarcou AS INT) > 0 
          THEN (SELECT fantasia FROM WMSRX_MTZ.dbo.entidade WHERE cod_entidade = CAST(v.quem_embarcou AS INT))
          ELSE v.quem_embarcou 
        END as quem_embarcou,
        ro.cod_transportadora,
        e.fantasia as nome_transportadora,
        r.cod_romaneio,
        ro.cod_rota as rota
      FROM WMSRX_MTZ.dbo.pedido p WITH (NOLOCK)
        INNER JOIN WMSRX_MTZ.dbo.pedido_volume v WITH (NOLOCK)
          ON p.cod_pedido = v.cod_pedido
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
    `;
    
    const queryStartTime = Date.now();
    const result = await executeQuery(query, { 
      dataInicio, 
      dataFim 
    });
    const queryEndTime = Date.now();
    
    const totalTime = ((queryEndTime - startTime) / 1000).toFixed(2);
    const queryTime = ((queryEndTime - queryStartTime) / 1000).toFixed(2);
    const overhead = ((queryStartTime - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Consulta SQL: ${queryTime}s | Overhead: ${overhead}s | Total: ${totalTime}s | Registros: ${result.length}`);
    
    // Debug: verificar registros sem transportadora
    const semTransp = result.filter(r => !r.nome_transportadora || !r.cod_transportadora);
    if (semTransp.length > 0) {
      console.warn(`⚠️ BACKEND: ${semTransp.length} registros SEM transportadora`);
      console.log('Exemplo:', JSON.stringify(semTransp[0], null, 2));
    } else {
      console.log(`✅ Todos os ${result.length} registros têm transportadora`);
    }
    
    // Se não houver resultados, retorna array vazio
    if (!result || result.length === 0) {
      return [{}];
    }
    
    return result;
  } catch (error) {
    console.error('Erro ao buscar relatório de romaneio:', error);
    return {
      erro: true,
      mensagemErro: 'Erro ao buscar relatório. Tente novamente.'
    };
  }
}

module.exports = {
  buscarRelatorioRomaneio,
};
