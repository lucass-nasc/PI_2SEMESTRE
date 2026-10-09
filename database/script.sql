-- SAPS - projeto basico do segundo semestre
-- MySQL 8.0.16 ou superior (CHECK precisa ser aplicado pelo banco).
-- Execute UMA VEZ em um schema NOVO e vazio selecionado no Workbench.
-- Este script nao migra nem apaga um banco existente.
-- Cinco tabelas. Prescricoes/documentos sao descritos, nao emitidos ou executados.

SET NAMES utf8mb4;

CREATE TABLE usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_completo VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil ENUM('recepcionista', 'enfermeiro', 'medico') NOT NULL,
    registro_profissional VARCHAR(30),      -- VER QUESTÃO DA OBRIGATORIEDADE
    ativo BOOLEAN NOT NULL DEFAULT TRUE,    -- ??????????
    UNIQUE (perfil, registro_profissional),
    CONSTRAINT ck_registro_profissional CHECK (
        (perfil = 'recepcionista' AND registro_profissional IS NULL)
        OR (perfil IN ('enfermeiro', 'medico')
            AND registro_profissional IS NOT NULL
            AND CHAR_LENGTH(TRIM(registro_profissional)) > 0)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Medico: CRM; enfermeiro: COREN; recepcionista: NULL.
-- Guardar conselho, UF e numero, por exemplo CRM-SP 123456.
-- O CHECK exige preenchimento; o back-end valida formato e conselho do perfil.
-- senha_hash guarda o hash produzido pelo back-end, nunca a senha em texto puro.
-- E-mail permite identificar a conta para recuperacao. O link de recuperacao
-- precisara de token temporario de uso unico, implementado no back-end depois.

CREATE TABLE paciente (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_completo VARCHAR(150),
    cpf VARCHAR(11) UNIQUE,
    data_nascimento DATE,
    telefone VARCHAR(20),
    endereco VARCHAR(200),
    nome_pai VARCHAR(150),
    nome_mae VARCHAR(150),
    cadastro_completo BOOLEAN NOT NULL DEFAULT FALSE,
    observacao_cadastro VARCHAR(255),
    criado_por INT NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (criado_por) REFERENCES usuario(id),
    CONSTRAINT ck_cadastro_completo CHECK (
        cadastro_completo = FALSE
        OR (nome_completo IS NOT NULL
            AND CHAR_LENGTH(TRIM(nome_completo)) > 0
            AND data_nascimento IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Emergencia: cadastrar apenas o que se sabe e manter cadastro_completo = FALSE.
-- Dados desconhecidos ficam NULL; nao inventar CPF ou nascimento.
-- Depois, completar o MESMO registro. Buscar cadastro existente antes de criar.
-- Para este projeto, nome e nascimento sao o minimo para marcar completo.
-- CPF e demais dados podem nao estar disponiveis, mesmo ao concluir o cadastro.
-- CPF: somente 11 digitos; o back-end valida e converte campo vazio em NULL.

CREATE TABLE atendimento ( -- alterar para prontuário
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    recepcionista_id INT,
    data_hora_chegada DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_hora_recepcao DATETIME,
    data_hora_finalizacao DATETIME,
    status ENUM(
        'aguardando_recepcao', 'em_recepcao',
        'aguardando_triagem', 'em_triagem',
        'aguardando_medico', 'em_atendimento',
        'finalizado', 'cancelado'
    ) NOT NULL DEFAULT 'aguardando_recepcao',
    motivo_cancelamento VARCHAR(255),
    FOREIGN KEY (paciente_id) REFERENCES paciente(id),
    FOREIGN KEY (recepcionista_id) REFERENCES usuario(id),
    CONSTRAINT ck_atendimento_paciente CHECK (
        status IN ('aguardando_recepcao', 'em_recepcao', 'cancelado')
        OR paciente_id IS NOT NULL
    ),
    CONSTRAINT ck_atendimento_finalizado CHECK (
        status <> 'finalizado' OR data_hora_finalizacao IS NOT NULL
    ),
    CONSTRAINT ck_atendimento_cancelado CHECK (
        status <> 'cancelado'
        OR (motivo_cancelamento IS NOT NULL
            AND CHAR_LENGTH(TRIM(motivo_cancelamento)) > 0)
    ),
    INDEX idx_fila (status, data_hora_chegada)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- O id e a senha e o numero de atendimento: 1 aparece como AT0001.
-- Numeracao unica e crescente, sem reinicio diario. Nao gerar com MAX(id)+1.
-- Uma chegada simulada cria o atendimento ainda sem paciente vinculado.
-- Ao cadastrar/localizar o paciente, vincular seu id a esse atendimento.
-- Cadastro provisório pode seguir: cadastro_completo nao bloqueia atendimento.

CREATE TABLE triagem (
    id INT AUTO_INCREMENT PRIMARY KEY,
    atendimento_id INT NOT NULL UNIQUE,
    enfermeiro_id INT NOT NULL,
    classificacao ENUM('vermelho', 'laranja', 'amarelo', 'verde', 'azul') NOT NULL,
    pressao_arterial VARCHAR(15),
    temperatura DECIMAL(4,1),
    batimentos_cardiacos INT,
    queixas TEXT NOT NULL,
    observacoes TEXT,
    data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (atendimento_id) REFERENCES atendimento(id),
    FOREIGN KEY (enfermeiro_id) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Manchester faz parte da triagem, sem tabela separada.
-- A enfermagem informa a classificacao; o sistema apenas ordena a fila.
-- UNIQUE limita o projeto a uma triagem por atendimento.

CREATE TABLE consulta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    atendimento_id INT NOT NULL UNIQUE,
    medico_id INT NOT NULL,
    diagnostico TEXT,
    observacoes TEXT,
    conduta TEXT,
    data_hora_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_hora_finalizacao DATETIME,
    FOREIGN KEY (atendimento_id) REFERENCES atendimento(id),
    FOREIGN KEY (medico_id) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- conduta descreve o resultado: medicacao prescrita, receita, atestado,
-- pedido de exame, encaminhamento e/ou orientacoes. Pode reunir varios itens.
-- TEXT evita um limite curto para a descricao; NULL significa sem registro.
-- Nao ha tabela de medicacao, controle de aplicacao ou emissao de documentos.
-- Confirmacao encerra a consulta e finaliza o atendimento, na mesma transacao.
-- O medico acessa a triagem pelo atendimento_id, sem copiar seus dados.

-- PRONTUARIO: uma consulta de leitura reunindo o historico do paciente.
-- Cada linha representa um atendimento. Nao duplica dados em outra tabela.
CREATE VIEW prontuario AS
SELECT p.id AS paciente_id, p.nome_completo, p.data_nascimento,
       p.cadastro_completo, a.id AS atendimento_id,
       a.data_hora_chegada, a.status, a.data_hora_finalizacao,
       t.id AS triagem_id, t.enfermeiro_id, t.classificacao,
       t.pressao_arterial, t.temperatura, t.batimentos_cardiacos,
       t.queixas, t.observacoes AS observacoes_triagem,
       c.id AS consulta_id, c.medico_id, c.diagnostico,
       c.observacoes AS observacoes_consulta, c.conduta,
       c.data_hora_finalizacao AS data_hora_finalizacao_consulta
FROM paciente p
JOIN atendimento a ON a.paciente_id = p.id
LEFT JOIN triagem t ON t.atendimento_id = a.id
LEFT JOIN consulta c ON c.atendimento_id = a.id;

-- RELACIONAMENTOS PARA O DER (nomes descritivos, em vez de repetir "possui"):
-- Usuario cadastra paciente: usuario 1 -> paciente 0..N; paciente tem 1 autor.
-- Paciente recebe prontuário: paciente 1 -> prontuário 0..N;
--   prontuário tem 0..1 paciente antes do cadastro e 1 apos a recepcao.
-- Recepcionista registra prontuário: usuario 1 -> prontuário 0..N;
--   prontuário tem 0..1 recepcionista antes de ser assumido.
-- Prontuário passa por triagem: prontuário 1 -> triagem 0..1.
-- Enfermeiro realiza triagem: usuario 1 -> triagem 0..N.
-- Prontuário origina consulta: prontuário 1 -> consulta 0..1.
-- Medico realiza consulta: usuario 1 -> consulta 0..N.
-- Prontuario e uma VIEW, nao uma nova entidade armazenada.

-- REGRAS DO BACK-END (nao implementadas somente por estas FKs/CHECKs):
-- 1. Autenticar pelo hash, exigir conta ativa e validar o perfil em cada acao.
--    FKs verificam existencia do usuario, nao se ele e medico/enfermeiro etc.
-- 2. Recepcao consulta e altera dados cadastrais, nao registros clinicos.
-- 3. Impedir alteracao/cancelamento do atendimento apos confirmacao medica.
--    Completar dados cadastrais do paciente e uma operacao separada.
-- 4. Confirmar consulta preenchendo consulta.data_hora_finalizacao e, na mesma transacao,
--    definir atendimento.status = 'finalizado' e data_hora_finalizacao.
-- 5. Chamar a proxima senha em transacao para dois funcionarios nao assumirem
--    o mesmo atendimento. Definir recepcionista, horario e status em_recepcao.
-- 6. Validar transicoes de status e salvar a etapa junto da mudanca de status.
-- 7. Cancelar preserva os registros, com motivo; nao apaga o historico.
-- 8. Desativar contas em vez de apagar profissionais vinculados ao historico.
-- 9. No fluxo normal, exigir triagem antes da consulta. Eventual excecao de
--    emergencia deve ser definida explicitamente, nunca deduzida pelo SQL.

-- CONSULTAS DE EXEMPLO (somente leitura)

-- Fila da recepcao. Formatacao com pelo menos quatro digitos, sem truncar 10000.
SELECT id, CONCAT('AT', LPAD(CAST(id AS CHAR),
       GREATEST(4, CHAR_LENGTH(CAST(id AS CHAR))), '0')) AS senha,
       data_hora_chegada
FROM atendimento
WHERE status = 'aguardando_recepcao'
ORDER BY data_hora_chegada, id;

-- Fila medica: classificacao, depois chegada e id como desempate.
SELECT a.id AS atendimento, p.nome_completo, p.data_nascimento,
       t.classificacao, a.data_hora_chegada
FROM atendimento a
JOIN paciente p ON p.id = a.paciente_id
JOIN triagem t ON t.atendimento_id = a.id
WHERE a.status = 'aguardando_medico'
ORDER BY CASE t.classificacao
    WHEN 'vermelho' THEN 1 WHEN 'laranja' THEN 2 WHEN 'amarelo' THEN 3
    WHEN 'verde' THEN 4 WHEN 'azul' THEN 5 END,
    a.data_hora_chegada, a.id;

-- Cadastros que precisam ser complementados.
SELECT id, nome_completo, observacao_cadastro
FROM paciente WHERE cadastro_completo = FALSE ORDER BY criado_em;

-- Historico de um paciente. Trocar 1 pelo id escolhido no sistema.
SELECT * FROM prontuario WHERE paciente_id = 1
ORDER BY data_hora_chegada DESC, atendimento_id DESC;

-- Cards: estados ausentes no resultado devem aparecer como zero na interface.
SELECT status, COUNT(*) AS quantidade FROM atendimento
WHERE status NOT IN ('finalizado', 'cancelado') GROUP BY status;

SELECT COUNT(*) AS atendidos_hoje FROM atendimento
WHERE status = 'finalizado'
  AND data_hora_finalizacao >= CURRENT_DATE
  AND data_hora_finalizacao < CURRENT_DATE + INTERVAL 1 DAY;

SELECT a.id AS atendimento, p.nome_completo, a.data_hora_chegada, a.status
FROM atendimento a LEFT JOIN paciente p ON p.id = a.paciente_id
ORDER BY a.data_hora_chegada DESC, a.id DESC LIMIT 10;
