const nodemailer = require("nodemailer");

function criarEnvioDeEmail() {
    // As credenciais de e-mail ficam no .env, nunca no frontend.
    if (!process.env.SMTP_HOST || !process.env.EMAIL_REMETENTE) return null;
    const transporte = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER
            ? {
                  user: process.env.SMTP_USER,
                  pass: process.env.SMTP_PASSWORD,
              }
            : undefined,
        connectionTimeout: 10000,
        socketTimeout: 15000,
    });
    return async function enviarRecuperacao(destinatario, link) {
        await transporte.sendMail({
            from: process.env.EMAIL_REMETENTE,
            to: destinatario,
            subject: "SAPS — redefinição de senha",
            text: `Para cadastrar uma nova senha, abra este link em até 30 minutos:\n${link}\n\nSe não fez esta solicitação, ignore esta mensagem.`,
        });
    };
}

module.exports = criarEnvioDeEmail;
