# SAPS — Recepção

A interface está em `frontend/recepcao/index.html`, com Visão geral, Senhas, Pacientes e Atendimentos. O CSS e a logo ficam na mesma pasta. O login já aponta para essa página.

Navegação e formulários usam somente HTML e CSS. As ações que dependem do servidor permanecem desativadas. Os ícones são importados do Font Awesome 6.4.0 pela internet.

## Para o backend

Reutilize o mesmo formulário para criar e alterar pacientes. Não crie HTMLs por registro. O servidor pode renderizar esta página como template ou, posteriormente, o JavaScript pode atualizar os dados por API.

As rotas nos atributos `action` são sugestões, ainda sem implementação. Habilite os botões somente ao conectar suas operações. Os campos têm atributos `name` para envio ao servidor.

| Elemento | Operação |
| --- | --- |
| `#chamar-proxima` | Assumir a próxima senha em ordem de chegada e definir `em_recepcao` |
| `#form-busca-paciente` | `GET /pacientes/buscar`, com `busca` por nome ou CPF |
| `#carregar-paciente`, `#editar-cadastro-ana` | Carregar o paciente escolhido no formulário existente |
| `#form-paciente` | `POST /pacientes/salvar`, distinguindo criação/alteração por `paciente_id` |
| `#form-filtros` | `GET /atendimentos`, com `busca` e `status` |
| `#form-consulta` | `GET /atendimentos/consultar`, com `atendimento_id` |
| `#alterar-atendimento` | Carregar o atendimento selecionado e seus dados cadastrais para alteração |
| `#form-cancelamento` | `POST /atendimentos/cancelar`, com atendimento, motivo e confirmação |
| `#sair` | Encerrar a sessão e voltar ao login |

Os botões com `type="button"` precisam receber a ação adequada por formulário ou JavaScript futuro. A seleção na tabela, por si só, não carrega dados.

### Cadastro e encaminhamento

- `paciente_id` vazio indica cadastro novo; preenchido indica atualização.
- `atendimento_id` vincula o paciente à senha já emitida.
- `acao=salvar` salva os dados sem avançar a etapa.
- `acao=encaminhar_triagem` salva/vincula o paciente e muda de `em_recepcao` para `aguardando_triagem`, na mesma transação.
- `cadastro_completo=0` permite informações desconhecidas vazias, convertidas em `NULL`.
- `cadastro_completo=1` exige nome e nascimento válidos. Essa obrigatoriedade condicional deve ser validada no servidor.
- CPF: validar dígitos verificadores, normalizar e impedir duplicidade. O padrão HTML de onze dígitos não realiza todas essas verificações.
- `criado_por`, `recepcionista_id`, datas e permissões devem vir da sessão e do servidor.

**RG:** está previsto no escopo RF0001, mas não existe no SQL atual. O formulário o mantém. Antes de persistir, acrescentar `paciente.rg VARCHAR(20)` como coluna opcional em uma migração, ou alinhar a retirada do requisito com o professor.

### Senhas e permissões

O evento de chegada cria o atendimento antes do cadastro e o coloca em `aguardando_recepcao`. A origem dessa chegada deve ser implementada no backend para a apresentação; não há botão de simulação nesta interface.

A senha é o identificador do atendimento formatado: `1` → `AT0001`. Usar o ID gerado pelo banco, nunca `MAX(id)+1`; não reiniciar diariamente nem truncar números maiores que 9999. Ordenar a fila por chegada e ID. A chamada deve ser atômica para impedir que dois recepcionistas assumam a mesma senha.

Validar sessão, perfil, IDs e estado atual em cada ação, dentro da transação de gravação. Bloquear alteração/cancelamento de atendimento confirmado pelo médico ou finalizado. Cancelamento exige motivo e preserva o histórico. Completar cadastro não reabre atendimento nem altera ficha clínica. Usar consultas parametrizadas e proteção contra CSRF.

A recepção não edita sinais vitais, classificação ou conduta médica. O backend deve calcular os indicadores e substituir as listas fixas por registros reais, incluindo estados vazios e mensagens de resultado de cada operação.

## Verificação da revisão

Conferidos os quatro destinos do menu, IDs, rótulos dos campos, referências locais e a retirada dos textos e blocos solicitados. A revisão atual não inclui testes de backend.
