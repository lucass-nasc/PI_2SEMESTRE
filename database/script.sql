-- ============================================================
-- Sistema de Atendimento de Pronto Socorro (SAPS)
-- Script de criacao das tabelas do banco de dados
-- Versao atualizada em 18/09/2026
-- Compatibilidade: MySQL 8.0
--
-- Antes de executar:
-- 1. Crie ou selecione o schema do projeto no MySQL Workbench.
-- 2. Clique com o botao direito no schema e escolha
--    "Set as Default Schema".
--
-- Este script nao apaga tabelas ou dados existentes.
-- Para testar do zero, utilize um schema vazio.
-- ============================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Tabela: paciente
-- Dados pessoais cadastrados ou localizados pela Recepcao.
-- Um paciente pode possuir varios atendimentos ao longo do tempo.
-- ------------------------------------------------------------
CREATE TABLE paciente (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome_completo       VARCHAR(150) NOT NULL,
    cpf                 VARCHAR(14)  NOT NULL,
    rg                  VARCHAR(20),
    endereco            VARCHAR(200),
    nome_pai            VARCHAR(150),
    nome_mae            VARCHAR(150),
    data_nascimento     DATE NOT NULL,
    criado_em           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_paciente_cpf UNIQUE (cpf)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabela: classificacao_manchester
-- Tabela de apoio com as cinco cores do Protocolo de Manchester.
-- A coluna prioridade evita depender da ordem dos IDs nas consultas.
-- Quanto menor a prioridade, mais urgente e o atendimento.
-- ------------------------------------------------------------
CREATE TABLE classificacao_manchester (
    id                  TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    prioridade          TINYINT UNSIGNED NOT NULL,
    cor                 VARCHAR(20) NOT NULL,
    nivel               VARCHAR(30) NOT NULL,
    tempo_max_minutos   SMALLINT UNSIGNED NOT NULL,

    CONSTRAINT uq_manchester_prioridade UNIQUE (prioridade),
    CONSTRAINT uq_manchester_cor UNIQUE (cor),
    CONSTRAINT ck_manchester_prioridade
        CHECK (prioridade BETWEEN 1 AND 5)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Dados iniciais das classificacoes de Manchester.
INSERT INTO classificacao_manchester
    (id, prioridade, cor, nivel, tempo_max_minutos)
VALUES
    (1, 1, 'Vermelho', 'Emergencia',       0),
    (2, 2, 'Laranja',  'Muito urgente',    10),
    (3, 3, 'Amarelo',  'Urgente',          60),
    (4, 4, 'Verde',    'Pouco urgente',    120),
    (5, 5, 'Azul',     'Nao urgente',      240);

-- ------------------------------------------------------------
-- Tabela: atendimento
-- Representa todo o fluxo, desde a retirada do numero ate a
-- finalizacao pelo medico.
--
-- paciente_id aceita NULL apenas porque o atendimento pode existir
-- antes do cadastro na Recepcao, no estado aguardando_recepcao.
-- O numero exibido (AT0001, AT0002...) e calculado a partir do id
-- pela view vw_atendimento.
-- ------------------------------------------------------------
CREATE TABLE atendimento (
    id                          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    paciente_id                 INT UNSIGNED NULL,
    status                      ENUM(
                                    'aguardando_recepcao',
                                    'aguardando_triagem',
                                    'em_triagem',
                                    'aguardando_medico',
                                    'em_atendimento',
                                    'finalizado',
                                    'cancelado'
                                ) NOT NULL DEFAULT 'aguardando_recepcao',
    data_hora_chegada           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_hora_recepcao          DATETIME NULL,
    data_hora_inicio_medico     DATETIME NULL,
    data_hora_finalizacao       DATETIME NULL,
    motivo_cancelamento         VARCHAR(255) NULL,
    criado_em                   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_atendimento_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES paciente(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_atendimento_status_chegada (status, data_hora_chegada),
    INDEX idx_atendimento_paciente (paciente_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabela: triagem
-- Uma triagem pertence a um unico atendimento.
-- O UNIQUE em atendimento_id garante a relacao 1:1.
-- ------------------------------------------------------------
CREATE TABLE triagem (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    atendimento_id          INT UNSIGNED NOT NULL,
    classificacao_id        TINYINT UNSIGNED NOT NULL,
    pressao_arterial        VARCHAR(10) NOT NULL,
    temperatura             DECIMAL(4,1) NOT NULL,
    batimentos_cardiacos    SMALLINT UNSIGNED NOT NULL,
    queixas                 VARCHAR(500) NOT NULL,
    observacoes             VARCHAR(500) NULL,
    data_hora_inicio        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_hora_fim           DATETIME NULL,

    CONSTRAINT uq_triagem_atendimento UNIQUE (atendimento_id),

    CONSTRAINT fk_triagem_atendimento
        FOREIGN KEY (atendimento_id)
        REFERENCES atendimento(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_triagem_classificacao
        FOREIGN KEY (classificacao_id)
        REFERENCES classificacao_manchester(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT ck_triagem_temperatura
        CHECK (temperatura > 0),
    CONSTRAINT ck_triagem_batimentos
        CHECK (batimentos_cardiacos > 0),

    INDEX idx_triagem_classificacao (classificacao_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabela: medicacao
-- Medicacoes prescritas durante o atendimento medico.
-- Um atendimento pode possuir varias medicacoes.
-- ------------------------------------------------------------
CREATE TABLE medicacao (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    atendimento_id          INT UNSIGNED NOT NULL,
    nome_medicacao          VARCHAR(150) NOT NULL,
    dosagem                 VARCHAR(50) NOT NULL,
    observacoes             VARCHAR(255) NULL,
    data_hora_prescricao    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_medicacao_atendimento
        FOREIGN KEY (atendimento_id)
        REFERENCES atendimento(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    INDEX idx_medicacao_atendimento (atendimento_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- View: vw_atendimento
-- Centraliza o numero formatado do atendimento e permite listar
-- registros que ainda nao possuem um paciente cadastrado.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_atendimento AS
SELECT
    a.id,
    CONCAT('AT', LPAD(CAST(a.id AS CHAR), 4, '0')) AS numero_atendimento,
    a.paciente_id,
    p.nome_completo,
    p.data_nascimento,
    a.status,
    a.data_hora_chegada,
    a.data_hora_recepcao,
    a.data_hora_inicio_medico,
    a.data_hora_finalizacao,
    a.motivo_cancelamento,
    a.atualizado_em
FROM atendimento a
LEFT JOIN paciente p ON p.id = a.paciente_id;

-- ============================================================
-- CONSULTAS PRINCIPAIS DO SISTEMA
-- ============================================================

-- Ver as classificacoes na ordem correta de prioridade.
SELECT
    prioridade,
    cor,
    nivel,
    tempo_max_minutos
FROM classificacao_manchester
ORDER BY prioridade;

-- Numeros dos cards exibidos na tela inicial.
SELECT
    COALESCE(SUM(status = 'aguardando_recepcao'), 0) AS aguardando_recepcao,
    COALESCE(SUM(status = 'aguardando_triagem'), 0)  AS aguardando_triagem,
    COALESCE(SUM(status = 'aguardando_medico'), 0)   AS aguardando_medico,
    COALESCE(SUM(status = 'em_atendimento'), 0)      AS em_atendimento,
    COALESCE(SUM(
        status = 'finalizado'
        AND DATE(data_hora_finalizacao) = CURRENT_DATE
    ), 0) AS atendidos_hoje
FROM atendimento;

-- Listar os atendimentos recentes do dashboard.
SELECT
    numero_atendimento,
    COALESCE(nome_completo, 'Cadastro pendente') AS paciente,
    data_hora_chegada,
    status
FROM vw_atendimento
ORDER BY data_hora_chegada DESC
LIMIT 10;

-- Fila do medico: primeiro a prioridade de Manchester e, em caso
-- de empate, o paciente que terminou a triagem ha mais tempo.
SELECT
    va.id AS atendimento_id,
    va.numero_atendimento,
    va.nome_completo,
    va.data_nascimento,
    cm.cor,
    cm.nivel,
    cm.prioridade,
    cm.tempo_max_minutos,
    t.queixas,
    t.data_hora_fim AS entrada_na_fila,
    TIMESTAMPDIFF(
        MINUTE,
        COALESCE(t.data_hora_fim, t.data_hora_inicio),
        CURRENT_TIMESTAMP
    ) AS minutos_aguardando
FROM vw_atendimento va
JOIN triagem t
    ON t.atendimento_id = va.id
JOIN classificacao_manchester cm
    ON cm.id = t.classificacao_id
WHERE va.status = 'aguardando_medico'
ORDER BY
    cm.prioridade ASC,
    COALESCE(t.data_hora_fim, t.data_hora_inicio) ASC;

-- Ver todas as medicacoes registradas em um atendimento.
-- Substitua 1 pelo id real do atendimento procurado.
SELECT
    va.numero_atendimento,
    m.nome_medicacao,
    m.dosagem,
    m.observacoes,
    m.data_hora_prescricao
FROM medicacao m
JOIN vw_atendimento va ON va.id = m.atendimento_id
WHERE m.atendimento_id = 1
ORDER BY m.data_hora_prescricao;
