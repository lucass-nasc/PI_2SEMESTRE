const express = require("express");
const session = require("express-session");
const path = require("node:path");
const criarAutenticacao = require("./autenticacao");
const criarRotasRecepcao = require("./recepcao");

function criarAplicacao(banco, configuracao) {
    const app = express();
    app.disable("x-powered-by");
    // Estes dois middlewares transformam o corpo recebido em um objeto JavaScript.
    app.use(express.urlencoded({ extended: false, limit: "20kb", parameterLimit: 30 }));
    app.use(express.json({ limit: "20kb" }));

    // A apresentação usa um servidor local. Reiniciar o Node encerra as sessões, não os cadastros.
    app.use(
        session({
            name: "saps.sid",
            secret: configuracao.segredoSessao,
            resave: false,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                sameSite: "lax",
                secure: configuracao.https === true,
                maxAge: 8 * 60 * 60 * 1000,
            },
        }),
    );

    app.use((requisicao, resposta, proximo) => {
        resposta.set("Cache-Control", "no-store");
        resposta.set("X-Content-Type-Options", "nosniff");
        resposta.set("Referrer-Policy", "no-referrer");
        // Aceito alterações só com o token de formulário da própria sessão.
        if (!["GET", "HEAD", "OPTIONS"].includes(requisicao.method)) {
            const token = requisicao.get("X-CSRF-Token");
            if (!token || token !== requisicao.session.tokenFormulario) {
                return resposta.status(403).json({
                    mensagem: "Formulário expirado. Atualize a página e tente novamente.",
                });
            }
            if (
                !requisicao.is("application/json") &&
                !requisicao.is("application/x-www-form-urlencoded")
            ) {
                return resposta.status(415).json({ mensagem: "Formato de envio inválido." });
            }
            if (
                !requisicao.body ||
                typeof requisicao.body !== "object" ||
                Array.isArray(requisicao.body)
            ) {
                return resposta.status(400).json({ mensagem: "Envie os campos do formulário." });
            }
        }
        proximo();
    });

    // Middleware é uma função executada antes da rota: aqui verifico quem está conectado.
    const autenticacao = criarAutenticacao(
        banco,
        configuracao.enviarEmail,
        configuracao.enderecoPublico,
    );
    app.use(autenticacao.carregarUsuario);
    app.use("/api", autenticacao.rotas);
    app.use("/api/recepcao", autenticacao.exigirPerfil("recepcionista"), criarRotasRecepcao(banco));

    app.use("/api/medico", autenticacao.exigirPerfil("medico"), require("./rotas/medico")(banco));

    const frontend = path.join(__dirname, "../frontend");
    app.use("/login", express.static(path.join(frontend, "login"), { index: "login.html" }));
    app.use(
        "/recepcao",
        autenticacao.exigirPerfil("recepcionista", true),
        express.static(path.join(frontend, "recepcao")),
    );
    // Só controlo o acesso aos HTMLs existentes. Não implemento as ações clínicas do colega.
    app.use(
        "/triagem",
        autenticacao.exigirPerfil("enfermeiro", true),
        express.static(path.join(frontend, "triagem")),
    );
    app.use(
        "/medico",
        autenticacao.exigirPerfil("medico", true),
        express.static(path.join(frontend, "medico")),
    );
    app.get("/", (requisicao, resposta) => resposta.redirect("/login/login.html"));
    app.use((requisicao, resposta) =>
        resposta.status(404).json({ mensagem: "Endereço não encontrado." }),
    );

    // As rotas encaminham os erros para cá. Não mostro SQL nem credenciais na resposta.
    app.use((erro, requisicao, resposta, proximo) => {
        let status = erro.status || 500;
        let mensagem =
            status < 500 || erro.operacional
                ? erro.message
                : "Não foi possível concluir a operação. Tente novamente.";
        if (erro.code === "ER_DUP_ENTRY") {
            status = 409;
            mensagem = "Este CPF ou e-mail já está cadastrado. Localize o cadastro existente.";
        }
        if (["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"].includes(erro.code)) {
            status = 409;
            mensagem = "O registro foi alterado por outra operação. Atualize e tente novamente.";
        }
        if (status === 413) mensagem = "Os dados enviados ultrapassam o limite permitido.";
        if (erro.type === "entity.parse.failed") {
            status = 400;
            mensagem = "Os dados enviados estão em formato inválido.";
        }
        if (status >= 500) console.error("Falha na operação:", erro.code || "ERRO_INTERNO");
        resposta.status(status).json({ mensagem });
    });
    return app;
}

module.exports = criarAplicacao;
