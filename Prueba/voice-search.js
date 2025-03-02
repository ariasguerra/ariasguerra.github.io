// voice-search.js
// Funciones para b�squeda por voz en la aplicaci�n de gesti�n de cuadrantes policiales

/**
 * Inicializa y configura el reconocimiento de voz para los campos de b�squeda
 */
function setupVoiceSearch() {
    // Verificar soporte para la API de reconocimiento de voz
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('El reconocimiento de voz no est� soportado en este navegador');
        return;
    }
    
    // A�adir los estilos necesarios
    addVoiceSearchStyles();
    
    // Agregar botones de voz a todos los campos de b�squeda existentes
    addVoiceButtonsToExistingInputs();
    
    // Configurar observadores para detectar nuevos campos de b�squeda
    setupSearchInputObservers();
    
    // Mejorar la funcionalidad de b�squeda
    enhanceSearchFunctionality();
}

/**
 * Agregar botones de voz a los campos de b�squeda ya existentes
 */
function addVoiceButtonsToExistingInputs() {
    // Para b�squeda de funcionarios
    document.querySelectorAll('.officer-search').forEach((input, index) => {
        addVoiceButtonToInput(input, `officer-voice-${index + 1}`, 'Buscar funcionario');
    });
    
    // Para b�squeda de motivos (puede que ya existan algunos)
    document.querySelectorAll('.search-input').forEach(input => {
        if (!input.closest('.voice-search-container')) {
            addVoiceButtonToInput(input, `motive-voice-${Date.now()}`, 'Buscar motivo');
        }
    });
}

/**
 * Configura observadores para detectar nuevos campos de b�squeda
 */
function setupSearchInputObservers() {
    // Observador principal para cambios en el DOM
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                // Procesar nodos a�adidos
                mutation.addedNodes.forEach(node => {
                    // Solo procesar elementos DOM
                    if (node.nodeType === 1) {
                        // Buscar campos de entrada en el nuevo nodo
                        processNewNode(node);
                    }
                });
            }
        });
    });
    
    // Iniciar observaci�n de todo el documento
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
    
    // Observador espec�fico para el di�logo de resultados
    document.addEventListener('DOMNodeInserted', event => {
        if (event.target && event.target.className === 'activity-result-dialog') {
            setTimeout(() => {
                const resultSearch = event.target.querySelector('#resultSearch');
                if (resultSearch && !resultSearch.closest('.voice-search-container')) {
                    addVoiceButtonToInput(resultSearch, 'result-voice', 'Buscar resultado');
                }
            }, 100);
        }
    });
}

/**
 * Procesa un nodo reci�n a�adido para detectar campos de b�squeda
 * @param {Node} node - Nodo del DOM a procesar
 */
function processNewNode(node) {
    // Verificar si el nodo es un campo de b�squeda
    if (node.classList && (
        node.classList.contains('search-input') || 
        node.classList.contains('officer-search')
    )) {
        if (!node.closest('.voice-search-container')) {
            const context = node.classList.contains('officer-search') ? 'Buscar funcionario' : 'Buscar motivo';
            addVoiceButtonToInput(node, `voice-${Date.now()}`, context);
        }
        return;
    }
    
    // Si es el campo de b�squeda de resultados
    if (node.id === 'resultSearch') {
        if (!node.closest('.voice-search-container')) {
            addVoiceButtonToInput(node, 'result-voice', 'Buscar resultado');
        }
        return;
    }
    
    // Buscar campos de b�squeda dentro del nodo
    if (node.querySelectorAll) {
        // Buscar campos de funcionarios
        node.querySelectorAll('.officer-search').forEach(input => {
            if (!input.closest('.voice-search-container')) {
                addVoiceButtonToInput(input, `officer-voice-${Date.now()}`, 'Buscar funcionario');
            }
        });
        
        // Buscar campos de motivos
        node.querySelectorAll('.search-input').forEach(input => {
            if (!input.closest('.voice-search-container')) {
                addVoiceButtonToInput(input, `motive-voice-${Date.now()}`, 'Buscar motivo');
            }
        });
        
        // Buscar campo de resultados
        const resultSearch = node.querySelector('#resultSearch');
        if (resultSearch && !resultSearch.closest('.voice-search-container')) {
            addVoiceButtonToInput(resultSearch, 'result-voice', 'Buscar resultado');
        }
    }
}

/**
 * Agrega un bot�n de reconocimiento de voz a un campo de entrada espec�fico
 * @param {HTMLElement} inputElement - El elemento de entrada de texto
 * @param {string} id - ID �nico para el bot�n de voz
 * @param {string} context - Contexto de b�squeda para mejorar reconocimiento
 */
function addVoiceButtonToInput(inputElement, id, context) {
    // Verificar que el elemento existe y no tiene ya un bot�n de voz
    if (!inputElement || inputElement.closest('.voice-search-container')) {
        return;
    }
    
    // Crear contenedor para mantener el layout
    const container = document.createElement('div');
    container.className = 'voice-search-container';
    
    // Obtener el estilo del input original para conservar dimensiones
    const computedStyle = window.getComputedStyle(inputElement);
    const width = computedStyle.width;
    const height = computedStyle.height;
    
    // Clonar el input existente
    const originalInput = inputElement.cloneNode(true);
    originalInput.dataset.voiceEnabled = 'true';
    
    // Preservar los atributos clave y el id
    originalInput.id = inputElement.id;
    originalInput.name = inputElement.name;
    originalInput.className = inputElement.className;
    
    // Crear el bot�n de voz
    const voiceButton = document.createElement('button');
    voiceButton.className = 'voice-search-button';
    voiceButton.type = 'button';
    voiceButton.id = id;
    voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
    voiceButton.title = `Activar ${context} por voz`;
    
    // Agregar listener al bot�n
    voiceButton.addEventListener('click', () => {
        startVoiceRecognition(originalInput, voiceButton, context);
    });
    
    // Reemplazar la entrada original con nuestro contenedor
    inputElement.parentNode.insertBefore(container, inputElement);
    container.appendChild(originalInput);
    container.appendChild(voiceButton);
    
    // Ajustar tama�o del contenedor para que coincida con el input original
    container.style.width = width;
    container.style.minHeight = height;
    
    // Transferir eventos del input original
    transferInputEvents(inputElement, originalInput);
    
    // Eliminar el input original
    inputElement.remove();
}

