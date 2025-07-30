let database = [];
let parkingLog = JSON.parse(localStorage.getItem("parkingLog")) || [];
let searchMode = "single"; // Modo de búsqueda inicial
let pdfTitle = "Parqueadero Interno"; // Título inicial del PDF

// Convertir fecha Excel a formato estándar
function excelDateToJSDate(serial) {
    if (!serial || isNaN(serial)) return "No registrada";
    const utcDays = Math.floor(serial - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    return date.toISOString().split("T")[0];
}

// Obtener fecha y hora actual
function getCurrentDateTime() {
    const now = new Date();
    const date = now.toLocaleDateString("es-ES");
    const time = now.toLocaleTimeString("es-ES");
    return { date, time };
}

// Actualizar el título del PDF según la selección
function updatePDFTitle() {
    const parkingTypeSelect = document.getElementById("parkingType");
    pdfTitle = parkingTypeSelect.value;
}

// Cambiar entre modos de búsqueda
function toggleSearchMode() {
    const mode = document.getElementById("searchMode").value;
    searchMode = mode;
    const searchInput = document.getElementById("searchInput");
    searchInput.placeholder = searchMode === "single" ? "Ingrese placa sin espacios" : "Ingrese placas separadas por comas";
}

// Cargar archivo Excel
document.getElementById("fileInput").addEventListener("change", (e) => {
    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        database = json.map((item) => ({
            ...item,
            PLACA: item.PLACA.replace(/\s+/g, "").toUpperCase(),
            "FECHA VENCIMIENTO SOAT": excelDateToJSDate(item["FECHA VENCIMIENTO SOAT"]),
            "FECHA VENCIMIENTO TECNOMECANICA": excelDateToJSDate(item["FECHA VENCIMIENTO TECNOMECANICA"]),
        }));
        localStorage.setItem("database", JSON.stringify(database));
        fileLabel.classList.add("loaded");
        fileText.textContent = "Archivo Cargado";
        alert("Archivo cargado exitosamente.");
    };
    reader.readAsArrayBuffer(e.target.files[0]);
});

// Cargar datos desde localStorage al iniciar
window.onload = function () {
    const storedData = localStorage.getItem("database");
    if (storedData) {
        database = JSON.parse(storedData);
    }
};




// Buscar placas - Modificada para ingreso automático en búsqueda múltiple sin mostrar en pantalla
function searchPlaca() {
    const searchValue = document.getElementById("searchInput").value.toUpperCase().replace(/\s+/g, "");
    const container = document.getElementById("results");
    const unauthorizedContainer = document.getElementById("unauthorized");
    container.innerHTML = "";
    unauthorizedContainer.innerHTML = "";

    const unauthorized = [];

    if (searchMode === "single") {
        // Modo de búsqueda individual - mantiene el comportamiento original
        const result = database.find((item) => item.PLACA === searchValue);
        if (result) {
            displayResult(result);
        } else {
            unauthorized.push(searchValue);
        }
    } else {
        // Modo de búsqueda múltiple - solo registra ingresos sin mostrar en pantalla
        const placas = searchValue.split(",").map(placa => placa.trim());
        const results = database.filter((item) => placas.includes(item.PLACA));
        const foundPlates = results.map((item) => item.PLACA);
        let ingresados = 0;

        // Registrar ingreso automáticamente para cada vehículo encontrado
        results.forEach((result) => {
            // Verificar si ya está dentro para no duplicar el ingreso
            const isInside = parkingLog.find((log) => log.PLACA === result.PLACA && log.status === "inside");
            if (!isInside) {
                // Registrar ingreso automático
                entry(result.PLACA, result.GRADO, result["APELLIDOS Y NOMBRES"], true);
                ingresados++;
            }
        });

        // Mostrar mensaje de confirmación de ingresos
        if (ingresados > 0) {
            container.innerHTML = `<div class="card">
                <p><strong>Operación exitosa:</strong> Se han registrado ${ingresados} motocicletas en el ${pdfTitle}.</p>
            </div>`;
        } else if (results.length > 0) {
            container.innerHTML = `<div class="card">
                <p><strong>Aviso:</strong> Todas las motocicletas encontradas ya estaban registradas en el parqueadero.</p>
            </div>`;
        }

        // Identificar placas no autorizadas
        placas.forEach((plate) => {
            if (plate && !foundPlates.includes(plate)) {
                unauthorized.push(plate);
            }
        });
    }

    if (unauthorized.length > 0) {
        displayUnauthorized(unauthorized);
    }
}



