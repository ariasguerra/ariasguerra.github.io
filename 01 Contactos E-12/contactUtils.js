// Funciones de utilidad para el manejo de contactos
const ContactUtils = (function() {
    function formatCC(cc) {
        return cc ? cc.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : 'N/A';
    }
    
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
    
    function determineGender(nombre) {
        if (!nombre) return 'M';
        const femaleNames = ['MARIA', 'STEPHANY', 'ANA', 'NEYLA', 'LAURA', 'SOFIA', 'ISABEL', 'CAROLINA', 'DANIELA', 'VALENTINA', 'GABRIELA', 'CAMILA'];
        const firstName = nombre.split(' ')[0].toUpperCase();
        return femaleNames.includes(firstName) ? 'F' : 'M';
    }
    
    function formatPhoneNumber(phoneNumber) {
        if (!phoneNumber) return '';
        const cleanNumber = phoneNumber.toString().replace(/\D/g, '');
        return cleanNumber.startsWith('57') ? cleanNumber : '57' + cleanNumber;
    }
    
    function capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }
    
    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return "buenos días";
        if (hour < 18) return "buenas tardes";
        return "buenas noches";
    }
    
    function formatCargo(cargo) {
        if (!cargo) return '';
        const lowercaseWords = ['de', 'del', 'la', 'las', 'los', 'y', 'e', 'o', 'u', 'a'];
        return cargo.split(' ').map((word, index) => 
            lowercaseWords.includes(word.toLowerCase()) && index !== 0 ? word.toLowerCase() : capitalizeFirstLetter(word)
        ).join(' ');
    }
    
    function createWhatsAppMessage(contact) {
        const greeting = getGreeting();
        const firstName = capitalizeFirstLetter(contact.NOMBRES?.split(' ')[0] || '');
        const lastName = capitalizeFirstLetter(contact.APELLIDOS?.split(' ')[0] || '');
        return `Dios y Patria, ${greeting} ${firstName} ${lastName}`;
    }
    
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
    
   function createVCardForContact(contact) {
    if (!contact) return null;
    
    const gradoCompleto = getFullGrado(contact.GR, determineGender(contact.NOMBRES));
    const fullName = `${contact.NOMBRES || ''} ${contact.APELLIDOS || ''}`.trim();
    
    // Función para escapar caracteres especiales en valores vCard
    const escapeVCardValue = (value) => {
        if (!value) return '';
        return value.replace(/[,;\\]/g, '\\$&');
    };
    
    // Crear vCard con formato mejorado
    let vCard = "BEGIN:VCARD\r\n";
    vCard += "VERSION:3.0\r\n";
    vCard += `N:${escapeVCardValue(contact.APELLIDOS || '')};${escapeVCardValue(contact.NOMBRES || '')};;;\r\n`;
    vCard += `FN:${escapeVCardValue(fullName)}\r\n`;
    vCard += `ORG:Policía Nacional de Colombia\r\n`;
    vCard += `TITLE:${escapeVCardValue(gradoCompleto)} - ${escapeVCardValue(contact.CARGO || '')}\r\n`;
    
    if (contact.CELULAR) {
        // Asegurar formato internacional para el número
        const phoneNumber = formatPhoneNumber(contact.CELULAR);
        vCard += `TEL;TYPE=CELL:+${phoneNumber}\r\n`;
    }
    
    if (contact["CORREO ELECTRÓNICO"]) {
        vCard += `EMAIL:${escapeVCardValue(contact["CORREO ELECTRÓNICO"])}\r\n`;
    }
    
    vCard += "END:VCARD";
    
    return {
        vCardData: vCard,
        fileName: `${fullName.replace(/\s+/g, '_')}.vcf`
    };
}
    
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
})();
