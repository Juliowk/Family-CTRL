# Arquitetura do Family Ctrl

Este documento explica **como** o sistema está organizado e, principalmente, **por que** cada
decisão foi tomada. Serve também como material de estudo.

## 1. Visão geral

```
┌────────────────────────────┐         HTTPS + JSON          ┌───────────────────────────┐
│  Frontend (React SPA)      │  Authorization: Bearer <JWT>  │  Backend (Spring Boot)    │
│  GitHub Pages              │ ────────────────────────────▶ │  Heroku (dyno Eco)        │
│  juliowk.github.io         │ ◀──────────────────────────── │  /api/**                  │
└────────────────────────────┘     CORS liberado só p/ Pages └─────────────┬─────────────┘
                                                                           │ JDBC (pool = 5)
                                                               ┌───────────▼─────────────┐
                                                               │ Heroku Postgres         │
                                                               └─────────────────────────┘
```

- **Monorepo**: backend na raiz (o buildpack Java do Heroku procura o `pom.xml` na raiz) e
  frontend em `frontend/`.
- **Duas origens diferentes** (`github.io` e `herokuapp.com`). Isso define boa parte do desenho:
  autenticação por token no header (e não por cookie), CORS obrigatório e CSRF desnecessário.

## 2. Backend: monólito modular

Um único deploy, mas o código é dividido em **módulos** (pacotes) com fronteiras claras. É mais
simples que microsserviços (um banco, um deploy, sem rede entre módulos) e ainda assim organizado.

| Pacote   | Responsabilidade                                                              |
| -------- | ----------------------------------------------------------------------------- |
| `infra`  | Configuração, segurança (JWT, CORS), tratamento global de erros               |
| `auth`   | Cadastro, login, emissão de token, usuário autenticado                        |
| `familia`| Famílias, membros, papéis, convites                                           |
| `categorias` | Categorias de itens por família (ordem, "Outros" fixa)                    |
| `listas` | Listas de compras (o planejamento reutilizável)                               |
| `itens`  | Itens das listas: planejamento e compra em andamento                          |
| `compras`| Finalizar a compra, compras concluídas e resumo do mês                        |

Dentro de cada módulo: **entidade** JPA, **repositório** (Spring Data), **serviço** (regras de
negócio), **controller** REST e **DTOs** (records em `dto/`).

### Regras de convivência entre módulos

1. **Entidades nunca saem pela API.** Controllers recebem e devolvem DTOs (records). Assim o
   formato da API não muda por acidente quando a tabela muda, e campos sensíveis (como
   `senha_hash`) nunca vazam.
2. **Um módulo não usa o repositório de outro**, só o serviço. Ex.: `familia` busca nomes de
   usuários por `UsuarioService.buscarPorIds`, nunca por `UsuarioRepository`.
3. **Entidades referenciam outros módulos só pelo id** (`Long usuarioId`), não por relações JPA
   (`@ManyToOne Usuario`). Isso evita que um módulo carregue entidades de outro e mantém os
   módulos independentes. O custo é fazer consultas "em lote" para montar respostas (feito com
   `findAllById`, uma consulta por tela, sem o problema N+1).
4. **Repositórios, entidades e construtores são package-private** sempre que possível: o Java
   impede que outro pacote os use por engano.

### Dependências entre os módulos

```
auth  ◀──  familia  ◀──  categorias  ◀──  itens  ──▶  listas (ListaAcesso)
                                            ▲              ▲
                         ListaService ──────┘              │
                              ▲                            │
                         compras (CompraService) ──────────┘
```

`ListaService` precisa do `ItemService` (para calcular o progresso de cada lista) e o
`ItemService` precisa saber se o usuário pode acessar a lista. Se `ItemService` dependesse de
`ListaService`, teríamos uma **dependência circular** (o Spring não conseguiria criar os beans).
Solução: um componente pequeno, `ListaAcesso`, que só responde "este usuário pode acessar esta
lista?" (e de qual família ela é). Os dois serviços dependem dele, e o ciclo desaparece.

O mesmo problema apareceria com categorias: `itens` precisa de `categorias` (para validar a
categoria de um item) e excluir uma categoria precisa mover os itens dela para "Outros". Aqui a
solução é um **evento**: `CategoriaService` publica `CategoriaExcluida` e o `ItemService` escuta
(`@EventListener`, na mesma transação). Categorias não conhece itens, e não há ciclo.

A lista de exemplo usa a mesma ideia. Toda família nova ganha a lista **"Exemplo Visual"**
(itens em todas as categorias, alguns já pegos) e um histórico de **15 compras concluídas**, para
quem acabou de chegar ver o que o sistema oferece. Quem cria isso é o módulo `compras`
(`ExemploVisual`), que precisa de listas, itens e categorias; mas é a `FamiliaService` que sabe
quando uma família nasce, e `familia` está na base do grafo (não pode depender de `compras`).
Por isso `FamiliaService.criar` publica `FamiliaCriada` e o `ExemploVisual` escuta, na mesma
transação: se o exemplo falhar, a família não fica criada pela metade.