/**
 * Transfiere eventos y propiedades relevantes de un elemento a otro
 * @param {HTMLElement} sourceElement - Elemento original
 * @param {HTMLElement} targetElement - Elemento destino
 */
function transferInputEvents(sourceElement, targetElement) {
    // Eventos comunes para campos de b�squeda
    const events = ['input', 'focus', 'blur', 'keyup', 'keydown', 'change'];
    
    // Transferir manejadores de eventos inline (on*)
    events.forEach(eventType => {
        const handler = sourceElement['on' + eventType];
        if (typeof handler === 'function') {
            targetElement['on' + eventType] = handler;
        }
    });
    
    // Asegurar que los eventos propios de b�squeda se propaguen
    targetElement.addEventListener('input', function(event) {
        // Disparar un evento input que llegue a los manejadores en el documento
        const customEvent = new Event('input', {
            bubbles: true,
            cancelable: true
        });
        
        // Conservar el valor para asegurar que la b�squeda funcione
        sourceElement.value = this.value;
        
        // Disparar el evento desde el elemento original para compatibilidad
        sourceElement.dispatchEvent(customEvent);
    });
}

/**
 * Inicia el reconocimiento de voz para un campo espec�fico
 * @param {HTMLElement} inputElement - Campo de entrada donde se insertar� el texto reconocido
 * @param {HTMLElement} buttonElement - Bot�n de micr�fono para mostrar estado
 * @param {string} context - Contexto de b�squeda para mejorar reconocimiento
 */
function startVoiceRecognition(inputElement, buttonElement, context) {
    // Crear instancia de reconocimiento de voz
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Configurar opciones
    recognition.lang = 'es-CO';  // Espa�ol de Colombia
    recognition.continuous = false;
    recognition.interimResults = false;
    
    // Cambiar el estado visual del bot�n
    buttonElement.classList.add('listening');
    buttonElement.innerHTML = '<i class="fas fa-microphone-alt"></i>';
    
    // Feedback sonoro de inicio
    playAudioFeedback('start');
    
    // Manejar el resultado del reconocimiento
    recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript.trim();
        console.log(`Reconocimiento de voz (${context}): "${speechResult}"`);
        
        // Insertar el texto reconocido en el campo
        inputElement.value = speechResult;
        inputElement.focus();
        
        // Disparar evento de input para activar la b�squeda
        const inputEvent = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        inputElement.dispatchEvent(inputEvent);
        
        // Feedback sonoro de �xito
        playAudioFeedback('success');
    };
    
    // Manejar errores
    recognition.onerror = (event) => {
        console.error('Error en reconocimiento de voz:', event.error);
        
        // Feedback sonoro de error
        playAudioFeedback('error');
        
        // Sugerencia espec�fica seg�n el tipo de error
        let errorMessage = 'Error en el reconocimiento de voz';
        switch (event.error) {
            case 'no-speech':
                errorMessage = 'No se detect� ninguna voz';
                break;
            case 'aborted':
                errorMessage = 'Reconocimiento cancelado';
                break;
            case 'network':
                errorMessage = 'Error de red en reconocimiento de voz';
                break;
            case 'not-allowed':
                errorMessage = 'Permiso de micr�fono denegado';
                break;
        }
        
        // Mostrar mensaje temporal
        showTemporaryMessage(errorMessage, inputElement);
    };
    
    // Restaurar el bot�n cuando termine el reconocimiento
    recognition.onend = () => {
        buttonElement.classList.remove('listening');
        buttonElement.innerHTML = '<i class="fas fa-microphone"></i>';
    };
    
    // Iniciar reconocimiento
    try {
        recognition.start();
    } catch (error) {
        console.error('Error al iniciar reconocimiento de voz:', error);
        buttonElement.classList.remove('listening');
        buttonElement.innerHTML = '<i class="fas fa-microphone"></i>';
        showTemporaryMessage('Error al iniciar el micr�fono', inputElement);
    }
}

/**
 * Mejora las funcionalidades de b�squeda existentes
 * Implementa b�squedas m�s flexibles en toda la aplicaci�n
 */
function enhanceSearchFunctionality() {
    // Crear proxies para las funciones de b�squeda originales
    setupOfficerSearchProxy();
    setupMotiveSearchProxy();
    setupResultSearchProxy();
}

/**
 * Configura un proxy para la funci�n de b�squeda de funcionarios
 */
function setupOfficerSearchProxy() {
    // Verificar si la funci�n existe en el contexto global
    if (typeof window.filterOfficers === 'function') {
        // Guardar referencia a la funci�n original
        const originalFilterOfficers = window.filterOfficers;
        
        // Reemplazar con nuestra versi�n mejorada
        window.filterOfficers = function(query, resultsElement, officerIndex) {
            // Si no hay query, usar comportamiento original
            if (!query || !query.trim()) {
                return originalFilterOfficers(query, resultsElement, officerIndex);
            }
            
            // Verificar si las variables globales necesarias existen
            if (!window.contactsList || !Array.isArray(window.contactsList) || 
                !window.teams || !Array.isArray(window.teams) ||
                !window.selectedOfficers) {
                // Recurrir a la funci�n original si faltan dependencias
                return originalFilterOfficers(query, resultsElement, officerIndex);
            }
            
            try {
                // Obtener c�dulas de funcionarios ya asignados
                const assignedOfficers = new Set();
                window.teams.forEach(team => {
                    if (team.contacts && Array.isArray(team.contacts)) {
                        team.contacts.forEach(contact => {
                            if (contact && contact.CC) {
                                assignedOfficers.add(contact.CC.toString());
                            }
                        });
                    }
                });
                
                // No excluir al oficial actualmente seleccionado
                if (window.selectedOfficers[officerIndex] && window.selectedOfficers[officerIndex].CC) {
                    assignedOfficers.delete(window.selectedOfficers[officerIndex].CC.toString());
                }
                
                // Procesar los t�rminos de b�squeda
                const searchTerms = query.toLowerCase().trim().split(/\s+/);
                
                // Filtrar funcionarios con coincidencia flexible
                const filteredOfficers = window.contactsList.filter(officer => {
                    if (!officer || !officer.CC) return false;
                    
                    // Verificar si ya est� asignado
                    const isAssigned = assignedOfficers.has(officer.CC.toString());
                    if (isAssigned) return false;
                    
                    // Crear un texto combinado con todos los datos del funcionario
                    const fullOfficerText = `${officer.GR || ''} ${officer.APELLIDOS || ''} ${officer.NOMBRES || ''}`.toLowerCase();
                    
                    // Comprobar si todos los t�rminos de b�squeda est�n presentes
                    return searchTerms.every(term => fullOfficerText.includes(term));
                });
                
                // Vaciar el contenedor de resultados
                resultsElement.innerHTML = '';
                
                if (filteredOfficers.length === 0) {
                    // Mostrar mensaje de no resultados
                    const noResults = document.createElement('div');
                    noResults.className = 'officer-result-item';
                    noResults.textContent = 'No se encontraron funcionarios disponibles';
                    resultsElement.appendChild(noResults);
                } else {
                    // Ordenar por apellido
                    filteredOfficers.sort((a, b) => 
                        (a.APELLIDOS || '').localeCompare(b.APELLIDOS || '')
                    );
                    
                    filteredOfficers.forEach(officer => {
                        const item = document.createElement('div');
                        item.className = 'officer-result-item';
                        item.textContent = `${officer.GR || ''} ${officer.APELLIDOS || ''} ${officer.NOMBRES || ''}`;
                        
                        item.onclick = () => {
                            if (typeof window.selectOfficer === 'function') {
                                window.selectOfficer(officer, officerIndex);
                                resultsElement.style.display = 'none';
                            }
                        };
                        
                        // A�adir soporte t�ctil
                        item.ontouchend = (e) => {
                            if (typeof window.selectOfficer === 'function') {
                                window.selectOfficer(officer, officerIndex);
                                resultsElement.style.display = 'none';
                                e.preventDefault(); // Prevenir eventos tap dobles
                            }
                        };
                        
                        resultsElement.appendChild(item);
                    });
                }
                
                resultsElement.style.display = 'block';
                return; // No continuar con la funci�n original
            } catch (error) {
                console.error('Error en b�squeda mejorada de funcionarios:', error);
                // En caso de error, volver al comportamiento original
                return originalFilterOfficers(query, resultsElement, officerIndex);
            }
        };
    }
}

