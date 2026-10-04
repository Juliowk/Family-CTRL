import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../api/cliente';
import { itensApi } from '../api/endpoints';
import type { Categoria, Item, ListaDetalhe } from '../api/tipos';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { CampoSelecao } from '../components/CampoSelecao';
import { Card } from '../components/Card';
import { EstadoVazio } from '../components/Estados';
import form from '../components/Formulario.module.css';
import { IconeEditar, IconeLista, IconeMais } from '../components/Icones';
import { Modal } from '../components/Modal';
import { agruparPorCategoria } from '../util/compra';
import { apagarItem, gravarItem, invalidarResumoDasListas } from './cacheLista';
import estilos from './ListaPagina.module.css';

const opcoesDe = (categorias: Categoria[]) =>
  categorias.map((c) => ({ valor: c.id, rotulo: c.nome }));

/** Aba Planejar: cadastrar o que comprar, com categoria e quantidade desejada. */
export function ListaPlanejar({ lista }: { lista: ListaDetalhe }) {
  const [editando, setEditando] = useState<Item | null>(null);
  const grupos = agruparPorCategoria(lista.categorias, lista.itens, 'planejar');

  return (
    <>
      <FormularioItem lista={lista} />

      {grupos.length === 0 ? (
        <EstadoVazio icone={<IconeLista />} titulo="Nenhum item planejado">
          Adicione acima o que precisa comprar. Na aba Comprar, no mercado, você marca o que pegou.
        </EstadoVazio>
      ) : (
        <div className={estilos.grupos}>
          {grupos.map(({ categoria, itens }) => (
            <section
              key={categoria.id}
              className={estilos.grupo}
              aria-labelledby={`plan-cat-${categoria.id}`}
            >
              <h2 id={`plan-cat-${categoria.id}`} className={estilos.grupoTitulo}>
                {categoria.nome}
                <span className={estilos.grupoContagem}>{itens.length}</span>
              </h2>
              <ul className={estilos.itens}>
                {itens.map((item) => (
                  <li key={item.id} className={estilos.item}>
                    <div className={estilos.planejado}>
                      <span className={estilos.itemNome}>{item.nome}</span>
                      {item.quantidadePlanejada && (
                        <span className={estilos.itemDetalhe}>{item.quantidadePlanejada}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className={estilos.editar}
                      aria-label={`Editar ${item.nome}`}
                      onClick={() => setEditando(item)}
                    >
                      <IconeEditar tamanho={18} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className={estilos.rodapeAba}>
        A ordem das categorias segue a configuração da família.{' '}
        <Link to={`/familias/${lista.familiaId}/categorias`}>Gerenciar categorias</Link>
      </p>

      {editando && (
        <ModalEditarItem
          item={editando}
          categorias={lista.categorias}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}

function FormularioItem({ lista }: { lista: ListaDetalhe }) {
  const queryClient = useQueryClient();
  const ultimo = lista.itens.at(-1);
  const [nome, setNome] = useState('');
  const [quantidade, setQuantidade] = useState('');
  // Começa na categoria do último item adicionado: costuma-se planejar por seção do mercado
  const [categoriaId, setCategoriaId] = useState(
    ultimo?.categoriaId ?? lista.categorias[0]?.id ?? 0,
  );

  const adicionar = useMutation({
    mutationFn: () =>
      itensApi.adicionar(lista.id, {
        nome: nome.trim(),
        categoriaId,
        quantidadePlanejada: quantidade.trim() || undefined,
      }),
    onSuccess: (item) => {
      gravarItem(queryClient, item);
      invalidarResumoDasListas(queryClient);
      setNome('');
      setQuantidade('');
    },
  });
  const erro = adicionar.error instanceof ApiError ? adicionar.error : undefined;

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (nome.trim()) adicionar.mutate();
  }

  return (
    <Card>
      <form className={estilos.formItem} onSubmit={enviar}>
        <Campo
          className={estilos.formNome}
          rotulo="Item"
          placeholder="Ex.: Arroz"
          maxLength={120}
          autoComplete="off"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={
            erro?.erroDoCampo('nome') ??
            (erro && erro.erros.length === 0 ? erro.message : undefined)
          }
        />
        <CampoSelecao
          rotulo="Categoria"
          value={categoriaId}
          onChange={(e) => setCategoriaId(Number(e.target.value))}
          opcoes={opcoesDe(lista.categorias)}
          erro={erro?.erroDoCampo('categoriaId')}
        />
        <Campo
          rotulo="Quantidade (opcional)"
          placeholder="Ex.: 2 kg"
          maxLength={30}
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          erro={erro?.erroDoCampo('quantidadePlanejada')}
        />
        <Botao
          type="submit"
          variante="primario"
          className={estilos.formBotao}
          carregando={adicionar.isPending}
          disabled={!nome.trim()}
        >
          <IconeMais tamanho={18} />
          Adicionar
        </Botao>
      </form>
    </Card>
  );
}

function ModalEditarItem({
  item,
  categorias,
  aoFechar,
}: {
  item: Item;
  categorias: Categoria[];
  aoFechar: () => void;
}) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState(item.nome);
  const [categoriaId, setCategoriaId] = useState(item.categoriaId);
  const [quantidade, setQuantidade] = useState(item.quantidadePlanejada ?? '');
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);

  // String vazia apaga a quantidade desejada no backend
  const salvar = useMutation({
    mutationFn: () =>
      itensApi.atualizar(item.id, {
        nome: nome.trim(),
        categoriaId,
        quantidadePlanejada: quantidade.trim(),
      }),
    onSuccess: (atualizado) => {
      gravarItem(queryClient, atualizado);
      aoFechar();
    },
  });
  const remover = useMutation({
    mutationFn: () => itensApi.remover(item.id),
    onSuccess: () => {
      apagarItem(queryClient, item.listaId, item.id);
      invalidarResumoDasListas(queryClient);
      aoFechar();
    },
  });
  const erro = salvar.error instanceof ApiError ? salvar.error : undefined;
  const erroGeral = (salvar.error ?? remover.error) as unknown;

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (nome.trim()) salvar.mutate();
  }

  return (
    <Modal aberto titulo="Editar item" aoFechar={aoFechar}>
      <form className={form.formulario} onSubmit={enviar}>
        <Campo
          rotulo="Item"
          required
          maxLength={120}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={erro?.erroDoCampo('nome')}
        />
        <CampoSelecao
          rotulo="Categoria"
          value={categoriaId}
          onChange={(e) => setCategoriaId(Number(e.target.value))}
          opcoes={opcoesDe(categorias)}
          erro={erro?.erroDoCampo('categoriaId')}
        />
        <Campo
          rotulo="Quantidade (opcional)"
          placeholder="Ex.: 2 kg"
          maxLength={30}
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          erro={erro?.erroDoCampo('quantidadePlanejada')}
        />
        {erroGeral instanceof ApiError && erroGeral.erros.length === 0 && (
          <p className={form.erro} role="alert">
            {erroGeral.message}
          </p>
        )}
        <div className={estilos.acoesModal}>
          <Botao
            variante="perigo"
            carregando={remover.isPending}
            onClick={() => (confirmandoRemocao ? remover.mutate() : setConfirmandoRemocao(true))}
          >
            {confirmandoRemocao ? 'Confirmar remoção' : 'Remover'}
          </Botao>
          <div className={form.acoes}>
            <Botao variante="fantasma" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao
              type="submit"
              variante="primario"
              carregando={salvar.isPending}
              disabled={!nome.trim()}
            >
              Salvar
            </Botao>
          </div>
        </div>
      </form>
    </Modal>
  );
}
