// compartido/componentes/Campo.tsx — etiqueta, control y mensaje junto al campo.
import type { ReactNode } from 'react';

export function Campo({
  etiqueta,
  error,
  children,
}: {
  etiqueta: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className={`campo ${error ? 'campo--invalido' : ''}`}>
      <span className="campo__etiqueta">{etiqueta}</span>
      {children}
      {error && <span className="campo__error" role="alert">{error}</span>}
    </label>
  );
}
