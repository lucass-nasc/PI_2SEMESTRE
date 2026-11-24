# SAPS · Sistema de Atendimento de Pronto-Socorro

Projeto Integrador II de Sistemas de Informação — PUC-Campinas, 2º semestre de 2026. O SAPS acompanha um atendimento desde a retirada da senha até o registro da consulta no prontuário. O projeto reúne Programação para Web, Banco de Dados, Engenharia de Software e Estrutura de Dados.

**Estado do projeto:** login, recepção, triagem, consulta médica e disponibilidade da equipe estão integrados na `main`. Há testes automatizados de validação e integração. A preparação da demonstração é acompanhada no [quadro do Trello](https://trello.com/b/6rn6A1Q0/projeto-integrador-2-semestre).

## O que cada perfil faz

| Perfil | Durante o atendimento |
| --- | --- |
| Recepcionista | Gera a senha numerada (`AT0001`, `AT0002`…), chama a próxima, busca um paciente ou faz um cadastro provisório ou completo. Vincula o paciente à senha e encaminha à triagem. Pode consultar, corrigir dados e cancelar conforme as regras do atendimento. |
| Enfermeiro | Assume a triagem, registra queixa, pressão arterial, temperatura e batimentos. A classificação de Manchester fica na própria triagem. Ao concluir, a ficha segue para a fila médica. |
| Médico | Consulta a fila por prioridade de Manchester; em caso de empate, vem primeiro quem chegou antes. Abre a ficha da triagem, assume a consulta, consulta o histórico, registra a avaliação e confirma a finalização. A conduta é opcional: pode descrever medicação, orientação, pedido de exame, receita ou atestado. O sistema não emite documentos nem administra medicamentos. |

O painel da recepção mostra as filas e os atendimentos recentes. Um cadastro provisório pode seguir para a triagem sem inventar dados desconhecidos. A senha identifica o **atendimento**: o mesmo paciente pode voltar em outro dia e receber outro número. Depois da confirmação médica, o atendimento finalizado não pode ser cancelado.

**Funcionários:** cada profissional registra em **Minha situação** se está em plantão, almoço, férias ou folga e informa até quando. Em **Recepção → Funcionários**, a recepção vê as contas ativas e a situação vigente. Quando o prazo termina, a situação aparece como **Não informada**. Isso não bloqueia o login nem muda a prioridade da fila.

**Modelagem do banco:** [MER (conceitual)](database/diagramas/MER.svg) · [DER (tabelas e chaves)](database/diagramas/DER.svg) · [Fluxo da senha ao prontuário](database/diagramas/README.md).

## Como executar no Windows

**Pré-requisitos:** Node.js com npm, MySQL Server em execução e um navegador. Este roteiro usa o Visual Studio Code para abrir o projeto e o MySQL Workbench para preparar o banco.

### 1. Baixe e abra o projeto

No GitHub, selecione a branch `main` e clique em **Code → Download ZIP**. No Windows, clique com o botão direito no ZIP e escolha **Extrair tudo**. No VS Code, use **Arquivo → Abrir Pasta** e selecione a pasta que contém `backend`, `frontend`, `database` e `README.md`.

### 2. Prepare o banco de dados

**Primeira execução em um banco novo:** abra a conexão local no MySQL Workbench. Em uma aba de consulta, execute:

```sql
CREATE DATABASE saps CHARACTER SET utf8mb4;
```

Atualize a lista **SCHEMAS** e dê dois cliques em **saps**. O nome em **negrito** indica que esse é o banco selecionado. Vá em **File → Open SQL Script**, abra [database/script.sql](database/script.sql) da pasta extraída e, sem selecionar nenhuma linha, clique no primeiro raio para executar o arquivo inteiro.

**Se já usa um banco do SAPS com as tabelas criadas**, pule a criação acima. O comando `preparar-banco` do próximo passo acrescenta as estruturas que faltam sem apagar os cadastros existentes.

### 3. Configure o backend

No VS Code, abra **Terminal → Novo Terminal** e use o **PowerShell**. A partir da pasta do projeto, execute:

```powershell
cd backend
npm ci
```

Se ainda não houver um arquivo `.env` em `backend`, crie-o a partir do modelo:

```powershell
Copy-Item .env.example .env
```

Abra `backend/.env` no editor. Preencha `DB_HOST`, `DB_PORT`, `DB_USER` e `DB_PASSWORD` com os dados da sua conexão local do MySQL e coloque o nome do banco em `DB_NAME` (por exemplo, `saps`). Salve o arquivo. Se já tiver um `.env` funcionando, mantenha-o.

No mesmo terminal, execute:

```powershell
npm run preparar-banco
```

### 4. Crie os acessos ao SAPS

Se os funcionários já estão cadastrados nesse banco, siga para o passo 5. No primeiro acesso, crie uma conta por perfil para conseguir demonstrar o fluxo completo:

1. No `backend/.env`, defina `SAPS_SENHA_INICIAL` com a senha que o funcionário usará no site (pelo menos oito caracteres). Salve o arquivo.
2. No terminal da pasta `backend`, execute `npm run cadastrar-usuario`. Informe nome, e-mail e perfil: `recepcionista`, `enfermeiro` ou `medico`. Para enfermagem e medicina, informe o registro no formato solicitado, como `COREN-SP 123456` ou `CRM-SP 123456`.
3. Repita o comando para os demais perfis usando e-mails diferentes. Para definir outra senha inicial, altere e salve o `.env` antes do próximo cadastro. Ao terminar, deixe `SAPS_SENHA_INICIAL=` vazio e salve. As contas criadas continuam no banco.

### 5. Ligue o servidor e abra o site

No terminal da pasta `backend`, execute:

```powershell
npm start
```

Quando aparecer **Servidor disponível em…**, abra o endereço indicado no navegador. Com a configuração padrão, é **[http://127.0.0.1:3000](http://127.0.0.1:3000)**. Entre com o e-mail e a senha do funcionário criado no passo 4. Para acompanhar um paciente do início ao fim, comece pela recepção. Não abra o HTML diretamente nem pelo Live Server: o login e as telas usam o servidor do SAPS.

Deixe o terminal aberto enquanto usar o sistema. Para encerrar, pressione **Ctrl+C**. **Nas próximas vezes**, com o MySQL ligado e a mesma versão já configurada, basta abrir a pasta do projeto, entrar em `backend`, executar `npm start` e acessar o endereço no navegador.

**Esqueci minha senha:** na tela de login, essa opção orienta o funcionário a ligar para o departamento de TI no **ramal 7773**.

## Como o código está dividido

| Camada | Onde está e o que faz |
| --- | --- |
| Cliente (navegador) | [frontend/](frontend/): HTML, CSS e JavaScript das telas. O JS lê os formulários, envia os dados à API e mostra a resposta. O formulário de disponibilidade é compartilhado em [frontend/equipe/](frontend/equipe/). |
| Servidor (Node.js e Express) | [backend/](backend/): recebe requisições, confere sessão e perfil, valida os campos, aplica as regras e consulta o MySQL. O navegador não executa SQL. |
| Dados (MySQL) | [database/script.sql](database/script.sql): seis tabelas — `usuario`, `paciente`, `atendimento`, `triagem`, `consulta` e `disponibilidade_funcionario`. A visão `prontuario` reúne os registros de atendimento, triagem e consulta para consultar o histórico. |

**Exemplo para a banca:** ao pesquisar um paciente, [recepcao.js no cliente](frontend/recepcao/recepcao.js) envia o termo à API. As [rotas da recepção no servidor](backend/recepcao.js) consultam o banco e devolvem os resultados em JSON. Se a consulta não achar ninguém, a tela mostra “Nenhum registro encontrado”. Já um CPF inválido em um cadastro é erro de preenchimento: o [validador do servidor](backend/validacoes.js) rejeita o dado antes da gravação e a tela mostra a mensagem ao funcionário.

## Como verificar

- **Validações:** em `backend`, rode `npm test`. Sem habilitar a integração, os testes de validação rodam e o teste que precisa do banco é ignorado.
- **Integração:** siga o [guia de testes](docs/guia_backend_login_recepcao.md) para configurar o banco temporário. A suíte verifica, entre outros casos, sessão e permissão, dados inválidos, senha de atendimento única, cancelamento, ordem da fila, finalização e orientação de acesso pelo ramal da TI.
- **Demonstração:** acompanhe o mesmo número de atendimento em três sessões: gere e encaminhe na recepção, classifique na enfermagem e finalize como médico. Volte à recepção e confira a situação final. Para demonstrar **Funcionários**, altere **Minha situação** em outra sessão e atualize a lista na recepção.

## Integrantes

| Nome | GitHub |
|---|---|
| Lucas Nascimento | [@lucass-nasc](https://github.com/lucass-nasc) |
| Miguel Trentini | [@MiguelTTortella](https://github.com/MiguelTTortella) |
| Miguel Souza | [@miguelsrmoura12](https://github.com/miguelsrmoura12) |
| Pablo André Valentim | [@pabloandre285](https://github.com/pabloandre285-jpg) |
| William Rocha | [@williamsrocha](https://github.com/williamsrocha) |

**Professor orientador:** Fernando Henrique Carvalho Silva

## Colaboração

O [Trello](https://trello.com/b/6rn6A1Q0/projeto-integrador-2-semestre) acompanha as tarefas. As mudanças no repositório seguem por branch e pull request, conforme o [guia de contribuição](CONTRIBUTING.md). Para consultar a evolução do fluxo: [fila e ficha médica (#12)](https://github.com/lucass-nasc/PI_2SEMESTRE/pull/12), [integração da tela médica (#14)](https://github.com/lucass-nasc/PI_2SEMESTRE/pull/14), [login e recepção (#15)](https://github.com/lucass-nasc/PI_2SEMESTRE/pull/15), [fluxo clínico e prontuário (#16)](https://github.com/lucass-nasc/PI_2SEMESTRE/pull/16) e [disponibilidade dos funcionários (#17)](https://github.com/lucass-nasc/PI_2SEMESTRE/pull/17).
