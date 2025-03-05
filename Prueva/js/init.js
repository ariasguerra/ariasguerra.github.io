/**
 * Inicializaci�n de la aplicaci�n
 * Este archivo se encarga de iniciar todos los componentes cuando la p�gina carga
 */

// Esperar a que el DOM est� completamente cargado
document.addEventListener("DOMContentLoaded", () => {
    console.log("Inicializando aplicaci�n de gesti�n de parqueo...");
    
    // Inicializar la aplicaci�n
    ParkingApp.init();
    
    // Inicializar la interfaz de usuario
    UI.init();
    
    console.log("Aplicaci�n inicializada correctamente");
});