# PokéWeek v3.3.0 · App Edition

Agenda semanal de Pokémon GO para Yuli.

## Funciones
- Vista Hoy + Próximos + semana.
- Filtros por tipo de evento.
- Ficha completa por evento.
- PWA instalable y caché offline.
- Campanas y preferencias persistentes.
- Recordatorios mientras la PWA está abierta y exportación iCalendar desde la ficha o “Mis campanitas”. Al importar el archivo, el calendario puede avisar con PokéWeek cerrada según sus permisos y soporte de alarmas.
- Los horarios sin desfase se interpretan como hora de Monterrey. Los horarios con desfase explícito se convierten a Monterrey.
- Web Push preparado mediante `push-config.js`.
- Eventos normalizados y publicados cada 6 h desde ScrapedDuck/LeekDuck por el flujo Actualizar y publicar PokéWeek. El sitio muestra la fecha de generación del archivo publicado.
- Miniaturas WebP optimizadas automáticamente y Pokémon de incursiones cuando la fuente los proporciona.
- QA automático en GitHub Actions.

## Activar Web Push con la app cerrada
Configura en `push-config.js`:
- `publicKey`: clave pública VAPID.
- `subscribeUrl`: endpoint HTTPS que reciba la suscripción Push y programe avisos.

La configuración publicada aún no incluye un proveedor. El service worker recibe avisos cuando se conecta el servicio. Los eventos ya importados en el calendario se administran desde el calendario.

## Sitio
https://educacionmx.github.io/pokemon-go-agenda-semanal/
