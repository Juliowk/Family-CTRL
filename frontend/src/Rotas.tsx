import { Navigate, Route, Routes } from 'react-router';
import { LayoutAutenticado, LayoutPublico } from './components/Layouts';
import { Cadastro } from './paginas/Cadastro';
import { Conta } from './paginas/Conta';
import { Landing } from './paginas/Landing';
import { Login } from './paginas/Login';

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
        <Route path="inicio" element={<Navigate to="/conta" replace />} />
        <Route path="conta" element={<Conta />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
