import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ApiError } from '../api/cliente';
import { familiasApi } from '../api/endpoints';
import type { FamiliaResumo } from '../api/tipos';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { Avatar } from '../components/Avatar';
import { CabecalhoPagina } from '../components/CabecalhoPagina';
import { CardNumerado } from '../components/Card';
import { Carregando, EstadoVazio, MensagemErro } from '../components/Estados';
import { IconeFamilia, IconeSeta } from '../components/Icones';
import { Selo } from '../components/Selo';
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
      <CabecalhoPagina
        titulo="Suas famílias"
        descricao="Escolha uma família para ver as listas, crie uma nova ou entre com um código."
      />

      {familias.isPending ? (
        <Carregando linhas={2} />
      ) : familias.isError ? (
        <MensagemErro erro={familias.error} aoTentarDeNovo={() => void familias.refetch()} />
      ) : familias.data.length === 0 ? (
        <EstadoVazio icone={<IconeFamilia />} titulo="Você ainda não participa de nenhuma família">
          Crie uma família ou entre com o código de convite que alguém te passou.
        </EstadoVazio>
      ) : (
        <ul className={estilos.grade}>
          {familias.data.map((familia) => {
            const atual = familia.id === familiaAtual;
            return (
              <li key={familia.id}>
                <Link
                  to={`/familias/${familia.id}`}
                  className={cartoes.cartao}
                  data-estado={atual ? 'atual' : undefined}
                  onClick={() => definirFamiliaAtual(familia.id)}
                >
                  <div className={cartoes.cartaoTopo}>
                    <div className={cartoes.cartaoIdentidade}>
                      <Avatar nome={familia.nome} />
                      <span className={cartoes.cartaoTitulo}>{familia.nome}</span>
                    </div>
                    <span className={cartoes.cartaoSeta}>
                      <IconeSeta tamanho={20} />
                    </span>
                  </div>
                  <div className={cartoes.cartaoSelos}>
                    {atual && (
                      <Selo tom="destaque" ponto>
                        Atual
                      </Selo>
                    )}
                    <Selo>
                      {familia.totalMembros} {familia.totalMembros === 1 ? 'membro' : 'membros'}
                    </Selo>
                    {familia.meuPapel === 'ADMIN' && <Selo>Você é ADMIN</Selo>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className={estilos.grade}>
        <CardNumerado
          numero={1}
          titulo="Criar família"
          descricao="Você vira ADMIN e recebe um código para convidar os outros."
        >
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
        </CardNumerado>

        <CardNumerado
          numero={2}
          titulo="Entrar com código"
          descricao="Peça o código de convite a alguém da família."
        >
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
        </CardNumerado>
      </div>
    </div>
  );
}
