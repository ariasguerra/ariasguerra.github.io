// ------------------------------
// Funciones para Generar Acta
// ------------------------------
document.addEventListener('DOMContentLoaded', function() {
    function saveToLocalStorage(data) {
        localStorage.setItem('actaData', JSON.stringify(data));
    }

    function loadFromLocalStorage() {
        const data = localStorage.getItem('actaData');
        return data ? JSON.parse(data) : null;
    }

    function updateForm(data) {
        if (data) {
            document.getElementById('grado').value = data.grado;
            document.getElementById('nombre').value = data.nombre;
            document.getElementById('cargo').value = data.cargo;
            document.getElementById('tema').value = data.tema;
            document.getElementById('temas').value = data.temas;
        }
    }

    function generateActa(data) {
        document.getElementById('actaGrado').textContent = data.grado + ' ' + data.nombre;
        document.getElementById('actaCargo').textContent = data.cargo;
        document.getElementById('actaTema').textContent = data.tema;
        document.getElementById('actaGrado2').textContent = data.grado + ' ' + data.nombre;
        document.getElementById('actaCargo2').textContent = data.cargo;
        document.getElementById('actaTema2').textContent = data.tema;
        document.getElementById('temasTratar').textContent = data.temas;

        const primeraLetra = data.tema.trim().charAt(0).toLowerCase();
        const vocales = ['a', 'e', 'i', 'o', 'u'];
        let articulo = vocales.includes(primeraLetra) ? 'EL' : 'LA';

        document.getElementById('articuloTema').textContent = articulo;
        document.getElementById('articuloTema2').textContent = articulo.toLowerCase();

        document.getElementById('actaGenerada').style.display = 'block';
    }

    // Cargar datos guardados al iniciar
    const savedData = loadFromLocalStorage();
    updateForm(savedData);
    if (savedData) {
        generateActa(savedData);
    }

    // Gestionar envío del formulario
    document.getElementById('actaForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const data = {
            grado: document.getElementById('grado').value,
            nombre: document.getElementById('nombre').value,
            cargo: document.getElementById('cargo').value,
            tema: document.getElementById('tema').value,
            temas: document.getElementById('temas').value
        };

        saveToLocalStorage(data);
        generateActa(data);
    });
});