- Os dados variam entre as compras (itens, quantidades, preços, marcas, mercados e datas, de
  ~7 a 11 dias entre uma ida e outra, a mais recente ontem), mas vêm de um `Random` com semente
  fixa por família: o mesmo exemplo sempre, o que facilita reproduzir um problema.
- Pode ser desligado com `familyctrl.exemplo-visual.ativo=false`. O perfil de teste desliga: as
  famílias dos outros testes começam vazias (e a suíte não grava ~700 linhas a cada família).
  O `ExemploVisualTest` cria o ouvinte ligado na mão para testar o exemplo.
- É uma lista comum: dá para editar, usar ou excluir. As compras concluídas continuam no histórico
  mesmo se a lista for excluída (como qualquer compra).
- **As compras do exemplo não entram no resumo do mês** (gasto, número de compras e última
  compra): quem acaba de chegar veria um "gasto no mês" que não é seu, o que assusta. Elas são
  marcadas com `compras.exemplo = true`, aparecem nas concluídas com o selo "Exemplo · fora do
  resumo do mês" e as consultas do resumo filtram `exemplo = false`. Por que uma coluna e não o
  nome da lista: o usuário pode criar uma lista com o mesmo nome, e as compras dela precisam
  contar normalmente.

## 3. API REST

Prefixo `/api`. Corpo em JSON. Erros em ProblemDetail (seção 7).

| Método | Caminho                                       | Descrição                               | Sucesso |
| ------ | --------------------------------------------- | --------------------------------------- | ------- |
| POST   | `/api/auth/cadastro`                          | Cadastra e já devolve o token           | 201     |
| POST   | `/api/auth/login`                             | Login (`lembrarDeMim` opcional)         | 200     |
| GET    | `/api/auth/me`                                | Usuário autenticado                     | 200     |
| GET    | `/api/familias`                               | Minhas famílias                         | 200     |
| POST   | `/api/familias`                               | Cria família (criador vira ADMIN)       | 201     |
| POST   | `/api/familias/entrar`                        | Entra pelo código de convite            | 200     |
| GET    | `/api/familias/{id}`                          | Detalhe com membros e código            | 200     |
| PATCH  | `/api/familias/{id}`                          | Renomeia (ADMIN)                        | 200     |
| POST   | `/api/familias/{id}/convite`                  | Gera novo código (ADMIN)                | 200     |
| PATCH  | `/api/familias/{id}/membros/{usuarioId}`      | Altera papel (ADMIN)                    | 200     |
| DELETE | `/api/familias/{id}/membros/{usuarioId}`      | Remove membro (ADMIN)                   | 204     |
| POST   | `/api/familias/{id}/sair`                     | Sai da família                          | 204     |
| GET    | `/api/familias/{id}/categorias`               | Categorias na ordem (cria as padrão)    | 200     |
| POST   | `/api/familias/{id}/categorias`               | Cria categoria (antes de "Outros")      | 201     |
| PUT    | `/api/familias/{id}/categorias/ordem`         | Reordena (todos os ids)                 | 200     |
| PATCH  | `/api/categorias/{id}`                        | Renomeia                                | 200     |
| DELETE | `/api/categorias/{id}`                        | Exclui (itens vão para "Outros")        | 204     |
| GET    | `/api/familias/{id}/listas`                   | Listas com total de itens e pegos       | 200     |
| POST   | `/api/familias/{id}/listas`                   | Cria lista                              | 201     |
| POST   | `/api/familias/{id}/listas/importar`          | Cria lista já com itens (CSV importado) | 201     |
| GET    | `/api/listas/{id}`                            | Lista com categorias e itens            | 200     |
| PATCH  | `/api/listas/{id}`                            | Renomeia                                | 200     |
| DELETE | `/api/listas/{id}`                            | Exclui (compras concluídas ficam)       | 204     |
| POST   | `/api/listas/{id}/itens`                      | Planeja item (nome, categoria, qtd.)    | 201     |
| PATCH  | `/api/itens/{id}`                             | Edita o planejamento                    | 200     |
| DELETE | `/api/itens/{id}`                             | Remove item                             | 204     |
| PUT    | `/api/itens/{id}/pego`                        | Marca como pego (qtd., preço, marca)    | 200     |
| DELETE | `/api/itens/{id}/pego`                        | Desmarca e apaga os valores             | 200     |
| POST   | `/api/listas/{id}/itens/extra`                | Item não planejado (já pego)            | 201     |
| POST   | `/api/listas/{id}/desmarcar-todos`            | Desmarca todos da compra em andamento   | 204     |
| POST   | `/api/listas/{id}/compras`                    | Finaliza a compra                       | 201     |
| GET    | `/api/familias/{id}/compras`                  | Compras concluídas                      | 200     |
| GET    | `/api/familias/{id}/compras/resumo?mes=AAAA-MM` | Gasto e compras do mês, última compra | 200     |
| GET    | `/api/compras/{id}`                           | Compra concluída com os itens           | 200     |
| GET    | `/actuator/health`                            | Health check (público)                  | 200     |

