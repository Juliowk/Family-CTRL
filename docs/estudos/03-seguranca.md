# Segurança: JWT, CORS e CSRF

## JWT em 1 minuto

Um JWT tem três partes separadas por ponto: `header.payload.assinatura`.

- **header**: algoritmo (`HS256`)
- **payload**: as _claims_, como `sub` (id do usuário), `iss` (emissor), `exp` (expiração)
- **assinatura**: HMAC do header + payload com o `JWT_SECRET`

O payload **não é criptografado**, só codificado em Base64 (qualquer um lê). O que impede fraudes
é a assinatura: sem o segredo, não dá para gerar uma assinatura válida para um payload alterado.
Por isso nunca se coloca dado sensível no token.

Teste que prova isso: `SegurancaInfraTest.tokenAssinadoComOutroSegredoRetorna401`.

## Filtro de segurança do Spring

Toda requisição passa por uma cadeia de filtros antes de chegar ao controller. O
`oauth2ResourceServer().jwt()` adiciona um filtro que:

1. lê o header `Authorization: Bearer ...`;
2. valida assinatura, `exp` e `iss` com o `JwtDecoder`;
3. se estiver tudo certo, coloca a autenticação no `SecurityContext`;
4. se não, responde 401 (o nosso `authenticationEntryPoint` escreve em ProblemDetail).

Rotas liberadas sem token: cadastro, login, `/actuator/health` e requisições `OPTIONS` (preflight
do CORS).

## CORS

O navegador aplica a **política de mesma origem**: um script de `https://juliowk.github.io` não
pode ler respostas de `https://app.herokuapp.com`, a não ser que o servidor diga que pode.

Para requisições com `Authorization` ou `Content-Type: application/json`, o navegador primeiro
envia um **preflight** (`OPTIONS`) perguntando "posso?". A API responde com
`Access-Control-Allow-Origin` e os métodos/headers permitidos. Veja os testes `corsPermite...` e
`corsBloqueia...`.

Importante: o CORS é uma proteção **do navegador**. Ferramentas como `curl` ignoram o CORS. Por
isso ele não substitui a autenticação.

## CSRF (e por que está desligado)

CSRF: um site malicioso faz o navegador da vítima enviar uma requisição para outro site, e o
navegador anexa os **cookies** da vítima automaticamente. Como a nossa API não usa cookies (o
token vai num header que só o nosso código coloca), o ataque não tem o que aproveitar.

## XSS e o token no localStorage

Se um atacante conseguir executar JavaScript na página (XSS), ele lê o `localStorage`. Defesas do
projeto:

- o React escapa textos ao renderizar (`{item.nome}` nunca vira HTML);
- ESLint proíbe `dangerouslySetInnerHTML` e `innerHTML`;
- Content-Security-Policy no build: só executa scripts servidos pela própria origem.

## Senhas

BCrypt gera um hash com _salt_ aleatório e é propositalmente lento. Duas pessoas com a mesma senha
têm hashes diferentes, e testar milhões de senhas fica caro para quem ataca.
