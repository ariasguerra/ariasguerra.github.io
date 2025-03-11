// Gestión de datos de contactos
const ContactModel = (function() {
    let contacts = [];
    let currentResults = [];
    let currentIndex = 0;
    
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
    
    function loadFromExcelFile(excelFile) {
        return new Promise(async (resolve, reject) => {
            try {
                // Procesar el archivo Excel con el módulo ExcelLoader
                const result = await ExcelLoader.processExcelFile(excelFile);
                
                if (result.success && result.contacts.length > 0) {
                    contacts = result.contacts;
                    saveToLocalStorage();
                    
                    console.log(`${contacts.length} contactos cargados desde Excel`);
                    resolve(contacts);
                } else {
                    console.error('Error al cargar contactos desde Excel:', result.message);
                    reject(result.message);
                }
            } catch (error) {
                console.error('Error en loadFromExcelFile:', error);
                reject(error.message || 'Error desconocido al procesar el archivo Excel');
            }
        });
    }
    
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
    
    // Función auxiliar para eliminar tildes y caracteres diacríticos
    function removeDiacritics(text) {
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    
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
    
    return {
        loadFromLocalStorage,
        saveToLocalStorage,
        loadFromFile,
        loadFromExcelFile,
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
