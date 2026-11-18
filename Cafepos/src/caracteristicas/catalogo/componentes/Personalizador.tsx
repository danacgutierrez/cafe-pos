// Elige tamaño, leche, endulzante y extras; el sistema cotiza el precio.
import { useEffect, useMemo, useState } from 'react';
import { claveBebida, useCarrito } from '../../carrito/estado/carrito.ts';
import { cotizar } from '../servicios/menu.ts';
import { Campo } from '../../../compartido/componentes/Campo.tsx';
import { erroresDelServicio, mensajeDeError } from '../../../compartido/api/errores.ts';
import type { Beverage, Catalogo, Cotizacion, MenuOption, OptionKind, Personalizacion } from '../../../compartido/api/tipos.ts';

const ETIQUETAS: Record<OptionKind, string> = {
  SIZE: 'Tamaño',
  MILK: 'Leche',
  SWEETENER: 'Endulzante',
  EXTRA: 'Extras',
};

function primeroDe(catalogo: Catalogo, kind: OptionKind): MenuOption | undefined {
  return catalogo.options.find((o) => o.kind === kind && o.isActive);
}

function inicial(bebida: Beverage, catalogo: Catalogo): Personalizacion {
  const size = primeroDe(catalogo, 'SIZE');
  const milk = bebida.allowsMilk ? primeroDe(catalogo, 'MILK') : undefined;
  const sweetener = primeroDe(catalogo, 'SWEETENER');
  return {
    sizeId: size?.id,
    milkId: milk?.id,
    sweetenerId: sweetener?.id,
    sweetness: sweetener ? 50 : undefined,
    extraIds: [],
    // El backend valida @Length(1,200) en `note`: una cadena vacía falla.
    // Por eso se deja undefined hasta que la persona escriba algo.
  };
}

