// Aqui ficam somente a interação com a página e as chamadas HTTP. Não há SQL no navegador.
const mensagem = document.querySelector("#mensagem");
const formularioPaciente = document.querySelector("#form-paciente");
let tokenFormulario = "";
let usuario = null;
let atendimentoAtual = null;
let atendimentoSelecionado = null;
let paginaPacientes = 1;
let paginaAtendimentos = 1;
let buscaPacientes = "";
let filtrosAtendimentos = {};

const nomesSituacoes = {
    aguardando_recepcao: "Aguardando recepção",
    em_recepcao: "Em recepção",
    aguardando_triagem: "Aguardando triagem",
    em_triagem: "Em triagem",
    aguardando_medico: "Aguardando médico",
    em_atendimento: "Em atendimento médico",
    finalizado: "Finalizado",
    cancelado: "Cancelado",
};

function mostrarMensagem(texto, erro = false) {
    mensagem.textContent = texto;
    mensagem.dataset.tipo = erro ? "erro" : "informacao";
    mensagem.hidden = false;
    // A mensagem fica acima das abas e não depende de qual seção está aberta.
    mensagem.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function consultarServidor(caminho, metodo = "GET", dados) {
    let resposta;
    try {
        resposta = await fetch(caminho, {
            method: metodo,
            headers: { "Content-Type": "application/json", "X-CSRF-Token": tokenFormulario },
            body: dados === undefined ? undefined : JSON.stringify(dados),
        });
    } catch {
        throw new Error("Não foi possível comunicar com o servidor. Tente novamente.");
    }
    if (resposta.status === 401) {
        location.replace("/login/login.html");
        throw new Error("Sua sessão terminou.");
    }
    const resultado = await resposta.json();
    if (!resposta.ok)
        throw new Error(resultado.mensagem || "Não foi possível concluir a operação.");
    return resultado;
}

// Reaproveito este tratamento para não esquecer de liberar um botão depois de um erro.
function aoClicar(id, acao) {
    document.getElementById(id).addEventListener("click", async (evento) => {
        const botao = evento.currentTarget;
        botao.disabled = true;
        try {
            await acao();
        } catch (erro) {
            mostrarMensagem(erro.message, true);
        } finally {
            botao.disabled = false;
            ajustarBotoesDaFila();
        }
    });
}

function formatarData(valor, horario = false) {
    if (!valor) return "—";
    // A API entrega datas do MySQL como texto, sem conversão automática de fuso.
    const partes = valor.slice(0, 10).split("-");
    return `${partes[2]}/${partes[1]}/${partes[0]}` + (horario ? " " + valor.slice(11, 16) : "");
}

function preencherTabela(id, registros, criarCelulas, quantidadeColunas) {
    const corpo = document.getElementById(id);
    corpo.replaceChildren();
    if (!registros.length) {
        const linha = corpo.insertRow();
        const celula = linha.insertCell();
        celula.colSpan = quantidadeColunas;
        celula.textContent = "Nenhum registro encontrado.";
        return;
    }
    for (const registro of registros) {
        const linha = corpo.insertRow();
        for (const valor of criarCelulas(registro)) {
            const celula = linha.insertCell();
            // textContent impede que o texto cadastrado seja interpretado como HTML.
            if (valor instanceof Node) celula.append(valor);
            else celula.textContent = valor ?? "—";
        }
    }
}

function criarBotao(texto, acao) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "botao-secundario";
    botao.textContent = texto;
    botao.addEventListener("click", async () => {
        botao.disabled = true;
        try {
            await acao();
        } catch (erro) {
            mostrarMensagem(erro.message, true);
        } finally {
            botao.disabled = false;
        }
    });
    return botao;
}

async function atualizarPainel() {
    const dados = await consultarServidor("/api/recepcao/painel");
    for (const nome of [
        "aguardando_recepcao",
        "aguardando_triagem",
        "aguardando_medico",
        "em_atendimento",
        "atendidos_hoje",
    ]) {
        document.getElementById("total-" + nome).textContent = dados.totais[nome];
    }
    preencherTabela(
        "recentes",
        dados.recentes,
        (item) => [
            item.senha,
            item.nome_completo || "Não identificado",
            formatarData(item.data_hora_chegada, true),
            nomesSituacoes[item.status],
        ],
        4,
    );
}

