// Deixo as validações juntas para usar as mesmas regras nas rotas e no cadastro de usuários.
function erroDeValidacao(mensagem, status = 400) {
    const erro = new Error(mensagem);
    erro.status = status;
    erro.operacional = true;
    return erro;
}

function lerTexto(valor, campo, limite, obrigatorio = false) {
    if (valor === undefined || valor === null || valor === "") {
        if (obrigatorio) throw erroDeValidacao(`Informe ${campo}.`);
        return null;
    }
    if (typeof valor !== "string") throw erroDeValidacao(`${campo}: envie um texto.`);
    const texto = valor.trim();
    if (!texto) {
        if (obrigatorio) throw erroDeValidacao(`Informe ${campo}.`);
        return null;
    }
    if (texto.length > limite || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(texto)) {
        throw erroDeValidacao(`${campo}: use até ${limite} caracteres válidos.`);
    }
    return texto;
}

function lerId(valor, campo = "identificador", opcional = false) {
    if (opcional && (valor === "" || valor === undefined || valor === null)) return null;
    // Não uso parseInt: ele transformaria "12abc" em 12 e esconderia o erro.
    if (!["string", "number"].includes(typeof valor) || !/^[1-9]\d*$/.test(String(valor))) {
        throw erroDeValidacao(`${campo}: informe um número inteiro maior que zero.`);
    }
    const numero = Number(valor);
    if (!Number.isSafeInteger(numero) || numero > 2147483647) {
        throw erroDeValidacao(`${campo}: número fora do limite permitido.`);
    }
    return numero;
}

function validarEmail(valor) {
    const email = lerTexto(valor, "o e-mail", 150, true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw erroDeValidacao("Informe um e-mail válido.");
    return email.toLowerCase();
}

function validarSenha(valor, nova = false) {
    // Não retiro espaços da senha: eles também podem fazer parte dela.
    if (typeof valor !== "string" || !valor.trim()) throw erroDeValidacao("Informe a senha.");
    // O bcrypt considera no máximo 72 bytes. Verifico bytes para incluir letras acentuadas.
    if (Buffer.byteLength(valor, "utf8") > 72)
        throw erroDeValidacao("A senha ultrapassa o limite de 72 bytes.");
    if (nova && valor.length < 8)
        throw erroDeValidacao("A nova senha deve ter pelo menos 8 caracteres.");
    return valor;
}

function validarNome(valor, campo, obrigatorio = false) {
    const nome = lerTexto(valor, campo, 150, obrigatorio);
    if (nome && !/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(nome)) {
        throw erroDeValidacao(`${campo}: use letras, espaços, apóstrofos, pontos ou hífens.`);
    }
    return nome;
}

function validarCpf(valor) {
    const original = lerTexto(valor, "CPF", 14);
    if (!original) return null;
    if (!/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(original)) {
        throw erroDeValidacao("CPF: informe 11 números, com ou sem a pontuação padrão.");
    }
    const cpf = original.replace(/[.-]/g, "");
    if (/^(\d)\1{10}$/.test(cpf)) throw erroDeValidacao("CPF inválido.");
    // Calculo os dois dígitos verificadores e comparo com os que foram digitados.
    for (let tamanho = 9; tamanho <= 10; tamanho++) {
        let soma = 0;
        for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i);
        let digito = (soma * 10) % 11;
        if (digito === 10) digito = 0;
        if (digito !== Number(cpf[tamanho])) throw erroDeValidacao("CPF inválido.");
    }
    return cpf;
}

function validarData(valor, campo = "Data", nascimento = false) {
    const texto = lerTexto(valor, campo, 10);
    if (!texto) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) throw erroDeValidacao(`${campo}: data inválida.`);
    const data = new Date(texto + "T12:00:00Z");
    if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== texto) {
        throw erroDeValidacao(`${campo}: data inexistente.`);
    }
    const hoje = new Date();
    const hojeTexto = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    if (texto < "1900-01-01" || (nascimento && texto > hojeTexto)) {
        throw erroDeValidacao(
            `${campo}: use uma data a partir de 1900${nascimento ? " e que não esteja no futuro" : ""}.`,
        );
    }
    return texto;
}

function validarPaciente(dados) {
    if (!dados || typeof dados !== "object" || Array.isArray(dados))
        throw erroDeValidacao("Cadastro inválido.");
    if (!["0", "1", 0, 1].includes(dados.cadastro_completo))
        throw erroDeValidacao("Escolha a situação do cadastro.");
    const completo = Number(dados.cadastro_completo);
    const nome = validarNome(dados.nome_completo, "Nome completo", completo === 1);
    const nascimento = validarData(dados.data_nascimento, "Data de nascimento", true);
    if (completo && !nascimento)
        throw erroDeValidacao("Informe a data de nascimento para completar o cadastro.");
    const rg = lerTexto(dados.rg, "RG", 20);
    // RG é um documento, não uma quantidade: pode ter X e deve preservar zeros à esquerda.
    if (rg && !/^[0-9A-Za-z][0-9A-Za-z. -]*$/.test(rg)) throw erroDeValidacao("RG inválido.");
    const telefoneOriginal = lerTexto(dados.telefone, "Telefone", 20);
    let telefone = null;
    if (telefoneOriginal) {
        if (!/^\+?[0-9() -]+$/.test(telefoneOriginal))
            throw erroDeValidacao("Telefone: não use letras ou valores negativos.");
        telefone = telefoneOriginal.replace(/[+() -]/g, "");
        if (telefone.startsWith("55") && [12, 13].includes(telefone.length))
            telefone = telefone.slice(2);
        if (!/^[1-9]\d{9,10}$/.test(telefone) || telefoneOriginal.startsWith("-"))
            throw erroDeValidacao("Informe um telefone com DDD e 10 ou 11 números.");
    }
    return {
        nome_completo: nome,
        cpf: validarCpf(dados.cpf),
        rg,
        data_nascimento: nascimento,
        telefone,
        endereco: lerTexto(dados.endereco, "Endereço", 200),
        nome_pai: validarNome(dados.nome_pai, "Nome do pai"),
        nome_mae: validarNome(dados.nome_mae, "Nome da mãe"),
        cadastro_completo: completo,
        observacao_cadastro: lerTexto(dados.observacao_cadastro, "Observações", 255),
    };
}

module.exports = {
    erroDeValidacao,
    lerTexto,
    lerId,
    validarEmail,
    validarSenha,
    validarNome,
    validarCpf,
    validarData,
    validarPaciente,
};
