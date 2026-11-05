const bcrypt = require("bcryptjs");
const banco = require("./banco");

async function cadastrarRecepcionista() {
    const nome = "Recepção SAPS";
    const email = "recepcao@saps.local";
    const senha = process.env.SAPS_SENHA_INICIAL;

    try {
        if (!senha) {
            console.error("Defina SAPS_SENHA_INICIAL no arquivo .env antes de cadastrar.");
            process.exitCode = 1;
            return;
        }

        // Confere se essa conta já está cadastrada.
        const [usuarios] = await banco.execute(
            "SELECT id FROM usuario WHERE email = ?",
            [email]
        );

        if (usuarios.length > 0) {
            console.log("Essa conta já existe. Nenhuma alteração foi feita.");
            return;
        }

        const senhaHash = await bcrypt.hash(senha, 12);

        // Recepcionista não tem CRM ou COREN: o registro fica NULL.
        await banco.execute(
            `INSERT INTO usuario (
                nome_completo,
                email,
                senha_hash,
                perfil,
                registro_profissional,
                ativo
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [nome, email, senhaHash, "recepcionista", null, true]
        );

        console.log("Recepcionista cadastrada com sucesso!");
    } catch (erro) {
        console.error("Não foi possível cadastrar a recepcionista.");
        console.error("Código do erro:", erro.code);
    } finally {
        await banco.end();
    }
}

cadastrarRecepcionista();