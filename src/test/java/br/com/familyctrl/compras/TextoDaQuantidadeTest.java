package br.com.familyctrl.compras;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

import br.com.familyctrl.itens.TipoPreco;

/** Quantidade planejada como fica guardada no histórico da compra. */
class TextoDaQuantidadeTest {

	@Test
	void porUnidade() {
		assertThat(CompraService.textoDaQuantidade(new BigDecimal("2.000"), TipoPreco.UNIDADE)).isEqualTo("2 un");
	}

	@Test
	void porKgAbaixoDeUmQuiloEmGramas() {
		assertThat(CompraService.textoDaQuantidade(new BigDecimal("0.300"), TipoPreco.KG)).isEqualTo("300 g");
	}

	@Test
	void porKgDeUmQuiloEmDiante() {
		assertThat(CompraService.textoDaQuantidade(new BigDecimal("1.500"), TipoPreco.KG)).isEqualTo("1,5 kg");
	}

	@Test
	void semQuantidade() {
		assertThat(CompraService.textoDaQuantidade(null, TipoPreco.KG)).isNull();
	}

}
