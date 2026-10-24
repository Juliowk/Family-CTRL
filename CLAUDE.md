# Family Ctrl

## Objetivo
Aplicação web de gestão familiar focada em famílias e listas de compras colaborativas.
Projeto de aprendizado de backend e peça de portfólio, com repositório público no GitHub.
Sucesso significa uma aplicação bem estruturada, documentada, responsiva e em produção.

## Meta da primeira sessão: MVP completo em produção
Na primeira sessão, entregue um MVP funcional de ponta a ponta, pronto para deploy
(backend no Heroku, frontend no GitHub Pages), com o máximo de funcionalidades do escopo abaixo
implementadas, testadas e funcionando. Priorize funcionalidade completa e estável em vez de amplitude pela metade.
Ao final:
- `./mvnw verify` passa (backend)
- `npm run lint`, `npm test` e `npm run build` passam em `frontend/`
- a aplicação sobe localmente (backend com Docker Compose + front com Vite)

## Visão geral da arquitetura
- **Backend:** API REST em Spring Boot (monólito modular), sob o prefixo `/api`, hospedada no **Heroku**.
- **Frontend:** SPA em React, hospedada no **GitHub Pages** (site estático), que consome a API do Heroku.
- Front e back ficam em **origens diferentes** (`<usuario>.github.io` e `<app>.herokuapp.com`). Consequências obrigatórias:
  - Autenticação **stateless com JWT** no header `Authorization: Bearer`. Nada de sessão com cookie (navegadores bloqueiam cookies de terceiros entre esses domínios).
  - **CORS** configurado no backend, liberando apenas as origens do front.
  - CSRF desabilitado (API stateless com token no header, sem cookies).

## Limitações de produção (considere em todas as decisões)
- **Heroku Eco dyno:** 512 MB de RAM e o dyno dorme após período sem acesso. A primeira requisição depois disso demora alguns segundos.
  - O front deve tratar isso: mostrar um estado de carregamento amigável ("conectando ao servidor...") e usar timeout/retry razoáveis na primeira chamada.
  - Backend enxuto: sem dependências pesadas desnecessárias; nada de estado em memória que precise sobreviver a reinícios.
- **Heroku Postgres Essential/Mini:** poucas conexões simultâneas e armazenamento limitado. Pool pequeno (`maximum-pool-size=5`).
- **GitHub Pages:** só arquivos estáticos, sem servidor. Sem rewrite de rotas, então use `HashRouter` (ou o truque do `404.html`).
  O site fica num subcaminho (`/<nome-do-repo>/`), então configure `base` no Vite.

## Estrutura do repositório (monorepo)
```
/                    -> projeto Spring Boot (pom.xml na raiz, exigido pelo buildpack Java do Heroku)
/src/main/java/...   -> backend
/src/main/resources/ -> configs e migrations Flyway
/frontend/           -> app React (Vite), com package.json próprio
/docs/               -> documentação
/.github/workflows/  -> CI do backend, CI do frontend e deploy do Pages
```
- Adicione `.slugignore` com `frontend/` e `docs/` para não enviar o front ao Heroku.

## Stack do backend
- Java 25 (LTS atual) + Spring Boot 4.1.x
- Maven 3.9.x via Maven Wrapper (`mvnw`). NÃO use Maven 4, porque o buildpack do Heroku ainda não suporta.
- Spring Web (REST, JSON), Bean Validation
- PostgreSQL + Spring Data JPA/Hibernate
- Flyway para migrations (inclua `flyway-database-postgresql`; confira o starter correto no Boot 4, que modularizou os starters)
- Spring Security 7 + OAuth2 Resource Server para validar JWT (assinatura HMAC com segredo em variável de ambiente). Use o suporte nativo do Spring (Nimbus) para emitir e validar tokens, sem biblioteca JWT extra. Senhas com BCrypt.
- Spring Boot Actuator (apenas `health` exposto publicamente)
- Erros no formato `ProblemDetail` (RFC 9457), com os erros de validação campo a campo
- Testes: JUnit 5, Spring Boot Test, Spring Security Test, Testcontainers (PostgreSQL, com `@ServiceConnection`)
- IA: Google Gemini (API REST via `RestClient`, sem SDK), só no módulo `sugestoes`, para sugerir categoria e medida pelo nome do produto. Opcional: sem `GEMINI_API_KEY`, usa só o histórico da família e o dicionário embutido

