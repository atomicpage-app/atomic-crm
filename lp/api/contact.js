const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  // Permitir apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido' 
    });
  }

  try {
    const { nome, email, telefone } = req.body;

    // Validar campos obrigatórios
    if (!nome || !email || !telefone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Todos os campos são obrigatórios' 
      });
    }

    // Configurar transporter do email
    const transporter = nodemailer.createTransporter({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Configurar o email
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: 'jrorasec@gmail.com', // ← ALTERE PARA SEU EMAIL
      subject: `🚀 Novo lead da AtomicPage: ${nome}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ec4899; border-bottom: 2px solid #ec4899; padding-bottom: 10px;">
            📧 Novo Contato da Landing Page
          </h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>👤 Nome:</strong> ${nome}</p>
            <p style="margin: 10px 0;"><strong>📧 Email:</strong> 
              <a href="mailto:${email}" style="color: #ec4899;">${email}</a>
            </p>
            <p style="margin: 10px 0;"><strong>📱 Telefone:</strong> 
              <a href="tel:${telefone}" style="color: #ec4899;">${telefone}</a>
            </p>
            <p style="margin: 10px 0;"><strong>🕐 Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <p style="margin: 10px 0;"><strong>🌐 Origem:</strong> Landing Page CTA</p>
          </div>
          
          <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; border-left: 4px solid #0066cc;">
            <p style="margin: 0; color: #0066cc;">
              <strong>💡 Dica:</strong> Entre em contato o quanto antes! Leads que recebem resposta em até 5 minutos têm 9x mais chances de conversão.
            </p>
          </div>
        </div>
      `
    };

    // Enviar o email
    await transporter.sendMail(mailOptions);

    // Resposta de sucesso
    res.status(200).json({ 
      success: true, 
      message: 'Email enviado com sucesso!' 
    });

  } catch (error) {
    console.error('Erro ao enviar email:', error);
    
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor. Tente novamente.' 
    });
  }
}