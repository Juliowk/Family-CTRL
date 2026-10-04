package br.com.familyctrl.listas.dto;

import java.time.Instant;
import java.util.List;

import br.com.familyctrl.categorias.dto.CategoriaResponse;
import br.com.familyctrl.itens.dto.ItemResponse;

/**
 * Lista com as categorias da família (na ordem configurada) e todos os itens. O agrupamento dos
 * itens por categoria é feito na tela.
 *
 * @param versao sobe a cada alteração em qualquer item; finalizar a compra e "desmarcar todos"
 * enviam a versão que a tela mostra, para não agir sobre valores desatualizados
 */
public record ListaDetalhe(Long id, Long familiaId, String nome, Instant criadaEm, long versao,
		List<CategoriaResponse> categorias, List<ItemResponse> itens) {
}
