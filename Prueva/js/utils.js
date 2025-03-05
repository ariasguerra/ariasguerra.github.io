/**
 * Funciones utilitarias para la aplicaci�n de gesti�n de parqueo
 */
const Utils = {
    /**
     * Convierte una fecha en formato Excel a formato JavaScript est�ndar
     * @param {number} serial - N�mero de serie de fecha de Excel
     * @returns {string} - Fecha en formato YYYY-MM-DD o mensaje de no registrada
     */
    excelDateToJSDate(serial) {
        if (!serial || isNaN(serial)) return "No registrada";
        const utcDays = Math.floor(serial - 25569);
        const date = new Date(utcDays * 86400 * 1000);
        return date.toISOString().split("T")[0];
    },
    
    /**
     * Obtiene la fecha y hora actuales en formato local
     * @returns {Object} - Objeto con propiedades date y time
     */
    getCurrentDateTime() {
        const now = new Date();
        const date = now.toLocaleDateString("es-ES");
        const time = now.toLocaleTimeString("es-ES");
        return { date, time };
    },
    
    /**
     * Valida el formato de una placa de veh�culo colombiana
     * @param {string} placa - Placa a validar
     * @returns {boolean} - True si es v�lida, false en caso contrario
     */
    validatePlaca(placa) {
        // Eliminar espacios y convertir a may�sculas
        placa = placa.replace(/\s+/g, "").toUpperCase();
        
        // Formatos comunes de placas colombianas (3 letras seguidas de 2-3 n�meros)
        const placaRegex = /^[A-Z]{3}\d{2,3}$/;
        
        return placaRegex.test(placa);
    },
    
    /**
     * Valida las placas ingresadas seg�n el modo de b�squeda
     * @param {string} searchValue - Valor ingresado en el campo de b�squeda
     * @param {string} searchMode - Modo de b�squeda (single o multiple)
     * @returns {Object} - Resultado de la validaci�n con propiedades isValid y message
     */
    validateSearchInput(searchValue, searchMode) {
        if (!searchValue) {
            return {
                isValid: false,
                message: "Por favor ingrese una placa"
            };
        }
        
        // Limpiar el valor de b�squeda
        searchValue = searchValue.toUpperCase().replace(/\s+/g, "");
        
        if (searchMode === "single") {
            if (!this.validatePlaca(searchValue)) {
                return {
                    isValid: false,
                    message: "El formato de la placa no es v�lido. Ejemplo: ABC123"
                };
            }
        } else {
            // Para b�squedas m�ltiples
            const placas = searchValue.split(",");
            
            // Verificar si hay placas vac�as
            if (placas.some(placa => !placa.trim())) {
                return {
                    isValid: false,
                    message: "Se encontraron placas vac�as, revise la separaci�n por comas"
                };
            }
            
            // Verificar formato de cada placa
            const invalidPlacas = placas.filter(placa => !this.validatePlaca(placa.trim()));
            if (invalidPlacas.length > 0) {
                return {
                    isValid: false,
                    message: `Las siguientes placas tienen un formato incorrecto: ${invalidPlacas.join(", ")}`
                };
            }
        }
        
        return { isValid: true };
    },
    
    /**
     * Formatea una fecha para mostrarla o almacenarla
     * @param {Date|string} date - Fecha a formatear
     * @param {string} format - Formato deseado (display, storage)
     * @returns {string} - Fecha formateada
     */
    formatDate(date, format = 'display') {
        if (!date) return "No registrada";
        
        try {
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            
            if (isNaN(dateObj.getTime())) return "Fecha inv�lida";
            
            if (format === 'display') {
                return dateObj.toLocaleDateString("es-ES");
            } else if (format === 'storage') {
                return dateObj.toISOString().split('T')[0];
            } else {
                return dateObj.toLocaleDateString("es-ES");
            }
        } catch (e) {
            console.error("Error al formatear fecha:", e);
            return "Error en fecha";
        }
    },
    
    /**
     * Genera un ID �nico
     * @returns {string} - ID �nico basado en timestamp y n�mero aleatorio
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    },
    
    /**
     * Comprueba si una fecha ha expirado (es anterior a la fecha actual)
     * @param {string} dateStr - Fecha en formato de string
     * @returns {boolean} - True si la fecha ha expirado, false en caso contrario
     */
    isDateExpired(dateStr) {
        if (!dateStr || dateStr === "No registrada") return false;
        
        try {
            const date = new Date(dateStr);
            const today = new Date();
            
            // Resetear las horas para comparar solo las fechas
            today.setHours(0, 0, 0, 0);
            
            return date < today;
        } catch (e) {
            console.error("Error al comprobar fecha:", e);
            return false;
        }
    },
    
    /**
     * Extrae los grados �nicos de un conjunto de datos
     * @param {Array} database - Base de datos de veh�culos
     * @returns {Array} - Array de grados �nicos ordenados
     */
    getUniqueGrades(database) {
        if (!database || !Array.isArray(database)) return [];
        
        // Extraer todos los grados y eliminar duplicados y valores vac�os
        const grades = [...new Set(database.map(item => item.GRADO).filter(Boolean))];
        
        // Ordenar alfab�ticamente
        return grades.sort();
    }
};

// Exportar el objeto para uso en otros m�dulos
window.Utils = Utils;