/**
 * Configura un proxy para la funci�n de b�squeda de motivos
 */
function setupMotiveSearchProxy() {
    // Verificar si la funci�n existe en el contexto global
    if (typeof window.filterMotives === 'function') {
        // Guardar referencia a la funci�n original
        const originalFilterMotives = window.filterMotives;
        
        // Reemplazar con nuestra versi�n mejorada
        window.filterMotives = function(query, resultsElement, team) {
            // Si no hay query, usar comportamiento original
            if (!query || !query.trim()) {
                return originalFilterMotives(query, resultsElement, team);
            }
            
            // Verificar si las variables globales necesarias existen
            if (!window.motivesList || !Array.isArray(window.motivesList)) {
                // Recurrir a la funci�n original si faltan dependencias
                return originalFilterMotives(query, resultsElement, team);
            }
            
            try {
                // Procesar los t�rminos de b�squeda
                const searchTerms = query.toLowerCase().trim().split(/\s+/);
                
                // Filtrar motivos con coincidencia flexible
                const filteredMotives = window.motivesList.filter(motive => {
                    if (!motive || !motive.text) return false;
                    
                    const fullMotiveText = motive.text.toLowerCase();
                    const motiveCode = (motive.value || '').toLowerCase();
                    
                    // Comprobar si al menos un t�rmino est� presente
                    return searchTerms.some(term => 
                        fullMotiveText.includes(term) || motiveCode.includes(term)
                    );
                });
                
                // Vaciar el contenedor de resultados
                resultsElement.innerHTML = '';
                
                if (filteredMotives.length === 0) {
                    // Mostrar mensaje de no resultados
                    const noResults = document.createElement('div');
                    noResults.className = 'search-result-item';
                    noResults.textContent = 'No se encontraron coincidencias';
                    noResults.style.fontStyle = 'italic';
                    resultsElement.appendChild(noResults);
                } else {
                    // Ordenar por c�digo
                    filteredMotives.sort((a, b) => 
                        (a.value || '').localeCompare(b.value || '')
                    );
                    
                    filteredMotives.forEach(motive => {
                        const item = document.createElement('div');
                        item.className = 'search-result-item';
                        item.textContent = motive.text;
                        
                        item.onmousedown = () => {
                            if (typeof window.selectMotive === 'function') {
                                window.selectMotive(motive.value, team);
                                resultsElement.parentNode.querySelector('.search-input').value = motive.text;
                                resultsElement.style.display = 'none';
                            }
                        };
                        
                        // A�adir soporte touch
                        item.ontouchend = (e) => {
                            if (typeof window.selectMotive === 'function') {
                                window.selectMotive(motive.value, team);
                                resultsElement.parentNode.querySelector('.search-input').value = motive.text;
                                resultsElement.style.display = 'none';
                                e.preventDefault();
                            }
                        };
                        
                        resultsElement.appendChild(item);
                    });
                }
                
                resultsElement.style.display = filteredMotives.length > 0 ? 'block' : 'none';
                return; // No continuar con la funci�n original
            } catch (error) {
                console.error('Error en b�squeda mejorada de motivos:', error);
                // En caso de error, volver al comportamiento original
                return originalFilterMotives(query, resultsElement, team);
            }
        };
    }
}

/**
 * Configura un proxy para la funci�n de b�squeda de resultados
 */
