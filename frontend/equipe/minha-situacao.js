// Os três perfis usam o mesmo formulário. A relação completa da equipe só aparece na recepção.
(() => {
    const janela = document.querySelector("#janela-situacao");
    const formulario = janela.querySelector("form");
    const aviso = janela.querySelector("[role=status]");
    const salvar = formulario.querySelector("[type=submit]");
    let token = "";

    async function consultar(url, opcoes) {
        const resposta = await fetch(url, opcoes);
        if (resposta.status === 401) {
            location.replace("/login/login.html");
            throw new Error("Sua sessão terminou.");
        }
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.mensagem);
        return dados;
    }

    document.querySelector("#abrir-situacao").addEventListener("click", async () => {
        janela.showModal();
        aviso.textContent = "Carregando…";
        salvar.disabled = true;
        formulario.reset();
        try {
            const sessao = await consultar("/api/sessao");
            token = sessao.tokenFormulario;
            const atual = await consultar("/api/minha-situacao");
            if (atual.situacao) {
                formulario.elements.situacao.value = atual.situacao;
                const fim = new Date(atual.termino);
                // O campo mostra o horário local, mas a API recebe sempre UTC.
                formulario.elements.termino.value =
                    new Date(fim.getTime() - fim.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            }
            aviso.textContent = atual.situacao ? "" : "Você ainda não tem situação vigente.";
            salvar.disabled = false;
        } catch (erro) {
            aviso.textContent = erro.message;
        }
    });

    janela.querySelector("[data-fechar]").addEventListener("click", () => janela.close());
    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        if (salvar.disabled) return;
        salvar.disabled = true;
        try {
            const fim = new Date(formulario.elements.termino.value);
            if (!Number.isFinite(fim.getTime()) || fim.getTime() <= Date.now())
                throw new Error("Informe um término no futuro.");
            await consultar("/api/minha-situacao", {
                method: "PUT",
                headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
                body: JSON.stringify({ situacao: formulario.elements.situacao.value, termino: fim.toISOString() }),
            });
            aviso.textContent = "Situação atualizada.";
            document.dispatchEvent(new Event("situacao-atualizada"));
        } catch (erro) {
            aviso.textContent = erro.message;
        } finally {
            salvar.disabled = false;
        }
    });
})();
