/**
 * Aplicaci�n principal para la gesti�n de parqueo
 */
const ParkingApp = {
    // Estado de la aplicaci�n
    database: [],
    parkingLog: [],
    searchMode: "single",
    pdfTitle: "Parqueadero Interno",
    
    /**
     * Inicializar la aplicaci�n
     */
    init() {
        this.loadStoredData();
    },
    
    /**
     * Cargar datos almacenados en localStorage
     */
    loadStoredData() {
        try {
            const storedDatabase = localStorage.getItem("database");
            const storedParkingLog = localStorage.getItem("parkingLog");
            
            if (storedDatabase) {
                this.database = JSON.parse(storedDatabase);
                UI.updateFileStatus(true, "Archivo Cargado");
            }
            
            if (storedParkingLog) {
                this.parkingLog = JSON.parse(storedParkingLog);
            } else {
                this.parkingLog = [];
            }
        } catch (error) {
            console.error("Error al cargar datos:", error);
            this.database = [];
            this.parkingLog = [];
        }
    },
    
    /**
     * Cargar archivo Excel
     * @param {File} file - Archivo seleccionado por el usuario
     */
    loadFile(file) {
        if (!file) return;
        
        UI.updateLoadingStatus(true, "Cargando archivo...");
        
        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: "array" });
                    const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                    
                    this.database = json.map((item) => ({
                        ...item,
                        PLACA: item.PLACA ? item.PLACA.replace(/\s+/g, "").toUpperCase() : "",
                        "FECHA VENCIMIENTO SOAT": Utils.excelDateToJSDate(item["FECHA VENCIMIENTO SOAT"]),
                        "FECHA VENCIMIENTO TECNOMECANICA": Utils.excelDateToJSDate(item["FECHA VENCIMIENTO TECNOMECANICA"]),
                    }));
                    
                    localStorage.setItem("database", JSON.stringify(this.database));
                    
                    UI.updateFileStatus(true, `Archivo Cargado (${this.database.length} registros)`);
                    UI.updateGradesFilter();
                    UI.showMessage("Archivo cargado exitosamente.");
                } catch (error) {
                    console.error("Error al procesar archivo:", error);
                    UI.updateFileStatus(false, "Error al procesar el archivo");
                    UI.showMessage("Error al procesar el archivo: " + error.message, "error");
                }
            };
            
            reader.onerror = (error) => {
                console.error("Error al leer archivo:", error);
                UI.updateFileStatus(false, "Error al leer el archivo");
                UI.showMessage("Error al leer el archivo", "error");
            };
            
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error("Error al cargar archivo:", error);
            UI.updateFileStatus(false, "Error en la carga");
            UI.showMessage("Error al cargar el archivo: " + error.message, "error");
        }
    },
    
    /**
     * Cambiar el modo de b�squeda
     * @param {string} mode - Modo de b�squeda (single o multiple)
     */
    setSearchMode(mode) {
        this.searchMode = mode;
        UI.updateSearchPlaceholder();
    },
    
    /**
     * Actualizar el t�tulo del PDF
     * @param {string} title - Nuevo t�tulo
     */
    setPdfTitle(title) {
        this.pdfTitle = title;
    },
    
    /**
     * Buscar veh�culos por placa
     */
    search() {
        const searchValue = document.getElementById("searchInput").value.toUpperCase().replace(/\s+/g, "");
        
        // Validar el formato de entrada
        const validation = Utils.validateSearchInput(searchValue, this.searchMode);
        if (!validation.isValid) {
            UI.showMessage(validation.message, "error");
            return;
        }
        
        const results = [];
        const unauthorized = [];
        
        if (this.searchMode === "single") {
            const result = this.database.find((item) => item.PLACA === searchValue);
            if (result) {
                results.push(result);
            } else {
                unauthorized.push(searchValue);
            }
        } else {
            const placas = searchValue.split(",").map(p => p.trim().toUpperCase());
            const foundPlates = [];
            
            // Buscar cada placa en la base de datos
            for (const placa of placas) {
                const result = this.database.find((item) => item.PLACA === placa);
                if (result) {
                    results.push(result);
                    foundPlates.push(placa);
                }
            }
            
            // Identificar placas no autorizadas
            for (const placa of placas) {
                if (!foundPlates.includes(placa)) {
                    unauthorized.push(placa);
                }
            }
        }
        
        // Mostrar resultados
        UI.displayResults(results, unauthorized);
    },
    
    /**
     * Registrar ingreso de un veh�culo
     * @param {string} plate - Placa del veh�culo
     * @param {string} grade - Grado del propietario
     * @param {string} name - Nombre del propietario
     * @param {boolean} isMultiple - Indica si es parte de una b�squeda m�ltiple
     */
    entry(plate, grade, name, isMultiple) {
        const { date, time } = Utils.getCurrentDateTime();
        
        this.parkingLog.push({
            PLACA: plate,
            GRADO: grade,
            NOMBRE: name,
            status: "inside",
            date_in: date,
            time_in: isMultiple ? "Se recibi� con el Servicio" : time,
            date_out: null,
            time_out: null,
        });
        
        localStorage.setItem("parkingLog", JSON.stringify(this.parkingLog));
        UI.showMessage(`Ingreso registrado en ${this.pdfTitle}`);
        this.search(); // Actualizar resultados
    },
    
    /**
     * Registrar salida de un veh�culo
     * @param {string} plate - Placa del veh�culo
     */
    exit(plate) {
        const logIndex = this.parkingLog.findIndex(
            (log) => log.PLACA === plate && log.status === "inside"
        );
        
        if (logIndex !== -1) {
            const { date, time } = Utils.getCurrentDateTime();
            this.parkingLog[logIndex].status = "outside";
            this.parkingLog[logIndex].date_out = date;
            this.parkingLog[logIndex].time_out = time;
            
            localStorage.setItem("parkingLog", JSON.stringify(this.parkingLog));
            UI.showMessage("Salida registrada");
            this.search(); // Actualizar resultados
        } else {
            UI.showMessage("No se encontr� registro de ingreso para esta placa", "error");
        }
    },
    
    /**
     * Filtrar el historial seg�n los criterios seleccionados
     */
    filterHistory() {
        const startDate = document.getElementById("filterStartDate").value;
        const endDate = document.getElementById("filterEndDate").value;
        const filterStatus = document.getElementById("filterStatus").value;
        const filterGrado = document.getElementById("filterGrado").value;
        
        // Crear copia del log completo
        let filteredLog = [...this.parkingLog];
        
        // Aplicar filtros uno por uno si est�n definidos
        if (startDate) {
            filteredLog = filteredLog.filter(log => {
                const dateIn = new Date(log.date_in.split('/').reverse().join('-'));
                return dateIn >= new Date(startDate);
            });
        }
        
        if (endDate) {
            filteredLog = filteredLog.filter(log => {
                const dateIn = new Date(log.date_in.split('/').reverse().join('-'));
                return dateIn <= new Date(endDate);
            });
        }
        
        if (filterStatus !== "todos") {
            filteredLog = filteredLog.filter(log => log.status === filterStatus);
        }
        
        if (filterGrado && filterGrado !== "todos") {
            filteredLog = filteredLog.filter(log => log.GRADO === filterGrado);
        }
        
        // Mostrar resultados en la UI
        UI.displayFilteredLogs(filteredLog);
    },
    
    /**
     * Generar y descargar PDF con el historial
     */
    downloadPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Obtener motocicletas actualmente en el parqueadero
        const insideVehicles = this.parkingLog
            .filter((log) => log.status === "inside")
            .map((log) => log.PLACA)
            .join(", ");

        const tableData = this.parkingLog.map((log) => ({
            Placa: log.PLACA,
            "Grado y Nombre": `${log.GRADO || ""} ${log.NOMBRE || ""}`.trim(),
            "Fecha de Ingreso": log.date_in || "No registrada",
            "Hora de Ingreso": log.time_in || "No registrada",
            "Fecha de Salida": log.date_out || "No registrada",
            "Hora de Salida": log.time_out || "No registrada",
        }));

        // Agregar t�tulo din�mico
        doc.text(this.pdfTitle, 10, 10);

        // Agregar tabla de registros
        doc.autoTable({
            head: [["Placa", "Grado y Nombre", "Fecha de Ingreso", "Hora de Ingreso", "Fecha de Salida", "Hora de Salida"]],
            body: tableData.map((item) => Object.values(item)),
            startY: 20,
        });

        // Agregar mensaje con placas actuales al final
        const finalY = doc.lastAutoTable.finalY + 10; // Posici�n final despu�s de la tabla
        doc.text("Motocicletas en el Parqueadero:", 10, finalY);
        doc.text(insideVehicles || "No hay motocicletas en el parqueadero.", 10, finalY + 10);

        // Guardar PDF
        doc.save(this.pdfTitle.replace(" ", "_") + "_Registro_Parqueo.pdf");
    },
    
    /**
     * Reiniciar el registro del parqueadero
     */
    resetParkingLog() {
        if (confirm("�Est�s seguro de que deseas reiniciar el registro del parqueadero? Esto eliminar� todos los datos almacenados.")) {
            localStorage.removeItem("parkingLog");
            localStorage.removeItem("database");
            
            this.parkingLog = [];
            this.database = [];
            
            const fileLabel = document.getElementById("fileLabel");
            const fileText = document.getElementById("fileText");
            
            fileLabel.classList.remove("loaded");
            fileText.textContent = "Cargar Archivo";
            
            document.getElementById("results").innerHTML = "";
            document.getElementById("unauthorized").innerHTML = "";
            document.getElementById("historyResults").innerHTML = "";
            
            UI.showMessage("Registro reiniciado.");
        }
    }
};

// Exportar el objeto para uso en otros m�dulos
window.ParkingApp = ParkingApp;