import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/cliente';
import { itensApi, type DadosPego } from '../api/endpoints';
import type { Categoria, Item, SugestaoItem, TipoPreco } from '../api/tipos';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { FiltroChips } from '../components/FiltroChips';
import { IconeDescer } from '../components/Icones';
import form from '../components/Formulario.module.css';
import { Modal } from '../components/Modal';
import { SeletorCategoria } from '../components/SeletorCategoria';
import { SeletorQuantidade } from '../components/SeletorQuantidade';
import {
  formatarDinheiro,
  formatarQuantidade,
  lerDecimal,
  paraCampo,
  passoDaMedida,
  subtotal,
} from '../util/compra';
import {
  antesDeAlterar,
  depoisDeAlterar,
  ehDesatualizado,
  gravarItem,
  mensagemDesatualizado,
} from './cacheLista';
import estilos from './ListaPagina.module.css';
import { useSugestaoItem } from './useSugestaoItem';

interface Props {
  listaId: number;
  familiaId: number;
  categorias: Categoria[];
  /** Item planejado a pegar ou já pego a corrigir. Sem item: item não planejado (extra). */
  item?: Item;
  /** Nome do item não planejado, digitado em "O que você pegou?". */
  nomeExtra?: string;
  aoFechar: () => void;
  /** Recusado porque outra pessoa alterou (ou removeu) o item antes: o formulário fecha. */
  aoDesatualizado: (mensagem: string) => void;
}

/**
 * Painel curto de "pegar" um item: só quantidade (− e +) e preço, que é obrigatório. O "preço
 * por", a categoria (de item não planejado) e a marca ficam em "Mais detalhes", fechado por
 * padrão. O item só fica marcado ao confirmar.
 */
