// Función para mostrar mensajes de alerta
function showAlert(message, type = 'info') {
    alert(message);
    // Aquí se podría implementar una función más sofisticada para mostrar mensajes
}

// Función para cargar un archivo JSON
function loadJSONFile(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const jsonData = JSON.parse(e.target.result);
            callback(null, jsonData);
        } catch (error) {
            callback(error);
        }
    };
    reader.readAsText(file);
}

// Función para cargar un archivo Excel
function loadExcelFile(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        callback(null, jsonData);
    };
    reader.readAsArrayBuffer(file);
}

// Función para descargar un archivo
function downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}