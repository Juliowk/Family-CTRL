package br.com.familyctrl.itens;

/**
 * Como o preço de um item pego é informado:
 * <ul>
 * <li>{@code UNIDADE}: preço de uma unidade (subtotal = preço × quantidade);</li>
 * <li>{@code TOTAL}: o valor total do item, como vem na etiqueta da balança (subtotal = preço; a
 * quantidade é só informativa).</li>
 * </ul>
 */
public enum TipoPreco {

	UNIDADE, TOTAL

}
