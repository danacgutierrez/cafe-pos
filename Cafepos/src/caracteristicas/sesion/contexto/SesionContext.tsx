// La sesión se comparte por contexto; el carrito y el catálogo viven en Zustand.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import * as servicio from '../servicios/sesion.ts';
import { useCarrito } from '../../carrito/estado/carrito.ts';
import type { DatosRegistro } from '../servicios/sesion.ts';
import type { PayloadJwt, Sesion } from '../../../compartido/api/tipos.ts';

interface ValorSesion {
  usuario: PayloadJwt | null;
  entrar: (correo: string, password: string) => Promise<void>;
  registrar: (datos: DatosRegistro) => Promise<void>;
  salir: () => void;
  aviso: string | null;
  descartarAviso: () => void;
}

const SesionContext = createContext<ValorSesion | null>(null);

function leerUsuario(): PayloadJwt | null {
  const guardado = localStorage.getItem('usuario');
  if (!guardado) return null;
  try {
    return JSON.parse(guardado) as PayloadJwt;
  } catch {
    return null;
  }
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const navegar = useNavigate();
  const [usuario, setUsuario] = useState<PayloadJwt | null>(leerUsuario);
  const [aviso, setAviso] = useState<string | null>(null);

  function guardar(sesion: Sesion) {
    localStorage.setItem('token', sesion.token);
    localStorage.setItem('usuario', JSON.stringify(sesion.usuario));
    setAviso(null);
    setUsuario(sesion.usuario);
  }

  async function entrar(correo: string, password: string) {
    guardar(await servicio.entrar(correo, password));
  }

  async function registrar(datos: DatosRegistro) {
    guardar(await servicio.registrar(datos));
  }

  function salir() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    // El carrito es del cliente que está entrando: se vacía al cerrar sesión.
    useCarrito.getState().vaciar();
    setAviso(null);
    setUsuario(null);
    navegar('/entrar', { replace: true });
  }

  useEffect(() => {
    // El interceptor de Axios avisa cuando el servicio dice que el token ya no vale.
    const alTerminar = () => {
      setUsuario(null);
      setAviso('Tu sesión terminó. Vuelve a entrar.');
    };
    window.addEventListener('sesion-terminada', alTerminar);
    return () => window.removeEventListener('sesion-terminada', alTerminar);
  }, []);

  return (
    <SesionContext value={{ usuario, entrar, registrar, salir, aviso, descartarAviso: () => setAviso(null) }}>
      {children}
    </SesionContext>
  );
}

export function useSesion() {
  const valor = useContext(SesionContext);
  if (!valor) throw new Error('useSesion() tiene que usarse dentro de <ProveedorSesion>');
  return valor;
}
