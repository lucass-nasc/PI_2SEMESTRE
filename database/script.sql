-- ============================================================
-- Sistema de Atendimento de Pronto Socorro (SAPS)
-- Versao para rodar DENTRO do schema BD240226132 ja existente
-- (use esta versao se a faculdade nao permitir CREATE DATABASE)
--
-- Antes de rodar: clique com o botao direito em BD240226132
-- no painel Schemas do Workbench > "Set as Default Schema"
-- ============================================================

-- ------------------------------------------------------------
-- Tabela: paciente
-- Cadastrado na Recepcao, com os dados pessoais do paciente
-- ------------------------------------------------------------
CREATE TABLE paciente (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    nome_completo      VARCHAR(150) NOT NULL,
    cpf               VARCHAR(14)  NOT NULL,
    rg                VARCHAR(20),
    endereco          VARCHAR(200),
    nome_pai          VARCHAR(150),
    nome_mae          VARCHAR(150),
    data_nascimento   DATE NOT NULL,
    criado_em         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (cpf)
);

-- ------------------------------------------------------------
-- Tabela: classificacao_manchester
-- Tabela de apoio com as 5 cores do protocolo de Manchester
-- ------------------------------------------------------------
CREATE TABLE classificacao_manchester (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    cor                 VARCHAR(20) NOT NULL,
    nivel               VARCHAR(30) NOT NULL,
    tempo_max_minutos   INT NOT NULL
);

-- Dados iniciais: as 5 classificacoes do protocolo de Manchester
INSERT INTO classificacao_manchester (cor, nivel, tempo_max_minutos) VALUES
    ('Vermelho', 'Emergencia',       0),
    ('Laranja',  'Muito urgente',    10),
    ('Amarelo',  'Urgente',          60),
    ('Verde',    'Pouco urgente',    120),
    ('Azul',     'Nao urgente',      240);

-- ------------------------------------------------------------
-- Tabela: atendimento
-- Registro central do atendimento, ligado ao paciente
-- ------------------------------------------------------------
CREATE TABLE atendimento (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    numero_atendimento  VARCHAR(10) NOT NULL,
    paciente_id         INT NOT NULL,
    data_hora_chegada   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status              ENUM(
                            'aguardando_triagem',
                            'aguardando_medico',
                            'confirmado',
                            'cancelado'
                        ) NOT NULL DEFAULT 'aguardando_triagem',
    data_confirmacao    DATETIME NULL,
    UNIQUE (numero_atendimento),
    FOREIGN KEY (paciente_id) REFERENCES paciente(id)
);

-- ------------------------------------------------------------
-- Tabela: triagem
-- Preenchida pela enfermagem apos a recepcao
-- ------------------------------------------------------------
CREATE TABLE triagem (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    atendimento_id        INT NOT NULL,
    classificacao_id      INT NOT NULL,
    pressao_arterial      VARCHAR(10),
    temperatura           DECIMAL(4,1),
    batimentos_cardiacos  INT,
    queixas               VARCHAR(255),
    data_hora             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (atendimento_id),
    FOREIGN KEY (atendimento_id) REFERENCES atendimento(id),
    FOREIGN KEY (classificacao_id) REFERENCES classificacao_manchester(id)
);

-- ------------------------------------------------------------
-- Tabela: medicacao
-- Medicacoes lancadas pelo medico durante o atendimento
-- Um atendimento pode ter varias medicacoes
-- ------------------------------------------------------------
CREATE TABLE medicacao (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    atendimento_id    INT NOT NULL,
    nome_medicacao    VARCHAR(150) NOT NULL,
    dosagem           VARCHAR(50),
    data_hora         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (atendimento_id) REFERENCES atendimento(id)
);


-- Ver todas as 5 classificações já cadastradas:
SELECT * FROM classificacao_manchester;

-- Ver atendimentos com nome do paciente (JOIN entre 2 tabelas):
SELECT a.numero_atendimento, p.nome_completo, a.status
FROM atendimento a
JOIN paciente p ON p.id = a.paciente_id;

-- Ver o painel do médico (atendimentos aguardando, ordenados por prioridade):
SELECT a.numero_atendimento, p.nome_completo, cm.cor
FROM atendimento a
JOIN paciente p ON p.id = a.paciente_id
JOIN triagem t ON t.atendimento_id = a.id
JOIN classificacao_manchester cm ON cm.id = t.classificacao_id
WHERE a.status = 'aguardando_medico'
ORDER BY cm.id;