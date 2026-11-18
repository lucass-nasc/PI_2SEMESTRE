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

## Como executar no Windows

Você precisa de Node.js com npm e do MySQL Server em execução. O MySQL Workbench é a interface para abrir o script e consultar os dados; o serviço do MySQL precisa continuar ligado.

1. Abra a pasta do projeto. **Banco novo:** no Workbench, crie e selecione um schema vazio (por exemplo, `saps`) e execute [database/script.sql](database/script.sql) uma única vez. **Banco existente do SAPS:** preserve as tabelas e os cadastros; use a atualização do passo 3.
2. No terminal do VS Code, entre em `backend` com `cd backend`. Se ainda não tem um arquivo de configuração, execute `Copy-Item .env.example .env`. Abra `.env` e informe os valores da sua instalação: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`. Se já tem um `.env` funcionando, mantenha-o.
3. Na pasta `backend`, execute os comandos abaixo, um por vez:

   ```powershell
   npm ci
   npm run preparar-banco
   npm start
   ```

   O primeiro instala as bibliotecas; o segundo acrescenta estruturas que faltam em versões anteriores sem apagar os registros. O último mantém o servidor ligado. Abra **http://127.0.0.1:3000**. Abra as telas por esse endereço para que o navegador e a API usem a mesma sessão.

### Primeiro acesso e recuperação de senha

O login usa o **e-mail de um funcionário cadastrado**. A conta do MySQL serve apenas para o servidor acessar o banco. Para criar um funcionário:

1. Defina `SAPS_SENHA_INICIAL` no `backend/.env` local. Use uma senha com pelo menos oito caracteres.
2. Em outro terminal, dentro de `backend`, execute `npm run cadastrar-usuario`. Informe nome, e-mail e perfil (`recepcionista`, `enfermeiro` ou `medico`). O médico informa CRM; o enfermeiro, COREN; a recepção não precisa de registro de conselho.
3. Entre com o e-mail e a senha definidos. Retire a senha inicial do `.env` ao terminar os cadastros. O banco guarda o hash da senha. Não publique o `.env` nem as credenciais de demonstração.

**Esqueci minha senha:** o funcionário solicita o link na tela de login. O link expira em 30 minutos e só pode ser usado uma vez. Há duas formas de receber a mensagem:

| Cenário | Como iniciar |
| --- | --- |
| Apresentação local com endereços `@saps.test` | Inicie o Mailpit e use `npm run iniciar:mailpit` **no lugar de** `npm start`. Leia a mensagem em http://127.0.0.1:8025. [Passo a passo para Windows](docs/guia_backend_login_recepcao.md#caixa-local-no-windows). |
| Envio para um e-mail real | Configure o remetente e as variáveis SMTP do provedor no `.env`, confira o endereço do sistema em `APP_URL` e reinicie com `npm start`. |

## Como o código está dividido

| Camada | Onde está e o que faz |
| --- | --- |
| Cliente (navegador) | [frontend/](frontend/): HTML, CSS e JavaScript das telas. O JS lê os formulários, envia os dados à API e mostra a resposta. O formulário de disponibilidade é compartilhado em [frontend/equipe/](frontend/equipe/). |
| Servidor (Node.js e Express) | [backend/](backend/): recebe requisições, confere sessão e perfil, valida os campos, aplica as regras e consulta o MySQL. O navegador não executa SQL. |
| Dados (MySQL) | [database/script.sql](database/script.sql): sete tabelas — `usuario`, `paciente`, `atendimento`, `triagem`, `consulta`, `recuperacao_senha` e `disponibilidade_funcionario`. A visão `prontuario` reúne os registros de atendimento, triagem e consulta para consultar o histórico. |

**Exemplo para a banca:** ao pesquisar um paciente, [recepcao.js no cliente](frontend/recepcao/recepcao.js) envia o termo à API. As [rotas da recepção no servidor](backend/recepcao.js) consultam o banco e devolvem os resultados em JSON. Se a consulta não achar ninguém, a tela mostra “Nenhum registro encontrado”. Já um CPF inválido em um cadastro é erro de preenchimento: o [validador do servidor](backend/validacoes.js) rejeita o dado antes da gravação e a tela mostra a mensagem ao funcionário.

## Como verificar

- **Validações:** em `backend`, rode `npm test`. Sem habilitar a integração, os testes de validação rodam e o teste que precisa do banco é ignorado.
- **Integração:** siga o [guia de testes](docs/guia_backend_login_recepcao.md) para configurar o banco temporário. A suíte verifica, entre outros casos, sessão e permissão, dados inválidos, senha de atendimento única, cancelamento, ordem da fila, finalização e recuperação de senha.
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

O [Trello](https://trello.com/b/6rn6A1Q0/projeto-integrador-2-semestre) acompanha as tarefas. As mudanças no repositório seguem por branch e pull request, conforme o [guia de contribuição](CONTRIBUTING.md). Para consultar a evolução do fluxo: [fila e ficha médica (#12)](https://github.com/lucass-nasc/PI_2SEMESTRE/pull/12), [integração da tela médica (#14)](https://github.com/lucass-nasc/PI_2SEMESTRE/pull/14), [login e recepção (#15)](https://github.com/lucass-nasc/PI_2SEMESTRE/pull/15), [fluxo clínico e prontuário (#16)](https://github.com/lucass-nasc/PI_2SEMESTRE/pull/16) e [funcionários e recuperação local (#17)](https://github.com/lucass-nasc/PI_2SEMESTRE/pull/17).