// Mostrar resultados
function displayResult(result, isMultiple = false) {
    const isSOATExpired = result["FECHA VENCIMIENTO SOAT"] && new Date(result["FECHA VENCIMIENTO SOAT"]) < new Date();
    const isTecExpired = result["FECHA VENCIMIENTO TECNOMECANICA"] && new Date(result["FECHA VENCIMIENTO TECNOMECANICA"]) < new Date();
    const isInside = parkingLog.find((log) => log.PLACA === result.PLACA && log.status === "inside");

    const button = isInside
        ? `<button class="exit" onclick="exit('${result.PLACA}')">Registrar Salida</button>`
        : `<button class="entry" onclick="entry('${result.PLACA}', '${result.GRADO}', '${result["APELLIDOS Y NOMBRES"]}', ${isMultiple})">Registrar Ingreso</button>`;
    document.getElementById("results").innerHTML += `
        <div class="card">
            <p><strong>Grado:</strong> ${result.GRADO || "Sin grado"}</p>
            <p><strong>Nombre:</strong> ${result["APELLIDOS Y NOMBRES"] || "No especificado"}</p>
            <p><strong>Placa:</strong> ${result.PLACA}</p>
            <p><strong>SOAT:</strong> ${result["FECHA VENCIMIENTO SOAT"] || "No registrado"} 
                ${isSOATExpired ? '<span class="expired">(Vencido)</span>' : '<span class="valid">(Vigente)</span>'}</p>
            <p><strong>Tecnomecánica:</strong> ${result["FECHA VENCIMIENTO TECNOMECANICA"] || "No registrada"} 
                ${isTecExpired ? '<span class="expired">(Vencido)</span>' : '<span class="valid">(Vigente)</span>'}</p>
            <div class="action-buttons">${button}</div>
        </div>
    `;
}

// Registrar ingreso de motocicletas
function entry(plate, grade, name, isMultiple) {
    const { date, time } = getCurrentDateTime();
    parkingLog.push({
        PLACA: plate,
        GRADO: grade,
        NOMBRE: name,
        status: "inside",
        date_in: date,
        time_in: isMultiple ? "Se recibió con el Servicio" : time,
        date_out: null,
        time_out: null,
    });
    localStorage.setItem("parkingLog", JSON.stringify(parkingLog));
    
    // Solo mostrar alerta en modo individual
    if (!isMultiple) {
        alert("Ingreso registrado en " + pdfTitle);
        searchPlaca();
    }
}

// Registrar salida de motocicletas
function exit(plate) {
    const log = parkingLog.find((log) => log.PLACA === plate && log.status === "inside");
    if (log) {
        const { date, time } = getCurrentDateTime();
        log.status = "outside";
        log.date_out = date;
        log.time_out = time;
        localStorage.setItem("parkingLog", JSON.stringify(parkingLog));
        alert("Salida registrada");
        searchPlaca();
    }
}

// Mostrar placas no autorizadas
function displayUnauthorized(unauthorized) {
    document.getElementById("unauthorized").innerHTML = `
        <div class="unauthorized">
            <h3>No Autorizadas:</h3>
            <ul>
                ${unauthorized.map((plate) => `<li>${plate}</li>`).join("")}
            </ul>
        </div>
    `;
}

