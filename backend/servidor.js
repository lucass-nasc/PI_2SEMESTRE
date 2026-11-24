const crypto = require("node:crypto");
const banco = require("./banco");
const criarAplicacao = require("./app");

async function iniciarServidor() {
    try {
        const porta = Number(process.env.PORT || 3000);
        if (!Number.isInteger(porta) || porta < 1 || porta > 65535)
            throw new Error("PORT_INVALIDA");
        const [linhas] = await banco.query("SELECT DATABASE() AS banco_atual");
        // Confiro a estrutura usada pela recepção e pelas telas clínicas.
        await banco.query("SELECT rg FROM paciente LIMIT 0");
        await banco.query("SELECT profissional_atual_id FROM atendimento LIMIT 0");
        await banco.query("SELECT termino_utc FROM disponibilidade_funcionario LIMIT 0");
        const app = criarAplicacao(banco, {
            segredoSessao: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
            https: process.env.COOKIE_SECURE === "true",
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
