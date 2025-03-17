let database = [];
let parkingLog = JSON.parse(localStorage.getItem("parkingLog")) || [];
let searchMode = "single"; // Modo de búsqueda inicial
let pdfTitle = "Parqueadero Interno"; // Título inicial del PDF
let fileLabel = document.getElementById("fileLabel");
let fileText = document.getElementById("fileText");

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
    
    // Mostrar notificación de cambio
    showNotification("Tipo de parqueadero actualizado", `Se ha seleccionado: ${pdfTitle}`);
}

// Mostrar notificación personalizada
function showNotification(title, message) {
    const notification = document.getElementById('notification');
    const notificationTitle = document.querySelector('.notification-title');
    const notificationMessage = document.querySelector('.notification-message');
    
    notificationTitle.textContent = title;
    notificationMessage.textContent = message;
    
    notification.classList.add('show');
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Cambiar entre modos de búsqueda
function toggleSearchMode() {
    const mode = document.getElementById("searchMode").value;
    searchMode = mode;
    const searchInput = document.getElementById("searchInput");
    
    if (searchMode === "single") {
        searchInput.placeholder = "Ingrese placa sin espacios";
    } else {
        searchInput.placeholder = "Ingrese placas separadas por comas";
    }
    
    // Mostrar notificación de cambio de modo
    showNotification("Modo de búsqueda cambiado", 
        searchMode === "single" ? "Modo: Búsqueda de placa individual" : "Modo: Búsqueda de múltiples placas");
}

// Cargar archivo Excel
document.getElementById("fileInput").addEventListener("change", (e) => {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
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
            document.getElementById("fileStatus").textContent = `Base de datos cargada: ${database.length} registros`;
            
            showNotification("Archivo cargado", `Se han cargado ${database.length} registros correctamente`);
        } catch (error) {
            console.error("Error al cargar el archivo:", error);
            showNotification("Error", "No se pudo cargar el archivo. Por favor, intente nuevamente.");
            fileLabel.classList.remove("loaded");
            fileText.textContent = "Cargar Archivo";
            document.getElementById("fileStatus").textContent = "Error al cargar el archivo";
        }
