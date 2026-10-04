package br.com.familyctrl.categorias;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Categoria de itens de uma família (ex.: "Padaria"). Define o agrupamento e a ordem das listas. */
@Entity
@Table(name = "categorias")
class Categoria {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "familia_id", nullable = false, updatable = false)
	private Long familiaId;

	@Column(nullable = false, length = 50)
	private String nome;

	@Column(nullable = false)
	private int ordem;

	/** A categoria "Outros": não pode ser excluída nem renomeada. */
	@Column(nullable = false, updatable = false)
	private boolean fixa;

	protected Categoria() {
	}

	Categoria(Long familiaId, String nome, int ordem, boolean fixa) {
		this.familiaId = familiaId;
		this.nome = nome;
		this.ordem = ordem;
		this.fixa = fixa;
	}

	Long getId() {
		return id;
	}

	Long getFamiliaId() {
		return familiaId;
	}

	String getNome() {
		return nome;
	}

	void setNome(String nome) {
		this.nome = nome;
	}

	int getOrdem() {
		return ordem;
	}

	void setOrdem(int ordem) {
		this.ordem = ordem;
	}

	boolean isFixa() {
		return fixa;
	}

}
