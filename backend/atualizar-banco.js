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
        // A reserva identifica quem pode concluir uma ficha; NULL libera o profissional.
        const [reserva] = await banco.execute(
            "SHOW COLUMNS FROM atendimento LIKE 'profissional_atual_id'",
        );
        if (!reserva.length)
            await banco.query(
                "ALTER TABLE atendimento ADD COLUMN profissional_atual_id INT NULL UNIQUE, ADD FOREIGN KEY (profissional_atual_id) REFERENCES usuario(id)",
            );
        console.log(
            "Banco atualizado: RG, recuperação de senha e reserva de atendimento disponíveis.",
        );
    } catch (erro) {
        console.error("Não foi possível atualizar o banco. Código:", erro.code);
        process.exitCode = 1;
    } finally {
        await banco.end();
    }
}

atualizarBanco();
