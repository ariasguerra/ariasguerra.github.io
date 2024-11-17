let database = [];
let parkingLog = JSON.parse(localStorage.getItem("parkingLog")) || [];

// Cambia el color del texto del botón de carga de archivos
const fileInput = document.getElementById("fileInput");
const fileLabel = document.getElementById("fileLabel");
const fileText = document.getElementById("fileText");

fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
        fileLabel.classList.add("loaded");
        fileText.textContent = "Archivo Cargado";
    } else {
        fileLabel.classList.remove("loaded");
        fileText.textContent = "Cargar Archivo";
    }
});

function excelDateToJSDate(serial) {
    if (!serial || isNaN(serial)) return "No registrada";
    const utcDays = Math.floor(serial - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    return date.toISOString().split("T")[0];
}

function getCurrentDateTime() {
    const now = new Date();
    const date = now.toLocaleDateString("es-ES");
    const time = now.toLocaleTimeString("es-ES");
    return { date, time };
}

// Evento para cargar el archivo Excel
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
        alert("Archivo cargado exitosamente. Los datos han sido guardados en la memoria local.");
    };
    reader.readAsArrayBuffer(e.target.files[0]);
});

// Cargar datos desde localStorage al iniciar la aplicación
window.onload = function () {
    const storedData = localStorage.getItem("database");
    if (storedData) {
        database = JSON.parse(storedData);
    }
    updateParkingList(); // Actualizar lista inicial de motocicletas en el parqueadero
};

// Función para buscar una placa
function searchPlaca() {
    const searchValue = document.getElementById("searchInput").value.toUpperCase().replace(/\s+/g, "");
    const result = database.find((item) => item.PLACA === searchValue);
    const container = document.getElementById("results");
    container.innerHTML = "";
    if (result) {
        const isSOATExpired = result["FECHA VENCIMIENTO SOAT"] && new Date(result["FECHA VENCIMIENTO SOAT"]) < new Date();
        const isTecExpired = result["FECHA VENCIMIENTO TECNOMECANICA"] && new Date(result["FECHA VENCIMIENTO TECNOMECANICA"]) < new Date();
        const isInside = parkingLog.find((log) => log.PLACA === result.PLACA && log.status === "inside");
        const button = isInside
            ? `<button class="exit" onclick="exit('${result.PLACA}')">Registrar Salida</button>`
            : `<button class="entry" onclick="entry('${result.PLACA}', '${result.GRADO}', '${result["APELLIDOS Y NOMBRES"]}')">Registrar Ingreso</button>`;
        container.innerHTML = `
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
    } else {
        container.innerHTML = "<p>No encontrada</p>";
    }
}

// Registrar ingreso de un vehículo
function entry(plate, grade, name) {
    const { date, time } = getCurrentDateTime();
    parkingLog.push({
        PLACA: plate,
        GRADO: grade,
        NOMBRE: name,
        status: "inside",
        date_in: date,
        time_in: time,
        date_out: null,
        time_out: null,
    });
    localStorage.setItem("parkingLog", JSON.stringify(parkingLog));
    alert("Ingreso registrado");
    searchPlaca();
    updateParkingList(); // Actualizar lista de motocicletas
}

// Registrar salida de un vehículo
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
        updateParkingList(); // Actualizar lista de motocicletas
    }
}

// Descargar el historial como PDF
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const tableData = parkingLog.map((log) => ({
        Placa: log.PLACA,
        "Grado y Nombre": `${log.GRADO || ""} ${log.NOMBRE || ""}`.trim(),
        "Fecha de Ingreso": log.date_in || "No registrada",
        "Hora de Ingreso": log.time_in || "No registrada",
        "Fecha de Salida": log.date_out || "No registrada",
        "Hora de Salida": log.time_out || "No registrada",
    }));

    doc.text("Registro de Parqueo", 10, 10);
    doc.autoTable({
        head: [["Placa", "Grado y Nombre", "Fecha de Ingreso", "Hora de Ingreso", "Fecha de Salida", "Hora de Salida"]],
        body: tableData.map((item) => Object.values(item)),
        startY: 20,
    });

    doc.save("Registro_Parqueo.pdf");
}

// Reiniciar el registro del parqueadero
function resetParkingLog() {
    if (confirm("¿Estás seguro de que deseas reiniciar el registro del parqueadero? Esto eliminará todos los datos almacenados.")) {
        localStorage.removeItem("parkingLog");
        localStorage.removeItem("database");
        parkingLog = [];
        database = [];
        fileLabel.classList.remove("loaded");
        fileText.textContent = "Cargar Archivo";
        document.getElementById("results").innerHTML = "";
        updateParkingList(); // Actualizar lista de motocicletas
        alert("Registro del parqueadero reiniciado.");
    }
}

// Actualizar la lista de motocicletas en el parqueadero
function updateParkingList() {
    const parkingListContainer = document.getElementById("parkingList");
    parkingListContainer.innerHTML = ""; // Limpiar contenido previo
    const insideVehicles = parkingLog.filter((log) => log.status === "inside");

    if (insideVehicles.length === 0) {
        parkingListContainer.innerHTML = "<p>No hay motos en el parqueadero.</p>";
        return;
    }

    insideVehicles.forEach((log) => {
        const card = document.createElement("div");
        card.className = "parking-card";
        card.innerHTML = `
            <p><strong>Placa:</strong> ${log.PLACA}</p>
            <p><strong>Grado:</strong> ${log.GRADO || "Sin grado"}</p>
            <p><strong>Nombre:</strong> ${log.NOMBRE || "No especificado"}</p>
            <p><strong>Fecha de Ingreso:</strong> ${log.date_in}</p>
            <p><strong>Hora de Ingreso:</strong> ${log.time_in}</p>
        `;
        parkingListContainer.appendChild(card);
    });
}