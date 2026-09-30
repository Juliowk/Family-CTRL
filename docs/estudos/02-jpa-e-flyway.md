# JPA, Hibernate e Flyway

## Quem é quem

- **JPA**: a especificação (anotações como `@Entity`, `@Id`, `@Column`).
- **Hibernate**: a implementação da JPA que o Spring usa. Traduz objetos em SQL.
- **Spring Data JPA**: gera repositórios a partir de interfaces.
- **Flyway**: aplica os scripts SQL de criação e alteração do banco, em ordem, uma vez cada.

## Entidade

```java
@Entity
@Table(name = "itens")
class Item {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "lista_id", nullable = false, updatable = false) private Long listaId;
    ...
    protected Item() {}   // exigido pelo JPA
}
```

O construtor vazio `protected` existe só para o Hibernate. O código usa o outro construtor, que
já deixa o objeto válido.

## Repositórios derivados do nome do método

```java
List<Item> findByListaIdOrderByCompradoAscCriadoEmAscIdAsc(Long listaId);
```

O Spring Data lê o nome e gera:
`select ... from itens where lista_id = ? order by comprado asc, criado_em asc, id asc`.
Para consultas mais complexas usa-se `@Query` com JPQL (ver `ItemRepository.contarPorLista`).

## Problema N+1 (e como foi evitado)

Montar a tela com 20 itens e buscar o nome de quem adicionou cada um, um por vez, geraria 1 + 20
consultas. Em vez disso, `ItemService` junta todos os ids de usuário e faz **uma** consulta
(`UsuarioService.buscarPorIds`, que usa `findAllById`). O mesmo vale para o progresso das listas:
uma consulta com `group by` para todas as listas da tela.

## `open-in-view=false`

Por padrão o Spring mantém a conexão com o banco aberta até a resposta HTTP terminar, o que
esconde consultas acidentais e segura conexões por mais tempo. Com o pool de apenas 5 conexões,
desligamos. Todo acesso ao banco acontece dentro dos serviços.

## Flyway

- Scripts em `src/main/resources/db/migration`, com nomes `V1__descricao.sql`, `V2__...`.
- Na inicialização, o Flyway compara com a tabela `flyway_schema_history` e aplica só os novos.
- **Nunca edite uma migration já aplicada**: o Flyway detecta a mudança (checksum) e para a
  aplicação. Para mudar o schema, crie uma nova versão.
- Com `ddl-auto=validate`, se a entidade não bater com a tabela, a aplicação não sobe. Isso é bom:
  o erro aparece no teste, e não em produção.

## Chave primária composta

`membros_familia` tem PK `(familia_id, usuario_id)`. No JPA isso é uma classe `@Embeddable`
(`MembroFamiliaId`) usada com `@EmbeddedId`. Ela precisa implementar `equals`, `hashCode` e
`Serializable`, porque o Hibernate a usa como chave em mapas internos.
