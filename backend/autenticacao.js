const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const { rateLimit } = require("express-rate-limit");
const { validarEmail, validarSenha, erroDeValidacao } = require("./validacoes");

const destinos = {
    recepcionista: "/recepcao/index.html",
    enfermeiro: "/triagem/index.html",
    medico: "/medico/index.html",
};

function criarAutenticacao(banco) {
    const rotas = express.Router();
    // Limito tentativas repetidas por endereço IP, sem bloquear a conta no banco.
    const limitarTentativas = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 20,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: { mensagem: "Muitas tentativas. Aguarde 15 minutos e tente novamente." },
    });

    async function carregarUsuario(requisicao, resposta, proximo) {
        requisicao.usuario = null;
        if (requisicao.session.usuarioId) {
            const [usuarios] = await banco.execute(
                "SELECT id, nome_completo, perfil, registro_profissional, ativo, senha_hash FROM usuario WHERE id = ?",
                [requisicao.session.usuarioId],
            );
            const usuario = usuarios[0];
            // A consulta reconhece uma conta desativada ou uma senha alterada depois do login.
            if (usuario && usuario.ativo && usuario.senha_hash === requisicao.session.versaoSenha) {
                requisicao.usuario = {
                    id: usuario.id,
                    nome: usuario.nome_completo,
                    perfil: usuario.perfil,
                    registro: usuario.registro_profissional,
                };
            } else {
                delete requisicao.session.usuarioId;
                delete requisicao.session.versaoSenha;
            }
        }
        proximo();
    }

    function exigirPerfil(perfil, pagina = false) {
        return function verificarPermissao(requisicao, resposta, proximo) {
            if (!requisicao.usuario) {
                if (pagina) return resposta.redirect("/login/login.html");
                return resposta
                    .status(401)
                    .json({ mensagem: "Sua sessão terminou. Entre novamente." });
            }
            if (requisicao.usuario.perfil !== perfil) {
                if (pagina)
                    return resposta.status(403).send("Acesso não permitido para este perfil.");
                return resposta
                    .status(403)
                    .json({ mensagem: "Acesso não permitido para este perfil." });
            }
            proximo();
        };
    }

    rotas.get("/sessao", (requisicao, resposta) => {
        if (!requisicao.session.tokenFormulario)
            requisicao.session.tokenFormulario = crypto.randomBytes(32).toString("hex");
        resposta.json({
            usuario: requisicao.usuario,
            tokenFormulario: requisicao.session.tokenFormulario,
            destino: requisicao.usuario ? destinos[requisicao.usuario.perfil] : null,
        });
    });

    rotas.post("/login", limitarTentativas, async (requisicao, resposta) => {
        const email = validarEmail(requisicao.body.email);
        const senha = validarSenha(requisicao.body.senha);
        const [usuarios] = await banco.execute(
            "SELECT id, senha_hash, perfil, ativo FROM usuario WHERE email = ? LIMIT 1",
            [email],
        );
        const usuario = usuarios[0];
        // A mensagem é igual para e-mail inexistente, senha errada e conta inativa.
        if (
            !usuario ||
            !usuario.ativo ||
            !destinos[usuario.perfil] ||
            !(await bcrypt.compare(senha, usuario.senha_hash))
        ) {
            throw erroDeValidacao("E-mail ou senha inválidos.", 401);
        }
        // Troco o identificador da sessão depois de conferir a senha.
        await new Promise((resolver, rejeitar) =>
            requisicao.session.regenerate((erro) => (erro ? rejeitar(erro) : resolver())),
        );
        requisicao.session.usuarioId = usuario.id;
        requisicao.session.versaoSenha = usuario.senha_hash;
        requisicao.session.tokenFormulario = crypto.randomBytes(32).toString("hex");
        await new Promise((resolver, rejeitar) =>
            requisicao.session.save((erro) => (erro ? rejeitar(erro) : resolver())),
        );
        resposta.json({ mensagem: "Acesso autorizado.", destino: destinos[usuario.perfil] });
    });

    rotas.post("/sair", async (requisicao, resposta) => {
        await new Promise((resolver, rejeitar) =>
            requisicao.session.destroy((erro) => (erro ? rejeitar(erro) : resolver())),
        );
        resposta.clearCookie("saps.sid", { path: "/" });
        resposta.json({ mensagem: "Sessão encerrada." });
    });

    return { rotas, carregarUsuario, exigirPerfil };
}

module.exports = criarAutenticacao;
