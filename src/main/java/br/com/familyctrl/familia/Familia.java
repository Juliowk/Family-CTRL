package br.com.familyctrl.familia;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "familias")
class Familia {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 100)
	private String nome;

	@Column(name = "codigo_convite", nullable = false, unique = true, length = 12)
	private String codigoConvite;

	@Column(name = "criado_em", nullable = false, updatable = false)
	private Instant criadoEm;

	protected Familia() {
	}

	Familia(String nome, String codigoConvite) {
		this.nome = nome;
		this.codigoConvite = codigoConvite;
		this.criadoEm = Instant.now();
	}

	Long getId() {
		return id;
	}

	String getNome() {
		return nome;
	}

	void setNome(String nome) {
		this.nome = nome;
	}

	String getCodigoConvite() {
		return codigoConvite;
	}

	void setCodigoConvite(String codigoConvite) {
		this.codigoConvite = codigoConvite;
	}

	Instant getCriadoEm() {
		return criadoEm;
	}

}
