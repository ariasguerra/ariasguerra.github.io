// Punto de entrada principal
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM completamente cargado y analizado');
    
    // Ocultar sección de resultados al inicio
    const resultsContainer = document.querySelector('.results-container');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }
    
    // Mostrar notificación
    function showNotification() {
        const notification = document.getElementById('notification');
        
        setTimeout(() => {
            notification.classList.add('show');
            
            // Ocultar después de 5 segundos
            setTimeout(() => {
                notification.classList.remove('show');
            }, 5000);
        }, 1000);
        
        // Configurar botón de cierre
        document.getElementById('notificationClose').addEventListener('click', function() {
            notification.classList.remove('show');
        });
    }
    
    // Mostrar/ocultar contenedores de navegación y acciones
    function updateContainersVisibility() {
        const resultsDiv = document.getElementById('results');
        const actionButtonsContainer = document.getElementById('action-buttons-container');
        const navigationContainer = document.getElementById('navigation-container');
        
        // Si hay resultados, mostrar los contenedores
        if (resultsDiv.innerHTML.trim() !== '') {
            actionButtonsContainer.style.display = 'block';
            navigationContainer.style.display = 'block';
        } else {
            actionButtonsContainer.style.display = 'none';
            navigationContainer.style.display = 'none';
        }
    }
    
    // Iniciar la aplicación
    AppController.init();
    
    // Mostrar notificación
    showNotification();
    
    // Configurar observador para actualizar visibilidad de contenedores
    const observer = new MutationObserver(updateContainersVisibility);
    observer.observe(document.getElementById('results'), { childList: true, subtree: true });
});
