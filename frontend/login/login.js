// Este JavaScript roda no navegador. Ele só envia dados; quem consulta o banco é o backend.
const formularioLogin = document.querySelector("#formulario-login");
const formularioRecuperacao = document.querySelector("#form-recuperacao");
const formularioRedefinicao = document.querySelector("#form-redefinicao");
const mensagem = document.querySelector("#mensagem-acesso");
let tokenFormulario = "";
let tokenRecuperacao = new URLSearchParams(location.hash.slice(1)).get("redefinir") || "";

function mostrarMensagem(texto, erro = false) {
    mensagem.textContent = texto;
    mensagem.dataset.tipo = erro ? "erro" : "informacao";
    mensagem.hidden = false;
}

function mostrarFormulario(formulario) {
    for (const item of [formularioLogin, formularioRecuperacao, formularioRedefinicao])
        item.hidden = item !== formulario;
    mensagem.hidden = true;
}

async function iniciarLogin() {
    try {
        const resposta = await fetch("/api/sessao");
        if (!resposta.ok) throw new Error("Não foi possível iniciar o login.");
        const dados = await resposta.json();
        tokenFormulario = dados.tokenFormulario;
        if (tokenRecuperacao) {
            mostrarFormulario(formularioRedefinicao);
            // Retiro o token da barra depois de lê-lo. Não o guardo em localStorage.
            history.replaceState(null, "", location.pathname);
        } else if (dados.usuario) {
            location.replace(dados.destino);
        }
    } catch (erro) {
        mostrarMensagem("Não foi possível comunicar com o servidor. Atualize a página.", true);
    }
}

async function enviarFormulario(evento, endereco) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const botao = formulario.querySelector("button[type='submit']");
    if (botao.disabled || !formulario.reportValidity()) return;
    if (!tokenFormulario)
        return mostrarMensagem("Atualize a página para iniciar o formulário.", true);
    const textoOriginal = botao.textContent;
    botao.disabled = true;
    botao.textContent = "Aguarde...";
    try {
        const dados = Object.fromEntries(new FormData(formulario));
        if (formulario === formularioRedefinicao) dados.token = tokenRecuperacao;
        const resposta = await fetch(endereco, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-CSRF-Token": tokenFormulario },
            body: JSON.stringify(dados),
        });
        const resultado = await resposta.json();
        if (!resposta.ok) throw new Error(resultado.mensagem);
        if (resultado.destino) return location.assign(resultado.destino);
        if (formulario === formularioRedefinicao) {
            tokenRecuperacao = "";
            formulario.reset();
            mostrarFormulario(formularioLogin);
        }
        mostrarMensagem(resultado.mensagem);
    } catch (erro) {
        mostrarMensagem(
            erro instanceof TypeError ? "Não foi possível comunicar com o servidor." : erro.message,
            true,
        );
    } finally {
        botao.disabled = false;
        botao.textContent = textoOriginal;
    }
}

formularioLogin.addEventListener("submit", (evento) => enviarFormulario(evento, "/api/login"));
formularioRecuperacao.addEventListener("submit", (evento) =>
    enviarFormulario(evento, "/api/recuperar-senha"),
);
formularioRedefinicao.addEventListener("submit", (evento) =>
    enviarFormulario(evento, "/api/redefinir-senha"),
);
document
    .querySelector("#abrir-recuperacao")
    .addEventListener("click", () => mostrarFormulario(formularioRecuperacao));
for (const botao of document.querySelectorAll(".voltar-login"))
    botao.addEventListener("click", () => mostrarFormulario(formularioLogin));
iniciarLogin();
