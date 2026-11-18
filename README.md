# Sistema de Atendimento de Pronto-Socorro (SAPS)

Projeto Integrador II — PUC-Campinas — 2º semestre de 2026.

## Sobre o projeto

O SAPS é um sistema web desenvolvido para organizar o fluxo de atendimento de um pronto-socorro, desde a chegada do paciente à recepção até a finalização do atendimento médico.

O projeto integra os conhecimentos das disciplinas de Programação para Web, Banco de Dados, Processos de Engenharia de Software e Estrutura de Dados e Algoritmos.

## Objetivo

Digitalizar e organizar o atendimento hospitalar de emergência, garantindo que os pacientes sejam atendidos de acordo com a gravidade do quadro clínico, seguindo o Protocolo de Manchester.

## Fluxo de atendimento

### 1. Recepção

- Cadastro e consulta dos dados do paciente;
- geração automática do número de atendimento, como `AT0001`;
- inclusão, alteração, consulta e cancelamento de atendimentos enquanto não finalizados pelo médico;
- encaminhamento do paciente para a triagem.

### 2. Triagem

- Registro da pressão arterial, temperatura e batimentos cardíacos;
- registro das principais queixas;
- classificação de risco segundo o Protocolo de Manchester;
- encaminhamento para a fila de atendimento médico.

### 3. Atendimento médico

- Visualização da fila ordenada pela prioridade de Manchester;
- consulta dos dados do paciente e da triagem;
- registro das medicações;
- confirmação e finalização do atendimento.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Front-end | HTML, CSS e JavaScript |
| Back-end | JavaScript |
| Banco de dados | MySQL |
| Versionamento | Git e GitHub |
| Gestão do projeto | Trello |

## Integrantes

| Nome | GitHub |
|---|---|
| Lucas Nascimento | [@lucass-nasc](https://github.com/lucass-nasc) |
| Miguel Trentini | [@MiguelTTortella](https://github.com/MiguelTTortella) |
| Miguel Souza | [@miguelsrmoura12](https://github.com/miguelsrmoura12) |
| Pablo André Valentim | [@pabloandre285](https://github.com/pabloandre285-jpg) |
| William Rocha | [@williamsrocha](https://github.com/williamsrocha) |

**Professor orientador:** Fernando Henrique Carvalho Silva

## Status do projeto

| Etapa | Situação |
|---|---|
| Levantamento inicial de requisitos | ✅ Concluído |
| Modelagem e script do banco de dados | ✅ Concluído |
| Desenvolvimento do front-end | ✅ Concluído |
| Desenvolvimento do back-end | 🟡 Em andamento |
| Integração dos módulos | 🟡 Em andamento |
| Testes | ⏳ Pendente |
| Preparação da apresentação | ⏳ Pendente |

As atividades detalhadas são acompanhadas no [Trello do Projeto Integrador](https://trello.com/b/6rn6A1Q0/projeto-integrador-2-semestre).



## Organização

- `frontend/login/`: HTML, CSS e JavaScript que rodam no navegador para acesso ao sistema.
- `frontend/recepcao/`: uma página com as seções administrativas e seu JavaScript de cliente.
- `frontend/triagem/` e `frontend/medico/`: telas clínicas; a fila médica usa a API protegida por perfil.
- `backend/`: JavaScript executado pelo Node; autenticação, regras, validações e acesso ao MySQL.
- `database/script.sql`: criação original das tabelas em um schema vazio.
- `docs/guia_backend_login_recepcao.md`: instalação, explicação dos arquivos, testes e roteiro para a banca.

## Como executar

1. Inicie o serviço do MySQL. Se ainda não tem as tabelas, crie um schema vazio no Workbench e execute `database/script.sql` uma única vez.
2. Preserve seu `backend/.env` existente. Se não tiver um, copie `.env.example` para `.env` e preencha os dados da sua conexão.
3. No terminal, dentro de `backend`, execute:

```powershell
npm ci
npm run preparar-banco
npm start
```

Abra **http://127.0.0.1:3000**. O mesmo servidor entrega o frontend e a API; não use Live Server nem abra o HTML pelo arquivo local.

`preparar-banco` adiciona o campo RG e a tabela de recuperação de senha sem apagar registros. Não execute novamente o SQL de criação sobre as tabelas existentes.

Para cadastrar um funcionário, defina `SAPS_SENHA_INICIAL` no `.env` e execute `npm run cadastrar-usuario` em outro terminal dentro de `backend`. Use no login o e-mail e a senha desse funcionário. Não existe usuário/senha padrão no código.

Leia o [guia completo de login e recepção](docs/guia_backend_login_recepcao.md) antes de executar ou integrar os módulos. Ele explica também como rodar `npm test` e os testes opcionais com banco temporário.

## Como contribuir

As alterações devem ser feitas em uma branch própria e enviadas por Pull Request para a `main`.

Leia o [guia de contribuição](CONTRIBUTING.md) antes de começar uma tarefa.
