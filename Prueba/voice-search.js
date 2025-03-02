// voice-search.js
// Funciones para búsqueda por voz en la aplicación de gestión de cuadrantes policiales

/**
 * Inicializa y configura el reconocimiento de voz para los campos de búsqueda
 */
function setupVoiceSearch() {
    // Verificar soporte para la API de reconocimiento de voz
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('El reconocimiento de voz no está soportado en este navegador');
        return;
    }
    
    // Agregar botones de voz a todos los campos de búsqueda
    addVoiceButtonsToSearchInputs();
    
    // Añadir los estilos necesarios
    addVoiceSearchStyles();
    
    // Mejorar el algoritmo de búsqueda para todos los campos
    enhanceSearchAlgorithms();
}

/**
 * Agrega botones de entrada de voz a todos los campos de búsqueda
 */
function addVoiceButtonsToSearchInputs() {
    // Para búsqueda de funcionarios
    document.querySelectorAll('.officer-search').forEach((input, index) => {
        addVoiceButtonToInput(input, `officer-voice-${index + 1}`, 'Buscar funcionario');
    });
    
    // Observador de cambios en el DOM para detectar nuevos elementos añadidos
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    processNewNode(node);
                });
            }
        });
    });
    
    // Configurar el observador para monitorear todo el documento
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
    
    // Procesar los campos ya existentes
    document.querySelectorAll('.search-input').forEach(input => {
        if (!input.parentNode.querySelector('.voice-search-button')) {
            addVoiceButtonToInput(input, `motive-voice-${Date.now()}`, 'Buscar motivo');
        }
    });
    
    // Para diálogos que pudieran aparecer posteriormente
    document.addEventListener('DOMNodeInserted', event => {
        const target = event.target;
        
        // Verificar si es el diálogo de resultados
        if (target && target.className === 'activity-result-dialog') {
            setTimeout(() => {
                const resultSearch = target.querySelector('#resultSearch');
                if (resultSearch && !resultSearch.parentNode.querySelector('.voice-search-button')) {
                    addVoiceButtonToInput(resultSearch, 'result-voice', 'Buscar resultado');
                }
            }, 100);
        }
    });
}

/**
 * Procesa un nodo recién añadido para detectar campos de búsqueda
 * @param {Node} node - Nodo del DOM a procesar
 */
function processNewNode(node) {
    // Solo procesar elementos HTML
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    
    // Buscar campos de búsqueda dentro del nodo
    const searchInputs = node.querySelectorAll ? node.querySelectorAll('.search-input') : [];
    searchInputs.forEach(input => {
        if (!input.parentNode.querySelector('.voice-search-button')) {
            addVoiceButtonToInput(input, `motive-voice-${Date.now()}`, 'Buscar motivo');
        }
    });
    
    // Si el nodo mismo es un campo de búsqueda
    if (node.classList && node.classList.contains('search-input')) {
        if (!node.parentNode.querySelector('.voice-search-button')) {
            addVoiceButtonToInput(node, `motive-voice-${Date.now()}`, 'Buscar motivo');
        }
    }
    
    // Para el diálogo de resultados
    if (node.id === 'resultSearch') {
        setTimeout(() => {
            if (!node.parentNode.querySelector('.voice-search-button')) {
                addVoiceButtonToInput(node, 'result-voice', 'Buscar resultado');
            }
        }, 100);
    }
}

/**
 * Agrega un botón de reconocimiento de voz a un campo de entrada específico
 * @param {HTMLElement} inputElement - El elemento de entrada de texto
 * @param {string} id - ID único para el botón de voz
 * @param {string} context - Contexto de búsqueda para mejorar reconocimiento
 */
function addVoiceButtonToInput(inputElement, id, context) {
    // Evitar duplicados
    if (inputElement.parentNode.querySelector('.voice-search-button')) {
        return;
    }
    
    // Crear contenedor para mantener el layout
    const container = document.createElement('div');
    container.className = 'voice-search-container';
    
    // Obtener el estilo del input original
    const computedStyle = window.getComputedStyle(inputElement);
    const width = computedStyle.width;
    const marginTop = computedStyle.marginTop;
    const marginBottom = computedStyle.marginBottom;
    
    // Configurar el contenedor para mantener el espaciado
    container.style.width = width;
    container.style.marginTop = marginTop;
    container.style.marginBottom = marginBottom;
    
    // Clonar el input existente
    const originalInput = inputElement.cloneNode(true);
    originalInput.dataset.voiceEnabled = 'true';
    
    // Crear el botón de voz
    const voiceButton = document.createElement('button');
    voiceButton.className = 'voice-search-button';
    voiceButton.type = 'button';
    voiceButton.id = id;
    voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
    voiceButton.title = `Activar ${context} por voz`;
    
    // Agregar listener al botón
    voiceButton.addEventListener('click', () => {
        startVoiceRecognition(originalInput, voiceButton, context);
    });
    
    // Reemplazar la entrada original con nuestro contenedor
    inputElement.parentNode.insertBefore(container, inputElement);
    container.appendChild(originalInput);
    container.appendChild(voiceButton);
    inputElement.remove();
    
    // Transferir eventos y propiedades del input original
    transferInputEvents(inputElement, originalInput);
}

