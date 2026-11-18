const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const criarAplicacao = require("../app");

// Só executo a integração quando solicitado. Crio um banco temporário separado do SAPS.
test(
    "fluxo completo de login e recepção no banco",
    { skip: process.env.TESTAR_INTEGRACAO !== "1" },
    async (t) => {
        const configuracaoBanco = {
            host: process.env.TESTE_DB_HOST || "127.0.0.1",
            port: Number(process.env.TESTE_DB_PORT || 3306),
            user: process.env.TESTE_DB_USER || "root",
            password: process.env.TESTE_DB_PASSWORD || "",
            dateStrings: true,
            multipleStatements: true,
        };
        const administrador = await mysql.createConnection(configuracaoBanco);
        const nomeBanco = "saps_teste_" + crypto.randomBytes(6).toString("hex");
        await administrador.query("CREATE DATABASE " + nomeBanco);
        const banco = mysql.createPool({
            ...configuracaoBanco,
            database: nomeBanco,
            connectionLimit: 8,
        });
        let servidor;
        try {
            await banco.query(
                fs.readFileSync(path.join(__dirname, "../../database/script.sql"), "utf8"),
            );
            for (let i = 0; i < 2; i++) {
                execFileSync(process.execPath, [path.join(__dirname, "../atualizar-banco.js")], {
                    env: {
                        ...process.env,
                        DB_HOST: configuracaoBanco.host,
                        DB_PORT: String(configuracaoBanco.port),
                        DB_USER: configuracaoBanco.user,
                        DB_PASSWORD: configuracaoBanco.password,
                        DB_NAME: nomeBanco,
                    },
                    stdio: "pipe",
                });
            }
            const hash = await bcrypt.hash("TesteSaps123!", 4);
            for (const [nome, email, perfil, registro, ativo] of [
                ["Recepção Um", "r1@saps.local", "recepcionista", null, 1],
                ["Recepção Dois", "r2@saps.local", "recepcionista", null, 1],
                ["Enfermagem", "e@saps.local", "enfermeiro", "COREN-SP 123", 1],
                ["Médico", "m@saps.local", "medico", "CRM-SP 123", 1],
                ["Inativo", "inativo@saps.local", "recepcionista", null, 0],
            ])
                await banco.execute(
                    "INSERT INTO usuario (nome_completo,email,senha_hash,perfil,registro_profissional,ativo) VALUES (?,?,?,?,?,?)",
                    [nome, email, hash, perfil, registro, ativo],
                );
            let linkRecuperacao;
            const app = criarAplicacao(banco, {
                segredoSessao: crypto.randomBytes(32).toString("hex"),
                enderecoPublico: "http://127.0.0.1",
                enviarEmail: async (email, link) => {
                    linkRecuperacao = link;
                },
            });
            servidor = app.listen(0, "127.0.0.1");
            await new Promise((resolver) => servidor.once("listening", resolver));
            const endereco = "http://127.0.0.1:" + servidor.address().port;
            function criarCliente() {
                let cookie = "";
                let token = "";
                return {
                    async pedir(caminho, metodo = "GET", dados, semToken = false) {
                        const resposta = await fetch(endereco + caminho, {
                            method: metodo,
                            redirect: "manual",
                            headers: {
                                Cookie: cookie,
                                "Content-Type": "application/json",
                                ...(semToken ? {} : { "X-CSRF-Token": token }),
                            },
                            body: dados === undefined ? undefined : JSON.stringify(dados),
                        });
                        if (resposta.headers.get("set-cookie"))
                            cookie = resposta.headers.get("set-cookie").split(";")[0];
                        const texto = await resposta.text();
                        const corpo = resposta.headers
                            .get("content-type")
                            ?.includes("application/json")
                            ? JSON.parse(texto)
                            : texto;
                        if (corpo.tokenFormulario) token = corpo.tokenFormulario;
                        return { status: resposta.status, corpo, cabecalhos: resposta.headers };
                    },
                    async entrar(email) {
                        await this.pedir("/api/sessao");
                        const resultado = await this.pedir("/api/login", "POST", {
                            email,
                            senha: "TesteSaps123!",
                        });
                        assert.equal(resultado.status, 200);
                        await this.pedir("/api/sessao");
                        return resultado;
                    },
                };
            }
            const visitante = criarCliente();
            const recepcao = criarCliente();
            const segundaRecepcao = criarCliente();
            const enfermagem = criarCliente();
            const medico = criarCliente();

            await t.test("bloqueia acesso sem sessão e alterações sem token", async () => {
                assert.equal((await visitante.pedir("/api/recepcao/painel")).status, 401);
                assert.equal((await visitante.pedir("/recepcao/index.html")).status, 302);
                assert.equal((await visitante.pedir("/api/login", "POST", {}, true)).status, 403);
            });
            await t.test("login rejeita senha errada e conta inativa", async () => {
                await visitante.pedir("/api/sessao");
                for (const dados of [
                    { email: "r1@saps.local", senha: "errada" },
                    { email: "naoexiste@saps.local", senha: "abc" },
                    { email: "inativo@saps.local", senha: "TesteSaps123!" },
                ]) {
                    const resposta = await visitante.pedir("/api/login", "POST", dados);
                    assert.equal(resposta.status, 401);
                    assert.equal(resposta.corpo.mensagem, "E-mail ou senha inválidos.");
                }
            });
            await t.test("login redireciona por perfil e restringe a API da recepção", async () => {
                assert.equal(
                    (await recepcao.entrar("r1@saps.local")).corpo.destino,
                    "/recepcao/index.html",
                );
                await segundaRecepcao.entrar("r2@saps.local");
                assert.equal(
                    (await enfermagem.entrar("e@saps.local")).corpo.destino,
                    "/triagem/index.html",
                );
                assert.equal(
                    (await medico.entrar("m@saps.local")).corpo.destino,
                    "/medico/index.html",
                );
                assert.equal((await visitante.pedir("/api/medico/fila")).status, 401);
                assert.equal((await recepcao.pedir("/api/medico/fila")).status, 403);
                assert.deepEqual((await medico.pedir("/api/medico/fila")).corpo, []);
                assert.equal((await medico.pedir("/api/medico/atendimentos/1e2")).status, 400);
                assert.equal((await medico.pedir("/api/medico/atendimentos/999")).status, 404);
                assert.equal((await enfermagem.pedir("/api/recepcao/painel")).status, 403);
                assert.equal((await recepcao.pedir("/medico/index.html")).status, 403);
                assert.equal((await recepcao.pedir("/recepcao/index.html")).status, 200);
            });
            await t.test("equipe mostra apenas contas ativas e respeita o prazo da situação", async () => {
                const lista = "/api/recepcao/funcionarios";
                const minha = "/api/minha-situacao";
                assert.equal((await visitante.pedir(lista)).status, 401);
                assert.equal((await medico.pedir(lista)).status, 403);
                const equipe = (await recepcao.pedir(lista)).corpo;
                assert.equal(equipe.length, 4);
                assert.ok(equipe.every(p => p.situacao === null && !("senha_hash" in p)));
                const termino = new Date(Date.now() + 3600000).toISOString();
                for (const dados of [
                    { situacao: "invalida", termino },
                    { situacao: "ferias", termino: 17 },
                    { situacao: "ferias", termino: "2020-01-01T00:00:00.000Z" },
                ]) assert.equal((await medico.pedir(minha, "PUT", dados)).status, 400);
                for (const situacao of ["plantao", "almoco", "ferias", "folga"]) {
                    assert.equal((await medico.pedir(minha, "PUT", { situacao, termino })).status, 200);
                    const pessoas = (await recepcao.pedir(lista)).corpo;
                    assert.equal(pessoas.find(p => p.perfil === "medico").situacao, situacao);
                    assert.equal(pessoas.filter(p => p.situacao !== null).length, 1);
                    assert.equal((await enfermagem.pedir(minha)).corpo.situacao, null);
                }
                await banco.query("UPDATE disponibilidade_funcionario SET termino_utc = UTC_TIMESTAMP() - INTERVAL 1 MINUTE");
                assert.equal((await medico.pedir(minha)).corpo.situacao, null);
                assert.ok((await recepcao.pedir(lista)).corpo.every(p => p.termino === null));
            });
            let atendimento1;
            let atendimento2;
            await t.test(
                "gera números e impede chamadas duplicadas pelo mesmo funcionário",
                async () => {
                    atendimento1 = (await recepcao.pedir("/api/recepcao/senhas", "POST", {})).corpo
                        .atendimento.id;
                    atendimento2 = (await recepcao.pedir("/api/recepcao/senhas", "POST", {})).corpo
                        .atendimento.id;
                    assert.equal(atendimento2, atendimento1 + 1);
                    const respostas = await Promise.all([
                        recepcao.pedir("/api/recepcao/senhas/chamar", "POST", {}),
                        recepcao.pedir("/api/recepcao/senhas/chamar", "POST", {}),
                    ]);
                    assert.deepEqual(respostas.map((r) => r.status).sort(), [200, 409]);
                    const outra = await segundaRecepcao.pedir(
                        "/api/recepcao/senhas/chamar",
                        "POST",
                        {},
                    );
                    assert.equal(outra.corpo.atendimento.id, atendimento2);
                },
            );
            await t.test("um recepcionista não salva na senha assumida pelo outro", async () => {
                const resposta = await segundaRecepcao.pedir(
                    "/api/recepcao/pacientes/salvar",
                    "POST",
                    { cadastro_completo: "0", atendimento_id: atendimento1, acao: "salvar" },
                );
                assert.equal(resposta.status, 403);
            });
            await t.test("valida os campos mesmo em requisição enviada fora do HTML", async () => {
                for (const dados of [
                    { cpf: "12345678901" },
                    { telefone: "-123" },
                    { nome_completo: "Ana42" },
                    { paciente_id: "-1" },
                    { data_nascimento: "2026-02-30" },
                ]) {
                    const resposta = await recepcao.pedir(
                        "/api/recepcao/pacientes/salvar",
                        "POST",
                        { cadastro_completo: "0", acao: "salvar", ...dados },
                    );
                    assert.equal(resposta.status, 400);
                }
                assert.equal((await recepcao.pedir("/api/recepcao/atendimentos/-1")).status, 400);
            });
            let pacienteId;
            await t.test("provisório é salvo e encaminhado sem inventar dados", async () => {
                const resposta = await recepcao.pedir("/api/recepcao/pacientes/salvar", "POST", {
                    cadastro_completo: "0",
                    atendimento_id: atendimento1,
                    acao: "encaminhar_triagem",
                });
                assert.equal(resposta.status, 200);
                pacienteId = resposta.corpo.paciente_id;
                const [dados] = await banco.execute(
                    "SELECT a.status,p.nome_completo,p.cpf FROM atendimento a JOIN paciente p ON p.id=a.paciente_id WHERE a.id=?",
                    [atendimento1],
                );
                assert.equal(dados[0].status, "aguardando_triagem");
                assert.equal(dados[0].cpf, null);
                assert.equal(dados[0].nome_completo, null);
            });
            await t.test(
                "completa cadastro, pesquisa por nome/CPF e informa busca vazia",
                async () => {
                    const resposta = await recepcao.pedir(
                        "/api/recepcao/pacientes/salvar",
                        "POST",
                        {
                            paciente_id: pacienteId,
                            cadastro_completo: "1",
                            nome_completo: "Ana Souza",
                            cpf: "529.982.247-25",
                            rg: "00.123.456-X",
                            data_nascimento: "2000-01-01",
                            acao: "salvar",
                        },
                    );
                    assert.equal(resposta.status, 200);
                    for (const busca of ["Ana", "52998224725"]) {
                        const pesquisa = await recepcao.pedir(
                            "/api/recepcao/pacientes?busca=" + busca,
                        );
                        assert.equal(pesquisa.corpo.total, 1);
                    }
                    assert.equal(
                        (await recepcao.pedir("/api/recepcao/pacientes?busca=Inexistente")).corpo
                            .total,
                        0,
                    );
                    assert.equal(
                        (await recepcao.pedir("/api/recepcao/pacientes/" + pacienteId)).corpo
                            .paciente.rg,
                        "00.123.456-X",
                    );
                },
            );
            await t.test(
                "CPF duplicado e atendimento duplicado são rejeitados sem gravação parcial",
                async () => {
                    assert.equal(
                        (
                            await recepcao.pedir("/api/recepcao/pacientes/salvar", "POST", {
                                cadastro_completo: "0",
                                cpf: "52998224725",
                                acao: "salvar",
                            })
                        ).status,
                        409,
                    );
                    const resposta = await segundaRecepcao.pedir(
                        "/api/recepcao/pacientes/salvar",
                        "POST",
                        {
                            paciente_id: pacienteId,
                            nome_completo: "Nome Alterado",
                            cadastro_completo: "0",
                            atendimento_id: atendimento2,
                            acao: "salvar",
                        },
                    );
                    assert.equal(resposta.status, 409);
                    const [pacientes] = await banco.execute(
                        "SELECT nome_completo FROM paciente WHERE id=?",
                        [pacienteId],
                    );
                    assert.equal(pacientes[0].nome_completo, "Ana Souza");
                },
            );
            await t.test(
                "consulta atendimentos com filtro e cancela com motivo obrigatório",
                async () => {
                    const busca = await recepcao.pedir(
                        "/api/recepcao/atendimentos?busca=AT0001&status=aguardando_triagem",
                    );
                    assert.equal(busca.corpo.total, 1);
                    assert.equal(
                        (
                            await recepcao.pedir(
                                `/api/recepcao/atendimentos/${atendimento1}/cancelar`,
                                "POST",
                                { motivo: "", confirmacao: true },
                            )
                        ).status,
                        400,
                    );
                    assert.equal(
                        (
                            await recepcao.pedir(
                                `/api/recepcao/atendimentos/${atendimento1}/cancelar`,
                                "POST",
                                { motivo: "Paciente desistiu", confirmacao: true },
                            )
                        ).status,
                        200,
                    );
                    const detalhe = await recepcao.pedir(
                        `/api/recepcao/atendimentos/${atendimento1}`,
                    );
                    assert.equal(detalhe.corpo.atendimento.status, "cancelado");
                    assert.equal(
                        detalhe.corpo.atendimento.motivo_cancelamento,
                        "Paciente desistiu",
                    );
                },
            );
            await t.test("não cancela finalizado ou confirmado pelo médico", async () => {
                const [a] = await banco.execute(
                    "INSERT INTO atendimento (paciente_id,status,data_hora_finalizacao) VALUES (?,'finalizado',NOW())",
                    [pacienteId],
                );
                assert.equal(
                    (
                        await recepcao.pedir(
                            `/api/recepcao/atendimentos/${a.insertId}/cancelar`,
                            "POST",
                            { motivo: "Teste", confirmacao: true },
                        )
                    ).status,
                    409,
                );
                const [b] = await banco.execute(
                    "INSERT INTO atendimento (paciente_id,status) VALUES (?,'em_atendimento')",
                    [pacienteId],
                );
                await banco.execute(
                    "INSERT INTO consulta (atendimento_id,medico_id,data_hora_finalizacao) VALUES (?,4,NOW())",
                    [b.insertId],
                );
                assert.equal(
                    (
                        await recepcao.pedir(
                            `/api/recepcao/atendimentos/${b.insertId}/cancelar`,
                            "POST",
                            { motivo: "Teste", confirmacao: true },
                        )
                    ).status,
                    409,
                );
            });
            await t.test(
                "painel conta os dados persistidos e não expõe campos clínicos",
                async () => {
                    const painel = await recepcao.pedir("/api/recepcao/painel");
                    assert.equal(painel.corpo.totais.atendidos_hoje, 1);
                    assert.equal(JSON.stringify(painel.corpo).includes("senha_hash"), false);
                    const detalhe = await recepcao.pedir(
                        `/api/recepcao/atendimentos/${atendimento1}`,
                    );
                    assert.equal("diagnostico" in detalhe.corpo.atendimento, false);
                },
            );
            await t.test(
                "triagem e consulta: prioridade, autoria, cancelamento e histórico",
                async () => {
                    const outro = criarCliente();
                    await banco.execute(
                        "INSERT INTO usuario(nome_completo,email,perfil,senha_hash,registro_profissional) VALUES ('Outra Enfermeira','outra@saps.local','enfermeiro',?,'COREN-SP 888')",
                        [hash],
                    );
                    await outro.entrar("outra@saps.local");
                    const tri = {
                        pressao_arterial: "120/80",
                        temperatura: "36.5",
                        batimentos_cardiacos: "70",
                        classificacao: "verde",
                        queixas: "Dor",
                    };
                    const consulta = { diagnostico: "Avaliação concluída", confirmacao: true };
                    async function criarSenha() {
                        const [a] = await banco.execute(
                            "INSERT INTO atendimento(paciente_id,status) VALUES (?,'aguardando_triagem')",
                            [pacienteId],
                        );
                        return a.insertId;
                    }
                    const chamar = (c, area, id) =>
                        c.pedir("/api/" + area + "/atendimentos/" + id + "/iniciar", "POST", {});
                    const concluir = (c, area, id, d) =>
                        c.pedir("/api/" + area + "/atendimentos/" + id + "/concluir", "POST", d);
                    const cancelar = (id) =>
                        recepcao.pedir("/api/recepcao/atendimentos/" + id + "/cancelar", "POST", {
                            motivo: "Desistência",
                            confirmacao: true,
                        });
                    const verde = await criarSenha(),
                        vermelho = await criarSenha();
                    assert.equal((await chamar(enfermagem, "triagem", verde)).status, 200);
                    assert.equal((await concluir(outro, "triagem", verde, tri)).status, 403);
                    for (const invalido of [
                        { temperatura: "-2" },
                        { batimentos_cardiacos: "70a" },
                        { pressao_arterial: "00/00" },
                        { classificacao: "roxo" },
                        { queixas: "" },
                    ])
                        assert.equal(
                            (await concluir(enfermagem, "triagem", verde, { ...tri, ...invalido }))
                                .status,
                            400,
                        );
                    assert.equal((await concluir(enfermagem, "triagem", verde, tri)).status, 200);
                    assert.equal((await chamar(enfermagem, "triagem", vermelho)).status, 200);
                    assert.equal(
                        (
                            await concluir(enfermagem, "triagem", vermelho, {
                                ...tri,
                                classificacao: "vermelho",
                            })
                        ).status,
                        200,
                    );
                    assert.equal(
                        (await medico.pedir("/api/medico/fila")).corpo[0].atendimento_id,
                        vermelho,
                    );
                    assert.equal((await chamar(medico, "medico", verde)).status, 409);
                    assert.equal((await chamar(medico, "medico", vermelho)).status, 200);
                    assert.equal(
                        (await medico.pedir("/api/medico/atual")).corpo.atendimento.id,
                        vermelho,
                    );
                    assert.equal(
                        (
                            await concluir(medico, "medico", vermelho, {
                                ...consulta,
                                confirmacao: false,
                            })
                        ).status,
                        400,
                    );
                    assert.equal(
                        (await concluir(medico, "medico", vermelho, consulta)).status,
                        200,
                    );
                    assert.equal(
                        (await concluir(medico, "medico", vermelho, consulta)).status,
                        409,
                    );
                    assert.equal((await cancelar(vermelho)).status, 409);
                    assert.equal((await chamar(medico, "medico", verde)).status, 200);
                    const historico = (await medico.pedir("/api/medico/prontuario-atual")).corpo;
                    assert.ok(
                        historico.some(
                            (h) =>
                                h.atendimento_id === vermelho &&
                                h.diagnostico === consulta.diagnostico &&
                                h.conduta === null,
                        ),
                    );
                    assert.equal((await cancelar(verde)).status, 200);
                    assert.equal((await concluir(medico, "medico", verde, consulta)).status, 409);
                    assert.equal((await medico.pedir("/api/medico/atual")).corpo.atendimento, null);
                },
            );
            await t.test(
                "recuperação usa token único, muda senha e encerra sessões antigas",
                async () => {
                    assert.equal(
                        (
                            await visitante.pedir("/api/recuperar-senha", "POST", {
                                email: "r1@saps.local",
                            })
                        ).status,
                        200,
                    );
                    const token = linkRecuperacao.split("redefinir=")[1];
                    const resposta = await visitante.pedir("/api/redefinir-senha", "POST", {
                        token,
                        senha: "OutraSenha123!",
                        confirmacao: "OutraSenha123!",
                    });
                    assert.equal(resposta.status, 200);
                    assert.equal(
                        (
                            await visitante.pedir("/api/redefinir-senha", "POST", {
                                token,
                                senha: "OutraSenha123!",
                                confirmacao: "OutraSenha123!",
                            })
                        ).status,
                        400,
                    );
                    assert.equal((await recepcao.pedir("/api/recepcao/painel")).status, 401);
                    assert.equal(
                        (
                            await visitante.pedir("/api/login", "POST", {
                                email: "r1@saps.local",
                                senha: "OutraSenha123!",
                            })
                        ).status,
                        200,
                    );
                },
            );
            await t.test("logout encerra o acesso", async () => {
                assert.equal((await segundaRecepcao.pedir("/api/sair", "POST", {})).status, 200);
                assert.equal((await segundaRecepcao.pedir("/api/recepcao/painel")).status, 401);
            });
        } finally {
            if (servidor) await new Promise((resolver) => servidor.close(resolver));
            await banco.end();
            // Só removo o banco de nome aleatório criado acima, nunca o banco configurado no .env.
            await administrador.query("DROP DATABASE " + nomeBanco);
            await administrador.end();
        }
    },
);
