// Espera a que todo el contenido HTML esté cargado antes de ejecutar el script
document.addEventListener('DOMContentLoaded', () => {
    // Obtiene referencias a los elementos HTML importantes
    const videoPlayer = document.getElementById('videoPlayer'); // El elemento <video>
    const videoList = document.getElementById('videoList'); // La lista <ul> donde irán los títulos
    const videoTitleElement = document.getElementById('videoTitle'); // El <h2> para el título del video
    const videoDescriptionElement = document.getElementById('videoDescription'); // El <p> para la descripción
    const jsonUrl = 'videos.json'; // Ruta (relativa o absoluta) a tu archivo JSON

    let currentActiveListItem = null; // Variable para rastrear qué elemento de la lista está activo/seleccionado

    // Función para cargar y reproducir un video específico
    function loadVideo(video) {
        console.log(`Cargando video: ${video.titulo}, URL: ${video.url}`); // Mensaje en la consola del navegador
        videoPlayer.src = video.url; // Establece la URL del video en el reproductor
        videoTitleElement.textContent = video.titulo; // Muestra el título del video
        videoDescriptionElement.textContent = video.descripcion || ''; // Muestra la descripción (si existe)

        // Intenta cargar el nuevo source y luego reproducirlo
        videoPlayer.load(); // Opcional: load() reinicia el elemento multimedia y su búfer
        videoPlayer.play().catch(error => {
            // Si ocurre un error al intentar reproducir (ej: formato no soportado)
            console.error("Error al intentar reproducir el video:", error);
            // Muestra un mensaje de error al usuario
            videoTitleElement.textContent = `Error al reproducir: ${video.titulo}`;
            videoDescriptionElement.textContent = `No se pudo reproducir el video. El formato (${video.url.split('.').pop()}) podría no ser compatible con tu navegador. Se recomienda MP4.`;
        });
    }

    // Función para resaltar el elemento de la lista que está activo
    function setActiveListItem(listItem) {
        // Si ya había un elemento activo, le quita la clase 'active'
        if (currentActiveListItem) {
            currentActiveListItem.classList.remove('active');
        }
        // Añade la clase 'active' al nuevo elemento seleccionado
        listItem.classList.add('active');
        // Actualiza la referencia al elemento activo actual
        currentActiveListItem = listItem;
    }


    // Usa la API Fetch para obtener los datos del archivo JSON
    fetch(jsonUrl)
        .then(response => {
            // Verifica si la respuesta de la red fue exitosa (status 200-299)
            if (!response.ok) {
                throw new Error(`Error HTTP! estado: ${response.status}`);
            }
            return response.json(); // Parsea (convierte) la respuesta de texto JSON a un objeto/array JavaScript
        })
        .then(videos => {
            videoList.innerHTML = ''; // Limpia el mensaje "Cargando videos..." de la lista

            // Verifica si el JSON contiene un array
            if (!Array.isArray(videos)) {
                 throw new Error("El archivo JSON no contiene un array de videos válido.");
            }

            // Si el array de videos está vacío
            if (videos.length === 0) {
                videoList.innerHTML = '<li>No hay videos para mostrar.</li>';
                return; // Termina la ejecución de esta parte
            }

            // Recorre cada objeto 'video' en el array 'videos'
            videos.forEach((video, index) => {
                const listItem = document.createElement('li'); // Crea un nuevo elemento <li>
                listItem.textContent = video.titulo; // Establece el texto del <li> al título del video
                listItem.dataset.index = index; // Guarda el índice del video en el array como un atributo data-*

                // Añade un 'event listener' para que se ejecute una función cuando se haga clic en este <li>
                listItem.addEventListener('click', () => {
                    // Obtiene los datos del video correspondiente usando el índice guardado
                    const videoData = videos[parseInt(listItem.dataset.index)];
                    loadVideo(videoData); // Llama a la función para cargar y reproducir este video
                    setActiveListItem(listItem); // Llama a la función para resaltar este elemento en la lista
                });

                videoList.appendChild(listItem); // Añade el nuevo <li> a la lista <ul> en el HTML
            });

             // Opcional: Cargar el primer video de la lista automáticamente al cargar la página.
             // Actualmente está comentado para que el usuario elija primero.
            // if (videos.length > 0) {
            //      loadVideo(videos[0]);
            //      setActiveListItem(videoList.firstChild); // Resalta el primer elemento
            // }

        })
        .catch(error => {
            // Si ocurre un error durante el fetch o el procesamiento del JSON
            console.error('Error al cargar o procesar el archivo JSON:', error);
            // Muestra un mensaje de error en la lista de videos
            videoList.innerHTML = `<li>Error al cargar la lista de videos: ${error.message}</li>`;
            // Muestra un mensaje de error general en el área de información del video
            videoTitleElement.textContent = "Error";
            videoDescriptionElement.textContent = "No se pudo cargar la información de los videos.";
        });

        // Añadir un listener para capturar errores directamente del elemento <video>
        // (ej: archivo no encontrado, error de decodificación)
        videoPlayer.addEventListener('error', (e) => {
            console.error("Error en el elemento video:", e);
            // Evita sobrescribir el mensaje si ya mostramos uno por fallo de play()
            if (!videoTitleElement.textContent.startsWith('Error al reproducir')) {
                 videoTitleElement.textContent = `Error al cargar: ${currentActiveListItem ? currentActiveListItem.textContent : 'video'}`; // Muestra título del video problemático si es posible
                 videoDescriptionElement.textContent = `Hubo un problema al cargar el video. Verifica la URL o el formato del archivo. Código de error: ${videoPlayer.error?.code}`; // Informa sobre el error
            }
        });
});