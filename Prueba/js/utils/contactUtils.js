/**
 * Utilidades para el manejo de contactos
 * 
 * Provee funciones auxiliares para formateo, conversión y generación
 * de contenido relacionado con los contactos
 */
const ContactUtils = (function() {
    /**
     * Formatea un número de cédula con separadores de miles
     * @param {Number|String} cc Número de cédula
     * @returns {String} Cédula formateada
     */
    function formatCC(cc) {
        return cc ? cc.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : 'N/A';
    }
    
    /**
     * Obtiene el grado completo a partir de la abreviatura
     * @param {String} grado Abreviatura del grado
     * @param {String} gender Género (M/F)
     * @returns {String} Grado completo
     */
    function getFullGrado(grado, gender) {
        const grados = {
            'PP': 'Patrullero de Policía',
            'AP': 'Auxiliar de Policía',
            'N/U': gender === 'F' ? 'No Uniformada' : 'No Uniformado',
            'PT': gender === 'F' ? 'Patrullera' : 'Patrullero',
            'IT': 'Intendente',
            'IJ': 'Intendente Jefe',
            'SI': 'Subintendente',
            'ST': 'Subteniente',
            'TE': 'Teniente',
            'CT': gender === 'F' ? 'Capitana' : 'Capitán',
            'MY': 'Mayor',
            'TC': 'Teniente Coronel',
            'CR': 'Coronel',
            'BG': 'Brigadier General',
            'MG': 'Mayor General',
            'GR': 'General'
        };
        return grados[grado] || grado;
    }
    
    /**
     * Determina el género basado en el nombre
     * @param {String} nombre Nombre de la persona
     * @returns {String} Género determinado (M/F)
     */
    function determineGender(nombre) {
        if (!nombre) return 'M';
        const femaleNames = ['MARIA', 'STEPHANY', 'ANA', 'NEYLA', 'LAURA', 'SOFIA', 'ISABEL', 'CAROLINA', 'DANIELA', 'VALENTINA', 'GABRIELA', 'CAMILA'];
        const firstName = nombre.split(' ')[0].toUpperCase();
        return femaleNames.includes(firstName) ? 'F' : 'M';
    }
    
    /**
     * Formatea un número de teléfono asegurando el prefijo de país
     * @param {String|Number} phoneNumber Número telefónico
     * @returns {String} Número formateado
     */
    function formatPhoneNumber(phoneNumber) {
        if (!phoneNumber) return '';
        const cleanNumber = phoneNumber.toString().replace(/\D/g, '');
        return cleanNumber.startsWith('57') ? cleanNumber : '57' + cleanNumber;
    }
    
    /**
     * Capitaliza la primera letra de una cadena
     * @param {String} string Texto a capitalizar
     * @returns {String} Texto con la primera letra en mayúscula
     */
    function capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }
    
    /**
     * Obtiene el saludo apropiado según la hora del día
     * @returns {String} Saludo (buenos días/tardes/noches)
     */
    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return "buenos días";
        if (hour < 18) return "buenas tardes";
        return "buenas noches";
    }
    
    /**
     * Formatea un cargo con las reglas de capitalización adecuadas
     * @param {String} cargo Cargo a formatear
     * @returns {String} Cargo formateado
     */
    function formatCargo(cargo) {
        if (!cargo) return '';
        const lowercaseWords = ['de', 'del', 'la', 'las', 'los', 'y', 'e', 'o', 'u', 'a'];
        return cargo.split(' ').map((word, index) => 
            lowercaseWords.includes(word.toLowerCase()) && index !== 0 ? word.toLowerCase() : capitalizeFirstLetter(word)
        ).join(' ');
    }
    
    /**
     * Crea un mensaje predefinido para WhatsApp
     * @param {Object} contact Datos del contacto
     * @returns {String} Mensaje formateado para WhatsApp
     */
    function createWhatsAppMessage(contact) {
        const greeting = getGreeting();
        const firstName = capitalizeFirstLetter(contact.NOMBRES?.split(' ')[0] || '');
        const lastName = capitalizeFirstLetter(contact.APELLIDOS?.split(' ')[0] || '');
        return `Dios y Patria, ${greeting} ${firstName} ${lastName}`;
    }
    
    /**
     * Crea un mensaje predefinido para correo electrónico
     * @param {Object} contact Datos del contacto
     * @returns {String} Mensaje formateado para email
     */
    function createEmailMessage(contact) {
        const greeting = getGreeting();
        const gender = determineGender(contact.NOMBRES);
        const fullGrado = getFullGrado(contact.GR, gender);
        const formattedGrado = fullGrado.split(' ').map(word => capitalizeFirstLetter(word)).join(' ');
        const salutation = gender === 'F' ? 'Señora' : 'Señor';
        const fullName = `${contact.NOMBRES || ''} ${contact.APELLIDOS || ''}`.toUpperCase();
        const formattedCargo = formatCargo(contact.CARGO);

        return `MINISTERIO DE DEFENSA NACIONAL 
POLICÍA NACIONAL DE COLOMBIA
ESTACIÓN DE POLICÍA BARRIOS UNIDOS


${salutation} ${formattedGrado}
${fullName}
${formattedCargo}

Dios y Patria, ${greeting}


Atentamente,



`;
    }
    
    /**
     * Crea una tarjeta vCard para un contacto
     * @param {Object} contact Datos del contacto
     * @returns {Object|null} Objeto con datos vCard y nombre de archivo, o null si hay error
     */
    function createVCardForContact(contact) {
        if (!contact) return null;
        
        const gradoCompleto = getFullGrado(contact.GR, determineGender(contact.NOMBRES));
        const fullName = `${contact.NOMBRES || ''} ${contact.APELLIDOS || ''}`.trim();
        
        // Crear vCard
        let vCard = "BEGIN:VCARD\nVERSION:3.0\n";
        vCard += `N:${contact.APELLIDOS || ''};${contact.NOMBRES || ''};;;\n`;
        vCard += `FN:${fullName}\n`;
        vCard += `ORG:Policía Nacional de Colombia\n`;
        vCard += `TITLE:${gradoCompleto} - ${contact.CARGO || ''}\n`;
        
        if (contact.CELULAR) {
            vCard += `TEL;TYPE=CELL:${contact.CELULAR}\n`;
        }
        
        if (contact["CORREO ELECTRÓNICO"]) {
            vCard += `EMAIL:${contact["CORREO ELECTRÓNICO"]}\n`;
        }
        
        vCard += "END:VCARD";
        
        return {
            vCardData: vCard,
            fileName: `${fullName.replace(/\s+/g, '_')}.vcf`
        };
    }
    
    // API pública del módulo
    return {
        formatCC,
        getFullGrado,
        determineGender,
        formatPhoneNumber,
        capitalizeFirstLetter,
        getGreeting,
        formatCargo,
        createWhatsAppMessage,
        createEmailMessage,
        createVCardForContact
    };