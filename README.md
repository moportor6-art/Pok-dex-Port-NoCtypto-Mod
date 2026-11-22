# Pokédex Idle Offline

Resurrección hecha por fans de **Pokédex Idle**: un RPG idle de Pokémon que se juega por completo en el teléfono.
Sin criptomonedas, sin cuentas, sin servidores y sin pagos: todo se compra con Pokédólares ganados jugando
y la partida se guarda en el dispositivo.

## Contenido

- `game/` — el juego (HTML + JS). Se puede abrir `game/index.html` en cualquier navegador.
- `game/data.js` — datos: especies, movimientos, zonas y objetos del juego original, completados con PokéAPI
  (ratios de captura, experiencia, ataques por nivel, evoluciones, efectos de ataques y encuentros por zona).
- `tools/build_data.py` — regenera `data.js` (`python3 tools/build_data.py catalog.json carpeta_csv game/data.js`).
- `android/` — la app Android (WebView a pantalla completa) con su actualizador.

## Qué incluye el juego (v0.3)

- Caza idle con progreso fuera de línea (hasta 8 h), captura con la fórmula real y Pokébolas compradas con Pokédólares.
- **Mapas caminables** de las 200 zonas (con las colisiones del juego original y arte dibujado por código):
  toca para caminar, cruza a otras zonas y encuentra Pokémon salvajes en la hierba alta.
- Combates con tipos, STAB, críticos, estados alterados, cambios de estadísticas, varios golpes, drenaje, curación,
  retroceso, Drenadoras, Protección/Detección, Bostezo, ataques de carga (Rayo Solar, Vuelo, Excavar…), Hiperrayo,
  ataques que atrapan, fulminantes, de daño fijo, Descanso y Autodestrucción.
- Objetos equipables (Restos, objetos Elección, Banda Focus, Vidasfera…) y bayas.
- Elegir los ataques a mano (o dejarlo en automático).
- 251 Pokémon, evoluciones por nivel, piedra, objeto y hora del día.
- 24 gimnasios (Kanto, Johto y Hoenn con equipos alternativos), Liga Kanto, Johto y Hoenn, y Salón de la Fama.
- Copa diaria contra rivales que cambian cada día.
- Música y efectos chiptune originales (Web Audio, sin archivos) y avatares de entrenador en pixel art.

## App Android

- Pantalla completa, 120 Hz donde exista y botón atrás de Android (cierra ventanas y vuelve a «Cazar»).
- El juego nunca sale a internet: la app bloquea cualquier dirección externa.
- Firma fija (`android/release.keystore`): cada versión se instala encima sin perder la partida.

### Actualizador (igual que DB Survivors y Pokémon Overlord)

Cada push a `main` compila la APK en GitHub Actions y la publica en **Releases** como `build-N` con `contenido.json`.
La app, a los 5 segundos de abrirse, busca la última versión (también desde **Más → Actualizaciones**).

- **Solo cambió el juego** (`game/`): baja `patch.zip` con los archivos que cambiaron. No se reinstala nada.
- **Cambió la parte nativa** (`android/`): baja la APK completa y Android la instala encima.
- **Vuelta atrás**: si el juego no arranca con el parche (2 intentos), vuelve solo a lo que trae la APK.
- Las partidas guardadas nunca se tocan.

La versión del juego está en `VERSION`.

Proyecto no oficial y sin fines de lucro, no afiliado a Nintendo, Creatures Inc., GAME FREAK ni The Pokémon Company.
