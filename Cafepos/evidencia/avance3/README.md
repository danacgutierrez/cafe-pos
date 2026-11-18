# Evidencia: cuatro estados en pantallas que piden datos

Cada carpeta corresponde a una pantalla que consulta datos a la API y contiene las cuatro situaciones solicitadas por el Avance 3:

1. **Con información**
2. **Vacía**
3. **Cargando**
4. **Con error**

Todas las capturas se tomaron a 1280 × 900 px desde `http://localhost:5173`.

| Carpeta | Ruta | Con información | Vacía | Cargando / error |
| --- | --- | --- | --- | --- |
| `menu/` | `/menu` | Catálogo con bebidas y productos activos. | Filtro `Té` sin bebidas. | Backend detenido: “Preparando tu café…” y luego “No se pudo cargar el menú.” |
| `detalle/` | `/menu/1` | Personalizador de “Latte de vainilla”. | `/menu/999999`: “No encontramos esa bebida.” | Backend detenido durante la carga del catálogo. |
| `pedidos/` | `/pedidos` | Historial del cliente demo. | Cuenta recién registrada sin pedidos. | Backend detenido al consultar `/orders/mine`. |
| `recompensas/` | `/recompensas` | Saldo y movimientos de puntos del cliente demo. | Cuenta recién registrada sin movimientos. | Backend detenido al consultar puntos y movimientos. |
| `seguimiento/` | `/pedidos/21` | Estado del pedido #21. | `/pedidos/0`: “No encontramos ese pedido”. | Backend detenido al consultar estado y pago. |
| `perfil/` | `/perfil` | Perfil con saldo de puntos. | Sesión sin `idClient`: “Aún no tienes puntos”. | Backend detenido al consultar los puntos. |

Archivos de cada carpeta:

- **`cuatro-estados.png`** — un único PNG por pantalla con los cuatro estados en 2×2. Este es el archivo de evidencia principal.
- `01-con-informacion.png` (en `menu/`: `01-menu-con-informacion.png`)
- `02-vacia.png` (en `menu/`: `02-menu-vacio.png`)
- `03-cargando.png`
- `04-con-error.png`

Las capturas individuales se conservan como apoyo, pero **no hay un PNG global que junte todas las pantallas**: cada pantalla tiene su propio `cuatro-estados.png`.

No se incluyeron Carrito ni Checkout: no tienen los cuatro estados de una consulta de datos (Carrito es estado local y Checkout sólo muestra “Procesando…”/error al enviar el formulario).
