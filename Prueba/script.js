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

    let contacts = [];
    let currentResults = [];
    let currentIndex = 0;
    let currentContact = null;

    // Cargar contactos desde almacenamiento local
    loadContactsFromLocalStorage();

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    contacts = Array.isArray(data) ? data : [data];

                    saveContactsToLocalStorage(contacts);

                    if (contacts.length > 0) {
                        currentResults = contacts;
                        currentIndex = 0;
                        displayCurrentContact();
                        updateNavigation();
                    }
                } catch (error) {
                    console.error('Error al procesar el archivo JSON:', error);
                }
            };
            reader.readAsText(file);
        }
    });

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const searchTerm = searchInput.value.toLowerCase().trim();

        if (searchTerm) {
            currentResults = searchContacts(searchTerm);

            if (currentResults.length > 0) {
                currentIndex = 0;
                displayCurrentContact();
                updateNavigation();
            } else {
                resultsDiv.innerHTML = "<p>No se encontraron resultados.</p>";
                resetNavigation();
                actionButtons.style.display = 'none';
            }
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            displayCurrentContact();
            updateNavigation();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentIndex < currentResults.length - 1) {
            currentIndex++;
            displayCurrentContact();
            updateNavigation();
        }
    });

    function searchContacts(term) {
        return contacts.filter(contact => {
            return Object.values(contact).some(value =>
                value && value.toString().toLowerCase().includes(term)
            );
        });
    }

    function displayCurrentContact() {
        resultsDiv.innerHTML = '';
        if (currentResults.length === 0) {
            actionButtons.style.display = 'none';
            return;
        }

        currentContact = currentResults[currentIndex];
        const gradoCompleto = getFullGrado(currentContact.GR, determineGender(currentContact.NOMBRES));
        const contactDiv = document.createElement('div');
        contactDiv.classList.add('contact');

        const fullName = `${currentContact.NOMBRES || ''} ${currentContact.APELLIDOS || ''}`.trim();

        const nombreHTML = `
            <p class="grado">${gradoCompleto}</p>
            <p class="nombre">
                ${fullName}
                <button class="copy-name-btn" title="Copiar nombre" onclick="copyNameAndNext('${fullName.replace(/'/g, "\\'")}')">
                    <i class="fas fa-copy"></i>
                </button>
            </p>
            <p class="cargo">${currentContact.CARGO || 'N/A'}</p>
            <p class="cedula">Cédula de Ciudadanía: ${formatCC(currentContact.CC)}</p>
            <p class="placa">Placa: ${currentContact.PLACA || 'N/A'}</p>
            <p class="celular">Celular: ${currentContact.CELULAR || 'N/A'}</p>
            <p class="correo">Correo Electrónico: ${currentContact["CORREO ELECTRÓNICO"] || 'N/A'}</p>
        `;

        contactDiv.innerHTML = nombreHTML;
        resultsDiv.appendChild(contactDiv);
        actionButtons.style.display = 'flex';
    }

    function copyNameAndNext(fullName) {
        navigator.clipboard.writeText(fullName).then(() => {
            if (currentIndex < currentResults.length - 1) {
                currentIndex++;
                displayCurrentContact();
                updateNavigation();
            } else {
                alert('Has llegado al último contacto de la búsqueda.');
            }
        }).catch(err => {
            console.error('Error al copiar el nombre:', err);
        });
    }

    function updateNavigation() {
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === currentResults.length - 1;
        currentPageSpan.textContent = `${currentIndex + 1} de ${currentResults.length}`;
    }

    function resetNavigation() {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        currentPageSpan.textContent = '0 de 0';
    }

    function formatCC(cc) {
        return cc ? cc.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : 'N/A';
    }

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

    function determineGender(nombre) {
        if (!nombre) return 'M';
        const femaleNames = ['MARIA', 'STEPHANY', 'ANA', 'NEYLA', 'LAURA', 'SOFIA', 'ISABEL', 'CAROLINA', 'DANIELA', 'VALENTINA', 'GABRIELA', 'CAMILA'];
        const firstName = nombre.split(' ')[0].toUpperCase();
        return femaleNames.includes(firstName) ? 'F' : 'M';
    }

    function loadContactsFromLocalStorage() {
        const storedContacts = localStorage.getItem('policialContacts');
        if (storedContacts) {
            try {
                contacts = JSON.parse(storedContacts);
                if (contacts.length > 0) {
                    currentResults = contacts;
                    currentIndex = 0;
                    displayCurrentContact();
                    updateNavigation();
                }
            } catch (error) {
                console.error('Error al cargar los contactos:', error);
            }
        }
    }

    function saveContactsToLocalStorage(contacts) {
        localStorage.setItem('policialContacts', JSON.stringify(contacts));
    }

    window.copyNameAndNext = copyNameAndNext;
});
