import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../api/cliente';
import { itensApi } from '../api/endpoints';
import type { Categoria, Item, ListaDetalhe, TipoPreco } from '../api/tipos';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { Card } from '../components/Card';
import { EstadoVazio } from '../components/Estados';
import form from '../components/Formulario.module.css';
import { IconeEditar, IconeLista, IconeMais } from '../components/Icones';
import { Modal } from '../components/Modal';
import { SeletorCategoria } from '../components/SeletorCategoria';
import { SeletorMedida } from '../components/SeletorMedida';
import { agruparPorCategoria, rotuloMedida } from '../util/compra';
import { apagarItem, gravarItem, invalidarResumoDasListas } from './cacheLista';
import estilos from './ListaPagina.module.css';

/** Aba Planejar: cadastrar o que comprar, com categoria, medida e quantidade desejada. */
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
                      <span className={estilos.itemDetalhe}>
                        {[item.quantidadePlanejada, rotuloMedida(item.medida)]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
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
        <Link to={`/familias/${lista.familiaId}/categorias?lista=${lista.id}&aba=planejar`}>
          Gerenciar categorias
        </Link>
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
  // Medida obrigatória e sem padrão: cada item é escolhido de propósito (por unidade ou por kg)
  const [medida, setMedida] = useState<TipoPreco | null>(null);
  const [faltaMedida, setFaltaMedida] = useState(false);
  // Começa na categoria do último item adicionado: costuma-se planejar por seção do mercado
  const [categoriaId, setCategoriaId] = useState(
    ultimo?.categoriaId ?? lista.categorias[0]?.id ?? 0,
  );

  const adicionar = useMutation({
    mutationFn: (medidaEscolhida: TipoPreco) =>
      itensApi.adicionar(lista.id, {
        nome: nome.trim(),
        categoriaId,
        quantidadePlanejada: quantidade.trim() || undefined,
        medida: medidaEscolhida,
      }),
    onSuccess: (item) => {
      gravarItem(queryClient, item);
      invalidarResumoDasListas(queryClient);
      setNome('');
      setQuantidade('');
      setMedida(null);
    },
  });
  const erro = adicionar.error instanceof ApiError ? adicionar.error : undefined;

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!nome.trim()) return;
    if (!medida) {
      setFaltaMedida(true);
      return;
    }
    adicionar.mutate(medida);
  }

  function escolherMedida(nova: TipoPreco) {
    setMedida(nova);
    setFaltaMedida(false);
  }

  return (
    <Card>
      <form className={estilos.formItem} onSubmit={enviar}>
        <Campo
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
        <SeletorCategoria
          categorias={lista.categorias}
          valor={categoriaId}
          aoMudar={setCategoriaId}
          erro={erro?.erroDoCampo('categoriaId')}
        />
        <SeletorMedida
          valor={medida}
          aoMudar={escolherMedida}
          erro={
            faltaMedida ? 'Escolha a medida: por unidade ou por kg.' : erro?.erroDoCampo('medida')
          }
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
  const [medida, setMedida] = useState<TipoPreco>(item.medida);
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);

  // String vazia apaga a quantidade desejada no backend
  const salvar = useMutation({
    mutationFn: () =>
      itensApi.atualizar(item.id, {
        nome: nome.trim(),
        categoriaId,
        quantidadePlanejada: quantidade.trim(),
        medida,
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
        <SeletorCategoria
          categorias={categorias}
          valor={categoriaId}
          aoMudar={setCategoriaId}
          erro={erro?.erroDoCampo('categoriaId')}
        />
        <SeletorMedida valor={medida} aoMudar={setMedida} erro={erro?.erroDoCampo('medida')} />
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
