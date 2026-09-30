package br.com.familyctrl.auth;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Entidade JPA de usuário. Nunca é exposta na API: os controllers devolvem DTOs. */
@Entity
@Table(name = "usuarios")
public class Usuario {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 100)
	private String nome;

	@Column(nullable = false, unique = true)
	private String email;

	@Column(name = "senha_hash", nullable = false, length = 100)
	private String senhaHash;

	@Column(name = "criado_em", nullable = false, updatable = false)
	private Instant criadoEm;

	/** Exigido pelo JPA. */
	protected Usuario() {
	}

	Usuario(String nome, String email, String senhaHash) {
		this.nome = nome;
		this.email = email;
		this.senhaHash = senhaHash;
		this.criadoEm = Instant.now();
	}

	public Long getId() {
		return id;
	}

	public String getNome() {
		return nome;
	}

	public String getEmail() {
		return email;
	}

	String getSenhaHash() {
		return senhaHash;
	}

	public Instant getCriadoEm() {
		return criadoEm;
	}

}
