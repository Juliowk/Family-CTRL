import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { ApiError } from '../api/cliente';
import { categoriasApi, listasApi } from '../api/endpoints';
import type { Categoria } from '../api/tipos';
import { Botao, LinkBotao } from '../components/Botao';
import { CabecalhoPagina } from '../components/CabecalhoPagina';
import { Campo } from '../components/Campo';
import { Card } from '../components/Card';
import { ConfirmarDialogo } from '../components/ConfirmarDialogo';
import { Carregando, MensagemErro } from '../components/Estados';
import form from '../components/Formulario.module.css';
import {
  IconeDescer,
  IconeEditar,
  IconeLixeira,
  IconeSubir,
  IconeVoltar,
} from '../components/Icones';
import { ModalNome } from '../components/ModalNome';
import { Selo } from '../components/Selo';
import { chaves } from '../estado/chaves';
import estilos from './Categorias.module.css';
import { ErroFamilia } from './FamiliaNaoEncontrada';
import paginas from './Paginas.module.css';
import { useFamiliaDaRota } from './useFamiliaDaRota';

const mensagemDe = (erro: unknown) => (erro instanceof ApiError ? erro.message : undefined);

/** Categorias da família: a ordem daqui é a ordem dos grupos nas listas. */
export function Categorias() {
  const { familiaId, familia } = useFamiliaDaRota();
  // Aberta a partir de uma lista (?lista=48&aba=comprar): o "voltar" retorna para ela
  const [parametros] = useSearchParams();
  const listaOrigem = Number(parametros.get('lista')) || undefined;
  const abaOrigem = parametros.get('aba') === 'comprar' ? 'comprar' : 'planejar';
  const lista = useQuery({
    queryKey: chaves.lista(listaOrigem ?? 0),
    queryFn: () => listasApi.detalhar(listaOrigem ?? 0),
    enabled: listaOrigem !== undefined,
  });
  const voltarPara = listaOrigem ? `/listas/${listaOrigem}/${abaOrigem}` : undefined;
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [renomeando, setRenomeando] = useState<Categoria | null>(null);
  const [excluindo, setExcluindo] = useState<Categoria | null>(null);

  const categorias = useQuery({
    queryKey: chaves.categorias(familiaId),
    queryFn: () => categoriasApi.listar(familiaId),
    enabled: familia.isSuccess,
  });

  /** Categorias mudaram: as listas abertas (que trazem as categorias) também. */
  function aoAlterar(novas?: Categoria[]) {
    if (novas) queryClient.setQueryData(chaves.categorias(familiaId), novas);
    else void queryClient.invalidateQueries({ queryKey: chaves.categorias(familiaId) });
    void queryClient.invalidateQueries({ queryKey: ['lista'] });
  }

  const criar = useMutation({
    mutationFn: () => categoriasApi.criar(familiaId, nome.trim()),
    onSuccess: () => {
      setNome('');
      aoAlterar();
    },
  });
  const renomear = useMutation({
    mutationFn: ({ id, novo }: { id: number; novo: string }) => categoriasApi.renomear(id, novo),
    onSuccess: () => {
      setRenomeando(null);
      aoAlterar();
    },
  });
  const excluir = useMutation({
    mutationFn: (id: number) => categoriasApi.excluir(id),
    onSuccess: () => {
      setExcluindo(null);
      aoAlterar();
    },
  });
  const reordenar = useMutation({
    mutationFn: (ids: number[]) => categoriasApi.reordenar(familiaId, ids),
    onSuccess: (novas) => aoAlterar(novas),
  });

  if (familia.isPending) return <Carregando />;
  if (familia.isError) {
    return <ErroFamilia erro={familia.error} aoTentarDeNovo={() => void familia.refetch()} />;
  }

  function mover(lista: Categoria[], indice: number, direcao: -1 | 1) {
    const ids = lista.map((c) => c.id);
    [ids[indice], ids[indice + direcao]] = [ids[indice + direcao], ids[indice]];
    reordenar.mutate(ids);
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (nome.trim()) criar.mutate();
  }

  return (
    <div className={[paginas.pagina, paginas.estreita].join(' ')}>
      <CabecalhoPagina
        trilha={[
          { rotulo: 'Famílias', para: '/familias' },
          { rotulo: familia.data.nome, para: `/familias/${familiaId}` },
          ...(voltarPara ? [{ rotulo: lista.data?.nome ?? 'Lista', para: voltarPara }] : []),
        ]}
        rotulo="Família"
        titulo="Categorias"
        descricao="A ordem daqui é a ordem dos grupos nas listas. Organize como os corredores do seu mercado."
        acoes={
          voltarPara && (
            <LinkBotao to={voltarPara} pequeno>
              <IconeVoltar tamanho={20} />
              Voltar para {lista.data?.nome ?? 'a lista'}
            </LinkBotao>
          )
        }
      />

      {categorias.isPending ? (
        <Carregando />
      ) : categorias.isError ? (
        <MensagemErro erro={categorias.error} aoTentarDeNovo={() => void categorias.refetch()} />
      ) : (
        <>
          {reordenar.isError && (
            <p className={form.erro} role="alert">
              {mensagemDe(reordenar.error)}
            </p>
          )}
          <ol className={estilos.categorias}>
            {categorias.data.map((categoria, indice, lista) => {
              // "Outros" é sempre a última; a penúltima não desce
              const ultimaMovel = indice === lista.length - 2;
              return (
                <li key={categoria.id} className={estilos.categoria}>
                  <span className={estilos.nome}>{categoria.nome}</span>
                  {categoria.fixa ? (
                    <Selo>Fixa</Selo>
                  ) : (
                    <div className={estilos.acoes}>
                      <button
                        type="button"
                        className={estilos.icone}
                        aria-label={`Mover ${categoria.nome} para cima`}
                        disabled={indice === 0 || reordenar.isPending}
                        onClick={() => mover(lista, indice, -1)}
                      >
                        <IconeSubir tamanho={20} />
                      </button>
                      <button
                        type="button"
                        className={estilos.icone}
                        aria-label={`Mover ${categoria.nome} para baixo`}
                        disabled={ultimaMovel || reordenar.isPending}
                        onClick={() => mover(lista, indice, 1)}
                      >
                        <IconeDescer tamanho={20} />
                      </button>
                      <button
                        type="button"
                        className={estilos.icone}
                        aria-label={`Renomear ${categoria.nome}`}
                        onClick={() => setRenomeando(categoria)}
                      >
                        <IconeEditar tamanho={20} />
                      </button>
                      <button
                        type="button"
                        className={[estilos.icone, estilos.perigo].join(' ')}
                        aria-label={`Excluir ${categoria.nome}`}
                        onClick={() => setExcluindo(categoria)}
                      >
                        <IconeLixeira tamanho={20} />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}

      <section className={paginas.secao} aria-labelledby="titulo-nova-categoria">
        <h2 id="titulo-nova-categoria" className={paginas.secaoTitulo}>
          Nova categoria
        </h2>
        <Card>
          <form className={form.linha} onSubmit={enviar}>
            <Campo
              rotulo="Nome da categoria"
              rotuloOculto
              placeholder="Ex.: Pet"
              maxLength={50}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              erro={mensagemDe(criar.error)}
            />
            <Botao
              type="submit"
              variante="primario"
              carregando={criar.isPending}
              disabled={!nome.trim()}
            >
              Adicionar
            </Botao>
          </form>
        </Card>
      </section>

      <ModalNome
        aberto={renomeando !== null}
        titulo="Renomear categoria"
        rotulo="Nome da categoria"
        valorInicial={renomeando?.nome ?? ''}
        carregando={renomear.isPending}
        erro={mensagemDe(renomear.error)}
        aoSalvar={(novo) => renomeando && renomear.mutate({ id: renomeando.id, novo })}
        aoFechar={() => {
          setRenomeando(null);
          renomear.reset();
        }}
      />

      <ConfirmarDialogo
        aberto={excluindo !== null}
        titulo="Excluir categoria?"
        mensagem={`Os itens de “${excluindo?.nome ?? ''}” irão para “Outros”. As compras já concluídas não mudam.`}
        textoConfirmar="Excluir"
        carregando={excluir.isPending}
        erro={mensagemDe(excluir.error)}
        aoConfirmar={() => excluindo && excluir.mutate(excluindo.id)}
        aoCancelar={() => {
          setExcluindo(null);
          excluir.reset();
        }}
      />
    </div>
  );
}
