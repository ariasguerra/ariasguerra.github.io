/**
 * Controlador de la interfaz de usuario
 * 
 * Gestiona todos los aspectos visuales y de interacción con el usuario
 */
const UIController = (function() {
    // Referencia a elementos del DOM
    let elements = {
        fileInput: null,
        searchForm: null,
        searchInput: null,
        voiceSearchBtn: null,
        resultsDiv: null,
        actionButtons: null,
        prevBtn: null,
        nextBtn: null,
        currentPageSpan: null,
        callBtn: null,
        whatsappBtn: null,
        emailBtn: null,
        shareBtn: null,
        addContactBtn: null,
        contactModal: null,
        closeModalBtn: null,
        addToContactsBtn: null,
        cancelAddBtn: null
    };
    
    // Variables para mensajes temporales
    let copyMessageTimeout;
    
    /**
     * Inicializa las referencias a elementos del DOM
     * @returns {Object} Referencias a elementos
     */
    function initElements() {
        elements = {
            fileInput: document.getElementById('json-file'),
            searchForm: document.getElementById('search-form'),
            searchInput: document.getElementById('search-input'),
            voiceSearchBtn: document.getElementById('voice-search-btn'),
            resultsDiv: document.getElementById('results'),
            actionButtons: document.getElementById('action-buttons'),
            prevBtn: document.getElementById('prev-btn'),
            nextBtn: document.getElementById('next-btn'),
            currentPageSpan: document.getElementById('current-page'),
            callBtn: document.getElementById('call-btn'),
            whatsappBtn: document.getElementById('whatsapp-btn'),
            emailBtn: document.getElementById('email-btn'),
            shareBtn: document.getElementById('share-btn'),
            addContactBtn: document.getElementById('add-contact-btn')
        };
        
        elements.contactModal = createContactModal();
        elements.closeModalBtn = document.querySelector('.close-modal');
        elements.addToContactsBtn = document.getElementById('add-to-contacts-btn');
        elements.cancelAddBtn = document.getElementById('cancel-add-btn');
        
        return elements;
    }
    
    /**
     * Crea el modal para añadir contactos
     * @returns {HTMLElement} Elemento del modal
     */
    function createContactModal() {
        const modal = document.createElement('div');
        modal.id = 'contact-modal';
        modal.className = 'modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h3 class="modal-title">Añadir a Contactos</h3>
                <p>¿Deseas añadir este contacto a tu agenda telefónica?</p>
                <div id="contact-details"></div>
                <div class="modal-buttons">
                    <button id="cancel-add-btn" class="modal-btn secondary-btn">Cancelar</button>
                    <button id="add-to-contacts-btn" class="modal-btn primary-btn">Añadir</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        return modal;
    }
    
    /**
     * Muestra la información de un contacto en la interfaz
     * @param {Object} contact Datos del contacto
     */
    function displayContact(contact) {
        elements.resultsDiv.innerHTML = '';
        if (!contact) {
            elements.actionButtons.style.display = 'none';
            return;
        }
        
        const gradoCompleto = ContactUtils.getFullGrado(contact.GR, ContactUtils.determineGender(contact.NOMBRES));
        const contactDiv = document.createElement('div');
        contactDiv.classList.add('contact');
        contactDiv.innerHTML = `
            <p class="grado">${gradoCompleto}</p>
            <div class="nombre-container">
                <p class="nombre">${contact.NOMBRES || ''} ${contact.APELLIDOS || ''}</p>
                <button id="copy-name-btn" class="copy-btn" title="Copiar nombre y avanzar"><i class="fas fa-copy"></i></button>
            </div>
            <p class="cargo">${contact.CARGO || 'N/A'}</p>
            <p class="cedula">Cédula de Ciudadanía: ${ContactUtils.formatCC(contact.CC)}</p>
            <p class="placa">Placa: ${contact.PLACA || 'N/A'}</p>
            <p class="celular">Celular: ${contact.CELULAR || 'N/A'}</p>
            <p class="correo">Correo Electrónico: ${contact["CORREO ELECTRÓNICO"] || 'N/A'}</p>
        `;
        elements.resultsDiv.appendChild(contactDiv);
        elements.actionButtons.style.display = 'flex';
        
        // Agregar evento al botón de copiar
        const copyNameBtn = document.getElementById('copy-name-btn');
        if (copyNameBtn) {
            copyNameBtn.addEventListener('click', function() {
                // Este evento se manejará en el controlador principal
                const event = new CustomEvent('copyNameClicked');
                document.dispatchEvent(event);
            });
        }
    }
    
    /**
     * Actualiza los controles de navegación
     * @param {Number} currentIndex Índice actual
     * @param {Number} totalResults Total de resultados
     */
    function updateNavigation(currentIndex, totalResults) {
        elements.prevBtn.disabled = currentIndex === 0;
        elements.nextBtn.disabled = currentIndex === totalResults - 1;
        elements.currentPageSpan.textContent = totalResults > 0 ? 
            `${currentIndex + 1} de ${totalResults}` : '0 de 0';
    }
    
    /**
     * Restablece los controles de navegación
     */
    function resetNavigation() {
        elements.prevBtn.disabled = true;
        elements.nextBtn.disabled = true;
        elements.currentPageSpan.textContent = '0 de 0';
    }
    
    /**
     * Muestra un mensaje temporal
     * @param {String} message Mensaje a mostrar
     * @param {Number} duration Duración en milisegundos
     */
    function showMessage(message, duration = 1500) {
        // Limpiar cualquier mensaje anterior
        if (copyMessageTimeout) {
            clearTimeout(copyMessageTimeout);
        }
        
        // Eliminar mensaje anterior si existe
        let existingMessage = document.querySelector('.copy-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Crear y mostrar nuevo mensaje
        const messageElement = document.createElement('div');
        messageElement.classList.add('copy-message');
        messageElement.textContent = message;
        messageElement.style.position = 'fixed';
        messageElement.style.bottom = '20px';
        messageElement.style.left = '50%';
        messageElement.style.transform = 'translateX(-50%)';
        messageElement.style.backgroundColor = '#003366';
        messageElement.style.color = 'white';
        messageElement.style.padding = '10px 20px';
        messageElement.style.borderRadius = '5px';
        messageElement.style.zIndex = '1000';
        
        document.body.appendChild(messageElement);
        
        // Eliminar mensaje después de la duración especificada
        copyMessageTimeout = setTimeout(() => {
            messageElement.remove();
        }, duration);
    }
    
    /**
     * Muestra el modal para añadir un contacto
     * @param {Object} contact Datos del contacto
     */
    function showAddContactModal(contact) {
        if (!contact) return;
        
        const contactDetailsDiv = document.getElementById('contact-details');
        const gradoCompleto = ContactUtils.getFullGrado(contact.GR, ContactUtils.determineGender(contact.NOMBRES));
        
        contactDetailsDiv.innerHTML = `
            <p><strong>Nombre:</strong> ${contact.NOMBRES || ''} ${contact.APELLIDOS || ''}</p>
            <p><strong>Cargo:</strong> ${gradoCompleto} - ${contact.CARGO || 'N/A'}</p>
            <p><strong>Teléfono:</strong> ${contact.CELULAR || 'N/A'}</p>
            <p><strong>Email:</strong> ${contact["CORREO ELECTRÓNICO"] || 'N/A'}</p>
        `;
        
        elements.contactModal.style.display = 'block';
    }
    
    /**
     * Oculta el modal de contacto
     */
    function hideContactModal() {
        elements.contactModal.style.display = 'none';
    }
    
    /**
     * Inicia el reconocimiento de voz para búsqueda
     */
    function startVoiceRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            showMessage("Tu navegador no soporta búsqueda por voz", 3000);
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        // Configurar reconocimiento de voz
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 3; // Obtener múltiples alternativas para mejorar precisión
        
        elements.voiceSearchBtn.classList.add('listening');
        
        recognition.onstart = function() {
            showMessage("Escuchando...", 60000);
        };
        
        recognition.onresult = function(event) {
            // Obtener el resultado más probable
            const transcript = event.results[0][0].transcript;
            
            // Limpiar el texto reconocido: eliminar palabras innecesarias
            const cleanedTranscript = cleanTranscript(transcript);
            
            elements.searchInput.value = cleanedTranscript;
            showMessage(`Buscando: "${cleanedTranscript}"`, 2000);
            
            // Disparar evento personalizado para la búsqueda
            setTimeout(() => {
                const searchEvent = new CustomEvent('voiceSearchCompleted', {
                    detail: { searchTerm: cleanedTranscript }
                });
                document.dispatchEvent(searchEvent);
            }, 500);
        };
        
        recognition.onerror = function(event) {
            elements.voiceSearchBtn.classList.remove('listening');
            showMessage("Error en reconocimiento de voz", 3000);
            console.error('Error de reconocimiento de voz:', event.error);
        };
        
        recognition.onend = function() {
            elements.voiceSearchBtn.classList.remove('listening');
            document.querySelector('.copy-message')?.remove();
        };
        
        recognition.start();
    }
    
    /**
     * Limpia el texto reconocido por voz
     * @param {String} transcript Texto reconocido
     * @returns {String} Texto limpio
     */
    function cleanTranscript(transcript) {
        // Convertir a minúsculas
        let cleaned = transcript.toLowerCase();
        
        // Eliminar palabras comunes que pueden interferir con la búsqueda
        const wordsToRemove = [
            'buscar', 'busca', 'búscame', 'buscar a', 'busca a',
            'encuentra', 'encuentra a', 'quiero ver', 'quiero buscar',
            'muéstrame', 'muéstrame a', 'dime', 'por favor'
        ];
        
        wordsToRemove.forEach(word => {
            const regex = new RegExp(`^${word}\\s+`, 'i');
            cleaned = cleaned.replace(regex, '');
        });
        
        // Eliminar artículos y preposiciones al inicio
        cleaned = cleaned.replace(/^(el|la|los|las|un|una|unos|unas|de|del)\s+/i, '');
        
        // Eliminar signos de puntuación
        cleaned = cleaned.replace(/[.,;:¿?¡!]/g, '');
        
        return cleaned.trim();
    }
    
    /**
     * Descarga una tarjeta vCard
     * @param {String} vCardData Datos de la tarjeta vCard
     * @param {String} fileName Nombre del archivo
     */
    function downloadVCard(vCardData, fileName) {
        const blob = new Blob([vCardData], { type: "text/vcard" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }
    
    // API pública del módulo
    return {
        initElements,
        displayContact,
        updateNavigation,
        resetNavigation,
        showMessage,
        showAddContactModal,
        hideContactModal,
        startVoiceRecognition,
        downloadVCard,
        cleanTranscript  // Añadido para posible uso externo
    };
})();
