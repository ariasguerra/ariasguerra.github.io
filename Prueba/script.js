let propiedades = [];
let arrendatarios = [];
let recibos = [];
let reciboActual = null;

// --- Constants ---
const LOCAL_STORAGE_PROPIEDADES = 'propiedades';
const LOCAL_STORAGE_ARRENDATARIOS = 'arrendatarios';
const LOCAL_STORAGE_RECIBOS = 'recibos';

// --- DOM Elements ---
const navFormulario = document.getElementById('navFormulario');
const navRecibo = document.getElementById('navRecibo');
const navHistorial = document.getElementById('navHistorial');
const seccionFormulario = document.getElementById('seccionFormulario');
const seccionRecibo = document.getElementById('seccionRecibo');
const seccionHistorial = document.getElementById('seccionHistorial');
const formularioRecibo = document.getElementById('formularioRecibo');
const seleccionPropiedad = document.getElementById('seleccionPropiedad');
const seleccionArrendatario = document.getElementById('seleccionArrendatario');
const montoInput = document.getElementById('monto');
const formaPagoSelect = document.getElementById('formaPago');
const fechaPagoInput = document.getElementById('fechaPago');
const horaPagoInput = document.getElementById('horaPago');
const fechaInicioInput = document.getElementById('fechaInicio');
const fechaFinInput = document.getElementById('fechaFin');
const reciboGeneradoDiv = document.getElementById('reciboGenerado');
const reciboPlaceholder = document.getElementById('reciboPlaceholder');
const listaRecibosDiv = document.getElementById('listaRecibos');
const botonImprimir = document.getElementById('botonImprimir');
const botonEditar = document.getElementById('botonEditar');
const botonEliminar = document.getElementById('botonEliminar');
const botonNuevoRecibo = document.getElementById('botonNuevoRecibo');
const botonLimpiarFormulario = document.getElementById('botonLimpiarFormulario');
const botonExportar = document.getElementById('botonExportar');
const importarArchivoInput = document.getElementById('importarArchivo');
const filtroPropiedadInput = document.getElementById('filtroPropiedad');
const filtroArrendatarioInput = document.getElementById('filtroArrendatario');
const mainNav = document.getElementById('mainNav');

// --- Utility Functions ---

