import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../api/cliente';
import { authApi } from '../api/endpoints';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { AvisoServidorAcordando } from '../components/Estados';
import form from '../components/Formulario.module.css';
import { useAuth } from '../estado/auth';
import estilos from './Paginas.module.css';

const SENHA_MINIMA = 8;

export function Cadastro() {
  const { entrar } = useAuth();
  const [dados, setDados] = useState({ nome: '', email: '', senha: '', confirmacaoSenha: '' });
  const [errosLocais, setErrosLocais] = useState<Record<string, string>>({});

  const cadastro = useMutation({ mutationFn: authApi.cadastrar, onSuccess: entrar });
  const erroApi = cadastro.error instanceof ApiError ? cadastro.error : undefined;

  function atualizar(campo: keyof typeof dados, valor: string) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
  }

  /** Validação no navegador: feedback imediato. O backend valida de novo de qualquer forma. */
  function validar(): Record<string, string> {
    const erros: Record<string, string> = {};
    if (!dados.nome.trim()) erros.nome = 'Informe seu nome.';
    if (!/^\S+@\S+\.\S+$/.test(dados.email.trim())) erros.email = 'Informe um e-mail válido.';
    if (dados.senha.length < SENHA_MINIMA)
      erros.senha = `A senha deve ter pelo menos ${SENHA_MINIMA} caracteres.`;
    if (dados.confirmacaoSenha !== dados.senha) erros.confirmacaoSenha = 'As senhas não conferem.';
    return erros;
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const erros = validar();
    setErrosLocais(erros);
    if (Object.keys(erros).length === 0) cadastro.mutate(dados);
  }

  const erroDe = (campo: string) => errosLocais[campo] ?? erroApi?.erroDoCampo(campo);

  return (
    <div className={estilos.pagina}>
      <div className={estilos.cabecalho}>
        <h1>Criar conta</h1>
        <p className={estilos.subtitulo}>Leva menos de um minuto.</p>
      </div>
      <form className={form.formulario} onSubmit={enviar} noValidate>
        <Campo
          rotulo="Nome"
          autoComplete="name"
          required
          value={dados.nome}
          onChange={(e) => atualizar('nome', e.target.value)}
          erro={erroDe('nome')}
        />
        <Campo
          rotulo="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={dados.email}
          onChange={(e) => atualizar('email', e.target.value)}
          erro={erroDe('email')}
        />
        <Campo
          rotulo="Senha"
          type="password"
          autoComplete="new-password"
          required
          dica={`Mínimo de ${SENHA_MINIMA} caracteres.`}
          value={dados.senha}
          onChange={(e) => atualizar('senha', e.target.value)}
          erro={erroDe('senha')}
        />
        <Campo
          rotulo="Confirme a senha"
          type="password"
          autoComplete="new-password"
          required
          value={dados.confirmacaoSenha}
          onChange={(e) => atualizar('confirmacaoSenha', e.target.value)}
          erro={erroDe('confirmacaoSenha')}
        />
        {erroApi && erroApi.erros.length === 0 && (
          <p className={form.erro} role="alert">
            {erroApi.message}
          </p>
        )}
        <Botao type="submit" variante="primario" larguraTotal carregando={cadastro.isPending}>
          Criar conta
        </Botao>
        <AvisoServidorAcordando ativo={cadastro.isPending} />
      </form>
      <p className={estilos.rodapeForm}>
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </div>
  );
}
