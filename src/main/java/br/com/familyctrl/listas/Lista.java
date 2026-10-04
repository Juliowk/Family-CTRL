package br.com.familyctrl.listas;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Lista de compras de uma família: o planejamento reutilizável. Cada ida ao mercado finalizada vira
 * uma compra (módulo compras). Referencia família e criador apenas pelo id.
 */
@Entity
@Table(name = "listas")
class Lista {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "familia_id", nullable = false, updatable = false)
	private Long familiaId;

	@Column(nullable = false, length = 100)
	private String nome;

	@Column(name = "criada_por", nullable = false, updatable = false)
	private Long criadaPor;

	@Column(name = "criada_em", nullable = false, updatable = false)
	private Instant criadaEm;

	protected Lista() {
	}

	Lista(Long familiaId, String nome, Long criadaPor) {
		this.familiaId = familiaId;
		this.nome = nome;
		this.criadaPor = criadaPor;
		this.criadaEm = Instant.now();
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

	Instant getCriadaEm() {
		return criadaEm;
	}

}
