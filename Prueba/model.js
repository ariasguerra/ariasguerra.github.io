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
    
    function searchContacts(term) {
        if (!term || contacts.length === 0) return [];
        
        term = term.toLowerCase().trim();
        
        currentResults = contacts.filter(contact => {
            const fullGrado = ContactUtils.getFullGrado(contact.GR, ContactUtils.determineGender(contact.NOMBRES)).toLowerCase();
            return (
                fullGrado.includes(term) ||
                (contact.NOMBRES && contact.NOMBRES.toLowerCase().includes(term)) ||
                (contact.APELLIDOS && contact.APELLIDOS.toLowerCase().includes(term)) ||
                (contact.CC && contact.CC.toString().includes(term)) ||
                (contact.PLACA && contact.PLACA.toString().includes(term)) ||
                (contact.CELULAR && contact.CELULAR.toString().includes(term)) ||
                (contact.CARGO && contact.CARGO.toLowerCase().includes(term))
            );
        });
        
        currentIndex = currentResults.length > 0 ? 0 : -1;
        return currentResults;
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
