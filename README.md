# Tablero de envíos del menú · PNCM

Página pública del tablero "Envíos del menú" (Programa Nacional Cuna Más, Servicio de Cuidado Diurno).
Lee los datos de Firestore (proyecto `tablero-envios-pncm`) y se actualiza sola con cada envío.

- `index.html`: estructura y estilos.
- `app.js`: el tablero (mismo cálculo y presentación que el artefacto "Consolidado de Envíos del Menú").
- `armar.js`: arma los datos del mes a partir de los documentos de Firestore.
- `diversidad.js`: diversidad del menú (pestaña Diversidad). Es el mismo bloque que va al final de `Motor.gs`: si se cambia uno, se copia igual en el otro.
- `boot.mjs`: conexión a Firestore, selector de mes y actualización en vivo.

Los datos los publica el Apps Script `TableroFirestore.gs` (con `Motor.gs` y `Firestore.gs`).
Los RUC de personas naturales (que empiezan con 10) no se publican.