Status de erro: **400** validação, **401** sem token/token inválido/credenciais erradas,
**403** membro sem papel de ADMIN, **404** recurso inexistente **ou de outra família**,
**409** conflito (e-mail já cadastrado, último ADMIN saindo).

**PATCH parcial:** campos ausentes (nulos) não são alterados. Para apagar a quantidade desejada
de um item, envia-se string vazia.

**PUT em `/pego`:** marcar como pego é idempotente (repetir a chamada dá o mesmo resultado), por
isso PUT; ele também serve para corrigir quantidade, preço ou marca de um item já pego.

## 4. Modelo de dados

```
usuarios (id, nome, email UNIQUE, senha_hash, criado_em)
    ▲
    │ usuario_id
membros_familia (familia_id, usuario_id, papel ADMIN|MEMBRO, entrou_em)   PK composta
    │ familia_id
    ▼
familias (id, nome, codigo_convite UNIQUE, criado_em)
    ▲ familia_id (ON DELETE CASCADE)
categorias (id, familia_id, nome, ordem, fixa)          UNIQUE (familia_id, lower(nome))
listas (id, familia_id, nome, criada_por → usuarios, criada_em)
    ▲ lista_id (ON DELETE CASCADE)
itens (id, lista_id, categoria_id → categorias, nome, quantidade_planejada, medida UNIDADE|KG,
       -- compra em andamento:
       pego, pego_por → usuarios, pego_em, quantidade_pega numeric(10,3),
       tipo_preco UNIDADE|KG, preco numeric(10,2), marca, extra,
       adicionado_por → usuarios, criado_em, atualizado_em)
compras (id, familia_id, lista_id → listas ON DELETE SET NULL, lista_nome, mercado, data_compra,
         valor_itens, valor_variavel, valor_total, finalizada_por → usuarios, finalizada_em,
         exemplo)
    ▲ compra_id (ON DELETE CASCADE)
compra_itens (id, compra_id, nome, categoria, categoria_ordem, quantidade_planejada, pego,
              quantidade_pega, tipo_preco, preco, subtotal, marca, extra)
```

- **Flyway** versiona o schema (`src/main/resources/db/migration/`). `V1` criou o schema inicial;
  `V2__categorias_e_compras.sql` trouxe categorias, o estado da compra nos itens e as compras
  (movendo os itens existentes para "Outros"). `V3` e `V4` mudaram o significado do "por kg": de
  "preço do quilo" para "preço total pago pelo peso", convertendo os registros (preço do kg × peso).
  Nunca se edita uma migration já aplicada: por isso a V4 corrige a V3 em vez de editá-la.
- **Dinheiro em `numeric(10,2)` e `BigDecimal`**, nunca `double`: ponto flutuante não representa
  centavos com exatidão (0,1 + 0,2 ≠ 0,3). Quantidades em `numeric(10,3)` aceitam pesos como 1,250.
- **`compra_itens` é uma cópia, não uma referência.** A compra guarda nome, categoria e valores
  como estavam no dia: editar a lista, renomear categoria ou excluir a lista não muda o histórico.
- **`ddl-auto=validate`**: o Hibernate não cria nem altera tabelas, só confere se as entidades
  batem com o banco. Se não baterem, a aplicação nem sobe (erro cedo, e não em produção).
- **`ON DELETE CASCADE`**: excluir uma lista exclui os itens; excluir uma família exclui listas e
  itens. Quem garante isso é o banco, sem código extra.
- **Índices** em `membros_familia(usuario_id)`, `listas(familia_id)` e `itens(lista_id)`: são as
  colunas usadas nas buscas mais frequentes.
- **E-mails são gravados em minúsculas** (normalizados no serviço), o que garante unicidade sem
  diferenciar maiúsculas.
- **IDs `bigint` com identity**: simples e suficientes. Como toda rota verifica a permissão, o id
  sequencial não expõe dados de outras famílias.

## 4.1 Fluxo da compra (planejar → comprar → finalizar)

A **lista é o plano**, reutilizável; cada ida ao mercado é uma **compra**.

1. **Planejar** (em casa): itens com nome, categoria, **medida** (por unidade ou por kg,
   obrigatória) e quantidade desejada (opcional). Na tela, agrupados por categoria na ordem
   configurada pela família. A medida é o plano e fica em `itens.medida`; `tipo_preco` é o estado
   da compra em andamento. Ao pegar, o "preço por" começa na medida planejada (dá para trocar no
   mercado); ao desmarcar (ou ao finalizar a compra), `tipo_preco` volta para a medida. Por que
   duas colunas: se o "preço por" trocado no mercado sobrescrevesse a medida, o plano mudaria sem
   ninguém pedir.
