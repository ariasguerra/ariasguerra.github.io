const Favorites = (function() {
    let favorites = [];
    
    // Cargar favoritos del localStorage
    function loadFavorites() {
        const storedFavorites = localStorage.getItem('policialFavorites');
        if (storedFavorites) {
            try {
                favorites = JSON.parse(storedFavorites);
                console.log(`Cargados ${favorites.length} contactos favoritos`);
                return favorites;
            } catch (error) {
                console.error('Error al cargar favoritos:', error);
                return [];
            }
        }
        return [];
    }
    
    // Guardar favoritos en localStorage
    function saveFavorites() {
        try {
            localStorage.setItem('policialFavorites', JSON.stringify(favorites));
            console.log(`Guardados ${favorites.length} contactos favoritos`);
        } catch (error) {
            console.error('Error al guardar favoritos:', error);
        }
    }
    
    // Añadir un contacto a favoritos
    function addFavorite(contact) {
        // Comprobar si ya existe por CC o PLACA
        const exists = favorites.some(fav => 
            (contact.CC && fav.CC === contact.CC) || 
            (contact.PLACA && fav.PLACA === contact.PLACA)
        );
        
        if (!exists) {
            favorites.push(contact);
            saveFavorites();
            return true;
        }
        return false;
    }
    
    // Eliminar un contacto de favoritos
    function removeFavorite(contactId) {
        const initialLength = favorites.length;
        favorites = favorites.filter(fav => 
            (fav.CC && fav.CC !== contactId) && 
            (fav.PLACA && fav.PLACA !== contactId)
        );
        
        if (favorites.length !== initialLength) {
            saveFavorites();
            return true;
        }
        return false;
    }
    
    // Verificar si un contacto está en favoritos
    function isFavorite(contact) {
        return favorites.some(fav => 
            (contact.CC && fav.CC === contact.CC) || 
            (contact.PLACA && fav.PLACA === contact.PLACA)
        );
    }
    
    // Obtener todos los favoritos
    function getAllFavorites() {
        return favorites;
    }
    
    // Actualizar el DOM con la lista de favoritos
    function updateFavoritesList(onSelectCallback) {
        const favoritesList = document.getElementById('favorites-list');
        favoritesList.innerHTML = '';
        
        if (favorites.length === 0) {
            favoritesList.innerHTML = '<p>No hay contactos favoritos guardados.</p>';
            return;
        }
        
        favorites.forEach(contact => {
            const favoriteItem = document.createElement('div');
            favoriteItem.classList.add('favorite-item');
            
            const contactInfo = document.createElement('div');
            contactInfo.classList.add('favorite-info');
            contactInfo.textContent = `${getFullGrado(contact.GR, determineGender(contact.NOMBRES))} ${contact.NOMBRES} ${contact.APELLIDOS}`;
            
            const removeBtn = document.createElement('span');
            removeBtn.classList.add('favorite-remove');
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.title = 'Eliminar de favoritos';
            
            favoriteItem.appendChild(contactInfo);
            favoriteItem.appendChild(removeBtn);
            
            // Evento para seleccionar el contacto
            contactInfo.addEventListener('click', () => {
                if (typeof onSelectCallback === 'function') {
                    onSelectCallback(contact);
                }
            });
            
            // Evento para eliminar de favoritos
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const identifier = contact.CC || contact.PLACA;
                removeFavorite(identifier);
                updateFavoritesList(onSelectCallback);
            });
            
            favoritesList.appendChild(favoriteItem);
        });
    }
    
    // Función auxiliar para obtener el grado completo
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
    
    // Función auxiliar para determinar el género
    function determineGender(nombre) {
        if (!nombre) return 'M';
        const femaleNames = ['MARIA', 'STEPHANY', 'ANA', 'NEYLA', 'LAURA', 'SOFIA', 'ISABEL', 'CAROLINA', 'DANIELA', 'VALENTINA', 'GABRIELA', 'CAMILA'];
        const firstName = nombre.split(' ')[0].toUpperCase();
        return femaleNames.includes(firstName) ? 'F' : 'M';
    }
    
    // API pública del módulo
    return {
        loadFavorites: loadFavorites,
        addFavorite: addFavorite,
        removeFavorite: removeFavorite,
        isFavorite: isFavorite,
        getAllFavorites: getAllFavorites,
        updateFavoritesList: updateFavoritesList
    };
})();
