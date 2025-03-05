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
        this.initFilterPanel();
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
     * Mostrar el historial filtrado
     * @param {Array} logs - Registros filtrados
     */
    displayFilteredLogs(logs) {
        const container = document.getElementById("historyResults");
        container.innerHTML = "";
        
        if (logs.length === 0) {
            container.innerHTML = "<p>No se encontraron registros con los filtros aplicados.</p>";
            return;
        }
        
        // Crear tabla de resultados
        const table = document.createElement("table");
        table.className = "history-table";
        
        // Cabecera de tabla
        const thead = document.createElement("thead");
        thead.innerHTML = `
            <tr>
                <th>Placa</th>
                <th>Grado</th>
                <th>Nombre</th>
                <th>Fecha Ingreso</th>
                <th>Hora Ingreso</th>
                <th>Fecha Salida</th>
                <th>Hora Salida</th>
                <th>Estado</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Cuerpo de tabla
        const tbody = document.createElement("tbody");
        logs.forEach(log => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${log.PLACA}</td>
                <td>${log.GRADO || "-"}</td>
                <td>${log.NOMBRE || "-"}</td>
                <td>${log.date_in || "-"}</td>
                <td>${log.time_in || "-"}</td>
                <td>${log.date_out || "-"}</td>
                <td>${log.time_out || "-"}</td>
                <td>${log.status === "inside" ? '<span class="valid">En parqueadero</span>' : '<span>Fuera</span>'}</td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        
        container.appendChild(table);
    },
    
    /**
     * Mostrar u ocultar el panel de filtros avanzados
     */
    toggleFilters() {
        const filterPanel = document.getElementById("advancedFilters");
        
        if (filterPanel.style.display === "none" || !filterPanel.style.display) {
            filterPanel.style.display = "block";
        } else {
            filterPanel.style.display = "none";
        }
    },
    
    /**
     * Inicializar el panel de filtros
     */
    initFilterPanel() {
        // Establecer el día de hoy como fecha máxima en los filtros de fecha
        const today = new Date().toISOString().split('T')[0];
        document.getElementById("filterStartDate").max = today;
        document.getElementById("filterEndDate").max = today;
        
        // Llenar dinámicamente el selector de grados
        this.updateGradesFilter();
    },
    
    /**
     * Actualizar las opciones de grados en el filtro
     */
    updateGradesFilter() {
        const filterGrado = document.getElementById("filterGrado");
        const grades = Utils.getUniqueGrades(ParkingApp.database);
        
        // Mantener la opción "Todos"
        filterGrado.innerHTML = '<option value="todos">Todos</option>';
        
        // Añadir cada grado como opción
        grades.forEach(grade => {
            const option = document.createElement("option");
            option.value = grade;
            option.textContent = grade;
            filterGrado.appendChild(option);
        });
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