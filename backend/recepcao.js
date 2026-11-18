const express = require("express");
const { erroDeValidacao, lerTexto, lerId, validarData, validarPaciente } = require("./validacoes");

const situacoes = [
    "aguardando_recepcao",
    "em_recepcao",
    "aguardando_triagem",
    "em_triagem",
    "aguardando_medico",
    "em_atendimento",
    "finalizado",
    "cancelado",
];

function formatarAtendimento(atendimento) {
    // padStart acrescenta zeros, mas não corta o número quando chegar em AT10000.
    return { ...atendimento, senha: "AT" + String(atendimento.id).padStart(4, "0") };
}

function criarRotasRecepcao(banco) {
    const rotas = express.Router();

    async function buscarAtendimento(conexao, id, bloquear = false) {
        const [linhas] = await conexao.execute(
            "SELECT * FROM atendimento WHERE id = ?" + (bloquear ? " FOR UPDATE" : ""),
            [id],
        );
        if (!linhas.length) throw erroDeValidacao("Atendimento não encontrado.", 404);
        return linhas[0];
    }

    function verificarAtendimentoAtual(atendimento, usuarioId) {
        if (atendimento.status !== "em_recepcao")
            throw erroDeValidacao("Este atendimento não está mais na recepção.", 409);
        if (atendimento.recepcionista_id !== usuarioId)
            throw erroDeValidacao("Este atendimento está com outro recepcionista.", 403);
    }

    // Leio o resumo do banco; os números da tela não ficam fixos no HTML.
    rotas.get("/painel", async (requisicao, resposta) => {
        const [contagens] = await banco.query(
            "SELECT status, COUNT(*) AS quantidade FROM atendimento GROUP BY status",
        );
        const [finalizados] = await banco.query(
            "SELECT COUNT(*) AS quantidade FROM atendimento WHERE status = 'finalizado' AND data_hora_finalizacao >= CURRENT_DATE AND data_hora_finalizacao < CURRENT_DATE + INTERVAL 1 DAY",
        );
        const [recentes] = await banco.query(
            "SELECT a.id, a.status, a.data_hora_chegada, p.nome_completo FROM atendimento a LEFT JOIN paciente p ON p.id = a.paciente_id ORDER BY a.data_hora_chegada DESC, a.id DESC LIMIT 10",
        );
        const totais = {};
        for (const situacao of situacoes) totais[situacao] = 0;
        for (const linha of contagens) totais[linha.status] = Number(linha.quantidade);
        totais.atendidos_hoje = Number(finalizados[0].quantidade);
        resposta.json({ totais, recentes: recentes.map(formatarAtendimento) });
    });

    // Retorno a fila compartilhada e a senha que pertence ao recepcionista conectado.
    rotas.get("/senhas", async (requisicao, resposta) => {
        const [fila] = await banco.query(
            "SELECT id, status, data_hora_chegada FROM atendimento WHERE status = 'aguardando_recepcao' ORDER BY data_hora_chegada, id LIMIT 100",
        );
        const [contagem] = await banco.query(
            "SELECT COUNT(*) AS total FROM atendimento WHERE status = 'aguardando_recepcao'",
        );
        const [atuais] = await banco.execute(
            "SELECT id, paciente_id, status, data_hora_chegada FROM atendimento WHERE recepcionista_id = ? AND status = 'em_recepcao' ORDER BY id LIMIT 1",
            [requisicao.usuario.id],
        );
        resposta.json({
            fila: fila.map(formatarAtendimento),
            total: Number(contagem[0].total),
            atual: atuais[0] ? formatarAtendimento(atuais[0]) : null,
        });
    });

    rotas.post("/senhas", async (requisicao, resposta) => {
        // O botão registra uma chegada. O AUTO_INCREMENT do banco escolhe o número, não o funcionário.
        const [resultado] = await banco.execute(
            "INSERT INTO atendimento (status) VALUES ('aguardando_recepcao')",
        );
        resposta.status(201).json({
            mensagem: "Senha gerada.",
            atendimento: formatarAtendimento({ id: resultado.insertId }),
        });
    });

    rotas.post("/senhas/chamar", async (requisicao, resposta) => {
        const conexao = await banco.getConnection();
        try {
            await conexao.beginTransaction();
            // Bloqueio o usuário para dois cliques simultâneos não assumirem duas senhas para a mesma pessoa.
            await conexao.execute("SELECT id FROM usuario WHERE id = ? FOR UPDATE", [
                requisicao.usuario.id,
            ]);
            const [atuais] = await conexao.execute(
                "SELECT id FROM atendimento WHERE recepcionista_id = ? AND status = 'em_recepcao' LIMIT 1 FOR UPDATE",
                [requisicao.usuario.id],
            );
            if (atuais.length)
                throw erroDeValidacao(
                    "Conclua ou cancele a senha atual antes de chamar outra.",
                    409,
                );
            // O bloqueio também impede que dois recepcionistas chamem o mesmo paciente.
            const [fila] = await conexao.query(
                "SELECT id FROM atendimento WHERE status = 'aguardando_recepcao' ORDER BY data_hora_chegada, id LIMIT 1 FOR UPDATE",
            );
            if (!fila.length) throw erroDeValidacao("Não há senhas aguardando recepção.", 409);
            const id = fila[0].id;
            await conexao.execute(
                "UPDATE atendimento SET recepcionista_id = ?, data_hora_recepcao = NOW(), status = 'em_recepcao' WHERE id = ?",
                [requisicao.usuario.id, id],
            );
            await conexao.commit();
            resposta.json({ mensagem: "Senha chamada.", atendimento: formatarAtendimento({ id }) });
        } catch (erro) {
            await conexao.rollback();
            throw erro;
        } finally {
            conexao.release();
        }
    });

    // GET consulta dados. A busca é paginada para não carregar todos os pacientes de uma vez.
    rotas.get("/pacientes", async (requisicao, resposta) => {
        const busca = lerTexto(requisicao.query.busca, "nome ou CPF", 150, true);
        const pagina = lerId(requisicao.query.pagina || "1", "Página");
        // Escapo os curingas para pesquisar o texto digitado, não todos os nomes por um %.
        const nome = "%" + busca.replace(/[!%_]/g, "!$&") + "%";
        const cpf = /^[\d.\-]+$/.test(busca) ? busca.replace(/[.-]/g, "") : "";
        const condicao = " WHERE nome_completo LIKE ? ESCAPE '!' OR cpf = ?";
        const [contagem] = await banco.execute(
            "SELECT COUNT(*) AS total FROM paciente" + condicao,
            [nome, cpf],
        );
        const [pacientes] = await banco.execute(
            "SELECT id, nome_completo, cpf, data_nascimento, cadastro_completo FROM paciente" +
                condicao +
                " ORDER BY nome_completo, id LIMIT 20 OFFSET " +
                (pagina - 1) * 20,
            [nome, cpf],
        );
        resposta.json({ pacientes, total: Number(contagem[0].total), pagina });
    });

    // O :id é o número recebido na URL para abrir um cadastro específico.
    rotas.get("/pacientes/:id", async (requisicao, resposta) => {
        const id = lerId(requisicao.params.id, "Paciente");
        const [pacientes] = await banco.execute(
            "SELECT id, nome_completo, cpf, rg, data_nascimento, telefone, endereco, nome_pai, nome_mae, cadastro_completo, observacao_cadastro FROM paciente WHERE id = ?",
            [id],
        );
        if (!pacientes.length) throw erroDeValidacao("Paciente não encontrado.", 404);
        resposta.json({ paciente: pacientes[0] });
    });

    // POST recebe os campos em requisicao.body. Valido tudo antes de gravar no banco.
    rotas.post("/pacientes/salvar", async (requisicao, resposta) => {
        const dados = requisicao.body;
        const paciente = validarPaciente(dados);
        let pacienteId = lerId(dados.paciente_id, "Paciente", true);
        const atendimentoId = lerId(dados.atendimento_id, "Atendimento", true);
        if (!["salvar", "encaminhar_triagem"].includes(dados.acao))
            throw erroDeValidacao("Ação inválida.");
        if (dados.acao === "encaminhar_triagem" && !atendimentoId)
            throw erroDeValidacao("Chame uma senha antes de encaminhar à triagem.");
        const conexao = await banco.getConnection();
        try {
            await conexao.beginTransaction();
            if (atendimentoId) {
                const atendimento = await buscarAtendimento(conexao, atendimentoId, true);
                verificarAtendimentoAtual(atendimento, requisicao.usuario.id);
            }
            const valores = [
                paciente.nome_completo,
                paciente.cpf,
                paciente.rg,
                paciente.data_nascimento,
                paciente.telefone,
                paciente.endereco,
                paciente.nome_pai,
                paciente.nome_mae,
                paciente.cadastro_completo,
                paciente.observacao_cadastro,
            ];
            if (pacienteId) {
                const [existentes] = await conexao.execute(
                    "SELECT id FROM paciente WHERE id = ? FOR UPDATE",
                    [pacienteId],
                );
                if (!existentes.length) throw erroDeValidacao("Paciente não encontrado.", 404);
                await conexao.execute(
                    "UPDATE paciente SET nome_completo = ?, cpf = ?, rg = ?, data_nascimento = ?, telefone = ?, endereco = ?, nome_pai = ?, nome_mae = ?, cadastro_completo = ?, observacao_cadastro = ? WHERE id = ?",
                    [...valores, pacienteId],
                );
            } else {
                const [resultado] = await conexao.execute(
                    "INSERT INTO paciente (nome_completo, cpf, rg, data_nascimento, telefone, endereco, nome_pai, nome_mae, cadastro_completo, observacao_cadastro, criado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [...valores, requisicao.usuario.id],
                );
                pacienteId = resultado.insertId;
            }
            if (atendimentoId) {
                const [abertos] = await conexao.execute(
                    "SELECT id FROM atendimento WHERE paciente_id = ? AND id <> ? AND status NOT IN ('finalizado', 'cancelado') LIMIT 1 FOR UPDATE",
                    [pacienteId, atendimentoId],
                );
                if (abertos.length)
                    throw erroDeValidacao("Este paciente já possui um atendimento em aberto.", 409);
                // Até um cadastro provisório pode seguir. Não invento CPF, nome ou nascimento.
                const status =
                    dados.acao === "encaminhar_triagem" ? "aguardando_triagem" : "em_recepcao";
                await conexao.execute(
                    "UPDATE atendimento SET paciente_id = ?, status = ? WHERE id = ?",
                    [pacienteId, status, atendimentoId],
                );
            }
            // Salvar paciente e encaminhar atendimento precisam funcionar juntos, ou desfaço os dois.
            await conexao.commit();
            resposta.json({
                mensagem:
                    dados.acao === "encaminhar_triagem"
                        ? "Paciente encaminhado à triagem."
                        : "Cadastro salvo.",
                paciente_id: pacienteId,
            });
        } catch (erro) {
            await conexao.rollback();
            throw erro;
        } finally {
            conexao.release();
        }
    });

    // Só acrescento os filtros preenchidos; os valores continuam separados do texto SQL.
    rotas.get("/atendimentos", async (requisicao, resposta) => {
        const busca = lerTexto(requisicao.query.busca, "Busca", 150);
        const status = lerTexto(requisicao.query.status, "Situação", 30);
        const data = validarData(requisicao.query.data, "Data da chegada");
        const pagina = lerId(requisicao.query.pagina || "1", "Página");
        if (status && !situacoes.includes(status)) throw erroDeValidacao("Situação inválida.");
        const filtros = [];
        const valores = [];
        if (status) {
            filtros.push("a.status = ?");
            valores.push(status);
        }
        if (data) {
            filtros.push(
                "a.data_hora_chegada >= ? AND a.data_hora_chegada < DATE_ADD(?, INTERVAL 1 DAY)",
            );
            valores.push(data, data);
        }
        if (busca) {
            if (/^(AT)?\d+$/i.test(busca)) {
                const numero = busca.replace(/^AT/i, "").replace(/^0+/, "");
                filtros.push("a.id = ?");
                valores.push(lerId(numero, "Número de atendimento"));
            } else {
                filtros.push("p.nome_completo LIKE ? ESCAPE '!'");
                valores.push("%" + busca.replace(/[!%_]/g, "!$&") + "%");
            }
        }
        const de = " FROM atendimento a LEFT JOIN paciente p ON p.id = a.paciente_id";
        const onde = filtros.length ? " WHERE " + filtros.join(" AND ") : "";
        const [contagem] = await banco.execute("SELECT COUNT(*) AS total" + de + onde, valores);
        // A parte numérica foi validada antes de compor a paginação.
        const [atendimentos] = await banco.execute(
            "SELECT a.id, a.paciente_id, a.status, a.data_hora_chegada, p.nome_completo" +
                de +
                onde +
                " ORDER BY a.data_hora_chegada DESC, a.id DESC LIMIT 20 OFFSET " +
                (pagina - 1) * 20,
            valores,
        );
        resposta.json({
            atendimentos: atendimentos.map(formatarAtendimento),
            total: Number(contagem[0].total),
            pagina,
        });
    });

    rotas.get("/atendimentos/:id", async (requisicao, resposta) => {
        const id = lerId(requisicao.params.id, "Atendimento");
        const [linhas] = await banco.execute(
            "SELECT a.*, p.nome_completo, u.nome_completo AS recepcionista FROM atendimento a LEFT JOIN paciente p ON p.id = a.paciente_id LEFT JOIN usuario u ON u.id = a.recepcionista_id WHERE a.id = ?",
            [id],
        );
        if (!linhas.length) throw erroDeValidacao("Atendimento não encontrado.", 404);
        // A recepção vê os dados administrativos, não queixas, diagnóstico ou conduta.
        resposta.json({ atendimento: formatarAtendimento(linhas[0]) });
    });

    // Cancelar muda a situação e guarda o motivo; não apago o histórico do atendimento.
    rotas.post("/atendimentos/:id/cancelar", async (requisicao, resposta) => {
        const id = lerId(requisicao.params.id, "Atendimento");
        const motivo = lerTexto(requisicao.body.motivo, "o motivo do cancelamento", 255, true);
        if (requisicao.body.confirmacao !== true) throw erroDeValidacao("Confirme o cancelamento.");
        const conexao = await banco.getConnection();
        try {
            await conexao.beginTransaction();
            const atendimento = await buscarAtendimento(conexao, id, true);
            if (["finalizado", "cancelado"].includes(atendimento.status))
                throw erroDeValidacao(
                    "Não é possível cancelar um atendimento finalizado ou já cancelado.",
                    409,
                );
            // Só leio a confirmação médica. Não altero nenhuma tabela clínica.
            const [confirmacoes] = await conexao.execute(
                "SELECT id FROM consulta WHERE atendimento_id = ? AND data_hora_finalizacao IS NOT NULL",
                [id],
            );
            if (confirmacoes.length)
                throw erroDeValidacao("Este atendimento já foi confirmado pelo médico.", 409);
            await conexao.execute(
                "UPDATE atendimento SET status = 'cancelado', motivo_cancelamento = ? WHERE id = ?",
                [motivo, id],
            );
            await conexao.commit();
            resposta.json({ mensagem: "Atendimento cancelado." });
        } catch (erro) {
            await conexao.rollback();
            throw erro;
        } finally {
            conexao.release();
        }
    });

    return rotas;
}

module.exports = criarRotasRecepcao;
