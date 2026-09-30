package br.com.familyctrl.familia;

import java.io.Serializable;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * Chave primária composta de {@link MembroFamilia}: (familia_id, usuario_id).
 * O JPA exige que chaves compostas implementem equals/hashCode e Serializable.
 */
@Embeddable
class MembroFamiliaId implements Serializable {

	@Column(name = "familia_id", nullable = false)
	private Long familiaId;

	@Column(name = "usuario_id", nullable = false)
	private Long usuarioId;

	protected MembroFamiliaId() {
	}

	MembroFamiliaId(Long familiaId, Long usuarioId) {
		this.familiaId = familiaId;
		this.usuarioId = usuarioId;
	}

	Long getFamiliaId() {
		return familiaId;
	}

	Long getUsuarioId() {
		return usuarioId;
	}

	@Override
	public boolean equals(Object outro) {
		return outro instanceof MembroFamiliaId id && Objects.equals(familiaId, id.familiaId)
				&& Objects.equals(usuarioId, id.usuarioId);
	}

	@Override
	public int hashCode() {
		return Objects.hash(familiaId, usuarioId);
	}

}
