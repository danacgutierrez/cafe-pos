import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { Layout } from '../compartido/componentes/Layout.tsx';
import { NoEncontrado } from '../compartido/componentes/NoEncontrado.tsx';
import { RutaProtegida } from '../compartido/componentes/RutaProtegida.tsx';

const PaginaMenu = lazy(() => import('../caracteristicas/catalogo/paginas/PaginaMenu.tsx'));
const PaginaCarrito = lazy(() => import('../caracteristicas/carrito/paginas/PaginaCarrito.tsx'));
const PaginaEntrar = lazy(() => import('../caracteristicas/sesion/paginas/PaginaEntrar.tsx'));
const PaginaRegistro = lazy(() => import('../caracteristicas/sesion/paginas/PaginaRegistro.tsx'));
const PaginaCheckout = lazy(() => import('../caracteristicas/pedidos/paginas/PaginaCheckout.tsx'));
const PaginaPedidos = lazy(() => import('../caracteristicas/pedidos/paginas/PaginaPedidos.tsx'));
const PaginaSeguimiento = lazy(() => import('../caracteristicas/pedidos/paginas/PaginaSeguimiento.tsx'));
const PaginaRecompensas = lazy(() => import('../caracteristicas/recompensas/paginas/PaginaRecompensas.tsx'));
const PaginaPerfil = lazy(() => import('../caracteristicas/sesion/paginas/PaginaPerfil.tsx'));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/menu" replace />} />

        {/* Flujo público del cliente */}
        <Route path="menu" element={<PaginaMenu />} />
        <Route path="menu/:idBebida" element={<PaginaMenu />} />
        <Route path="carrito" element={<PaginaCarrito />} />
        <Route path="entrar" element={<PaginaEntrar />} />
        <Route path="registro" element={<PaginaRegistro />} />

        {/* Sólo cliente autenticado. No hay rutas de staff/admin. */}
        <Route element={<RutaProtegida />}>
          <Route path="checkout" element={<PaginaCheckout />} />
          <Route path="pedidos" element={<PaginaPedidos />} />
          <Route path="pedidos/:id" element={<PaginaSeguimiento />} />
          <Route path="recompensas" element={<PaginaRecompensas />} />
          <Route path="perfil" element={<PaginaPerfil />} />
        </Route>

        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  );
}
