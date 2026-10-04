import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/cliente';
import { itensApi, type DadosPego } from '../api/endpoints';
import type { Categoria, Item, TipoPreco } from '../api/tipos';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { FiltroChips } from '../components/FiltroChips';
import form from '../components/Formulario.module.css';
import { Modal } from '../components/Modal';
import { SeletorCategoria } from '../components/SeletorCategoria';
import {
  formatarDinheiro,
  lerDecimal,
  paraCampo,
  subtotal,
  sugestaoDaQuantidade,
} from '../util/compra';
import { gravarItem, invalidarResumoDasListas } from './cacheLista';
import estilos from './ListaPagina.module.css';

interface Props {
  listaId: number;
  categorias: Categoria[];
  /** Item planejado a pegar ou já pego a corrigir. Sem item: item não planejado (extra). */
  item?: Item;
  aoFechar: () => void;
}

/**
 * Formulário de "pegar" um item: o item só fica marcado ao confirmar. Quantidade, preço e marca
 * são opcionais (frutas e verduras, por exemplo, só têm o valor conhecido no caixa).
 */
export function ModalPegar({ listaId, categorias, item, aoFechar }: Props) {
  const queryClient = useQueryClient();
  const extra = !item;
  const sugestao = item && !item.pego ? sugestaoDaQuantidade(item.quantidadePlanejada) : {};

  const [nome, setNome] = useState('');
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? 0);
  const [tipo, setTipo] = useState<TipoPreco>(
    item?.pego ? item.tipoPreco : (sugestao.tipo ?? 'UNIDADE'),
  );
  const [quantidade, setQuantidade] = useState(
    paraCampo(item?.pego ? item.quantidadePega : sugestao.quantidade),
  );
  const [preco, setPreco] = useState(paraCampo(item?.preco));
  const [marca, setMarca] = useState(item?.marca ?? '');

  const qtd = lerDecimal(quantidade);
  const valor = lerDecimal(preco);
  const qtdInvalida = quantidade.trim() !== '' && (qtd === undefined || qtd <= 0);
  const precoInvalido = preco.trim() !== '' && (valor === undefined || valor < 0);
  const previa = subtotal(tipo, valor, qtd);

  const salvar = useMutation({
    mutationFn: () => {
      const dados: DadosPego = {
        tipoPreco: tipo,
        quantidadePega: qtd,
        preco: valor,
        marca: marca.trim() || undefined,
      };
      return item
        ? itensApi.pegar(item.id, dados)
        : itensApi.adicionarExtra(listaId, { ...dados, nome: nome.trim(), categoriaId });
    },
    onSuccess: (salvo) => {
      gravarItem(queryClient, salvo);
      invalidarResumoDasListas(queryClient);
      aoFechar();
    },
  });
  const erro = salvar.error instanceof ApiError ? salvar.error : undefined;

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (qtdInvalida || precoInvalido || (extra && !nome.trim())) return;
    salvar.mutate();
  }

  const porKg = tipo === 'KG';
  const titulo = item?.nome ?? 'Item não planejado';

  return (
    <Modal aberto titulo={titulo} aoFechar={aoFechar}>
      <form className={form.formulario} onSubmit={enviar} noValidate>
        {item?.quantidadePlanejada && (
          <p className={estilos.planejadoInfo}>Planejado: {item.quantidadePlanejada}</p>
        )}
        {extra && (
          <>
            <Campo
              rotulo="Item"
              placeholder="Ex.: Chocolate"
              maxLength={120}
              autoComplete="off"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              erro={erro?.erroDoCampo('nome')}
            />
            <SeletorCategoria
              categorias={categorias}
              valor={categoriaId}
              aoMudar={setCategoriaId}
              erro={erro?.erroDoCampo('categoriaId')}
            />
          </>
        )}

        <div className={estilos.precoPor}>
          <span className={estilos.precoPorRotulo} aria-hidden="true">
            Preço por
          </span>
          <FiltroChips
            rotulo="Preço por"
            valor={tipo}
            aoMudar={setTipo}
            opcoes={[
              { valor: 'UNIDADE', rotulo: 'Por unidade' },
              { valor: 'KG', rotulo: 'Por kg' },
            ]}
          />
        </div>

        <div className={estilos.duasColunas}>
          <Campo
            rotulo={porKg ? 'Peso (kg)' : 'Quantidade'}
            inputMode="decimal"
            autoComplete="off"
            placeholder={porKg ? 'Ex.: 1,250' : 'Ex.: 2'}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            erro={
              qtdInvalida
                ? 'Informe um número maior que zero.'
                : erro?.erroDoCampo('quantidadePega')
            }
          />
          <Campo
            rotulo={porKg ? 'Preço total (R$)' : 'Preço da unidade (R$)'}
            inputMode="decimal"
            autoComplete="off"
            placeholder="Ex.: 7,88"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            erro={precoInvalido ? 'Informe um valor válido.' : erro?.erroDoCampo('preco')}
          />
        </div>

        <Campo
          rotulo="Marca (opcional)"
          maxLength={60}
          autoComplete="off"
          value={marca}
          onChange={(e) => setMarca(e.target.value)}
          erro={erro?.erroDoCampo('marca')}
        />

        <p className={estilos.previa} aria-live="polite">
          {previa !== undefined ? (
            <>
              Subtotal <strong>{formatarDinheiro(previa)}</strong>
            </>
          ) : (
            'Sem preço: o valor será informado ao finalizar a compra.'
          )}
        </p>

        {erro && erro.erros.length === 0 && (
          <p className={form.erro} role="alert">
            {erro.message}
          </p>
        )}

        <div className={form.acoes}>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao
            type="submit"
            variante="primario"
            carregando={salvar.isPending}
            disabled={extra && !nome.trim()}
          >
            {item?.pego ? 'Salvar' : 'Marcar como pego'}
          </Botao>
        </div>
      </form>
    </Modal>
  );
}
