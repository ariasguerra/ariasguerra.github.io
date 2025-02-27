const PersonalSummary = (function() {
    let contacts = [];

    function setContacts(newContacts) {
        contacts = newContacts;
        console.log('Contactos establecidos en PersonalSummary:', contacts.length);
    }

    function updateSummary() {
        console.log('Iniciando actualización del resumen de personal');
        console.log('Número de contactos a procesar:', contacts.length);

        const summary = {
            oficiales: {},
            suboficiales: {},
            patrulleros: {},
            patrullerosPolicia: {},
            auxiliares: {},
            personalCivil: {}
        };

        contacts.forEach((contact, index) => {
            console.log(`Procesando contacto ${index + 1}:`, contact.GR);
            switch(contact.GR) {
                case 'ST':
                case 'TE':
                case 'CT':
                case 'MY':
                case 'TC':
                case 'CR':
                case 'BG':
                case 'MG':
                case 'GR':
                    summary.oficiales[contact.GR] = (summary.oficiales[contact.GR] || 0) + 1;
                    break;
                case 'SI':
                case 'IT':
                case 'IJ':
                    summary.suboficiales[contact.GR] = (summary.suboficiales[contact.GR] || 0) + 1;
                    break;
                case 'PT':
                    summary.patrulleros[contact.GR] = (summary.patrulleros[contact.GR] || 0) + 1;
                    break;
                case 'PP':
                    summary.patrullerosPolicia[contact.GR] = (summary.patrullerosPolicia[contact.GR] || 0) + 1;
                    break;
                case 'AP':
                    summary.auxiliares[contact.GR] = (summary.auxiliares[contact.GR] || 0) + 1;
                    break;
                case 'N/U':
                    summary.personalCivil[contact.GR] = (summary.personalCivil[contact.GR] || 0) + 1;
                    break;
                default:
                    console.warn('Grado no reconocido:', contact.GR);
            }
        });

        console.log('Resumen calculado:', summary);

        updateCountAndVisibility('oficiales', summary.oficiales);
        updateCountAndVisibility('suboficiales', summary.suboficiales);
        updateCountAndVisibility('patrulleros', summary.patrulleros);
        updateCountAndVisibility('patrulleros-policia', summary.patrullerosPolicia);
        updateCountAndVisibility('auxiliares', summary.auxiliares);
        updateCountAndVisibility('personal-civil', summary.personalCivil);

        const total = Object.values(summary).reduce((acc, category) => 
            acc + Object.values(category).reduce((sum, count) => sum + count, 0), 0);
        document.getElementById('total-count').textContent = total;

        console.log('Resumen de personal actualizado en el DOM');
        
        // Configurar los filtros después de actualizar el resumen
        setupCategoryFilters();
    }

    function updateCountAndVisibility(id, categoryData) {
        const countElement = document.getElementById(`${id}-count`);
        const itemElement = document.getElementById(`${id}-item`);
        const desgloseElement = document.getElementById(`${id}-desglose`);
        
        const total = Object.values(categoryData).reduce((sum, count) => sum + count, 0);
        
        if (total > 0) {
            countElement.textContent = total;
            itemElement.style.display = 'list-item';
            
            // Actualizar el desglose
            desgloseElement.innerHTML = '';
            Object.entries(categoryData).forEach(([grado, count]) => {
                const li = document.createElement('li');
                li.textContent = `${getFullGrado(grado)}: ${count}`;
                li.style.cursor = 'pointer';
                li.addEventListener('click', function(e) {
                    e.stopPropagation(); // Evitar que se propague al padre
                    filterByGrade(grado);
                });
                desgloseElement.appendChild(li);
            });
            
            // Añadir evento de clic si no existe
            if (!countElement.onclick) {
                countElement.onclick = function() {
                    desgloseElement.style.display = desgloseElement.style.display === 'none' ? 'block' : 'none';
                };
            }
        } else {
            itemElement.style.display = 'none';
        }
    }

    function getFullGrado(grado) {
        const grados = {
            'ST': 'Subteniente',
            'TE': 'Teniente',
            'CT': 'Capitán',
            'MY': 'Mayor',
            'TC': 'Teniente Coronel',
            'CR': 'Coronel',
            'BG': 'Brigadier General',
            'MG': 'Mayor General',
            'GR': 'General',
            'SI': 'Subintendente',
            'IT': 'Intendente',
            'IJ': 'Intendente Jefe',
            'PT': 'Patrullero',
            'PP': 'Patrullero de Policía',
            'AP': 'Auxiliar de Policía',
            'N/U': 'No Uniformado'
        };
        return grados[grado] || grado;
    }

    function setupCategoryFilters() {
        // Hacer cliqueables los contadores de categorías principales
        const categoryCounters = document.querySelectorAll('.clickable');
        categoryCounters.forEach(counter => {
            // Eliminar event listeners previos
            const newCounter = counter.cloneNode(true);
            counter.parentNode.replaceChild(newCounter, counter);
            
            newCounter.addEventListener('click', function() {
                // Extraer la categoría del ID
                const categoryId = this.id.replace('-count', '');
                filterByCategory(categoryId);
            });
        });
    }

    function filterByCategory(categoryId) {
        // Definir el término de búsqueda según la categoría
        let searchTerm = '';
        
        switch(categoryId) {
            case 'oficiales':
                searchTerm = 'subteniente teniente capitán mayor coronel general';
                break;
            case 'suboficiales':
                searchTerm = 'subintendente intendente';
                break;
            case 'patrulleros':
                searchTerm = 'patrullero';
                break;
            case 'patrulleros-policia':
                searchTerm = 'patrullero de policía';
                break;
            case 'auxiliares':
                searchTerm = 'auxiliar de policía';
                break;
            case 'personal-civil':
                searchTerm = 'no uniformado';
                break;
        }
        
        // Ejecutar la búsqueda si hay un término válido
        if (searchTerm && typeof ContactModel !== 'undefined' && ContactModel.searchContacts) {
            const results = ContactModel.searchContacts(searchTerm);
            
            // Actualizar la vista si hay un controlador disponible
            if (typeof AppController !== 'undefined' && AppController.updateCurrentContactView) {
                AppController.updateCurrentContactView();
                showFilterMessage(`${results.length} contactos filtrados por: ${categoryId.replace(/-/g, ' ')}`);
            }
        }
    }

    function filterByGrade(gradoCode) {
        // Si existe el modelo, realizar la búsqueda por código de grado
        if (typeof ContactModel !== 'undefined' && ContactModel.searchContacts) {
            // Buscar directamente el código de grado (ST, MY, CR, etc.)
            const results = ContactModel.searchContacts(gradoCode);
            
            // Actualizar la vista si hay un controlador disponible
            if (typeof AppController !== 'undefined' && AppController.updateCurrentContactView) {
                AppController.updateCurrentContactView();
                
                // Obtener el nombre completo del grado para el mensaje
                const fullGrado = getFullGrado(gradoCode);
                showFilterMessage(`${results.length} contactos con grado: ${fullGrado}`);
            }
        }
    }

    function showFilterMessage(message) {
        // Mostrar mensaje temporal de filtro si existe la función showMessage
        if (typeof UIController !== 'undefined' && UIController.showMessage) {
            UIController.showMessage(message, 2000);
        } else {
            console.log(message);
        }
    }

    return {
        setContacts: setContacts,
        updateSummary: updateSummary
    };
})();
