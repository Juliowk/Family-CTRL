package br.com.familyctrl.itens;

/** Quantos itens a lista tem e quantos já foram pegos na compra em andamento. */
public record Progresso(long total, long pegos) {

	public static final Progresso VAZIO = new Progresso(0, 0);

}