export function ModalPegar({
  listaId,
  familiaId,
  categorias,
  item,
  nomeExtra = '',
  aoFechar,
  aoDesatualizado,
}: Props) {
  const queryClient = useQueryClient();
  const extra = !item;
  // O "preço por" começa na medida planejada do item (ou no que foi usado ao pegar)
  const tipoInicial: TipoPreco = item ? (item.pego ? item.tipoPreco : item.medida) : 'UNIDADE';

  const [categoriaId, setCategoriaId] = useState(
    categorias.find((c) => c.fixa)?.id ?? categorias[0]?.id ?? 0,
  );
  const [tipo, setTipo] = useState<TipoPreco>(tipoInicial);
  const [quantidade, setQuantidade] = useState(
    // Já pego: o que foi informado. Planejado: a quantidade planejada. Senão, 1 unidade ou 100 g.
    paraCampo(
      item?.pego ? item.quantidadePega : (item?.quantidadePlanejada ?? passoDaMedida(tipoInicial)),
    ),
  );
  const [preco, setPreco] = useState(paraCampo(item?.preco));
  const [marca, setMarca] = useState(item?.marca ?? '');
  const [tentouEnviar, setTentouEnviar] = useState(false);

  // Item não planejado: categoria e "preço por" vêm sugeridos pelo nome, salvo se a pessoa já
  // escolheu outro em "Mais detalhes"
  const [escolheuCategoria, setEscolheuCategoria] = useState(false);
  const [escolheuTipo, setEscolheuTipo] = useState(false);
  const sugestao = useSugestaoItem(familiaId, extra ? nomeExtra : '', 0);
  const [aplicada, setAplicada] = useState<SugestaoItem>();
  if (sugestao && sugestao.origem !== 'PADRAO' && sugestao !== aplicada) {
    setAplicada(sugestao);
    if (!escolheuCategoria) setCategoriaId(sugestao.categoriaId);
    if (!escolheuTipo && sugestao.medida !== tipo) escolherTipo(sugestao.medida);
  }

  const qtd = lerDecimal(quantidade);
  const valor = lerDecimal(preco);
  const qtdInvalida = quantidade.trim() !== '' && (qtd === undefined || qtd <= 0);
  const precoInvalido = valor === undefined || valor < 0;
  const previa = subtotal(tipo, valor, qtd);

  const salvar = useMutation({
    mutationFn: () => {
      const dados: DadosPego = {
        tipoPreco: tipo,
        quantidadePega: qtd,
        preco: valor,
        marca: marca.trim() || undefined,
      };
      // Com a versão do item de quando o formulário abriu: se outra pessoa já o marcou ou
      // corrigiu, nada é gravado (409) e a pessoa vê os valores dela antes de decidir
      return item
        ? itensApi.pegar(item.id, item.versao, dados)
        : itensApi.adicionarExtra(listaId, { ...dados, nome: nomeExtra.trim(), categoriaId });
    },
    onMutate: () => antesDeAlterar(queryClient, listaId),
    onSuccess: (salvo) => {
      gravarItem(queryClient, salvo);
      aoFechar();
    },
    onError: (erro) => {
      if (!ehDesatualizado(erro)) return;
      aoFechar();
      aoDesatualizado(mensagemDesatualizado(erro));
    },
    onSettled: () => depoisDeAlterar(queryClient, listaId),
  });
  const erro = salvar.error instanceof ApiError ? salvar.error : undefined;

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    setTentouEnviar(true);
    if (qtdInvalida || precoInvalido) return;
    salvar.mutate();
  }

  /** Trocar o "preço por" volta a quantidade para o início (1 unidade ou 100 g). */
  function escolherTipo(novo: TipoPreco) {
    setTipo(novo);
    setQuantidade(paraCampo(passoDaMedida(novo)));
  }

  const porKg = tipo === 'KG';
  const erroPreco =
    tentouEnviar && precoInvalido
      ? preco.trim()
        ? 'Informe um valor válido.'
        : 'Informe o preço.'
      : erro?.erroDoCampo('preco');
  // Algo em "Mais detalhes" com erro: abre sozinho para a pessoa ver
  const erroDetalhes = erro?.erroDoCampo('categoriaId') ?? erro?.erroDoCampo('marca');

  return (
    <Modal aberto titulo={item?.nome ?? nomeExtra} aoFechar={aoFechar}>
      <form className={form.formulario} onSubmit={enviar} noValidate>
        {item && item.quantidadePlanejada !== null && (
          <p className={estilos.planejadoInfo}>
            Planejado: {formatarQuantidade(item.quantidadePlanejada, item.medida)}
          </p>
        )}
        {extra && (
          <p className={estilos.planejadoInfo}>
            Não estava na lista · {categorias.find((c) => c.id === categoriaId)?.nome}
          </p>
        )}

        <SeletorQuantidade
          rotulo={porKg ? 'Peso' : 'Quantidade'}
          medida={tipo}
          texto={quantidade}
          aoMudar={setQuantidade}
          erro={
            qtdInvalida ? 'Informe um número maior que zero.' : erro?.erroDoCampo('quantidadePega')
          }
        />
        <Campo
          rotulo={porKg ? 'Preço total (R$)' : 'Preço da unidade (R$)'}
          inputMode="decimal"
          autoComplete="off"
          placeholder="Ex.: 7,88"
          autoFocus
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          erro={erroPreco}
        />

        <p className={estilos.previa} aria-live="polite">
          Subtotal <strong>{previa !== undefined ? formatarDinheiro(previa) : '—'}</strong>
        </p>

        <details className={estilos.maisDetalhes} open={erroDetalhes ? true : undefined}>
          <summary>
            Mais detalhes
            <IconeDescer tamanho={16} />
          </summary>
          <div className={estilos.maisDetalhesConteudo}>
            <div className={estilos.precoPor}>
              <span className={estilos.precoPorRotulo} aria-hidden="true">
                Preço por
              </span>
              <FiltroChips
                rotulo="Preço por"
                valor={tipo}
                aoMudar={(novo) => {
                  escolherTipo(novo);
                  setEscolheuTipo(true);
                }}
                opcoes={[
                  { valor: 'UNIDADE', rotulo: 'Por unidade' },
                  { valor: 'KG', rotulo: 'Por kg' },
                ]}
              />
            </div>
            {extra && (
              <SeletorCategoria
                categorias={categorias}
                valor={categoriaId}
                aoMudar={(id) => {
                  setCategoriaId(id);
                  setEscolheuCategoria(true);
                }}
                erro={erro?.erroDoCampo('categoriaId')}
              />
            )}
            <Campo
              rotulo="Marca (opcional)"
              maxLength={60}
              autoComplete="off"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              erro={erro?.erroDoCampo('marca')}
            />
          </div>
        </details>

        {erro && (erro.erros.length === 0 || erro.erroDoCampo('nome')) && (
          <p className={form.erro} role="alert">
            {erro.erroDoCampo('nome') ?? erro.message}
          </p>
        )}

        <div className={form.acoes}>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" variante="primario" carregando={salvar.isPending}>
            {item?.pego ? 'Salvar' : 'Marcar como pego'}
          </Botao>
        </div>
      </form>
    </Modal>
  );
}
