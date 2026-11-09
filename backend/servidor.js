const express = require("express");
const banco = require("./banco");

const app = express();
const porta = 3000;

const rotasMedico = require("./rotas/medico");
app.use("/medico", rotasMedico);

app.get("/", (requisicao, resposta) => {
    resposta.send("Backend do SAPS funcionando!");
});

async function iniciarServidor() {
    try {
        // Consulta o MySQL para conferir o banco selecionado.
        const [linhas] = await banco.query(
            "SELECT DATABASE() AS banco_atual"
        );

        console.log("Conectado ao banco:", linhas[0].banco_atual);

        // Só inicia o servidor após conseguir consultar o banco.
        app.listen(porta, "127.0.0.1", () => {
            console.log(`Servidor disponível em http://127.0.0.1:${porta}`);
        });
    } catch (erro) {
        console.error("Não foi possível conectar ao MySQL.");
        console.error("Código do erro:", erro.code);

        await banco.end();
        process.exitCode = 1;
    }
}

iniciarServidor();