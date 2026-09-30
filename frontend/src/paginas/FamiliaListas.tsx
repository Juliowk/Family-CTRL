import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ApiError } from '../api/cliente';
import { listasApi } from '../api/endpoints';
import type { Lista } from '../api/tipos';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { Carregando, EstadoVazio, MensagemErro } from '../components/Estados';
import form from '../components/Formulario.module.css';
import { Progresso } from '../components/Progresso';
import { chaves } from '../estado/chaves';
import cartoes from './Cartoes.module.css';
import { ErroFamilia } from './FamiliaNaoEncontrada';
import estilos from './Paginas.module.css';
import { useFamiliaDaRota } from './useFamiliaDaRota';

/** Tela inicial da família: listas ativas com progresso e criação de nova lista. */
export function FamiliaListas() {
  const queryClient = useQueryClient();
  const navegar = useNavigate();
  const { familiaId, familia } = useFamiliaDaRota();
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);
  const [nome, setNome] = useState('');

  const ativas = useQuery({
    queryKey: chaves.listas(familiaId, false),
    queryFn: () => listasApi.listar(familiaId, false),
    enabled: familia.isSuccess,
  });

  const criar = useMutation({
    mutationFn: (nomeLista: string) => listasApi.criar(familiaId, nomeLista),
    onSuccess: (lista) => {
      setNome('');
      void queryClient.invalidateQueries({ queryKey: chaves.todasListas });
      navegar(`/listas/${lista.id}`);
    },
  });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (nome.trim()) criar.mutate(nome.trim());
  }

  if (familia.isPending) return <Carregando />;
  if (familia.isError) {
    return <ErroFamilia erro={familia.error} aoTentarDeNovo={() => void familia.refetch()} />;
  }

  return (
    <div className={estilos.pagina}>
      <div className={estilos.cabecalho}>
        <div className={estilos.cabecalhoLinha}>
          <h1>{familia.data.nome}</h1>
          <Link to="/familias" className={estilos.linkDiscreto}>
            Trocar
          </Link>
        </div>
        <p className={estilos.subtitulo}>Listas de compras</p>
      </div>

      <form className={form.linha} onSubmit={enviar}>
        <Campo
          rotulo="Nome da nova lista"
          rotuloOculto
          placeholder="Nova lista (ex.: Mercado)"
          maxLength={100}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={criar.error instanceof ApiError ? criar.error.message : undefined}
        />
        <Botao
          type="submit"
          variante="primario"
          carregando={criar.isPending}
          disabled={!nome.trim()}
        >
          Criar lista
        </Botao>
      </form>

      {ativas.isPending ? (
        <Carregando />
      ) : ativas.isError ? (
        <MensagemErro erro={ativas.error} aoTentarDeNovo={() => void ativas.refetch()} />
      ) : ativas.data.length === 0 ? (
        <EstadoVazio titulo="Nenhuma lista ainda">Crie a primeira lista acima.</EstadoVazio>
      ) : (
        <CartoesDeListas listas={ativas.data} />
      )}

      <Botao variante="fantasma" onClick={() => setMostrarArquivadas((v) => !v)}>
        {mostrarArquivadas ? 'Ocultar arquivadas' : 'Ver arquivadas'}
      </Botao>
      {mostrarArquivadas && <ListasArquivadas familiaId={familiaId} />}
    </div>
  );
}

function CartoesDeListas({ listas }: { listas: Lista[] }) {
  return (
    <ul className={estilos.lista}>
      {listas.map((lista) => (
        <li key={lista.id}>
          <Link to={`/listas/${lista.id}`} className={cartoes.cartao}>
            <span className={cartoes.cartaoTitulo}>{lista.nome}</span>
            <Progresso comprados={lista.itensComprados} total={lista.totalItens} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ListasArquivadas({ familiaId }: { familiaId: number }) {
  const arquivadas = useQuery({
    queryKey: chaves.listas(familiaId, true),
    queryFn: () => listasApi.listar(familiaId, true),
  });

  return (
    <section className={estilos.secao} aria-labelledby="titulo-arquivadas">
      <h2 id="titulo-arquivadas" className={estilos.secaoTitulo}>
        Arquivadas
      </h2>
      {arquivadas.isPending ? (
        <Carregando linhas={1} />
      ) : arquivadas.isError ? (
        <MensagemErro erro={arquivadas.error} aoTentarDeNovo={() => void arquivadas.refetch()} />
      ) : arquivadas.data.length === 0 ? (
        <EstadoVazio titulo="Nenhuma lista arquivada" />
      ) : (
        <CartoesDeListas listas={arquivadas.data} />
      )}
    </section>
  );
}