export function Personalizador({
  bebida,
  catalogo,
  onCerrar,
}: {
  bebida: Beverage;
  catalogo: Catalogo;
  onCerrar: () => void;
}) {
  const agregar = useCarrito((s) => s.agregar);
  const [personalizacion, setPersonalizacion] = useState<Personalizacion>(() => inicial(bebida, catalogo));
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [cotizando, setCotizando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorNota, setErrorNota] = useState<string | undefined>(undefined);
  const [agregado, setAgregado] = useState(false);

  const porTipo = useMemo(() => {
    const grupos = new Map<OptionKind, MenuOption[]>();
    for (const opcion of catalogo.options) {
      if (!opcion.isActive) continue;
      if (opcion.kind === 'MILK' && !bebida.allowsMilk) continue;
      const lista = grupos.get(opcion.kind) ?? [];
      lista.push(opcion);
      grupos.set(opcion.kind, lista);
    }
    return grupos;
  }, [catalogo, bebida]);

  useEffect(() => {
    let activo = true;
    setCotizando(true);
    setError(null);
    setErrorNota(undefined);
    const temporizador = setTimeout(() => {
      cotizar(bebida.id, personalizacion)
        .then((c) => { if (activo) setCotizacion(c); })
        .catch((e) => {
          if (!activo) return;
          setCotizacion(null);
          const delCampo = erroresDelServicio(e, ['note']);
          if (delCampo.note) setErrorNota(delCampo.note);
          else setError(mensajeDeError(e, 'No se pudo calcular el precio.'));
        })
        .finally(() => { if (activo) setCotizando(false); });
    }, 250);
    return () => { activo = false; clearTimeout(temporizador); };
  }, [bebida.id, personalizacion]);

  function elegir(kind: OptionKind, id: number) {
    setAgregado(false);
    if (kind === 'EXTRA') {
      const actuales = personalizacion.extraIds ?? [];
      setPersonalizacion({
        ...personalizacion,
        extraIds: actuales.includes(id) ? actuales.filter((x) => x !== id) : [...actuales, id],
      });
      return;
    }
    const clave = { SIZE: 'sizeId', MILK: 'milkId', SWEETENER: 'sweetenerId' }[kind] as
      | 'sizeId' | 'milkId' | 'sweetenerId';
    setPersonalizacion({
      ...personalizacion,
      [clave]: id,
      ...(kind === 'SWEETENER' ? { sweetness: personalizacion.sweetness ?? 50 } : {}),
    });
  }

  function agregarAlCarrito() {
    if (!cotizacion) return;
    agregar({
      clave: claveBebida(bebida.id, personalizacion),
      tipo: 'bebida',
      id: bebida.id,
      nombre: bebida.name,
      cantidad: 1,
      precioUnitario: cotizacion.total,
      personalizacion,
    });
    setAgregado(true);
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={`Personalizar ${bebida.name}`}>
      <div className="modal__panel">
        <div className="modal__encabezado">
          <div>
            <p className="etiqueta">Bebida personalizable</p>
            <h2>{bebida.name}</h2>
          </div>
          <button className="icono-cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>

        <div className="modal__cuerpo">
          {(['SIZE', 'MILK', 'SWEETENER', 'EXTRA'] as OptionKind[]).map((kind) => {
            const opciones = porTipo.get(kind);
            if (!opciones?.length) return null;
            return (
              <fieldset className="opciones" key={kind}>
                <legend>{ETIQUETAS[kind]}</legend>
                <div className="opciones__lista">
                  {opciones.map((opcion) => {
                    const seleccionado =
                      kind === 'EXTRA'
                        ? (personalizacion.extraIds ?? []).includes(opcion.id)
                        : personalizacion[
                            { SIZE: 'sizeId', MILK: 'milkId', SWEETENER: 'sweetenerId' }[kind] as
                              'sizeId' | 'milkId' | 'sweetenerId'
                          ] === opcion.id;
                    return (
                      <button
                        type="button"
                        key={opcion.id}
                        className={`opcion ${seleccionado ? 'opcion--activa' : ''}`}
                        onClick={() => elegir(kind, opcion.id)}
                        aria-pressed={seleccionado}
                      >
                        <span>{opcion.name}</span>
                        {opcion.surcharge > 0 && <small>+${opcion.surcharge.toFixed(2)}</small>}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          {personalizacion.sweetenerId && (
            <label className="campo">
              <span className="campo__etiqueta">Dulzor: {personalizacion.sweetness ?? 50}%</span>
              <input
                className="deslizador"
                type="range"
                min={0}
                max={100}
                step={10}
                value={personalizacion.sweetness ?? 50}
                onChange={(e) => {
                  setAgregado(false);
                  setPersonalizacion({ ...personalizacion, sweetness: Number(e.target.value) });
                }}
              />
            </label>
          )}

          <Campo etiqueta="Nota especial (opcional)" error={errorNota}>
            <input
              className="campo__control"
              placeholder="Ej. poco hielo, sin espuma…"
              maxLength={200}
              aria-invalid={Boolean(errorNota)}
              value={personalizacion.note ?? ''}
              onChange={(e) => {
                setAgregado(false);
                setErrorNota(undefined);
                setPersonalizacion({
                  ...personalizacion,
                  note: e.target.value.trim() ? e.target.value : undefined,
                });
              }}
            />
          </Campo>

          {error && <p className="aviso aviso--error">{error}</p>}
          {cotizacion?.warnings.map((w) => <p className="aviso aviso--info" key={w}>{w}</p>)}
        </div>

        <div className="modal__pie">
          <div className="modal__precio">
            <span>Total</span>
            <strong className="numero">
              {cotizando ? '…' : cotizacion ? `$${cotizacion.total.toFixed(2)}` : '—'}
            </strong>
          </div>
          <button className="boton" disabled={cotizando || !cotizacion} onClick={agregarAlCarrito}>
            {agregado ? '✓ Agregado al carrito' : 'Agregar al carrito'}
          </button>
        </div>
      </div>
    </div>
  );
}
