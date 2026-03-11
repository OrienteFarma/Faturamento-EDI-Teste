const nodemailer = require('nodemailer');
const { buscarEmailsAtivosPorTransportadora } = require('./emailTransportadoraService');

// Configuração do transporter do Gmail
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER || 'faturamento@orientefarma.com.br',
    pass: process.env.EMAIL_PASSWORD || 'qooc hybm lsgi vyss'
  },
  tls: {
    rejectUnauthorized: false
  },
  // Forçar IPv4
  family: 4
});

/**
 * Envia email com PDFs anexados e arquivo EDI (se fornecido)
 */
async function enviarEmailComPdfs(pdfs, transportadora, dataAssunto, arquivoEdi = null) {
  try {
    console.log(`📧 Preparando email para envio...`);
    
    // Buscar emails ativos da transportadora
    const resultEmails = await buscarEmailsAtivosPorTransportadora(transportadora.codigo);
    
    if (resultEmails.erro || !resultEmails.data || resultEmails.data.length === 0) {
      throw new Error(`Nenhum email ativo encontrado para a transportadora ${transportadora.nome}`);
    }
    
    const emailsDestinatarios = resultEmails.data.join(', ');
    console.log(`📧 Destinatários: ${emailsDestinatarios}`);
    
    // Preparar anexos dos PDFs
    const anexos = pdfs.map((pdf) => ({
      filename: `romaneio_${pdf.codEntregaDisplay}_${new Date().toISOString().substring(0, 10)}.pdf`,
      content: Buffer.isBuffer(pdf.buffer) ? pdf.buffer : Buffer.from(pdf.buffer)
    }));
    
    // Adicionar arquivo EDI aos anexos, se existir
    if (arquivoEdi && arquivoEdi.buffer) {
      anexos.push({
        filename: arquivoEdi.nomeArquivo,
        content: Buffer.isBuffer(arquivoEdi.buffer) ? arquivoEdi.buffer : Buffer.from(arquivoEdi.buffer)
      });
      console.log(`📎 Arquivo EDI adicionado aos anexos: ${arquivoEdi.nomeArquivo}`);
    }

    // Calcular totais
    const totais = pdfs.reduce((acc, pdf) => {
      acc.pedidos += pdf.totalPedidos || 0;
      acc.volumes += pdf.totalVolumes || 0;
      acc.valor += pdf.valorTotal || 0;
      return acc;
    }, { pedidos: 0, volumes: 0, valor: 0 });

    // Gerar linhas da tabela
    const linhasTabela = pdfs.map(pdf => {
      const valor = new Intl.NumberFormat('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }).format(pdf.valorTotal || 0);

      return `
        <tr>
          <td style="padding:10px 12px; border-bottom:1px solid #eee; text-align:center;">${pdf.codEntregaDisplay}</td>
          <td style="padding:10px 12px; border-bottom:1px solid #eee; text-align:center;">${pdf.totalPedidos || 0}</td>
          <td style="padding:10px 12px; border-bottom:1px solid #eee; text-align:center;">${pdf.totalVolumes || 0}</td>
          <td style="padding:10px 12px; border-bottom:1px solid #eee; text-align:right;">${valor}</td>
        </tr>
      `;
    }).join('');

    // Linha de totais
    const valorTotalFormatado = new Intl.NumberFormat('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(totais.valor);

    const linhaTotais = `
      <tr style="background:#f0f3f8; font-weight:bold;">
        <td style="padding:10px 12px; border-top:2px solid #dee2e6; text-align:center;">TOTAL</td>
        <td style="padding:10px 12px; border-top:2px solid #dee2e6; text-align:center;">${totais.pedidos}</td>
        <td style="padding:10px 12px; border-top:2px solid #dee2e6; text-align:center;">${totais.volumes}</td>
        <td style="padding:10px 12px; border-top:2px solid #dee2e6; text-align:right;">${valorTotalFormatado}</td>
      </tr>
    `;

    // Criar assunto com data fornecida (ou data atual se não fornecida)
    let dataFormatada;
    if (dataAssunto) {
      // dataAssunto vem no formato YYYY-MM-DD, converter para dd/mm/yyyy
      const [ano, mes, dia] = dataAssunto.split('-');
      dataFormatada = `${dia}/${mes}/${ano}`;
    } else {
      const agora = new Date();
      dataFormatada = agora.toLocaleDateString('pt-BR');
    }
    
    const assunto = `ORIENTE FARMA - Envio de Romaneio/EDI - ${transportadora.nome} - ${dataFormatada}`;

    // Configurar email
    const mailOptions = {
      from: process.env.EMAIL_USER || 'faturamento@orientefarma.com.br',
      to: emailsDestinatarios,
      subject: assunto,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; color:#333; background:#f7f9fc; padding:24px; border-radius:12px;">
          <div style="max-width:700px; margin:auto; background:#fff; padding:32px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,.08);">
            
            <!-- Logo -->
            <div style="text-align: center; padding: 20px 0; margin-bottom: 24px; border-bottom: 2px solid #f0f3f8;">
              <img src="https://bussola.orientefarma.com.br/assets/images/ORIENTE-MARCA-FINAL.png" 
                   alt="Oriente Farma" 
                   style="max-width: 220px; height: auto;">
            </div>

            <!-- Saudação -->
            <p style="font-size:16px; margin:0 0 12px; color:#2c3e50;">Prezados,</p>

            <!-- Mensagem principal -->
            <p style="font-size:15px; line-height:1.6; margin:0 0 24px; color:#495057;">
              Segue(m) em anexo o(s) arquivo(s) de romaneio e EDI referente(s) à transportadora
              <strong style="color:#0B013F;">${transportadora.nome}</strong>.
            </p>

            <!-- Título da tabela -->
            <h3 style="color:#2c3e50; margin:24px 0 16px; font-size:18px; border-bottom:3px solid #0B013F; padding-bottom:8px;">
              Resumo das Informações
            </h3>

            <!-- Tabela de romaneios -->
            <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:24px;">
              <thead>
                <tr style="background:#0B013F; color:#fff; text-align:center;">
                  <th style="padding:12px; border-bottom:2px solid #dee2e6;">Romaneio</th>
                  <th style="padding:12px; border-bottom:2px solid #dee2e6;">Pedidos</th>
                  <th style="padding:12px; border-bottom:2px solid #dee2e6;">Volumes</th>
                  <th style="padding:12px; border-bottom:2px solid #dee2e6; text-align:right;">Valor Total (R$)</th>
                </tr>
              </thead>
              <tbody>
                ${linhasTabela}
                ${linhaTotais}
              </tbody>
            </table>

            <!-- Mensagem de fechamento -->
            <p style="font-size:15px; line-height:1.6; margin:24px 0 12px; color:#495057;">
              Permanecemos à disposição para quaisquer esclarecimentos adicionais.
            </p>

            <!-- Assinatura -->
            <p style="font-size:15px; margin-top:16px; color:#495057;">
              Atenciosamente,<br>
              <strong style="color:#0B013F;">Equipe Oriente Farma</strong>
            </p>

            <!-- Rodapé -->
            <div style="margin-top:32px; padding-top:20px; border-top:1px solid #e9ecef; text-align:center;">
              <p style="color:#6c757d; font-size:12px; margin:0;">
                Este é um email automático. Por favor, não responda.
              </p>
              <p style="color:#6c757d; font-size:12px; margin:8px 0 0;">
                © ${new Date().getFullYear()} Oriente Farma - Todos os direitos reservados
              </p>
            </div>

          </div>
        </div>
      `,
      attachments: anexos
    };

    // Enviar email
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email enviado com sucesso: ${info.messageId}`);
    
    // Contar quantos destinatários receberam
    const emailsEnviados = emailsDestinatarios.split(',').length;
    
    return {
      sucesso: true,
      messageId: info.messageId,
      emailsEnviados: emailsEnviados
    };
    
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    throw error;
  }
}

module.exports = {
  enviarEmailComPdfs
};
