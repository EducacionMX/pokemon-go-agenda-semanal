# Pokémon GO · Agenda semanal

Agenda web ligera para consultar eventos de Pokémon GO semana a semana.

## Funciones
- Vista semanal en horario de Monterrey.
- Filtros para Community Day, incursiones, eventos Max y Spotlight Hour.
- Actualización automática del feed al abrir la página y cada 30 minutos.
- Campanas guardadas en el navegador.
- Exportación de eventos a calendario (.ics) con alarma.
- Generación de una solicitud lista para crear un recordatorio en ChatGPT.

## Fuente de datos
El panel consulta el feed comunitario de ScrapedDuck/LeekDuck:
`https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json`

## Publicar con GitHub Pages
En GitHub abre:

**Settings → Pages → Build and deployment → Source: Deploy from a branch**

Después selecciona:
- Branch: `main`
- Folder: `/ (root)`

La dirección esperada será:

https://educacionmx.github.io/pokemon-go-agenda-semanal/

## Nota
Las selecciones con campana se guardan mediante `localStorage`, por lo que son propias de cada navegador/dispositivo.
