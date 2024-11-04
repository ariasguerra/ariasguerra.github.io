let radioData = [];
let searchResults = [];
let currentIndex = 0;

const fileInput = document.getElementById('file-input');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const resultDiv = document.getElementById('result');
const errorDiv = document.getElementById('error');
const loadingDiv = document.getElementById('loading');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const resultCount = document.getElementById('result-count');

// Cargar datos desde localStorage si existen
document.addEventListener('DOMContentLoaded', () => {
    const storedData = localStorage.getItem('radioData');
    if (storedData) {
        radioData = JSON.parse(storedData);
        searchButton.disabled = false; // Habilitar búsqueda si los datos están en localStorage
        mostrarResultado(radioData[0]); // Mostrar el primer registro almacenado
    }
});

// Evento para cargar el archivo JSON seleccionado
fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file && file.type === "application/json") {
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                radioData = JSON.parse(event.target.result);
                localStorage.setItem('radioData', JSON.stringify(radioData)); // Guardar en localStorage
                loadingDiv.style.display = 'none';
                searchButton.disabled = false; // Habilitar búsqueda después de cargar datos
                mostrarResultado(radioData[0]); // Mostrar el primer registro al cargar los datos
            } catch (error) {
                console.error('Error al procesar el archivo:', error);
                mostrarError('El archivo seleccionado no tiene el formato JSON correcto.');
            }
        };
        reader.readAsText(file);
    } else {
        mostrarError('Por favor, seleccione un archivo JSON válido.');
    }
});

function buscarRadio(e) {
    e.preventDefault();
    const searchValue = searchInput.value.trim().toLowerCase();

    if (!searchValue) {
        mostrarError('Por favor, ingrese un término de búsqueda.');
        return;
    }

    const isSingleDigit = /^\d{1}$/.test(searchValue);
    const isNumericSearch = /^\d+$/.test(searchValue);

    searchResults = radioData.filter(radio => {
        if (isSingleDigit) {
            return radio['NÚMERO DE RADIO'].toString() === searchValue;
        } else if (isNumericSearch) {
            return (
                radio['NÚMERO DE RADIO'].toString().includes(searchValue) ||
                radio['ID RADIO'].toString().includes(searchValue)
            );
        } else {
            return Object.values(radio).some(valor =>
                valor.toString().toLowerCase().includes(searchValue)
            );
        }
    });

    if (searchResults.length > 0) {
        currentIndex = 0;
        mostrarResultado(searchResults[currentIndex]);
        actualizarContador();
        actualizarBotones();
    } else {
        mostrarError('No se encontró ningún radio que coincida con el término de búsqueda.');
    }
}

function mostrarResultado(radio) {
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

function mostrarError(mensaje) {
    errorDiv.textContent = mensaje;
    errorDiv.style.display = 'block';
    resultDiv.style.display = 'none';
    resultCount.textContent = "0 de 0";
    prevButton.disabled = true;
    nextButton.disabled = true;
}

function actualizarContador() {
    resultCount.textContent = `${currentIndex + 1} de ${searchResults.length}`;
}

function actualizarBotones() {
    prevButton.disabled = currentIndex === 0;
    nextButton.disabled = currentIndex === searchResults.length - 1;
}

prevButton.addEventListener('click', () => {
    if (currentIndex > 0) {
        currentIndex--;
        mostrarResultado(searchResults[currentIndex]);
        actualizarContador();
        actualizarBotones();
    }
});

nextButton.addEventListener('click', () => {
    if (currentIndex < searchResults.length - 1) {
        currentIndex++;
        mostrarResultado(searchResults[currentIndex]);
        actualizarContador();
        actualizarBotones();
    }
});

searchForm.addEventListener('submit', buscarRadio);

// Deshabilitar el botón de búsqueda hasta que se carguen los datos
searchButton.disabled = true;