2. **Comprar** (no mercado): o checkbox abre um formulário (por unidade: quantidade e preço da
   unidade; por kg: peso e preço total pago; marca; tudo opcional) e o item só fica marcado ao confirmar. O item pego vai para o fim
   da categoria (ordem de `pego_em`). Itens não planejados entram já pegos (`extra = true`). A tela
   soma o **total parcial** (`util/compra.ts`) e mostra quantos itens estão sem preço.
3. **Finalizar**: o usuário informa o **valor final pago** (o total do cupom), o mercado e a
   data, e escolhe quais itens não planejados ficam na lista. O valor final e o **valor variável**
   (itens cujo preço só aparece no caixa, como frutas e verduras) andam juntos:
   final = itens com preço + variável. Dá para digitar qualquer um dos dois e o outro é
   calculado; sem itens sem preço, o final já vem preenchido e uma diferença aparece como
   "diferença no caixa". O final não pode ser menor que o valor dos itens com preço. Numa
   transação, o backend grava a compra (recalculando o valor dos itens com
   `Valores.subtotal`, a mesma regra do front, sem confiar no total enviado), zera a lista e
   remove os extras não mantidos.

**Por que o cálculo existe nos dois lados?** O front calcula para mostrar o total enquanto se
compra, sem ir ao servidor a cada toque. O backend recalcula ao finalizar porque o valor gravado
não pode depender do navegador. As duas implementações têm testes com os mesmos casos
(ex.: 1,255 × R$ 6,90 = R$ 8,66, arredondando meio centavo para cima).

**Por unidade ou por kg.** Por unidade, o subtotal é preço × quantidade (sem quantidade, conta 1).
Por kg, informa-se o peso e o **preço total pago** por ele (ex.: 1 kg por R$ 50,00), que é o
subtotal; o peso fica só como registro. No mercado é mais fácil digitar o valor da etiqueta da
balança do que o preço do quilo. Quando a quantidade planejada tem peso ("2 kg", "500 g"), o
formulário já abre em "Por kg" com o peso em kg.

**Indicadores do mês:** o mês vem da tela (`?mes=2026-10`) porque o servidor roda em UTC e o "mês
atual" é o do usuário.

## 4.2 Compra em vários aparelhos ao mesmo tempo

Duas ou mais pessoas da família podem fazer a mesma compra, cada uma no seu celular, e todas veem
os mesmos itens, quantidades e valores. A garantia tem três partes:

1. **A tela acompanha o servidor.** A tela da lista e a de finalizar buscam a lista de novo a cada
   3 segundos enquanto estão visíveis, ao voltar para o app e ao reconectar (`useLista.ts`). Se a
   busca falha (sem sinal no mercado), a tela continua com os últimos dados e mostra o aviso
   "sem conexão, os valores podem estar desatualizados". Os cards da família atualizam a cada
   10 segundos.
2. **Uma alteração por vez em cada lista.** Toda alteração em itens começa em
   `ListaAcesso.travarParaAlterar`, que trava a linha da lista no banco (`SELECT ... FOR UPDATE`)
   até o fim da transação. Duas pessoas marcando itens no mesmo instante são atendidas uma depois
   da outra, e as duas alterações ficam gravadas.
3. **Ninguém altera o que não viu (controle otimista de versão).** Cada item tem `versao`
   (`@Version` do JPA) e cada lista tem `versao`, que sobe a cada alteração em qualquer item dela.
   A tela envia a versão que está mostrando:
   - ao pegar, corrigir, desmarcar, editar ou remover um item: se outra pessoa alterou o item
     antes, a API responde **409** e nada é gravado. A tela fecha o formulário, busca a lista e
     avisa "Outra pessoa alterou este item agora há pouco";
   - ao **finalizar** e ao **desmarcar todos**: se a lista mudou depois de conferida, 409. Assim
     o total gravado na compra é sempre o total que a pessoa estava vendo.

**Por que buscar periodicamente (polling), e não WebSocket?** Tempo real com WebSocket está fora
do escopo do MVP. Além disso, o dyno Eco dorme e reinicia, o que derruba as conexões abertas. A
busca periódica não precisa de tecnologia nova, funciona em qualquer rede e custa pouco: uma
requisição pequena a cada 3 s por aparelho, e só com a lista aberta. A consistência não depende
dela: mesmo que uma tela esteja alguns segundos atrasada, o controle de versão impede gravar ou
finalizar com base em dados velhos.

**Por que trava pessimista *e* versão?** A trava ordena as gravações simultâneas no servidor. A
versão protege contra o intervalo entre o que a pessoa viu e o momento em que ela confirma. São
problemas diferentes: sem a versão, a segunda pessoa sobrescreveria o preço da primeira sem nunca
tê-lo visto.

**Detalhe do front:** enquanto uma alteração está em andamento, a busca periódica pausa e as
buscas em curso são canceladas. Assim, uma resposta antiga não "desfaz" na tela o que acabou de
ser alterado. Depois da alteração, a lista é buscada de novo para trazer a versão nova.

