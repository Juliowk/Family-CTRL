import { Navigate, Route, Routes } from 'react-router';
import { LayoutAutenticado, LayoutPublico } from './components/Layouts';
import { useFamiliaAtual } from './estado/familiaAtual';
import { Cadastro } from './paginas/Cadastro';
import { Categorias } from './paginas/Categorias';
import { CompraConcluida } from './paginas/CompraConcluida';
import { Conta } from './paginas/Conta';
import { FamiliaListas } from './paginas/FamiliaListas';
import { FamiliaMembros } from './paginas/FamiliaMembros';
import { Familias } from './paginas/Familias';
import { FinalizarCompra } from './paginas/FinalizarCompra';
import { Landing } from './paginas/Landing';
import { ListaPagina } from './paginas/ListaPagina';
import { Login } from './paginas/Login';

/** Após o login: abre a última família usada ou a tela para escolher uma. */
function Inicio() {
  const [familiaAtual] = useFamiliaAtual();
  return <Navigate to={familiaAtual ? `/familias/${familiaAtual}` : '/familias'} replace />;
}

/** Mapa de rotas do app (separado do roteador para poder ser testado com MemoryRouter). */
export function Rotas() {
  return (
    <Routes>
      <Route element={<LayoutPublico />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="cadastro" element={<Cadastro />} />
      </Route>
      <Route element={<LayoutAutenticado />}>
        <Route path="inicio" element={<Inicio />} />
        <Route path="familias" element={<Familias />} />
        <Route path="familias/:familiaId" element={<FamiliaListas />} />
        <Route path="familias/:familiaId/membros" element={<FamiliaMembros />} />
        <Route path="familias/:familiaId/categorias" element={<Categorias />} />
        {/* Sem aba na URL, a lista abre em "planejar" */}
        <Route path="listas/:listaId" element={<ListaPagina />} />
        <Route path="listas/:listaId/finalizar" element={<FinalizarCompra />} />
        <Route path="listas/:listaId/:aba" element={<ListaPagina />} />
        <Route path="compras/:compraId" element={<CompraConcluida />} />
        <Route path="conta" element={<Conta />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
