const { executeQuery } = require('../config/database');
const wkhtmltopdf = require('wkhtmltopdf');
const fs = require('fs').promises;
const path = require('path');

// Caminho que será montado via volume do Docker
const CAMINHO_SERVIDOR = process.env.CAMINHO_PDF || '/mnt/sankhya/repositorio/Integracao/Faturamento/Romaneio';

/**
 * Busca dados do romaneio através da stored procedure
 */
async function buscarDadosRomaneio(codEntrega) {
  try {
    const query = `EXEC ORIENTE_CUSTOM.dbo.STP_RS_transp_entrega_le_rx_n8n @codigo_entrega = ${codEntrega}`;
    const result = await executeQuery(query);
    return result || [];
  } catch (error) {
    console.error('Erro ao buscar dados do romaneio:', error);
    throw error;
  }
}

/**
 * Gera HTML do romaneio baseado no template do n8n
 */
function gerarHtmlRomaneio(dados, codEntrega) {
  const dataAtual = new Date();
  const dataFormatada = dataAtual.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });

  const rows = dados.map((item, index) => `
    <tr style="background-color: ${index % 2 === 0 ? 'rgb(214, 214, 214)' : '#ffffff'};">
      <td style="text-align: center; padding: 3px; border-bottom: 1px solid #000;">${item.numero_titulo || ''}</td>
      <td style="text-align: center; padding: 3px; border-bottom: 1px solid #000; width: 50px;">${item.rota || ''}</td>
      <td style="text-align: center; padding: 3px; border-bottom: 1px solid #000;">${item.codigo_pedido || ''}</td>
      <td style="text-align: center; padding: 3px; border-bottom: 1px solid #000;">${item.codigo_picking || ''}</td>
      <td style="text-align: left; padding: 3px; border-bottom: 1px solid #000;">${item.razao_social || ''}</td>
      <td style="text-align: left; padding: 3px; border-bottom: 1px solid #000;">${item.cidade || ''}</td>
      <td style="text-align: center; padding: 3px; border-bottom: 1px solid #000;">${item.sigla_estado || ''}</td>
      <td style="text-align: center; padding: 3px; border-bottom: 1px solid #000;">${item.volumes || 0}</td>
      <td style="text-align: right; padding: 3px; border-bottom: 1px solid #000;">${parseFloat(item.valor_total || 0).toFixed(2)}</td>
    </tr>`).join('');

  const totalVolumes = dados.reduce((sum, item) => sum + parseInt(item.volumes || 0, 10), 0);
  const totalValor = dados.reduce((sum, item) => sum + parseFloat(item.valor_total || 0), 0).toFixed(2);
  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(totalValor);

  const totalPedidos = dados.length;
  const transportadora = dados[0]?.transportadora || 'N/A';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { margin: 0; padding: 0; }
        * { box-sizing: border-box; }
        @page {
          margin: 10mm 5mm 15mm 5mm;
          @bottom-center {
            content: "Página " counter(page) " de " counter(pages);
            font-size: 10px;
            font-family: Arial, sans-serif;
            color: #666;
          }
        }
      </style>
    </head>
    <body>
      <div style="font-family: Arial, sans-serif; margin: 0;">
        <!-- Logo à esquerda -->
        <div style="text-align: left;">
          <img src="https://bussola.orientefarma.com.br/assets/images/ORIENTE-MARCA-FINAL.png" alt="Logo da Empresa" style="height: 50px;">
        </div>

        <h1 style="text-align: center; font-size: 20px; font-weight: bold; margin: 10px 0;">
          <strong>Acompanhamento de Entrega Matriz Oriente Farma</strong>
        </h1>
        
        <p style="font-size: 14px; font-weight: bold; margin: 5px 0;">${transportadora}</p>

        <div style="margin-top: 10px; font-size: 12px; display: flex; justify-content: space-between; padding-top: 5px;">
          <p style="margin: 0;">Entrega: ${codEntrega}</p>
          <p style="margin: 0;">Data: ${dataFormatada}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; margin-top: 10px;">
          <thead>
            <tr style="background-color: rgb(160, 160, 160);">
              <th style="text-align: center; padding: 5px;">Título</th>
              <th style="text-align: center; padding: 5px;">Rota</th>
              <th style="text-align: center; padding: 5px;">Pedido</th>
              <th style="text-align: center; padding: 5px;">Picking</th>
              <th style="text-align: left; padding: 5px;">Cliente</th>
              <th style="text-align: left; padding: 5px;">Cidade</th>
              <th style="text-align: center; padding: 5px;">Estado</th>
              <th style="text-align: center; padding: 5px;">Volumes</th>
              <th style="text-align: right; padding: 5px;">Valor Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;">
          <tfoot>
            <tr style="font-weight: bold; background-color: #f0f0f0;">
              <td colspan="7" style="text-align: left; padding: 5px;">Nº de Pedidos: ${totalPedidos}</td>
              <td style="width: 63%; padding: 5px;"> </td>
              <td style="text-align: right; padding: 5px;">${totalVolumes}</td>
              <td style="text-align: right; padding: 5px;">${valorFormatado}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </body>
    </html>
  `;
}

/**
 * Gera PDF a partir do HTML usando wkhtmltopdf
 */
async function gerarPdfDeHtml(html) {
  return new Promise((resolve, reject) => {
    try {
      console.log('📄 Gerando PDF com wkhtmltopdf...');
      
      const chunks = [];
      const stream = wkhtmltopdf(html, {
        pageSize: 'A4',
        marginTop: '10mm',
        marginRight: '5mm',
        marginBottom: '15mm',
        marginLeft: '5mm',
        enableLocalFileAccess: true,
        footerCenter: '[page] / [toPage]',
        footerFontSize: '9',
        footerSpacing: 5
      });
      
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        console.log('✅ PDF gerado com sucesso!');
        resolve(pdfBuffer);
      });
      stream.on('error', reject);
      
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error.message);
      reject(error);
    }
  });
}

/**
 * Salva PDF no servidor de rede (via mount externo)
 */
async function salvarPdfNoServidor(pdf, codEntregaComDigito) {
  try {
    // Formatar data/hora com timezone correto: YYYYMMDD_HHMMSS
    const agora = new Date();
    const dataHora = agora.toLocaleString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo'
    }).replace(/(\d{2})\/(\d{2})\/(\d{4}),?\s(\d{2}):(\d{2}):(\d{2})/, '$3$2$1_$4$5$6');
    
    const nomeArquivo = `${codEntregaComDigito}_${dataHora}.pdf`;
    
    // Criar diretório se não existir
    await fs.mkdir(CAMINHO_SERVIDOR, { recursive: true });
    
    const caminhoCompleto = path.join(CAMINHO_SERVIDOR, nomeArquivo);
    console.log(`💾 Salvando PDF em: ${caminhoCompleto}`);
    
    // Salvar arquivo
    await fs.writeFile(caminhoCompleto, pdf);
    
    console.log(`✅ PDF salvo com sucesso: ${nomeArquivo}`);
    return caminhoCompleto;
    
  } catch (error) {
    console.error('❌ Erro ao salvar PDF no servidor:', error);
    throw error;
  }
}

/**
 * Gera PDF completo do romaneio (busca dados + gera HTML + converte em PDF)
 */
async function gerarPdfRomaneio(codEntrega) {
  try {
    console.log(`📄 Gerando PDF para entrega ${codEntrega}...`);
    
    // Calcular o dígito verificador usando a função do banco
    const queryDigito = `SELECT dbo.CalcDigitoMod11(${codEntrega}) as digito`;
    const resultDigito = await executeQuery(queryDigito);
    const digito = resultDigito[0]?.digito || 0;
    
    // Concatenar cod_entrega com dígito
    const codEntregaComDigito = parseInt(`${codEntrega}${digito}`);
    console.log(`🔢 Código sem dígito: ${codEntrega}, dígito calculado: ${digito}, código final: ${codEntregaComDigito}`);
    
    // Buscar dados usando cod_entrega com dígito
    const dados = await buscarDadosRomaneio(codEntregaComDigito);
    
    console.log(`📊 Registros encontrados: ${dados.length}`);
    
    if (dados.length === 0) {
      throw new Error(`Nenhum dado encontrado para o código de entrega ${codEntregaComDigito} (original: ${codEntrega})`);
    }
    
    // Gerar HTML (exibe o código com dígito)
    const html = gerarHtmlRomaneio(dados, codEntregaComDigito);
    
    // Gerar PDF
    const pdf = await gerarPdfDeHtml(html);
    
    // Salvar PDF no servidor de rede
    await salvarPdfNoServidor(pdf, codEntregaComDigito);
    
    // Calcular totais
    const totalPedidos = dados.length;
    const totalVolumes = dados.reduce((sum, item) => sum + parseInt(item.volumes || 0, 10), 0);
    const valorTotal = dados.reduce((sum, item) => sum + parseFloat(item.valor_total || 0), 0);
    
    console.log(`✅ PDF gerado com sucesso para entrega ${codEntregaComDigito}`);
    
    return {
      buffer: pdf,
      codEntregaDisplay: codEntregaComDigito.toString(),
      totalPedidos,
      totalVolumes,
      valorTotal
    };
    
  } catch (error) {
    console.error('Erro ao gerar PDF do romaneio:', error);
    throw error;
  }
}

/**
 * Gera PDF apenas para visualização (sem salvar no servidor)
 */
async function gerarPdfVisualizacao(codEntrega) {
  try {
    console.log(`📄 Gerando PDF para visualização - entrega ${codEntrega}...`);
    
    // Calcular o dígito verificador usando a função do banco
    const queryDigito = `SELECT dbo.CalcDigitoMod11(${codEntrega}) as digito`;
    const resultDigito = await executeQuery(queryDigito);
    const digito = resultDigito[0]?.digito || 0;
    
    // Concatenar cod_entrega com dígito
    const codEntregaComDigito = parseInt(`${codEntrega}${digito}`);
    console.log(`🔢 Código com dígito: ${codEntregaComDigito}`);
    
    // Buscar dados usando cod_entrega com dígito
    const dados = await buscarDadosRomaneio(codEntregaComDigito);
    
    if (dados.length === 0) {
      throw new Error('Nenhum dado encontrado para este código de entrega');
    }
    
    // Gerar HTML (exibe o código com dígito)
    const html = gerarHtmlRomaneio(dados, codEntregaComDigito);
    
    // Gerar PDF (sem salvar)
    const pdf = await gerarPdfDeHtml(html);
    
    console.log(`✅ PDF gerado para visualização - entrega ${codEntregaComDigito}`);
    return pdf;
    
  } catch (error) {
    console.error('Erro ao gerar PDF para visualização:', error);
    throw error;
  }
}

module.exports = {
  gerarPdfRomaneio,
  gerarPdfVisualizacao,
  buscarDadosRomaneio,
  gerarHtmlRomaneio,
  gerarPdfDeHtml,
  salvarPdfNoServidor
};
