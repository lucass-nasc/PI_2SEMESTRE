const express = require("express");
const { lerId } = require("../validacoes");

function criarRotasMedico(banco) {
    const rota = express.Router();

    // GET /api/medico/fila
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
            resposta.status(500).json({ mensagem: "Não foi possível carregar a fila médica." });
        }
    });

    // GET /api/medico/atendimentos/:id
    // Devolve os dados do paciente e a ficha de triagem de um atendimento,
    // para o painel "Atendimento atual" da tela do médico.
    rota.get("/atendimentos/:id", async (requisicao, resposta) => {
        const id = lerId(requisicao.params.id, "Atendimento");

        try {
            const [linhas] = await banco.query(
                `
            SELECT a.id AS atendimento_id,
                   CONCAT('AT', LPAD(CAST(a.id AS CHAR),
                          GREATEST(4, CHAR_LENGTH(CAST(a.id AS CHAR))), '0')) AS senha,
                   a.status, a.profissional_atual_id,
                   DATE_FORMAT(a.data_hora_chegada, '%Y-%m-%d %H:%i:%s') AS data_hora_chegada,
                   p.id AS paciente_id,
                   p.nome_completo AS paciente,
                   DATE_FORMAT(p.data_nascimento, '%Y-%m-%d') AS data_nascimento,
                   TIMESTAMPDIFF(YEAR, p.data_nascimento, CURDATE()) AS idade,
                   p.cadastro_completo,
                   t.classificacao,
                   t.pressao_arterial,
                   t.temperatura,
                   t.batimentos_cardiacos,
                   t.queixas,
                   t.observacoes AS observacoes_triagem
            FROM atendimento a
            LEFT JOIN paciente p ON p.id = a.paciente_id
            LEFT JOIN triagem t ON t.atendimento_id = a.id
            WHERE a.id = ?
        `,
                [id],
            );

            if (linhas.length === 0) {
                return resposta.status(404).json({ mensagem: "Atendimento não encontrado." });
            }

            const dados = linhas[0];
            if (
                !["aguardando_medico", "em_atendimento"].includes(dados.status) ||
                !dados.classificacao
            )
                return resposta
                    .status(409)
                    .json({ mensagem: "O atendimento não está disponível para consulta médica." });
            if (
                dados.status === "em_atendimento" &&
                dados.profissional_atual_id !== requisicao.usuario.id
            )
                return resposta.status(403).json({ mensagem: "A consulta está com outro médico." });
            delete dados.profissional_atual_id;
            dados.cadastro_completo = Boolean(dados.cadastro_completo);
            if (dados.temperatura !== null) {
                dados.temperatura = Number(dados.temperatura);
            }

            resposta.json(dados);
        } catch (erro) {
            console.error("Erro ao buscar o atendimento:", erro.code);
            resposta.status(500).json({ mensagem: "Não foi possível carregar o atendimento." });
        }
    });

    return rota;
}

module.exports = criarRotasMedico;
