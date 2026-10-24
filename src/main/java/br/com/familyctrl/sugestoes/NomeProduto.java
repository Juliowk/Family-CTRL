package br.com.familyctrl.sugestoes;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Forma comparável do nome de um produto: minúsculo, sem acento nem pontuação e com cada palavra
 * no singular. Assim "Mussarelas", "mussarela " e "MUSSARELA" são o mesmo produto.
 */
final class NomeProduto {

	private NomeProduto() {
	}

	static String normalizar(String nome) {
		if (nome == null) {
			return "";
		}
		String semAcento = Normalizer.normalize(nome, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
		String limpo = semAcento.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
		if (limpo.isEmpty()) {
			return "";
		}
		return Arrays.stream(limpo.split(" ")).map(NomeProduto::singular).collect(Collectors.joining(" "));
	}

	/**
	 * Plural simples do português, aplicado tanto ao que se digita quanto ao dicionário (por isso
	 * "frances" e "franceses" dão o mesmo "france"): "limoes"/"paes" → "...ao"; "cereais" → "cereal";
	 * "papeis" → "papel"; "colheres"/"luzes" → "colher"/"luz"; "ovos" → "ovo".
	 */
	private static String singular(String palavra) {
		if (palavra.length() <= 3) {
			return palavra;
		}
		String raiz = palavra.substring(0, palavra.length() - 3);
		if (palavra.endsWith("oes") || palavra.endsWith("aes")) {
			return raiz + "ao";
		}
		if (palavra.endsWith("ais")) {
			return raiz + "al";
		}
		if (palavra.endsWith("eis")) {
			return raiz + "el";
		}
		if (palavra.endsWith("eses")) {
			return palavra.substring(0, palavra.length() - 3);
		}
		if (palavra.length() > 4 && (palavra.endsWith("res") || palavra.endsWith("zes"))) {
			return palavra.substring(0, palavra.length() - 2);
		}
		if (palavra.endsWith("s") && !palavra.endsWith("ss")) {
			return palavra.substring(0, palavra.length() - 1);
		}
		return palavra;
	}

}
