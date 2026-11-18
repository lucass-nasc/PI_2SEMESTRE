const { test } = require("node:test");
const assert = require("node:assert/strict");
const { lerId, validarEmail, validarSenha, validarCpf, validarPaciente } = require("../validacoes");

const pacienteBasico = { cadastro_completo: "0" };

test("identificadores rejeitam negativo, zero, letras, decimal e array", () => {
    for (const valor of [-1, 0, "-3", "2abc", "1.5", "1e3", [], {}, "2147483648"]) {
        assert.throws(() => lerId(valor));
    }
    assert.equal(lerId("12"), 12);
});

test("e-mail exige texto e formato válido", () => {
    for (const valor of [null, [], 123, "sem-arroba", "a@@b.com", "a b@c.com"])
        assert.throws(() => validarEmail(valor));
    assert.equal(validarEmail(" Ana@Saps.Local "), "ana@saps.local");
});

test("senha não é cortada nem tem os espaços removidos", () => {
    assert.equal(validarSenha(" senha com espaços ", true), " senha com espaços ");
    for (const senha of ["", "   ", "123", "á".repeat(37)])
        assert.throws(() => validarSenha(senha, true));
});

test("CPF valida os dígitos e rejeita letras antes de normalizar", () => {
    assert.equal(validarCpf("529.982.247-25"), "52998224725");
    for (const cpf of ["11111111111", "52998224724", "529abc98224725", "-52998224725"])
        assert.throws(() => validarCpf(cpf));
});

test("provisório aceita desconhecidos, completo exige nome e nascimento", () => {
    assert.equal(validarPaciente(pacienteBasico).cpf, null);
    assert.throws(() => validarPaciente({ cadastro_completo: "1" }));
    assert.equal(
        validarPaciente({
            cadastro_completo: "1",
            nome_completo: "Ana Souza",
            data_nascimento: "2000-01-01",
        }).cadastro_completo,
        1,
    );
});

test("valida nome, data inexistente, data futura, telefone e campos longos", () => {
    for (const dados of [
        { nome_completo: "Ana123" },
        { data_nascimento: "2025-02-30" },
        { data_nascimento: "2999-01-01" },
        { telefone: "-19999999999" },
        { telefone: "19999abc999" },
        { endereco: "a".repeat(201) },
        { rg: "<script>" },
        { cadastro_completo: "talvez" },
    ])
        assert.throws(() => validarPaciente({ ...pacienteBasico, ...dados }));
    assert.equal(
        validarPaciente({ ...pacienteBasico, telefone: "(19) 99999-9999", rg: "00.123.456-X" }).rg,
        "00.123.456-X",
    );
});