/**
 * Transfiere eventos y propiedades relevantes de un elemento a otro
 * @param {HTMLElement} sourceElement - Elemento original
 * @param {HTMLElement} targetElement - Elemento destino
 */
function transferInputEvents(sourceElement, targetElement) {
    // Eventos comunes para campos de búsqueda
    const events = ['input', 'focus', 'blur', 'keyup', 'keydown'];
    
    events.forEach(eventType => {
        const clonedEvents = sourceElement['on' + eventType];
        if (typeof clonedEvents === 'function') {
            targetElement.addEventListener(eventType, clonedEvents);
        }
    });
    
    // Para manejar eventos añadidos con addEventListener, creamos un handler que 
    // simplemente propaga el evento al elemento original
    events.forEach(eventType => {
        targetElement.addEventListener(eventType, (event) => {
            // Disparar un evento equivalente en el elemento original
            const newEvent = new Event(eventType, {
                bubbles: event.bubbles,
                cancelable: event.cancelable
            });
            sourceElement.dispatchEvent(newEvent);
        });
    });
}

/**
 * Inicia el reconocimiento de voz para un campo específico
 * @param {HTMLElement} inputElement - Campo de entrada donde se insertará el texto reconocido
 * @param {HTMLElement} buttonElement - Botón de micrófono para mostrar estado
 * @param {string} context - Contexto de búsqueda para mejorar reconocimiento
 */
function startVoiceRecognition(inputElement, buttonElement, context) {
    // Crear instancia de reconocimiento de voz
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Configurar opciones
    recognition.lang = 'es-CO';  // Español de Colombia
    recognition.continuous = false;
    recognition.interimResults = false;
    
    // Cambiar el estado visual del botón
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
        
        // Disparar evento de input para activar la búsqueda
        const inputEvent = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        inputElement.dispatchEvent(inputEvent);
        
        // Feedback sonoro de éxito
        playAudioFeedback('success');
    };
    
    // Manejar errores
    recognition.onerror = (event) => {
        console.error('Error en reconocimiento de voz:', event.error);
        
        // Feedback sonoro de error
        playAudioFeedback('error');
        
        // Sugerencia específica según el tipo de error
        let errorMessage = 'Error en el reconocimiento de voz';
        switch (event.error) {
            case 'no-speech':
                errorMessage = 'No se detectó ninguna voz';
                break;
            case 'aborted':
                errorMessage = 'Reconocimiento cancelado';
                break;
            case 'network':
                errorMessage = 'Error de red en reconocimiento de voz';
                break;
            case 'not-allowed':
                errorMessage = 'Permiso de micrófono denegado';
                break;
        }
        
        // Mostrar mensaje temporal
        showTemporaryMessage(errorMessage, inputElement);
    };
    
    // Restaurar el botón cuando termine el reconocimiento
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
        showTemporaryMessage('Error al iniciar el micrófono', inputElement);
    }
}

/**
 * Mejora los algoritmos de búsqueda para todos los elementos de la aplicación
 */
function enhanceSearchAlgorithms() {
    // Mejorar la búsqueda de funcionarios
    enhanceOfficerSearch();
    
    // Mejorar la búsqueda de motivos
    enhanceMotiveSearch();
    
    // Mejorar la búsqueda de resultados
    enhanceResultSearch();
}

/**
 * Mejora el algoritmo de búsqueda de funcionarios para soportar coincidencias parciales
 */