## 5. Autenticação com JWT

### Fluxo

```
1. POST /api/auth/login {email, senha, lembrarDeMim}
2. Backend confere a senha com BCrypt e emite um JWT assinado (HMAC-SHA256):
      { iss: "family-ctrl", sub: "<id do usuário>", iat, exp }
3. Front guarda o token no localStorage.
4. Cada requisição envia:  Authorization: Bearer <token>
5. O Resource Server do Spring valida assinatura, emissor e expiração, sem consultar o banco.
6. O controller recebe o usuário como parâmetro `UsuarioLogado` (extraído do "sub").
```

- **Por que JWT e não sessão com cookie?** Front e back estão em domínios diferentes. Cookies entre
  domínios são "de terceiros" e os navegadores os bloqueiam cada vez mais. Um token no header
  funciona igual em qualquer domínio.
- **Por que o suporte nativo do Spring (Nimbus)?** O `spring-boot-starter-security-oauth2-resource-server`
  já traz o Nimbus para validar tokens, e o `NimbusJwtEncoder` emite. Não precisamos de biblioteca
  JWT extra (menos dependências, menos memória).
- **HMAC com segredo compartilhado** (`JWT_SECRET`, mínimo de 256 bits). É o mais simples quando
  quem emite e quem valida é a mesma aplicação. A aplicação **se recusa a subir** se o segredo for
  curto (validação em `JwtProperties`).
- **Expiração:** 1 dia por padrão; 7 dias com "lembrar de mim" (`familyctrl.jwt.*`).
- **Stateless** (`SessionCreationPolicy.STATELESS`): o servidor não guarda sessão. Isso combina
  com o Heroku, que reinicia o dyno a qualquer momento: nada se perde.
- **Senhas com BCrypt:** hash lento e com salt, feito para dificultar ataques de força bruta.
  O limite de 72 caracteres na senha existe porque o BCrypt ignora o que passar de 72 bytes.
- **Login com mensagem única** ("E-mail ou senha incorretos"), para não revelar quais e-mails
  estão cadastrados.

### Sem refresh token: a escolha e seus riscos

O MVP usa só um **access token de vida relativamente longa** (1 ou 7 dias). É mais simples: um
endpoint, nenhuma tabela de tokens, nenhuma rotação.

Riscos aceitos:

1. **Token roubado vale até expirar.** Não há como revogar um token específico (o servidor não
   guarda estado). Mitigação: expiração limitada e proteção contra XSS (abaixo). Se virar
   problema, dá para trocar o `JWT_SECRET`, o que invalida **todos** os tokens.
2. **localStorage é legível por JavaScript.** Um ataque XSS conseguiria ler o token. Mitigações:
   - o React escapa todo texto renderizado por padrão;
   - `dangerouslySetInnerHTML` e `innerHTML` são **proibidos pelo ESLint**;
   - **Content-Security-Policy** via `<meta>` no build de produção: scripts só da própria origem
     (sem scripts inline) e requisições só para a própria origem e a URL da API.
3. **Logout só apaga o token no navegador.** Uma cópia do token continuaria válida até expirar.

Evolução natural: access token curto (ex.: 15 min) + refresh token com rotação, guardado no banco
para permitir revogação.

## 6. CORS e CSRF

- **CORS:** o navegador bloqueia chamadas de `juliowk.github.io` para `herokuapp.com`, a não ser que
  a API autorize explicitamente. O backend libera **apenas** as origens de `CORS_ALLOWED_ORIGINS`,
  os métodos `GET, POST, PUT, PATCH, DELETE, OPTIONS` e os headers `Authorization` e `Content-Type`,
  **sem credenciais** (cookies). Em desenvolvimento, `http://localhost:5173`.
- **CSRF desabilitado:** o ataque CSRF funciona porque o navegador envia cookies automaticamente
  para o site-alvo. Como a API não usa cookies (o token vai num header que só o nosso JavaScript
  coloca), não há o que proteger.

## 7. Autorização e erros

- **Toda operação verifica se o usuário é membro da família** dona do recurso (família → lista →
  item). IDs vindos da URL ou do corpo nunca são usados sem essa verificação.
- **Acesso indevido responde 404, não 403.** Um 403 confirmaria que a família/lista existe. Com
  404, quem não é membro não consegue nem descobrir se um id existe.
- **403** só aparece para quem **é** membro mas não tem papel de ADMIN (aí não há nada a esconder).
- **Erros em ProblemDetail (RFC 9457)**, padrão com `type`, `title`, `status` e `detail`. Erros de
  validação trazem também `erros: [{campo, mensagem}]`, que o front usa para mostrar a mensagem
  embaixo do campo certo. Os erros gerados pelos filtros de segurança (401/403), que rodam antes
  do Spring MVC, também saem nesse formato.

### Regras de negócio de membros

