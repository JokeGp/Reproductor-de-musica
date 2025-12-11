# 🎵 Reproductor de Música Forentec

Un reproductor de música web moderno, interactivo y con funciones avanzadas como visualizadores de audio, temas personalizados y un modo secreto.

🔗 **Demo en vivo:** [https://JokeGp.github.io/Reproductor-de-musica/](https://JokeGp.github.io/Reproductor-de-musica/)

## ✨ Características Principales

*   **Reproducción de Audio:** Soporte para archivos MP3 con controles completos (Play/Pause, Prev/Next, Shuffle, Repeat).
*   **Visualizadores en Tiempo Real:**
    *   📊 **Ondas (Bars):** Barras de frecuencia clásicas.
    *   🎚️ **Espectrograma:** Visualización detallada del espectro de audio.
    *   *Nuevo:* Selector desplegable para cambiar fácilmente entre modos.
*   **Temas Personalizados:**
    *   ☀️ **Light Mode:** Tema claro y limpio.
    *   🌙 **Dark Mode:** Tema oscuro para entornos con poca luz.
    *   🎄 **Christmas Mode:** ¡Nuevo tema navideño!
*   **Control de Volumen:** Deslizador flotante intuitivo.
*   **Animaciones Suaves:** Transiciones fluidas en listas, botones y cambios de tema.
*   **Gestión de Bibliotecas:** Carga de álbumes desde archivos JSON.
*   **🔓 Modo Secreto:** ¿Puedes encontrar cómo activarlo? (Pista: Haz click en el título del reproductor).

## 📁 Estructura de Datos

El proyecto carga la música desde `./data/albums.json`.

**Ejemplo de estructura de álbum:**
```json
{
  "id": 1,
  "title": "Kiko el diablito loco",
  "artist": "Kiko",
  "cover": "./assets/covers/album1.jpg",
  "tracks": [
    {
      "title": "El Diablito Loco",
      "file": "./assets/audio/album1/el-diablito-loco.mp3",
      "duration": "2:51"
    }
  ]
}
```

## 🛠️ Cómo agregar música

1.  **Audio:** Crea una carpeta en `/assets/audio/` y añade tus archivos MP3.
    *   *Nota:* Evita espacios y caracteres especiales en los nombres de archivo si es posible.
2.  **Portada:** Añade la imagen de portada en `/assets/covers/`.
3.  **Data:** Edita `./data/albums.json` y añade un nuevo objeto con la información del álbum y las canciones.

## 🚀 Despliegue

Este proyecto está desplegado usando GitHub Pages. Cualquier cambio en la rama `main` puede ser desplegado a `gh-pages`.

---
Desarrollado con ❤️ para Forentec Ciberseguridad.