function ajustarBotoesDaFila() {
    document.querySelector("#chamar-proxima").disabled = Boolean(atendimentoAtual);
    document.querySelector("#identificar-paciente").disabled = !atendimentoAtual;
    document.querySelector("#encaminhar-triagem").disabled =
        !formularioPaciente.elements.atendimento_id.value;
}

async function atualizarFila() {
    const dados = await consultarServidor("/api/recepcao/senhas");
    atendimentoAtual = dados.atual;
    document.querySelector("#senha-atual").textContent = atendimentoAtual
        ? atendimentoAtual.senha
        : "—";
    document.querySelector("#quantidade-fila").textContent = dados.total;
    preencherTabela(
        "fila-senhas",
        dados.fila,
        (item) => [
            item.senha,
            formatarData(item.data_hora_chegada, true),
            nomesSituacoes[item.status],
        ],
        3,
    );
    ajustarBotoesDaFila();
}

function atualizarContextoCadastro() {
    const id = formularioPaciente.elements.atendimento_id.value;
    document.querySelector("#contexto-cadastro").textContent = id
        ? "Atendimento AT" + String(id).padStart(4, "0")
        : "Cadastro de paciente";
    ajustarBotoesDaFila();
}

function iniciarCadastro(vincular = true) {
    formularioPaciente.reset();
    formularioPaciente.elements.paciente_id.value = "";
    formularioPaciente.elements.atendimento_id.value =
        vincular && atendimentoAtual ? atendimentoAtual.id : "";
    atualizarContextoCadastro();
    ajustarObrigatorios();
    location.hash = "pacientes";
}

async function carregarPaciente(id, vincular) {
    const dados = await consultarServidor("/api/recepcao/pacientes/" + id);
    iniciarCadastro(vincular);
    for (const [campo, valor] of Object.entries(dados.paciente)) {
        if (formularioPaciente.elements[campo])
            formularioPaciente.elements[campo].value = valor ?? "";
    }
    formularioPaciente.elements.paciente_id.value = dados.paciente.id;
    ajustarObrigatorios();
    document.querySelector("#cadastro").scrollIntoView({ behavior: "smooth" });
}

function ajustarObrigatorios() {
    const completo = formularioPaciente.elements.cadastro_completo.value === "1";
    formularioPaciente.elements.nome_completo.required = completo;
    formularioPaciente.elements.data_nascimento.required = completo;
}

async function buscarPacientes() {
    if (!buscaPacientes) return;
    const parametros = new URLSearchParams({ busca: buscaPacientes, pagina: paginaPacientes });
    const dados = await consultarServidor("/api/recepcao/pacientes?" + parametros);
    preencherTabela(
        "resultados-pacientes",
        dados.pacientes,
        (paciente) => {
            const acoes = document.createElement("div");
            acoes.append(criarBotao("Editar cadastro", () => carregarPaciente(paciente.id, false)));
            if (atendimentoAtual)
                acoes.append(
                    criarBotao("Usar na senha atual", () => carregarPaciente(paciente.id, true)),
                );
            return [
                paciente.nome_completo || "Não identificado",
                paciente.cpf,
                formatarData(paciente.data_nascimento),
                paciente.cadastro_completo ? "Completo" : "Provisório",
                acoes,
            ];
        },
        5,
    );
    document.querySelector("#pagina-pacientes").textContent =
        `Página ${paginaPacientes} · ${dados.total} resultado(s)`;
    document.querySelector("#pacientes-anterior").disabled = paginaPacientes <= 1;
    document.querySelector("#pacientes-proxima").disabled = paginaPacientes * 20 >= dados.total;
}

