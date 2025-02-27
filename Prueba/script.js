document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM completamente cargado y analizado');

    // Referencias a elementos DOM
    const fileInput = document.getElementById('json-file');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const searchSuggestions = document.getElementById('search-suggestions');
    const gradoFilter = document.getElementById('grado-filter');
    const cargoFilter = document.getElementById('cargo-filter');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const viewToggleBtn = document.getElementById('view-toggle');
    const favoritesToggleBtn = document.getElementById('favorites-toggle');
    const resultsDiv = document.getElementById('results');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const currentPageSpan = document.getElementById('current-page');
    const actionButtons = document.getElementById('action-buttons');
    const callBtn = document.getElementById('call-btn');
    const whatsappBtn = document.getElementById('whatsapp-btn');
    const emailBtn = document.getElementById('email-btn');
    const shareBtn = document.getElementById('share-btn');
    const favoriteBtn = document.getElementById('favorite-btn');
    const favoritesSection = document.getElementById('favorites-section');
    
    // Variables del estado de la aplicación
    let contacts = [];
    let filteredContacts = [];
    let currentResults = [];
    let currentIndex = 0;
    let currentContact = null;
    let isListView = false;
    let isShowingFavorites = false;
    let copyMessageTimeout;
    let searchDebounceTimer;

    // Cargar contactos y favoritos del almacenamiento local al iniciar
    loadContactsFromLocalStorage();
    Favorites.loadFavorites();

    // ======== EVENTOS PRINCIPALES ========

    // Carga de archivo JSON
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            console.log('Archivo seleccionado:', file.name);
            const reader = new FileReader();
            reader.onload = (e) => {
                console.log('Archivo leído, iniciando procesamiento');
                try {
                    const data = JSON.parse(e.target.result);
                    contacts = Array.isArray(data) ? data : [data];
                    console.log(`Contactos cargados: ${contacts.length}`);
                    if (contacts.length > 0) {
                        console.log('Primer contacto:', JSON.stringify(contacts[0]));
                        saveContactsToLocalStorage(contacts);
                        PersonalSummary.setContacts(contacts);
                        PersonalSummary.updateSummary();
                        
                        // Mostrar el primer contacto
                        filteredContacts = contacts;
                        currentResults = [contacts[0]];
                        currentIndex = 0;
                        displayCurrentContact();
                        updateNavigation();
                    } else {
                        console.warn('No se cargaron contactos');
                    }
                } catch (error) {
                    console.error('Error al parsear el archivo JSON:', error);
                }
            };
            reader.onerror = (error) => {
                console.error('Error al leer el archivo:', error);
            };
            reader.readAsText(file);
        }
    });

    // Formulario de búsqueda
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        searchContacts();
    });

    // Búsqueda predictiva mientras escribe
    searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            updateSearchSuggestions();
        }, 300);
    });

    // Ocultar sugerencias al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
            searchSuggestions.style.display = 'none';
        }
    });

    // Eventos de filtros
    gradoFilter.addEventListener('change', searchContacts);
    cargoFilter.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(searchContacts, 300);
    });
    clearFiltersBtn.addEventListener('click', clearFilters);

    // Navegación
    prevBtn.addEventListener('click', () => {
        console.log('Botón anterior clickeado');
        if (currentIndex > 0) {
            currentIndex--;
            displayCurrentContact();
            updateNavigation();
        }
    });

    nextBtn.addEventListener('click', () => {
        console.log('Botón siguiente clickeado');
        if (currentIndex < currentResults.length - 1) {
            currentIndex++;
            displayCurrentContact();
            updateNavigation();
        }
    });

    // Acciones de contacto
    callBtn.addEventListener('click', () => {
        console.log('Botón de llamada clickeado');
        if (currentContact && currentContact.CELULAR) {
            window.location.href = `tel:${currentContact.CELULAR}`;
        }
    });

    whatsappBtn.addEventListener('click', () => {
        console.log('Botón de WhatsApp clickeado');
        if (currentContact && currentContact.CELULAR) {
            const message = createWhatsAppMessage(currentContact);
            const formattedNumber = formatPhoneNumber(currentContact.CELULAR);
            window.open(`https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`, '_blank');
        }
    });

    emailBtn.addEventListener('click', () => {
        console.log('Botón de correo electrónico clickeado');
        if (currentContact && currentContact["CORREO ELECTRÓNICO"]) {
            const subject = "Contacto Policial";
            const body = createEmailMessage(currentContact);
            window.location.href = `mailto:${currentContact["CORREO ELECTRÓNICO"]}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        }
    });

    shareBtn.addEventListener('click', () => {
        console.log('Botón de compartir clickeado');
        if (currentContact) {
            const text = `${getFullGrado(currentContact.GR, determineGender(currentContact.NOMBRES))} ${currentContact.NOMBRES} ${currentContact.APELLIDOS}\nCelular: ${currentContact.CELULAR}\nCorreo: ${currentContact["CORREO ELECTRÓNICO"]}`;
            if (navigator.share) {
                navigator.share({
                    title: 'Contacto Policial',
                    text: text
                }).catch(console.error);
            } else {
                copyToClipboard(text, "Información de contacto copiada");
            }
        }
    });

    // Botón de favorito
    favoriteBtn.addEventListener('click', toggleFavorite);

    // Botones de utilidad
    themeToggleBtn.addEventListener('click', toggleTheme);
    viewToggleBtn.addEventListener('click', toggleView);
    favoritesToggleBtn.addEventListener('click', toggleFavorites);
    
    // Inicializar tema al cargar
    initTheme();
    
    // ======== FUNCIONES DE BÚSQUEDA ========

    // Búsqueda de contactos
    function searchContacts() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const gradoSelected = gradoFilter.value;
        const cargoTerm = cargoFilter.value.toLowerCase().trim();
        
        console.log(`Buscando con término: "${searchTerm}", grado: "${gradoSelected}", cargo: "${cargoTerm}"`);
        
        if (contacts.length === 0) {
            return;
        }
        
        // Ocultar sección de favoritos al buscar
        if (isShowingFavorites) {
            toggleFavorites();
        }
        
        // Aplicar filtros
        filteredContacts = contacts.filter(contact => {
            const fullGrado = getFullGrado(contact.GR, determineGender(contact.NOMBRES)).toLowerCase();
            const matchesSearch = searchTerm === '' || 
                fullGrado.includes(searchTerm) ||
                (contact.NOMBRES && contact.NOMBRES.toLowerCase().includes(searchTerm)) ||
                (contact.APELLIDOS && contact.APELLIDOS.toLowerCase().includes(searchTerm)) ||
                (contact.CC && contact.CC.toString().includes(searchTerm)) ||
                (contact.PLACA && contact.PLACA.toString().includes(searchTerm)) ||
                (contact.CELULAR && contact.CELULAR.toString().includes(searchTerm));
                
            const matchesGrado = gradoSelected === '' || contact.GR === gradoSelected;
            
            const matchesCargo = cargoTerm === '' || 
                (contact.CARGO && contact.CARGO.toLowerCase().includes(cargoTerm));
                
            return matchesSearch && matchesGrado && matchesCargo;
        });
        
        console.log(`Resultados encontrados: ${filteredContacts.length}`);
        
        if (filteredContacts.length > 0) {
            currentResults = filteredContacts;
            currentIndex = 0;
            displayCurrentContact();
            updateNavigation();
            searchSuggestions.style.display = 'none'; // Ocultar sugerencias
        } else {
            resetResults();
        }
    }

    // Actualizar sugerencias de búsqueda mientras escribe
    function updateSearchSuggestions() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm.length < 2 || contacts.length === 0) {
            searchSuggestions.style.display = 'none';
            return;
        }

        // Encontrar hasta 5 coincidencias
        const suggestions = contacts
            .filter(contact => {
                const fullName = `${contact.NOMBRES} ${contact.APELLIDOS}`.toLowerCase();
                const fullGrado = getFullGrado(contact.GR, determineGender(contact.NOMBRES)).toLowerCase();
                return fullName.includes(searchTerm) || 
                      (contact.CC && contact.CC.toString().includes(searchTerm)) || 
                      fullGrado.includes(searchTerm);
            })
            .slice(0, 5);

        if (suggestions.length === 0) {
            searchSuggestions.style.display = 'none';
            return;
        }

        // Mostrar sugerencias
        searchSuggestions.innerHTML = '';
        suggestions.forEach(contact => {
            const suggestionItem = document.createElement('div');
            suggestionItem.classList.add('suggestion-item');
            
            const grado = getFullGrado(contact.GR, determineGender(contact.NOMBRES));
            suggestionItem.textContent = `${grado} ${contact.NOMBRES} ${contact.APELLIDOS}`;
            
            suggestionItem.addEventListener('click', () => {
                // Seleccionar este contacto
                currentResults = [contact];
                currentIndex = 0;
                displayCurrentContact();
                updateNavigation();
                searchSuggestions.style.display = 'none';
                
                // Actualizar campo de búsqueda
                searchInput.value = `${contact.NOMBRES} ${contact.APELLIDOS}`;
            });
            
            searchSuggestions.appendChild(suggestionItem);
        });
        
        searchSuggestions.style.display = 'block';
    }

    // Limpiar filtros de búsqueda
    function clearFilters() {
        searchInput.value = '';
        gradoFilter.value = '';
        cargoFilter.value = '';
        
        if (contacts.length > 0) {
            filteredContacts = contacts;
            currentResults = [contacts[0]];
            currentIndex = 0;
            displayCurrentContact();
            updateNavigation();
        } else {
            resetResults();
        }
    }

    // Resetear resultados
    function resetResults() {
        resultsDiv.innerHTML = '<p>No se encontraron resultados.</p>';
        actionButtons.style.display = 'none';
        resetNavigation();
    }
    
    // ======== FUNCIONES DE VISUALIZACIÓN ========

    // Mostrar el contacto actual
    function displayCurrentContact() {
        resultsDiv.innerHTML = '';
        
        if (currentResults.length === 0) {
            actionButtons.style.display = 'none';
            return;
        }
        
        currentContact = currentResults[currentIndex];
        
        if (isListView) {
            displayListView();
        } else {
            displayCardView();
        }
        
        updateFavoriteButton();
        actionButtons.style.display = 'flex';
    }

    // Mostrar vista de tarjeta (detallada)
    function displayCardView() {
        const gradoCompleto = getFullGrado(currentContact.GR, determineGender(currentContact.NOMBRES));
        const contactDiv = document.createElement('div');
        contactDiv.classList.add('contact');
        contactDiv.innerHTML = `
            <p class="grado">${gradoCompleto}</p>
            <div class="nombre-container">
                <p class="nombre">${currentContact.NOMBRES || ''} ${currentContact.APELLIDOS || ''}</p>
                <button id="copy-name-btn" class="copy-btn" title="Copiar nombre y avanzar"><i class="fas fa-copy"></i></button>
            </div>
            <p class="cargo">${currentContact.CARGO || 'N/A'}</p>
            <p class="cedula">Cédula de Ciudadanía: ${formatCC(currentContact.CC)}</p>
            <p class="placa">Placa: ${currentContact.PLACA || 'N/A'}</p>
            <p class="celular">Celular: ${currentContact.CELULAR || 'N/A'}</p>
            <p class="correo">Correo Electrónico: ${currentContact["CORREO ELECTRÓNICO"] || 'N/A'}</p>
        `;
        
        resultsDiv.appendChild(contactDiv);
        
        // Agregar evento al botón de copiar
        const copyNameBtn = document.getElementById('copy-name-btn');
        if (copyNameBtn) {
            copyNameBtn.addEventListener('click', copyNameAndAdvance);
        }
    }

    // Mostrar vista de lista
    function displayListView() {
        resultsDiv.classList.add('results-list');
        
        // Mostrar lista de todos los resultados filtrados
        currentResults.forEach((contact, index) => {
            const gradoCompleto = getFullGrado(contact.GR, determineGender(contact.NOMBRES));
            const contactItem = document.createElement('div');
            contactItem.classList.add('contact-list-item');
            
            // Resaltar el contacto seleccionado actualmente
            if (index === currentIndex) {
                contactItem.style.backgroundColor = 'var(--primary-color)';
                contactItem.style.color = 'white';
            }
            
            contactItem.innerHTML = `
                <div class="contact-list-info">
                    <span class="contact-list-grado">${gradoCompleto}</span>
                    <span>${contact.NOMBRES} ${contact.APELLIDOS}</span>
                </div>
                <div class="contact-list-actions">
                    <span class="contact-list-cargo">${contact.CARGO || ''}</span>
                </div>
            `;
            
            contactItem.addEventListener('click', () => {
                currentIndex = index;
                displayCurrentContact();
                updateNavigation();
            });
            
            resultsDiv.appendChild(contactItem);
        });
    }

    // Actualización de la navegación
    function updateNavigation() {
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === currentResults.length - 1;
        currentPageSpan.textContent = `${currentIndex + 1} de ${currentResults.length}`;
    }

    // Resetear navegación
    function resetNavigation() {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        currentPageSpan.textContent = '0 de 0';
    }

    // ======== FUNCIONES DE FAVORITOS ========

    // Alternar favorito para el contacto actual
    function toggleFavorite() {
        if (!currentContact) return;
        
        if (Favorites.isFavorite(currentContact)) {
            // Eliminar de favoritos
            const identifier = currentContact.CC || currentContact.PLACA;
            Favorites.removeFavorite(identifier);
            showCopyMessage("Eliminado de favoritos");
        } else {
            // Añadir a favoritos
            Favorites.addFavorite(currentContact);
            showCopyMessage("Añadido a favoritos");
        }
        
        updateFavoriteButton();
    }

    // Actualizar apariencia del botón de favoritos
    function updateFavoriteButton() {
        if (!currentContact) return;
        
        if (Favorites.isFavorite(currentContact)) {
            favoriteBtn.classList.add('active');
            favoriteBtn.innerHTML = '<i class="fas fa-star"></i>';
        } else {
            favoriteBtn.classList.remove('active');
            favoriteBtn.innerHTML = '<i class="far fa-star"></i>';
        }
    }

    // Mostrar/Ocultar sección de favoritos
    function toggleFavorites() {
        isShowingFavorites = !isShowingFavorites;
        
        if (isShowingFavorites) {
            favoritesToggleBtn.innerHTML = '<i class="fas fa-star"></i>';
            favoritesSection.style.display = 'block';
            
            // Actualizar lista de favoritos
            Favorites.updateFavoritesList((contact) => {
                // Callback para cuando se selecciona un favorito
                currentResults = [contact];
                currentIndex = 0;
                isShowingFavorites = false;
                favoritesToggleBtn.innerHTML = '<i class="far fa-star"></i>';
                favoritesSection.style.display = 'none';
                displayCurrentContact();
                updateNavigation();
            });
        } else {
            favoritesToggleBtn.innerHTML = '<i class="far fa-star"></i>';
            favoritesSection.style.display = 'none';
        }
    }

    // ======== FUNCIONES DE TEMA Y VISTA ========

    // Inicializar tema desde localStorage
    function initTheme() {
        const darkMode = localStorage.getItem('policialDarkMode') === 'true';
        if (darkMode) {
            document.body.classList.add('dark-theme');
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            document.body.classList.remove('dark-theme');
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }

    // Alternar entre tema claro y oscuro
    function toggleTheme() {
        const isDarkMode = document.body.classList.toggle('dark-theme');
        localStorage.setItem('policialDarkMode', isDarkMode);
        
        // Actualizar icono
        if (isDarkMode) {
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }

    // Alternar entre vista de tarjeta y lista
    function toggleView() {
        isListView = !isListView;
        
        // Actualizar clases y estilos
        if (isListView) {
            resultsDiv.className = 'results-list';
            viewToggleBtn.innerHTML = '<i class="fas fa-id-card"></i>';
        } else {
            resultsDiv.className = 'results-cards';
            viewToggleBtn.innerHTML = '<i class="fas fa-th-large"></i>';
        }
        
        // Volver a mostrar el contacto actual con la nueva vista
        displayCurrentContact();
    }
    
    // ======== FUNCIONES DE UTILIDAD ========

    // Cargar contactos del almacenamiento local
    function loadContactsFromLocalStorage() {
        const storedContacts = localStorage.getItem('policialContacts');
        if (storedContacts) {
            try {
                contacts = JSON.parse(storedContacts);
                filteredContacts = contacts;
                PersonalSummary.setContacts(contacts);
                PersonalSummary.updateSummary();

                // Mostrar el primer contacto al cargar desde almacenamiento local
                if (contacts.length > 0) {
                    currentResults = [contacts[0]];
                    currentIndex = 0;
                    displayCurrentContact();
                    updateNavigation();
                }
            } catch (error) {
                console.error('Error al parsear los contactos almacenados:', error);
            }
        }
    }

    // Guardar contactos en el almacenamiento local
    function saveContactsToLocalStorage(contacts) {
        try {
            localStorage.setItem('policialContacts', JSON.stringify(contacts));
            console.log(`${contacts.length} contactos guardados en almacenamiento local`);
        } catch (error) {
            console.error('Error al guardar contactos en almacenamiento local:', error);
        }
    }

    // Copiar texto al portapapeles
    function copyToClipboard(text, successMessage) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            showCopyMessage(successMessage || "Texto copiado al portapapeles");
        } catch (err) {
            console.error('No se pudo copiar el texto: ', err);
            showCopyMessage("Error al copiar");
        }
        
        document.body.removeChild(textArea);
    }

    // Copiar nombre y avanzar al siguiente contacto
    function copyNameAndAdvance() {
        if (currentContact) {
            const fullName = `${currentContact.NOMBRES || ''} ${currentContact.APELLIDOS || ''}`.trim();
            copyToClipboard(fullName, "Nombre copiado al portapapeles");
            
            // Avanzar al siguiente contacto después de un breve retraso
            setTimeout(() => {
                if (currentIndex < currentResults.length - 1) {
                    currentIndex++;
                    displayCurrentContact();
                    updateNavigation();
                } else {
                    showCopyMessage("No hay más registros para copiar", 3000);
                }
            }, 500);
        }
    }

    // Mostrar mensaje temporal
    function showCopyMessage(message, duration = 1500) {
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
        
        document.body.appendChild(messageElement);
        
        // Eliminar mensaje después de la duración especificada
        copyMessageTimeout = setTimeout(() => {
            messageElement.remove();
        }, duration);
    }

    // Formatear número de cédula
    function formatCC(cc) {
        return cc ? cc.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : 'N/A';
    }

    // Obtener grado completo
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

    // Determinar género por nombre
    function determineGender(nombre) {
        if (!nombre) return 'M';
        const femaleNames = ['MARIA', 'STEPHANY', 'ANA', 'NEYLA', 'LAURA', 'SOFIA', 'ISABEL', 'CAROLINA', 'DANIELA', 'VALENTINA', 'GABRIELA', 'CAMILA'];
        const firstName = nombre.split(' ')[0].toUpperCase();
        return femaleNames.includes(firstName) ? 'F' : 'M';
    }

    // Formatear número de teléfono para WhatsApp
    function formatPhoneNumber(phoneNumber) {
        const cleanNumber = phoneNumber.toString().replace(/\D/g, '');
        return cleanNumber.startsWith('57') ? cleanNumber : '57' + cleanNumber;
    }

    // Crear mensaje para WhatsApp
    function createWhatsAppMessage(contact) {
        const greeting = getGreeting();
        const firstName = capitalizeFirstLetter(contact.NOMBRES.split(' ')[0]);
        const lastName = capitalizeFirstLetter(contact.APELLIDOS.split(' ')[0]);
        return `Dios y Patria, ${greeting} ${firstName} ${lastName}`;
    }

    // Crear mensaje para correo electrónico
    function createEmailMessage(contact) {
        console.log('Creando mensaje de correo electrónico');
        const greeting = getGreeting();
        const gender = determineGender(contact.NOMBRES);
        const fullGrado = getFullGrado(contact.GR, gender);
        const formattedGrado = fullGrado.split(' ').map(word => capitalizeFirstLetter(word)).join(' ');
        const salutation = gender === 'F' ? 'Señora' : 'Señor';
        const fullName = `${contact.NOMBRES} ${contact.APELLIDOS}`.toUpperCase();
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

    // Formatear cargo
    function formatCargo(cargo) {
        if (!cargo) return '';
        const lowercaseWords = ['de', 'del', 'la', 'las', 'los', 'y', 'e', 'o', 'u', 'a'];
        return cargo.split(' ').map((word, index) => 
            lowercaseWords.includes(word.toLowerCase()) && index !== 0 ? word.toLowerCase() : capitalizeFirstLetter(word)
        ).join(' ');
    }

    // Obtener saludo según hora del día
    function getGreeting() {
        const hour = new Date().getHours();
        console.log('Hora actual:', hour);
        if (hour < 12) return "buenos días";
        if (hour < 18) return "buenas tardes";
        return "buenas noches";
    }

    // Capitalizar primera letra
    function capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }

    // Función de depuración
    window.debugContacts = function() {
        console.log('Contactos actuales:', contacts);
        console.log('Contactos filtrados:', filteredContacts);
        console.log('Contactos en localStorage:', localStorage.getItem('policialContacts'));
        console.log('Favoritos:', Favorites.getAllFavorites());
        console.log('Tema oscuro:', document.body.classList.contains('dark-theme'));
        console.log('Vista de lista:', isListView);
    };
});
