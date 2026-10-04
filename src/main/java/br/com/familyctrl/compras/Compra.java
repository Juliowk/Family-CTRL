package br.com.familyctrl.compras;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

/**
 * Compra concluída: cópia imutável de como a lista estava ao finalizar (itens, quantidades,
 * preços, marcas), mais mercado, data e valores. Editar ou excluir a lista depois não a altera.
 */
@Entity
@Table(name = "compras")
class Compra {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "familia_id", nullable = false, updatable = false)
	private Long familiaId;

	/** Nulo se a lista foi excluída depois. */
	@Column(name = "lista_id", updatable = false)
	private Long listaId;

	@Column(name = "lista_nome", nullable = false, updatable = false, length = 100)
	private String listaNome;

	@Column(nullable = false, updatable = false, length = 100)
	private String mercado;

	@Column(name = "data_compra", nullable = false, updatable = false)
	private LocalDate dataCompra;

	/** Soma dos subtotais dos itens com preço, calculada pelo backend. */
	@Column(name = "valor_itens", nullable = false, updatable = false, precision = 10, scale = 2)
	private BigDecimal valorItens;

	/** Valor dos itens sem preço, informado no fim da compra (descoberto no caixa). */
	@Column(name = "valor_variavel", nullable = false, updatable = false, precision = 10, scale = 2)
	private BigDecimal valorVariavel;

	@Column(name = "valor_total", nullable = false, updatable = false, precision = 10, scale = 2)
	private BigDecimal valorTotal;

	@Column(name = "finalizada_por", nullable = false, updatable = false)
	private Long finalizadaPor;

	@Column(name = "finalizada_em", nullable = false, updatable = false)
	private Instant finalizadaEm;

	/** Compra da lista "Exemplo Visual": aparece nas concluídas, mas fica fora do resumo do mês. */
	@Column(nullable = false, updatable = false)
	private boolean exemplo;

	@OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
	@JoinColumn(name = "compra_id", nullable = false, updatable = false)
	@OrderBy("categoriaOrdem asc, id asc")
	private List<CompraItem> itens = new ArrayList<>();

	protected Compra() {
	}

	Compra(Long familiaId, Long listaId, String listaNome, String mercado, LocalDate dataCompra,
			BigDecimal valorVariavel, Long finalizadaPor, List<CompraItem> itens) {
		this(familiaId, listaId, listaNome, mercado, dataCompra, valorVariavel, finalizadaPor, Instant.now(), false,
				itens);
	}

	/** Com o momento da finalização explícito e a marca de exemplo: usado pela lista de exemplo. */
	Compra(Long familiaId, Long listaId, String listaNome, String mercado, LocalDate dataCompra,
			BigDecimal valorVariavel, Long finalizadaPor, Instant finalizadaEm, boolean exemplo,
			List<CompraItem> itens) {
		this.familiaId = familiaId;
		this.listaId = listaId;
		this.listaNome = listaNome;
		this.mercado = mercado;
		this.dataCompra = dataCompra;
		this.valorVariavel = valorVariavel;
		this.finalizadaPor = finalizadaPor;
		this.finalizadaEm = finalizadaEm;
		this.exemplo = exemplo;
		this.itens.addAll(itens);
		this.valorItens = itens.stream()
			.map(CompraItem::getSubtotal)
			.filter(v -> v != null)
			.reduce(BigDecimal.ZERO, BigDecimal::add);
		this.valorTotal = this.valorItens.add(valorVariavel);
	}

	Long getId() {
		return id;
	}

	Long getFamiliaId() {
		return familiaId;
	}

	Long getListaId() {
		return listaId;
	}

	String getListaNome() {
		return listaNome;
	}

	String getMercado() {
		return mercado;
	}

	LocalDate getDataCompra() {
		return dataCompra;
	}

	BigDecimal getValorItens() {
		return valorItens;
	}

	BigDecimal getValorVariavel() {
		return valorVariavel;
	}

	BigDecimal getValorTotal() {
		return valorTotal;
	}

	Long getFinalizadaPor() {
		return finalizadaPor;
	}

	Instant getFinalizadaEm() {
		return finalizadaEm;
	}

	boolean isExemplo() {
		return exemplo;
	}

	List<CompraItem> getItens() {
		return itens;
	}

}
