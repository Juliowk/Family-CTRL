package br.com.familyctrl.sugestoes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import br.com.familyctrl.itens.TipoPreco;

/** Resposta da IA guardada para não perguntar de novo pelo mesmo produto na mesma família. */
@Entity
@Table(name = "sugestoes_item")
class SugestaoSalva {

	@Id
	private Long id;

	@Column(name = "familia_id", nullable = false)
	private Long familiaId;

	@Column(name = "nome_normalizado", nullable = false, length = 120)
	private String nomeNormalizado;

	@Column(name = "categoria_id", nullable = false)
	private Long categoriaId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 10)
	private TipoPreco medida;

	protected SugestaoSalva() {
	}

	Long getCategoriaId() {
		return categoriaId;
	}

	TipoPreco getMedida() {
		return medida;
	}

}
