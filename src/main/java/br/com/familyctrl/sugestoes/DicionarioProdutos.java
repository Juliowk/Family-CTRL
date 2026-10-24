package br.com.familyctrl.sugestoes;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import br.com.familyctrl.itens.TipoPreco;

/**
 * Dicionário embutido com os produtos mais comuns de mercado ({@code sugestoes/produtos.csv}):
 * categoria padrão e medida. Responde na hora, sem rede e sem custo, e evita gastar o limite da IA
 * com o óbvio ("frango" é do açougue e vai por kg).
 *
 * <p>O produto digitado é comparado pelas primeiras palavras, da sequência mais longa para a mais
 * curta: "mussarela fatiada" encontra "mussarela", e "leite condensado" vence "leite".
 */
@Component
class DicionarioProdutos {

	/** Categoria padrão de um produto do dicionário, pela palavra-chave do nome da categoria. */
	enum CategoriaPadrao {

		ACOUGUE("acougue"), MERCEARIA("mercearia"), LATICINIOS("laticinio"), PADARIA("padaria"),
		HORTIFRUTI("hortifruti"), LIMPEZA("limpeza"), HIGIENE("higiene");

		/** Trecho do nome normalizado da categoria da família (ex.: "laticinio fri e ovo"). */
		final String palavraChave;

		CategoriaPadrao(String palavraChave) {
			this.palavraChave = palavraChave;
		}

	}

	record Produto(CategoriaPadrao categoria, TipoPreco medida) {
	}

	private final Map<String, Produto> produtos;

	DicionarioProdutos() {
		this.produtos = carregar();
	}

	Optional<Produto> buscar(String nomeNormalizado) {
		String[] palavras = nomeNormalizado.split(" ");
		for (int tamanho = palavras.length; tamanho > 0; tamanho--) {
			Produto produto = produtos.get(String.join(" ", Arrays.copyOf(palavras, tamanho)));
			if (produto != null) {
				return Optional.of(produto);
			}
		}
		return Optional.empty();
	}

	private static Map<String, Produto> carregar() {
		Map<String, Produto> mapa = new HashMap<>();
		try (InputStream entrada = new ClassPathResource("sugestoes/produtos.csv").getInputStream()) {
			String texto = new String(entrada.readAllBytes(), StandardCharsets.UTF_8);
			for (String linha : texto.split("\\R")) {
				if (linha.isBlank() || linha.startsWith("#")) {
					continue;
				}
				String[] campos = linha.split(";");
				TipoPreco medida = "KG".equals(campos[2].trim()) ? TipoPreco.KG : TipoPreco.UNIDADE;
				mapa.put(NomeProduto.normalizar(campos[0]),
						new Produto(CategoriaPadrao.valueOf(campos[1].trim()), medida));
			}
		}
		catch (IOException e) {
			throw new UncheckedIOException("Não foi possível ler o dicionário de produtos.", e);
		}
		return Map.copyOf(mapa);
	}

}
