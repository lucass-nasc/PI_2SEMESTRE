// Tela do médico: carrega a fila real e a ficha do atendimento escolhido.
// Usa as rotas GET /medico/fila e GET /medico/atendimentos/:id.

const corpoFila = document.getElementById("corpo-fila");
const campoAtendimentoId = document.getElementById("atendimento-id");

// Texto e classe de cor (já existentes no index.css) de cada classificação.
const CLASSIFICACOES = {
    vermelho: { texto: "Vermelho · Emergência", classe: "risco-vermelho" },
    laranja: { texto: "Laranja · Muito urgente", classe: "risco-laranja" },
    amarelo: { texto: "Amarelo · Urgente", classe: "risco-amarelo" },
    verde: { texto: "Verde · Pouco urgente", classe: "risco-verde" },
    azul: { texto: "Azul · Não urgente", classe: "risco-azul" }
};

const STATUS = {
    aguardando_medico: "Aguardando médico",
    em_atendimento: "Em atendimento",
    finalizado: "Finalizado"
};

// "2026-11-18" -> "18/11/2026" (separando o texto, sem criar Date, para não mudar o dia por fuso).
function formatarData(texto) {
    const [ano, mes, dia] = texto.split("-");
    return `${dia}/${mes}/${ano}`;
}

// "2026-11-18 14:05:00" -> "14:05"
function formatarHora(texto) {
    return texto.slice(11, 16);
}

// Cria o selo colorido da classificação de risco.
function criarSelo(classificacao) {
    const info = CLASSIFICACOES[classificacao];
    const selo = document.createElement("span");
    selo.className = `status ${info.classe}`;
    selo.textContent = info.texto;
    return selo;
}

// Monta uma linha da tabela. Usamos textContent (e não innerHTML)
// para que nenhum texto vindo do banco seja interpretado como HTML.
function criarLinha(item) {
    const linha = document.createElement("tr");

    const colunas = [
        item.senha,
        item.paciente,
        formatarData(item.data_nascimento)
    ];
    for (const valor of colunas) {
        const celula = document.createElement("td");
        celula.textContent = valor;
        linha.appendChild(celula);
    }

    const celulaRisco = document.createElement("td");
    celulaRisco.appendChild(criarSelo(item.classificacao));
    linha.appendChild(celulaRisco);

    const celulaChegada = document.createElement("td");
    celulaChegada.textContent = formatarHora(item.data_hora_chegada);
    linha.appendChild(celulaChegada);

    const celulaAcao = document.createElement("td");

    const botaoFicha = document.createElement("button");
    botaoFicha.type = "button";
    botaoFicha.className = "botao-secundario";
    botaoFicha.textContent = "Ver ficha";
    botaoFicha.setAttribute("aria-label", `Ver ficha de ${item.paciente}, ${item.senha}`);
    botaoFicha.addEventListener("click", () => carregarFicha(item.atendimento_id));
    celulaAcao.appendChild(botaoFicha);

    // Ainda desativado: iniciar a consulta depende da rota PATCH e do login.
    const botaoIniciar = document.createElement("button");
    botaoIniciar.type = "button";
    botaoIniciar.className = "botao-primario";
    botaoIniciar.textContent = "Iniciar atendimento";
    botaoIniciar.dataset.atendimentoId = item.atendimento_id;
    botaoIniciar.dataset.acao = "iniciar-consulta";
    botaoIniciar.disabled = true;
    celulaAcao.appendChild(botaoIniciar);

    linha.appendChild(celulaAcao);
    return linha;
}

// Escreve uma mensagem simples no lugar da fila (carregando, vazia ou erro).
function mostrarMensagemFila(mensagem) {
    const linha = document.createElement("tr");
    const celula = document.createElement("td");
    celula.colSpan = 6;
    celula.textContent = mensagem;
    linha.appendChild(celula);
    corpoFila.replaceChildren(linha);
}

async function carregarFila() {
    try {
        const resposta = await fetch("/medico/fila");
        if (!resposta.ok) {
            throw new Error(`Resposta ${resposta.status}`);
        }
        const fila = await resposta.json();

        if (fila.length === 0) {
            mostrarMensagemFila("Nenhum paciente aguardando atendimento médico.");
            return;
        }
        corpoFila.replaceChildren(...fila.map(criarLinha));
    } catch (erro) {
        console.error("Erro ao carregar a fila:", erro);
        mostrarMensagemFila("Não foi possível carregar a fila. Tente novamente.");
    }
}

// Preenche o elemento que tem data-campo="nome" com o texto recebido.
function preencher(nome, texto) {
    document.querySelector(`[data-campo="${nome}"]`).textContent = texto;
}

async function carregarFicha(id) {
    try {
        const resposta = await fetch(`/medico/atendimentos/${id}`);
        if (!resposta.ok) {
            throw new Error(`Resposta ${resposta.status}`);
        }
        const d = await resposta.json();

        preencher("status", STATUS[d.status] || d.status);
        preencher("senha", d.senha);
        preencher("paciente", d.paciente);
        preencher("data_nascimento", formatarData(d.data_nascimento));
        preencher("idade", d.idade === 1 ? "1 ano" : `${d.idade} anos`);
        preencher("chegada", formatarHora(d.data_hora_chegada));
        preencher("cadastro", d.cadastro_completo ? "Completo" : "Incompleto");

        // Selo de classificação: troca o texto e a cor.
        const selo = document.querySelector('[data-campo="classificacao"]');
        const info = CLASSIFICACOES[d.classificacao];
        selo.className = `status ${info.classe}`;
        selo.textContent = info.texto;

        preencher("pressao_arterial", d.pressao_arterial ? `${d.pressao_arterial} mmHg` : "—");
        preencher(
            "temperatura",
            d.temperatura === null ? "—" : `${d.temperatura.toFixed(1).replace(".", ",")} °C`
        );
        preencher(
            "batimentos_cardiacos",
            d.batimentos_cardiacos === null ? "—" : `${d.batimentos_cardiacos} bpm`
        );
        preencher("queixas", d.queixas || "—");
        preencher("observacoes_triagem", d.observacoes_triagem || "—");

        campoAtendimentoId.value = d.atendimento_id;
        // O CSS mostra o painel quando o endereço termina em #atendimento-atual.
        window.location.hash = "atendimento-atual";
    } catch (erro) {
        console.error("Erro ao carregar a ficha:", erro);
        preencher("status", "Erro ao carregar");
    }
}

carregarFila();
