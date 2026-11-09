const express = require("express");
const banco = require("../banco");

const rota = express.Router();

// GET /medico/fila
// Devolve a fila médica: só atendimentos 'aguardando_medico',
// ordenados por gravidade (Manchester) e depois por chegada.
rota.get("/fila", async (requisicao, resposta) => {
    try {
        const [linhas] = await banco.query(`
            SELECT a.id AS atendimento_id,
                   CONCAT('AT', LPAD(CAST(a.id AS CHAR),
                          GREATEST(4, CHAR_LENGTH(CAST(a.id AS CHAR))), '0')) AS senha,
                   p.nome_completo AS paciente,
                   DATE_FORMAT(p.data_nascimento, '%Y-%m-%d') AS data_nascimento,
                   t.classificacao,
                   DATE_FORMAT(a.data_hora_chegada, '%Y-%m-%d %H:%i:%s') AS data_hora_chegada
            FROM atendimento a
            JOIN paciente p ON p.id = a.paciente_id
            JOIN triagem t ON t.atendimento_id = a.id
            WHERE a.status = 'aguardando_medico'
            ORDER BY CASE t.classificacao
                         WHEN 'vermelho' THEN 1
                         WHEN 'laranja'  THEN 2
                         WHEN 'amarelo'  THEN 3
                         WHEN 'verde'    THEN 4
                         WHEN 'azul'     THEN 5
                     END,
                     a.data_hora_chegada, a.id
        `);

        resposta.json(linhas);
    } catch (erro) {
        console.error("Erro ao buscar a fila médica:", erro.code);
        resposta.status(500).json({ erro: "Não foi possível carregar a fila médica." });
    }
});

module.exports = rota;
