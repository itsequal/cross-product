# Sigilo vectorial

Prototipo en el navegador que muestra el **producto cruz** y el **producto punto** dentro de una detección de campo de visión.

## Ejecutar

```text
npm install
npm run dev
```

Abre la URL que imprime Vite (por defecto `http://127.0.0.1:5173`).

## Controles

| Tecla | Acción |
| --- | --- |
| W A S D o flechas | Mover al jugador en el plano XZ |
| SPACE o M | Pausar y entrar al modo análisis (órbita) |
| V | Mostrar u ocultar los vectores en modo juego |
| C | Mostrar u ocultar el cono |
| R | Reiniciar |

En modo análisis, arrastra para rotar la cámara alrededor del enemigo y usa la rueda para acercarte. La simulación queda congelada.

## Qué ocurre en la escena

La arena mide 20×20. El jugador (cilindro azul) sale arriba a la izquierda. El enemigo (cilindro naranja) barre la mirada de lado a lado. La meta es el anillo verde.

El cono es el campo de visión: 10 unidades y 70° en total (±35° desde Forward).

- Verde: el jugador está fuera.
- Amarillo: dentro, pero cerca del borde del ángulo o del rango. Todavía puedes moverte.
- Rojo: dentro de la zona interior. La partida se detiene con **DETECTADO**.
- Azul grisáceo: estarías dentro del cono, pero una pared corta la línea de visión.

La zona roja es el 80% interior del ángulo y del rango. El borde exterior avisa antes de la detección.

## La matemática, sin atajos

`F` es la dirección del enemigo. `P` es el vector del enemigo al jugador. Los dos se proyectan al plano XZ y se normalizan.

```text
|F × P| = sin θ
F · P  = cos θ
θ = atan2(|F × P|, F · P)
```

- El **producto cruz** dice de qué lado está el jugador y cuánto vale el seno. Con +Y hacia arriba, `cross.y > 0` es la derecha de Forward y `cross.y < 0` es la izquierda. Si apunta hacia arriba o hacia abajo, estás viendo la regla de la mano derecha. Si los vectores son paralelos, su magnitud se acerca a 0.
- El **producto punto** dice qué tan alineado está el jugador con la mirada. Cerca de 1 está delante; cerca de -1 está detrás.
- El ángulo sale de los dos juntos. `atan2` evita el error de `acos` junto a 0° y 180°.
- El FOV se divide entre dos porque θ se mide desde el eje central, no de borde a borde.
- La distancia decide el rango.
- El raycast decide si una pared tapa al jugador. El producto cruz no ve obstáculos.

El producto cruz **no** es la prueba de "está en el FOV". Esa prueba es `θ ≤ FOV / 2` (equivalente a `F · P ≥ cos(FOV / 2)` con vectores unitarios) y `distancia ≤ rango`, y después el raycast.

## Modos

**Juego.** Cámara fija elevada. El panel solo muestra el objetivo, la visibilidad y los controles.

**Análisis.** SPACE congela el tiempo, acerca una cámara en tres cuartos y enseña F (verde), P (azul), F×P (morado), el arco θ y el panel numérico. Vuelve a pulsar SPACE para seguir jugando. Si te detectan, SPACE sigue disponible para mirar los vectores de ese instante.

## Estructura

```text
src/main.js              bucle, renderer, cámara
src/Game.js              estados, arena, reinicio
src/InputManager.js      teclado
src/Player.js            movimiento y choque con paredes
src/Enemy.js             barrido y vector Forward
src/DetectionSystem.js   cruz, punto, ángulo, FOV, raycast
src/MathVisualizer.js    flechas, cono, arco y etiquetas
src/HUD.js               panel DOM, sin Three.js
src/config.js            velocidades, FOV, colores, nivel
```

En la consola del navegador, `window.__debug.dump()` imprime una tabla con los valores del frame actual. Los mismos casos (delante, 90°, detrás, pared) se pueden repetir con `node scripts/check-math.mjs`.

## Comprobaciones rápidas

Con el modo análisis abierto:

- Jugador justo delante de la flecha verde: θ ≈ 0°, punto ≈ 1, |cruz| ≈ 0.
- Jugador a 90° de la flecha verde: punto ≈ 0, |cruz| ≈ 1, la flecha morada es larga.
- Jugador detrás: θ ≈ 180°, punto ≈ −1.
- Cruzar de un lado a otro de la flecha verde invierte la flecha morada (arriba / abajo) y el texto del lado.
- Esconderse detrás de una pared dentro del cono muestra **BLOQUEADO POR PARED** y no termina la partida.
