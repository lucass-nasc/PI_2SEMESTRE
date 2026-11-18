const crypto = require("node:crypto");
const banco = require("./banco");
const criarAplicacao = require("./app");
const criarEnvioDeEmail = require("./enviar-email");

async function iniciarServidor() {
    try {
        const porta = Number(process.env.PORT || 3000);
        if (!Number.isInteger(porta) || porta < 1 || porta > 65535)
            throw new Error("PORT_INVALIDA");
        const [linhas] = await banco.query("SELECT DATABASE() AS banco_atual");
        // Confiro as duas alterações necessárias antes de aceitar cadastros na recepção.
        await banco.query("SELECT rg FROM paciente LIMIT 0");
        await banco.query("SELECT id FROM recuperacao_senha LIMIT 0");
        const app = criarAplicacao(banco, {
            segredoSessao: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
            enderecoPublico: (process.env.APP_URL || `http://127.0.0.1:${porta}`).replace(
                /\/$/,
                "",
            ),
            https: process.env.COOKIE_SECURE === "true",
            enviarEmail: criarEnvioDeEmail(),
        });
        const servidor = app.listen(porta, "127.0.0.1", () => {
            console.log("Conectado ao banco:", linhas[0].banco_atual);
            console.log(`Servidor disponível em http://127.0.0.1:${porta}`);
        });
        servidor.on("error", async (erro) => {
            console.error("Não foi possível abrir o servidor:", erro.code);
            await banco.end();
            process.exitCode = 1;
        });
    } catch (erro) {
        console.error("Não foi possível iniciar o SAPS. Código:", erro.code || erro.message);
        if (["ER_BAD_FIELD_ERROR", "ER_NO_SUCH_TABLE"].includes(erro.code))
            console.error("Execute npm run preparar-banco dentro da pasta backend.");
        await banco.end();
        process.exitCode = 1;
    }
}

iniciarServidor();
