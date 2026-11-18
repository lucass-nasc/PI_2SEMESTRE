const express = require("express");
const { erroDeValidacao } = require("../validacoes");

const situacoes = ["plantao", "almoco", "ferias", "folga"];

// Quando o prazo passa, o LEFT JOIN deixa a situação vazia e mantém o funcionário na lista.
const consulta = `SELECT u.nome_completo, u.perfil, d.situacao,
        DATE_FORMAT(d.termino_utc, '%Y-%m-%dT%H:%i:%sZ') AS termino
    FROM usuario u LEFT JOIN disponibilidade_funcionario d
        ON d.usuario_id = u.id AND d.termino_utc > UTC_TIMESTAMP()
    WHERE u.ativo = TRUE`;

function criarRotasDisponibilidade(banco, exigirPerfil) {
    const rotas = express.Router();

    rotas.get("/recepcao/funcionarios", exigirPerfil("recepcionista"), async (req, res) => {
        const [equipe] = await banco.query(consulta + " ORDER BY u.nome_completo, u.id");
        res.json(equipe);
    });

    rotas.use("/minha-situacao", (req, res, proximo) => {
        if (!req.usuario) return res.status(401).json({ mensagem: "Entre novamente." });
        proximo();
    });

    rotas.get("/minha-situacao", async (req, res) => {
        const [linhas] = await banco.execute(consulta + " AND u.id = ?", [req.usuario.id]);
        res.json(linhas[0]);
    });

    rotas.put("/minha-situacao", async (req, res) => {
        const { situacao, termino } = req.body;
        if (!situacoes.includes(situacao)) throw erroDeValidacao("Selecione uma situação válida.");
        const data = typeof termino === "string" ? new Date(termino) : null;
        if (!data || !Number.isFinite(data.getTime()) || data.toISOString() !== termino ||
            data.getUTCFullYear() > 9999 || data.getTime() <= Date.now()) {
            throw erroDeValidacao("Informe uma data e um horário de término no futuro.");
        }
        // A identidade vem da sessão. Um funcionário só pode alterar sua própria situação.
        const fim = data.toISOString().slice(0, 19).replace("T", " ");
        await banco.execute(
            `INSERT INTO disponibilidade_funcionario (usuario_id, situacao, termino_utc)
             VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE situacao = ?, termino_utc = ?`,
            [req.usuario.id, situacao, fim, situacao, fim],
        );
        res.json({ mensagem: "Situação atualizada." });
    });
    return rotas;
}

module.exports = criarRotasDisponibilidade;
