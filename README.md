# Reproductor-de-musica
Pagina web para reproducir música precargada

Cómo agregar canciones al proyecto 🎵

Este proyecto carga la música desde el archivo: ./assets/data/songs.json


Cada álbum contiene:

id: Identificador único

title: Nombre del álbum

artist: Artista

cover: Ruta a la imagen de portada

tracks: Lista de canciones del álbum

Ejemplo de estructura:

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

➕ Pasos para agregar un nuevo álbum

1️⃣ Crear una carpeta en:
/assets/audio/


Ejemplo:
/assets/audio/album8/


2️⃣ Copiar los archivos .mp3 dentro de la carpeta
(Usa nombres sin acentos, sin ñ y sin espacios si se puede)

3️⃣ Crear una imagen de portada y guardarla en:
/assets/covers/


Ejemplo: album8.jpg


4️⃣ Editar el archivo: ./assets/data/songs.json


y añadir un nuevo objeto al final:

{
  "id": 8,
  "title": "Nuevo Álbum",
  "artist": "Tu Artista",
  "cover": "./assets/covers/album8.jpg",
  "tracks": [
    {
      "title": "Canción 1",
      "file": "./assets/audio/album8/cancion1.mp3",
      "duration": "3:20"
    },
    {
      "title": "Canción 2",
      "file": "./assets/audio/album8/cancion2.mp3",
      "duration": "4:12"
    }
  ]
}


⚠️ Importante:

Asegúrate de que todas las rutas sean correctas
La duración debe escribirse de forma manual (MM:SS)
El id del álbum no debe repetirse

🔄 ¿Qué pasa después?

✅ Guardas el JSON
✅ Recargas el proyecto
🎧 El nuevo álbum aparecerá automáticamente en la lista

❌ Errores comunes
Problema	Solución
El álbum no aparece	Revisa que el JSON esté bien cerrado ([], {}, comas)
Canción no reproduce	Verifica la ruta del archivo .mp3
Imagen no carga	Confirma que la portada está en /assets/covers/ y la ruta coincide


✅ Recomendaciones

✔ Mantener nombres cortos en archivos
✔ Evitar caracteres especiales en rutas
✔ Mantener la misma estructura por álbum# Reproductor-de-musica
Pagina web para reproducir música precargada
