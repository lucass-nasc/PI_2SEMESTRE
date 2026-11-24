## 5. REQUISITOS FUNCIONAIS

Os requisitos funcionais descrevem as ações e os serviços que o SAPS deverá oferecer aos seus usuários. Para facilitar a implementação, a verificação e os testes, os requisitos foram fragmentados em funcionalidades específicas e organizados de acordo com os três atores do sistema: Recepção, Enfermagem e Médico.

### 5.1 Recepção

| Identificador | Nome | Descrição / Regras |
|---|---|---|
| **RF0001** | Cadastro de paciente | O sistema deverá permitir cadastrar um paciente com nome completo, CPF, RG, endereço, nome do pai, nome da mãe e data de nascimento. |
| **RF0002** | Validação do cadastro | O sistema deverá validar o preenchimento dos campos obrigatórios antes de concluir o cadastro do paciente. |
| **RF0003** | Validação de CPF | O sistema deverá impedir o cadastro de pacientes com CPF já registrado. |
| **RF0004** | Localização de paciente | O sistema deverá permitir localizar pacientes cadastrados por meio do CPF. |
| **RF0005** | Abertura de atendimento | O sistema deverá permitir registrar um novo atendimento para um paciente previamente cadastrado. |
| **RF0006** | Geração do número de atendimento | O sistema deverá gerar automaticamente um número sequencial e único para cada atendimento. |
| **RF0007** | Registro de abertura | O sistema deverá registrar a data e o horário de abertura de cada atendimento. |
| **RF0008** | Consulta de atendimentos | O sistema deverá permitir consultar os atendimentos registrados. |
| **RF0009** | Alteração de atendimento | O sistema deverá permitir alterar os dados de um atendimento enquanto ele não tiver sido confirmado pelo médico. |
| **RF0010** | Cancelamento de atendimento | O sistema deverá permitir cancelar um atendimento enquanto ele não tiver sido confirmado pelo médico. |
| **RF0011** | Bloqueio de alteração | O sistema deverá impedir alterações nos dados de atendimentos confirmados pelo médico. |
| **RF0012** | Bloqueio de cancelamento | O sistema deverá impedir o cancelamento de atendimentos confirmados pelo médico. |

### 5.2 Enfermagem (Triagem)

| Identificador | Nome | Descrição / Regras |
|---|---|---|
| **RF0013** | Consulta de atendimentos para triagem | O sistema deverá permitir consultar os atendimentos que aguardam triagem. |
| **RF0014** | Registro de pressão arterial | O sistema deverá permitir registrar a pressão arterial do paciente durante a triagem. |
| **RF0015** | Registro de temperatura | O sistema deverá permitir registrar a temperatura corporal do paciente durante a triagem. |
| **RF0016** | Registro de batimentos cardíacos | O sistema deverá permitir registrar os batimentos cardíacos do paciente durante a triagem. |
| **RF0017** | Registro de queixas | O sistema deverá permitir registrar as principais queixas relatadas pelo paciente. |
| **RF0018** | Seleção da classificação de risco | O sistema deverá permitir selecionar uma das cinco classificações de risco do Protocolo de Manchester: Vermelho, Laranja, Amarelo, Verde ou Azul. |
| **RF0019** | Associação da classificação | O sistema deverá associar a classificação de Manchester selecionada ao atendimento correspondente. |
| **RF0020** | Exibição do tempo máximo de espera | O sistema deverá apresentar o tempo máximo de espera correspondente à classificação selecionada. |
| **RF0021** | Finalização da triagem | O sistema deverá permitir finalizar o registro da triagem de um atendimento. |
| **RF0022** | Atualização do status após triagem | Após a conclusão da triagem, o sistema deverá atualizar o status do atendimento para "aguardando médico". |

### 5.3 Médico