- Quem cria a família vira ADMIN.
- O **último ADMIN** não pode sair nem se rebaixar enquanto houver outros membros: precisa
  promover alguém antes (senão a família ficaria sem ninguém para administrá-la).
- Se o **único membro** sai, a família (com listas e itens) é excluída: não sobraria ninguém com
  acesso a ela.
- Remover a si mesmo pela rota de remoção equivale a "sair".
- Entrar numa família em que já se participa não dá erro, só devolve a família (idempotente).
- Código de convite: 8 caracteres de um alfabeto sem caracteres ambíguos (sem 0/O, 1/I/L), gerado
  com `SecureRandom`. Gerar um novo código invalida o anterior.

## 8. Limitações de produção e como foram tratadas

| Limitação                                  | Tratamento                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| Dyno Eco dorme e demora a acordar          | Front "aquece" o servidor ao abrir (`/actuator/health`), timeout de 30 s, até 2 novas tentativas em falha de rede/5xx, aviso "Conectando ao servidor…" após 2,5 s |
| 512 MB de RAM                              | Dependências mínimas (sem lib JWT extra, sem Lombok, sem cache em memória), `open-in-view` desligado |
| Dyno reinicia a qualquer momento           | Nenhum estado em memória: autenticação stateless                          |
| Poucas conexões no Postgres Essential      | `maximum-pool-size=5`, `minimum-idle=1`                                   |
| GitHub Pages só serve arquivos estáticos   | `HashRouter` (rotas depois do `#`), `base: '/Family-CTRL/'` no Vite       |

## 9. Configuração por perfil

| Perfil  | Uso                        | Banco                              | Segredo JWT                       |
| ------- | -------------------------- | ---------------------------------- | --------------------------------- |
| `local` | Desenvolvimento (padrão)   | Docker Compose (`localhost:5432`)  | Valor de desenvolvimento no arquivo (sobrescrevível por `JWT_SECRET`) |
| `test`  | Testes automatizados       | Testcontainers (`@ServiceConnection`) | Valor fixo de teste            |
| `prod`  | Heroku                     | `JDBC_DATABASE_URL/USERNAME/PASSWORD` | `JWT_SECRET` obrigatório       |

- `server.port=${PORT:8080}`: o Heroku escolhe a porta.
- Em prod não há valores padrão para segredos: se faltar variável, a aplicação não sobe (melhor
  falhar no deploy do que rodar inseguro).
- Por que `JDBC_DATABASE_URL` e não `DATABASE_URL`? O Heroku fornece `DATABASE_URL` no formato
  `postgres://user:senha@host/db`, que o driver JDBC não entende. O buildpack Java converte e
  expõe as variáveis `JDBC_DATABASE_*` já no formato certo.

## 10. Frontend

- **React + Vite + TypeScript**, rotas com **HashRouter** (o GitHub Pages não reescreve URLs; com
  o `#`, o servidor sempre entrega o `index.html`).
- **Cliente HTTP único** (`src/api/cliente.ts`): URL base de `VITE_API_URL`, envia o JWT, converte
  ProblemDetail em `ApiError`, trata 401 (limpa o token e volta ao login), aplica timeout.
- **TanStack Query** para cache, carregamento, erro e nova tentativa. As chaves ficam centralizadas
  em `src/estado/chaves.ts`, o que deixa explícito o que invalidar após cada alteração.
- **Atualização otimista** ao desmarcar um item: a tela muda na hora e a API é chamada em
  seguida. Se a chamada falhar, o estado anterior é restaurado e uma mensagem aparece. Marcar não
  é otimista porque passa por um formulário (quantidade, preço, marca) e só vale ao confirmar.
- **Família atual** guardada no `localStorage`: o app abre direto na última família usada.
- **Tela inicial da família ("ctrl") com cards de funcionalidades.** O Family Ctrl terá várias
  funcionalidades além das listas; cada uma é um card. Escolher um card troca a seção dos cards
  pela funcionalidade, na mesma página (sem recarregar nem ir para outra rota). A funcionalidade
  aberta fica na URL (`#/familias/10?ctrl=listas`): o botão "voltar" do navegador fecha a
  funcionalidade, e voltar de uma lista reabre a seção de listas. O item "ctrl" da navegação leva
  à tela sem o parâmetro, ou seja, aos cards. Novas funcionalidades entram no array
  `FUNCIONALIDADES` de `FamiliaInicio.tsx` e no tipo `Funcionalidade` de `rotasFamilia.ts`.
- **CSS próprio** com CSS Modules e tokens em `src/styles/tokens.css`. Mobile-first: alvos de
  toque de no mínimo 44 px; o checkbox de cada item tem 56 px de largura de toque.
- **Design system** (detalhado abaixo): segue a identidade visual própria do Family Ctrl,
  documentada em [`docs/marca.md`](marca.md) (cores, logo, ícones e regras de uso).

### Design system

