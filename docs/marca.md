# Family Ctrl: guia de marca e aplicação

Este guia é a fonte oficial da identidade visual. Ao mexer no frontend, siga-o (cores, logo,
ícones e componentes). Ele adapta o pacote de marca original aos nomes e caminhos deste
repositório.

## 1. Decisões

| Item                | Padrão                                                                  | Secundário                |
| ------------------- | ----------------------------------------------------------------------- | ------------------------- |
| Símbolo             | Tecla ⌃ com **pontos família** (pai, mãe e filho, em tamanhos decrescentes) | Contorno monocromático |
| Assinatura          | **Horizontal escura**                                                   | Horizontal clara          |
| Tema de cor         | **Escuro**                                                              | Claro                     |
| Fonte               | Inter (400, 500, 600, 700)                                              | `system-ui`               |
| Ícones de interface | Lucide (`lucide-react`), traço 2, cantos arredondados                   | —                         |

**Conceito:** o ⌃ da tecla Control é também o telhado de uma casa. Os três pontos de tamanhos
diferentes são a família debaixo desse teto e lembram uma lista em andamento.

## 2. Onde está cada arquivo

| Arquivo                                                                   | Caminho no repositório                      |
| ------------------------------------------------------------------------- | ------------------------------------------- |
| Favicon (`favicon.svg`, `favicon-32.png`), ícones PNG, `og-image.png`, `site.webmanifest` | `frontend/public/`     |
| SVGs da marca (símbolo, assinaturas, versões mono)                        | `frontend/src/assets/brand/`                |
| Logo para o README                                                        | `docs/marca/logo-horizontal-escuro.svg`     |
| Tokens de cor, tipografia, raio e sombra                                  | `frontend/src/styles/tokens.css`            |
| Componente de logo (`Logo`, `SimboloLogo`)                                | `frontend/src/components/brand/Logo.tsx`    |
| Ícones da interface (Lucide com nomes em português)                       | `frontend/src/components/Icones.tsx`        |

O `index.html` traz favicon, `apple-touch-icon`, manifest, `theme-color`, Open Graph e a fonte
Inter. Os caminhos começam com `/`; no build o Vite adiciona o prefixo `/Family-CTRL/` do GitHub
Pages. A `og:image` usa URL absoluta. A CSP de produção (em `vite.config.ts`) libera só
`fonts.googleapis.com` e `fonts.gstatic.com` além da própria origem e da API.

## 3. Tema

O **escuro é o padrão**: sem atributo nenhum no `<html>`, o app já fica escuro. O claro é uma
opção do usuário (botão de sol/lua e tela Conta), salva no aparelho:

- `localStorage["familyctrl.tema"] = "claro"` e `<html data-theme="light">`.
- `public/tema.js` aplica a escolha antes do React carregar (sem piscar).
- `src/estado/tema.ts` (`useTema`) é a fonte da verdade no React.

Não usamos `prefers-color-scheme` para decidir o tema inicial: o escuro é a identidade.

## 4. Cores

### Paleta (primitivos `--fc-*`, só em `tokens.css`)

| Nome                  | Hex                               | Papel                                          |
| --------------------- | --------------------------------- | ---------------------------------------------- |
| Preto                 | `#0F0F14`                         | fundo (escuro) · texto (claro)                 |
| Cinza 950 / 900 / 800 | `#17171F` / `#1F1F29` / `#2E2E3A` | superfícies e bordas no escuro                 |
| Cinza 400 / 500       | `#A1A1AA` / `#71717A`             | texto secundário (escuro / claro)              |
| Cinza 50 / 100 / 200  | `#FAFAFA` / `#F4F4F5` / `#E4E4E7` | fundo, superfícies e bordas no claro           |
| Roxo 600 (marca)      | `#7C3AED`                         | ação principal                                 |
| Roxo 700              | `#6D28D9`                         | hover da ação principal                        |
| Lavanda 400           | `#A78BFA`                         | destaque no escuro (links, ícone ativo, "ctrl") |

### Tokens semânticos (use sempre estes nos componentes)

