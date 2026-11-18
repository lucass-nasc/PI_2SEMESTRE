const banco = require("./banco");

async function atualizarBanco() {
    try {
        // Esta atualização pode ser repetida. Ela não apaga tabelas nem cadastros.
        const [colunas] = await banco.execute(
            "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paciente' AND COLUMN_NAME = 'rg'",
        );
        if (!colunas.length)
            await banco.query("ALTER TABLE paciente ADD COLUMN rg VARCHAR(20) NULL AFTER cpf");
        await banco.query(`CREATE TABLE IF NOT EXISTS recuperacao_senha (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            token_hash CHAR(64) NOT NULL UNIQUE,
            expira_em DATETIME NOT NULL,
            usado_em DATETIME NULL,
            FOREIGN KEY (usuario_id) REFERENCES usuario(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
        console.log("Banco atualizado: campo RG e recuperação de senha disponíveis.");
    } catch (erro) {
        console.error("Não foi possível atualizar o banco. Código:", erro.code);
        process.exitCode = 1;
    } finally {
        await banco.end();
    }
}

atualizarBanco();