function enhanceOfficerSearch() {
    // Esta función reemplaza el método original de filtrado de oficiales
    // Guarda referencia a la función original para posible uso futuro
    if (window.originalFilterOfficers === undefined && window.filterOfficers) {
        window.originalFilterOfficers = window.filterOfficers;
    }
    
    // Reemplazar la función de filtrado con nuestra versión mejorada
    window.filterOfficers = function(query, resultsElement, officerIndex) {
        if (!window.contactsList || !Array.isArray(window.contactsList) || window.contactsList.length === 0) {
            resultsElement.innerHTML = '<div class="officer-result-item">Por favor, cargue el archivo de contactos</div>';
            resultsElement.style.display = 'block';
            return;
        }

        // Obtener cédulas de funcionarios ya asignados
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
        
        // Si no hay consulta, mostrar todos los funcionarios disponibles
        if (!query.trim()) {
            const availableOfficers = window.contactsList.filter(officer => 
                officer && officer.CC && !assignedOfficers.has(officer.CC.toString())
            );
            displayFilteredOfficers(availableOfficers, resultsElement, officerIndex);
            return;
        }
        
        // Procesar la consulta para búsqueda avanzada
        const searchTerms = query.toLowerCase().trim().split(/\s+/);
        
        // Filtrar funcionarios con el nuevo algoritmo
        const filteredOfficers = window.contactsList.filter(officer => {
            if (!officer || !officer.CC) return false;
            
            // Verificar si ya está asignado
            const isAssigned = assignedOfficers.has(officer.CC.toString());
            if (isAssigned) return false;
            
            // Crear un texto combinado con todos los datos del funcionario
            const fullOfficerText = `${officer.GR || ''} ${officer.APELLIDOS || ''} ${officer.NOMBRES || ''}`.toLowerCase();
            
            // Comprobar si todos los términos de búsqueda están presentes en cualquier orden
            return searchTerms.every(term => fullOfficerText.includes(term));
        });
        
        // Mostrar los resultados
        displayFilteredOfficers(filteredOfficers, resultsElement, officerIndex);
    };
}

/**
 * Muestra los funcionarios filtrados en el elemento de resultados
 * @param {Array} filteredOfficers - Lista de funcionarios filtrados
 * @param {HTMLElement} resultsElement - Elemento donde mostrar los resultados
 * @param {number} officerIndex - Índice del oficial (0 o 1)
 */
function displayFilteredOfficers(filteredOfficers, resultsElement, officerIndex) {
    resultsElement.innerHTML = '';
    
    if (filteredOfficers.length === 0) {
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
                window.selectOfficer(officer, officerIndex);
                resultsElement.style.display = 'none';
            };
            
            // Añadir soporte táctil
            item.ontouchend = (e) => {
                window.selectOfficer(officer, officerIndex);
                resultsElement.style.display = 'none';
                e.preventDefault(); // Prevenir eventos tap dobles
            };
            
            resultsElement.appendChild(item);
        });
    }

    resultsElement.style.display = 'block';
}

/**
 * Mejora el algoritmo de búsqueda de motivos policiales
 */
function enhanceMotiveSearch() {
    // Guardar la función original para referencia futura
    if (window.originalFilterMotives === undefined && window.filterMotives) {
        window.originalFilterMotives = window.filterMotives;
    }
    
    // Reemplazar con nuestra versión mejorada
    window.filterMotives = function(query, resultsElement, team) {
        if (!window.motivesList || !Array.isArray(window.motivesList)) {
            console.error('Error: motivesList no es un array válido');
            return;
        }

        // Si está vacío, mostrar todos los motivos
        if (!query.trim()) {
            const allMotives = window.motivesList.slice(0, 20); // Mostrar los primeros 20 para no saturar
            displayFilteredMotives(allMotives, resultsElement, team);
            return;
        }

        const searchTerms = query.toLowerCase().trim().split(/\s+/);
        
        const filteredMotives = window.motivesList.filter(motive => {
            const fullMotiveText = motive.text.toLowerCase();
            const motiveCode = motive.value.toLowerCase();
            
            // Buscar coincidencias en código o descripción
            return searchTerms.some(term => 
                fullMotiveText.includes(term) || motiveCode.includes(term)
            );
        });

        displayFilteredMotives(filteredMotives, resultsElement, team);
    };
}

/**
 * Muestra los motivos filtrados en el elemento de resultados
 * @param {Array} filteredMotives - Lista de motivos filtrados
 * @param {HTMLElement} resultsElement - Elemento donde mostrar los resultados
 * @param {Object} team - Objeto del equipo actual
 */
function displayFilteredMotives(filteredMotives, resultsElement, team) {
    resultsElement.innerHTML = '';
    
    if (filteredMotives.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'search-result-item';
        noResults.textContent = 'No se encontraron coincidencias';
        noResults.style.fontStyle = 'italic';
        resultsElement.appendChild(noResults);
        resultsElement.style.display = 'block';
        return;
    }

    // Ordenar por código para mostrar en orden lógico
    filteredMotives.sort((a, b) => a.value.localeCompare(b.value));
    
    filteredMotives.forEach(motive => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.textContent = motive.text;
        
        item.onmousedown = () => {
            window.selectMotive(motive.value, team);
            resultsElement.parentNode.querySelector('.search-input').value = motive.text;
            resultsElement.style.display = 'none';
        };
        
        // Añadir soporte touch
        item.ontouchend = (e) => {
            window.selectMotive(motive.value, team);
            resultsElement.parentNode.querySelector('.search-input').value = motive.text;
            resultsElement.style.display = 'none';
            e.preventDefault();
        };
        
        resultsElement.appendChild(item);
    });

    resultsElement.style.display = filteredMotives.length > 0 ? 'block' : 'none';
}

/**
 * Mejora el algoritmo de búsqueda de resultados de actividades
 */
