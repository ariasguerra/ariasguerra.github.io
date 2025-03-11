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

    return {
        setContacts: setContacts,
        updateSummary: updateSummary
    };
})();
