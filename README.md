# Sistema de Atendimento de Pronto Socorro (SAPS)

Projeto Integrador II — PUC-Campinas — 2º Semestre de 2026

## Sobre o Projeto

O SAPS (Sistema de Atendimento de Pronto Socorro) é um sistema web desenvolvido como parte do componente curricular Projeto Integrador II, que tem como objetivo integrar os conhecimentos adquiridos nas disciplinas do semestre: Programação para Web, Banco de Dados, Processos de Engenharia e Estrutura de Dados e Algoritmos.

O sistema tem como finalidade controlar os atendimentos realizados em um Pronto Socorro, desde a chegada do paciente na recepção até sua saída após a alta médica, contemplando as etapas de Recepção, Triagem e Atendimento Médico.

## Objetivo

Digitalizar e organizar o fluxo de atendimento hospitalar de emergência, garantindo que os pacientes sejam atendidos de acordo com a gravidade do seu quadro clínico, seguindo o Protocolo de Manchester, e permitindo o acompanhamento de todo o processo por parte da recepção, enfermagem e corpo médico.

## Processo de Atendimento

O sistema contempla três etapas principais:

### 1. Recepção

- Cadastro do paciente com dados pessoais (nome completo, endereço, RG, CPF, nome do pai, nome da mãe, data de nascimento, etc.)
- Geração automática de número de atendimento (ex: AT0001)
- Inclusão, alteração, consulta e cancelamento de atendimentos (enquanto não confirmados pelo médico)

### 2. Triagem (Enfermagem)

- Registro de sinais vitais: pressão arterial, temperatura corporal, batimentos cardíacos
- Registro das principais queixas do paciente (dor de cabeça, náusea, dor muscular, etc.)
- Classificação de risco conforme o Protocolo de Manchester

### 3. Atendimento Médico

- Acesso ao atendimento e registro de medicações
- Confirmação do atendimento
- Painel de Atendimento: exibe a fila de pacientes ordenada pela classificação de Manchester, com número do atendimento, nome do paciente, data de nascimento e demais dados relevantes

## Funcionalidades por Módulo

### Front-End

- Interface da Recepção — inclusão, alteração, consulta e cancelamento de atendimentos
- Interface da Triagem — registro dos dados coletados pela enfermagem
- Interface do Médico — Painel de Atendimentos + lançamento de medicações e confirmação da consulta

### Back-End

- Integração de todas as interfaces (Recepção, Triagem, Médico)
- Regras de negócio do fluxo de atendimento (classificação, ordenação da fila, status do atendimento)
- Comunicação com o banco de dados

### Banco de Dados

- Modelagem relacional contemplando pacientes, atendimentos, triagens, classificações e medicações
- Estrutura definida pela equipe conforme as necessidades do processo

## Tecnologias Utilizadas

| Camada | Tecnologia |
|---|---|
| Front-end | HTML, CSS, JavaScript |
| Back-end | JavaScript |
| Banco de Dados | MySQL |
| Versionamento | GitHub |
| Gestão do Projeto | Trello |

## Integrantes

| Nome | RA | GitHub |
|------|--------|------|
| Lucas Nascimento | 26006120 | [@lucass-nasc](https://github.com/lucass-nasc) |
| Miguel Trentini | 26011070 | [@MiguelTTortella](https://github.com/MiguelTTortella) |
| Miguel Souza | 26024756 | [@miguelsrmoura12](https://github.com/miguelsrmoura12) |
| Pablo André Valentim | 26006967 | [@pabloandre285](https://github.com/pabloandre285-jpg) |
| William Rocha | 26006208 | [@williamsrocha](https://github.com/williamsrocha) |

**Professor Orientador:** Fernando Henrique Carvalho Silva

## Status do Projeto

Em desenvolvimento — Projeto Integrador II, 2º Semestre de 2026

- [ ] Levantamento de requisitos
- [ ] Modelagem do banco de dados
- [ ] Desenvolvimento do Front-end
- [ ] Desenvolvimento do Back-end
- [ ] Integração
- [ ] Testes
- [ ] Apresentação final

Acompanhamento das tarefas via Trello: *[link do board]*

## Estrutura do Repositório

```
saps/
├── frontend/
│   ├── recepcao/
│   ├── triagem/
│   └── medico/
├── backend/
├── database/
│   └── script.sql
└── README.md
```

## Como Executar o Projeto

```bash
git clone [url-do-repositorio]
```

## Sobre a Disciplina

O componente curricular de Projeto Integrador II tem como objetivo unir os conhecimentos das disciplinas do semestre, promovendo o desenvolvimento de habilidades de planejamento, documentação, apresentação e trabalho em equipe. O professor orientador acompanha a gestão do projeto, sem prestar suporte técnico direto — cabendo à equipe ser auto gerenciável na resolução de dúvidas técnicas.