| Identificador | Nome | Descrição / Regras |
|---|---|---|
| **RF0023** | Exibição da fila médica | O sistema deverá exibir os atendimentos que aguardam avaliação médica. |
| **RF0024** | Ordenação por classificação de risco | O sistema deverá ordenar os atendimentos conforme a prioridade da classificação de Manchester, apresentando os casos mais graves primeiro. |
| **RF0025** | Exibição do número de atendimento | O sistema deverá exibir o número do atendimento na fila médica. |
| **RF0026** | Exibição do nome do paciente | O sistema deverá exibir o nome do paciente na fila médica. |
| **RF0027** | Exibição da data de nascimento | O sistema deverá exibir a data de nascimento do paciente na fila médica. |
| **RF0028** | Consulta dos dados de triagem | O sistema deverá permitir ao médico consultar os dados registrados durante a triagem. |
| **RF0029** | Registro de medicação | O sistema deverá permitir registrar uma medicação prescrita durante o atendimento. |
| **RF0030** | Registro do nome da medicação | O sistema deverá permitir informar o nome da medicação prescrita. |
| **RF0031** | Registro da dosagem | O sistema deverá permitir informar a dosagem da medicação prescrita. |
| **RF0032** | Registro da data e horário da prescrição | O sistema deverá registrar a data e o horário da prescrição da medicação. |
| **RF0033** | Múltiplas medicações por atendimento | O sistema deverá permitir registrar mais de uma medicação para o mesmo atendimento. |
| **RF0034** | Confirmação do atendimento | O sistema deverá permitir ao médico confirmar a conclusão do atendimento. |
| **RF0035** | Atualização do status após confirmação | Após a confirmação médica, o sistema deverá atualizar o status do atendimento para "confirmado". |

---

## 6. REQUISITOS NÃO FUNCIONAIS

Os requisitos não funcionais estabelecem critérios de qualidade e restrições técnicas que orientam como o SAPS deverá operar.

| Identificador | Categoria | Descrição / Regras |
|---|---|---|
| **RNF0001** | Disponibilidade | O sistema deverá permanecer disponível durante todo o horário de funcionamento do Pronto Socorro. |
| **RNF0002** | Segurança | O sistema deverá restringir o acesso às funcionalidades conforme o perfil do usuário: Recepção, Enfermagem ou Médico. |
| **RNF0003** | Segurança | O sistema deverá impedir que usuários sem autorização acessem funcionalidades destinadas a outros perfis. |
| **RNF0004** | Desempenho | O sistema deverá executar operações de cadastro, consulta e atualização dentro de um tempo de resposta máximo a ser definido e validado pela equipe. |
| **RNF0005** | Usabilidade | As interfaces deverão apresentar organização simples e intuitiva, facilitando a utilização pelos profissionais de saúde. |
| **RNF0006** | Integridade dos dados | O banco de dados deverá garantir a integridade referencial por meio de chaves primárias e estrangeiras. |
| **RNF0007** | Integridade dos dados | O banco de dados deverá garantir a unicidade dos números de atendimento. |
| **RNF0008** | Integridade dos dados | O banco de dados deverá impedir o registro de CPFs duplicados na tabela de pacientes. |
| **RNF0009** | Portabilidade | O sistema deverá funcionar em diferentes navegadores web compatíveis, sem exigir instalação local. |
| **RNF0010** | Manutenibilidade | O código-fonte deverá ser organizado em módulos, facilitando a manutenção e a evolução do sistema. |

**Observação:** o requisito RNF0004 ainda depende da definição de um limite numérico de tempo de resposta para que possa ser medido objetivamente. O requisito RNF0010 foi incluído como critério de qualidade recomendado e deverá ser validado pela equipe quanto à sua adoção no projeto.
  ----------------------
  \## 7. METODOLOGIA
  APLICADA AO PROJETO

  O desenvolvimento do
  SAPS seguiu a
  Metodologia de
  Aprendizagem Baseada
  em Projetos (PBL, do
  inglês *Project-Based
  Learning*),
  estruturada nas etapas
  propostas pelo
  componente curricular
  Projeto Integrador II:

  \- **Introdução e
  Planejamento:**
  formação da equipe
  (Lucas Nascimento,
  Miguel Trentini,
  Miguel Souza, Pablo
  André Valentim e
  William Rocha),
  apresentação do tema
  pelo professor
  orientador (Sistema de
  Atendimento de Pronto
  Socorro) e
  levantamento inicial
  dos requisitos básicos
  do sistema.

  \- **Coleta:** a
  equipe definiu as
  ferramentas de apoio
  ao desenvolvimento ---
  GitHub para
  versionamento de
  código e Trello para
  gestão das tarefas
  (organizado nas
  colunas Backlog, Em
  andamento, Em teste e
  Concluído) --- e
  estabeleceu a stack do
  projeto: HTML, CSS e
  JavaScript no
  front-end, JavaScript
  no back-end e MySQL no
  banco de dados.

  \-
  **Desenvolvimento:**
  execução gradativa das
  etapas do projeto, com
  modelagem e
  implementação do banco
  de dados, seguida da
  construção das
  interfaces de
  Recepção, Triagem e
  Médico, documentando o
  progresso no README do
  repositório.

  \- **Revisão:**
  reuniões da equipe
  para realinhar
  decisões técnicas ---
  como a mudança da
  tecnologia de back-end
  e a consolidação em um
  único repositório
  oficial --- e
  discussão de pontos de
  modelagem com o
  professor orientador
  (como a decisão de
  representar a
  Classificação de
  Manchester como uma
  tabela própria, e não
  apenas um campo).

  \- **Finalização:**
  etapa planejada para o
  refinamento do
  sistema, os testes do
  fluxo completo, a
  consolidação da
  documentação e a
  preparação da
  apresentação ao
  professor orientador.
  ----------------------

