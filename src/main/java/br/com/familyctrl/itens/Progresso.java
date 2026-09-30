package br.com.familyctrl.itens;

/** Quantos itens a lista tem e quantos já foram comprados. */
public record Progresso(long total, long comprados) {

	public static final Progresso VAZIO = new Progresso(0, 0);

}
