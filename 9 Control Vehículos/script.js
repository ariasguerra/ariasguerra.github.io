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
}

