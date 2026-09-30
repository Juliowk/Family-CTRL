import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ApiError } from '../api/cliente';
import { familiasApi } from '../api/endpoints';
import type { FamiliaResumo } from '../api/tipos';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { Carregando, EstadoVazio, MensagemErro } from '../components/Estados';
import form from '../components/Formulario.module.css';
import { chaves } from '../estado/chaves';
import { useFamiliaAtual } from '../estado/familiaAtual';
import cartoes from './Cartoes.module.css';
import estilos from './Paginas.module.css';

/** Minhas famílias: alternar entre elas, criar uma nova ou entrar com código de convite. */
export function Familias() {
  const queryClient = useQueryClient();
  const navegar = useNavigate();
  const [familiaAtual, definirFamiliaAtual] = useFamiliaAtual();
  const familias = useQuery({ queryKey: chaves.familias, queryFn: familiasApi.listar });

  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');

  function abrir(familia: FamiliaResumo) {
    definirFamiliaAtual(familia.id);
    void queryClient.invalidateQueries({ queryKey: chaves.familias });
    navegar(`/familias/${familia.id}`);
  }

  const criar = useMutation({ mutationFn: familiasApi.criar, onSuccess: abrir });
  const entrar = useMutation({ mutationFn: familiasApi.entrar, onSuccess: abrir });

  function enviarCriar(evento: FormEvent) {
    evento.preventDefault();
    if (nome.trim()) criar.mutate(nome.trim());
  }

  function enviarEntrar(evento: FormEvent) {
    evento.preventDefault();
    if (codigo.trim()) entrar.mutate(codigo.trim());
  }

  const erroEntrar =
    entrar.error instanceof ApiError
      ? entrar.error.status === 404
        ? 'Código de convite inválido.'
        : entrar.error.message
      : undefined;

  return (
    <div className={estilos.pagina}>
      <div className={estilos.cabecalho}>
        <h1>Suas famílias</h1>
        <p className={estilos.subtitulo}>Escolha uma família para ver as listas.</p>
      </div>

      {familias.isPending ? (
        <Carregando linhas={2} />
      ) : familias.isError ? (
        <MensagemErro erro={familias.error} aoTentarDeNovo={() => void familias.refetch()} />
      ) : familias.data.length === 0 ? (
        <EstadoVazio titulo="Você ainda não participa de nenhuma família">
          Crie uma família ou entre com o código de convite que alguém te passou.
        </EstadoVazio>
      ) : (
        <ul className={estilos.lista}>
          {familias.data.map((familia) => (
            <li key={familia.id}>
              <Link
                to={`/familias/${familia.id}`}
                className={cartoes.cartao}
                onClick={() => definirFamiliaAtual(familia.id)}
              >
                <div className={cartoes.cartaoTopo}>
                  <span className={cartoes.cartaoTitulo}>{familia.nome}</span>
                  {familia.id === familiaAtual && <span className={cartoes.selo}>Atual</span>}
                </div>
                <span className={cartoes.cartaoMeta}>
                  {familia.totalMembros} {familia.totalMembros === 1 ? 'membro' : 'membros'}
                  {familia.meuPapel === 'ADMIN' && ' · você é ADMIN'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className={estilos.secao} aria-labelledby="titulo-criar">
        <h2 id="titulo-criar" className={estilos.secaoTitulo}>
          Criar família
        </h2>
        <form className={form.linha} onSubmit={enviarCriar}>
          <Campo
            rotulo="Nome da família"
            rotuloOculto
            placeholder="Ex.: Casa da Ana"
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
            Criar
          </Botao>
        </form>
      </section>

      <section className={estilos.secao} aria-labelledby="titulo-entrar">
        <h2 id="titulo-entrar" className={estilos.secaoTitulo}>
          Entrar com código
        </h2>
        <form className={form.linha} onSubmit={enviarEntrar}>
          <Campo
            rotulo="Código de convite"
            rotuloOculto
            placeholder="Ex.: K7M2Q9XA"
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={12}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            erro={erroEntrar}
          />
          <Botao type="submit" carregando={entrar.isPending} disabled={!codigo.trim()}>
            Entrar
          </Botao>
        </form>
      </section>
    </div>
  );
}