function setupResultSearchProxy() {
    // Verificar si la funci�n existe en el contexto global
    if (typeof window.searchActivityResults === 'function') {
        // Guardar referencia a la funci�n original
        const originalSearchActivityResults = window.searchActivityResults;
        
        // Reemplazar con nuestra versi�n mejorada
        window.searchActivityResults = function(query) {
            // Si no hay query, usar comportamiento original
            if (!query || !query.trim()) {
                return originalSearchActivityResults(query);
            }
            
            try {
                // Procesar los t�rminos de b�squeda
                const searchTerms = query.toLowerCase().trim().split(/\s+/);
                
                // Si no tenemos la lista o est� vac�a, usar comportamiento predeterminado
                if (!window.activityResultsList || !Array.isArray(window.activityResultsList) || window.activityResultsList.length === 0) {
                    const defaultResults = [
                        "Captura", "Comparendo", "Traslado por Protecci�n", "Cierre de Establecimiento",
                        "Incautaci�n de Arma Blanca", "Incautaci�n de Arma de Fuego"
                    ];
                    
                    // Filtrar con coincidencia flexible
                    return defaultResults.filter(result => 
                        searchTerms.some(term => result.toLowerCase().includes(term))
                    );
                }
                
                // Buscar en todas las categor�as con coincidencia flexible
                const allResults = [];
                
                window.activityResultsList.forEach(category => {
                    if (category.resultados && Array.isArray(category.resultados)) {
                        category.resultados.forEach(result => {
                            if (searchTerms.every(term => result.toLowerCase().includes(term))) {
                                allResults.push(result);
                            }
                        });
                    }
                });
                
                return allResults;
            } catch (error) {
                console.error('Error en b�squeda mejorada de resultados:', error);
                // En caso de error, volver al comportamiento original
                return originalSearchActivityResults(query);
            }
        };
    }
    
    // Mejorar la visualizaci�n de resultados si existe
    if (typeof window.displayActivityResults === 'function') {
        const originalDisplayActivityResults = window.displayActivityResults;
        
        window.displayActivityResults = function(results, container) {
            try {
                if (!results || !Array.isArray(results) || !container) {
                    return originalDisplayActivityResults(results, container);
                }
                
                // Vaciar el contenedor
                container.innerHTML = '';
                
                if (results.length === 0) {
                    const noResults = document.createElement('div');
                    noResults.textContent = 'No se encontraron resultados';
                    noResults.style.padding = '10px';
                    noResults.style.fontStyle = 'italic';
                    container.appendChild(noResults);
                    return;
                }
                
                // Intentar organizar por categor�as
                const resultsByCategory = {};
                const defaultCategory = 'Otros resultados';
                
                // Encontrar categor�a para cada resultado
                results.forEach(result => {
                    let foundCategory = defaultCategory;
                    
                    if (window.activityResultsList && Array.isArray(window.activityResultsList)) {
                        for (const category of window.activityResultsList) {
                            if (category.resultados && 
                                Array.isArray(category.resultados) && 
                                category.resultados.includes(result)) {
                                foundCategory = category.categoria;
                                break;
                            }
                        }
                    }
                    
                    if (!resultsByCategory[foundCategory]) {
                        resultsByCategory[foundCategory] = [];
                    }
                    resultsByCategory[foundCategory].push(result);
                });
                
                // Mostrar resultados organizados por categor�a
                Object.keys(resultsByCategory).sort().forEach(categoryName => {
                    const categoryResults = resultsByCategory[categoryName];
                    
                    const categoryDiv = document.createElement('div');
                    categoryDiv.className = 'result-category';
                    categoryDiv.innerHTML = `<h4>${categoryName}</h4>`;
                    
                    // Ordenar alfab�ticamente dentro de cada categor�a
                    categoryResults.sort().forEach(result => {
                        const resultDiv = document.createElement('div');
                        resultDiv.textContent = result;
                        
                        resultDiv.addEventListener('click', () => {
                            // Eliminar selecci�n previa
                            container.querySelectorAll('.selected').forEach(el => {
                                el.classList.remove('selected');
                            });
                            
                            // Marcar como seleccionado
                            resultDiv.classList.add('selected');
                            
                            // Habilitar el bot�n de confirmaci�n
                            const confirmButton = document.getElementById('confirmResult');
                            if (confirmButton) confirmButton.disabled = false;
                        });
                        
                        categoryDiv.appendChild(resultDiv);
                    });
                    
                    container.appendChild(categoryDiv);
                });
            } catch (error) {
                console.error('Error en visualizaci�n mejorada de resultados:', error);
                // En caso de error, volver al comportamiento original
                return originalDisplayActivityResults(results, container);
            }
        };
    }
}

/**
 * Reproduce un feedback de audio seg�n el evento
 * @param {string} type - Tipo de feedback: 'start', 'success', o 'error'
 */
function playAudioFeedback(type) {
    // Frecuencias y duraci�n seg�n el tipo de feedback
    let frequency, duration;
    
    switch (type) {
        case 'start':
            frequency = 880; // La5
            duration = 150;
            break;
        case 'success':
            frequency = 1318.5; // Mi6
            duration = 200;
            break;
        case 'error':
            frequency = 440; // La4
            duration = 300;
            break;
        default:
            return;
    }
    
    try {
        // Crear contexto de audio
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Configurar oscilador
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        
        // Configurar envolvente de amplitud
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration / 1000);
        
        // Conectar nodos y reproducir
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
        console.error('Error al reproducir feedback de audio:', error);
    }
}

/**
 * Muestra un mensaje temporal cerca de un elemento
 * @param {string} message - Mensaje a mostrar
 * @param {HTMLElement} element - Elemento de referencia
 */
function showTemporaryMessage(message, element) {
    const messageElement = document.createElement('div');
    messageElement.className = 'voice-message';
    messageElement.textContent = message;
    
    // Posicionar cerca del elemento
    const rect = element.getBoundingClientRect();
    messageElement.style.top = `${rect.bottom + window.scrollY + 5}px`;
    messageElement.style.left = `${rect.left + window.scrollX}px`;
    
    document.body.appendChild(messageElement);
    
    // Fade in
    setTimeout(() => {
        messageElement.style.opacity = '1';
    }, 10);
    
    // Eliminar despu�s de 3 segundos
    setTimeout(() => {
        messageElement.style.opacity = '0';
        setTimeout(() => {
            if (messageElement.parentNode) {
                document.body.removeChild(messageElement);
            }
        }, 300);
    }, 3000);
}

/**
 * Agrega los estilos CSS necesarios para la funcionalidad de voz
 */
function addVoiceSearchStyles() {
    if (document.getElementById('voice-search-styles
// Inicializar la b�squeda por voz cuando se cargue el DOM
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que la aplicaci�n est� completamente cargada
    setTimeout(setupVoiceSearch, 1000);
});

// Reintentar inicializaci�n cuando la p�gina est� completamente cargada
window.addEventListener('load', () => {
    setupVoiceSearch();
});// voice-search.js
// Funciones para b�squeda por voz en la aplicaci�n de gesti�n de cuadrantes policiales

/**
 * Inicializa y configura el reconocimiento de voz para los campos de b�squeda
 */
function setupVoiceSearch() {
    // Verificar soporte para la API de reconocimiento de voz
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('El reconocimiento de voz no est� soportado en este navegador');
        return;
    }
    
    // A�adir los estilos necesarios
    addVoiceSearchStyles();
    
    // Agregar botones de voz a todos los campos de b�squeda existentes
    addVoiceButtonsToExistingInputs();
    
    // Configurar observadores para detectar nuevos campos de b�squeda
    setupSearchInputObservers();
    
    // Mejorar la funcionalidad de b�squeda
    enhanceSearchFunctionality();
}

