package br.com.familyctrl.sugestoes;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

interface SugestaoSalvaRepository extends JpaRepository<SugestaoSalva, Long> {

	Optional<SugestaoSalva> findByFamiliaIdAndNomeNormalizado(Long familiaId, String nomeNormalizado);

	/**
	 * Guarda a resposta da IA. Se duas pessoas perguntaram pelo mesmo produto ao mesmo tempo, fica a
	 * primeira ({@code on conflict do nothing}) em vez de dar erro de chave duplicada.
	 */
	@Transactional
	@Modifying
	@Query(value = """
			insert into sugestoes_item (familia_id, nome_normalizado, categoria_id, medida)
			values (:familiaId, :nomeNormalizado, :categoriaId, :medida)
			on conflict (familia_id, nome_normalizado) do nothing""", nativeQuery = true)
	void guardar(Long familiaId, String nomeNormalizado, Long categoriaId, String medida);

}