// Descargar historial como PDF
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Obtener motocicletas actualmente en el parqueadero
    const insideVehicles = parkingLog
        .filter((log) => log.status === "inside")
        .map((log) => log.PLACA)
        .join(", ");

    const tableData = parkingLog.map((log) => ({
        Placa: log.PLACA,
        "Grado y Nombre": `${log.GRADO || ""} ${log.NOMBRE || ""}`.trim(),
        "Fecha de Ingreso": log.date_in || "No registrada",
        "Hora de Ingreso": log.time_in || "No registrada",
        "Fecha de Salida": log.date_out || "No registrada",
        "Hora de Salida": log.time_out || "No registrada",
    }));

    // Agregar título dinámico
    doc.text(pdfTitle, 10, 10);

    // Agregar tabla de registros
    doc.autoTable({
        head: [["Placa", "Grado y Nombre", "Fecha de Ingreso", "Hora de Ingreso", "Fecha de Salida", "Hora de Salida"]],
        body: tableData.map((item) => Object.values(item)),
        startY: 20,
    });

    // Agregar mensaje con placas actuales al final
    const finalY = doc.lastAutoTable.finalY + 10; // Posición final después de la tabla
    doc.text("Motocicletas en el Parqueadero:", 10, finalY);
    doc.text(insideVehicles || "No hay motocicletas en el parqueadero.", 10, finalY + 10);

    // Guardar PDF
    doc.save(pdfTitle.replace(" ", "_") + "_Registro_Parqueo.pdf");
}

// Reiniciar el registro del parqueadero
function resetParkingLog() {
    if (confirm


("¿Estás seguro de que deseas reiniciar el registro del parqueadero? Esto eliminará todos los datos almacenados.")) {
        localStorage.removeItem("parkingLog");
        localStorage.removeItem("database");
        parkingLog = [];
        database = [];
        fileLabel.classList.remove("loaded");
        fileText.textContent = "Cargar Archivo";
        document.getElementById("results").innerHTML = "";
        document.getElementById("unauthorized").innerHTML = "";
        alert("Registro reiniciado.");
    }





    // Mejoras para script.js para optimización móvil
// Asegúrate de añadir estas funciones a tu script.js existente

// Función para detectar si es un dispositivo móvil
function isMobileDevice() {
    return (window.innerWidth <= 768) || 
           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Optimizaciones para dispositivos móviles
function applyMobileOptimizations() {
    if (isMobileDevice()) {
        // Ajustar el comportamiento del input de búsqueda
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            // Hacer que el teclado aparezca cuando el usuario toca el campo
            searchInput.addEventListener('click', function() {
                this.focus();
            });
            
            // En móvil, convertir automáticamente a mayúsculas para placas
            searchInput.addEventListener('input', function() {
                this.value = this.value.toUpperCase();
            });
        }
        
        // Mejorar la interacción con botones táctiles
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            // Prevenir el efecto de "fantasma" al tocar
            button.addEventListener('touchstart', function() {
                this.classList.add('active-touch');
            }, {passive: true});
            
            button.addEventListener('touchend', function() {
                this.classList.remove('active-touch');
            }, {passive: true});
        });
        
        // Optimizar el rendimiento de scroll
        document.addEventListener('scroll', optimizeScroll, {passive: true});
        
        // Ajustar la altura para viewport de móviles (soluciona problemas con barras de navegación móvil)
        function setVhProperty() {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        }
        
        // Establecer la altura inicial y ajustar en cambios de orientación
        setVhProperty();
        window.addEventListener('resize', setVhProperty);
        
        // Optimizar tamaño de notificaciones para móvil
        customizeNotificationsForMobile();
    }
}

