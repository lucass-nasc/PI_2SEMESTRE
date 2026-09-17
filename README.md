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
| Modelagem e script do banco de dados | 🟡 Em andamento |
| Desenvolvimento do front-end | 🟡 Em andamento |
| Desenvolvimento do back-end | ⏳ Pendente |
| Integração dos módulos | ⏳ Pendente |
| Testes | ⏳ Pendente |
| Preparação da apresentação | ⏳ Pendente |

As atividades detalhadas são acompanhadas no [Trello do Projeto Integrador](https://trello.com/b/6rn6A1Q0/projeto-integrador-2-semestre).

## Estrutura planejada

```text
PI_2SEMESTRE/
├── frontend/
│   ├── inicio/
│   ├── recepcao/
│   ├── triagem/
│   └── medico/
├── backend/
├── database/
│   └── script.sql
├── .gitignore
├── CONTRIBUTING.md
└── README.md
```

As pastas serão adicionadas à `main` conforme os respectivos módulos forem revisados e aprovados.

## Como executar o projeto

### 1. Clonar o repositório

```bash
git clone https://github.com/lucass-nasc/PI_2SEMESTRE.git
cd PI_2SEMESTRE
```

### 2. Preparar o banco de dados

1. Abra o MySQL Workbench;
2. crie um schema para o projeto, por exemplo `saps`;
3. defina esse schema como padrão com **Set as Default Schema**;
4. abra e execute o arquivo `database/script.sql`.

> A aplicação ainda está em desenvolvimento. Os comandos para iniciar o front-end e o back-end serão acrescentados quando os módulos forem integrados ao repositório.

## Como contribuir

As alterações devem ser feitas em uma branch própria e enviadas por Pull Request para a `main`.

Leia o [guia de contribuição](CONTRIBUTING.md) antes de começar uma tarefa.
