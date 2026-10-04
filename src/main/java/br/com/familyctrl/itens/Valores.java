package br.com.familyctrl.itens;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Cálculo do subtotal de um item pego. Único lugar do backend que faz essa conta. */
public final class Valores {

	private Valores() {
	}

	/**
	 * Subtotal = preço × quantidade, arredondado a centavos.
	 * <ul>
	 * <li>Sem preço: {@code null} (o valor só é conhecido no caixa: entra como "valor variável").</li>
	 * <li>Por unidade sem quantidade: conta 1 unidade.</li>
	 * <li>Por kg sem o peso: {@code null} (não dá para calcular).</li>
	 * </ul>
	 */
	public static BigDecimal subtotal(TipoPreco tipo, BigDecimal preco, BigDecimal quantidade) {
		if (preco == null) {
			return null;
		}
		BigDecimal qtd = quantidade != null ? quantidade : (tipo == TipoPreco.UNIDADE ? BigDecimal.ONE : null);
		if (qtd == null) {
			return null;
		}
		return preco.multiply(qtd).setScale(2, RoundingMode.HALF_UP);
	}

}