/**
 * Agregar botones de voz a los campos de b�squeda ya existentes
 */
function addVoiceButtonsToExistingInputs() {
    // Para b�squeda de funcionarios
    document.querySelectorAll('.officer-search').forEach((input, index) => {
        addVoiceButtonToInput(input, `officer-voice-${index + 1}`, 'Buscar funcionario');
    });
    
    // Para b�squeda de motivos (puede que ya existan algunos)
    document.querySelectorAll('.search-input').forEach(input => {
        if (!input.closest('.voice-search-container')) {
            addVoiceButtonToInput(input, `motive-voice-${Date.now()}`, 'Buscar motivo');
        }
    });
}

/**
 * Configura observadores para detectar nuevos campos de b�squeda
 */
function setupSearchInputObservers() {
    // Observador principal para cambios en el DOM
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                // Procesar nodos a�adidos
                mutation.addedNodes.forEach(node => {
                    // Solo procesar elementos DOM
                    if (node.nodeType === 1) {
                        // Buscar campos de entrada en el nuevo nodo
                        processNewNode(node);
                    }
                });
            }
        });
    });
    
    // Iniciar observaci�n de todo el documento
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
    
    // Observador espec�fico para el di�logo de resultados
    document.addEventListener('DOMNodeInserted', event => {
        if (event.target && event.target.className === 'activity-result-dialog') {
            setTimeout(() => {
                const resultSearch = event.target.querySelector('#resultSearch');
                if (resultSearch && !resultSearch.closest('.voice-search-container')) {
                    addVoiceButtonToInput(resultSearch, 'result-voice', 'Buscar resultado');
                }
            }, 100);
        }
    });
}

/**
 * Procesa un nodo reci�n a�adido para detectar campos de b�squeda
 * @param {Node} node - Nodo del DOM a procesar
 */
function processNewNode(node) {
    // Verificar si el nodo es un campo de b�squeda
    if (node.classList && (
        node.classList.contains('search-input') || 
        node.classList.contains('officer-search')
    )) {
        if (!node.closest('.voice-search-container')) {
            const context = node.classList.contains('officer-search') ? 'Buscar funcionario' : 'Buscar motivo';
            addVoiceButtonToInput(node, `voice-${Date.now()}`, context);
        }
        return;
    }
    
    // Si es el campo de b�squeda de resultados
    if (node.id === 'resultSearch') {
        if (!node.closest('.voice-search-container')) {
            addVoiceButtonToInput(node, 'result-voice', 'Buscar resultado');
        }
        return;
    }
    
    // Buscar campos de b�squeda dentro del nodo
    if (node.querySelectorAll) {
        // Buscar campos de funcionarios
        node.querySelectorAll('.officer-search').forEach(input => {
            if (!input.closest('.voice-search-container')) {
                addVoiceButtonToInput(input, `officer-voice-${Date.now()}`, 'Buscar funcionario');
            }
        });
        
        // Buscar campos de motivos
        node.querySelectorAll('.search-input').forEach(input => {
            if (!input.closest('.voice-search-container')) {
                addVoiceButtonToInput(input, `motive-voice-${Date.now()}`, 'Buscar motivo');
            }
        });
        
        // Buscar campo de resultados
        const resultSearch = node.querySelector('#resultSearch');
        if (resultSearch && !resultSearch.closest('.voice-search-container')) {
            addVoiceButtonToInput(resultSearch, 'result-voice', 'Buscar resultado');
        }
    }
}

/**
 * Agrega un bot�n de reconocimiento de voz a un campo de entrada espec�fico
 * @param {HTMLElement} inputElement - El elemento de entrada de texto
 * @param {string} id - ID �nico para el bot�n de voz
 * @param {string} context - Contexto de b�squeda para mejorar reconocimiento
 */
function addVoiceButtonToInput(inputElement, id, context) {
    // Verificar que el elemento existe y no tiene ya un bot�n de voz
    if (!inputElement || inputElement.closest('.voice-search-container')) {
        return;
    }
    
    // Crear contenedor para mantener el layout
    const container = document.createElement('div');
    container.className = 'voice-search-container';
    
    // Obtener el estilo del input original para conservar dimensiones
    const computedStyle = window.getComputedStyle(inputElement);
    const width = computedStyle.width;
    const height = computedStyle.height;
    
    // Clonar el input existente
    const originalInput = inputElement.cloneNode(true);
    originalInput.dataset.voiceEnabled = 'true';
    
    // Preservar los atributos clave y el id
    originalInput.id = inputElement.id;
    originalInput.name = inputElement.name;
    originalInput.className = inputElement.className;
    
    // Crear el bot�n de voz
    const voiceButton = document.createElement('button');
    voiceButton.className = 'voice-search-button';
    voiceButton.type = 'button';
    voiceButton.id = id;
    voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
    voiceButton.title = `Activar ${context} por voz`;
    
    // Agregar listener al bot�n
    voiceButton.addEventListener('click', () => {
        startVoiceRecognition(originalInput, voiceButton, context);
    });
    
    // Reemplazar la entrada original con nuestro contenedor
    inputElement.parentNode.insertBefore(container, inputElement);
    container.appendChild(originalInput);
    container.appendChild(voiceButton);
    
    // Ajustar tama�o del contenedor para que coincida con el input original
    container.style.width = width;
    container.style.minHeight = height;
    
    // Transferir eventos del input original
    transferInputEvents(inputElement, originalInput);
    
    // Eliminar el input original
    inputElement.remove();
}

/**
 * Transfiere eventos y propiedades relevantes de un elemento a otro
 * @param {HTMLElement} sourceElement - Elemento original
 * @param {HTMLElement} targetElement - Elemento destino
 */
