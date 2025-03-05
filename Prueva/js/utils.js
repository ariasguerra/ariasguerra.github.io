/**
 * Funciones utilitarias para la aplicación de gestión de parqueo
 */
const Utils = {
    /**
     * Convierte una fecha en formato Excel a formato JavaScript estándar
     * @param {number} serial - Número de serie de fecha de Excel
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
     * Valida el formato de una placa de vehículo colombiana
     * @param {string} placa - Placa a validar
     * @returns {boolean} - True si es válida, false en caso contrario
     */
    validatePlaca(placa) {
        // Eliminar espacios y convertir a mayúsculas
        placa = placa.replace(/\s+/g, "").toUpperCase();
        
        // Formatos comunes de placas colombianas
        // 1. Formato estándar: 3 letras seguidas de 2-3 números (ABC123)
        // 2. Formato alternativo: 3 letras seguidas de 2 números y una letra (ABC12D)
        // 3. Otros formatos personalizados (JHJ57C)
        
        // Opción más permisiva: cualquier combinación de 5-6 caracteres alfanuméricos
        const placaRegex = /^[A-Z0-9]{5,7}$/;
        
        return placaRegex.test(placa);
    },
    
    /**
     * Valida las placas ingresadas según el modo de búsqueda
     * @param {string} searchValue - Valor ingresado en el campo de búsqueda
     * @param {string} searchMode - Modo de búsqueda (single o multiple)
     * @returns {Object} - Resultado de la validación con propiedades isValid y message
     */
    validateSearchInput(searchValue, searchMode) {
        if (!searchValue) {
            return {
                isValid: false,
                message: "Por favor ingrese una placa"
            };
        }
        
        // Limpiar el valor de búsqueda
        searchValue = searchValue.toUpperCase().replace(/\s+/g, "");
        
        if (searchMode === "single") {
            if (!this.validatePlaca(searchValue)) {
                return {
                    isValid: false,
                    message: "El formato de la placa no es válido. Ejemplo: ABC123"
                };
            }
        } else {
            // Para búsquedas múltiples
            const placas = searchValue.split(",");
            
            // Verificar si hay placas vacías
            if (placas.some(placa => !placa.trim())) {
                return {
                    isValid: false,
                    message: "Se encontraron placas vacías, revise la separación por comas"
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
            
            if (isNaN(dateObj.getTime())) return "Fecha inválida";
            
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
     * Genera un ID único
     * @returns {string} - ID único basado en timestamp y número aleatorio
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
     * Extrae los grados únicos de un conjunto de datos
     * @param {Array} database - Base de datos de vehículos
     * @returns {Array} - Array de grados únicos ordenados
     */
    getUniqueGrades(database) {
        if (!database || !Array.isArray(database)) return [];
        
        // Extraer todos los grados y eliminar duplicados y valores vacíos
        const grades = [...new Set(database.map(item => item.GRADO).filter(Boolean))];
        
        // Ordenar alfabéticamente
        return grades.sort();
    }
};

// Exportar el objeto para uso en otros módulos
window.Utils = Utils;
