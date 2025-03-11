// Módulo para la carga e interpretación de archivos Excel
const ExcelLoader = (function() {
    // Mapeo ampliado de posibles nombres de columnas en Excel a los nombres de campos en la aplicación
    const possibleColumnMappings = {
        // Grado - añadidas más variantes posibles
        'GR': ['GR', 'GRADO', 'RANGO', 'GRADE', 'RANK', 'GRADO POLICIAL', 'NIVEL', 'NIVEL JERARQUICO', 
               'JERARQUIA', 'POSICION', 'CATEGORIA', 'TIPO DE POLICIA', 'TIPO', 'CATEGORIA POLICIAL', 'G', 'GD', 'GRAD', 
               'GRADO_POLICIAL', 'GRADO_OFICIAL', 'RANGO_POLICIAL', 'COD_GRADO', 'CODIGO GRADO', 'CODIGO RANGO'],
        
        // Nombres - ampliado para incluir términos más genéricos
        'NOMBRES': ['NOMBRES', 'NOMBRE', 'NAME', 'FIRST NAME', 'PRIMER NOMBRE', 'NOMBRES COMPLETOS', 'NOMBRES DEL FUNCIONARIO',
                   'NOMBRE COMPLETO', 'NOMBRE DEL OFICIAL', 'NOMBRE DEL FUNCIONARIO', 'NOMBRE PERSONAL', 
                   'NOMBRE PILA', 'NOMBRE OFICIAL', 'N', 'NOM', 'NOMBRES_PERSONA', 'PERSONAL_NOMBRE'],
        
        // Apellidos - ampliado para incluir términos más genéricos
        'APELLIDOS': ['APELLIDOS', 'APELLIDO', 'LAST NAME', 'SURNAME', 'APELLIDOS COMPLETOS', 'APELLIDO PATERNO', 
                     'APELLIDO MATERNO', 'APELLIDO FUNCIONARIO', 'APELLIDO OFICIAL', 'APELLIDO PERSONA', 'APELLIDO POLICIA',
                     'APELLIDO COMPLETO', 'APE', 'AP', 'APELLIDOS_PERSONA', 'PERSONAL_APELLIDO'],
        
        // Cédula - ampliado para incluir más variaciones
        'CC': ['CC', 'CEDULA', 'CÉDULA', 'DOCUMENTO', 'ID', 'IDENTIFICACIÓN', 'IDENTIFICACION', 'DOCUMENTO DE IDENTIDAD', 
              'CÉDULA DE CIUDADANÍA', 'CEDULA CIUDADANIA', 'C.C.', 'NUM. DOCUMENTO', 'NUMERO DOC', 'NUM DOC', 
              'DOCUMENTO ID', 'NUMERO DE CEDULA', 'NÚMERO DE CÉDULA', 'NUMERO DOCUMENTO', 'NÚMERO DOCUMENTO',
              'DOCUMENTO IDENTIDAD', 'IDENT', 'NUM_DOC', 'DOCUMENTO_ID', 'DOCUMENTO_IDENTIDAD', 'NRO_DOCUMENTO'],
        
        // Placa - ampliado
        'PLACA': ['PLACA', 'PLACA POLICIAL', 'BADGE', 'NUMERO DE PLACA', 'NÚMERO DE PLACA', 'ID POLICIAL', 'PLACA OFICIAL',
                 'NUMERO PLACA', 'NÚMERO PLACA', 'NUM PLACA', 'NO. PLACA', 'CÓDIGO PLACA', 'CODIGO PLACA', 'PLACA_ID',
                 'IDENTIFICACION POLICIAL', 'IDENTIFICACIÓN POLICIAL', 'ID_PLACA'],
        
        // Celular - ampliado
        'CELULAR': ['CELULAR', 'TELÉFONO', 'TELEFONO', 'CELL', 'MOBILE', 'PHONE', 'NÚMERO CELULAR', 'NUMERO CELULAR', 
                   'CONTACTO', 'TEL', 'MÓVIL', 'MOVIL', 'TELF', 'TELEF', 'TELÉFONO MÓVIL', 'TELEFONO MOVIL', 
                   'TELEFONO DE CONTACTO', 'TELÉFONO DE CONTACTO', 'CONTACTO TELEFÓNICO', 'CONTACTO TELEFONICO',
                   'CELULAR_CONTACTO', 'TELEFONO_CONTACTO', 'CONTACTO_TEL', 'TELEFONO_PERSONAL', 'CEL', 'NUM_TELEFONO'],
        
        // Correo electrónico - ampliado
        'CORREO ELECTRÓNICO': ['CORREO ELECTRÓNICO', 'CORREO', 'EMAIL', 'E-MAIL', 'MAIL', 'CORREO ELECTRONICO', 
                             'CORREO INSTITUCIONAL', 'EMAIL INSTITUCIONAL', 'DIRECCIÓN DE CORREO', 'DIRECCION DE CORREO',
                             'CORREO ELECTRÓNICO INSTITUCIONAL', 'CORREO ELECTRONICO INSTITUCIONAL', 'E MAIL', 
                             'CORREO PERSONAL', 'EMAIL PERSONAL', 'DIRECCION ELECTRONICA', 'DIRECCIÓN ELECTRÓNICA',
                             'ELECTRONIC MAIL', 'EMAIL_CONTACTO', 'CORREO_CONTACTO', 'MAIL_INSTITUCIONAL', 'EMAIL_PERSONAL'],
        
        // Cargo - ampliado
        'CARGO': ['CARGO', 'PUESTO', 'POSITION', 'ROLE', 'ROL', 'FUNCIÓN', 'FUNCION', 'CARGO ACTUAL', 'RESPONSABILIDAD',
                'CARGO POLICIAL', 'CARGO OFICIAL', 'PUESTO ACTUAL', 'OCUPACIÓN', 'OCUPACION', 'CARGO DESEMPEÑADO', 
                'CARGO DESEMPENADO', 'POSICIÓN ACTUAL', 'POSICION ACTUAL', 'CARGO_DESEMPENO', 'PUESTO_TRABAJO', 
                'CARGO_ACTUAL', 'LABOR', 'DESEMPEÑO', 'DESEMPENO', 'ACTIVIDAD', 'TRABAJO']
    };

    // Códigos válidos de grado
    const validGradeCodes = ['ST', 'TE', 'CT', 'MY', 'TC', 'CR', 'BG', 'MG', 'GR', 'SI', 'IT', 'IJ', 'PT', 'PP', 'AP', 'N/U'];

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

    // Función para verificar si un valor parece un código de grado
    function isGradeCode(value) {
        if (!value) return false;
        const normalized = normalizeText(value);
        
        // Verificar si es exactamente un código válido
        if (validGradeCodes.includes(normalized)) return true;
        
        // Verificar abreviaturas comunes
        const commonAbbreviations = [
            'SBTTE', 'SUBTTE', 'TTE', 'CAP', 'CDTE', 'MAY', 'T.C.', 'CRL', 'CORL', 'CRNL', 'COL', 
            'B.G.', 'GRAL', 'SBINT', 'INT', 'I.J.', 'PTL', 'PAT', 'P.P.', 'AUX', 'A.P.', 'N.U.', 'CIV'
        ];
        
        if (commonAbbreviations.includes(normalized)) return true;
        
        // Verificar si tiene alguna de las abreviaturas de grado incrustadas
        return validGradeCodes.some(code => 
            normalized === code || 
            normalized.startsWith(code + '.') || 
            normalized.startsWith(code + ' ') ||
            normalized.endsWith(' ' + code)
        );
    }

    // Función para verificar si una columna contiene principalmente grados
    function isGradeColumn(data, columnIndex, sampleSize = 10) {
        if (!data || !data.length || columnIndex < 0) return false;
        
        let gradeCount = 0;
        const rowsToCheck = Math.min(data.length, sampleSize);
        
        for (let i = 0; i < rowsToCheck; i++) {
            if (i < data.length && data[i] && data[i][columnIndex] !== undefined) {
                const value = data[i][columnIndex];
                if (isGradeCode(value)) {
                    gradeCount++;
                }
            }
        }
        
        return (gradeCount / rowsToCheck) > 0.3; // Si más del 30% son grados
    }

    // Función mejorada para detectar automáticamente las columnas en el archivo Excel
    function detectColumns(headers, data) {
        const columnMapping = {};
        
        // Normalizar todos los encabezados
        const normalizedHeaders = headers.map(header => normalizeText(header));
        console.log("Encabezados normalizados:", normalizedHeaders);
        
        // Verificar si hay filas de datos para análisis de contenido
        const hasData = data && data.length > 0;
        
        // Primera pasada: Buscar coincidencias por nombre de encabezado
        Object.keys(possibleColumnMappings).forEach(fieldName => {
            const possibleNames = possibleColumnMappings[fieldName];
            
            // 1. Buscar una coincidencia exacta primero
            let index = normalizedHeaders.findIndex(header => 
                possibleNames.some(name => normalizeText(name) === header)
            );
            
            // 2. Si no hay coincidencia exacta, buscar coincidencia parcial
            if (index === -1) {
                index = normalizedHeaders.findIndex(header => 
                    possibleNames.some(name => header.includes(normalizeText(name)))
                );
            }
            
            // Guardar el índice si se encontró
            if (index !== -1) {
                columnMapping[fieldName] = index;
                console.log(`Campo ${fieldName} mapeado inicialmente a la columna ${index}: ${headers[index]}`);
            }
        });
        
        // Segunda pasada: Análisis de contenido para columnas importantes no detectadas
        if (hasData) {
            // Prioridad especial para la columna de grado si no se detectó
            if (!('GR' in columnMapping)) {
                // Buscar columnas que parezcan contener códigos de grado
                for (let i = 0; i < headers.length; i++) {
                    // Saltarse columnas ya asignadas
                    if (Object.values(columnMapping).includes(i)) continue;
                    
                    if (isGradeColumn(data, i)) {
                        columnMapping['GR'] = i;
                        console.log(`Campo GR detectado por contenido en la columna ${i}: ${headers[i]}`);
                        break;
                    }
                }
            }
            
            // Si no se detectaron nombres/apellidos, buscar columna de nombre completo
            if (!('NOMBRES' in columnMapping) && !('APELLIDOS' in columnMapping)) {
                const fullNameIndex = detectFullNameColumn(normalizedHeaders, data);
                if (fullNameIndex !== -1) {
                    // Usar esta columna para nombres y apellidos
                    columnMapping['NOMBRES'] = fullNameIndex;
                    columnMapping['APELLIDOS'] = fullNameIndex;
                    console.log(`Se usará la columna ${fullNameIndex} (${headers[fullNameIndex]}) para nombres y apellidos`);
                }
            }
        }
        
        // Corregir posibles errores de mapeo
        validateAndCorrectMapping(columnMapping, headers, data);
        
        return columnMapping;
    }

    // Validar y corregir errores comunes en el mapeo
    function validateAndCorrectMapping(mapping, headers, data) {
        // Verificar que la columna de grado realmente contiene grados
        if ('GR' in mapping && data && data.length > 0) {
            const grIndex = mapping['GR'];
            
            // Si la columna no parece tener códigos de grado, buscar otra
            if (!isGradeColumn(data, grIndex)) {
                console.warn(`La columna detectada como GR (${headers[grIndex]}) no parece contener grados. Buscando alternativa...`);
                
                // Buscar una columna que sí contenga grados
                for (let i = 0; i < headers.length; i++) {
                    // Evitar columnas ya asignadas a otros campos
                    const assignedTo = Object.keys(mapping).find(key => mapping[key] === i && key !== 'GR');
                    if (assignedTo) continue;
                    
                    if (isGradeColumn(data, i)) {
                        mapping['GR'] = i;
                        console.log(`Campo GR reasignado a la columna ${i}: ${headers[i]}`);
                        break;
                    }
                }
            }
        }
        
        // Si no se detectaron nombres pero hay apellidos o viceversa, intentar inferir
        if ('NOMBRES' in mapping && !('APELLIDOS' in mapping)) {
            // Buscar una columna adyacente para apellidos
            const nombresIndex = mapping['NOMBRES'];
            if (nombresIndex + 1 < headers.length && 
                !Object.values(mapping).includes(nombresIndex + 1)) {
                mapping['APELLIDOS'] = nombresIndex + 1;
                console.log(`Campo APELLIDOS inferido en la columna ${nombresIndex + 1}: ${headers[nombresIndex + 1]}`);
            }
        } else if ('APELLIDOS' in mapping && !('NOMBRES' in mapping)) {
            // Buscar una columna adyacente para nombres
            const apellidosIndex = mapping['APELLIDOS'];
            if (apellidosIndex - 1 >= 0 && 
                !Object.values(mapping).includes(apellidosIndex - 1)) {
                mapping['NOMBRES'] = apellidosIndex - 1;
                console.log(`Campo NOMBRES inferido en la columna ${apellidosIndex - 1}: ${headers[apellidosIndex - 1]}`);
            }
        }
    }

    // Función para detectar columna de nombre completo
    function detectFullNameColumn(headers, data) {
        // Primero probar por nombre de encabezado
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            
            // Buscar encabezados que sugieran nombre completo
            if (header.includes('NOMBRE COMPLETO') || header === 'NOMBRE Y APELLIDO' || 
                header === 'NOMBRE APELLIDO' || header === 'FUNCIONARIO' || 
                header === 'PERSONAL') {
                return i;
            }
        }
        
        // Si no se encontró por encabezado, intentar por contenido
        if (data && data.length > 0) {
            for (let i = 0; i < headers.length; i++) {
                const header = headers[i];
                
                // Evitar columnas que están claramente designadas para otro propósito
                if (header.includes('GRAD') || header.includes('CEDUL') || 
                    header.includes('PLAC') || header.includes('TELEFON') || 
                    header.includes('CARG') || header.includes('EMAIL') || 
                    header.includes('CORR')) {
                    continue;
                }
                
                // Contar filas que parecen contener nombres completos
                let nameCount = 0;
                const rowsToCheck = Math.min(data.length, 10);
                
                for (let j = 0; j < rowsToCheck; j++) {
                    const cellValue = data[j][i] ? String(data[j][i]).trim() : '';
                    
                    // Un nombre completo generalmente tiene 2+ palabras
                    const words = cellValue.split(/\s+/).length;
                    if (words >= 2 && words <= 6) {
                        nameCount++;
                    }
                }
                
                // Si más del 70% de las filas parecen contener nombres
                if (nameCount / rowsToCheck > 0.7) {
                    return i;
                }
            }
        }
        
        return -1;
    }

    // Función mejorada para dividir nombres y apellidos
    function splitFullName(fullName) {
        if (!fullName) return { nombres: '', apellidos: '' };
        
        const parts = String(fullName).trim().split(/\s+/);
        
        if (parts.length === 1) {
            return { nombres: parts[0], apellidos: '' };
        } else if (parts.length === 2) {
            return { nombres: parts[0], apellidos: parts[1] };
        } else if (parts.length === 3) {
            // Para nombres como "Juan Carlos Pérez"
            // Verificar si la segunda palabra parece ser un nombre o apellido
            const secondIsName = isLikelyFirstName(parts[1]);
            if (secondIsName) {
                return { nombres: `${parts[0]} ${parts[1]}`, apellidos: parts[2] };
            } else {
                return { nombres: parts[0], apellidos: `${parts[1]} ${parts[2]}` };
            }
        } else if (parts.length === 4) {
            // Para nombres como "Juan Carlos Pérez Gómez"
            // Asumir que son dos nombres y dos apellidos
            return { nombres: `${parts[0]} ${parts[1]}`, apellidos: `${parts[2]} ${parts[3]}` };
        } else {
            // Para nombres más complejos
            // Tratar de dividir inteligentemente
            const possibleFirstNames = parts.slice(0, Math.ceil(parts.length / 2));
            const possibleLastNames = parts.slice(Math.ceil(parts.length / 2));
            
            return { 
                nombres: possibleFirstNames.join(' '), 
                apellidos: possibleLastNames.join(' ') 
            };
        }
    }

    // Función auxiliar para determinar si una palabra parece ser un nombre de pila
    function isLikelyFirstName(word) {
        const commonFirstNames = [
            'CARLOS', 'LUIS', 'JUAN', 'JOSE', 'MIGUEL', 'PEDRO', 'DAVID', 'DANIEL', 'JORGE',
            'MARIA', 'ANA', 'LAURA', 'CAROLINA', 'PAULA', 'DIANA', 'CLAUDIA', 'ADRIANA', 'ANDREA'
        ];
        
        const normalized = normalizeText(word);
        return commonFirstNames.includes(normalized);
    }

    // Función mejorada para convertir una fila de Excel a un objeto de contacto
    function rowToContact(row, columnMapping) {
        const contact = {};
        
        // Asignar valores a cada campo según el mapeo de columnas
        Object.keys(columnMapping).forEach(fieldName => {
            const columnIndex = columnMapping[fieldName];
            const cellValue = row[columnIndex];
            
            // Solo asignar valores si la celda no está vacía
            if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
                // Caso especial para cuando nombres y apellidos provienen de la misma columna
                if ((fieldName === 'NOMBRES' || fieldName === 'APELLIDOS') && 
                    columnMapping['NOMBRES'] === columnMapping['APELLIDOS']) {
                    
                    const fullName = String(cellValue);
                    const nameParts = splitFullName(fullName);
                    
                    // Asignar solo el campo correspondiente
                    if (fieldName === 'NOMBRES') {
                        contact[fieldName] = nameParts.nombres;
                    } else { // APELLIDOS
                        contact[fieldName] = nameParts.apellidos;
                    }
                } else {
                    contact[fieldName] = cellValue;
                }
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

    // Función ampliada para normalizar códigos de grado
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
            'CIVIL': 'N/U',
            // Abreviaturas o variantes adicionales
            'SUBTTE': 'ST',
            'SBTTE': 'ST',
            'TTE': 'TE',
            'CAP': 'CT',
            'CDTE': 'MY',
            'MAY': 'MY',
            'T.C.': 'TC',
            'CRL': 'CR',
            'CORL': 'CR',
            'CRNL': 'CR',
            'COL': 'CR',
            'B.G.': 'BG',
            'GRAL': 'GR',
            'SBINT': 'SI',
            'INT': 'IT',
            'I.J.': 'IJ',
            'PTL': 'PT',
            'PAT': 'PT',
            'PAT POL': 'PP',
            'P.P.': 'PP',
            'AUX': 'AP',
            'A.P.': 'AP',
            'N.U.': 'N/U',
            'CIV': 'N/U'
        };
        
        // Buscar coincidencias exactas primero
        if (normalizedGrade.length <= 3) {
            // Si ya es un código de dos letras, verificar si es válido
            if (validGradeCodes.includes(normalizedGrade)) {
                return normalizedGrade;
            }
        }
        
        // Buscar en el mapeo
        for (const [key, value] of Object.entries(gradeMapping)) {
            if (normalizedGrade === key || normalizedGrade.includes(key)) {
                return value;
            }
        }
        
        // Si no se encuentra, asignar un valor predeterminado basado en patrones
        if (normalizedGrade.includes('COMANDANTE') || normalizedGrade.includes('DIRECTOR')) {
            return 'MY'; // Muchos comandantes tienen grado de Mayor
        }
        
        // Si no se puede determinar, devolver el valor original
        console.warn(`No se pudo normalizar el grado: "${grade}"`);
        return 'N/U'; // Por defecto, considerarlo como No Uniformado
    }

    // Función principal para procesar un archivo Excel
    async function processExcelFile(file) {
        try {
            // Verificar que sea un archivo Excel
            const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
            if (!isExcel) {
                throw new Error('El archivo no es un archivo Excel válido');
            }
            
            console.log("Procesando archivo Excel:", file.name);
            
            // Leer el archivo
            const arrayBuffer = await file.arrayBuffer();
            
            // Procesar con SheetJS
            const workbook = XLSX.read(arrayBuffer, {
                type: 'array',
                cellDates: true,
                cellNF: true,
                cellStyles: true
            });
            
            console.log("Hojas disponibles:", workbook.SheetNames);
            
            // Tomar la primera hoja (podría mejorarse para seleccionar la hoja correcta)
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
            
            console.log("Primera fila de datos:", jsonData[0]);
            if (jsonData.length > 1) {
                console.log("Segunda fila (ejemplo):", jsonData[1]);
            }
            
            // Obtener los encabezados (primera fila)
            const headers = jsonData[0];
            
            // Detectar las columnas, pasando también algunas filas de datos para análisis
            const columnMapping = detectColumns(headers, jsonData.slice(1, 11));
            console.log("Mapeo de columnas detectado:", columnMapping);
            
            // Verificar que se hayan detectado columnas suficientes
            const requiredFields = ['GR', 'NOMBRES', 'APELLIDOS'];
            const missingFields = requiredFields.filter(field => !(field in columnMapping));
            
            if (missingFields.length > 0) {
                // Si falta GR, asignar un valor predeterminado
                if (missingFields.includes('GR')) {
                    console.warn("No se pudo detectar la columna GR, se asignará un valor predeterminado");
                    // Intentar inferir de alguna otra columna o asignar N/U por defecto
                }
                
                // Si faltan nombres o apellidos, comprobar si hay una columna que pueda contener ambos
                if ((missingFields.includes('NOMBRES') || missingFields.includes('APELLIDOS'))) {
                    const fullNameIndex = detectFullNameColumn(headers.map(h => normalizeText(h)), jsonData.slice(1, 11));
                    if (fullNameIndex !== -1) {
                        // Usar la misma columna para ambos campos
                        columnMapping['NOMBRES'] = fullNameIndex;
                        columnMapping['APELLIDOS'] = fullNameIndex;
                        console.log(`Se usará la columna "${headers[fullNameIndex]}" para nombres y apellidos`);
                        
                        // Quitar estos campos de la lista de faltantes
                        missingFields.splice(missingFields.indexOf('NOMBRES'), 1);
                        missingFields.splice(missingFields.indexOf('APELLIDOS'), 1);
                    }
                }
                
                // Si todavía faltan campos, mostrar error
                if (missingFields.length > 0) {
                    throw new Error(`No se pudieron detectar las siguientes columnas requeridas: ${missingFields.join(', ')}`);
                }
            }
            
            // Convertir filas a contactos
            const contacts = [];
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (row.length > 0) { // Ignorar filas vacías
                    const contact = rowToContact(row, columnMapping);
                    
                    // Si falta GR, asignar N/U por defecto
                    if (!contact.GR) {
                        contact.GR = 'N/U';
                    }
                    
                    // Verificar que tenga datos mínimos (al menos nombres O apellidos)
                    if (contact.NOMBRES || contact.APELLIDOS) {
                        contacts.push(contact);
                    } else {
                        console.warn(`Fila ${i+1} ignorada por falta de datos básicos:`, contact);
                    }
                }
            }
            
            console.log(`Se procesaron ${contacts.length} contactos válidos de ${jsonData.length-1} filas de datos`);
            
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
        normalizeGrade,
        splitFullName
    };
})();