function transferInputEvents(sourceElement, targetElement) {
    // Eventos comunes para campos de b�squeda
    const events = ['input', 'focus', 'blur', 'keyup', 'keydown', 'change'];
    
    // Transferir manejadores de eventos inline (on*)
    events.forEach(eventType => {
        const handler = sourceElement['on' + eventType];
        if (typeof handler === 'function') {
            targetElement['on' + eventType] = handler;
        }
    });
    
    // Asegurar que los eventos propios de b�squeda se propaguen
    targetElement.addEventListener('input', function(event) {
        // Disparar un evento input que llegue a los manejadores en el documento
        const customEvent = new Event('input', {
            bubbles: true,
            cancelable: true
        });
        
        // Conservar el valor para asegurar que la b�squeda funcione
        sourceElement.value = this.value;
        
        // Disparar el evento desde el elemento original para compatibilidad
        sourceElement.dispatchEvent(customEvent);
    });
}

/**
 * Inicia el reconocimiento de voz para un campo espec�fico
 * @param {HTMLElement} inputElement - Campo de entrada donde se insertar� el texto reconocido
 * @param {HTMLElement} buttonElement - Bot�n de micr�fono para mostrar estado
 * @param {string} context - Contexto de b�squeda para mejorar reconocimiento
 */
function startVoiceRecognition(inputElement, buttonElement, context) {
    // Crear instancia de reconocimiento de voz
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Configurar opciones
    recognition.lang = 'es-CO';  // Espa�ol de Colombia
    recognition.continuous = false;
    recognition.interimResults = false;
    
    // Cambiar el estado visual del bot�n
    buttonElement.classList.add('listening');
    buttonElement.innerHTML = '<i class="fas fa-microphone-alt"></i>';
    
    // Feedback sonoro de inicio
    playAudioFeedback('start');
    
    // Manejar el resultado del reconocimiento
    recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript.trim();
        console.log(`Reconocimiento de voz (${context}): "${speechResult}"`);
        
        // Insertar el texto reconocido en el campo
        inputElement.value = speechResult;
        inputElement.focus();
        
        // Disparar evento de input para activar la b�squeda
        const inputEvent = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        inputElement.dispatchEvent(inputEvent);
        
        // Feedback sonoro de �xito
        playAudioFeedback('success');
    };
    
    // Manejar errores
    recognition.onerror = (event) => {
        console.error('Error en reconocimiento de voz:', event.error);
        
        // Feedback sonoro de error
        playAudioFeedback('error');
        
        // Sugerencia espec�fica seg�n el tipo de error
        let errorMessage = 'Error en el reconocimiento de voz';
        switch (event.error) {
            case 'no-speech':
                errorMessage = 'No se detect� ninguna voz';
                break;
            case 'aborted':
                errorMessage = 'Reconocimiento cancelado';
                break;
            case 'network':
                errorMessage = 'Error de red en reconocimiento de voz';
                break;
            case 'not-allowed':
                errorMessage = 'Permiso de micr�fono denegado';
                break;
        }
        
        // Mostrar mensaje temporal
        showTemporaryMessage(errorMessage, inputElement);
    };
    
    // Restaurar el bot�n cuando termine el reconocimiento
    recognition.onend = () => {
        buttonElement.classList.remove('listening');
        buttonElement.innerHTML = '<i class="fas fa-microphone"></i>';
    };
    
    // Iniciar reconocimiento
    try {
        recognition.start();
    } catch (error) {
        console.error('Error al iniciar reconocimiento de voz:', error);
        buttonElement.classList.remove('listening');
        buttonElement.innerHTML = '<i class="fas fa-microphone"></i>';
        showTemporaryMessage('Error al iniciar el micr�fono', inputElement);
    }
}

/**
 * Mejora las funcionalidades de b�squeda existentes
 * Implementa b�squedas m�s flexibles en toda la aplicaci�n
 */
function enhanceSearchFunctionality() {
    // Crear proxies para las funciones de b�squeda originales
    setupOfficerSearchProxy();
    setupMotiveSearchProxy();
    setupResultSearchProxy();
}

/**
 * Configura un proxy para la funci�n de b�squeda de funcionarios
 */
function setupOfficerSearchProxy() {
    // Verificar si la funci�n existe en el contexto global
    if (typeof window.filterOfficers === 'function') {
        // Guardar referencia a la funci�n original
        const originalFilterOfficers = window.filterOfficers;
        
        // Reemplazar con nuestra versi�n mejorada
        window.filterOfficers = function(query, resultsElement, officerIndex) {
            // Si no hay query, usar comportamiento original
            if (!query || !query.trim()) {
                return originalFilterOfficers(query, resultsElement, officerIndex);
            }
            
            // Verificar si las variables globales necesarias existen
            if (!window.contactsList || !Array.isArray(window.contactsList) || 
                !window.teams || !Array.isArray(window.teams) ||
                !window.selectedOfficers) {
                // Recurrir a la funci�n original si faltan dependencias
                return originalFilterOfficers(query, resultsElement, officerIndex);
            }
            
            try {
                // Obtener c�dulas de funcionarios ya asignados
                const assignedOfficers = new Set();
                window.teams.forEach(team => {
                    if (team.contacts && Array.isArray(team.contacts)) {
                        team.contacts.forEach(contact => {
                            if (contact && contact.CC) {
                                assignedOfficers.add(contact.CC.toString());
                            }
                        });
                    }
                });
                
                // No excluir al oficial actualmente seleccionado
                if (window.selectedOfficers[officerIndex] && window.selectedOfficers[officerIndex].CC) {
                    assignedOfficers.delete(window.selectedOfficers[officerIndex].CC.toString());
                }
                
                // Procesar los t�rminos de b�squeda
                const searchTerms = query.toLowerCase().trim().split(/\s+/);
                
                // Filtrar funcionarios con coincidencia flexible
                const filteredOfficers = window.contactsList.filter(officer => {
                    if (!officer || !officer.CC) return false;
                    
                    // Verificar si ya est� asignado
                    const isAssigned = assignedOfficers.has(officer.CC.toString());
                    if (isAssigned) return false;
                    
                    // Crear un texto combinado con todos los datos del funcionario
                    const fullOfficerText = `${officer.GR || ''} ${officer.APELLIDOS || ''} ${officer.NOMBRES || ''}`.toLowerCase();
                    
                    // Comprobar si todos los t�rminos de b�squeda est�n presentes
                    return searchTerms.every(term => fullOfficerText.includes(term));
                });
                
                // Vaciar el contenedor de resultados
                resultsElement.innerHTML = '';
                
                if (filteredOfficers.length === 0) {
                    // Mostrar mensaje de no resultados
                    const noResults = document.createElement('div');
                    noResults.className = 'officer-result-item';
                    noResults.textContent = 'No se encontraron funcionarios disponibles';
                    resultsElement.appendChild(noResults);
                } else {
                    // Ordenar por apellido
                    filteredOfficers.sort((a, b) => 
                        (a.APELLIDOS || '').localeCompare(b.APELLIDOS || '')
                    );
                    
                    filteredOfficers.forEach(officer => {
                        const item = document.createElement('div');
                        item.className = 'officer-result-item';
                        item.textContent = `${officer.GR || ''} ${officer.APELLIDOS || ''} ${officer.NOMBRES || ''}`;
                        
                        item.onclick = () => {
                            if (typeof window.selectOfficer === 'function') {
                                window.selectOfficer(officer, officerIndex);
                                resultsElement.style.display = 'none';
                            }
                        };
                        
                        // A�adir soporte t�ctil
                        item.ontouchend = (e) => {
                            if (typeof window.selectOfficer === 'function') {
                                window.selectOfficer(officer, officerIndex);
                                resultsElement.style.display = 'none';
                                e.preventDefault(); // Prevenir eventos tap dobles
                            }
                        };
                        
                        resultsElement.appendChild(item);
                    });
                }
                
                resultsElement.style.display = 'block';
                return; // No continuar con la funci�n original
            } catch (error) {
                console.error('Error en b�squeda mejorada de funcionarios:', error);
                // En caso de error, volver al comportamiento original
                return originalFilterOfficers(query, resultsElement, officerIndex);
            }
        };
    }
}

