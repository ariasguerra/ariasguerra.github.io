/**
 * Inicialización de la aplicación
 * Este archivo se encarga de iniciar todos los componentes cuando la página carga
 */

// Esperar a que el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", () => {
    console.log("Inicializando aplicación de gestión de parqueo...");
    
    // Inicializar la aplicación
    ParkingApp.init();
    
    // Inicializar la interfaz de usuario
    UI.init();
    
    console.log("Aplicación inicializada correctamente");
});