## 8. CRONOGRAMA EXECUTADO

O quadro a seguir consolida o andamento registrado no README, no
repositório GitHub e no Trello em 17 de setembro de 2026. Datas e horas
individuais não foram incluídas porque ainda não há um registro único e
validado dessas informações.

  -----------------------------------------------------------------------
  Frente de trabalho      Situação atual          Evidência do projeto
  ----------------------- ----------------------- -----------------------
  Levantamento inicial de Concluído               Requisitos e fluxo
  requisitos                                      documentados no README

  Definição da tecnologia Concluído               Cartão concluído no
  do back-end                                     Trello; JavaScript
                                                  definido no README

  Modelagem do banco de   Concluído               Cartão concluído no
  dados                                           Trello e estrutura
                                                  relacional definida

  Script SQL              Em andamento            Arquivo
                                                  `database/script.sql`
                                                  presente no GitHub e
                                                  cartão em andamento no
                                                  Trello

  Tela inicial e          Concluído no Trello;    Cartões de HTML, CSS,
  dashboard               integração ao           indicadores e tabela de
                          repositório pendente    atendimentos
                                                  concluídos; arquivos
                                                  ainda não estão na
                                                  branch `main`

  Tela de Recepção ---    Em andamento            Cartão em andamento no
  CRUD de atendimento                             Trello

  Painel de Atendimento   Em andamento            Cartão em andamento no
  do Médico                                       Trello

  Configuração do         Em andamento            Cartão em andamento no
  ambiente de                                     Trello
  desenvolvimento                                 

  Documentação técnica    Em andamento            README, guia de
                                                  contribuição e
                                                  relatório em
                                                  atualização

  Triagem, APIs e         Pendente                Atividades organizadas
  integração dos módulos                          no Backlog

  Testes do fluxo         Pendente                Atividades organizadas
  completo                                        no Backlog; lista "Em
                                                  teste" ainda vazia

  Preparação da           Pendente                Atividades organizadas
  apresentação                                    no Backlog
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 9. MODELAGEM DO BANCO DE DADOS

O banco de dados do SAPS foi modelado de forma relacional, utilizando
MySQL, com 5 tabelas:

-   **paciente** --- dados pessoais coletados na Recepção;
-   **atendimento** --- registro central de cada visita ao Pronto
    Socorro, contendo o número de atendimento e o status do fluxo
    (aguardando_triagem, aguardando_medico, confirmado ou cancelado);
-   **classificacao_manchester** --- tabela de apoio com as cinco
    classificações do protocolo (cor, nível e tempo máximo de espera),
    pré-cadastrada no banco;
-   **triagem** --- dados coletados pela enfermagem, associados a um
    atendimento e a uma classificação de Manchester;
-   **medicacao** --- medicações prescritas pelo médico durante o
    atendimento, podendo haver várias por atendimento.

A tabela `atendimento` conecta as demais: um paciente pode ter vários
atendimentos ao longo do tempo (relação 1:N); cada atendimento tem no
máximo uma triagem (relação 1:1); cada triagem referencia uma
classificação de Manchester (N:1); e cada atendimento pode ter várias
medicações associadas (1:N).

``` mermaid
erDiagram
    PACIENTE ||--o{ ATENDIMENTO : possui
    ATENDIMENTO ||--o| TRIAGEM : recebe
    CLASSIFICACAO_MANCHESTER ||--o{ TRIAGEM : classifica
    ATENDIMENTO ||--o{ MEDICACAO : registra
```

*Figura 1 --- Relacionamentos principais do banco de dados do SAPS,
conforme o script SQL versionado no GitHub.*

------------------------------------------------------------------------

## 10. PROTÓTIPOS

O Trello registra como concluídas a estrutura HTML e a estilização CSS
da tela inicial, além dos cards de indicadores e da tabela de
atendimentos recentes do dashboard. Esses artefatos ainda precisam ser
revisados e integrados à branch `main`. As demais telas permanecem em
desenvolvimento ou no Backlog.

