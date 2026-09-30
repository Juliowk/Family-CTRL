# Spring Boot: beans, injeção de dependência e camadas

## Beans e injeção de dependência

Classes anotadas com `@Service`, `@Component`, `@RestController` ou `@Configuration` viram
**beans**: objetos criados e gerenciados pelo Spring. Quando um bean precisa de outro, basta
pedi-lo no construtor, e o Spring entrega (isso é a **injeção de dependência**):

```java
@Service
public class FamiliaService {
    FamiliaService(FamiliaRepository familias, MembroFamiliaRepository membros,
                   UsuarioService usuarioService, GeradorCodigoConvite geradorCodigo) { ... }
}
```

Vantagens: as classes não criam as próprias dependências (`new`), então nos testes podemos passar
versões falsas (mocks). Veja `FamiliaServiceTest`, que cria o serviço com repositórios simulados.

**Dependência circular:** se A precisa de B e B precisa de A, o Spring não consegue criar nenhum
dos dois. No projeto isso quase aconteceu entre `ListaService` e `ItemService`, e foi resolvido
extraindo `ListaAcesso` (ver `docs/ARQUITETURA.md`).

## Camadas dentro de um módulo

```
Controller  →  recebe HTTP, valida o JSON (@Valid), chama o serviço, devolve DTO
Service     →  regras de negócio e autorização; controla a transação (@Transactional)
Repository  →  acesso ao banco (Spring Data gera a implementação)
Entity      →  mapeamento da tabela (JPA)
DTO         →  formato de entrada/saída da API (records)
```

Regra prática: **controller magro, serviço gordo**. O controller não decide nada; ele traduz HTTP
para chamadas de serviço.

## `@Transactional`

Tudo o que acontece dentro de um método `@Transactional` é salvo junto ou desfeito junto. Em
`FamiliaService.criar`, a família e o primeiro membro (ADMIN) são gravados na mesma transação: se
a segunda gravação falhar, a primeira é desfeita.

Detalhe útil: dentro de uma transação, alterar uma entidade carregada (`familia.setNome(...)`) já
basta. O Hibernate detecta a mudança e faz o `UPDATE` no fim (_dirty checking_), sem precisar
chamar `save`.

`readOnly = true` avisa que o método só lê, o que permite otimizações.

## Configuração por perfil

`application.properties` vale sempre; `application-local.properties`, `-test` e `-prod`
complementam conforme o perfil ativo. `${JWT_SECRET}` lê uma variável de ambiente, e
`${PORT:8080}` usa 8080 se `PORT` não existir.

`@ConfigurationProperties` transforma um grupo de propriedades num objeto tipado. Veja
`JwtProperties`: além de ler `familyctrl.jwt.*`, ele valida o tamanho do segredo na
inicialização.

## Records como DTOs

```java
public record ItemRequest(@NotBlank String nome, @Size(max = 30) String quantidade, String observacao) {}
```

Um `record` é uma classe imutável com construtor, getters, `equals` e `toString` gerados. É ideal
para dados que só transitam entre camadas.