| Token do projeto         | Token do guia original | Escuro (padrão) | Claro     | Uso                               |
| ------------------------ | ---------------------- | --------------- | --------- | --------------------------------- |
| `--cor-fundo`            | `--color-bg`           | `#0F0F14`       | `#FAFAFA` | fundo da página                   |
| `--cor-superficie`       | `--color-surface`      | `#17171F`       | `#FFFFFF` | cards, navbar, modais             |
| `--cor-superficie-2`     | `--color-surface-2`    | `#1F1F29`       | `#F4F4F5` | inputs, hover de item             |
| `--cor-borda`            | `--color-border`       | `#2E2E3A`       | `#E4E4E7` | bordas e divisores                |
| `--cor-texto`            | `--color-text`         | `#FAFAFA`       | `#0F0F14` | texto principal                   |
| `--cor-texto-secundario` | `--color-text-muted`   | `#A1A1AA`       | `#71717A` | legendas, placeholders            |
| `--cor-primaria`         | `--color-primary`      | `#7C3AED`       | `#7C3AED` | botão principal, checkbox marcado |
| `--cor-primaria-texto`   | `--color-on-primary`   | `#FFFFFF`       | `#FFFFFF` | texto/ícone sobre o primário      |
| `--cor-destaque`         | `--color-accent`       | `#A78BFA`       | `#7C3AED` | links, ícone/aba ativa            |
| `--cor-destaque-suave`   | `--color-primary-soft` | roxo 16%        | `#EDE9FE` | badges, item selecionado          |
| `--sombra-tecla`         | `--shadow-key`         | preto 60%       | `#D4D4D8` | só no botão primário              |

Os nomes ficaram em português para seguir o restante do código. Todos os pares de texto/fundo
passam no **WCAG AA** (≥ 4,5:1): lavanda sobre preto 7,0:1, branco sobre roxo 5,7:1, cinza 500
sobre `#FAFAFA` 4,6:1.

### Regras de uso

1. **Proporção:** cerca de 60% de neutros de fundo, 30% de superfícies e texto e no máximo 10% de
   roxo. O roxo indica ação ou estado, nunca decoração.
2. **Um botão primário por tela.** As demais ações usam o secundário (`superficie-2` + borda) ou
   o fantasma.
3. **Lavanda só no tema escuro.** O token `--cor-destaque` já troca para o roxo 600 no claro.
4. **Nada de hex nos componentes.** Use sempre `var(--cor-*)`. A única exceção é o logo, que tem
   cores oficiais fixas por versão.
5. **Sem gradientes.** O "volume" da marca vem da sombra sólida de tecla (`--sombra-tecla`), só
   no botão primário (e num futuro botão flutuante de "novo item").
6. Cores de estado (`--cor-sucesso`, `--cor-atencao`, `--cor-perigo`) só em mensagens e
   validações. Nunca use o roxo para indicar erro ou sucesso.

## 5. Logo

### Qual usar

| Situação                                     | Como                                                    |
| -------------------------------------------- | ------------------------------------------------------- |
| Topo, rodapé (segue o tema)                  | `<Logo tema={tema} />` com `const [tema] = useTema()`   |
| Barra lateral (sempre escura)                | `<Logo tema="escuro" />`                                |
| Símbolo sozinho, ≥ 48px                      | `<SimboloLogo tamanho={56} />` ou `<Logo variante="icone" tamanho={56} />` |
| Símbolo < 48px                               | versão simplificada (o componente troca sozinho)        |
| Impressão, marca d'água, fundo fotográfico   | `assets/brand/simbolo-mono-preto.svg` / `-branco.svg`   |
| README do GitHub                             | `docs/marca/logo-horizontal-escuro.svg`                 |

`<Logo />` tem nome acessível "Family Ctrl" (`role="img"`); o desenho e a palavra ficam
escondidos dos leitores de tela. `SimboloLogo` é decorativo (`aria-hidden`).

### Regras

- **Área de respiro:** metade da altura do símbolo em volta de toda a assinatura.
- **Tamanho mínimo:** símbolo com 16px (simplificado) e assinatura horizontal com 120px de largura.
- **Nome:** a assinatura é sempre `familyctrl`, minúsculo e junto, com "family" em Bold e "ctrl" em
  Regular na cor de destaque. Em texto corrido escreva "Family Ctrl".
