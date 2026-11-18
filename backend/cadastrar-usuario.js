const readline = require("node:readline/promises");
const bcrypt = require("bcryptjs");
const banco = require("./banco");
const { validarEmail, validarSenha, validarNome, lerTexto } = require("./validacoes");

async function cadastrarUsuario() {
    const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
        // O cadastro de funcionários é feito pelo responsável, no terminal; não é uma página pública.
        const nome = validarNome(await terminal.question("Nome completo: "), "Nome completo", true);
        const email = validarEmail(await terminal.question("E-mail: "));
        const perfil = lerTexto(
            await terminal.question("Perfil (recepcionista, enfermeiro ou medico): "),
            "Perfil",
            20,
            true,
        );
        if (!["recepcionista", "enfermeiro", "medico"].includes(perfil))
            throw new Error("Perfil inválido.");
        let registro = null;
        if (perfil !== "recepcionista") {
            registro = lerTexto(
                await terminal.question("Registro (ex.: CRM-SP 123456 ou COREN-SP 123456): "),
                "Registro",
                30,
                true,
            ).toUpperCase();
            const conselho = perfil === "medico" ? "CRM" : "COREN";
            if (!new RegExp(`^${conselho}-[A-Z]{2} [0-9]{1,12}$`).test(registro))
                throw new Error("Registro inválido para o perfil escolhido.");
            const estados = [
                "AC",
                "AL",
                "AP",
                "AM",
                "BA",
                "CE",
                "DF",
                "ES",
                "GO",
                "MA",
                "MT",
                "MS",
                "MG",
                "PA",
                "PB",
                "PR",
                "PE",
                "PI",
                "RJ",
                "RN",
                "RS",
                "RO",
                "RR",
                "SC",
                "SP",
                "SE",
                "TO",
            ];
            if (!estados.includes(registro.split("-")[1].slice(0, 2)))
                throw new Error("UF do registro inválida.");
        }
        // A senha vem do .env local para não aparecer no código nem nos argumentos do terminal.
        const senha = validarSenha(process.env.SAPS_SENHA_INICIAL, true);
        const hash = await bcrypt.hash(senha, 12);
        await banco.execute(
            "INSERT INTO usuario (nome_completo, email, senha_hash, perfil, registro_profissional, ativo) VALUES (?, ?, ?, ?, ?, TRUE)",
            [nome, email, hash, perfil, registro],
        );
        console.log("Usuário cadastrado.");
    } catch (erro) {
        console.error(
            erro.code === "ER_DUP_ENTRY"
                ? "E-mail ou registro profissional já cadastrado."
                : erro.code
                  ? "Falha no banco: " + erro.code
                  : erro.message,
        );
        process.exitCode = 1;
    } finally {
        terminal.close();
        await banco.end();
    }
}

cadastrarUsuario();