/**
 * Configura un proxy para la funci�n de b�squeda de motivos
 */
function setupMotiveSearchProxy() {
    // Verificar si la funci�n existe en el contexto global
    if (typeof window.filterMotives === 'function') {
        // Guardar referencia a la funci�n original
        const originalFilterMotives = window.filterMotives;
        
        // Reemplazar con nuestra versi�n mejorada
        window.filterMotives = function(query, resultsElement, team) {
            // Si no hay query, usar comportamiento original
            if (!query || !query.trim()) {
                return originalFilterMotives(query, resultsElement, team);
            }
            
            // Verificar si las variables globales necesarias existen
            if (!window.motivesList || !Array.isArray(window.motivesList)) {
                // Recurrir a la funci�n original si faltan dependencias
                return originalFilterMotives(query, resultsElement, team);
            }
            
            try {
                // Procesar los t�rminos de b�squeda
                const searchTerms = query.toLowerCase().trim().split(/\s+/);
                
                // Filtrar motivos con coincidencia flexible
                const filteredMotives = window.motivesList.filter(motive => {
                    if (!motive || !motive.text) return false;
                    
                    const fullMotiveText = motive.text.toLowerCase();
                    const motiveCode = (motive.value || '').toLowerCase();
                    
                    // Comprobar si al menos un t�rmino est� presente
                    return searchTerms.some(term => 
                        fullMotiveText.includes(term) || motiveCode.includes(term)
                    );
                });
                
                // Vaciar el contenedor de resultados
                resultsElement.innerHTML = '';
                
                if (filteredMotives.length === 0) {
                    // Mostrar mensaje de no resultados
                    const noResults = document.createElement('div');
                    noResults.className = 'search-result-item';
                    noResults.textContent = 'No se encontraron coincidencias';
                    noResults.style.fontStyle = 'italic';
                    resultsElement.appendChild(noResults);
                } else {
                    // Ordenar por c�digo
                    filteredMotives.sort((a, b) => 
                        (a.value || '').localeCompare(b.value || '')
                    );
                    
                    filteredMotives.forEach(motive => {
                        const item = document.createElement('div');
                        item.className = 'search-result-item';
                        item.textContent = motive.text;
                        
                        item.onmousedown = () => {
                            if (typeof window.selectMotive === 'function') {
                                window.selectMotive(motive.value, team);
                                resultsElement.parentNode.querySelector('.search-input').value = motive.text;
                                resultsElement.style.display = 'none';
                            }
                        };
                        
                        // A�adir soporte touch
                        item.ontouchend = (e) => {
                            if (typeof window.selectMotive === 'function') {
                                window.selectMotive(motive.value, team);
                                resultsElement.parentNode.querySelector('.search-input').value = motive.text;
                                resultsElement.style.display = 'none';
                                e.preventDefault();
                            }
                        };
                        
                        resultsElement.appendChild(item);
                    });
                }
                
                resultsElement.style.display = filteredMotives.length > 0 ? 'block' : 'none';
                return; // No continuar con la funci�n original
            } catch (error) {
                console.error('Error en b�squeda mejorada de motivos:', error);
                // En caso de error, volver al comportamiento original
                return originalFilterMotives(query, resultsElement, team);
            }
        };
    }
}

/**
 * Configura un proxy para la funci�n de b�squeda de resultados
 */
