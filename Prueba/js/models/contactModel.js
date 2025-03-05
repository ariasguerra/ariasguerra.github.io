/**
 * Modelo de datos para contactos
 * 
 * Gestiona el almacenamiento, búsqueda y manipulación de los datos de contactos
 */
const ContactModel = (function() {
    let contacts = [];
    let currentResults = [];
    let currentIndex = 0;
    
    /**
     * Carga los contactos desde el almacenamiento local
     * @returns {Array} Lista de contactos
     */
    function loadFromLocalStorage() {
        const storedContacts = localStorage.getItem('policialContacts');
        if (storedContacts) {
            try {
                contacts = JSON.parse(storedContacts);
                return contacts;
            } catch (error) {
                console.error('Error al parsear los contactos almacenados:', error);
                return [];
            }
        }
        return [];
    }
    
    /**
     * Guarda los contactos en el almacenamiento local
     * @returns {Boolean} Resultado de la operación
     */
    function saveToLocalStorage() {
        try {
            localStorage.setItem('policialContacts', JSON.stringify(contacts));
            console.log(`${contacts.length} contactos guardados en almacenamiento local`);
            return true;
        } catch (error) {
            console.error('Error al guardar contactos en almacenamiento local:', error);
            return false;
        }
    }
    
    /**
     * Carga contactos desde un archivo JSON
     * @param {String} jsonData Contenido del archivo JSON
     * @returns {Array|null} Lista de contactos o null en caso de error
     */
    function loadFromFile(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            contacts = Array.isArray(data) ? data : [data];
            saveToLocalStorage();
            return contacts;
        } catch (error) {
            console.error('Error al parsear el archivo JSON:', error);
            return null;
        }
    }
    
    /**
     * Busca contactos según un término
     * @param {String} term Término de búsqueda
     * @returns {Array} Resultados de la búsqueda
     */
    function searchContacts(term) {
        if (!term || contacts.length === 0) return [];
        
        // Normalizar término de búsqueda: convertir a minúsculas, eliminar tildes
        // y dividir en palabras individuales
        const normalizedTerm = removeDiacritics(term.toLowerCase().trim());
        const searchTerms = normalizedTerm.split(/\s+/);
        
        // Filtrar contactos que coincidan con los términos de búsqueda
        currentResults = contacts.filter(contact => {
            // Obtener texto normalizado (sin tildes) de todos los campos relevantes del contacto
            const contactTexts = [
                ContactUtils.getFullGrado(contact.GR, ContactUtils.determineGender(contact.NOMBRES)).toLowerCase(),
                (contact.NOMBRES || '').toLowerCase(),
                (contact.APELLIDOS || '').toLowerCase(),
                contact.CC ? contact.CC.toString() : '',
                contact.PLACA ? contact.PLACA.toString() : '',
                contact.CELULAR ? contact.CELULAR.toString() : '',
                (contact.CARGO || '').toLowerCase()
            ].map(text => removeDiacritics(text));
            
            // Texto completo del contacto para búsqueda combinada
            const fullContactText = removeDiacritics([
                ContactUtils.getFullGrado(contact.GR, ContactUtils.determineGender(contact.NOMBRES)),
                contact.NOMBRES || '',
                contact.APELLIDOS || '',
                contact.CARGO || ''
            ].join(' ').toLowerCase());
            
            // Verificar si todos los términos de búsqueda están presentes en alguno de los campos
            // o si se encuentran en diferentes campos pero forman parte del contacto
            return searchTerms.every(term => 
                // Buscar en campos individuales
                contactTexts.some(text => text.includes(term)) ||
                // Buscar en el texto completo del contacto (para términos combinados)
                fullContactText.includes(term)
            );
        });
        
        currentIndex = currentResults.length > 0 ? 0 : -1;
        return currentResults;
    }
    
    /**
     * Función auxiliar para eliminar tildes y caracteres diacríticos
     * @param {String} text Texto a normalizar
     * @returns {String} Texto sin caracteres diacríticos
     */
    function removeDiacritics(text) {
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    
    // Métodos para obtener y manipular datos actuales
    function getAllContacts() {
        return contacts;
    }
    
    function getCurrentResults() {
        return currentResults;
    }
    
    function getCurrentContact() {
        return currentResults.length > 0 && currentIndex >= 0 ? currentResults[currentIndex] : null;
    }
    
    function getCurrentIndex() {
        return currentIndex;
    }
    
    function setCurrentIndex(index) {
        if (index >= 0 && index < currentResults.length) {
            currentIndex = index;
            return true;
        }
        return false;
    }
    
    function nextContact() {
        if (currentIndex < currentResults.length - 1) {
            currentIndex++;
            return getCurrentContact();
        }
        return null;
    }
    
    function prevContact() {
        if (currentIndex > 0) {
            currentIndex--;
            return getCurrentContact();
        }
        return null;
    }
    
    // API pública del módulo
    return {
        loadFromLocalStorage,
        saveToLocalStorage,
        loadFromFile,
        searchContacts,
        getAllContacts,
        getCurrentResults,
        getCurrentContact,
        getCurrentIndex,
        setCurrentIndex,
        nextContact,
        prevContact
    };
})();
