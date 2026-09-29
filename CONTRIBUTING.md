# Guia de contribuição

Este documento define o fluxo de trabalho do projeto SAPS.

## Antes de começar

Atualize a branch `main` local:

```bash
git switch main
git pull origin main
```

Crie uma branch a partir da `main`:

```bash
git switch -c feat/nome-da-tarefa
```

## Nomes das branches

Use nomes curtos e relacionados à tarefa:

- `feat/tela-recepcao` — nova funcionalidade;
- `fix/validacao-cpf` — correção;
- `docs/atualizar-readme` — documentação;
- `database/tabela-atendimento` — banco de dados;
- `chore/configuracao-repositorio` — manutenção.

Evite nomes genéricos como `teste`, `nova`, `final` ou nomes de integrantes.

## Commits

Faça commits pequenos e com mensagens claras:

```bash
git add caminho/do/arquivo
git commit -m "feat: cria formulário de cadastro do paciente"
```

Prefixos recomendados:

- `feat:` nova funcionalidade;
- `fix:` correção;
- `docs:` documentação;
- `style:` alteração visual ou de formatação;
- `refactor:` reorganização sem mudança de comportamento;
- `test:` testes;
- `database:` banco de dados;
- `chore:` configuração ou manutenção.

## Pull Request

Envie a branch:

```bash
git push -u origin nome-da-branch
```

Abra um Pull Request direcionado à `main` e:

1. explique o que foi desenvolvido;
2. informe como testar;
3. adicione o link do cartão do Trello;
4. solicite a revisão de outro integrante;
5. resolva os comentários antes do merge.

O autor não deve aprovar o próprio Pull Request. Após uma aprovação, use **Squash and merge** e exclua a branch remota.

## Depois do merge

```bash
git switch main
git pull origin main
git branch -d nome-da-branch
```

## Cuidados

Nunca envie:

- senhas ou credenciais;
- arquivos `.env`;
- a pasta `node_modules`;
- dados pessoais reais de pacientes;
- alterações não relacionadas à tarefa do Pull Request.
