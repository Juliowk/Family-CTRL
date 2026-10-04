import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { lerToken } from '../api/token';
import { criarApiFalsa, SENHA_CORRETA } from './apiFalsa';
import { renderizarApp } from './renderizar';

describe('login', () => {
  it('entra com e-mail e senha e abre as famílias do usuário', async () => {
    criarApiFalsa();
    const { usuario } = renderizarApp('/login');

    await usuario.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await usuario.type(screen.getByLabelText('Senha'), SENHA_CORRETA);
    await usuario.click(screen.getByLabelText(/lembrar de mim/i));
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Suas famílias' })).toBeInTheDocument();
    expect(await screen.findByText('Casa da Ana')).toBeInTheDocument();
    expect(lerToken()).toBe('token-de-teste');
  });

  it('envia "lembrar de mim" para a API', async () => {
    const { chamadas } = criarApiFalsa();
    const { usuario } = renderizarApp('/login');

    await usuario.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await usuario.type(screen.getByLabelText('Senha'), SENHA_CORRETA);
    await usuario.click(screen.getByLabelText(/lembrar de mim/i));
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(chamadas.find((c) => c.caminho === '/api/auth/login')?.corpo).toMatchObject({
        lembrarDeMim: true,
      }),
    );
  });

  it('mostra erro com senha incorreta', async () => {
    criarApiFalsa();
    const { usuario } = renderizarApp('/login');

    await usuario.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await usuario.type(screen.getByLabelText('Senha'), 'senha-errada');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(lerToken()).toBeNull();
  });

  it('com token expirado volta para o login', async () => {
    const { estado } = criarApiFalsa();
    estado.tokenExpirado = true;
    renderizarApp('/familias', { logado: true });

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(lerToken()).toBeNull();
  });

  it('sem token, páginas internas levam ao login', async () => {
    criarApiFalsa();
    renderizarApp('/listas/100');
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });
});

describe('cadastro', () => {
  it('valida senha curta e confirmação diferente antes de chamar a API', async () => {
    const { chamadas } = criarApiFalsa();
    const { usuario } = renderizarApp('/cadastro');

    await usuario.type(screen.getByLabelText('Nome'), 'Ana');
    await usuario.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await usuario.type(screen.getByLabelText('Senha'), 'curta');
    await usuario.type(screen.getByLabelText('Confirme a senha'), 'outra');
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(screen.getByText('A senha deve ter pelo menos 8 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('As senhas não conferem.')).toBeInTheDocument();
    expect(chamadas.some((c) => c.caminho === '/api/auth/cadastro')).toBe(false);
  });
});

describe('listas', () => {
  it('cria uma lista e abre a tela dela', async () => {
    const { chamadas } = criarApiFalsa();
    const { usuario } = renderizarApp('/familias/10', { logado: true });

    expect(await screen.findByRole('heading', { name: 'Casa da Ana' })).toBeInTheDocument();
    expect(await screen.findByText('Mercado')).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Nome da nova lista'), 'Feira');
    await usuario.click(screen.getByRole('button', { name: 'Criar lista' }));

    expect(await screen.findByRole('heading', { name: 'Feira' })).toBeInTheDocument();
    expect(screen.getByText('Nenhum item ainda')).toBeInTheDocument();
    expect(chamadas).toContainEqual(
      expect.objectContaining({
        metodo: 'POST',
        caminho: '/api/familias/10/listas',
        corpo: { nome: 'Feira' },
      }),
    );
  });

  it('mostra estado vazio quando a família não tem listas', async () => {
    const { estado } = criarApiFalsa();
    estado.listas = [];
    renderizarApp('/familias/10', { logado: true });

    expect(await screen.findByText('Nenhuma lista ainda')).toBeInTheDocument();
  });
});

describe('itens', () => {
  it('adiciona um item e marca como comprado com um toque', async () => {
    const { chamadas } = criarApiFalsa();
    const { usuario } = renderizarApp('/listas/100', { logado: true });

    expect(await screen.findByRole('heading', { name: 'Mercado' })).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Novo item'), 'Leite');
    await usuario.click(screen.getByRole('button', { name: 'Adicionar' }));

    const lista = await screen.findByRole('list', { name: 'Itens da lista' });
    const botaoItem = within(lista).getByRole('button', { name: /Leite/, pressed: false });
    expect(screen.getByLabelText('Novo item')).toHaveValue('');

    await usuario.click(botaoItem);

    // Atualização otimista: muda antes mesmo da resposta da API
    expect(within(lista).getByRole('button', { name: /Leite/, pressed: true })).toBeInTheDocument();
    expect(await within(lista).findByText('Comprado por Ana')).toBeInTheDocument();
    expect(screen.getByText('1 de 1 comprados')).toBeInTheDocument();
    await waitFor(() =>
      expect(chamadas).toContainEqual(
        expect.objectContaining({ metodo: 'PATCH', corpo: { comprado: true } }),
      ),
    );
  });

  it('desfaz a marcação se a API falhar', async () => {
    const { estado } = criarApiFalsa();
    estado.itens.push({
      id: 1,
      listaId: 100,
      nome: 'Pão',
      quantidade: '6',
      observacao: null,
      comprado: false,
      compradoPor: null,
      adicionadoPor: { id: 1, nome: 'Ana' },
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    });
    estado.falharAtualizacaoDeItem = true;
    const { usuario } = renderizarApp('/listas/100', { logado: true });

    await usuario.click(await screen.findByRole('button', { name: /Pão/, pressed: false }));

    expect(await screen.findByText(/Não foi possível atualizar o item/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pão/, pressed: false })).toBeInTheDocument();
  });
});

describe('tema', () => {
  it('começa claro, alterna para escuro e lembra a escolha', async () => {
    criarApiFalsa();
    const { usuario } = renderizarApp('/');

    expect(document.documentElement.dataset.theme).toBeUndefined();
    await usuario.click(screen.getByRole('button', { name: 'Usar tema escuro' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('familyctrl.tema')).toBe('escuro');
    await usuario.click(screen.getByRole('button', { name: 'Usar tema claro' }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});
