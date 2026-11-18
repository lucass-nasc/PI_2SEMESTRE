const express = require("express");
const { lerId, lerTexto, erroDeValidacao } = require("../validacoes");

const cores = ["vermelho", "laranja", "amarelo", "verde", "azul"];

function validarTriagem(dados) {
    const pressao = lerTexto(dados.pressao_arterial, "Pressão", 15, true);
    if (
        !/^\d{2,3}\/\d{2,3}$/.test(pressao) ||
        pressao.split("/").some((valor) => Number(valor) <= 0)
    )
        throw erroDeValidacao("Pressão inválida. Use dois números positivos, como 120/80.");
    // Valido o formato antes de converter para não aceitar espaços, letras ou valores negativos.
    function medida(valor, campo, formato) {
        if (
            !["string", "number"].includes(typeof valor) ||
            !formato.test(String(valor)) ||
            Number(valor) <= 0
        )
            throw erroDeValidacao(campo + ": informe um número positivo no formato indicado.");
        return Number(valor);
    }
    if (!cores.includes(dados.classificacao))
        throw erroDeValidacao("Selecione uma classificação de risco.");
    return [
        pressao,
        medida(dados.temperatura, "Temperatura", /^\d{1,2}([.]\d)?$/),
        medida(dados.batimentos_cardiacos, "Batimentos", /^\d{1,3}$/),
        lerTexto(dados.queixas, "as principais queixas", 4000, true),
        lerTexto(dados.observacoes, "Observações", 4000),
        dados.classificacao,
    ];
}