async function buscarAtendimentos() {
    const parametros = new URLSearchParams({ ...filtrosAtendimentos, pagina: paginaAtendimentos });
    const dados = await consultarServidor("/api/recepcao/atendimentos?" + parametros);
    preencherTabela(
        "lista-atendimentos",
        dados.atendimentos,
        (item) => [
            item.senha,
            item.nome_completo || "Não identificado",
            formatarData(item.data_hora_chegada, true),
            nomesSituacoes[item.status],
            criarBotao("Consultar", () => consultarAtendimento(item.id)),
        ],
        5,
    );
    document.querySelector("#pagina-atendimentos").textContent =
        `Página ${paginaAtendimentos} · ${dados.total} resultado(s)`;
    document.querySelector("#atendimentos-anterior").disabled = paginaAtendimentos <= 1;
    document.querySelector("#atendimentos-proxima").disabled =
        paginaAtendimentos * 20 >= dados.total;
}

async function consultarAtendimento(id) {
    const dados = await consultarServidor("/api/recepcao/atendimentos/" + id);
    atendimentoSelecionado = dados.atendimento;
    const item = atendimentoSelecionado;
    document.querySelector("#titulo-detalhe").textContent = "Atendimento " + item.senha;
    const lista = document.querySelector("#dados-atendimento");
    lista.replaceChildren();
    for (const [titulo, valor] of Object.entries({
        Paciente: item.nome_completo || "Não identificado",
        Situação: nomesSituacoes[item.status],
        Chegada: formatarData(item.data_hora_chegada, true),
        Recepcionista: item.recepcionista || "—",
        "Início na recepção": formatarData(item.data_hora_recepcao, true),
        "Finalização médica": formatarData(item.data_hora_finalizacao, true),
        "Motivo do cancelamento": item.motivo_cancelamento || "—",
    })) {
        const grupo = document.createElement("div");
        const termo = document.createElement("dt");
        const descricao = document.createElement("dd");
        termo.textContent = titulo;
        descricao.textContent = valor;
        grupo.append(termo, descricao);
        lista.append(grupo);
    }
    const cancelamento = document.querySelector("#form-cancelamento");
    cancelamento.reset();
    cancelamento.elements.atendimento_id.value = id;
    cancelamento.hidden = ["finalizado", "cancelado"].includes(item.status);
    document.querySelector("#alterar-atendimento").hidden =
        item.status !== "em_recepcao" || item.recepcionista_id !== usuario.id;
    document.querySelector("#editar-paciente-atendimento").hidden = !item.paciente_id;
    document.querySelector("#detalhe-atendimento").hidden = false;
}

async function atualizarDados() {
    await Promise.all([atualizarPainel(), atualizarFila(), buscarAtendimentos()]);
}

// Cada formulário só bloqueia seus próprios botões durante o envio.
function aoEnviar(id, acao) {
    document.getElementById(id).addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const formulario = evento.currentTarget;
        if (formulario.dataset.enviando === "1" || !formulario.reportValidity()) return;
        formulario.dataset.enviando = "1";
        const botoes = formulario.querySelectorAll("button[type='submit']");
        for (const botao of botoes) botao.disabled = true;
        try {
            await acao(formulario, evento.submitter);
        } catch (erro) {
            mostrarMensagem(erro.message, true);
        } finally {
            delete formulario.dataset.enviando;
            for (const botao of botoes) botao.disabled = false;
            ajustarBotoesDaFila();
        }
    });
}

aoEnviar("form-busca-paciente", async (formulario) => {
    buscaPacientes = formulario.elements.busca.value.trim();
    paginaPacientes = 1;
    await buscarPacientes();
});
aoEnviar("form-filtros", async (formulario) => {
    filtrosAtendimentos = Object.fromEntries(new FormData(formulario));
    paginaAtendimentos = 1;
    await buscarAtendimentos();
});
aoEnviar("form-paciente", async (formulario, botao) => {
    const dados = Object.fromEntries(new FormData(formulario));
    dados.acao = botao ? botao.value : "salvar";
    const resultado = await consultarServidor("/api/recepcao/pacientes/salvar", "POST", dados);
    formulario.elements.paciente_id.value = resultado.paciente_id;
    await atualizarDados();
    if (dados.acao === "encaminhar_triagem") iniciarCadastro(false);
    mostrarMensagem(resultado.mensagem);
});
aoEnviar("form-cancelamento", async (formulario) => {
    const resultado = await consultarServidor(
        "/api/recepcao/atendimentos/" + formulario.elements.atendimento_id.value + "/cancelar",
        "POST",
        {
            motivo: formulario.elements.motivo.value,
            confirmacao: formulario.elements.confirmacao.checked,
        },
    );
    await atualizarDados();
    await consultarAtendimento(formulario.elements.atendimento_id.value);
    mostrarMensagem(resultado.mensagem);
});