- **Não faça:** esticar ou rotacionar o símbolo, trocar as cores fora das versões oficiais,
  colocar o símbolo escuro sobre fundo roxo, usar os pontos todos do mesmo tamanho, aplicar
  sombra ou gradiente extra, escrever "FamilyCtrl" ou "Family-Ctrl".

### Construção (grade de 64u)

- Fundo: quadrado de 64u com raio 16.
- Tecla: 40×38u, raio 10, com 3u de "lábio" inferior.
- ⌃: traço de 5u e ângulo de 90°, com o vértice no eixo central.
- Pontos: raios 3,1 / 2,6 / 2,0u, centrados em y = 40.
- Versão simplificada: sem a tecla, ⌃ com 7,5u e pontos com raios 4,6 / 3,8 / 3,0u.

## 6. Ícones de interface

Lucide, sempre por meio de `components/Icones.tsx` (nomes em português, `aria-hidden`):

```tsx
import { IconeCarrinho } from '../components/Icones';

<IconeCarrinho />              // 20px
<IconeCheck tamanho={16} />    // em texto pequeno
```

| Regra                   | Valor                                                     |
| ----------------------- | --------------------------------------------------------- |
| Tamanho                 | 20px padrão, 16px em textos pequenos, 24px na barra inferior do celular |
| Traço                   | 2 (nunca misture com ícones preenchidos)                  |
| Cor                     | `currentColor` (herda do texto)                           |
| Ícone ativo/selecionado | `--cor-destaque`                                          |
| Dentro do primário      | `--cor-primaria-texto`                                    |
| Ícone sozinho clicável  | área de toque ≥ 44×44px + `aria-label` no botão           |

| Uso no app                 | Nome no projeto   | Ícone Lucide      |
| -------------------------- | ----------------- | ----------------- |
| Listas / itens planejados  | `IconeLista`      | `ListChecks`      |
| Comprar                    | `IconeCarrinho`   | `ShoppingCart`    |
| Compras concluídas         | `IconeArquivo`    | `ShoppingBasket`  |
| Família                    | `IconeFamilia`    | `Users`           |
| Conta / sair               | `IconeConta` / `IconeSair` | `CircleUser` / `LogOut` |
| Ações                      | `IconeMais`, `IconeEditar`, `IconeLixeira`, `IconeCheck`, `IconeFechar` | `Plus`, `Pencil`, `Trash2`, `Check`, `X` |
| Tema                       | `IconeLua` / `IconeSol` | `Moon` / `Sun` |
| "ctrl" (funcionalidades)   | `IconeCtrl`       | `LayoutGrid`      |

Ícone novo: adicione em `Icones.tsx` com `criar(NomeLucide)`, sem importar `lucide-react` direto
nas telas.

## 7. Componentes

- **Botão primário** (`Botao` com `variante="primario"`): fundo `--cor-primaria`, raio 10px,
  `--sombra-tecla`. Ao ser pressionado desce 2px e perde a sombra, "apertando a tecla". É o único
  lugar em que a metáfora do logo vira interação.
- **Card:** `--cor-superficie`, borda `--cor-borda`, raio 16px (o mesmo do ícone).
- **Campo:** `--cor-superficie-2`, borda, raio 10px, altura 48px.
- **Item da lista:** raio 10px, hover em `--cor-superficie-2`; marcado com check no
  `--cor-primaria`.

## 8. Checklist

- [x] Arquivos em `public/`, `src/assets/brand/`, `src/styles/` e `src/components/brand/`
- [x] `index.html` com favicon, manifest, theme-color, Open Graph e Inter
- [x] Tokens da marca em `tokens.css`, sem hex nos componentes
- [x] `lucide-react` com ícones padronizados em 20px / traço 2
- [x] `<Logo />` no topo, na barra lateral e no rodapé; símbolo no painel do login/cadastro
- [x] Tema escuro padrão, claro opcional (botão de tema e tela Conta)
- [x] Logo no topo do `README.md`
- [ ] Conferir contraste e foco visível (`Tab`) nos dois temas a cada tela nova
