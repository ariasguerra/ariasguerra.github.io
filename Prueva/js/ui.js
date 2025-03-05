/**
 * Gestión de interfaz de usuario
 */
const UI = {
    /**
     * Inicializar elementos de UI
     */
    init() {
        this.bindEvents();
        this.updateSearchPlaceholder();
    },
    
    /**
     * Actualizar el estado visual del input de archivo
     * @param {boolean} isLoaded - Indica si hay un archivo cargado
     * @param {string} message - Mensaje a mostrar
     */
    updateFileStatus(isLoaded, message) {
        const fileLabel = document.getElementById("fileLabel");
        const fileText = document.getElementById("fileText");
        
        if (isLoaded) {
            fileLabel.classList.add("loaded");
            fileLabel.classList.remove("loading");
        } else {
            fileLabel.classList.remove("loaded");
        }
        
        if (message) {
            fileText.textContent = message;
        }
    },
    
    /**
     * Actualizar el estado de carga del archivo
     * @param {boolean} isLoading - Indica si hay una carga en progreso
     * @param {string} message - Mensaje a mostrar
     */
    updateLoadingStatus(isLoading, message) {
        const fileLabel = document.getElementById("fileLabel");
        const fileText = document.getElementById("fileText");
        
        if (isLoading) {
            fileLabel.classList.add("loading");
        } else {
            fileLabel.classList.remove("loading");
        }
        
        if (message) {
            fileText.textContent = message;
        }
    },
    
    /**
     * Actualizar el placeholder del campo de búsqueda según el modo
     */
    updateSearchPlaceholder() {
        const searchInput = document.getElementById("searchInput");
        searchInput.placeholder = ParkingApp.searchMode === "single" ? 
            "Ingrese placa sin espacios" : "Ingrese placas separadas por comas";
    },
    
    /**
     * Mostrar un mensaje al usuario
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de mensaje (success, error, info)
     */
    showMessage(message, type = "success") {
        // Versión simple (alert)
        alert(message);
        
        // Versión avanzada (descomentarla para activar notificaciones visuales)
        /*
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Eliminar después de la animación
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 4000);
        */
    },
    
    /**
     * Mostrar los resultados de búsqueda
     * @param {Array} results - Resultados obtenidos
     * @param {Array} unauthorized - Placas no autorizadas
     */
    displayResults(results, unauthorized = []) {
        const container = document.getElementById("results");
        const unauthorizedContainer = document.getElementById("unauthorized");
        
        container.innerHTML = "";
        unauthorizedContainer.innerHTML = "";
        
        if (results.length === 0 && unauthorized.length === 0) {
            container.innerHTML = "<p>No se encontraron resultados.</p>";
            return;
        }
        
        // Mostrar resultados autorizados
        results.forEach(result => this.createResultCard(result, container));
        
        // Mostrar placas no autorizadas
        if (unauthorized.length > 0) {
            this.displayUnauthorized(unauthorized);
        }
    },
    
    /**
     * Crear una tarjeta de resultado para un vehículo
     * @param {Object} result - Datos del vehículo
     * @param {HTMLElement} container - Contenedor donde agregar la tarjeta
     * @param {boolean} isMultiple - Indica si es parte de una búsqueda múltiple
     */
    createResultCard(result, container, isMultiple = false) {
        const isSOATExpired = Utils.isDateExpired(result["FECHA VENCIMIENTO SOAT"]);
        const isTecExpired = Utils.isDateExpired(result["FECHA VENCIMIENTO TECNOMECANICA"]);
        
        const isInside = ParkingApp.parkingLog.find(
            (log) => log.PLACA === result.PLACA && log.status === "inside"
        );

        const button = isInside
            ? `<button class="exit" onclick="ParkingApp.exit('${result.PLACA}')">
                <i class="fas fa-sign-out-alt"></i> Registrar Salida
              </button>`
            : `<button class="entry" onclick="ParkingApp.entry('${result.PLACA}', '${result.GRADO || ''}', '${result["APELLIDOS Y NOMBRES"] || ''}', ${isMultiple})">
                <i class="fas fa-sign-in-alt"></i> Registrar Ingreso
              </button>`;
        
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.innerHTML = `
            <p><strong>Grado:</strong> ${result.GRADO || "Sin grado"}</p>
            <p><strong>Nombre:</strong> ${result["APELLIDOS Y NOMBRES"] || "No especificado"}</p>
            <p><strong>Placa:</strong> ${result.PLACA}</p>
            <p><strong>SOAT:</strong> ${result["FECHA VENCIMIENTO SOAT"] || "No registrado"} 
                ${isSOATExpired ? '<span class="expired">(Vencido)</span>' : '<span class="valid">(Vigente)</span>'}</p>
            <p><strong>Tecnomecánica:</strong> ${result["FECHA VENCIMIENTO TECNOMECANICA"] || "No registrada"} 
                ${isTecExpired ? '<span class="expired">(Vencido)</span>' : '<span class="valid">(Vigente)</span>'}</p>
            <div class="action-buttons">${button}</div>
        `;
        
        container.appendChild(cardElement);
    },
    
    /**
     * Mostrar placas no autorizadas
     * @param {Array} unauthorized - Array de placas no autorizadas
     */
    displayUnauthorized(unauthorized) {
        const container = document.getElementById("unauthorized");
        
        const unauthorizedElement = document.createElement('div');
        unauthorizedElement.className = 'unauthorized';
        
        unauthorizedElement.innerHTML = `
            <h3><i class="fas fa-exclamation-triangle"></i> No Autorizadas:</h3>
            <ul>
                ${unauthorized.map((plate) => `<li>${plate}</li>`).join("")}
            </ul>
        `;
        
        container.appendChild(unauthorizedElement);
    },
    

    
    /**
     * Vincular eventos a elementos del DOM
     */
    bindEvents() {
        // Escuchar la tecla Enter en el campo de búsqueda
        document.getElementById("searchInput").addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                ParkingApp.search();
            }
        });
        
        // Inicializar evento para cargar archivo
        document.getElementById("fileInput").addEventListener("change", (e) => {
            ParkingApp.loadFile(e.target.files[0]);
        });
    }
};

// Exportar el objeto para uso en otros módulos
window.UI = UI;