function enhanceResultSearch() {
    // Guardar la función original para referencia futura
    if (window.originalSearchActivityResults === undefined && window.searchActivityResults) {
        window.originalSearchActivityResults = window.searchActivityResults;
    }
    
    // Reemplazar con nuestra versión mejorada
    window.searchActivityResults = function(query) {
        // Si no tenemos la lista o está vacía
        if (!window.activityResultsList || !Array.isArray(window.activityResultsList) || window.activityResultsList.length === 0) {
            const defaultResults = [
                "Captura", "Comparendo", "Traslado por Protección", "Cierre de Establecimiento",
                "Incautación de Arma Blanca", "Incautación de Arma de Fuego"
            ];
            
            if (!query.trim()) {
                return defaultResults;
            }
            
            const searchTerms = query.toLowerCase().trim().split(/\s+/);
            return defaultResults.filter(result => 
                searchTerms.every(term => result.toLowerCase().includes(term))
            );
        }
        
        // Si la consulta está vacía, devolver todos los resultados
        if (!query.trim()) {
            const allResults = [];
            window.activityResultsList.forEach(category => {
                if (category.resultados && Array.isArray(category.resultados)) {
                    allResults.push(...category.resultados);
                }
            });
            return allResults;
        }
        
        // Dividir la consulta en términos individuales
        const searchTerms = query.toLowerCase().trim().split(/\s+/);
        
        // Buscar en todas las categorías
        const allResults = [];
        
        window.activityResultsList.forEach(category => {
            if (category.resultados && Array.isArray(category.resultados)) {
                category.resultados.forEach(result => {
                    // Comprobar si todos los términos están presentes en el resultado
                    if (searchTerms.every(term => result.toLowerCase().includes(term))) {
                        allResults.push(result);
                    }
                });
            }
        });
        
        return allResults;
    };
    
    // Mejorar la visualización de resultados para asegurar que muestra categorías
    if (window.originalDisplayActivityResults === undefined && window.displayActivityResults) {
        window.originalDisplayActivityResults = window.displayActivityResults;
    }
    
    // Asumir que esta función puede existir en el código original
    if (window.displayActivityResults) {
        window.displayActivityResults = function(results, container) {
            container.innerHTML = '';
            
            if (results.length === 0) {
                const noResults = document.createElement('div');
                noResults.textContent = 'No se encontraron resultados';
                noResults.style.padding = '10px';
                noResults.style.fontStyle = 'italic';
                container.appendChild(noResults);
                return;
            }
            
            // Agrupar resultados por categoría si es posible
            const resultsByCategory = {};
            
            // Intentar encontrar la categoría para cada resultado
            results.forEach(result => {
                let foundCategory = 'Otros';
                
                if (window.activityResultsList && Array.isArray(window.activityResultsList)) {
                    window.activityResultsList.forEach(category => {
                        if (category.resultados && Array.isArray(category.resultados)) {
                            if (category.resultados.includes(result)) {
                                foundCategory = category.categoria;
                            }
                        }
                    });
                }
                
                if (!resultsByCategory[foundCategory]) {
                    resultsByCategory[foundCategory] = [];
                }
                resultsByCategory[foundCategory].push(result);
            });
            
            // Mostrar resultados agrupados por categoría
            Object.keys(resultsByCategory).sort().forEach(category => {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'result-category';
                categoryDiv.innerHTML = `<h4>${category}</h4>`;
                
                resultsByCategory[category].sort().forEach(result => {
                    const div = document.createElement('div');
                    div.textContent = result;
                    div.addEventListener('click', () => {
                        container.querySelectorAll('div').forEach(el => {
                            if (el.classList && el.classList.contains('selected')) {
                                el.classList.remove('selected');
                            }
                        });
                        div.classList.add('selected');
                        
                        // Habilitar el botón de confirmación si existe
                        const confirmButton = document.getElementById('confirmResult');
                        if (confirmButton) {
                            confirmButton.disabled = false;
                        }
                    });
                    categoryDiv.appendChild(div);
                });
                
                container.appendChild(categoryDiv);
            });
        };
    }
}

/**
 * Reproduce un feedback de audio según el evento
 * @param {string} type - Tipo de feedback: 'start', 'success', o 'error'
 */
function playAudioFeedback(type) {
    // Frecuencias y duración según el tipo de feedback
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
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
        messageElement.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(messageElement);
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
            padding-right: 35px; /* Espacio para el botón */
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
        
        /* Adaptaciones para pantallas pequeñas */
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

// Inicializar la búsqueda por voz cuando se cargue el DOM
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que la aplicación esté completamente cargada
    setTimeout(setupVoiceSearch, 1000);
});

// Reintentar inicialización cuando la página esté completamente cargada
window.addEventListener('load', () => {
    setupVoiceSearch();
});