// Mejora del comportamiento de desplazamiento en móviles
function optimizeScroll() {
    // Usar requestAnimationFrame para optimizar el rendimiento
    if (!window.requestAnimationFrame) return;
    
    window.requestAnimationFrame(function() {
        // Prevenir que los encabezados y la barra de búsqueda desaparezcan rápidamente
        const elements = document.querySelectorAll('.title-bar, .search-bar');
        
        elements.forEach(el => {
            // Ajustar la visibilidad basada en la dirección del desplazamiento
            // Esta es una versión simplificada, puedes ampliarla según sea necesario
            if (window.scrollY < 50) {
                el.style.opacity = '1';
            }
        });
    });
}

// Personalizar notificaciones para móvil
function customizeNotificationsForMobile() {
    // Sobrescribir la función de notificación para dispositivos móviles
    if (typeof showNotification === 'function') {
        const originalShowNotification = showNotification;
        
        // Redefinir la función para dispositivos móviles
        showNotification = function(title, message) {
            // Verificar si es un dispositivo móvil
            if (isMobileDevice()) {
                // Acortar mensajes muy largos en móvil
                if (message.length > 50) {
                    message = message.substring(0, 47) + '...';
                }
                
                // Tiempo más corto para la notificación en móvil (2 segundos)
                const notification = document.getElementById('notification');
                const notificationTitle = document.querySelector('.notification-title');
                const notificationMessage = document.querySelector('.notification-message');
                
                notificationTitle.textContent = title;
                notificationMessage.textContent = message;
                
                notification.classList.add('show');
                
                // Ocultar después de 2 segundos en móvil en lugar de 3
                setTimeout(() => {
                    notification.classList.remove('show');
                }, 2000);
            } else {
                // En escritorio, usar la funcionalidad original
                originalShowNotification(title, message);
            }
        };
    }
}

// Optimizar visualización de resultados para móvil
function optimizeResultDisplayForMobile() {
    // Sobrescribir la función displayResult para mostrar resultados más compactos en móvil
    if (typeof displayResult === 'function') {
        const originalDisplayResult = displayResult;
        
        // Redefinir la función para dispositivos móviles
        displayResult = function(result, isMultiple = false) {
            if (isMobileDevice()) {
                // Implementación optimizada para móvil
                const isSOATExpired = result["FECHA VENCIMIENTO SOAT"] && new Date(result["FECHA VENCIMIENTO SOAT"]) < new Date();
                const isTecExpired = result["FECHA VENCIMIENTO TECNOMECANICA"] && new Date(result["FECHA VENCIMIENTO TECNOMECANICA"]) < new Date();
                const isInside = parkingLog.find((log) => log.PLACA === result.PLACA && log.status === "inside");

                // Botones más compactos con solo iconos en móvil
                const button = isInside
                    ? `<button class="exit" onclick="exit('${result.PLACA}')"><i class="fas fa-sign-out-alt"></i> Salida</button>`
                    : `<button class="entry" onclick="entry('${result.PLACA}', '${result.GRADO}', '${result["APELLIDOS Y NOMBRES"]}', ${isMultiple})"><i class="fas fa-sign-in-alt"></i> Ingreso</button>`;
                
                // Estructura más compacta para móvil
                document.getElementById("results").innerHTML += `
                    <div class="card mobile-card">
                        <div class="card-header">
                            <p class="plate-info"><i class="fas fa-car"></i> <strong>${result.PLACA}</strong></p>
                            <p class="name-info">${result.GRADO || ""} ${result["APELLIDOS Y NOMBRES"] || "No especificado"}</p>
                        </div>
                        <div class="card-details">
                            <div class="document-status">
                                <span class="status-item">
                                    <i class="fas fa-file-contract"></i> SOAT: 
                                    ${isSOATExpired 
                                        ? '<span class="expired"><i class="fas fa-times-circle"></i></span>' 
                                        : '<span class="valid"><i class="fas fa-check-circle"></i></span>'}
                                </span>
                                <span class="status-item">
                                    <i class="fas fa-cogs"></i> TEC: 
                                    ${isTecExpired 
                                        ? '<span class="expired"><i class="fas fa-times-circle"></i></span>' 
                                        : '<span class="valid"><i class="fas fa-check-circle"></i></span>'}
                                </span>
                            </div>
                        </div>
                        <div class="action-buttons">${button}</div>
                    </div>
                `;
            } else {
                // En escritorio, usar la visualización original
                originalDisplayResult(result, isMultiple);
            }
        };
    }
}

