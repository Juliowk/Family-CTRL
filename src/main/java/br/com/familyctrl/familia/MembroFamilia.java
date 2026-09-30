package br.com.familyctrl.familia;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

/**
 * Participação de um usuário em uma família. Guarda só o id do usuário (e não uma relação JPA
 * com a entidade Usuario) para manter os módulos independentes: dados do usuário são obtidos
 * pelo UsuarioService.
 */
@Entity
@Table(name = "membros_familia")
class MembroFamilia {

	@EmbeddedId
	private MembroFamiliaId id;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 10)
	private Papel papel;

	@Column(name = "entrou_em", nullable = false, updatable = false)
	private Instant entrouEm;

	protected MembroFamilia() {
	}

	MembroFamilia(Long familiaId, Long usuarioId, Papel papel) {
		this.id = new MembroFamiliaId(familiaId, usuarioId);
		this.papel = papel;
		this.entrouEm = Instant.now();
	}

	MembroFamiliaId getId() {
		return id;
	}

	Long getFamiliaId() {
		return id.getFamiliaId();
	}

	Long getUsuarioId() {
		return id.getUsuarioId();
	}

	Papel getPapel() {
		return papel;
	}

	void setPapel(Papel papel) {
		this.papel = papel;
	}

	boolean isAdmin() {
		return papel == Papel.ADMIN;
	}

	Instant getEntrouEm() {
		return entrouEm;
	}

}
