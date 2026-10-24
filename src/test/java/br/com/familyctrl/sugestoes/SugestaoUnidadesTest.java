package br.com.familyctrl.sugestoes;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import br.com.familyctrl.itens.TipoPreco;
import br.com.familyctrl.sugestoes.DicionarioProdutos.CategoriaPadrao;

/** Regras sem banco: normalização do nome, dicionário e leitura da resposta da IA. */
class SugestaoUnidadesTest {

	@Test
	void normalizaAcentoMaiusculaPontuacaoEPlural() {
		assertThat(NomeProduto.normalizar("  Pães  Franceses! ")).isEqualTo(NomeProduto.normalizar("pão francês"));
		assertThat(NomeProduto.normalizar("Limões")).isEqualTo("limao");
		assertThat(NomeProduto.normalizar("Cereais")).isEqualTo("cereal");
		assertThat(NomeProduto.normalizar("Açúcares")).isEqualTo("acucar");
		assertThat(NomeProduto.normalizar("OVOS")).isEqualTo("ovo");
		assertThat(NomeProduto.normalizar("Arroz 5kg")).isEqualTo("arroz 5kg");
	}

	@Test
	void dicionarioUsaAsPrimeirasPalavras() {
		var dicionario = new DicionarioProdutos();
		assertThat(dicionario.buscar(NomeProduto.normalizar("Peito de frango sem osso")))
			.hasValueSatisfying(p -> assertThat(p.categoria()).isEqualTo(CategoriaPadrao.ACOUGUE));
		assertThat(dicionario.buscar(NomeProduto.normalizar("Bananas"))).hasValueSatisfying(p -> {
			assertThat(p.categoria()).isEqualTo(CategoriaPadrao.HORTIFRUTI);
			assertThat(p.medida()).isEqualTo(TipoPreco.KG);
		});
		assertThat(dicionario.buscar(NomeProduto.normalizar("Pães franceses")))
			.hasValueSatisfying(p -> assertThat(p.medida()).isEqualTo(TipoPreco.KG));
		assertThat(dicionario.buscar(NomeProduto.normalizar("Ração especial"))).isPresent();
		assertThat(dicionario.buscar("xyzabc")).isEmpty();
	}

	@Test
	void leRespostaDoGeminiSoComCategoriaDaLista() {
		List<String> categorias = List.of("Padaria", "Outros");
		String resposta = """
				{"candidates":[{"content":{"parts":[{"text":"{\\"categoria\\": \\"Padaria\\", \\"medida\\": \\"KG\\"}"}]}}]}""";
		assertThat(ClienteGemini.lerResposta(resposta, categorias))
			.contains(new ClienteGemini.Classificacao("Padaria", TipoPreco.KG));

		String inventada = resposta.replace("Padaria", "Bebidas");
		assertThat(ClienteGemini.lerResposta(inventada, categorias)).isEmpty();
		assertThat(ClienteGemini.lerResposta("{\"candidates\":[]}", categorias)).isEmpty();
	}

}