// Optimizar el PDF para la visualización en móvil
function optimizePdfForMobile() {
    if (typeof downloadPDF === 'function') {
        const originalDownloadPDF = downloadPDF;
        
        downloadPDF = function() {
            // Si estamos en móvil, ajustar el PDF a un formato más simple
            if (isMobileDevice()) {
                showNotification("Generando PDF", "Preparando el archivo para descargar...");
            }
            
            // Ejecutar la función original
            originalDownloadPDF();
        };
    }
}

// Inicializar optimizaciones para móvil cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    applyMobileOptimizations();
    optimizeResultDisplayForMobile();
    optimizePdfForMobile();
    
    // Si se detecta un dispositivo de pantalla pequeña, aplicar estilos adicionales
    if (window.innerWidth <= 380) {
        document.body.classList.add('very-small-screen');
    }
    
    // Agregar clase para identificar dispositivos móviles
    if (isMobileDevice()) {
        document.body.classList.add('mobile-device');
        // Añadir estilos específicos para móviles
        addMobileStyles();
    }
    
    // Ajustar comportamiento del teclado virtual en móviles
    optimizeKeyboardBehavior();
});

// Optimizar el comportamiento del teclado virtual en dispositivos móviles
function optimizeKeyboardBehavior() {
    if (!isMobileDevice()) return;
    
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    // Cerrar el teclado cuando se presiona enter
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            this.blur(); // Quita el foco para ocultar el teclado
            searchPlaca(); // Ejecuta la búsqueda
            e.preventDefault(); // Evita el comportamiento predeterminado
        }
    });
    
    // Optimizar experiencia para búsqueda múltiple
    document.getElementById('searchMode').addEventListener('change', function() {
        const mode = this.value;
        const input = document.getElementById('searchInput');
        
        if (mode === 'multiple') {
            // Configurar para entrada de múltiples placas
            input.autocapitalize = 'characters';
            input.placeholder = 'ABC123, XYZ789, ...';
        } else {
            // Configurar para entrada de una sola placa
            input.autocapitalize = 'characters';
            input.placeholder = 'Ingrese placa';
        }
        
        // Enfocar el campo después de cambiar el modo
        setTimeout(() => input.focus(), 100);
    });
}

// Estilos adicionales CSS para agregar dinámicamente si es necesario
function addMobileStyles() {
    if (!isMobileDevice()) return;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        /* Estilos adicionales para móviles cargados dinámicamente */
        .mobile-card {
            display: grid;
            grid-template-rows: auto auto auto;
            gap: 8px;
        }
        
        .card-header {
            display: flex;
            flex-direction: column;
        }
        
        .plate-info {
            font-size: 1.1rem;
            font-weight: bold;
            margin-bottom: 2px !important;
        }
        
        .name-info {
            font-size: 0.9rem;
            color: var(--text-dark);
            margin-bottom: 2px !important;
        }
        
        .document-status {
            display: flex;
            gap: 12px;
            font-size: 0.85rem;
        }
        
        .status-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .active-touch {
            transform: scale(0.95);
        }
        
        /* Ajustes para el contenedor principal */
        .container {
            padding-bottom: 60px; /* Espacio para evitar que el contenido quede debajo del footer en móviles */
        }
        
        /* Ajustes específicos para móvil */
        @media (max-width: 768px) {
            /* Usar toda la altura disponible */
            .container {
                min-height: calc(100 * var(--vh, 1vh) - 70px);
            }
            
            /* Botones más grandes para facilitar el toque */
            .action-btn, .btn {
                min-height: 44px;
                min-width: 44px;
            }
        }
    `;
    
    document.head.appendChild(styleElement);
}
}

