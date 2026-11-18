// Só este comando direciona o e-mail para a caixa local da apresentação.
// O npm start continua usando os dados do provedor configurados no .env.
Object.assign(process.env, {
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: "1025",
    SMTP_SECURE: "false",
    SMTP_USER: "",
    SMTP_PASSWORD: "",
    EMAIL_REMETENTE: "SAPS <atendimento@saps.test>",
});
console.log("Caixa de e-mail local: http://127.0.0.1:8025 (inicie o Mailpit antes).");
require("./servidor");