// Cada etapa reserva o atendimento para o profissional da sessão. O paciente não muda de ficha.
function criarFluxoClinico(banco, etapa) {
    const rotas = express.Router();
    const triagem = etapa === "triagem";
    const espera = triagem ? "aguardando_triagem" : "aguardando_medico";
    const andamento = triagem ? "em_triagem" : "em_atendimento";
    const dadosPaciente = `SELECT a.id, p.nome_completo, p.data_nascimento, p.cadastro_completo,
        TIMESTAMPDIFF(YEAR,p.data_nascimento,CURDATE()) AS idade, a.data_hora_chegada
        FROM atendimento a JOIN paciente p ON p.id=a.paciente_id`;

    if (triagem)
        rotas.get("/fila", async (req, res) => {
            const [fila] = await banco.execute(
                dadosPaciente + " WHERE a.status=? ORDER BY a.data_hora_chegada,a.id",
                [espera],
            );
            res.json(fila);
        });

    rotas.get("/atual", async (req, res) => {
        const [linhas] = await banco.execute(
            dadosPaciente + " WHERE a.status=? AND a.profissional_atual_id=?",
            [andamento, req.usuario.id],
        );
        res.json({ atendimento: linhas[0] || null });
    });

    async function emTransacao(operacao) {
        const conexao = await banco.getConnection();
        try {
            await conexao.beginTransaction();
            await operacao(conexao);
            await conexao.commit();
        } catch (erro) {
            await conexao.rollback();
            throw erro;
        } finally {
            conexao.release();
        }
    }

    rotas.post("/atendimentos/:id/iniciar", async (req, res) => {
        const id = lerId(req.params.id);
        await emTransacao(async (conexao) => {
            await conexao.execute("SELECT id FROM usuario WHERE id=? FOR UPDATE", [req.usuario.id]);
            const [ativos] = await conexao.execute(
                "SELECT id FROM atendimento WHERE profissional_atual_id=? FOR UPDATE",
                [req.usuario.id],
            );
            if (ativos.length)
                throw erroDeValidacao("Conclua o atendimento atual antes de chamar outro.", 409);
            // A consulta com bloqueio reavalia quem está no início da fila, mesmo após outro clique.
            const ordem = triagem
                ? "a.data_hora_chegada,a.id"
                : "FIELD(t.classificacao,'vermelho','laranja','amarelo','verde','azul'),a.data_hora_chegada,a.id";
            const juntar = triagem ? "" : " JOIN triagem t ON t.atendimento_id=a.id";
            const [fila] = await conexao.execute(
                "SELECT a.id FROM atendimento a" +
                    juntar +
                    " WHERE a.status=? ORDER BY " +
                    ordem +
                    " LIMIT 1 FOR UPDATE",
                [espera],
            );
            if (fila[0]?.id !== id)
                throw erroDeValidacao(
                    "A fila mudou. Atualize e chame o primeiro atendimento.",
                    409,
                );
            await conexao.execute(
                "UPDATE atendimento SET status=?, profissional_atual_id=? WHERE id=?",
                [andamento, req.usuario.id, id],
            );
            if (!triagem)
                await conexao.execute(
                    "INSERT INTO consulta (atendimento_id,medico_id) VALUES (?,?)",
                    [id, req.usuario.id],
                );
        });
        res.json({ mensagem: "Atendimento iniciado." });
    });

    rotas.post("/atendimentos/:id/concluir", async (req, res) => {
        const id = lerId(req.params.id);
        let campos;
        if (triagem) campos = validarTriagem(req.body);
        else {
            if (req.body.confirmacao !== true)
                throw erroDeValidacao("Confirme a conclusão do atendimento.");
            campos = [
                lerTexto(req.body.diagnostico, "a avaliação médica", 4000, true),
                lerTexto(req.body.observacoes, "Observações", 4000),
                lerTexto(req.body.conduta, "Conduta", 4000),
            ];
        }
        await emTransacao(async (conexao) => {
            const [linhas] = await conexao.execute(
                "SELECT status,profissional_atual_id FROM atendimento WHERE id=? FOR UPDATE",
                [id],
            );
            if (!linhas.length) throw erroDeValidacao("Atendimento não encontrado.", 404);
            if (linhas[0].status !== andamento)
                throw erroDeValidacao("Este atendimento não está mais nesta etapa.", 409);
            if (linhas[0].profissional_atual_id !== req.usuario.id)
                throw erroDeValidacao("O atendimento está com outro profissional.", 403);
            if (triagem) {
                await conexao.execute(
                    "INSERT INTO triagem (atendimento_id,enfermeiro_id,pressao_arterial,temperatura,batimentos_cardiacos,queixas,observacoes,classificacao) VALUES (?,?,?,?,?,?,?,?)",
                    [id, req.usuario.id, ...campos],
                );
                await conexao.execute(
                    "UPDATE atendimento SET status='aguardando_medico',profissional_atual_id=NULL WHERE id=?",
                    [id],
                );
            } else {
                const [resultado] = await conexao.execute(
                    "UPDATE consulta SET diagnostico=?,observacoes=?,conduta=?,data_hora_finalizacao=NOW() WHERE atendimento_id=? AND medico_id=? AND data_hora_finalizacao IS NULL",
                    [...campos, id, req.usuario.id],
                );
                if (!resultado.affectedRows)
                    throw erroDeValidacao("Consulta não está aberta.", 409);
                await conexao.execute(
                    "UPDATE atendimento SET status='finalizado',profissional_atual_id=NULL,data_hora_finalizacao=NOW() WHERE id=?",
                    [id],
                );
            }
        });
        res.json({
            mensagem: triagem
                ? "Triagem concluída. Paciente na fila médica."
                : "Consulta finalizada e registrada no prontuário.",
        });
    });

    if (!triagem)
        rotas.get("/prontuario-atual", async (req, res) => {
            // O histórico é do paciente que este médico está atendendo agora.
            const [historico] = await banco.execute(
                `SELECT h.atendimento_id,h.data_hora_finalizacao,h.classificacao,h.diagnostico,h.observacoes_consulta,h.conduta
            FROM atendimento atual JOIN prontuario h ON h.paciente_id=atual.paciente_id
            WHERE atual.profissional_atual_id=? AND atual.status='em_atendimento' AND h.status='finalizado'
            ORDER BY h.data_hora_finalizacao DESC,h.atendimento_id DESC`,
                [req.usuario.id],
            );
            res.json(historico);
        });
    return rotas;
}
module.exports = criarFluxoClinico;
