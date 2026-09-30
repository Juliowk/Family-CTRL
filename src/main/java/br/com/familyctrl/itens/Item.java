package br.com.familyctrl.itens;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Item de uma lista de compras. */
@Entity
@Table(name = "itens")
class Item {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "lista_id", nullable = false, updatable = false)
	private Long listaId;

	@Column(nullable = false, length = 120)
	private String nome;

	@Column(length = 30)
	private String quantidade;

	@Column(length = 255)
	private String observacao;

	@Column(nullable = false)
	private boolean comprado;

	@Column(name = "comprado_por")
	private Long compradoPor;

	@Column(name = "adicionado_por", nullable = false, updatable = false)
	private Long adicionadoPor;

	@Column(name = "criado_em", nullable = false, updatable = false)
	private Instant criadoEm;

	@Column(name = "atualizado_em", nullable = false)
	private Instant atualizadoEm;

	protected Item() {
	}

	Item(Long listaId, String nome, String quantidade, String observacao, Long adicionadoPor) {
		this.listaId = listaId;
		this.nome = nome;
		this.quantidade = quantidade;
		this.observacao = observacao;
		this.adicionadoPor = adicionadoPor;
		this.criadoEm = Instant.now();
		this.atualizadoEm = this.criadoEm;
	}

	/** Marca ou desmarca como comprado, registrando quem marcou. */
	void marcarComprado(boolean comprado, Long usuarioId) {
		this.comprado = comprado;
		this.compradoPor = comprado ? usuarioId : null;
		tocar();
	}

	void editar(String nome, String quantidade, String observacao) {
		this.nome = nome;
		this.quantidade = quantidade;
		this.observacao = observacao;
		tocar();
	}

	private void tocar() {
		this.atualizadoEm = Instant.now();
	}

	Long getId() {
		return id;
	}

	Long getListaId() {
		return listaId;
	}

	String getNome() {
		return nome;
	}

	String getQuantidade() {
		return quantidade;
	}

	String getObservacao() {
		return observacao;
	}

	boolean isComprado() {
		return comprado;
	}

	Long getCompradoPor() {
		return compradoPor;
	}

	Long getAdicionadoPor() {
		return adicionadoPor;
	}

	Instant getCriadoEm() {
		return criadoEm;
	}

	Instant getAtualizadoEm() {
		return atualizadoEm;
	}

}
