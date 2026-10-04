package br.com.familyctrl.familia;

/**
 * Evento publicado quando uma família é criada. Outros módulos reagem a ele sem que o módulo de
 * famílias precise conhecê-los (ex.: o módulo de compras cria a lista "Exemplo Visual"). Os
 * ouvintes rodam na mesma transação da criação.
 */
public record FamiliaCriada(Long familiaId, Long usuarioId) {
}
