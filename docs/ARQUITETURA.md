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
| `listas` | Listas de compras                                                             |
| `itens`  | Itens das listas                                                              |

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
auth  ◀──  familia  ◀──  listas (ListaAcesso)  ◀──  itens
                           ▲                          │
                           └──── ListaService ────────┘ (progresso)
```

`ListaService` precisa do `ItemService` (para calcular o progresso de cada lista) e o
`ItemService` precisa saber se o usuário pode acessar a lista. Se `ItemService` dependesse de
`ListaService`, teríamos uma **dependência circular** (o Spring não conseguiria criar os beans).
Solução: um componente pequeno, `ListaAcesso`, que só responde "este usuário pode acessar esta
lista?". Os dois serviços dependem dele, e o ciclo desaparece.

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
| GET    | `/api/familias/{id}/listas?arquivadas=false`  | Listas com progresso                    | 200     |
| POST   | `/api/familias/{id}/listas`                   | Cria lista                              | 201     |
| GET    | `/api/listas/{id}`                            | Lista com itens (pendentes primeiro)    | 200     |
| PATCH  | `/api/listas/{id}`                            | Renomeia e/ou arquiva                   | 200     |
| DELETE | `/api/listas/{id}`                            | Exclui (itens juntos)                   | 204     |
| POST   | `/api/listas/{id}/itens`                      | Adiciona item                           | 201     |
| DELETE | `/api/listas/{id}/itens/comprados`            | Limpa comprados                         | 204     |
| PATCH  | `/api/itens/{id}`                             | Edita e/ou marca/desmarca comprado      | 200     |
| DELETE | `/api/itens/{id}`                             | Remove item                             | 204     |
| GET    | `/actuator/health`                            | Health check (público)                  | 200     |

Status de erro: **400** validação, **401** sem token/token inválido/credenciais erradas,
**403** membro sem papel de ADMIN, **404** recurso inexistente **ou de outra família**,
**409** conflito (e-mail já cadastrado, último ADMIN saindo).

**PATCH parcial:** campos ausentes (nulos) não são alterados. Para apagar quantidade ou observação
de um item, envia-se string vazia.

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
listas (id, familia_id, nome, arquivada, criada_por → usuarios, criada_em)
    ▲ lista_id (ON DELETE CASCADE)
itens (id, lista_id, nome, quantidade, observacao, comprado,
       comprado_por → usuarios, adicionado_por → usuarios, criado_em, atualizado_em)
```

- **Flyway** versiona o schema (`src/main/resources/db/migration/V1__schema_inicial.sql`). Toda
  mudança futura é um novo arquivo `V2__...sql`. Nunca se edita uma migration já aplicada.
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
  os métodos `GET, POST, PATCH, DELETE, OPTIONS` e os headers `Authorization` e `Content-Type`,
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
- **Atualização otimista** ao marcar um item: a tela muda na hora e a API é chamada em seguida. Se
  a chamada falhar, o estado anterior é restaurado e uma mensagem aparece. No supermercado, com
  sinal ruim, isso faz o app parecer instantâneo.
- **Família atual** guardada no `localStorage`: o app abre direto na última família usada.
- **CSS próprio** com CSS Modules e tokens em `src/styles/tokens.css`. Mobile-first: alvos de
  toque de no mínimo 44 px; a linha inteira do item é o botão de marcar.
- **Design system** (detalhado abaixo): a linguagem visual segue a do EcomSmart (referência de
  produto SaaS), mantendo a paleta, a fonte e o tema deste projeto.

### Design system

A referência foi usada pela **estrutura** (como as telas se organizam), não pela marca. Cores
azul/navy, a fonte Figtree e o tema claro como padrão da referência **não** foram adotados: o
`CLAUDE.md` fixa preto/cinza/roxo, fonte do sistema e tema escuro como padrão, e copiar a
identidade de outra empresa não faria sentido.

- **Tokens em duas camadas.** Primitivos (`--roxo-600`, `--grafite-850`...) são a paleta crua e o
  único lugar com hexadecimal. Semânticos (`--cor-superficie`, `--cor-texto-secundario`...) dizem
  o papel de cada cor. Componentes só usam semânticos; o tema claro apenas remapeia os semânticos.
- **Escalas fixas.** Espaçamento de 4 em 4 px (`--espaco-1` = 4 px até `--espaco-9` = 96 px),
  raios `8/12/16/24/pílula` (campos, cards, painéis, blocos de demonstração, botões), tipografia
  com `clamp()` para títulos crescerem com a tela sem saltos de breakpoint.
- **Elevação mínima.** Cards são planos, só com borda. Sombra apenas no que flutua (modal, demo da
  landing) e um brilho discreto no hover do botão primário.
- **Formas que comunicam.** Botões, chips e navegação em pílula ("isto é uma ação"); campos com
  raio menor e altura de 48 px ("isto recebe texto"). Estado também é indicado por forma, não só
  por cor: ponto nos selos, filete à esquerda em cards atuais/concluídos e erros, barrinha no item
  ativo da navegação.
- **Rótulo em caixa alta acima do título** ("FAMÍLIA", "LISTA DE COMPRAS") dá contexto sem
  ocupar uma linha de texto comum.
- **O dado é o destaque.** A tela da família abre com indicadores (itens a comprar, comprados,
  listas, membros): números grandes e tabulares, o principal em roxo. Sem dado, mostra "—".
- **Navegação.** Desktop (≥ 64 rem): barra lateral escura com a família atual, as seções e a conta
  no rodapé (a lateral é sempre escura, por isso tem tokens próprios de destaque). Celular e
  tablet: topo compacto com a família atual (um toque troca de família) e barra inferior fixa.
  Breadcrumb no desktop; no celular vira um "‹ voltar" no topo da página. Dentro de uma lista, o
  item "Listas" continua ativo.
- **Filtros na URL.** "Ativas / Arquivadas" é um grupo de chips que grava `?ver=arquivadas`:
  recarregar ou compartilhar o link abre a mesma visão.
- **Componentes compartilhados:** `Botao`/`LinkBotao`, `Campo`, `Card`/`CardNumerado`, `Selo`,
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
- **Cores e contraste:** a paleta de referência foi mantida, com dois ajustes para passar no
  contraste AA: o texto branco sobre `#8B5CF6` não atinge 4,5:1, então botões primários usam
  `#7C3AED` (hover `#6D28D9`); links e estado ativo no tema escuro usam `#A78BFA`, que tem mais
  contraste sobre o fundo. `#8B5CF6` ficou como cor do anel de foco.

## 11. Testes

| Onde     | O quê                                                                                   |
| -------- | --------------------------------------------------------------------------------------- |
| Backend  | Integração com PostgreSQL real (Testcontainers): autenticação, famílias, listas, itens, autorização entre famílias (404), validação (400), 401 sem token/token inválido/assinado com outro segredo, CORS, health público |
| Backend  | Unitários (Mockito) das regras de membros: último ADMIN, único membro, permissões         |
| Frontend | Cliente HTTP (ProblemDetail, 401, falha de rede, retry)                                  |
| Frontend | Fluxos com API simulada: login, token expirado, cadastro, criar lista, adicionar e marcar item, rollback otimista |

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