aoClicar("sair", async () => {
    await consultarServidor("/api/sair", "POST", {});
    location.replace("/login/login.html");
});
aoClicar("gerar-senha", async () => {
    const resultado = await consultarServidor("/api/recepcao/senhas", "POST", {});
    await atualizarDados();
    mostrarMensagem("Senha " + resultado.atendimento.senha + " gerada.");
});
aoClicar("chamar-proxima", async () => {
    const resultado = await consultarServidor("/api/recepcao/senhas/chamar", "POST", {});
    await atualizarDados();
    iniciarCadastro();
    mostrarMensagem("Senha " + resultado.atendimento.senha + " chamada.");
});
aoClicar("identificar-paciente", async () => {
    if (atendimentoAtual?.paciente_id) await carregarPaciente(atendimentoAtual.paciente_id, true);
    else iniciarCadastro();
});
aoClicar("novo-paciente", async () => iniciarCadastro());
aoClicar("atualizar-painel", atualizarDados);
aoClicar("alterar-atendimento", async () => {
    await atualizarFila();
    if (!atendimentoAtual || atendimentoAtual.id !== atendimentoSelecionado.id)
        throw new Error("Este atendimento não está mais com você.");
    if (atendimentoAtual.paciente_id) await carregarPaciente(atendimentoAtual.paciente_id, true);
    else iniciarCadastro();
});
aoClicar("editar-paciente-atendimento", async () =>
    carregarPaciente(atendimentoSelecionado.paciente_id, false),
);

// A paginação só muda a página após uma busca; as condições continuam no servidor.
for (const [id, deslocamento] of [
    ["pacientes-anterior", -1],
    ["pacientes-proxima", 1],
]) {
    document.getElementById(id).addEventListener("click", async () => {
        paginaPacientes = Math.max(1, paginaPacientes + deslocamento);
        try {
            await buscarPacientes();
        } catch (erro) {
            mostrarMensagem(erro.message, true);
        }
    });
}
for (const [id, deslocamento] of [
    ["atendimentos-anterior", -1],
    ["atendimentos-proxima", 1],
]) {
    document.getElementById(id).addEventListener("click", async () => {
        paginaAtendimentos = Math.max(1, paginaAtendimentos + deslocamento);
        try {
            await buscarAtendimentos();
        } catch (erro) {
            mostrarMensagem(erro.message, true);
        }
    });
}
formularioPaciente.elements.cadastro_completo.addEventListener("change", ajustarObrigatorios);

async function iniciarRecepcao() {
    try {
        const sessao = await consultarServidor("/api/sessao");
        if (!sessao.usuario) return location.replace("/login/login.html");
        if (sessao.usuario.perfil !== "recepcionista") return location.replace(sessao.destino);
        usuario = sessao.usuario;
        tokenFormulario = sessao.tokenFormulario;
        document.querySelector("#nome-usuario").textContent = usuario.nome;
        const hoje = new Date();
        formularioPaciente.elements.data_nascimento.max = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
        formularioPaciente.elements.data_nascimento.min = "1900-01-01";
        await atualizarDados();
        ajustarObrigatorios();
        // Atualizo os números sem substituir o formulário que está sendo preenchido.
        setInterval(async () => {
            if (document.hidden) return;
            try {
                await Promise.all([atualizarPainel(), atualizarFila()]);
            } catch (erro) {
                mostrarMensagem(erro.message, true);
            }
        }, 30000);
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
}

iniciarRecepcao();
