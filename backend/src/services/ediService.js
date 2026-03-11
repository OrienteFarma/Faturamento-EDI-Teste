const { executeQuery, sql } = require('../config/database');

/**
 * Busca lista de transportadoras ativas
 */
async function buscarTransportadoras() {
  try {
    const query = `
      SELECT DISTINCT
        ro.cod_transportadora,
        e.fantasia as nome_transportadora
      FROM WMSRX_MTZ.dbo.transportadora_rota ro WITH (NOLOCK)
        INNER JOIN WMSRX_MTZ.dbo.entidade e WITH (NOLOCK)
          ON ro.cod_transportadora = e.cod_entidade
      WHERE ro.cod_transportadora IS NOT NULL
        AND e.fantasia IS NOT NULL
      ORDER BY e.fantasia
    `;
    
    const result = await executeQuery(query);
    console.log(`✅ ${result.length} transportadoras encontradas`);
    return result || [];
  } catch (error) {
    console.error('Erro ao buscar transportadoras:', error);
    throw error;
  }
}

/**
 * Busca romaneios de uma transportadora específica
 */
async function buscarRomaneioPorTransportadora(codTransportadora) {
  try {
    const startTime = Date.now();
    console.log(`🔍 Buscando romaneios da transportadora ${codTransportadora}...`);
    
    const query = `
      WITH RomaneioAgrupado AS (
        SELECT 
          rm.cod_entrega,
          MAX(r.impressao) as data_romaneio,
          COUNT(DISTINCT r.rota) as total_rotas,
          COUNT(DISTINCT r.cod_romaneio) as total_romaneios,
          SUM(r.volumes) as total_volumes
        FROM WMSRX_MTZ.dbo.romaneio r WITH (NOLOCK)
        INNER JOIN WMSRX_MTZ.dbo.romaneio_romaneio_entrega rm WITH (NOLOCK)
          ON r.cod_romaneio = rm.cod_romaneio
        WHERE r.cod_transportador = @codTransportadora
          AND CONVERT(date, r.impressao) >= DATEADD(DAY, -15, GETDATE())
        GROUP BY rm.cod_entrega
      ),
      PedidosValores AS (
        SELECT 
          rm.cod_entrega,
          COUNT(DISTINCT p.cod_pedido) as total_pedidos,
          SUM(p.valor_total) as valor_total
        FROM WMSRX_MTZ.dbo.romaneio r WITH (NOLOCK)
          INNER JOIN WMSRX_MTZ.dbo.romaneio_romaneio_entrega rm WITH (NOLOCK)
            ON r.cod_romaneio = rm.cod_romaneio
          INNER JOIN WMSRX_MTZ.dbo.pedido_romaneio pr WITH (NOLOCK)
            ON pr.cod_romaneio = r.cod_romaneio
          INNER JOIN WMSRX_MTZ.dbo.pedido p WITH (NOLOCK)
            ON pr.cod_pedido = p.cod_pedido
        WHERE r.cod_transportador = @codTransportadora
          AND CONVERT(date, r.impressao) >= DATEADD(DAY, -15, GETDATE())
          AND p.operacao = 1 
          AND p.cod_situacao IN (2,3,4)
        GROUP BY rm.cod_entrega
      ),
      VolumesPendentes AS (
        SELECT 
          rm.cod_entrega,
          COUNT(v.volume) as pendentes
        FROM WMSRX_MTZ.dbo.romaneio r WITH (NOLOCK)
          INNER JOIN WMSRX_MTZ.dbo.romaneio_romaneio_entrega rm WITH (NOLOCK)
            ON r.cod_romaneio = rm.cod_romaneio
          INNER JOIN WMSRX_MTZ.dbo.pedido_romaneio pr WITH (NOLOCK)
            ON pr.cod_romaneio = r.cod_romaneio
          INNER JOIN WMSRX_MTZ.dbo.pedido_volume v WITH (NOLOCK)
            ON pr.cod_pedido = v.cod_pedido
        WHERE r.cod_transportador = @codTransportadora
          AND CONVERT(date, r.impressao) >= DATEADD(DAY, -15, GETDATE())
          AND v.data_volume_embarcado IS NULL
          AND not exists (
            select 1 from WMSRX_MTZ.dbo.pedido_volume_carregamento pvc where pvc.cod_pedido = v.cod_pedido
          )
        GROUP BY rm.cod_entrega
      )
      SELECT 
        ra.cod_entrega,
        CAST(ra.cod_entrega AS VARCHAR) + CAST(dbo.CalcDigitoMod11(ra.cod_entrega) AS VARCHAR) as cod_entrega_display,
        CONVERT(VARCHAR(10), ra.data_romaneio, 103) as data_romaneio,
        ra.total_rotas,
        ra.total_romaneios,
        ISNULL(pv.total_pedidos, 0) as total_pedidos,
        ra.total_volumes,
        ISNULL(vp.pendentes, 0) as volumes_pendentes,
        ISNULL(pv.valor_total, 0) as valor_total
      FROM RomaneioAgrupado ra
        LEFT JOIN PedidosValores pv ON ra.cod_entrega = pv.cod_entrega
        LEFT JOIN VolumesPendentes vp ON ra.cod_entrega = vp.cod_entrega
      ORDER BY ra.cod_entrega DESC
    `;
    
    const result = await executeQuery(query, { codTransportadora });
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ ${result.length} romaneios encontrados em ${totalTime}s`);
    
    if (result.length > 0) {
      console.log('Exemplo de romaneio:', result[0]);
    }
    
    return result || [];
  } catch (error) {
    console.error('❌ Erro ao buscar romaneios:', error);
    throw error;
  }
}

module.exports = {
  buscarTransportadoras,
  buscarRomaneioPorTransportadora,
};