## Stack do frontend
- React + TypeScript + Vite
- React Router com `HashRouter` (compatível com GitHub Pages)
- TanStack Query para chamadas à API, cache e estados de carregamento/erro
- CSS próprio com variáveis (CSS Modules ou arquivos por componente). Sem Tailwind e sem biblioteca de componentes.
- Um cliente HTTP único (`fetch` encapsulado) que usa a URL da API de `VITE_API_URL`, envia o JWT, trata erros `ProblemDetail`
  e, em caso de 401, limpa o token e redireciona para o login
- Vitest + React Testing Library para testes dos componentes e fluxos principais
- ESLint + Prettier
- Em desenvolvimento: Vite em `localhost:5173` apontando para `http://localhost:8080`

## Autenticação (JWT)
- `POST /api/auth/login` retorna um access token JWT (expiração configurável, ex.: 7 dias com "lembrar de mim", 1 dia sem).
- O front guarda o token em `localStorage` e o envia em `Authorization: Bearer <token>`. Logout apenas remove o token.
- Sem refresh token no MVP (mantém simples). Documente essa escolha e seus riscos em `docs/ARQUITETURA.md`.
- Mitigação de XSS: nunca use `dangerouslySetInnerHTML`; adicione uma Content-Security-Policy via `<meta>` no `index.html` permitindo só a própria origem e a URL da API.
- Segredo JWT em `JWT_SECRET` (mínimo de 256 bits). Nunca commitado.
- `SessionCreationPolicy.STATELESS`.

## CORS
- Origens permitidas via variável `CORS_ALLOWED_ORIGINS` (lista separada por vírgula).
  - Local: `http://localhost:5173`
  - Produção: `https://<usuario>.github.io`
- Métodos: GET, POST, PUT, PATCH, DELETE, OPTIONS. Header `Authorization` e `Content-Type` permitidos. Sem credenciais (cookies).

## Arquitetura do backend
- Monólito modular. Sem microsserviços.
- Pacote base: `br.com.familyctrl` (ou similar), com um pacote por módulo:
  - `infra`: configuração, segurança (JWT, CORS), tratamento global de erros
  - `auth`: cadastro, login, emissão de token, usuário autenticado
  - `familia`: famílias, membros, convites
  - `listas`: listas de compras
  - `itens`: itens das listas
  - `sugestoes`: categoria e medida sugeridas pelo nome do produto (histórico, dicionário, IA)
  - `web`: controllers REST compartilhados/utilitários de API (ou controllers dentro de cada módulo, desde que consistente)
- Dentro de cada módulo, separe entidade, repositório, serviço, controller REST e DTOs (records). Nunca exponha entidades JPA na API.
- Regras de negócio ficam nos serviços.
- Um módulo não acessa o repositório de outro diretamente; use o serviço do outro módulo.
- Gestão de tarefas e gestão financeira NÃO fazem parte do projeto.
- Princípio geral: simplicidade. Só adicione complexidade quando houver motivo concreto.

## Escopo funcional do MVP

### Autenticação
- Cadastro com nome, e-mail (único) e senha (mínimo de 8 caracteres), com confirmação de senha
- Login por e-mail e senha, logout, e opção "lembrar de mim" (token com expiração maior)
- Endpoint que retorna o usuário autenticado (usado pelo front ao carregar)
- Telas públicas: landing simples, login e cadastro. O restante exige login.

