package br.com.familyctrl.itens;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

/** Regra de cálculo do subtotal (teste unitário, sem banco). */
class ValoresTest {

	@Test
	void porUnidadeMultiplicaPelaQuantidade() {
		assertThat(Valores.subtotal(TipoPreco.UNIDADE, new BigDecimal("7.88"), new BigDecimal("4")))
			.isEqualByComparingTo("31.52");
	}

	@Test
	void porUnidadeSemQuantidadeContaUma() {
		assertThat(Valores.subtotal(TipoPreco.UNIDADE, new BigDecimal("3.90"), null)).isEqualByComparingTo("3.90");
	}

	@Test
	void porKgArredondaParaCentavos() {
		// 1,255 kg × R$ 6,90 = 8,6595 → 8,66
		assertThat(Valores.subtotal(TipoPreco.KG, new BigDecimal("6.90"), new BigDecimal("1.255")))
			.isEqualByComparingTo("8.66");
	}

	@Test
	void porKgSemPesoOuSemPrecoNaoTemSubtotal() {
		assertThat(Valores.subtotal(TipoPreco.KG, new BigDecimal("6.90"), null)).isNull();
		assertThat(Valores.subtotal(TipoPreco.UNIDADE, null, BigDecimal.TEN)).isNull();
	}

}
