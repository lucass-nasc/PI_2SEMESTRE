// As duas telas usam a mesma sessão e o mesmo ciclo: fila, iniciar, preencher e concluir.
const triagem = location.pathname.startsWith("/triagem");
const prefixo = triagem ? "/api/triagem" : "/api/medico";
const formulario = document.querySelector(triagem ? "#form-triagem" : "#form-consulta");
let atual = null;
let token = "";
let ocupado = false;

function avisar(texto) {
    const aviso = document.querySelector("#mensagem");
    aviso.textContent = texto;
    aviso.hidden = !texto;
}
async function pedir(caminho, corpo, absoluto = false) {
    const resposta = await fetch(
        absoluto ? caminho : prefixo + caminho,
        corpo === undefined
            ? {}
            : {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
                  body: JSON.stringify(corpo),
              },
    );
    if (resposta.status === 401) location.replace("/login/login.html");
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.mensagem || "Não foi possível concluir.");
    return dados;
}
function ativarFormulario(ativo) {
    for (const campo of formulario.elements) campo.disabled = !ativo;
}
function botaoIniciar(id) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "botao-primario";
    botao.textContent = triagem ? "Iniciar triagem" : "Iniciar consulta";
    botao.onclick = () =>
        executar(async () => {
            await pedir("/atendimentos/" + id + "/iniciar", {});
            formulario.reset();
            await atualizarTela(true);
            location.hash = "atendimento-atual";
            avisar("Atendimento iniciado.");
        });
    return botao;
}
function numeroAt(id) {
    return "AT" + String(id).padStart(4, "0");
}
function mostrarTriagem() {
    const a = atual;
    const dados = {
        senha: a ? numeroAt(a.id) : "—",
        paciente: a?.nome_completo || (a ? "Não identificado" : "—"),
        idade: a?.idade == null ? "—" : a.idade + " anos",
        data_nascimento: a?.data_nascimento?.split("-").reverse().join("/") || "—",
        chegada: a?.data_hora_chegada.slice(11, 16) || "—",
        cadastro: a ? (a.cadastro_completo ? "Completo" : "Provisório") : "—",
        status: a ? "Em triagem" : "Sem atendimento",
    };
    for (const [nome, valor] of Object.entries(dados))
        document.querySelector('[data-campo="' + nome + '"]').textContent = valor;
    ativarFormulario(Boolean(a));
}
async function mostrarHistorico(ativo) {
    const painel = document.querySelector("#prontuario");
    painel.hidden = !ativo;
    if (!ativo) return;
    const historico = await pedir("/prontuario-atual");
    const destino = document.querySelector("#historico");
    destino.replaceChildren();
    if (!historico.length) destino.textContent = "Nenhuma consulta anterior finalizada.";
    for (const item of historico) {
        const linha = document.createElement("p");
        linha.textContent = [
            numeroAt(item.atendimento_id),
            item.data_hora_finalizacao,
            item.classificacao,
            item.diagnostico,
            item.observacoes_consulta,
            item.conduta,
        ]
            .filter(Boolean)
            .join(" · ");
        destino.append(linha);
    }
}
async function atualizarTela(abrirAtual = false) {
    const anterior = atual?.id;
    const [estado, fila] = await Promise.all([pedir("/atual"), pedir("/fila")]);
    atual = estado.atendimento;
    if (anterior !== atual?.id) formulario.reset();
    const corpo = document.querySelector("#corpo-fila");
    corpo.replaceChildren();
    for (const [i, item] of fila.entries()) {
        if (!triagem) {
            corpo.append(criarLinha(item, i === 0));
            continue;
        }
        const linha = corpo.insertRow();
        for (const texto of [
            numeroAt(item.id),
            item.nome_completo || "Não identificado",
            item.data_hora_chegada.slice(11, 16),
            "Aguardando triagem",
        ])
            linha.insertCell().textContent = texto;
        const acao = linha.insertCell();
        if (!atual && i === 0) acao.append(botaoIniciar(item.id));
    }
    if (!fila.length) {
        const celula = corpo.insertRow().insertCell();
        celula.colSpan = triagem ? 5 : 6;
        celula.textContent = "Nenhum paciente aguardando.";
    }
    if (triagem) mostrarTriagem();
    else if (atual && (abrirAtual || anterior !== atual.id)) await carregarFicha(atual.id);
    else if (!atual && (abrirAtual || anterior)) {
        for (const campo of document.querySelectorAll("[data-campo]")) campo.textContent = "—";
        await mostrarHistorico(false);
        ativarFormulario(false);
    }
}
async function executar(acao) {
    if (ocupado) return;
    ocupado = true;
    try {
        await acao();
    } catch (erro) {
        avisar(erro.message);
        try {
            await atualizarTela();
        } catch {
            /* Preservo a mensagem original. */
        }
    } finally {
        ocupado = false;
    }
}
formulario.onsubmit = (evento) => {
    evento.preventDefault();
    executar(async () => {
        if (!atual) throw new Error("Inicie um atendimento.");
        const dados = Object.fromEntries(new FormData(formulario));
        if (!triagem) dados.confirmacao = formulario.elements.confirmar_conclusao.checked;
        const resposta = await pedir("/atendimentos/" + atual.id + "/concluir", dados);
        formulario.reset();
        await atualizarTela(true);
        location.hash = "fila";
        avisar(resposta.mensagem);
    });
};
document.querySelector("#atualizar-fila").onclick = () => executar(() => atualizarTela());
document.querySelector("#sair").onclick = () =>
    executar(async () => {
        await pedir("/api/sair", {}, true);
        location.replace("/login/login.html");
    });
document.querySelector('a[href="#atendimento-atual"]').onclick = () =>
    executar(async () => {
        await atualizarTela(true);
        if (!atual) avisar("Você não tem atendimento em andamento.");
    });
ativarFormulario(false);
executar(async () => {
    const sessao = await pedir("/api/sessao", undefined, true);
    if (!sessao.usuario) return location.replace("/login/login.html");
    token = sessao.tokenFormulario;
    document.querySelector(".rodape-menu strong").textContent = sessao.usuario.nome;
    document.querySelector(".rodape-menu span").textContent = sessao.usuario.registro || "";
    await atualizarTela(true);
});
