# Guia do backend — login e recepção

Esta entrega implementa a parte de login e recepção do Lucas. O README do repositório e o descritivo do projeto foram usados como referência. Triagem e consulta médica continuam com o colega: as leituras da fila e da ficha médica já usam a sessão do médico em /api/medico.

## 1. Comece por aqui

1. Extraia o ZIP em uma pasta. Guarde uma cópia da versão anterior.
2. Copie o seu arquivo `backend/.env` da versão anterior para a nova pasta `backend`. Ele não está no ZIP porque contém configurações particulares. Se não tiver esse arquivo, copie `backend/.env.example` e renomeie a cópia para `.env`.
3. Confira `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`. Você pode continuar usando `root` no seu MySQL local, conforme decidiu. Se sua conexão realmente não tem senha, deixe `DB_PASSWORD=` vazio. Não coloque aspas com espaços.
4. Ligue o serviço **MySQL96** no Windows. O Workbench é a ferramenta que acessa o banco; não substitui o serviço MySQL.
5. Abra a pasta do projeto no VS Code. No terminal, entre em `backend` e execute os comandos abaixo, um por vez.

```powershell
cd backend
npm ci
# Apenas se o banco foi criado com o script antigo:
npm run preparar-banco
npm start
```

`npm ci` instala as bibliotecas nas versões do `package-lock.json`. `preparar-banco` atualiza RG, recuperação de senha e a reserva de atendimento clínico; pode ser executado novamente e não apaga cadastros. `npm start` mantém o servidor ligado: deixe o terminal aberto.

Abra **http://127.0.0.1:3000**. Use esse endereço para o projeto inteiro. Abrir o HTML por duplo clique ou pelo Live Server inicia outra origem e não é o modo de executar esta versão.

**Se você ainda não criou as tabelas:** primeiro crie um schema vazio no Workbench, selecione-o e execute `database/script.sql` uma única vez. O script atual já inclui RG, recuperação e reserva clínica; pule o comando `npm run preparar-banco`. Quem já tem as tabelas não deve executar novamente o script inicial.

## 2. Qual usuário e senha usar?

O login exige um funcionário cadastrado na tabela `usuario`, ativo e com senha em hash bcrypt. Um e-mail e uma senha aleatórios não entram. O usuário `root` e a senha do MySQL servem para conectar o servidor ao banco, não para entrar na tela do SAPS.

Para cadastrar um funcionário, abra outro terminal na pasta `backend`:

1. Defina `SAPS_SENHA_INICIAL` no `.env` com a senha que deseja cadastrar. Use pelo menos 8 caracteres; o limite do bcrypt é 72 bytes (acentos podem ocupar mais de um byte).
2. Execute `npm run cadastrar-usuario`.
3. Responda nome, e-mail e perfil: `recepcionista`, `enfermeiro` ou `medico`.
4. Só enfermeiro e médico informam registro: `COREN-SP 123456` ou `CRM-SP 123456`, respectivamente. Recepcionista fica com `NULL` nesse campo.
5. Entre usando o e-mail informado e a senha definida. Remova o valor de `SAPS_SENHA_INICIAL` depois do cadastro se não precisar mais dele.

O cadastro só valida o formato do registro profissional; não consulta o conselho. Não há senha fixa distribuída no código. O arquivo antigo `cadastrar-recepcionista.js` foi mantido como atalho para o cadastro comum, para não quebrar quem usava o comando anterior.

## 3. O que ficou funcionando

- Login com e-mail/senha, sessão, logout e destino por perfil.
- Bloqueio da API e da página de recepção para quem não é recepcionista.
- Recuperação de senha por link temporário, quando o envio de e-mail estiver configurado.
- Painel com contagens e atendimentos recentes lidos do banco.
- Geração automática de número de atendimento: `AT0001`, `AT0002` e assim por diante.
- Fila de chegada, chamada do próximo e uma senha atual por recepcionista.
- Cadastro, busca por nome/CPF e edição dos dados do paciente.
- Cadastro provisório sem inventar dados; cadastro completo exige nome e nascimento.
- Vinculação de paciente existente à senha atual e prevenção de outro atendimento aberto para o mesmo paciente.
- Encaminhamento para `aguardando_triagem`.
- Busca de atendimentos por número/nome, situação e data, com paginação.
- Consulta administrativa e cancelamento com motivo e confirmação, antes da finalização médica.

