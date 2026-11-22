# PokéWeek v3.0.0 · App Edition

Agenda semanal de Pokémon GO para Yuli.

## Funciones
- Vista Hoy + Próximos + semana.
- Filtros por tipo de evento.
- Ficha completa por evento.
- PWA instalable y caché offline.
- Campanas y preferencias persistentes.
- Recordatorios automáticos mientras la PWA está abierta.
- Web Push preparado mediante `push-config.js`.
- Eventos normalizados cada 6 h desde ScrapedDuck/LeekDuck.
- Miniaturas WebP optimizadas automáticamente.
- QA automático en GitHub Actions.

## Activar Web Push con la app cerrada
Configura en `push-config.js`:
- `publicKey`: clave pública VAPID.
- `subscribeUrl`: endpoint HTTPS que reciba la suscripción Push y programe avisos.

El service worker ya implementa la recepción de eventos `push`.

## Sitio
https://educacionmx.github.io/pokemon-go-agenda-semanal/
