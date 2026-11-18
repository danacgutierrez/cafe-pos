import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useSesion } from '../contexto/SesionContext.tsx';
import { Campo } from '../../../compartido/componentes/Campo.tsx';
import { mensajeDeError } from '../../../compartido/api/errores.ts';

interface Errores {
  correo?: string;
  password?: string;
}

export default function PaginaEntrar() {
  const { entrar } = useSesion();
  const navegar = useNavigate();
  const desde = (useLocation().state as { desde?: string } | null)?.desde ?? '/menu';

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function validar(): Errores {
    const e: Errores = {};
    if (!correo.trim()) e.correo = 'Escribe tu correo.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) e.correo = 'Escribe un correo válido.';
    if (!password) e.password = 'Escribe tu contraseña.';
    return e;
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    const locales = validar();
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setEnviando(true);
    try {
      await entrar(correo.trim(), password);
      navegar(desde, { replace: true });
    } catch (e) {
      const mensaje = mensajeDeError(e, 'No se pudo iniciar sesión.');
      if (mensaje.includes('Correo o contraseña')) setErrores({ password: mensaje });
      else setErrorGeneral(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="autenticacion">
      <form className="formulario" onSubmit={enviar} noValidate>
        <p className="formulario__marca">☕ Cafepos</p>
        <h1>Bienvenido de nuevo</h1>
        <p className="formulario__bajada">Entra para pedir y ver tus recompensas.</p>
        {errorGeneral && <p className="aviso aviso--error">{errorGeneral}</p>}

        <Campo etiqueta="Correo" error={errores.correo}>
          <input
            className="campo__control"
            type="email"
            autoComplete="email"
            value={correo}
            aria-invalid={Boolean(errores.correo)}
            onChange={(e) => {
              setCorreo(e.target.value);
              setErrores((actuales) => ({ ...actuales, correo: undefined }));
            }}
          />
        </Campo>

        <Campo etiqueta="Contraseña" error={errores.password}>
          <input
            className="campo__control"
            type="password"
            autoComplete="current-password"
            value={password}
            aria-invalid={Boolean(errores.password)}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrores((actuales) => ({ ...actuales, password: undefined }));
            }}
          />
        </Campo>

        <button className="boton boton--ancho" type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="formulario__pie">¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>
      </form>
      <aside className="tarjeta-demo">
        <h2>Prueba rápida</h2>
        <p><strong>karla@itson.mx</strong> · cafeteria2026</p>
        <p className="tarjeta-demo__nota">Cuenta de cliente con pedidos y puntos.</p>
      </aside>
    </div>
  );
}
