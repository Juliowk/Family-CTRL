package br.com.familyctrl.itens;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Cálculo do subtotal de um item pego. Único lugar do backend que faz essa conta. */
public final class Valores {

	private Valores() {
	}

	/**
	 * Subtotal de um item pego, arredondado a centavos.
	 * <ul>
	 * <li>Sem preço: {@code null} (o valor só é conhecido no caixa: entra como "valor variável").</li>
	 * <li>Por kg: o preço já é o total pago pelo peso (o peso é só informativo).</li>
	 * <li>Por unidade: preço × quantidade; sem quantidade, conta 1 unidade.</li>
	 * </ul>
	 */
	public static BigDecimal subtotal(TipoPreco tipo, BigDecimal preco, BigDecimal quantidade) {
		if (preco == null) {
			return null;
		}
		if (tipo == TipoPreco.KG) {
			return preco.setScale(2, RoundingMode.HALF_UP);
		}
		BigDecimal qtd = quantidade != null ? quantidade : BigDecimal.ONE;
		return preco.multiply(qtd).setScale(2, RoundingMode.HALF_UP);
	}

}
