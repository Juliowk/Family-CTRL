/**
 * Ícones da interface, todos do Lucide (traço 2, cantos arredondados, conversa com o ⌃ do logo).
 * Os nomes em português isolam o resto do app da biblioteca: trocar um desenho é mexer só aqui.
 * Tamanhos (docs/marca.md): 20px padrão, 16px em textos pequenos, 24px na navegação do celular.
 * Decorativos: sempre com aria-hidden. Botão só com ícone precisa de aria-label no botão.
 */
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  CircleAlert,
  CircleUser,
  Copy,
  Ellipsis,
  LayoutGrid,
  ListChecks,
  LogOut,
  Minus,
  Moon,
  Pencil,
  Plus,
  Share2,
  ShoppingBasket,
  ShoppingCart,
  Sun,
  Tag,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

interface Props {
  tamanho?: number;
}

function criar(Icone: LucideIcon) {
  const Componente = ({ tamanho = 20 }: Props) => (
    <Icone size={tamanho} strokeWidth={2} aria-hidden="true" focusable="false" />
  );
  Componente.displayName = Icone.displayName;
  return Componente;
}

export const IconeLista = criar(ListChecks);
export const IconeFamilia = criar(Users);
export const IconeConta = criar(CircleUser);
export const IconeVoltar = criar(ChevronLeft);
export const IconeCheck = criar(Check);
export const IconeEditar = criar(Pencil);
export const IconeMais = criar(Plus);
export const IconeMenos = criar(Minus);
export const IconeSeta = criar(ArrowRight);
export const IconeCopiar = criar(Copy);
export const IconeOpcoes = criar(Ellipsis);
export const IconeFechar = criar(X);
export const IconeAlerta = criar(CircleAlert);
export const IconeCarrinho = criar(ShoppingCart);
/** Compras concluídas (histórico): a cesta já cheia. */
export const IconeArquivo = criar(ShoppingBasket);
export const IconeTrocar = criar(ArrowLeftRight);
export const IconeSair = criar(LogOut);
export const IconeSol = criar(Sun);
export const IconeLua = criar(Moon);
export const IconeSubir = criar(ChevronUp);
export const IconeDescer = criar(ChevronDown);
export const IconeLixeira = criar(Trash2);
export const IconeEtiqueta = criar(Tag);
export const IconeCompartilhar = criar(Share2);
/** "ctrl": painel com as funcionalidades da família (grade 2×2). */
export const IconeCtrl = criar(LayoutGrid);