function setupResultSearchProxy() {
    // Verificar si la funci�n existe en el contexto global
    if (typeof window.searchActivityResults === 'function') {
        // Guardar referencia a la funci�n original
        const originalSearchActivityResults = window.searchActivityResults;
        
        // Reemplazar con nuestra versi�n mejorada
        window.searchActivityResults = function(query) {
            // Si no hay query, usar comportamiento original
            if (!query || !query.trim()) {
                return originalSearchActivityResults(query);
            }
            
            try {
                // Procesar los t�rminos de b�squeda
                const searchTerms = query.toLowerCase().trim().split(/\s+/);
                
                // Si no tenemos la lista o est� vac�a, usar comportamiento predeterminado
                if (!window.activityResultsList || !Array.isArray(window.activityResultsList) || window.activityResultsList.length === 0) {
                    const defaultResults = [
                        "Captura", "Comparendo", "Traslado por Protecci�n", "Cierre de Establecimiento",
                        "Incautaci�n de Arma Blanca", "Incautaci�n de Arma de Fuego"
                    ];
                    
                    // Filtrar con coincidencia flexible
                    return defaultResults.filter(result => 
                        searchTerms.some(term => result.toLowerCase().includes(term))
                    );
                }
                
                // Buscar en todas las categor�as con coincidencia flexible
                const allResults = [];
                
                window.activityResultsList.forEach(category => {
                    if (category.resultados && Array.isArray(category.resultados)) {
                        category.resultados.forEach(result => {
                            if (searchTerms.every(term => result.toLowerCase().includes(term))) {
                                allResults.push(result);
                            }
                        });
                    }
                });
                
                return allResults;
            } catch (error) {
                console.error('Error en b�squeda mejorada de resultados:', error);
                // En caso de error, volver al comportamiento original
                return originalSearchActivityResults(query);
            }
        };
    }
    
    // Mejorar la visualizaci�n de resultados si existe
    if (typeof window.displayActivityResults === 'function') {
        const originalDisplayActivityResults = window.displayActivityResults;
        
        window.displayActivityResults = function(results, container) {
            try {
                if (!results || !Array.isArray(results) || !container) {
                    return originalDisplayActivityResults(results, container);
                }
                
                // Vaciar el contenedor
                container.innerHTML = '';
                
                if (results.length === 0) {
                    const noResults = document.createElement('div');
                    noResults.textContent = 'No se encontraron resultados';
                    noResults.style.padding = '10px';
                    noResults.style.fontStyle = 'italic';
                    container.appendChild(noResults);
                    return;
                }
                
                // Intentar organizar por categor�as
                const resultsByCategory = {};
                const defaultCategory = 'Otros resultados';
                
                // Encontrar categor�a para cada resultado
                results.forEach(result => {
                    let foundCategory = defaultCategory;
                    
                    if (window.activityResultsList && Array.isArray(window.activityResultsList)) {
                        for (const category of window.activityResultsList) {
                            if (category.resultados && 
                                Array.isArray(category.resultados) && 
                                category.resultados.includes(result)) {
                                foundCategory = category.categoria;
                                break;
                            }
                        }
                    }
                    
                    if (!resultsByCategory[foundCategory]) {
                        resultsByCategory[foundCategory] = [];
                    }
                    resultsByCategory[foundCategory].push(result);
                });
                
                // Mostrar resultados organizados por categor�a
                Object.keys(resultsByCategory).sort().forEach(categoryName => {
                    const categoryResults = resultsByCategory[categoryName];
                    
                    const categoryDiv = document.createElement('div');
                    categoryDiv.className = 'result-category';
                    categoryDiv.innerHTML = `<h4>${categoryName}</h4>`;
                    
                    // Ordenar alfab�ticamente dentro de cada categor�a
                    categoryResults.sort().forEach(result => {
                        const resultDiv = document.createElement('div');
                        resultDiv.textContent = result;
                        
                        resultDiv.addEventListener('click', () => {
                            // Eliminar selecci�n previa
                            container.querySelectorAll('.selected').forEach(el => {
                                el.classList.remove('selected');
                            });
                            
                            // Marcar como seleccionado
                            resultDiv.classList.add('selected');
                            
                            // Habilitar el bot�n de confirmaci�n
                            const confirmButton = document.getElementById('confirmResult');
                            if (confirmButton) confirmButton.disabled = false;
                        });
                        
                        categoryDiv.appendChild(resultDiv);
                    });
                    
                    container.appendChild(categoryDiv);
                });
            } catch (error) {
                console.error('Error en visualizaci�n mejorada de resultados:', error);
                // En caso de error, volver al comportamiento original
                return originalDisplayActivityResults(results, container);
            }
        };
    }
}

/**
 * Reproduce un feedback de audio seg�n el evento
 * @param {string} type - Tipo de feedback: 'start', 'success', o 'error'
 */
function playAudioFeedback(type) {
    // Frecuencias y duraci�n seg�n el tipo de feedback
    let frequency, duration;
    
    switch (type) {
        case 'start':
            frequency = 880; // La5
            duration = 150;
            break;
        case 'success':
            frequency = 1318.5; // Mi6
            duration = 200;
            break;
        case 'error':
            frequency = 440; // La4
            duration = 300;
            break;
        default:
            return;
    }
    
    try {
        // Crear contexto de audio
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Configurar oscilador
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        
        // Configurar envolvente de amplitud
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration / 1000);
        
        // Conectar nodos y reproducir
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
        console.error('Error al reproducir feedback de audio:', error);
    }
}

/**
 * Muestra un mensaje temporal cerca de un elemento
 * @param {string} message - Mensaje a mostrar
 * @param {HTMLElement} element - Elemento de referencia
 */
function showTemporaryMessage(message, element) {
    const messageElement = document.createElement('div');
    messageElement.className = 'voice-message';
    messageElement.textContent = message;
    
    // Posicionar cerca del elemento
    const rect = element.getBoundingClientRect();
    messageElement.style.top = `${rect.bottom + window.scrollY + 5}px`;
    messageElement.style.left = `${rect.left + window.scrollX}px`;
    
    document.body.appendChild(messageElement);
    
    // Fade in
    setTimeout(() => {
        messageElement.style.opacity = '1';
    }, 10);
    
    // Eliminar despu�s de 3 segundos
    setTimeout(() => {
        messageElement.style.opacity = '0';
        setTimeout(() => {
            if (messageElement.parentNode) {
                document.body.removeChild(messageElement);
            }
        }, 300);
    }, 3000);
}

/**
 * Agrega los estilos CSS necesarios para la funcionalidad de voz
 */
function addVoiceSearchStyles() {
    if (document.getElementById('voice-search-styles')) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = 'voice-search-styles';
    style.textContent = `
        .voice-search-container {
            position: relative;
            display: flex;
            align-items: center;
            width: 100%;
            margin-bottom: 5px;
        }
        
        .voice-search-container input {
            flex-grow: 1;
            padding-right: 35px; /* Espacio para el bot�n */
            box-sizing: border-box;
        }
        
        .voice-search-button {
            position: absolute;
            right: 5px;
            background: none;
            border: none;
            color: #666;
            cursor: pointer;
            font-size: 16px;
            padding: 5px;
            z-index: 5;
            border-radius: 50%;
            height: 28px;
            width: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }
        
        .voice-search-button:hover {
            background-color: #f0f0f0;
            color: #003366;
        }
        
        .voice-search-button.listening {
            color: #e74c3c;
            animation: voicePulse 1.5s infinite;
        }
        
        @keyframes voicePulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        .voice-message {
            position: absolute;
            background-color: rgba(0, 51, 102, 0.8);
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        
        /* Adaptaciones para pantallas peque�as */
        @media (max-width: 576px) {
            .voice-search-button {
                height: 32px;
                width: 32px;
                font-size: 18px;
            }
            
            .voice-message {
                font-size: 14px;
                padding: 8px 14px;
            }
        }
    `;
    
    document.head.appendChild(style);
}