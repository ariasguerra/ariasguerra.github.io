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
}

/**
 * Agrega botones de entrada de voz a todos los campos de búsqueda
 */
function addVoiceButtonsToSearchInputs() {
    // Para búsqueda de funcionarios
    document.querySelectorAll('.officer-search').forEach((input, index) => {
        addVoiceButtonToInput(input, `officer-voice-${index + 1}`, 'Buscar funcionario');
    });
    
    // Para búsqueda de motivos en equipos inactivos
    document.addEventListener('DOMNodeInserted', (event) => {
        if (event.target && event.target.classList && event.target.classList.contains('search-input')) {
            setTimeout(() => {
                if (!event.target.nextElementSibling || !event.target.nextElementSibling.classList.contains('voice-search-button')) {
                    addVoiceButtonToInput(event.target, `motive-voice-${Date.now()}`, 'Buscar motivo');
                }
            }, 100);
        }
    });
    
    // Para búsqueda de resultados en el diálogo de actividades
    document.addEventListener('DOMNodeInserted', (event) => {
        if (event.target && event.target.id === 'resultSearch') {
            setTimeout(() => {
                addVoiceButtonToInput(event.target, 'result-voice', 'Buscar resultado');
            }, 100);
        }
    });
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
        }
        
        .voice-search-container input {
            flex-grow: 1;
            padding-right: 35px; /* Espacio para el botón */
            width: calc(100% - 35px) !important;
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