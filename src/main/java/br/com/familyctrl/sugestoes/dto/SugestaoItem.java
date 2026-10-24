package br.com.familyctrl.sugestoes.dto;

import br.com.familyctrl.itens.TipoPreco;

/**
 * Categoria e medida sugeridas para um produto, e de onde veio a sugestão:
 * <ul>
 * <li>{@code HISTORICO}: a família já usou esse produto (vale a escolha mais recente);</li>
 * <li>{@code DICIONARIO}: produto comum, do dicionário embutido;</li>
 * <li>{@code IA}: classificado pelo Gemini (e guardado para as próximas vezes);</li>
 * <li>{@code PADRAO}: nenhuma das anteriores; "Outros", por unidade. A tela não aplica esse caso.</li>
 * </ul>
 */
public record SugestaoItem(Long categoriaId, TipoPreco medida, Origem origem) {

	public enum Origem {

		HISTORICO, DICIONARIO, IA, PADRAO

	}

}
