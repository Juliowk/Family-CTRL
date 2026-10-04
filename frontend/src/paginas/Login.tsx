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
import { MolduraAuth } from './MolduraAuth';

export function Login() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrarDeMim, setLembrarDeMim] = useState(false);

  const login = useMutation({ mutationFn: authApi.login, onSuccess: entrar });
  const erro = login.error instanceof ApiError ? login.error : undefined;

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    login.mutate({ email, senha, lembrarDeMim });
  }

  return (
    <MolduraAuth
      rotulo="Acesse sua conta"
      titulo="Entrar"
      subtitulo="Acesse as listas da sua família."
      rodape={
        <>
          Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
        </>
      }
    >
      <form className={form.formulario} onSubmit={enviar} noValidate>
        <Campo
          rotulo="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          erro={erro?.erroDoCampo('email')}
        />
        <Campo
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          erro={erro?.erroDoCampo('senha')}
        />
        <label className={form.caixa}>
          <input
            type="checkbox"
            checked={lembrarDeMim}
            onChange={(e) => setLembrarDeMim(e.target.checked)}
          />
          Lembrar de mim por 7 dias
        </label>
        {erro && erro.erros.length === 0 && (
          <p className={form.erro} role="alert">
            {erro.message}
          </p>
        )}
        <Botao type="submit" variante="primario" larguraTotal carregando={login.isPending}>
          Entrar
        </Botao>
        <AvisoServidorAcordando ativo={login.isPending} />
      </form>
    </MolduraAuth>
  );
}