A **estrutura** das telas (como se organizam) veio de uma referência de produto SaaS. A
**identidade visual** é própria e está em [`docs/marca.md`](marca.md): símbolo da tecla ⌃
(Control, que também é o telhado de uma casa) com três "pontos família", preto e cinzas neutros,
roxo `#7C3AED` como cor de ação e lavanda `#A78BFA` como destaque no escuro.

- **Tema escuro por padrão, claro por escolha.** O escuro é a identidade da marca, por isso não
  seguimos o `prefers-color-scheme` do sistema. O botão de sol/lua (topo, barra lateral e tela
  Conta) grava a escolha do claro no `localStorage` e coloca `data-theme="light"` no `<html>`. O
  `public/tema.js` aplica o tema salvo antes do React carregar, para quem usa o claro não ver a
  tela piscar em escuro. Ele é um arquivo e não um `<script>` inline porque a CSP só permite
  scripts da própria origem.
- **Contraste.** Todos os pares de texto/fundo passam no AA (lavanda sobre preto 7:1, branco sobre
  roxo 5,7:1). A lavanda não tem contraste no fundo claro, então no tema claro o token de
  destaque vira o roxo `#7C3AED`. Verde e âmbar em texto no claro usam tons mais escuros
  (`#15803D`, `#B45309`).
- **Tokens em duas camadas.** Primitivos (`--fc-roxo-600`, `--fc-cinza-900`...) são a paleta crua e
  o único lugar com hexadecimal. Semânticos (`--cor-superficie`, `--cor-texto-secundario`...) dizem
  o papel de cada cor. Componentes só usam semânticos; o tema claro apenas remapeia os semânticos.
  A exceção é o logo (`components/brand/Logo.tsx`), que tem cores oficiais fixas por versão.
- **Fonte Inter** (400 a 700) carregada do Google Fonts, com a pilha do sistema como reserva. A
  CSP libera só `fonts.googleapis.com` (CSS) e `fonts.gstatic.com` (arquivos da fonte).
- **Ícones Lucide** (`lucide-react`), traço 2, 20 px por padrão (16 px em texto pequeno, 24 px na
  barra inferior do celular). O app importa os ícones só por `components/Icones.tsx`, que dá
  nomes em português e esconde os ícones dos leitores de tela; trocar um desenho é mexer só ali.
- **Escalas fixas.** Espaçamento de 4 em 4 px (`--espaco-1` = 4 px até `--espaco-9` = 96 px),
  raios `6/10/16/20/24/pílula` (caixa de seleção, campos e botões, cards, painéis, blocos de
  demonstração, chips e selos), tipografia
  com `clamp()` para títulos crescerem com a tela sem saltos de breakpoint.
- **Elevação mínima, sem gradientes.** Cards são planos, só com borda. Sombra apenas no que
  flutua (modal, demo da landing). O "volume" da marca vem da sombra sólida de tecla
  (`--sombra-tecla`), usada só no botão primário: ao ser pressionado ele desce 2 px e perde a
  sombra, como uma tecla. É o único lugar em que a metáfora do logo vira interação.
- **Formas que comunicam.** Botões com o raio da tecla do logo (10 px), um primário por tela;
  chips e selos em pílula; campos com altura de 48 px ("isto recebe texto"). Estado também é indicado por forma, não só
  por cor: ponto nos selos, filete à esquerda em cards atuais/concluídos e erros, barrinha no item
  ativo da navegação.
- **Rótulo em caixa alta acima do título** ("FAMÍLIA", "LISTA DE COMPRAS") dá contexto sem
  ocupar uma linha de texto comum.
- **O dado é o destaque.** A tela da família abre com indicadores (itens a comprar, comprados,
  listas, membros): números grandes e tabulares, o principal na cor de destaque. Sem dado, mostra "—".
