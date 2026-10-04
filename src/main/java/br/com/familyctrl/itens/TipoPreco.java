package br.com.familyctrl.itens;

/**
 * Como um item pego é pesado/contado e cobrado:
 * <ul>
 * <li>{@code UNIDADE}: quantidade em unidades e preço de uma unidade (subtotal = preço ×
 * quantidade);</li>
 * <li>{@code KG}: quantidade é o peso em kg e o preço é o total pago por esse peso, como vem na
 * etiqueta da balança (subtotal = preço). Ex.: 1 kg por R$ 50,00.</li>
 * </ul>
 */
public enum TipoPreco {

	UNIDADE, KG

}