### Famílias
- Um usuário pode criar uma família (quem cria vira ADMIN)
- Cada família tem um código de convite único e curto. Outro usuário entra na família informando o código.
- Um usuário pode participar de mais de uma família e alternar entre elas
- A tela da família mostra os membros e o código de convite (com botão de copiar)
- ADMIN pode: renomear a família, gerar um novo código de convite, promover membros e removê-los
- Qualquer membro pode sair da família (o último ADMIN não pode sair sem promover outro membro)

### Categorias
- Cada família tem categorias (padrão: Açougue, Mercearia, Laticínios, Padaria, Hortifrúti, Limpeza, Higiene e "Outros", fixa)
- Membros criam, renomeiam, reordenam e excluem categorias (itens de categoria excluída vão para "Outros")

### Listas (planejamento) e compras
- A lista é um planejamento reutilizável; cada ida ao mercado finalizada vira uma compra concluída
- Membros criam, renomeiam e excluem listas. Não há "arquivar": o histórico são as compras concluídas
- Tela inicial da família: botão "Criar lista" no topo (antes dos indicadores), indicadores (gasto no mês, compras no mês, última compra), seção Listas | Concluídas e "Importar lista" por último
- "x de y comprados", preço, data e mercado aparecem só nas compras concluídas

### Itens
- Planejar (aba própria): nome, categoria (obrigatória), medida (padrão: por unidade) e quantidade numérica com botões − e + (começa em 1 unidade ou 100 g; passo de 1 unidade ou 100 g); editar e remover
- Comprar (aba própria): campo "O que você pegou?" no topo abre o painel do item da lista com aquele nome ou de um item não planejado (funciona em lista sem planejamento); o checkbox abre o mesmo painel curto: quantidade (− e +) e preço obrigatório (por unidade: preço da unidade; por kg: preço total pago); "preço por", categoria e marca em "Mais detalhes"; marca ao confirmar
- Item pego vai para o fim da sua categoria, com destaque simples além do check
- Itens não planejados podem ser adicionados durante a compra (pelo "O que você pegou?")
- Total parcial calculado ao vivo; "Desmarcar todos" (com confirmação) apaga quantidades, preços e marcas
- Finalizar compra: só o valor final pago (do cupom) é obrigatório, já preenchido com a soma dos itens; a diferença para a soma é registrada (negativa = desconto); mercado opcional; data já vem como hoje; pergunta se os itens não planejados viram fixos; a lista volta zerada

### Autorização (obrigatório)
- Todo acesso a família, lista ou item verifica no backend se o usuário autenticado é membro daquela família.
- Nunca confie em IDs vindos da URL ou do corpo da requisição sem essa verificação.
- Acesso indevido retorna 404 (para não revelar a existência do recurso).

### Fora do escopo do MVP
Tempo real (WebSocket), notificações, e-mail, recuperação de senha, refresh token, upload de imagens, PWA/offline, app mobile nativo.

