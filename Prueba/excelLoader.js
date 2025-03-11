// Módulo para la carga e interpretación de archivos Excel
const ExcelLoader = (function() {
    // Mapeo de posibles nombres de columnas en Excel a los nombres de campos en la aplicación
    const possibleColumnMappings = {
        // Grado
        'GR': ['GR', 'GRADO', 'RANGO', 'GRADE', 'RANK', 'CARGO POLICIAL', 'GRADO POLICIAL'],
        
        // Nombres
        'NOMBRES': ['NOMBRES', 'NOMBRE', 'NAME', 'FIRST NAME', 'PRIMER NOMBRE', 'NOMBRES COMPLETOS'],
        
        // Apellidos
        'APELLIDOS': ['APELLIDOS', 'APELLIDO', 'LAST NAME', 'SURNAME', 'APELLIDOS COMPLETOS'],
        
        // Cédula
        'CC': ['CC', 'CEDULA', 'CÉDULA', 'DOCUMENTO', 'ID', 'IDENTIFICACIÓN', 'IDENTIFICACION', 'DOCUMENTO DE IDENTIDAD', 'CÉDULA DE CIUDADANÍA'],
        
        // Placa
        'PLACA': ['PLACA', 'PLACA POLICIAL', 'BADGE', 'NUMERO DE PLACA', 'NÚMERO DE PLACA', 'ID POLICIAL'],
        
        // Celular
        'CELULAR': ['CELULAR', 'TELÉFONO', 'TELEFONO', 'CELL', 'MOBILE', 'PHONE', 'NÚMERO CELULAR', 'NUMERO CELULAR', 'CONTACTO'],
        
        // Correo electrónico
        'CORREO ELECTRÓNICO': ['CORREO ELECTRÓNICO', 'CORREO', 'EMAIL', 'E-MAIL', 'MAIL', 'CORREO ELECTRONICO', 'CORREO INSTITUCIONAL', 'EMAIL INSTITUCIONAL'],
        
        // Cargo
        'CARGO': ['CARGO', 'PUESTO', 'POSITION', 'ROLE', 'ROL', 'FUNCIÓN', 'FUNCION', 'CARGO ACTUAL', 'RESPONSABILIDAD']
    };

    // Función para normalizar texto (eliminar tildes, mayúsculas, etc.)
    function normalizeText(text) {
        if (!text) return '';
        
        // Convertir a string en caso de que sea un número u otro tipo
        text = String(text);
        
        // Convertir a mayúsculas
        text = text.toUpperCase();
        
        // Eliminar tildes y otros caracteres diacríticos
        text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        // Eliminar espacios adicionales
        text = text.trim().replace(/\s+/g, ' ');
        
        return text;
    }

    // Función para detectar automáticamente las columnas en el archivo Excel
    function detectColumns(headers) {
        const columnMapping = {};
        
        // Normalizar todos los encabezados
        const normalizedHeaders = headers.map(header => normalizeText(header));
        
        // Buscar coincidencias para cada campo requerido
        Object.keys(possibleColumnMappings).forEach(fieldName => {
            const possibleNames = possibleColumnMappings[fieldName];
            
            // Buscar una coincidencia exacta primero
            let index = normalizedHeaders.findIndex(header => 
                possibleNames.some(name => normalizeText(name) === header)
            );
            
            // Si no hay coincidencia exacta, buscar coincidencia parcial
            if (index === -1) {
                index = normalizedHeaders.findIndex(header => 
                    possibleNames.some(name => header.includes(normalizeText(name)))
                );
            }
            
            // Si se encontró una coincidencia, guardar el índice
            if (index !== -1) {
                columnMapping[fieldName] = index;
            }
        });
        
        return columnMapping;
    }

    // Función para convertir una fila de Excel a un objeto de contacto
    function rowToContact(row, columnMapping) {
        const contact = {};
        
        // Asignar valores a cada campo según el mapeo de columnas
        Object.keys(columnMapping).forEach(fieldName => {
            const columnIndex = columnMapping[fieldName];
            const cellValue = row[columnIndex];
            
            // Solo asignar valores si la celda no está vacía
            if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
                contact[fieldName] = cellValue;
            }
        });
        
        // Normalizar el grado para asegurar compatibilidad
        if (contact.GR) {
            contact.GR = normalizeGrade(contact.GR);
        }
        
        // Asegurar que las cédulas sean strings para mantener compatibilidad
        if (contact.CC !== undefined) {
            contact.CC = String(contact.CC);
        }
        
        return contact;
    }

    // Función para normalizar códigos de grado
    function normalizeGrade(grade) {
        if (!grade) return '';
        
        // Convertir a string y normalizar
        const normalizedGrade = normalizeText(grade);
        
        // Mapeo de posibles valores a los códigos estándar
        const gradeMapping = {
            'SUBTENIENTE': 'ST',
            'TENIENTE': 'TE',
            'CAPITAN': 'CT',
            'CAPITANA': 'CT',
            'MAYOR': 'MY',
            'TENIENTE CORONEL': 'TC',
            'CORONEL': 'CR',
            'BRIGADIER GENERAL': 'BG',
            'MAYOR GENERAL': 'MG',
            'GENERAL': 'GR',
            'SUBINTENDENTE': 'SI',
            'INTENDENTE': 'IT',
            'INTENDENTE JEFE': 'IJ',
            'PATRULLERO': 'PT',
            'PATRULLERA': 'PT',
            'PATRULLERO DE POLICIA': 'PP',
            'PATRULLERA DE POLICIA': 'PP',
            'AUXILIAR DE POLICIA': 'AP',
            'AUXILIAR': 'AP',
            'NO UNIFORMADO': 'N/U',
            'NO UNIFORMADA': 'N/U',
            'CIVIL': 'N/U'
        };
        
        // Buscar coincidencias exactas primero
        if (normalizedGrade.length <= 3) {
            // Si ya es un código de dos letras, verificar si es válido
            const validCodes = ['ST', 'TE', 'CT', 'MY', 'TC', 'CR', 'BG', 'MG', 'GR', 'SI', 'IT', 'IJ', 'PT', 'PP', 'AP', 'N/U'];
            if (validCodes.includes(normalizedGrade)) {
                return normalizedGrade;
            }
        }
        
        // Buscar en el mapeo
        for (const [key, value] of Object.entries(gradeMapping)) {
            if (normalizedGrade === key || normalizedGrade.includes(key)) {
                return value;
            }
        }
        
        // Si no se encuentra, devolver el valor original
        return grade;
    }

    // Función principal para procesar un archivo Excel
    async function processExcelFile(file) {
        try {
            // Verificar que sea un archivo Excel
            const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
            if (!isExcel) {
                throw new Error('El archivo no es un archivo Excel válido');
            }
            
            // Leer el archivo
            const arrayBuffer = await file.arrayBuffer();
            
            // Procesar con SheetJS
            const workbook = XLSX.read(arrayBuffer, {
                type: 'array',
                cellDates: true,
                cellNF: true,
                cellStyles: true
            });
            
            // Tomar la primera hoja
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            
            // Convertir a JSON
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
                header: 1,
                defval: '',
                blankrows: false
            });
            
            // Verificar que haya datos
            if (jsonData.length < 2) {
                throw new Error('El archivo no contiene suficientes datos');
            }
            
            // Obtener los encabezados (primera fila)
            const headers = jsonData[0];
            
            // Detectar las columnas
            const columnMapping = detectColumns(headers);
            
            // Verificar que se hayan detectado columnas suficientes
            const requiredFields = ['GR', 'NOMBRES', 'APELLIDOS'];
            const missingFields = requiredFields.filter(field => !(field in columnMapping));
            
            if (missingFields.length > 0) {
                throw new Error(`No se pudieron detectar las siguientes columnas requeridas: ${missingFields.join(', ')}`);
            }
            
            // Convertir filas a contactos
            const contacts = [];
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (row.length > 0) { // Ignorar filas vacías
                    const contact = rowToContact(row, columnMapping);
                    if (contact.GR && (contact.NOMBRES || contact.APELLIDOS)) {
                        contacts.push(contact);
                    }
                }
            }
            
            return {
                success: true,
                contacts: contacts,
                message: `Se cargaron ${contacts.length} contactos exitosamente.`
            };
        } catch (error) {
            console.error('Error procesando archivo Excel:', error);
            return {
                success: false,
                contacts: [],
                message: error.message || 'Error procesando el archivo Excel.'
            };
        }
    }

    // API pública del módulo
    return {
        processExcelFile,
        detectColumns,
        normalizeGrade
    };
})();
