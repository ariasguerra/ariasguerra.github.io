/**
 * Punto de entrada principal de la aplicación
 * Contactos Policiales
 * 
 * Este archivo inicia la aplicación cuando el DOM está completamente cargado
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM completamente cargado y analizado');
    
    // Verificar si la inicialización fue bloqueada por problemas de integridad
    if (window.appInitializationBlocked) {
        console.warn('Inicialización bloqueada debido a problemas de integridad');
        return;
    }
    
    // Capturar errores durante la inicialización
    try {
        // Verificar que los objetos requeridos existan
        if (typeof AppController !== 'object' || typeof AppController.init !== 'function') {
            throw new Error('AppController no está disponible o no tiene el método init');
        }
        
        console.log('Iniciando aplicación...');
        
        // Iniciar la aplicación
        AppController.init();
        
        console.log('Aplicación iniciada correctamente');
    } catch (error) {
        console.error('Error al iniciar la aplicación:', error);
        alert('Ha ocurrido un error al iniciar la aplicación. Por favor, recarga la página o contacta al administrador.');
    }
});