**Tela de Recepção** Está em desenvolvimento um formulário de cadastro
do paciente (nome, CPF, RG, endereço, filiação e data de nascimento),
com geração do número de atendimento. Também está prevista uma listagem
com as opções de consultar, editar ou cancelar atendimentos enquanto não
estiverem confirmados.

**Tela de Triagem** Está planejado um formulário para a enfermagem
informar pressão arterial, temperatura, batimentos cardíacos e queixas
do paciente, além de selecionar a classificação de Manchester entre as
cinco opções pré-cadastradas.

**Painel do Médico** Está em desenvolvimento uma lista dos atendimentos
aguardando consulta, ordenada pela classificação de Manchester, com os
casos mais graves no topo. A etapa seguinte prevê a visualização dos
dados completos, o registro de medicações e a confirmação da conclusão
do atendimento.

------------------------------------------------------------------------

## 11. CONCLUSÃO

Até 17 de setembro de 2026, o projeto concluiu o levantamento inicial de
requisitos, a definição da tecnologia de back-end e a modelagem do banco
de dados. O script SQL está versionado no GitHub e contém as cinco
tabelas, suas restrições e consultas iniciais, mas permanece marcado
como atividade em andamento. O front-end inicial e o dashboard aparecem
como concluídos no Trello, embora seus arquivos ainda não tenham sido
integrados à branch `main`. A Recepção e o Painel do Médico estão em
andamento; Triagem, APIs, integração, testes e apresentação permanecem
pendentes.

### 11.1 Resultados obtidos

-   Requisitos e fluxo de atendimento documentados para Recepção,
    Triagem e Médico;
-   Banco de dados relacional modelado com as entidades `paciente`,
    `atendimento`, `triagem`, `classificacao_manchester` e `medicacao`;
-   Script SQL versionado com chaves primárias, chaves estrangeiras,
    restrições de unicidade, estados do atendimento e dados iniciais das
    cinco classificações de Manchester;
-   Consulta SQL inicial para o painel médico, filtrando atendimentos
    que aguardam o médico e ordenando-os pela prioridade de Manchester;
-   Repositório GitHub organizado com README, guia de contribuição,
    template de Pull Request e proteção da branch `main`;
-   Quadro Trello estruturado em Backlog, Em andamento, Em teste e
    Concluído para acompanhar a execução.

### 11.2 Sugestões de melhorias

-   Implementar notificações automáticas para alertar a equipe médica
    quando um paciente classificado como "Vermelho" (emergência)
    aguardar atendimento;
-   Criar um painel de indicadores (tempo médio de espera por
    classificação, volume de atendimentos por período) para apoiar a
    gestão do Pronto Socorro;
-   Avaliar a integração do sistema com prontuário eletrônico do
    paciente, caso o Pronto Socorro já utilize um.

------------------------------------------------------------------------

## 12. REFERÊNCIAS

GESTÃO DS. **Protocolo de Manchester: o que é e como funciona.** 2025.
Disponível em: https://www.gestaods.com.br/protocolo-de-manchester/.
Acesso em: set. 2026.

HOSPITAIS BRASIL. **Superlotação nos serviços de urgência e emergência
cai 43% em hospitais do SUS.** Disponível em:
https://portalhospitaisbrasil.com.br/superlotacao-nos-servicos-de-urgencia-e-emergencia-cai-43-em-hospitais-do-sus/.
Acesso em: set. 2026.

PORTAL AFYA. **O curioso problema da superlotação nos serviços de
Emergência do Brasil.** Disponível em:
https://portal.afya.com.br/cardiologia/o-curioso-problema-da-superlotacao-nos-servicos-de-emergencia-do-brasil.
Acesso em: set. 2026.

REVISTA REMECS. **Protocolo de triagem de Manchester e seus benefícios
na classificação de risco em urgência e emergência.** 2019. Disponível
em: https://www.revistaremecs.com.br/index.php/remecs/article/view/231.
Acesso em: set. 2026.

TELEMEDICINA MORSCH. **Superlotação nos hospitais: causas, consequências
e possíveis soluções.** 2024. Disponível em:
https://telemedicinamorsch.com.br/blog/superlotacao-nos-hospitais.
Acesso em: set. 2026.

TELEMEDICINA MORSCH. **Protocolo de Manchester: o que é, cores e
classificação.** 2024. Disponível em:
https://telemedicinamorsch.com.br/blog/protocolo-de-manchester. Acesso
em: set. 2026.

TOLIFE. **Protocolo de Manchester em 2025: tudo que você precisa
saber.** 2025. Disponível em:
https://tolife.com.br/protocolo-de-manchester/. Acesso em: set. 2026.
