let radioData = [];
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const resultDiv = document.getElementById('result');
const errorDiv = document.getElementById('error');
const loadingDiv = document.getElementById('loading');

// Cargar los datos del archivo JSON
fetch('radio_data.json')
    .then(response => response.json())
    .then(data => {
        radioData = data;
        loadingDiv.style.display = 'none';
        searchButton.disabled = false;
    })
    .catch(error => {
        console.error('Error al cargar los datos:', error);
        loadingDiv.style.display = 'none';
        showError('Error al cargar los datos. Por favor, recarga la página.');
    });

function searchRadio(e) {
    e.preventDefault();
    const searchValue = parseInt(searchInput.value);

    if (isNaN(searchValue)) {
        showError('Por favor, ingrese un número válido.');
        return;
    }

    const foundRadio = radioData.find(radio => radio['NÚMERO DE RADIO'] === searchValue);

    if (foundRadio) {
        showResult(foundRadio);
    } else {
        showError('No se encontró ningún radio con ese número.');
    }
}

function showResult(radio) {
    resultDiv.innerHTML = `
        <h2>Información del Radio</h2>
        <p><strong>Número de Radio:</strong> ${radio['NÚMERO DE RADIO']}</p>
        <p><strong>ID de Identificación:</strong> ${radio['ID DE IDENTIFICACIÓN']}</p>
        <p><strong>Serial Radio:</strong> ${radio['SERIAL RADIO']}</p>
        <p><strong>ID Radio:</strong> ${radio['ID RADIO']}</p>
        <p><strong>Serial Batería:</strong> ${radio['SERIAL BATERÍA']}</p>
    `;
    resultDiv.style.display = 'block';
    errorDiv.style.display = 'none';
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    resultDiv.style.display = 'none';
}

searchForm.addEventListener('submit', searchRadio);

// Deshabilitar el botón de búsqueda hasta que se carguen los datos
searchButton.disabled = true;