// Función para convertir números a palabras en español (sin cambios)
function numeroALetras(numero) {
    // ... (keep existing function)
    const unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const centenas = ['ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    numero = parseInt(numero); // Ensure it's an integer

    if (isNaN(numero)) return 'Número inválido';
    if (numero === 0) return 'cero';

    let letras = '';

    function getCentenas(num) {
        if (num > 999) return ''; // Limit to hundreds for simplicity here
        if (num === 100) return 'cien';
        if (num < 100) return getDecenas(num);

        const c = Math.floor(num / 100);
        const r = num % 100;
        letras = centenas[c - 1];
        if (r > 0) {
            letras += ' ' + getDecenas(r);
        }
        return letras;
    }

    function getDecenas(num) {
        if (num < 10) return unidades[num];
        if (num === 10) return 'diez';
        if (num === 11) return 'once';
        if (num === 12) return 'doce';
        if (num === 13) return 'trece';
        if (num === 14) return 'catorce';
        if (num === 15) return 'quince';
        if (num < 20) return 'dieci' + unidades[num - 10];
        if (num === 20) return 'veinte';
        if (num < 30) return 'veinti' + unidades[num - 20];

        const d = Math.floor(num / 10);
        const u = num % 10;
        letras = decenas[d - 1];
        if (u > 0) {
            letras += ' y ' + unidades[u];
        }
        return letras;
    }

    if (numero >= 1000000) {
        const millones = Math.floor(numero / 1000000);
        letras += (millones === 1 ? 'un millón' : numeroALetras(millones) + ' millones');
        const resto = numero % 1000000;
        if (resto > 0) {
            letras += ' ' + numeroALetras(resto);
        }
    } else if (numero >= 1000) {
        const miles = Math.floor(numero / 1000);
        letras += (miles === 1 ? 'mil' : getCentenas(miles) + ' mil'); // Use getCentenas for thousands part
        const resto = numero % 1000;
        if (resto > 0) {
            letras += ' ' + getCentenas(resto);
        }
    } else {
        letras = getCentenas(numero);
    }

    return letras;
}


// Función para formatear fechas (sin cambios)
function formatearFecha(fecha) {
    if (!fecha) return ''; // Handle cases where date might be null or undefined
    try {
        // Check if fecha is already a Date object
        const dateObj = fecha instanceof Date ? fecha : new Date(fecha);
        // Adjust for timezone offset when creating from string
        if (!(fecha instanceof Date)) {
             dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
        }
        const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
        return dateObj.toLocaleDateString('es-ES', opciones);
    } catch (e) {
        console.error("Error formatting date:", fecha, e);
        return 'Fecha inválida';
    }
}

// --- Data Handling ---

// Función para guardar datos en localStorage
function guardarDatos(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Error saving ${key} to localStorage:`, e);
        alert(`Error al guardar ${key}. Es posible que el almacenamiento esté lleno.`);
    }
}

function guardarPropiedades() {
    guardarDatos(LOCAL_STORAGE_PROPIEDADES, propiedades);
}
function guardarArrendatarios() {
    guardarDatos(LOCAL_STORAGE_ARRENDATARIOS, arrendatarios);
}
function guardarRecibos() {
    guardarDatos(LOCAL_STORAGE_RECIBOS, recibos);
}

// Función para cargar datos desde localStorage o desde archivos JSON
async function cargarDatos() {
    console.log('Iniciando carga de datos...');
    let loadedFromStorage = true;

    try {
        propiedades = JSON.parse(localStorage.getItem(LOCAL_STORAGE_PROPIEDADES)) || [];
        arrendatarios = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ARRENDATARIOS)) || [];
        recibos = JSON.parse(localStorage.getItem(LOCAL_STORAGE_RECIBOS)) || [];
    } catch (e) {
        console.error("Error parsing data from localStorage:", e);
        // Optionally clear corrupted storage
        // localStorage.removeItem(LOCAL_STORAGE_PROPIEDADES);
        // localStorage.removeItem(LOCAL_STORAGE_ARRENDATARIOS);
        // localStorage.removeItem(LOCAL_STORAGE_RECIBOS);
        propiedades = [];
        arrendatarios = [];
        recibos = [];
    }


    const promesas = [];

    if (propiedades.length === 0) {
        loadedFromStorage = false;
        console.log("Cargando propiedades desde JSON...");
        promesas.push(
            fetch('propiedades.json')
                .then(response => response.ok ? response.json() : Promise.reject(`HTTP error ${response.status}`))
                .then(data => { propiedades = data; guardarPropiedades(); console.log('Propiedades cargadas:', propiedades); })
                .catch(error => console.error('Error al cargar propiedades.json:', error))
        );
    }

    if (arrendatarios.length === 0) {
        loadedFromStorage = false;
        console.log("Cargando arrendatarios desde JSON...");
        promesas.push(
            fetch('arrendatarios.json')
                .then(response => response.ok ? response.json() : Promise.reject(`HTTP error ${response.status}`))
                .then(data => { arrendatarios = data; guardarArrendatarios(); console.log('Arrendatarios cargados:', arrendatarios); })
                .catch(error => console.error('Error al cargar arrendatarios.json:', error))
        );
    }

    if (recibos.length === 0) {
         loadedFromStorage = false;
         console.log("Cargando recibos desde JSON...");
         promesas.push(
             fetch('recibos.json')
                 .then(response => response.ok ? response.json() : Promise.reject(`HTTP error ${response.status}`))
                 .then(data => { recibos = data; console.log('Recibos cargados (antes de verificar):', data.length); }) // Log before verify
                 .catch(error => console.error('Error al cargar recibos.json:', error))
         );
     }

    // Wait for all fetches to complete if any were needed
    await Promise.all(promesas);

    // Ensure recibos are saved after potential fetch and verification
    if (!loadedFromStorage || recibos.length > 0) { // Save even if loaded from storage to apply verification
        verificarIntegridadDatos(); // Run verification *after* potential loading
        guardarRecibos(); // Save verified/updated recibos
        console.log('Recibos después de verificar y guardar:', recibos.length);
    }


    console.log('Todos los datos cargados/verificados. Iniciando carga de UI...');
    cargarPropiedades();
    cargarArrendatarios();
    cargarRecibos(); // Initial load without filters
    setupEventListeners(); // Setup listeners after data is ready
}

// IMPROVEMENT: Check data integrity, especially linking receipts to properties
function verificarIntegridadDatos() {
    let changed = false;
    recibos.forEach(recibo => {
        // Ensure every receipt has a property code derived from numeroRecibo
        const codigoPropiedadRecibo = recibo.numeroRecibo?.substring(0, 4);
        if (!recibo.codigoPropiedad && codigoPropiedadRecibo) {
            recibo.codigoPropiedad = codigoPropiedadRecibo;
            changed = true;
        }

        // Ensure direccionInmueble exists, look up if missing
        if (!recibo.direccionInmueble && recibo.codigoPropiedad) {
            const propiedad = propiedades.find(p => p.codigo === recibo.codigoPropiedad);
            if (propiedad) {
                recibo.direccionInmueble = propiedad.direccion;
                console.log(`Corregida dirección para recibo ${recibo.numeroRecibo}`);
                changed = true;
            } else {
                console.warn(`No se pudo encontrar la propiedad con código ${recibo.codigoPropiedad} para el recibo ${recibo.numeroRecibo}`);
            }
        }
        // Ensure parteArrendada exists, look up if missing
        if (!recibo.parteArrendada && recibo.codigoPropiedad) {
             const propiedad = propiedades.find(p => p.codigo === recibo.codigoPropiedad);
             if (propiedad) {
                 recibo.parteArrendada = propiedad.parteArrendada;
                 console.log(`Corregida parte arrendada para recibo ${recibo.numeroRecibo}`);
                 changed = true;
             }
        }

        // Ensure arrendatario ID exists if possible
         if (!recibo.arrendatarioId && recibo.nombreArrendatario) {
             const arrendatario = arrendatarios.find(a => a.nombre === recibo.nombreArrendatario);
             if (arrendatario) {
                 recibo.arrendatarioId = arrendatario.id;
                 // console.log(`Añadido ID de arrendatario para recibo ${recibo.numeroRecibo}`);
                 changed = true;
             } else {
                 // console.warn(`No se pudo encontrar ID para arrendatario "${recibo.nombreArrendatario}" en recibo ${recibo.numeroRecibo}`);
             }
         }

    });
    // No need to save here, will be saved after cargarDatos finishes
    // if (changed) {
    //     guardarRecibos();
    // }
}

// --- UI Population ---

function cargarPropiedades() {
    seleccionPropiedad.innerHTML = '<option value="">Seleccione una propiedad</option>';
    propiedades.forEach(propiedad => {
        const option = document.createElement('option');
        option.value = propiedad.codigo;
        option.textContent = propiedad.direccion;
        seleccionPropiedad.appendChild(option);
    });
}

function cargarArrendatarios() {
    seleccionArrendatario.innerHTML = '<option value="">Seleccione un arrendatario</option>';
    arrendatarios.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(arrendatario => { // Sort alphabetically
        const option = document.createElement('option');
        option.value = arrendatario.id;
        option.textContent = arrendatario.nombre;
        seleccionArrendatario.appendChild(option);
    });
}

// IMPROVEMENT: Filter history based on input fields
function cargarRecibos(filtroProp = '', filtroArr = '') {
    listaRecibosDiv.innerHTML = ''; // Clear previous list

    filtroProp = filtroProp.toLowerCase().trim();
    filtroArr = filtroArr.toLowerCase().trim();

    const recibosFiltrados = recibos.filter(recibo => {
        const matchPropiedad = !filtroProp || recibo.direccionInmueble?.toLowerCase().includes(filtroProp);
        const matchArrendatario = !filtroArr || recibo.nombreArrendatario?.toLowerCase().includes(filtroArr);
        return matchPropiedad && matchArrendatario;
    });

    if (recibosFiltrados.length === 0) {
        listaRecibosDiv.innerHTML = '<p>No hay recibos que coincidan con los filtros.</p>';
        return;
    }

    // Group filtered receipts by property address
    const recibosPorInmueble = recibosFiltrados.reduce((acc, recibo) => {
        const direccion = recibo.direccionInmueble || `Propiedad Desconocida (${recibo.codigoPropiedad})`;
        if (!acc[direccion]) {
            acc[direccion] = [];
        }
        acc[direccion].push(recibo);
        return acc;
    }, {});

    // Sort properties alphabetically by address
    const direccionesOrdenadas = Object.keys(recibosPorInmueble).sort((a, b) => a.localeCompare(b));

    direccionesOrdenadas.forEach(direccion => {
        const propiedadRecibos = recibosPorInmueble[direccion];
        // Sort receipts within the property group by payment date, newest first
        propiedadRecibos.sort((a, b) => new Date(b.fechaPago) - new Date(a.fechaPago));

        const seccionInmueble = document.createElement('div');
        seccionInmueble.classList.add('seccion-inmueble');

        const header = document.createElement('h3');
        header.innerHTML = `${direccion} <span class="toggle-icon"></span>`; // Add span for icon
        seccionInmueble.appendChild(header);


        // Display the latest receipt directly under the header
        const ultimoRecibo = propiedadRecibos[0];
        const elementoUltimoRecibo = crearElementoRecibo(ultimoRecibo);
        seccionInmueble.appendChild(elementoUltimoRecibo);

        // Container for older receipts (initially hidden via CSS)
        const recibosAntiguosDiv = document.createElement('div');
        recibosAntiguosDiv.classList.add('recibos-antiguos');

        if (propiedadRecibos.length > 1) {
            // Add older receipts to the hidden container
            for (let i = 1; i < propiedadRecibos.length; i++) {
                const elementoRecibo = crearElementoRecibo(propiedadRecibos[i]);
                recibosAntiguosDiv.appendChild(elementoRecibo);
            }
            seccionInmueble.appendChild(recibosAntiguosDiv);

             // Add "Ver más/menos" button
             const botonToggle = document.createElement('button');
             botonToggle.textContent = 'Ver más';
             botonToggle.classList.add('boton-ver-mas');
             botonToggle.addEventListener('click', (e) => {
                 e.stopPropagation(); // Prevent header click event
                 const estaVisible = recibosAntiguosDiv.classList.toggle('visible');
                 botonToggle.textContent = estaVisible ? 'Ver menos' : 'Ver más';
                 botonToggle.classList.toggle('boton-ver-menos', estaVisible);
                 botonToggle.classList.toggle('boton-ver-mas', !estaVisible);
             });
             seccionInmueble.appendChild(botonToggle);

             // IMPROVEMENT: Toggle older receipts visibility also by clicking header
             seccionInmueble.classList.add('collapsed'); // Start collapsed
             recibosAntiguosDiv.style.maxHeight = '0'; // Start hidden

              header.addEventListener('click', () => {
                  const estaColapsado = seccionInmueble.classList.toggle('collapsed');
                  recibosAntiguosDiv.style.maxHeight = estaColapsado ? '0' : `${recibosAntiguosDiv.scrollHeight}px`;
                  // Also update button state if present
                  if(botonToggle){
                     const estaVisible = !estaColapsado;
                     botonToggle.textContent = estaVisible ? 'Ver menos' : 'Ver más';
                     botonToggle.classList.toggle('boton-ver-menos', estaVisible);
                     botonToggle.classList.toggle('boton-ver-mas', !estaVisible);
                     recibosAntiguosDiv.classList.toggle('visible', estaVisible); // Sync class for potential future use
                  }
              });


        } else {
           seccionInmueble.classList.add('no-antiguos'); // Mark sections with only one receipt
           header.style.cursor = 'default'; // No toggle action needed
           header.querySelector('.toggle-icon').style.display = 'none'; // Hide icon if no toggle
        }


        listaRecibosDiv.appendChild(seccionInmueble);
    });
}


function crearElementoRecibo(recibo) {
    const elementoRecibo = document.createElement('div');
    elementoRecibo.classList.add('recibo');
    elementoRecibo.dataset.numeroRecibo = recibo.numeroRecibo; // Store ID for easier access

    const montoFormateado = recibo.montoPagado ? parseInt(recibo.montoPagado).toLocaleString('es-CO') : 'N/A';
    const montoLetras = recibo.montoEnLetras || '';
    const fechaPagoFormateada = formatearFecha(recibo.fechaPago);
    const horaPagoFormateada = recibo.horaPago || '';
    const periodoInicioFormateado = formatearFecha(recibo.periodoInicio);
    const periodoFinFormateado = formatearFecha(recibo.periodoFin);

    elementoRecibo.innerHTML = `
        <strong># Recibo:</strong> ${recibo.numeroRecibo}<br>
        <strong>Arrendatario:</strong> ${recibo.nombreArrendatario || 'N/A'}<br>
        <strong>Monto:</strong> $${montoFormateado} (${montoLetras})<br>
        <strong>Fecha Pago:</strong> ${fechaPagoFormateada} ${horaPagoFormateada}<br>
        <strong>Período:</strong> ${periodoInicioFormateado} a ${periodoFinFormateado}<br>
        <strong>Dirección:</strong> ${recibo.direccionInmueble || 'N/A'}<br>
    `;
    elementoRecibo.addEventListener('click', function() {
        reciboActual = recibos.find(r => r.numeroRecibo === this.dataset.numeroRecibo); // Find using stored ID
        if (reciboActual) {
            mostrarReciboGenerado(reciboActual);
            cambiarSeccion('seccionRecibo');
        } else {
            console.error("No se pudo encontrar el recibo con número:", this.dataset.numeroRecibo);
            alert("Error al cargar el recibo seleccionado.");
        }
    });
    return elementoRecibo;
}


// --- Form Logic ---

// Pre-fill form based on last receipt for selected property
function cargarUltimoArrendatarioYMonto() {
    const codigoPropiedad = seleccionPropiedad.value;
    if (!codigoPropiedad) {
        limpiarCamposDependientes();
        return;
    }

    // Find receipts for this property, sorted newest first
    const recibosPropiedad = recibos
        .filter(r => r.codigoPropiedad === codigoPropiedad)
        .sort((a, b) => new Date(b.fechaPago) - new Date(a.fechaPago)); // Sort by payment date

    if (recibosPropiedad.length > 0) {
        const ultimoRecibo = recibosPropiedad[0];

        // Find arrendatario by ID if available, otherwise by name
        const arrendatario = ultimoRecibo.arrendatarioId
                           ? arrendatarios.find(a => a.id === ultimoRecibo.arrendatarioId)
                           : arrendatarios.find(a => a.nombre === ultimoRecibo.nombreArrendatario);

        if (arrendatario) {
            seleccionArrendatario.value = arrendatario.id;
        } else {
             seleccionArrendatario.value = ''; // Reset if tenant not found
        }

        montoInput.value = ultimoRecibo.montoPagado;

        // Calculate next period dates
        if (ultimoRecibo.periodoFin) {
            try {
                const fechaFinAnterior = new Date(ultimoRecibo.periodoFin);
                 // Adjust for timezone when creating Date from string
                fechaFinAnterior.setMinutes(fechaFinAnterior.getMinutes() + fechaFinAnterior.getTimezoneOffset());

                const nuevaFechaInicio = new Date(fechaFinAnterior);
                nuevaFechaInicio.setDate(fechaFinAnterior.getDate() + 1);

                const nuevaFechaFin = new Date(nuevaFechaInicio);
                // Calculate end date preserving the day of the month logic if possible
                // Add a month first
                nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 1);
                 // If the resulting day rolled over (e.g., Jan 31 -> Mar 3), set day back
                if (nuevaFechaFin.getDate() < nuevaFechaInicio.getDate()){
                    // Set day to 0 of current month gets last day of *previous* month
                     nuevaFechaFin.setDate(0);
                } else {
                    // Normal case, just go back one day from the start day next month
                     nuevaFechaFin.setDate(nuevaFechaInicio.getDate() -1);
                }


                fechaInicioInput.value = nuevaFechaInicio.toISOString().split('T')[0];
                fechaFinInput.value = nuevaFechaFin.toISOString().split('T')[0];
            } catch (e) {
                 console.error("Error calculating next period dates:", e);
                 fechaInicioInput.value = '';
                 fechaFinInput.value = '';
            }

        } else {
             fechaInicioInput.value = '';
             fechaFinInput.value = '';
        }

    } else {
        limpiarCamposDependientes();
    }
}

function limpiarCamposDependientes() {
    seleccionArrendatario.value = '';
    montoInput.value = '';
    fechaInicioInput.value = '';
    fechaFinInput.value = '';
    // Keep formaPago, fechaPago, horaPago as they might be manually entered
}

function limpiarFormularioCompleto() {
     formularioRecibo.reset();
     limpiarCamposDependientes(); // Ensure dependent fields are also cleared
     reciboActual = null; // Clear current receipt context if form is cleared
}


// IMPROVEMENT: Dynamic year in receipt number based on payment date year
function obtenerSiguienteNumeroRecibo(codigoPropiedad, fechaPagoStr) {
    const año = new Date(fechaPagoStr).getFullYear() || new Date().getFullYear(); // Use payment year or current year

    const recibosPropiedadAño = recibos.filter(r =>
        r.codigoPropiedad === codigoPropiedad && r.numeroRecibo.includes(`${codigoPropiedad}${año}`)
    );

    let ultimoNumero = 0;
    if (recibosPropiedadAño.length > 0) {
        // Find the highest number for that specific year
        recibosPropiedadAño.forEach(r => {
            const match = r.numeroRecibo.match(/\d{3}$/); // Get last 3 digits
            if (match) {
                const num = parseInt(match[0], 10);
                if (num > ultimoNumero) {
                    ultimoNumero = num;
                }
            }
        });
    }

    const nuevoNumero = ultimoNumero + 1;
    return `${codigoPropiedad}${año}${String(nuevoNumero).padStart(3, '0')}`;
}

// Handle Form Submission (Create/Update Receipt)
formularioRecibo.addEventListener('submit', function(e) {
    e.preventDefault();

    // IMPROVEMENT: Form Validation
    const fechaInicio = fechaInicioInput.value;
    const fechaFin = fechaFinInput.value;
    if (fechaInicio && fechaFin && new Date(fechaFin) < new Date(fechaInicio)) {
        alert('La fecha de fin del periodo no puede ser anterior a la fecha de inicio.');
        fechaFinInput.focus();
        return; // Stop submission
    }

    const codigoPropiedad = seleccionPropiedad.value;
    const arrendatarioId = parseInt(seleccionArrendatario.value);

    const propiedad = propiedades.find(p => p.codigo === codigoPropiedad);
    const arrendatario = arrendatarios.find(a => a.id === arrendatarioId);

    if (!propiedad || !arrendatario) {
        alert("Por favor, seleccione una propiedad y un arrendatario válidos.");
        return;
    }

    const monto = montoInput.value;
    const montoEnLetras = numeroALetras(parseInt(monto)) + ' pesos M/CTE';
    const formaPago = formaPagoSelect.value;
    const fechaPago = fechaPagoInput.value;
    const horaPago = horaPagoInput.value;
    // fechaInicio and fechaFin already defined

    const fechaExpedicionObj = new Date(); // Use current date/time for expedition
    const fechaExpedicionFormateada = formatearFecha(fechaExpedicionObj);

    // Determine if editing or creating new
    const esEdicion = !!reciboActual;
    const numeroRecibo = esEdicion ? reciboActual.numeroRecibo : obtenerSiguienteNumeroRecibo(propiedad.codigo, fechaPago);

    const recibo = {
        // Identifiers
        numeroRecibo: numeroRecibo,
        codigoPropiedad: propiedad.codigo, // Store property code
        arrendatarioId: arrendatario.id, // Store tenant ID

        // Receipt Details
        lugarExpedicion: "Bogotá D.C.", // Or make this configurable
        fechaExpedicion: fechaExpedicionObj.toISOString(), // Store ISO for consistency, format on display
        nombreArrendatario: arrendatario.nombre,
        documentoArrendatario: arrendatario.documento,
        telefonoArrendatario: arrendatario.telefono,
        emailArrendatario: arrendatario.email,
        montoPagado: monto,
        montoEnLetras: montoEnLetras.toUpperCase(), // Conventionally uppercase
        formaPago: formaPago,
        fechaPago: fechaPago,
        horaPago: horaPago,
        concepto: "Canon de arrendamiento", // Or make configurable
        direccionInmueble: propiedad.direccion,
        parteArrendada: propiedad.parteArrendada,
        periodoInicio: fechaInicio,
        periodoFin: fechaFin,

        // Receiver Details
        nombreQuienRecibe: "Manuel Antonio Arias Guerra", // Hardcoded for now
        cedulaQuienRecibe: "1.057.736.060" // Hardcoded for now
    };

    if (esEdicion) {
        // Update existing receipt
        const index = recibos.findIndex(r => r.numeroRecibo === reciboActual.numeroRecibo);
        if (index > -1) {
            recibos[index] = recibo;
            alert('Recibo actualizado con éxito.'); // IMPROVEMENT: Visual Feedback
        } else {
             console.error("Error: No se encontró el recibo para actualizar.");
             alert("Error al actualizar el recibo.");
             return; // Stop if index not found
        }
    } else {
        // Add new receipt
        recibos.push(recibo);
        alert('Recibo generado con éxito.'); // IMPROVEMENT: Visual Feedback
    }

    reciboActual = recibo; // Set the newly created/updated receipt as current
    mostrarReciboGenerado(recibo);
    guardarRecibos();
    cargarRecibos(filtroPropiedadInput.value, filtroArrendatarioInput.value); // Reload history with current filters
    cambiarSeccion('seccionRecibo');
});

// --- Display Receipt ---

function mostrarReciboGenerado(recibo) {
    if (recibo) {
        reciboGeneradoDiv.innerHTML = generarHTMLRecibo(recibo);
        reciboGeneradoDiv.style.display = 'block';
        reciboPlaceholder.style.display = 'none';
        // Enable buttons that depend on a receipt being selected
        botonImprimir.disabled = false;
        botonEditar.disabled = false;
        botonEliminar.disabled = false;
    } else {
        reciboGeneradoDiv.innerHTML = '';
        reciboGeneradoDiv.style.display = 'none';
        reciboPlaceholder.style.display = 'block';
         // Disable buttons
        botonImprimir.disabled = true;
        botonEditar.disabled = true;
        botonEliminar.disabled = true;
    }
}

// Generar HTML para el recibo (minor formatting adjustments)
function generarHTMLRecibo(recibo) {
     const montoFormateado = recibo.montoPagado ? parseInt(recibo.montoPagado).toLocaleString('es-CO') : 'N/A';
     const fechaExpedicionFormateada = formatearFecha(recibo.fechaExpedicion); // Format ISO date
     const fechaPagoFormateada = formatearFecha(recibo.fechaPago);
     const periodoInicioFormateado = formatearFecha(recibo.periodoInicio);
     const periodoFinFormateado = formatearFecha(recibo.periodoFin);

    return `
        <div class="recibo-contenedor">
            <div class="recibo-header">
                <div>
                    <h2>Recibo de Arrendamiento</h2>
                    <p class="recibo-numero">No. ${recibo.numeroRecibo}</p>
                </div>
                <div>
                    <p><strong>Lugar y Fecha de Expedición:</strong><br>${recibo.lugarExpedicion},<br>${fechaExpedicionFormateada}</p>
                </div>
            </div>
            <div class="recibo-body">
                <div>
                    <p><strong>Recibí de:</strong> ${recibo.nombreArrendatario || 'N/A'}</p>
                    <p><strong>C.C./NIT:</strong> ${recibo.documentoArrendatario || 'N/A'}</p>
                    <p><strong>La suma de:</strong> $${montoFormateado}<br>
                    (${recibo.montoEnLetras || 'N/A'})</p>
                    <p><strong>Forma de pago:</strong> ${recibo.formaPago || 'N/A'}<br>
                    <strong>Fecha y hora del pago:</strong> ${fechaPagoFormateada}, ${recibo.horaPago || 'N/A'}</p>
                    <p style="text-align: justify;"><strong>Por concepto de:</strong> ${recibo.concepto || 'N/A'} del inmueble ubicado en ${recibo.direccionInmueble || 'N/A'}, correspondiente al periodo del ${periodoInicioFormateado} al ${periodoFinFormateado}.</p>
                    <p><strong>Descripción del inmueble arrendado:</strong> ${recibo.parteArrendada || 'N/A'}</p>
                </div>
                <div>
                    <p><strong>Observaciones:</strong></p>
                    <ul>
                        <li>Este recibo no implica novación de la deuda pendiente, si la hubiere.</li>
                        <li>El arrendatario declara estar al día en el pago de servicios públicos y cuotas de administración (si aplica) a la fecha de este recibo.</li>
                        <li>Este recibo es válido únicamente por el valor y periodo aquí expresados y no sustituye el contrato de arrendamiento vigente.</li>
                    </ul>
                </div>
            </div>
            <div class="recibo-footer">
                <div class="firma">
                    <p><strong>Recibido por:</strong></p>
                    <br><br>
                    <p>_________________________<br>
                    ${recibo.nombreQuienRecibe || 'N/A'}<br>
                    C.C. ${recibo.cedulaQuienRecibe || 'N/A'}</p>
                </div>
            </div>
        </div>
    `;
}

// --- Receipt Actions ---

function cargarDatosParaEdicion(recibo) {
    seleccionPropiedad.value = recibo.codigoPropiedad || '';
    seleccionArrendatario.value = recibo.arrendatarioId || ''; // Use ID
    montoInput.value = recibo.montoPagado || '';
    formaPagoSelect.value = recibo.formaPago || 'Consignación bancaria';
    fechaPagoInput.value = recibo.fechaPago || '';
    horaPagoInput.value = recibo.horaPago || '';
    fechaInicioInput.value = recibo.periodoInicio || '';
    fechaFinInput.value = recibo.periodoFin || '';
}

botonImprimir.addEventListener('click', function() {
    if (reciboActual) {
         window.print();
    } else {
        alert("No hay recibo para imprimir.");
    }
});

botonEditar.addEventListener('click', function() {
    if (reciboActual) {
        cargarDatosParaEdicion(reciboActual);
        cambiarSeccion('seccionFormulario');
    } else {
         alert("No hay recibo seleccionado para editar.");
    }
});

botonEliminar.addEventListener('click', function() {
    if (reciboActual && confirm(`¿Está seguro de que desea eliminar el recibo N° ${reciboActual.numeroRecibo}? Esta acción no se puede deshacer.`)) {
        const index = recibos.findIndex(r => r.numeroRecibo === reciboActual.numeroRecibo);
        if (index > -1) {
            recibos.splice(index, 1);
            guardarRecibos();
            cargarRecibos(filtroPropiedadInput.value, filtroArrendatarioInput.value); // Reload history with filters
            alert(`Recibo N° ${reciboActual.numeroRecibo} eliminado.`); // Feedback
            reciboActual = null;
            mostrarReciboGenerado(null); // Clear receipt view
            cambiarSeccion('seccionHistorial'); // Go to history after delete
        } else {
             alert("Error: No se encontró el recibo para eliminar.");
        }
    } else if (!reciboActual) {
        alert("No hay recibo seleccionado para eliminar.");
    }
});

botonNuevoRecibo.addEventListener('click', function() {
    reciboActual = null;
    limpiarFormularioCompleto();
    mostrarReciboGenerado(null); // Clear receipt view
    cambiarSeccion('seccionFormulario');
});

botonLimpiarFormulario.addEventListener('click', limpiarFormularioCompleto);


// --- History Actions (Export/Import/Filter) ---

botonExportar.addEventListener('click', function() {
    if (recibos.length === 0) {
        alert("No hay recibos para exportar.");
        return;
    }
    const datosJSON = JSON.stringify(recibos, null, 2); // Pretty print JSON
    const blob = new Blob([datosJSON], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const enlace = document.createElement('a');
    enlace.href = url;
    // Generate filename with date
    const fechaActual = new Date().toISOString().split('T')[0];
    enlace.download = `recibos_alquiler_${fechaActual}.json`;
    document.body.appendChild(enlace);
    enlace.click();

    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
    alert(`${recibos.length} recibos exportados.`);
});

// IMPROVEMENT: Import Functionality
importarArchivoInput.addEventListener('change', function(event) {
    const archivo = event.target.files[0];
    if (!archivo) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const contenido = e.target.result;
            const recibosImportados = JSON.parse(contenido);

            if (!Array.isArray(recibosImportados)) {
                throw new Error("El archivo no contiene un array de recibos válido.");
            }

            // Basic validation of imported structure (check for key fields)
             const primerRecibo = recibosImportados[0];
             if (!primerRecibo || typeof primerRecibo.numeroRecibo === 'undefined' || typeof primerRecibo.fechaPago === 'undefined') {
                 throw new Error("El formato de los recibos importados parece incorrecto.");
             }


            // Merge strategy: Add new, update existing (based on numeroRecibo)
             let importadosNuevos = 0;
             let actualizados = 0;

             recibosImportados.forEach(reciboImp => {
                 const indexExistente = recibos.findIndex(r => r.numeroRecibo === reciboImp.numeroRecibo);
                 if (indexExistente > -1) {
                     // Update existing
                     recibos[indexExistente] = reciboImp;
                     actualizados++;
                 } else {
                     // Add new
                     recibos.push(reciboImp);
                     importadosNuevos++;
                 }
             });


            verificarIntegridadDatos(); // Verify all data after import
            guardarRecibos(); // Save merged data
            cargarRecibos(); // Reload history (clear filters)
            filtroPropiedadInput.value = ''; // Clear filter inputs
            filtroArrendatarioInput.value = '';
            alert(`Importación completada: ${importadosNuevos} recibos nuevos añadidos, ${actualizados} recibos actualizados.`);
            cambiarSeccion('seccionHistorial'); // Show history

        } catch (error) {
            console.error("Error al importar archivo:", error);
            alert(`Error al importar el archivo: ${error.message}`);
        } finally {
            // Reset file input to allow importing the same file again if needed
            importarArchivoInput.value = null;
        }
    };

     reader.onerror = function(e) {
         console.error("Error al leer el archivo:", e);
         alert("Error al leer el archivo seleccionado.");
         importarArchivoInput.value = null;
     };

    reader.readAsText(archivo);
});

// IMPROVEMENT: Add event listeners for filter inputs
filtroPropiedadInput.addEventListener('input', () => {
    cargarRecibos(filtroPropiedadInput.value, filtroArrendatarioInput.value);
});
filtroArrendatarioInput.addEventListener('input', () => {
    cargarRecibos(filtroPropiedadInput.value, filtroArrendatarioInput.value);
});


// --- Navigation ---

function cambiarSeccion(seccionId) {
    // Hide all sections
    seccionFormulario.style.display = 'none';
    seccionRecibo.style.display = 'none';
    seccionHistorial.style.display = 'none';

    // Remove active class from all nav links
    document.querySelectorAll('#mainNav .nav-link').forEach(link => link.classList.remove('active'));

    // Show the target section
    const seccionActiva = document.getElementById(seccionId);
    if (seccionActiva) {
        seccionActiva.style.display = 'block';
        // Add active class to corresponding nav link
        const linkActivo = document.getElementById(`nav${seccionId.replace('seccion', '')}`);
        if (linkActivo) {
            linkActivo.classList.add('active');
        }
    }

    // Special handling for receipt view placeholder
    if (seccionId === 'seccionRecibo') {
         mostrarReciboGenerado(reciboActual); // Show current receipt or placeholder
    }
}

// Setup navigation and other initial event listeners in one place
function setupEventListeners() {
    navFormulario.addEventListener('click', (e) => { e.preventDefault(); cambiarSeccion('seccionFormulario'); });
    navHistorial.addEventListener('click', (e) => { e.preventDefault(); cargarRecibos(filtroPropiedadInput.value, filtroArrendatarioInput.value); cambiarSeccion('seccionHistorial'); }); // Reload history on nav click
    navRecibo.addEventListener('click', (e) => {
        e.preventDefault();
        // Allow navigating to receipt section even if empty, it will show placeholder
        cambiarSeccion('seccionRecibo');
    });

    // Listener for property selection change
    seleccionPropiedad.addEventListener('change', cargarUltimoArrendatarioYMonto);
}


// --- Initialization ---

// Inicializar la aplicación
async function inicializarApp() {
    console.log('Inicializando aplicación...');
    await cargarDatos(); // Wait for data loading to complete
    cambiarSeccion('seccionFormulario'); // Start on the form section
    mostrarReciboGenerado(null); // Ensure receipt view starts empty/with placeholder
    console.log('Aplicación inicializada.');
}

// Load data when the window loads
window.addEventListener('load', inicializarApp);