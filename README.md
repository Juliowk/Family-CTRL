# Family Ctrl

Aplicação web de gestão familiar focada em **listas de compras colaborativas**. Cada família tem um
código de convite. Os membros criam listas, adicionam itens e marcam o que já foi comprado com um
toque, direto do celular no supermercado.

Projeto de estudo de backend e peça de portfólio.

## Produção

| Parte    | Onde           | URL                                                  |
| -------- | -------------- | ---------------------------------------------------- |
| Frontend | GitHub Pages   | https://juliowk.github.io/Family-CTRL/               |
| API      | Heroku         | `https://<seu-app>.herokuapp.com` (definida no deploy) |

> A API roda num dyno Eco do Heroku, que **dorme** após um tempo sem acesso. A primeira requisição
> depois disso leva alguns segundos; o front mostra "Conectando ao servidor…" enquanto isso.

## Funcionalidades

- Cadastro, login (com "lembrar de mim"), logout
- Famílias: criar, entrar com código de convite, alternar entre várias famílias
- ADMIN: renomear a família, gerar novo código, promover/rebaixar e remover membros
- Sair da família (o último ADMIN precisa promover alguém antes)
- Categorias por família (padrão + personalizadas), com ordem configurável
- Listas como planejamento reutilizável, em duas abas:
  - **Planejar**: itens com nome, categoria e quantidade desejada, agrupados por categoria
  - **Comprar**: checkbox abre o formulário de quantidade, preço (por unidade ou por kg) e marca,
    todos opcionais; total parcial ao vivo; itens não planejados; "desmarcar todos" com confirmação
- Finalizar compra: valor dos itens sem preço (descoberto no caixa), mercado e data; pergunta se os
  itens não planejados ficam na lista; a lista volta zerada para a próxima compra
- Compras concluídas com valor, data, mercado e "x de y comprados"; gasto e compras do mês
- Autorização: só membros da família acessam suas listas e itens (os demais recebem 404)

## Stack

**Backend:** Java 25, Spring Boot 4.1, Spring Web MVC, Bean Validation, Spring Data JPA/Hibernate,
PostgreSQL, Flyway, Spring Security 7 + OAuth2 Resource Server (JWT HMAC via Nimbus), Actuator.
Testes com JUnit 5, Spring Boot Test, Spring Security Test e Testcontainers.

**Frontend:** React 19, TypeScript, Vite, React Router (HashRouter), TanStack Query, CSS Modules
com variáveis CSS. Testes com Vitest e React Testing Library. ESLint + Prettier.

Detalhes e o porquê de cada decisão: [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Estrutura do repositório

```
/                      projeto Spring Boot (pom.xml na raiz, exigido pelo buildpack do Heroku)
/src/main/java/...     backend (pacote br.com.familyctrl, um subpacote por módulo)
/src/main/resources/   configurações por perfil e migrations Flyway
/frontend/             app React (Vite), com package.json próprio
/docs/                 arquitetura e notas de estudo
/.github/workflows/    CI do backend, CI do frontend e deploy do GitHub Pages
```

## Como rodar localmente

### Pré-requisitos

- JDK 25
- Node 24 (LTS) e npm
- Docker (para o PostgreSQL local e para os testes com Testcontainers)

### Atalho: tudo com um comando (Windows)

Na raiz do projeto, no PowerShell:

```powershell
.\iniciar
```

O script [scripts/iniciar.ps1](scripts/iniciar.ps1), em ordem:

1. confere Docker, Java, Node e se as portas 8080 e 5173 estão livres;
2. sobe o PostgreSQL (Docker) e espera ele ficar saudável;
3. sobe o backend numa **nova aba do Windows Terminal** (os logs do Spring ficam lá) e espera
   `/actuator/health` responder `UP`. Fora do Windows Terminal (ex.: terminal do VS Code), o
   backend roda em segundo plano, com logs em `target/backend.log`;
4. só então sobe o frontend neste terminal (o Vite mostra apenas avisos e erros) e informa que
   ele está ativo em http://localhost:5173. O navegador não é aberto automaticamente.

**Ctrl+C** encerra o front e o back (a aba do backend fecha sozinha); o banco continua rodando
(`docker compose stop` para parar).

Ou, passo a passo:

### Backend

```bash
# 1. Sobe o PostgreSQL (porta 5432)
docker compose up -d

# 2. Sobe a API em http://localhost:8080 (perfil "local" é o padrão)
./mvnw spring-boot:run          # Linux/macOS/Git Bash
.\mvnw.cmd spring-boot:run      # Windows (PowerShell/cmd)
```

O perfil `local` já traz um `JWT_SECRET` de desenvolvimento e libera o CORS para
`http://localhost:5173`. Verifique com `curl http://localhost:8080/actuator/health`.

> No Windows, prefira o `mvnw.cmd`: o script `mvnw` no Git Bash pode falhar ao baixar o Maven.

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

O front usa `VITE_API_URL` de `frontend/.env.development` (`http://localhost:8080`).

## Testes e qualidade

```bash
# Backend: compila, roda testes unitários e de integração (precisa do Docker rodando)
./mvnw verify

# Frontend
cd frontend
npm run lint       # ESLint + Prettier (checagem)
npm test           # Vitest
npm run build      # checagem de tipos + build de produção
npm run format     # formata o código com o Prettier
```

## Deploy

### Backend (Heroku)

- `Procfile` sobe o jar com o perfil `prod`; `system.properties` pede o Java 25.
- `.slugignore` evita enviar `frontend/` e `docs/` para o Heroku.
- Variáveis necessárias: `JWT_SECRET`, `CORS_ALLOWED_ORIGINS` (e as `JDBC_DATABASE_*`, que o
  buildpack Java cria sozinho a partir do Heroku Postgres).
- Health check: `/actuator/health`.

### Frontend (GitHub Pages)

O workflow [.github/workflows/deploy-frontend.yml](.github/workflows/deploy-frontend.yml) roda a
cada push na `main` que mexa em `frontend/**`: lint, testes, build (com `VITE_API_URL` vindo da
variável de repositório `API_URL`) e publicação no Pages.

## Passos manuais (a fazer uma vez)

1. **Criar o app no Heroku** e adicionar o **Heroku Postgres** (plano Essential/Mini):
   ```bash
   heroku create <nome-do-app>
   heroku addons:create heroku-postgresql:essential-0 -a <nome-do-app>
   ```
2. **Definir as variáveis no Heroku**:
   ```bash
   # Segredo com 256 bits ou mais (ex.: gerado com openssl)
   heroku config:set JWT_SECRET="$(openssl rand -base64 48)" -a <nome-do-app>
   heroku config:set CORS_ALLOWED_ORIGINS="https://juliowk.github.io" -a <nome-do-app>
   ```
3. **Conectar o repositório ao Heroku** (aba _Deploy_ → GitHub, com deploy automático da `main`)
   ou publicar manualmente com `git push heroku main`.
4. **No GitHub**:
   - _Settings → Pages → Source_ = **GitHub Actions**
   - _Settings → Secrets and variables → Actions → Variables_: criar `API_URL` com a URL do
     Heroku (ex.: `https://<nome-do-app>.herokuapp.com`, sem barra no final)
5. **Proteger a branch `main`** (_Settings → Branches_): exigir PR e os checks de CI passando.

## Licença

Projeto pessoal de estudo.