O botão **Gerar senha** registra a chegada no projeto online. O funcionário não escolhe o número: o banco usa `AUTO_INCREMENT`, e o backend apresenta o ID com `AT` e zeros. Não há robô gerando pacientes sozinho, nem cadastro público de paciente ou integração com totem neste escopo. As senhas não reiniciam diariamente; um número pulado pelo banco não é reutilizado.

A recepção atende pela ordem de chegada. A prioridade Manchester pertence à triagem/fila médica e continua sob responsabilidade do colega. Não foi implementado um cálculo clínico na recepção.

## 4. Cada arquivo tem uma função

| Arquivo | Responsabilidade |
|---|---|
| `frontend/login/login.js` | Interação dos formulários de login e recuperação; envia HTTP e mostra o resultado. |
| `frontend/recepcao/recepcao.js` | Botões, formulários, tabelas e mensagens da recepção. |
| `backend/servidor.js` | Confere banco/configuração e liga o servidor. |
| `backend/app.js` | Configura Express, sessão, proteção, páginas, rotas e tratamento geral de erros. |
| `backend/banco.js` | Abre um conjunto de conexões com MySQL usando o `.env`. |
| `backend/autenticacao.js` | Login, sessão, perfis, logout e recuperação de senha. |
| `backend/recepcao.js` | Regras da recepção e consultas SQL administrativas. |
| `backend/validacoes.js` | Regras reutilizáveis de tipo, formato, tamanho e obrigatoriedade. |
| `backend/enviar-email.js` | Envia o link usando o servidor de e-mail configurado. |
| `backend/cadastrar-usuario.js` | Cadastro de funcionários pelo responsável no terminal. |
| `backend/atualizar-banco.js` | Atualização pequena e repetível do banco existente. |
| `backend/tests/` | Verificação automática das validações e do fluxo de login/recepção. |

**JavaScript do cliente e do servidor estão separados.** Só o backend importa `mysql2`, acessa `.env`, executa SQL e confere a senha. Não há credenciais do banco nos scripts enviados ao navegador. Cada área mantém um HTML, sem criar uma página para cada ação.

## 5. Como explicar uma busca na banca

Exemplo: procurar um paciente por nome.

1. O usuário preenche o formulário em `frontend/recepcao/index.html`.
2. `buscarPacientes`, em `frontend/recepcao/recepcao.js`, usa `URLSearchParams` para montar os parâmetros e chama `consultarServidor`.
3. `fetch` faz um `GET /api/recepcao/pacientes?busca=Ana&pagina=1`.
4. `app.js` passa primeiro pela sessão e pela verificação do perfil. Estar na tela não basta para ter autorização.
5. A rota `/pacientes`, em `backend/recepcao.js`, confere texto e número da página com as funções de `validacoes.js`.
6. O backend consulta o MySQL usando `?` para os valores. O texto digitado é tratado como dado, sem ser colado diretamente no SQL.
7. O servidor devolve JSON com `pacientes`, `total` e `pagina`. JSON é o formato de transporte dos dados, não um banco separado nem um arquivo que precisa ser criado para cada paciente.
8. `preencherTabela` cria as linhas usando `textContent`. Se a lista estiver vazia, aparece **Nenhum registro encontrado**. Buscar algo que não existe não é uma falha do sistema.

Buscar diretamente `/pacientes/999999` sem existir esse ID retorna `404`. Uma busca textual sem resultados retorna `200` com uma lista vazia: são situações diferentes.

## 6. Validação: onde está e como demonstrar

| Entrada ou situação | Regra | Onde conferir |
|---|---|---|
| ID ou página `-1`, `0`, `abc`, `1.5`, `12abc` | Inteiro positivo dentro do limite do banco | `lerId`, em `validacoes.js` |
| Nome `Ana123` | Não aceita números; permite letras acentuadas, espaços e pontuação de nomes | `validarNome` |
| CPF com letras, tamanho incorreto ou dígitos errados | Formato e cálculo dos dígitos verificadores | `validarCpf` |
| CPF já cadastrado | Não cria outro paciente com o mesmo CPF | Restrição `UNIQUE` do banco e tratamento `ER_DUP_ENTRY` em `app.js` |
| Nascimento futuro ou data impossível | Rejeita e não grava | `validarData` |
| Telefone com letras ou negativo | Rejeita; exige DDD e 10/11 números após normalização | `validarPaciente` |
| Cadastro completo sem nome/nascimento | Rejeita | `validarPaciente`; HTML também marca campos obrigatórios |
| Campo maior que o permitido | Rejeita antes de chegar ao banco | `lerTexto` |
| Senha errada, usuário ausente ou inativo | Não cria sessão; mesma mensagem para os três casos | Rota `/login`, em `autenticacao.js` |
| Funcionário de outro perfil | Não acessa a API da recepção | `exigirPerfil` |
| Cancelamento sem motivo/confirmar | Rejeita | Rota `/atendimentos/:id/cancelar` |
| Atendimento finalizado/confirmado | Não cancela | Mesma rota e leitura da confirmação na tabela `consulta` |
| Falha na conexão HTTP | Mensagem na tela, sem fingir sucesso | `consultarServidor` e `enviarFormulario` no frontend |