- **Navegação.** Desktop (≥ 64 rem): barra lateral escura com a família atual, as seções e a conta
  no rodapé (a lateral é sempre escura, por isso tem tokens próprios de destaque). Celular e
  tablet: topo compacto com a família atual (um toque troca de família) e barra inferior fixa.
  Breadcrumb no desktop; no celular vira um "‹ voltar" no topo da página. Dentro de uma lista, o
  item "Listas" continua ativo. Sem família escolhida (logo após o login ou na tela "Suas
  famílias") não há listas nem membros para navegar: some a barra lateral/inferior e fica só o
  topo, com o tema e a conta (avatar) no canto superior direito.
- **Filtros e abas na URL.** "Listas / Concluídas" é um grupo de chips que grava
  `?ver=concluidas`, e as abas da lista são rotas (`/listas/:id/planejar` e `/comprar`):
  recarregar ou compartilhar o link abre a mesma visão. Sem aba na URL (`/listas/:id`), a lista
  abre em **Comprar**, o uso principal (no mercado); uma lista recém-criada ou importada abre em
  Planejar, porque ainda precisa de itens ou de revisão. O título da seção continua "Listas" nas
  duas visões: só o conteúdo muda.
- **Abas dentro de card** (`AbasPainel`): "Entrar com código / Criar família" e "Nova lista /
  Importar" são caminhos alternativos para a mesma tarefa, então ficam num único card com
  abas (padrão ARIA, setas trocam de aba) e não mudam a URL. Os painéis ficam montados e só
  escondidos, para trocar de aba não apagar o que foi digitado.
- **Importar lista de CSV.** O usuário cola um texto CSV (`nome;categoria;quantidade;medida`,
  medida `un` ou `kg`; vazia, é deduzida da quantidade: "500 g" e "2 kg" são por kg), muitas
  vezes gerado por uma IA com o prompt que a tela oferece para copiar (já com as categorias da
  família). Por quê ler o CSV no navegador: o resumo ("12 itens prontos", linhas com erro,
  categorias desconhecidas) aparece enquanto se digita, sem ida ao servidor, e a API recebe
  itens estruturados, validados como os adicionados à mão. A categoria é casada pelo nome sem
  diferenciar maiúsculas e acentos; vazia ou desconhecida vai para "Outros". Separador `;`
  recomendado porque quantidades como "1,5 kg" têm vírgula. O endpoint cria lista e itens numa
  transação só: se um item for inválido, nada é criado.
- **Componentes compartilhados:** `Botao`/`LinkBotao`, `Campo`, `Card`, `AbasPainel`, `AreaTexto`, `Selo`,
  `Avatar`, `CabecalhoPagina`, `Indicadores`, `FiltroChips`, `Modal` (folha que sobe de baixo no
  celular, diálogo centralizado no desktop), `Progresso` e os estados `Carregando`, `EstadoVazio`
  (ícone, título, texto e ação) e `MensagemErro` (o que houve e "Tentar de novo").
- **Landing** segue a composição da referência: herói com selo, título grande, CTAs e uma
  demonstração ilustrativa do produto; passos numerados; recursos; bloco de dados (números com
  filete acima); perguntas frequentes; chamada final. Os números citados são fatos do app
  (1 toque, código de 8 caracteres, tela mínima de 320 px), nunca métricas inventadas.
- **Acessibilidade:** rótulos em todos os campos (visíveis ou só para leitores de tela), foco
  visível, `aria-pressed` nos itens, modal com foco preso e Esc para fechar, mensagens com
  `role="alert"`/`role="status"`, respeito a `prefers-reduced-motion`.
- **Cores e contraste:** identidade própria (`docs/marca.md`); os ajustes para contraste AA estão
  na seção "Design system".

## 11. Testes

| Onde     | O quê                                                                                   |
| -------- | --------------------------------------------------------------------------------------- |
| Backend  | Integração com PostgreSQL real (Testcontainers): autenticação, famílias, listas, itens, autorização entre famílias (404), validação (400), 401 sem token/token inválido/assinado com outro segredo, CORS, health público |
| Backend  | Integração: categorias (padrão, ordem, "Outros" fixa, exclusão move itens), compra em andamento (pegar por unidade ou por kg, desmarcar, extras, desmarcar todos), finalizar (cópia, valor recalculado, lista zerada, extras mantidos), resumo do mês, 404 entre famílias em todas as rotas |
| Backend  | Unitários (Mockito) das regras de membros: último ADMIN, único membro, permissões; cálculo do subtotal (`ValoresTest`) |
| Frontend | Cliente HTTP (ProblemDetail, 401, falha de rede, retry)                                  |
| Frontend | Fluxos com API simulada: login, token expirado, cadastro, criar lista, planejar com categoria, pegar pelo formulário com total, desmarcar todos com confirmação, rollback otimista, finalizar com valor variável, tema |
| Frontend | Unitários de `util/compra.ts`: leitura de decimal pt-BR, subtotal (mesmos casos do backend), agrupamento por categoria |

Todos os testes de integração do backend compartilham um único contexto Spring e um único
contêiner, e cada teste cria usuários com e-mails únicos. Por isso não é preciso limpar o banco
entre os testes.

## 12. Decisões e ajustes em relação ao planejamento

- **Starters do Boot 4:** o Spring Boot 4 modularizou os starters. Os nomes usados são
  `spring-boot-starter-webmvc` (não mais `-web`), `spring-boot-starter-flyway` (mais
  `flyway-database-postgresql`) e `spring-boot-starter-security-oauth2-resource-server`, cada um
  com o seu `-test`.
- **ESLint em vez de oxlint:** o template atual do Vite vem com oxlint; foi trocado por
  ESLint + Prettier, como pede o planejamento.
- **`source-map-js` fixado em 1.2.1** (`overrides` no `package.json`): na data da criação do
  projeto, o pacote 1.2.2 constava no registro do npm, mas o arquivo retornava 404, o que quebrava
  o `npm install`. Pode ser removido quando o registro normalizar.
- **Cadastro já devolve o token** (201): o usuário entra direto após criar a conta.
- **CSP só no build:** em desenvolvimento o Vite injeta scripts inline (hot reload), que a política
  bloquearia.
