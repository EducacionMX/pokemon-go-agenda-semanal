# 🌸 PokéWeek · Agenda semanal de Pokémon GO

Agenda visual y móvil para consultar eventos de Pokémon GO en hora de Monterrey.

## V2
- Diseño cute/cozy con Pokémon decorativos.
- Bloque **Hoy**, agenda semanal, próximos eventos y campanitas.
- Datos locales de respaldo para que la página nunca quede vacía.
- GitHub Actions actualiza `data/live-events.json` automáticamente cada 6 horas desde ScrapedDuck/LeekDuck.
- Filtros para Community Day, incursiones, Max, Spotlight y eventos.
- Exportación a calendario (.ics) con alarma.
- Botón para copiar una solicitud de recordatorio para ChatGPT.
- Las campanitas se guardan en el navegador con localStorage.

## Sitio
https://educacionmx.github.io/pokemon-go-agenda-semanal/

## Datos
El sitio intenta cargar primero `data/live-events.json`. Si ese archivo no está disponible, usa `data/events.json` como respaldo.

Fuente comunitaria: https://github.com/bigfoott/ScrapedDuck
