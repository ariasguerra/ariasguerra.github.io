document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM completamente cargado y analizado');

    const fileInput = document.getElementById('json-file');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const resultsDiv = document.getElementById('results');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const currentPageSpan = document.getElementById('current-page');
    const actionButtons = document.getElementById('action-buttons');
    const callBtn = document.getElementById('call-btn');
    const whatsappBtn = document.getElementById('whatsapp-btn');
    const emailBtn = document.getElementById('email-btn');
    const shareBtn = document.getElementById('share-btn');
    const statusMessage = document.getElementById('status-message');

    let contacts = [];
    let currentResults = [];
    let currentIndex = 0;
    let currentContact = null;

    // Cargar contactos del almacenamiento local al iniciar
    loadContactsFromLocalStorage();

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            statusMessage.textContent = 'Cargando archivo...';
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
                        statusMessage.textContent = `Archivo cargado exitosamente. ${contacts.length} contactos procesados y almacenados localmente.`;
                        
                        // Mostrar el primer contacto
                        currentResults = [contacts[0]];
                        currentIndex = 0;
                        displayCurrentContact();
                        updateNavigation();
                    } else {
                        console.warn('No se cargaron contactos');
                        statusMessage.textContent = 'El archivo no contiene contactos.';
                    }
                } catch (error) {
                    console.error('Error al parsear el archivo JSON:', error);
                    statusMessage.textContent = 'Error al cargar el archivo. Asegúrese de que sea un JSON válido.';
                }
            };
            reader.onerror = (error) => {
                console.error('Error al leer el archivo:', error);
                statusMessage.textContent = 'Error al leer el archivo. Por favor, intente de nuevo.';
            };
            reader.readAsText(file);
        }
    });

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const searchTerm = searchInput.value.toLowerCase().trim();
        console.log('Término de búsqueda:', searchTerm);
        if (searchTerm) {
            if (contacts.length === 0) {
                statusMessage.textContent = 'Por favor, cargue un archivo de contactos antes de buscar.';
                return;
            }
            currentResults = searchContacts(searchTerm);
            console.log(`Resultados encontrados: ${currentResults.length}`);
            currentIndex = 0;
            displayCurrentContact();
            updateNavigation();
        } else {
            console.log('Búsqueda vacía');
            statusMessage.textContent = 'Por favor, ingrese un término de búsqueda.';
            resetNavigation();
            actionButtons.style.display = 'none';
        }
    });

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
                const textArea = document.createElement("textarea");
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    statusMessage.textContent = "Información de contacto copiada al portapapeles";
                } catch (err) {
                    console.error('No se pudo copiar el texto: ', err);
                    statusMessage.textContent = "Error al copiar la información de contacto";
                }
                document.body.removeChild(textArea);
            }
        }
    });

    function searchContacts(term) {
        console.log('Iniciando búsqueda con término:', term);
        return contacts.filter(contact => {
            const fullGrado = getFullGrado(contact.GR, determineGender(contact.NOMBRES)).toLowerCase();
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
    }

    function displayCurrentContact() {
        console.log('Mostrando contacto actual');
        resultsDiv.innerHTML = '';
        if (currentResults.length === 0) {
            console.log('No se encontraron resultados');
            statusMessage.textContent = 'No se encontraron contactos.';
            actionButtons.style.display = 'none';
            return;
        }
        currentContact = currentResults[currentIndex];
        console.log('Contacto actual:', currentContact);
        if (!currentContact) {
            console.error('Contacto actual es nulo o undefined');
            return;
        }
        const contactDiv = document.createElement('div');
        contactDiv.classList.add('contact');
        contactDiv.innerHTML = `
            <p class="grado">${getFullGrado(currentContact.GR, determineGender(currentContact.NOMBRES))}</p>
            <p class="nombre">${currentContact.NOMBRES || ''} ${currentContact.APELLIDOS || ''}</p>
            <p class="cargo">${currentContact.CARGO || 'N/A'}</p>
            <p class="cedula">Cédula de Ciudadanía: ${formatCC(currentContact.CC)}</p>
            <p class="placa">Placa: ${currentContact.PLACA || 'N/A'}</p>
            <p class="celular">Celular: ${currentContact.CELULAR || 'N/A'}</p>
            <p class="correo">Correo Electrónico: ${currentContact["CORREO ELECTRÓNICO"] || 'N/A'}</p>
        `;
        resultsDiv.appendChild(contactDiv);
        actionButtons.style.display = 'flex';
        console.log('Contacto mostrado en el DOM');
    }

    function updateNavigation() {
        console.log('Actualizando navegación');
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === currentResults.length - 1;
        currentPageSpan.textContent = `${currentIndex + 1} de ${currentResults.length}`;
    }

    function resetNavigation() {
        console.log('Reseteando navegación');
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        currentPageSpan.textContent = '0 de 0';
    }

    function formatCC(cc) {
        if (!cc) return 'N/A';
        return cc.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    function getFullGrado(grado, gender) {
        const grados = {
            'PP': 'Patrullero de Policía',
            'AP': 'Auxiliar de Policía',
            'N/U': gender === 'F' ? 'No Uniformada' : 'No Uniformado',
            'PT': gender === 'F' ? 'Patrullera' : 'Patrullero',
            'IT': gender === 'F' ? 'Intendente' : 'Intendente',
            'IJ': gender === 'F' ? 'Intendente Jefe' : 'Intendente Jefe',
            'SI': gender === 'F' ? 'Subintendente' : 'Subintendente',
            'ST': gender === 'F' ? 'Subteniente' : 'Subteniente',
            'TE': gender === 'F' ? 'Teniente' : 'Teniente',
            'CT': gender === 'F' ? 'Capitana' : 'Capitán',
            'MY': gender === 'F' ? 'Mayor' : 'Mayor',
            'TC': gender === 'F' ? 'Teniente Coronel' : 'Teniente Coronel',
            'CR': gender === 'F' ? 'Coronel' : 'Coronel',
            'BG': gender === 'F' ? 'Brigadier General' : 'Brigadier General',
            'MG': gender === 'F' ? 'Mayor General' : 'Mayor General',
            'GR': gender === 'F' ? 'General' : 'General'
        };
        return grados[grado] || grado;
    }

    function determineGender(nombre) {
        if (!nombre) return 'M';
        const femaleNames = ['MARIA','STEPHANY', 'ANA', 'NEYLA', 'LAURA', 'SOFIA', 'ISABEL', 'CAROLINA', 'DANIELA', 'VALENTINA', 'GABRIELA', 'CAMILA'];
        const firstName = nombre.split(' ')[0].toUpperCase();
        return femaleNames.includes(firstName) ? 'F' : 'M';
    }

    function createWhatsAppMessage(contact) {
        console.log('Creando mensaje de WhatsApp');
        const greeting = getGreeting();
        const firstName = capitalizeFirstLetter(contact.NOMBRES.split(' ')[0]);
        const lastName = capitalizeFirstLetter(contact.APELLIDOS.split(' ')[0]);
        return `Dios y Patria, ${greeting} ${firstName} ${lastName}, le escribe Intendente Jefe Manuel Arias`;
    }

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


Intendente Jefe
MANUEL ANTONIO ARIAS GUERRA
Comandante Patrulla de Vigilancia`;
    }

    function formatCargo(cargo) {
        if (!cargo) return '';
        const lowercaseWords = ['de', 'del', 'la', 'las', 'los', 'y', 'e', 'o', 'u', 'a'];
        return cargo.split(' ').map((word, index) => 
            lowercaseWords.includes(word.toLowerCase()) && index !== 0 ? word.toLowerCase() : capitalizeFirstLetter(word)
        ).join(' ');
    }

    function getGreeting() {
        const hour = new Date().getHours();
        console.log('Hora actual:', hour);
        if (hour < 12) return "buenos días";
        if (hour < 18) return "buenas tardes";
        return "buenas noches";
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }

    function formatPhoneNumber(phoneNumber) {
        console.log('Formateando número de teléfono:', phoneNumber);
        const cleanNumber = phoneNumber.toString().replace(/\D/g, '');
        const formattedNumber = cleanNumber.startsWith('57') ? cleanNumber : '57' + cleanNumber;
        console.log('Número formateado:', formattedNumber);
        return formattedNumber;
    }

    function loadContactsFromLocalStorage() {
        const storedContacts = localStorage.getItem('policialContacts');
        if (storedContacts) {
            try {
                contacts = JSON.parse(storedContacts);
                





console.log(`Contactos cargados desde almacenamiento local: ${contacts.length}`);
                PersonalSummary.setContacts(contacts);
                PersonalSummary.updateSummary();
                statusMessage.textContent = `${contacts.length} contactos cargados desde almacenamiento local.`;
                
                // Mostrar el primer contacto al cargar desde almacenamiento local
                if (contacts.length > 0) {
                    currentResults = [contacts[0]];
                    currentIndex = 0;
                    displayCurrentContact();
                    updateNavigation();
                }
            } catch (error) {
                console.error('Error al parsear los contactos almacenados:', error);
                statusMessage.textContent = 'Error al cargar contactos almacenados. Por favor, cargue un nuevo archivo JSON.';
            }
        } else {
            console.log('No se encontraron contactos en el almacenamiento local');
            statusMessage.textContent = 'No hay contactos almacenados. Por favor, cargue un archivo JSON.';
        }
    }

    function saveContactsToLocalStorage(contacts) {
        try {
            localStorage.setItem('policialContacts', JSON.stringify(contacts));
            console.log(`${contacts.length} contactos guardados en almacenamiento local`);
        } catch (error) {
            console.error('Error al guardar contactos en almacenamiento local:', error);
            statusMessage.textContent = 'Error al guardar contactos. Es posible que el almacenamiento local esté lleno.';
        }
    }

    // Función para depuración
    window.debugContacts = function() {
        console.log('Contactos actuales:', contacts);
        console.log('Contactos en localStorage:', localStorage.getItem('policialContacts'));
    }
});