## API REST (base; pode refinar mantendo o padrão)
- `POST /api/auth/cadastro`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/familias`, `POST /api/familias`, `GET /api/familias/{id}`, `PATCH /api/familias/{id}`
- `POST /api/familias/entrar` (com o código de convite), `POST /api/familias/{id}/convite` (novo código)
- `PATCH /api/familias/{id}/membros/{usuarioId}` (papel), `DELETE /api/familias/{id}/membros/{usuarioId}`, `POST /api/familias/{id}/sair`
- `GET /api/familias/{id}/listas`, `POST /api/familias/{id}/listas`
- `GET /api/listas/{id}`, `PATCH /api/listas/{id}`, `DELETE /api/listas/{id}`
- `POST /api/listas/{id}/itens`, `PATCH /api/itens/{id}`, `DELETE /api/itens/{id}`, `DELETE /api/listas/{id}/itens/comprados`
- Status HTTP corretos (201 na criação, 204 sem corpo, 400 validação, 401, 404, 409 conflito como e-mail duplicado)

## Modelo de dados (base; pode refinar)
- `usuarios` (id, nome, email único, senha_hash, criado_em)
- `familias` (id, nome, codigo_convite único, criado_em)
- `membros_familia` (familia_id, usuario_id, papel ADMIN/MEMBRO, entrou_em; PK composta)
- `listas` (id, familia_id, nome, arquivada, criada_por, criada_em)
- `itens` (id, lista_id, nome, quantidade, observacao, comprado, comprado_por, adicionado_por, criado_em, atualizado_em)
- Toda mudança de schema vai por migration Flyway (`V1__...sql`, `V2__...sql`). `spring.jpa.hibernate.ddl-auto=validate`.

## Design e responsividade (prioridade alta)
- Mobile-first: a experiência principal é no celular, no supermercado. Deve funcionar perfeitamente de 320px até desktop.
- Layout fluido com CSS Grid e Flexbox, unidades relativas, sem rolagem horizontal.
- Alvos de toque com no mínimo 44x44px; marcar um item como comprado deve ser um toque só e fácil.
- No celular, navegação principal acessível com o polegar (barra inferior ou equivalente); no desktop, layout com mais respiro e largura máxima de leitura.
- **Identidade visual: siga `docs/marca.md`** (cores, logo, ícones, tema e componentes). Ao mexer no frontend, esse guia é a fonte oficial.
- Estilo minimalista: muito espaço em branco, poucos elementos por tela, hierarquia tipográfica clara, sem gradientes. Transições curtas e discretas. O único "volume" é a sombra sólida de tecla (`--sombra-tecla`) no botão primário, que afunda ao ser pressionado.
- Paleta da marca Family Ctrl (preto, cinzas neutros e roxo), em `frontend/src/styles/tokens.css`: primitivos `--fc-*` e tokens semânticos `--cor-*`. Componentes usam só `var(--cor-*)`, nunca hex (exceção: o logo, com cores oficiais fixas).
  - **Tema escuro é o padrão** (identidade da marca, sem seguir `prefers-color-scheme`): fundo `#0F0F14`, superfície `#17171F`, superfície 2 `#1F1F29`, borda `#2E2E3A`, texto `#FAFAFA`, texto secundário `#A1A1AA`, destaque lavanda `#A78BFA`
  - Tema claro, opcional (escolha salva no aparelho, aplicada via `data-theme="light"`): fundo `#FAFAFA`, superfície `#FFFFFF`, borda `#E4E4E7`, texto `#0F0F14`, texto secundário `#71717A`, destaque roxo `#7C3AED`
  - Ação principal: roxo `#7C3AED` (hover `#6D28D9`). Roxo no máximo em ~10% da tela, só em ação e estado; um botão primário por tela; nunca para erro ou sucesso.
- Logo: componente `Logo`/`SimboloLogo` em `frontend/src/components/brand/Logo.tsx` (assinatura `familyctrl`; em texto corrido, "Family Ctrl").
- Ícones: Lucide (`lucide-react`), traço 2, 20px (16px em texto pequeno, 24px na barra inferior), sempre via `frontend/src/components/Icones.tsx`.
- Fonte: Inter (400 a 700) via Google Fonts, com a pilha do sistema como reserva; a CSP libera só `fonts.googleapis.com` e `fonts.gstatic.com`.
- Acessibilidade: contraste AA, foco visível, labels em todos os campos, HTML semântico, `aria-*` onde necessário, navegação por teclado.
- Estados sempre tratados: carregando (skeletons discretos, incluindo o "servidor acordando"), erro, vazio ("nenhuma lista ainda") e confirmação de ações destrutivas.
- Componentes reutilizáveis (botão, campo, card, modal, barra de navegação) com os tokens de design centralizados.

