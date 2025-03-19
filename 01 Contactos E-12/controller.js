// Controlador principal de la aplicación
const AppController = (function(model, ui, utils) {
    // Elementos del DOM
    let elements;
    
    // Inicialización de la aplicación
    function init() {
        console.log('Inicializando aplicación...');
        
        // Inicializar elementos UI
        elements = ui.initElements();
        
        // Cargar contactos y actualizar resumen
        const contacts = model.loadFromLocalStorage();
        if (contacts.length > 0) {
            PersonalSummary.setContacts(contacts);
            PersonalSummary.updateSummary();
            
            // Mostrar el primer contacto
            model.setCurrentIndex(0);
            updateCurrentContactView();
        }
        
        // Configurar manejadores de eventos
        setupEventListeners();
    }
    
    function setupEventListeners() {
        // Manejo de carga de archivos
        elements.fileInput.addEventListener('change', handleFileInput);
        
        // Manejo de búsqueda
        elements.searchForm.addEventListener('submit', handleSearch);
        elements.voiceSearchBtn.addEventListener('click', handleVoiceSearch);
        document.addEventListener('voiceSearchCompleted', handleVoiceSearchResult);
        
        // Navegación
        elements.prevBtn.addEventListener('click', navigatePrev);
        elements.nextBtn.addEventListener('click', navigateNext);
        
        // Acciones de contacto
        elements.callBtn.addEventListener('click', handleCall);
        elements.whatsappBtn.addEventListener('click', handleWhatsApp);
        elements.emailBtn.addEventListener('click', handleEmail);
        elements.shareBtn.addEventListener('click', handleShare);
        
        // Evento para copiar nombre
        document.addEventListener('copyNameClicked', handleCopyNameAndAdvance);
    }
    
    function handleFileInput(e) {
        const file = e.target.files[0];
        if (file) {
            console.log('Archivo seleccionado:', file.name);
            const reader = new FileReader();
            
            reader.onload = (e) => {
                console.log('Archivo leído, iniciando procesamiento');
                const contacts = model.loadFromFile(e.target.result);
                
                if (contacts && contacts.length > 0) {
                    PersonalSummary.setContacts(contacts);
                    PersonalSummary.updateSummary();
                    
                    model.setCurrentIndex(0);
                    updateCurrentContactView();
                    ui.showMessage(`${contacts.length} contactos cargados`, 2000);
                } else {
                    ui.showMessage("Error al cargar contactos", 3000);
                }
            };
            
            reader.onerror = (error) => {
                console.error('Error al leer el archivo:', error);
                ui.showMessage("Error al leer el archivo", 3000);
            };
            
            reader.readAsText(file);
        }
    }
    
    function handleSearch(e) {
        e.preventDefault();
        const searchTerm = elements.searchInput.value.toLowerCase().trim();
        console.log('Término de búsqueda:', searchTerm);
        
        if (searchTerm) {
            const results = model.searchContacts(searchTerm);
            console.log(`Resultados encontrados: ${results.length}`);
            
            updateCurrentContactView();
            ui.showMessage(`${results.length} contactos encontrados`, 2000);
        } else {
            console.log('Búsqueda vacía');
            ui.resetNavigation();
            elements.actionButtons.style.display = 'none';
            elements.resultsDiv.innerHTML = '';
        }
    }
    
    function handleVoiceSearch() {
        ui.startVoiceRecognition();
    }
    
    function handleVoiceSearchResult(e) {
        const searchTerm = e.detail.searchTerm;
        elements.searchInput.value = searchTerm;
        
        // Ejecutar búsqueda
        const results = model.searchContacts(searchTerm);
        console.log(`Resultados encontrados por voz: ${results.length}`);
        
        updateCurrentContactView();
        ui.showMessage(`${results.length} contactos encontrados`, 2000);
    }
    
    function navigatePrev() {
        const contact = model.prevContact();
        if (contact) {
            updateCurrentContactView();
        }
    }
    
    function navigateNext() {
        const contact = model.nextContact();
        if (contact) {
            updateCurrentContactView();
        }
    }
    
    function updateCurrentContactView() {
        const contact = model.getCurrentContact();
        const results = model.getCurrentResults();
        const currentIndex = model.getCurrentIndex();
        
        ui.displayContact(contact);
        ui.updateNavigation(currentIndex, results.length);
    }
    
    function handleCall() {
        const contact = model.getCurrentContact();
        if (contact && contact.CELULAR) {
            window.location.href = `tel:${contact.CELULAR}`;
        } else {
            ui.showMessage("No hay número de teléfono disponible", 2000);
        }
    }
    
    function handleWhatsApp() {
        const contact = model.getCurrentContact();
        if (contact && contact.CELULAR) {
            const message = utils.createWhatsAppMessage(contact);
            const formattedNumber = utils.formatPhoneNumber(contact.CELULAR);
            window.open(`https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`, '_blank');
        } else {
            ui.showMessage("No hay número de teléfono disponible", 2000);
        }
    }
    
    function handleEmail() {
        const contact = model.getCurrentContact();
        if (contact && contact["CORREO ELECTRÓNICO"]) {
            const subject = "Contacto Policial";
            const body = utils.createEmailMessage(contact);
            window.location.href = `mailto:${contact["CORREO ELECTRÓNICO"]}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        } else {
            ui.showMessage("No hay correo electrónico disponible", 2000);
        }
    }
    
    function handleShare() {
        const contact = model.getCurrentContact();
        if (!contact) return;
        
        const gender = utils.determineGender(contact.NOMBRES);
        const fullGrado = utils.getFullGrado(contact.GR, gender);
        const text = `${fullGrado} ${contact.NOMBRES || ''} ${contact.APELLIDOS || ''}\nCelular: ${contact.CELULAR || 'N/A'}\nCorreo: ${contact["CORREO ELECTRÓNICO"] || 'N/A'}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Contacto Policial',
                text: text
            }).catch(err => {
                console.error('Error al compartir:', err);
                copyToClipboard(text);
            });
        } else {
            copyToClipboard(text);
        }
    }
    
    function copyToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            ui.showMessage("Información copiada al portapapeles", 2000);
        } catch (err) {
            console.error('No se pudo copiar el texto:', err);
            ui.showMessage("Error al copiar información", 2000);
        }
        
        document.body.removeChild(textArea);
    }
    
    function handleCopyNameAndAdvance() {
        const contact = model.getCurrentContact();
        if (!contact) return;
        
        const fullName = `${contact.NOMBRES || ''} ${contact.APELLIDOS || ''}`.trim();
        copyToClipboard(fullName);
        
        // Avanzar al siguiente contacto después de un breve retraso
        setTimeout(() => {
            const nextContact = model.nextContact();
            if (nextContact) {
                updateCurrentContactView();
            } else {
                ui.showMessage("No hay más registros para copiar", 3000);
            }
        }, 500);
    }
    
    return {
        init: init
    };
})(ContactModel, UIController, ContactUtils);
