/**
 * Verificación de integridad para la aplicación Contactos Policiales
 * Este script debe cargarse antes de app.js pero después de todos los otros scripts
 */
(function() {
    // Lista de objetos que deben existir
    const requiredObjects = [
        { name: 'ContactUtils', type: 'object' },
        { name: 'ContactModel', type: 'object' },
        { name: 'UIController', type: 'object' },
        { name: 'PersonalSummary', type: 'object' },
        { name: 'AppController', type: 'object' }
    ];

    // Verificar la existencia de todos los objetos requeridos
    console.log('==== VERIFICACIÓN DE INTEGRIDAD DE LA APLICACIÓN ====');
    let allValid = true;
    
    requiredObjects.forEach(obj => {
        const exists = typeof window[obj.name] === obj.type;
        console.log(`${obj.name}: ${exists ? '✅ OK' : '❌ FALTA O NO CARGADO CORRECTAMENTE'}`);
        if (!exists) allValid = false;
    });

    // Verificar dependencias específicas
    if (typeof ContactUtils === 'object') {
        const methods = ['formatCC', 'getFullGrado', 'determineGender', 'formatPhoneNumber', 
                         'createWhatsAppMessage', 'createEmailMessage', 'createVCardForContact'];
        methods.forEach(method => {
            const exists = typeof ContactUtils[method] === 'function';
            console.log(`ContactUtils.${method}: ${exists ? '✅ OK' : '❌ FALTA'}`);
            if (!exists) allValid = false;
        });
    }

    console.log('====================================================');
    console.log(`Resultado final: ${allValid ? '✅ Todos los componentes cargados correctamente' : '❌ Hay problemas con algunos componentes'}`);
    
    // Detener la inicialización si hay problemas
    if (!allValid) {
        console.error('La aplicación no se iniciará debido a problemas en la carga de componentes.');
        
        // Mostrar mensaje al usuario
        setTimeout(() => {
            alert('Hubo un problema al cargar la aplicación. Por favor, verifica la consola para más detalles o contacta al administrador.');
        }, 1000);
        
        // Evitar que se ejecute la inicialización de la aplicación
        window.appInitializationBlocked = true;
    }
})();