## Configuração e ambientes
### Backend
- Perfis do Spring: `local` (Docker Compose), `test` (Testcontainers), `prod` (Heroku).
- `server.port=${PORT:8080}`
- Em prod: `spring.datasource.url=${JDBC_DATABASE_URL}`, `spring.datasource.username=${JDBC_DATABASE_USERNAME}`, `spring.datasource.password=${JDBC_DATABASE_PASSWORD}`. Não use `DATABASE_URL` diretamente em apps Java.
- Variáveis de ambiente em prod: `JWT_SECRET`, `CORS_ALLOWED_ORIGINS` e `GEMINI_API_KEY` (opcional).
- Nenhum segredo commitado.
### Frontend
- `VITE_API_URL`: `http://localhost:8080` em dev (`.env.development`) e a URL do Heroku em prod (definida no workflow de deploy).
- `base` do Vite = `/<nome-do-repo>/` em produção.

## Deploy
### Backend (Heroku)
- `system.properties` com `java.runtime.version=25`
- `Procfile` com `web: java $JAVA_OPTS -Dspring.profiles.active=prod -jar target/<nome-do-jar>.jar`
- Maven Wrapper configurado para Maven 3.9.x
- Health check em `/actuator/health`
### Frontend (GitHub Pages)
- Workflow `.github/workflows/deploy-frontend.yml`: em push para `main` com mudanças em `frontend/**`, roda lint, testes e build, e publica `frontend/dist` com `actions/upload-pages-artifact` + `actions/deploy-pages`.
- A URL da API de produção vem de uma variável do repositório (`vars.API_URL`).

## CI (GitHub Actions)
- `ci-backend.yml`: em push e PR para `main` com mudanças fora de `frontend/**`. Java 25 (Temurin), cache do Maven, `./mvnw -B verify`.
- `ci-frontend.yml`: em PR com mudanças em `frontend/**`. Node LTS, cache do npm, `npm ci`, lint, testes e build.

## Testes
- Backend: testes de integração com Testcontainers para os serviços e para a autorização entre famílias (usuário de outra família recebe 404); testes dos controllers REST (status, validação, 401 sem token ou com token inválido); teste de CORS; testes unitários das regras de negócio (ex.: último ADMIN não pode sair).
- Frontend: testes dos fluxos principais (login, criar lista, adicionar e marcar item) com a API simulada.

## Versionamento
- GitHub Flow: `main` protegida + branches curtas de feature. Não use Git Flow.
- Commits pequenos e descritivos, em português, no padrão Conventional Commits (`feat:`, `fix:`, `docs:`...).

## Documentação
- `README.md`: descrição do projeto, links de produção, stack, como rodar localmente (back e front), como rodar os testes e como fazer deploy.
- `docs/ARQUITETURA.md`: módulos, API, modelo de dados, fluxo de autenticação JWT, CORS, limitações de produção e principais decisões, com explicação do porquê de cada uma.
- Notas de estudo em `docs/estudos/`.

## Passos manuais (feitos por mim, não pelo Claude)
Liste-os no README ao final da primeira sessão:
1. Criar o app no Heroku e adicionar o Heroku Postgres Essential/Mini
2. Definir no Heroku as variáveis `JWT_SECRET` e `CORS_ALLOWED_ORIGINS` (e, opcional, `GEMINI_API_KEY`)
3. Conectar o repositório GitHub ao Heroku (ou `git push heroku main`)
4. No GitHub: Settings → Pages → Source = "GitHub Actions"; criar a variável de repositório `API_URL` com a URL do Heroku
5. Configurar a proteção da branch `main`

## Como trabalhar comigo
- Sou iniciante em Spring Boot, arquitetura, JPA/Hibernate e Git. Explique o porquê das decisões importantes e registre-as em `docs/ARQUITETURA.md`.
- Primeira sessão: entregue o MVP completo descrito acima. Depois disso, trabalhe de forma incremental, uma mudança por vez, sem sair do escopo pedido.
- Não adicione módulos, tecnologias ou processos que não estejam neste arquivo sem me perguntar.
- Se algo deste arquivo estiver desatualizado ou incompatível com as versões reais (ex.: nome de starter no Boot 4), resolva da forma mais simples e me avise.
