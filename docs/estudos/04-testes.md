# Testes: unitários, integração e Testcontainers

## Pirâmide usada no projeto

- **Unitários** (rápidos, sem Spring nem banco): `FamiliaServiceTest` cria o serviço com
  repositórios simulados pelo **Mockito** e testa as regras (último ADMIN, único membro...).
- **Integração** (aplicação inteira + banco real): `AuthControllerTest`, `FamiliaControllerTest`,
  `ListasEItensTest` e `SegurancaInfraTest` fazem requisições HTTP simuladas com o **MockMvc**
  e verificam status e JSON.

## Testcontainers

Em vez de um banco em memória (H2), que se comporta diferente do PostgreSQL, os testes sobem um
**PostgreSQL de verdade num contêiner Docker**:

```java
@Bean
@ServiceConnection
PostgreSQLContainer postgresContainer() {
    return new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));
}
```

`@ServiceConnection` faz o Spring Boot descobrir sozinho a URL, o usuário e a senha do contêiner.
O Flyway roda as migrations nele, ou seja, os testes também validam o SQL.

Requisito: Docker rodando na máquina (e no CI, onde o runner do GitHub já tem Docker).

## Por que os testes não limpam o banco

Todos os testes de integração herdam de `IntegracaoTest`, então o Spring reaproveita o mesmo
contexto (e o mesmo contêiner): a suíte sobe uma vez só. Cada teste cria os próprios usuários com
e-mails aleatórios (`emailUnico()`), então os dados de um teste não interferem nos outros.

## Frontend

- **Vitest** roda os testes; **jsdom** simula o navegador; **React Testing Library** interage como
  um usuário faria (buscando por rótulo e papel, como `getByLabelText('E-mail')` e
  `getByRole('button', { name: 'Entrar' })`). Isso também ajuda a garantir acessibilidade.
- `src/test/apiFalsa.ts` substitui o `fetch` por uma API em memória, sem precisar do backend.