CPF, telefone, RG e registro profissional são identificadores, não quantidades. CPF e telefone ficam como texto para preservar zeros; RG pode ter letras. Não faria sentido transformar todo campo com dígitos em `type="number"`.

A validação do HTML ajuda a pessoa a preencher; a validação do backend é obrigatória porque alguém pode enviar uma requisição sem usar o formulário. O banco ainda garante chaves, vínculos e unicidade.

### O que significam os blocos do código?

- `async` e `await`: permitem aguardar a resposta do banco/HTTP antes de usar o resultado.
- `try`: tenta executar a operação. `catch`: trata a falha. `finally`: libera recursos mesmo quando acontece um erro.
- `beginTransaction`: começa um grupo de alterações. `commit`: confirma o grupo. `rollback`: desfaz o grupo se algo falhar. Ao salvar paciente e encaminhar, ambos precisam dar certo.
- `FOR UPDATE`: reserva o registro durante a transação. Evita duas chamadas assumirem a mesma senha.
- `module.exports` e `require`: permitem dividir o código em arquivos e usar uma função em outro arquivo.
- `resposta.json`: devolve dados ao frontend. `resposta.status`: define o resultado HTTP.
- `tokenFormulario`: protege os pedidos que alteram dados, vinculando-os à sessão que abriu o formulário. Não é a senha do usuário.

Erros de preenchimento usam `400`; ausência de login, `401`; falta de permissão, `403`; registro inexistente, `404`; conflito, `409`; excesso de tentativas, `429`; indisponibilidade de e-mail, `503`. Erros inesperados recebem uma mensagem geral, sem mostrar SQL ou senha ao usuário. O terminal mostra o código técnico para investigação.

## 7. Recuperação de senha

O código está pronto, mas o envio real precisa de um servidor de e-mail. Preencha no `.env` os valores fornecidos pelo seu provedor: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` e `EMAIL_REMETENTE`. Reinicie o Node depois de alterar o `.env`.

`APP_URL` é o endereço que será colocado no link. Para testar no mesmo computador use `http://127.0.0.1:3000` e abra o e-mail nesse computador. Esse endereço não abre o SAPS em outro computador ou no celular.

O link dura 30 minutos, tem um token aleatório, e o banco guarda somente seu resumo SHA-256. Usar o link altera o hash da senha e inutiliza os links anteriores. As sessões com a senha antiga deixam de ser aceitas na próxima requisição.

Sem configuração SMTP, o sistema informa que a recuperação está indisponível. Não mostra um link secreto na tela nem afirma ter enviado um e-mail. O envio a uma caixa postal real depende da configuração do seu provedor e deve ser conferido localmente.

## 8. Integração clínica

A recepção encaminha o atendimento para a enfermagem. As rotas em `backend/rotas/fluxo-clinico.js` reservam a ficha para um profissional, validam o preenchimento e registram a conclusão em transação. A enfermagem escolhe a classificação; o médico recebe a fila ordenada e a ficha da triagem. A leitura do histórico usa a view `prontuario`.

Os botões das telas clínicas estão em `frontend/clinico/atendimento.js`. A apresentação da ficha e das linhas da fila médica permanece em `frontend/medico/fila.js`. O README contém o roteiro para testar com os três perfis.

## 9. Testes e demonstração

Dentro de `backend`, execute `npm test`. Isso roda as validações sem precisar do MySQL; o teste de integração aparece como ignorado até ser habilitado.

Para testar o fluxo completo no seu MySQL, informe uma conta que possa criar e remover **o banco temporário de teste**. O teste gera um nome aleatório `saps_teste_...`, usa esse banco e o remove ao terminar; não usa `DB_NAME` nem apaga o schema do SAPS. No PowerShell:

```powershell
$env:TESTAR_INTEGRACAO="1"
$env:TESTE_DB_HOST="127.0.0.1"
$env:TESTE_DB_PORT="3306"
$env:TESTE_DB_USER="root"
$env:TESTE_DB_PASSWORD=""
npm test
Remove-Item Env:TESTAR_INTEGRACAO
Remove-Item Env:TESTE_DB_PASSWORD
```

Se a sua conexão tem senha, coloque a senha local no lugar do valor vazio. Não publique esse valor. A verificação de e-mail no teste captura o link dentro do processo; não envia mensagens externas.

Na preparação desta entrega, passaram 22 verificações automatizadas de validação e integração em MariaDB 11.8 compatível com o SQL usado. Também foi exercitado o JavaScript dos formulários em DOM simulado com HTTP, cookies e banco reais. Isso não substitui a conferência visual no seu navegador nem a execução no seu MySQL 9.6.

Roteiro manual: entrar com recepcionista → gerar senha → chamar → cadastrar provisório → salvar → buscar e completar → encaminhar → consultar atendimento. Depois testar uma senha errada, um CPF inválido, busca sem resultado, cancelamento sem motivo e acesso a uma área de outro perfil.

## 10. Se algo não abrir

| Sintoma | O que conferir |
|---|---|
| `Cannot find module ... servidor.js` | O terminal precisa estar em `backend`; use `npm start` ali. |
| `ECONNREFUSED` ao iniciar | Serviço MySQL96 ligado, host e porta corretos. |
| `ER_ACCESS_DENIED_ERROR` | Usuário/senha do MySQL no `.env`. |
| `ER_BAD_DB_ERROR` | Nome do schema em `DB_NAME`. |
| `ER_BAD_FIELD_ERROR` ou `ER_NO_SUCH_TABLE` | Tabelas originais criadas e `npm run preparar-banco` executado. |
| `EADDRINUSE` | Outro Node já está usando a porta; pare o processo anterior com Ctrl+C. |
| “Formulário expirado” | Atualize a página para criar/obter a sessão novamente. |
| Login não reconhece o cadastro | Use o e-mail do funcionário e a senha cadastrada em hash; não use o login do MySQL. |

As sessões ficam na memória para a apresentação local. Reiniciar o servidor encerra os logins, mas os pacientes e atendimentos continuam no banco. O servidor escuta somente no próprio computador. Publicação na internet exigiria outra configuração, inclusive HTTPS e armazenamento persistente de sessões.

### Caixa local no Windows

1. Pare o SAPS (Ctrl+C). Dentro do backend novo, preserve o seu arquivo .env, rode `npm ci` e `npm run preparar-banco`. A atualização mantém as contas existentes.
2. Baixe o ZIP do [Mailpit para Windows](https://github.com/axllent/mailpit/releases/latest) correspondente ao seu computador (normalmente windows-amd64). Extraia e, no PowerShell aberto na pasta de mailpit.exe, execute:
   ```powershell
   .\mailpit.exe --listen 127.0.0.1:8025 --smtp 127.0.0.1:1025
   ```
3. Deixe esse terminal aberto. Em outro terminal, na pasta backend, execute `npm run iniciar:mailpit`. Não é preciso preencher senha de e-mail. Use APP_URL=http://127.0.0.1:3000 no .env se essa for a porta do SAPS.
4. Abra http://127.0.0.1:3000, clique em **Esqueci minha senha** e informe o e-mail de uma conta ativa, como medico1@saps.test se ela já estiver cadastrada. O SAPS envia o link por SMTP; a caixa de teste captura a mensagem antes que ela saia do computador.
5. Em http://127.0.0.1:8025 abra a mensagem mais recente, siga o link, digite uma nova senha com pelo menos oito caracteres e confirme. Entre no SAPS com a senha nova. O link só vale uma vez por até 30 minutos. A senha anterior deixa de funcionar.
6. Se não chegar mensagem, confira se os dois terminais estão abertos, se o SAPS foi iniciado com iniciar:mailpit e se a conta está ativa nesse banco. Para entrega em e-mail real, use uma conta SAPS com endereço real, configure os dados SMTP do provedor no .env e reinicie com `npm start`. Não compartilhe o .env.

**Funcionários:** no menu de qualquer perfil, use **Minha situação**, escolha a situação atual, informe até quando ela vale e salve. Em outra sessão, entre na recepção e abra **Funcionários**. O botão **Atualizar** consulta o banco imediatamente; enquanto a aba estiver aberta, a lista também atualiza a cada 30 segundos. A informação é operacional: ela não bloqueia o login nem altera a fila dos pacientes.
