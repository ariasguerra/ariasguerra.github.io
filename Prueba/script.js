// Variables globales
let propiedades = [];
let arrendatarios = [];
let recibos = [];
let reciboActual = null;

// Función mejorada para convertir números a palabras en español
function numeroALetras(numero) {
    if (isNaN(numero) || numero < 0 || numero > 999999999) {
        return "número fuera de rango";
    }
    
    if (numero === 0) return 'cero';
    
    const unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const especiales = ['', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
    
    if (numero < 10) return unidades[numero];
    
    if (numero < 20) return especiales[numero - 10];
    
    if (numero < 30) {
        if (numero === 20) return 'veinte';
        return 'veinti' + unidades[numero - 20];
    }
    
    if (numero < 100) {
        const unidad = numero % 10;
        const decena = Math.floor(numero / 10);
        return unidad === 0 ? decenas[decena] : decenas[decena] + ' y ' + unidades[unidad];
    }
    
    if (numero === 100) return 'cien';
    
    if (numero < 1000) {
        const centena = Math.floor(numero / 100);
        const resto = numero % 100;
        return centenas[centena] + (resto ? ' ' + numeroALetras(resto) : '');
    }
    
    if (numero < 1000000) {
        const miles = Math.floor(numero / 1000);
        const resto = numero % 1000;
        return (miles === 1 ? 'mil' : numeroALetras(miles) + ' mil') + (resto ? ' ' + numeroALetras(resto) : '');
    }
    
    const millones = Math.floor(numero / 1000000);
    const resto = numero % 1000000;
    return (millones === 1 ? 'un millón' : numeroALetras(millones) + ' millones') + (resto ? ' ' + numeroALetras(resto) : '');
}

// Función mejorada para formatear fechas
function formatearFecha(fecha) {
    if (!fecha) return "";
    
    try {
        // Crear una nueva instancia de Date
        const fechaObj = new Date(fecha);
        
        // Verificar si la fecha es válida
        if (isNaN(fechaObj.getTime())) {
            console.error('Fecha inválida:', fecha);
            return "Fecha inválida";
        }
        
        // Usar Intl.DateTimeFormat para formatear la fecha
        return new Intl.DateTimeFormat('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(fechaObj);
    } catch (error) {
        console.error('Error al formatear fecha:', error);
        return "Error de fecha";
    }
}
// Función para cargar datos desde localStorage o desde archivos JSON
function cargarDatos() {
    console.log('Iniciando carga de datos...');
    propiedades = JSON.parse(localStorage.getItem('propiedades')) || [];
    arrendatarios = JSON.parse(localStorage.getItem('arrendatarios')) || [];
    recibos = JSON.parse(localStorage.getItem('recibos')) || [];

    const promesas = [];

    if (propiedades.length === 0) {
        promesas.push(
            fetch('propiedades.json')
                .then(response => response.json())
                .then(data => {
                    propiedades = data;
                    localStorage.setItem('propiedades', JSON.stringify(propiedades));
                    console.log('Propiedades cargadas:', propiedades);
                })
                .catch(error => console.error('Error al cargar propiedades:', error))
        );
    }

    if (arrendatarios.length === 0) {
        promesas.push(
            fetch('arrendatarios.json')
                .then(response => response.json())
                .then(data => {
                    arrendatarios = data;
                    localStorage.setItem('arrendatarios', JSON.stringify(arrendatarios));
                    console.log('Arrendatarios cargados:', arrendatarios);
                })
                .catch(error => console.error('Error al cargar arrendatarios:', error))
        );
    }

    if (recibos.length === 0) {
        promesas.push(
            fetch('recibos.json')
                .then(response => response.json())
                .then(data => {
                    recibos = data;
                    localStorage.setItem('recibos', JSON.stringify(recibos));
                    console.log('Recibos cargados:', recibos);
                })
                .catch(error => console.error('Error al cargar recibos:', error))
        );
    }

    Promise.all(promesas).then(() => {
        console.log('Todos los datos cargados. Iniciando carga de UI...');
        verificarIntegridadDatos();
        cargarPropiedades();
        cargarArrendatarios();
        cargarRecibos();
        // Inicializar los componentes de estadísticas y filtros solo después de cargar datos
        setTimeout(() => {
            inicializarEstadisticas();
            inicializarFiltroBusqueda();
        }, 100);
    }).catch(error => console.error('Error durante la carga de datos:', error));
}

function verificarIntegridadDatos() {
    recibos.forEach(recibo => {
        if (!recibo.direccionInmueble) {
            const propiedad = propiedades.find(p => p.codigo === recibo.numeroRecibo.substring(0, 4));
            if (propiedad) {
                recibo.direccionInmueble = propiedad.direccion;
                console.log(`Corregida dirección para recibo ${recibo.numeroRecibo}`);
            } else {
                console.error(`No se pudo encontrar la dirección para el recibo ${recibo.numeroRecibo}`);
            }
        }
    });
    guardarRecibos();
}

function cargarPropiedades() {
    const select = document.getElementById('seleccionPropiedad');
    select.innerHTML = '<option value="">Seleccione una propiedad</option>';
    propiedades.forEach(propiedad => {
        const option = document.createElement('option');
        option.value = propiedad.codigo;
        option.textContent = propiedad.direccion;
        select.appendChild(option);
    });
    
    // Añadir evento para cargar arrendatario y monto automáticamente
    select.addEventListener('change', cargarUltimoArrendatarioYMonto);
}

function cargarArrendatarios() {
    const select = document.getElementById('seleccionArrendatario');
    select.innerHTML = '<option value="">Seleccione un arrendatario</option>';
    arrendatarios.forEach(arrendatario => {
        const option = document.createElement('option');
        option.value = arrendatario.id;
        option.textContent = arrendatario.nombre;
        select.appendChild(option);
    });
}
// Función mejorada para cargar recibos con filtrado y búsqueda
function cargarRecibos(filtros = {}) {
    const listaRecibos = document.getElementById('listaRecibos');
    listaRecibos.innerHTML = '';

    // Aplicar filtros si existen
    let recibosFiltrados = [...recibos];
    
    if (filtros.propiedad) {
        recibosFiltrados = recibosFiltrados.filter(r => 
            r.direccionInmueble && r.direccionInmueble.includes(filtros.propiedad)
        );
    }
    
    if (filtros.arrendatario) {
        recibosFiltrados = recibosFiltrados.filter(r => 
            r.nombreArrendatario && r.nombreArrendatario.toLowerCase().includes(filtros.arrendatario.toLowerCase())
        );
    }
    
    if (filtros.fechaDesde) {
        const fechaDesde = new Date(filtros.fechaDesde);
        recibosFiltrados = recibosFiltrados.filter(r => new Date(r.fechaPago) >= fechaDesde);
    }
    
    if (filtros.fechaHasta) {
        const fechaHasta = new Date(filtros.fechaHasta);
        fechaHasta.setHours(23, 59, 59); // Final del día
        recibosFiltrados = recibosFiltrados.filter(r => new Date(r.fechaPago) <= fechaHasta);
    }
    
    if (filtros.montoMinimo) {
        recibosFiltrados = recibosFiltrados.filter(r => parseInt(r.montoPagado) >= parseInt(filtros.montoMinimo));
    }
    
    if (filtros.montoMaximo) {
        recibosFiltrados = recibosFiltrados.filter(r => parseInt(r.montoPagado) <= parseInt(filtros.montoMaximo));
    }
    
    if (filtros.busqueda) {
        const terminoBusqueda = filtros.busqueda.toLowerCase();
        recibosFiltrados = recibosFiltrados.filter(r => 
            (r.numeroRecibo && r.numeroRecibo.toLowerCase().includes(terminoBusqueda)) ||
            (r.nombreArrendatario && r.nombreArrendatario.toLowerCase().includes(terminoBusqueda)) ||
            (r.direccionInmueble && r.direccionInmueble.toLowerCase().includes(terminoBusqueda))
        );
    }

    if (recibosFiltrados.length === 0) {
        listaRecibos.innerHTML = '<p class="mensaje-vacio">No hay recibos que coincidan con los criterios de búsqueda.</p>';
        return;
    }

    // Agrupar recibos por dirección de inmueble
    const recibosPorInmueble = recibosFiltrados.reduce((acc, recibo) => {
        const direccion = recibo.direccionInmueble;
        if (!acc[direccion]) {
            acc[direccion] = [];
        }
        acc[direccion].push(recibo);
        return acc;
    }, {});

    // Mostrar el último recibo por inmueble
    Object.keys(recibosPorInmueble).forEach(direccion => {
        const propiedadRecibos = recibosPorInmueble[direccion];
        propiedadRecibos.sort((a, b) => new Date(b.fechaPago) - new Date(a.fechaPago));

        const seccionInmueble = document.createElement('div');
        seccionInmueble.classList.add('seccion-inmueble');
        seccionInmueble.innerHTML = `<h3>${direccion}</h3>`;

        // Mostrar el último recibo
        const ultimoRecibo = propiedadRecibos[0];
        const elementoRecibo = crearElementoRecibo(ultimoRecibo);
        seccionInmueble.appendChild(elementoRecibo);

        // Agregar botón "Ver más" si hay más de un recibo
        if (propiedadRecibos.length > 1) {
            const botonVerMas = document.createElement('button');
            botonVerMas.textContent = 'Ver más';
            botonVerMas.classList.add('boton-ver-mas');
            botonVerMas.addEventListener('click', () => mostrarTodosLosRecibos(direccion, propiedadRecibos, seccionInmueble));
            seccionInmueble.appendChild(botonVerMas);
        }

        listaRecibos.appendChild(seccionInmueble);
    });
}

function mostrarTodosLosRecibos(direccion, propiedadRecibos, seccionInmueble) {
    // Eliminar los recibos existentes y el botón "Ver más"
    while (seccionInmueble.children.length > 1) {
        seccionInmueble.removeChild(seccionInmueble.lastChild);
    }

    // Mostrar todos los recibos
    propiedadRecibos.forEach(recibo => {
        const elementoRecibo = crearElementoRecibo(recibo);
        seccionInmueble.appendChild(elementoRecibo);
    });

    // Agregar un botón "Ver menos"
    const botonVerMenos = document.createElement('button');
    botonVerMenos.textContent = 'Ver menos';
    botonVerMenos.classList.add('boton-ver-menos');
    botonVerMenos.addEventListener('click', () => cargarRecibos());
    seccionInmueble.appendChild(botonVerMenos);
}

function crearElementoRecibo(recibo) {
    const elementoRecibo = document.createElement('div');
    elementoRecibo.classList.add('recibo');
    elementoRecibo.innerHTML = `
        <div class="recibo-info">
            <div class="recibo-header-small">
                <span class="recibo-numero-small"><i class="fas fa-receipt"></i> ${recibo.numeroRecibo}</span>
                <span class="recibo-fecha"><i class="far fa-calendar-alt"></i> ${formatearFecha(recibo.fechaPago)}</span>
            </div>
            <div class="recibo-datos">
                <p><i class="fas fa-user"></i> <strong>Arrendatario:</strong> ${recibo.nombreArrendatario}</p>
                <p><i class="fas fa-dollar-sign"></i> <strong>Monto:</strong> $${parseInt(recibo.montoPagado).toLocaleString('es-CO')}</p>
                <p><i class="fas fa-calendar-week"></i> <strong>Período:</strong> ${formatearFecha(recibo.periodoInicio)} - ${formatearFecha(recibo.periodoFin)}</p>
                <p><i class="fas fa-money-check-alt"></i> <strong>Forma de pago:</strong> ${recibo.formaPago}</p>
            </div>
        </div>
    `;
    elementoRecibo.addEventListener('click', function() {
        reciboActual = recibo;
        mostrarReciboGenerado(recibo);
        cambiarSeccion('seccionRecibo');
    });
    return elementoRecibo;
}

function cargarUltimoArrendatarioYMonto() {
    const codigoPropiedad = document.getElementById('seleccionPropiedad').value;
    
    // Filtrar recibos por la propiedad seleccionada
    const recibosPropiedad = recibos.filter(r => r.numeroRecibo.startsWith(codigoPropiedad));
    
    if (recibosPropiedad.length > 0) {
        // Obtener el último recibo de la propiedad
        const ultimoRecibo = recibosPropiedad.sort((a, b) => new Date(b.fechaPago) - new Date(a.fechaPago))[0];
        
        // Cargar datos del último arrendatario
        const arrendatario = arrendatarios.find(a => a.nombre === ultimoRecibo.nombreArrendatario);
        if (arrendatario) {
            document.getElementById('seleccionArrendatario').value = arrendatario.id;
        }
        
        // Cargar el monto del último recibo
        document.getElementById('monto').value = ultimoRecibo.montoPagado;
        
        // Calcular la nueva fecha de inicio (1 día después de la fecha de fin del último recibo)
        const fechaFinAnterior = new Date(ultimoRecibo.periodoFin);
        const nuevaFechaInicio = new Date(fechaFinAnterior);
        nuevaFechaInicio.setDate(fechaFinAnterior.getDate() + 1);
        
        // Calcular la nueva fecha de fin
        const nuevaFechaFin = new Date(nuevaFechaInicio);
        nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 1);
        nuevaFechaFin.setDate(nuevaFechaFin.getDate() - 1);
        
        // Establecer las nuevas fechas en el formulario
        document.getElementById('fechaInicio').value = nuevaFechaInicio.toISOString().split('T')[0];
        document.getElementById('fechaFin').value = nuevaFechaFin.toISOString().split('T')[0];
    } else {
        // No hay recibos previos para esta propiedad
        document.getElementById('seleccionArrendatario').value = '';
        document.getElementById('monto').value = '';
        document.getElementById('fechaInicio').value = '';
        document.getElementById('fechaFin').value = '';
    }
}

function obtenerSiguienteNumeroRecibo(codigoPropiedad) {
    const recibosPropiedad = recibos.filter(r => r.numeroRecibo.startsWith(codigoPropiedad));
    if (recibosPropiedad.length > 0) {
        // Ordenar recibos por número y obtener el último
        recibosPropiedad.sort((a, b) => {
            const numA = parseInt(a.numeroRecibo.slice(-3));
            const numB = parseInt(b.numeroRecibo.slice(-3));
            return numB - numA;
        });
        
        const ultimoRecibo = recibosPropiedad[0];
        const ultimoNumero = parseInt(ultimoRecibo.numeroRecibo.slice(-3));
        return `${codigoPropiedad}2025${String(ultimoNumero + 1).padStart(3, '0')}`;
    } else {
        return `${codigoPropiedad}2025001`;
    }
}

function mostrarReciboGenerado(recibo) {
    const reciboGenerado = document.getElementById('reciboGenerado');
    reciboGenerado.innerHTML = generarHTMLRecibo(recibo);
}

function generarHTMLRecibo(recibo) {
    return `
        <div class="recibo-contenedor">
            <div class="recibo-header">
                <div>
                    <h2>Recibo de Arrendamiento</h2>
                    <p class="recibo-numero">No. ${recibo.numeroRecibo}</p>
                </div>
                <div>
                    <p><strong>Lugar y Fecha:</strong><br>${recibo.lugarExpedicion},<br>${recibo.fechaExpedicion}</p>
                </div>
            </div>
            <div class="recibo-body">
                <div>
                    <p><strong>Recibí de:</strong> ${recibo.nombreArrendatario}</p>
                    <p><strong>Identificación:</strong> ${recibo.documentoArrendatario}</p>
                    <p><strong>La suma de:</strong> $${parseInt(recibo.montoPagado).toLocaleString('es-CO')}<br>
                    <strong>En letras:</strong> ${recibo.montoEnLetras}</p>
                    <p><strong>Forma de pago:</strong> ${recibo.formaPago}<br>
                    <strong>Fecha y hora del pago:</strong> ${formatearFecha(recibo.fechaPago)}, ${recibo.horaPago}</p>
                    <p style="text-align: justify;"><strong>Por concepto de:</strong> Canon de arrendamiento del inmueble ubicado en ${recibo.direccionInmueble}, correspondiente al periodo del ${formatearFecha(recibo.periodoInicio)} al ${formatearFecha(recibo.periodoFin)}.</p>
                    <p><strong>Descripción del inmueble arrendado:</strong> ${recibo.parteArrendada}</p>
                </div>
                <div>
                    <p><strong>Observaciones:</strong></p>
                    <ul>
                        <li>Este recibo no implica novación de la deuda.</li>
                        <li>El arrendatario declara estar al día en el pago de servicios públicos y cuotas de administración (si aplica).</li>
                        <li>Este recibo no sustituye el contrato de arrendamiento vigente entre las partes.</li>
                    </ul>
                </div>
            </div>
            <div class="recibo-footer">
                <div class="firma" style="text-align: left;">
                    <p><strong>Nombre y firma de quien recibe:</strong></p>
                    <br><br>
                    <p>Original firmado<br>${recibo.nombreQuienRecibe}<br>
                    Número de cédula de ciudadanía: ${recibo.cedulaQuienRecibe}</p>
                </div>
            </div>
        </div>
    `;
}

function cargarDatosParaEdicion(recibo) {
    document.getElementById('seleccionPropiedad').value = recibo.numeroRecibo.substring(0, 4);
    
    // Verificar si se encuentra el arrendatario antes de asignar el valor
    const arrendatario = arrendatarios.find(a => a.nombre === recibo.nombreArrendatario);
    if (arrendatario) {
        document.getElementById('seleccionArrendatario').value = arrendatario.id;
    } else {
        document.getElementById('seleccionArrendatario').value = '';
        console.error('No se encontró el arrendatario:', recibo.nombreArrendatario);
    }
    
    document.getElementById('monto').value = recibo.montoPagado;
    document.getElementById('formaPago').value = recibo.formaPago;
    document.getElementById('fechaPago').value = recibo.fechaPago;
    document.getElementById('horaPago').value = recibo.horaPago;
    document.getElementById('fechaInicio').value = recibo.periodoInicio;
    document.getElementById('fechaFin').value = recibo.periodoFin;
}

function guardarRecibos() {
    localStorage.setItem('recibos', JSON.stringify(recibos));
}
// Eventos del formulario de recibo
document.getElementById('formularioRecibo').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const codigoPropiedad = document.getElementById('seleccionPropiedad').value;
    const propiedad = propiedades.find(p => p.codigo === codigoPropiedad);
    
    if (!propiedad) {
        alert('Por favor, seleccione una propiedad válida.');
        return;
    }
    
    const arrendatarioId = document.getElementById('seleccionArrendatario').value;
    const arrendatario = arrendatarios.find(a => a.id === parseInt(arrendatarioId));
    
    if (!arrendatario) {
        alert('Por favor, seleccione un arrendatario válido.');
        return;
    }
    
    const monto = document.getElementById('monto').value;
    const montoEnLetras = numeroALetras(parseInt(monto)) + ' pesos M/CTE';
    const formaPago = document.getElementById('formaPago').value;
    const fechaPago = document.getElementById('fechaPago').value;
    const horaPago = document.getElementById('horaPago').value;
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;

    const fechaActual = new Date();
    const fechaExpedicion = formatearFecha(fechaActual);
    const numeroRecibo = reciboActual ? reciboActual.numeroRecibo : obtenerSiguienteNumeroRecibo(codigoPropiedad);

    const recibo = {
        numeroRecibo: numeroRecibo,
        lugarExpedicion: "Bogotá D.C.",
        fechaExpedicion: fechaExpedicion,
        nombreArrendatario: arrendatario.nombre,
        documentoArrendatario: arrendatario.documento,
        telefonoArrendatario: arrendatario.telefono,
        emailArrendatario: arrendatario.email || "Por Establecer",
        montoPagado: monto,
        montoEnLetras: montoEnLetras,
        formaPago: formaPago,
        fechaPago: fechaPago,
        horaPago: horaPago,
        concepto: "Canon de arrendamiento",
        direccionInmueble: propiedad.direccion,
        parteArrendada: propiedad.parteArrendada,
        periodoInicio: fechaInicio,
        periodoFin: fechaFin,
        nombreQuienRecibe: "Manuel Antonio Arias Guerra",
        cedulaQuienRecibe: "1.057.736.060"
    };

    // Solicitar confirmación antes de guardar
    const esNuevo = !reciboActual;
    const mensaje = esNuevo 
        ? `¿Está seguro de crear un nuevo recibo por ${montoEnLetras}?` 
        : `¿Está seguro de modificar este recibo? Los datos anteriores se perderán.`;
    
    if (confirm(mensaje)) {
        if (reciboActual) {
            // Estamos editando un recibo existente
            const index = recibos.findIndex(r => r.numeroRecibo === reciboActual.numeroRecibo);
            if (index > -1) {
                recibos[index] = recibo;
            }
        } else {
            // Estamos creando un nuevo recibo
            recibos.push(recibo);
        }

        reciboActual = recibo;
        mostrarReciboGenerado(recibo);
        guardarRecibos();
        cargarRecibos();
        actualizarEstadisticas(); // Actualizar estadísticas si están disponibles
        cambiarSeccion('seccionRecibo');
        
        // Mostrar mensaje de éxito
        const mensaje = esNuevo ? 'Recibo creado con éxito' : 'Recibo actualizado con éxito';
        mostrarNotificacion(mensaje, 'success');
    }
});

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion ${tipo}`;
    notificacion.innerHTML = `
        <div class="notificacion-contenido">
            <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            <span>${mensaje}</span>
        </div>
    `;
    
    document.body.appendChild(notificacion);
    
    // Mostrar la notificación con animación
    setTimeout(() => {
        notificacion.classList.add('visible');
    }, 10);
    
    // Ocultar y eliminar después de 3 segundos
    setTimeout(() => {
        notificacion.classList.remove('visible');
        setTimeout(() => {
            document.body.removeChild(notificacion);
        }, 300);
    }, 3000);
}

// Eventos de botones
document.getElementById('botonImprimir').addEventListener('click', function() {
    window.print();
});

document.getElementById('botonEditar').addEventListener('click', function() {
    if (reciboActual) {
        cargarDatosParaEdicion(reciboActual);
        cambiarSeccion('seccionFormulario');
    }
});
// Continuación de los eventos de botones
document.getElementById('botonEliminar').addEventListener('click', function() {
    if (reciboActual && confirm('¿Está seguro de que desea eliminar este recibo? Esta acción no se puede deshacer.')) {
        const index = recibos.findIndex(r => r.numeroRecibo === reciboActual.numeroRecibo);
        if (index > -1) {
            recibos.splice(index, 1);
            guardarRecibos();
            cargarRecibos();
            actualizarEstadisticas(); // Actualizar estadísticas
            reciboActual = null;
            cambiarSeccion('seccionHistorial');
            mostrarNotificacion('Recibo eliminado con éxito', 'success');
        }
    }
});

document.getElementById('botonNuevoRecibo').addEventListener('click', function() {
    reciboActual = null;
    document.getElementById('formularioRecibo').reset();
    cambiarSeccion('seccionFormulario');
});

document.getElementById('botonExportar').addEventListener('click', function() {
    const datosJSON = JSON.stringify(recibos, null, 2);
    const blob = new Blob([datosJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'recibos_alquiler.json';
    document.body.appendChild(enlace);
    enlace.click();
    
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
    
    mostrarNotificacion('Recibos exportados correctamente', 'success');
});
// Función para inicializar los componentes de filtrado y búsqueda
function inicializarFiltroBusqueda() {
    // Solo crear los filtros si estamos en la sección de historial
    if (document.getElementById('seccionHistorial').style.display === 'block') {
        inicializarFiltros();
    }
}

// Función para crear los controles de filtrado
function crearControlesDeFiltrado() {
    const contenedorFiltros = document.createElement('div');
    contenedorFiltros.className = 'filtros-container';
    contenedorFiltros.innerHTML = `
        <div class="filtro-busqueda">
            <input type="text" id="busquedaRecibos" placeholder="Buscar por número, arrendatario o dirección...">
            <button id="botonBuscar"><i class="fas fa-search"></i> Buscar</button>
            <button id="botonLimpiarBusqueda"><i class="fas fa-times"></i> Limpiar</button>
        </div>
        <details>
            <summary>Filtros avanzados</summary>
            <div class="filtros-avanzados">
                <div class="filtro-grupo">
                    <label for="filtroPropiedades">Propiedad:</label>
                    <select id="filtroPropiedades">
                        <option value="">Todas las propiedades</option>
                    </select>
                </div>
                <div class="filtro-grupo">
                    <label for="filtroArrendatarios">Arrendatario:</label>
                    <select id="filtroArrendatarios">
                        <option value="">Todos los arrendatarios</option>
                    </select>
                </div>
                <div class="filtro-grupo">
                    <label for="filtroFechaDesde">Desde:</label>
                    <input type="date" id="filtroFechaDesde">
                </div>
                <div class="filtro-grupo">
                    <label for="filtroFechaHasta">Hasta:</label>
                    <input type="date" id="filtroFechaHasta">
                </div>
                <div class="filtro-grupo">
                    <label for="filtroMontoMinimo">Monto mínimo:</label>
                    <input type="number" id="filtroMontoMinimo" placeholder="Ej: 450000">
                </div>
                <div class="filtro-grupo">
                    <label for="filtroMontoMaximo">Monto máximo:</label>
                    <input type="number" id="filtroMontoMaximo" placeholder="Ej: 800000">
                </div>
                <div class="filtro-botones">
                    <button id="botonAplicarFiltros"><i class="fas fa-filter"></i> Aplicar filtros</button>
                    <button id="botonLimpiarFiltros"><i class="fas fa-broom"></i> Limpiar filtros</button>
                </div>
            </div>
        </details>
    `;
    
    return contenedorFiltros;
}

// Función para inicializar los filtros
function inicializarFiltros() {
    if (!document.getElementById('filtrosHistorial')) {
        // Insertar los controles de filtrado antes de listaRecibos
        const seccionHistorial = document.getElementById('seccionHistorial');
        const listaRecibos = document.getElementById('listaRecibos');
        const contenedorFiltros = crearControlesDeFiltrado();
        contenedorFiltros.id = 'filtrosHistorial';
        seccionHistorial.insertBefore(contenedorFiltros, listaRecibos);
        
        // Cargar opciones de filtros
        const selectPropiedades = document.getElementById('filtroPropiedades');
        const selectArrendatarios = document.getElementById('filtroArrendatarios');
        
        // Verificar que los elementos existan antes de interactuar con ellos
        if (selectPropiedades && propiedades) {
            // Limpiar opciones existentes
            selectPropiedades.innerHTML = '<option value="">Todas las propiedades</option>';
            
            propiedades.forEach(propiedad => {
                const option = document.createElement('option');
                option.value = propiedad.direccion;
                option.textContent = `${propiedad.codigo} - ${propiedad.direccion.substring(0, 30)}${propiedad.direccion.length > 30 ? '...' : ''}`;
                selectPropiedades.appendChild(option);
            });
        }
        
        if (selectArrendatarios && arrendatarios) {
            // Limpiar opciones existentes
            selectArrendatarios.innerHTML = '<option value="">Todos los arrendatarios</option>';
            
            arrendatarios.forEach(arrendatario => {
                const option = document.createElement('option');
                option.value = arrendatario.nombre;
                option.textContent = arrendatario.nombre;
                selectArrendatarios.appendChild(option);
            });
        }
        
        // Configurar eventos de filtrado - verificar que los elementos existan
        const botonBuscar = document.getElementById('botonBuscar');
        const botonLimpiarBusqueda = document.getElementById('botonLimpiarBusqueda');
        const botonAplicarFiltros = document.getElementById('botonAplicarFiltros');
        const botonLimpiarFiltros = document.getElementById('botonLimpiarFiltros');
        const inputBusqueda = document.getElementById('busquedaRecibos');
        
        if (botonBuscar) botonBuscar.addEventListener('click', aplicarFiltros);
        if (botonLimpiarBusqueda) botonLimpiarBusqueda.addEventListener('click', limpiarBusqueda);
        if (botonAplicarFiltros) botonAplicarFiltros.addEventListener('click', aplicarFiltros);
        if (botonLimpiarFiltros) botonLimpiarFiltros.addEventListener('click', limpiarFiltros);
        
        // Búsqueda con la tecla Enter
        if (inputBusqueda) {
            inputBusqueda.addEventListener('keyup', function(e) {
                if (e.key === 'Enter') {
                    aplicarFiltros();
                }
            });
        }
    }
}

// Función para aplicar filtros
function aplicarFiltros() {
    const busqueda = document.getElementById('busquedaRecibos')?.value || '';
    const propiedad = document.getElementById('filtroPropiedades')?.value || '';
    const arrendatario = document.getElementById('filtroArrendatarios')?.value || '';
    const fechaDesde = document.getElementById('filtroFechaDesde')?.value || '';
    const fechaHasta = document.getElementById('filtroFechaHasta')?.value || '';
    const montoMinimo = document.getElementById('filtroMontoMinimo')?.value || '';
    const montoMaximo = document.getElementById('filtroMontoMaximo')?.value || '';
    
    const filtros = {
        busqueda,
        propiedad,
        arrendatario,
        fechaDesde,
        fechaHasta,
        montoMinimo,
        montoMaximo
    };
    
    cargarRecibos(filtros);
}

// Función para limpiar la búsqueda
function limpiarBusqueda() {
    const busquedaInput = document.getElementById('busquedaRecibos');
    if (busquedaInput) {
        busquedaInput.value = '';
        aplicarFiltros();
    }
}

// Función para limpiar todos los filtros
function limpiarFiltros() {
    const elementosALimpiar = [
        'filtroPropiedades',
        'filtroArrendatarios',
        'filtroFechaDesde',
        'filtroFechaHasta',
        'filtroMontoMinimo',
        'filtroMontoMaximo',
        'busquedaRecibos'
    ];
    
    elementosALimpiar.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.value = '';
        }
    });
    
    cargarRecibos(); // Cargar todos los recibos sin filtros
    mostrarNotificacion('Filtros restablecidos', 'info');
}
// Función para obtener el nombre del mes
function obtenerNombreMes(numeroMes) {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[numeroMes];
}

// Función para actualizar las estadísticas
function actualizarEstadisticas() {
    // Verificar que existe la sección de estadísticas
    const seccionEstadisticas = document.getElementById('seccionEstadisticas');
    if (!seccionEstadisticas) return;
    
    // Verificar que existan recibos
    if (!recibos || recibos.length === 0) {
        document.getElementById('ingresosTotales').textContent = '$0';
        document.getElementById('ingresosPorPropiedad').innerHTML = '<p class="texto-centrado">No hay datos disponibles</p>';
        document.getElementById('graficoIngresosMensuales').innerHTML = '<p class="texto-centrado">No hay datos disponibles</p>';
        return;
    }
    
    // Calcular ingresos totales
    const ingresoTotal = recibos.reduce((total, recibo) => {
        const monto = parseInt(recibo.montoPagado) || 0;
        return total + monto;
    }, 0);
    
    const ingresosTotalesElement = document.getElementById('ingresosTotales');
    if (ingresosTotalesElement) {
        ingresosTotalesElement.textContent = `$${ingresoTotal.toLocaleString('es-CO')}`;
    }
    
    // Calcular ingresos por propiedad
    const ingresosPorPropiedad = recibos.reduce((acc, recibo) => {
        if (!recibo.direccionInmueble || !recibo.numeroRecibo) return acc;
        
        const direccion = recibo.direccionInmueble;
        const codigo = recibo.numeroRecibo.substring(0, 4);
        const nombreCorto = propiedades.find(p => p.codigo === codigo)?.codigo || codigo;
        
        if (!acc[nombreCorto]) {
            acc[nombreCorto] = {
                codigo: nombreCorto,
                direccion: direccion,
                total: 0
            };
        }
        
        const monto = parseInt(recibo.montoPagado) || 0;
        acc[nombreCorto].total += monto;
        return acc;
    }, {});
    
    // Mostrar ingresos por propiedad
    const contenedorPropiedades = document.getElementById('ingresosPorPropiedad');
    if (!contenedorPropiedades) return;
    
    if (Object.keys(ingresosPorPropiedad).length === 0) {
        contenedorPropiedades.innerHTML = '<p class="texto-centrado">No hay datos disponibles</p>';
        return;
    }
    
    contenedorPropiedades.innerHTML = '';
    
    const propiedadesOrdenadas = Object.values(ingresosPorPropiedad).sort((a, b) => b.total - a.total);
    
    propiedadesOrdenadas.forEach(propiedad => {
        const propiedadElement = document.createElement('div');
        propiedadElement.className = 'propiedad-ingreso';
        
        const porcentaje = ingresoTotal > 0 ? (propiedad.total / ingresoTotal * 100).toFixed(1) : 0;
        
        propiedadElement.innerHTML = `
            <div class="propiedad-nombre">${propiedad.codigo}</div>
            <div class="propiedad-total">$${propiedad.total.toLocaleString('es-CO')}</div>
            <div class="propiedad-barra">
                <div class="barra-progreso" style="width: ${porcentaje}%"></div>
            </div>
            <div class="propiedad-porcentaje">${porcentaje}%</div>
        `;
        propiedadElement.title = propiedad.direccion;
        contenedorPropiedades.appendChild(propiedadElement);
    });
    
    // Generar datos para el gráfico de ingresos mensuales
    generarGraficoIngresosMensuales();
}

// Función para generar el gráfico de ingresos mensuales
function generarGraficoIngresosMensuales() {
    const contenedorGrafico = document.getElementById('graficoIngresosMensuales');
    if (!contenedorGrafico || !recibos || recibos.length === 0) {
        if (contenedorGrafico) {
            contenedorGrafico.innerHTML = '<p class="texto-centrado">No hay datos disponibles</p>';
        }
        return;
    }
    
    // Agrupar recibos por mes
    const ingresosPorMes = recibos.reduce((acc, recibo) => {
        if (!recibo.fechaPago || !recibo.montoPagado) return acc;
        
        try {
            const fecha = new Date(recibo.fechaPago);
            if (isNaN(fecha.getTime())) return acc; // Ignorar fechas inválidas
            
            const mesKey = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}`;
            
            if (!acc[mesKey]) {
                acc[mesKey] = {
                    mes: `${obtenerNombreMes(fecha.getMonth())} ${fecha.getFullYear()}`,
                    total: 0,
                    count: 0
                };
            }
            
            const monto = parseInt(recibo.montoPagado) || 0;
            acc[mesKey].total += monto;
            acc[mesKey].count += 1;
        } catch (error) {
            console.error('Error procesando fecha:', error);
        }
        
        return acc;
    }, {});
    
    // Verificar si hay datos para mostrar
    if (Object.keys(ingresosPorMes).length === 0) {
        contenedorGrafico.innerHTML = '<p class="texto-centrado">No hay datos disponibles para graficar</p>';
        return;
    }
    
    // Convertir a array y ordenar por fecha
    const meses = Object.keys(ingresosPorMes).sort();
    const datosMeses = meses.map(key => ingresosPorMes[key]);
    
    // Generar HTML para el gráfico
    contenedorGrafico.innerHTML = '';
    const alturaMaxima = 200; // altura máxima en píxeles
    const maxTotal = Math.max(...datosMeses.map(m => m.total));
    
    // Crear el contenedor para el gráfico
    const graficoBarras = document.createElement('div');
    graficoBarras.className = 'grafico-barras';
    
    // Crear las barras del gráfico
    datosMeses.forEach(mes => {
        const altura = maxTotal > 0 ? (mes.total / maxTotal * alturaMaxima).toFixed(0) : 0;
        
        const barraMes = document.createElement('div');
        barraMes.className = 'barra-mes';
        
        barraMes.innerHTML = `
            <div class="barra-valor">$${mes.total.toLocaleString('es-CO')}</div>
            <div class="barra-grafico" style="height: ${altura}px"></div>
            <div class="barra-etiqueta">${mes.mes}</div>
        `;
        
        graficoBarras.appendChild(barraMes);
    });
    
    contenedorGrafico.appendChild(graficoBarras);
}

// Función para añadir estadísticas a la interfaz
function inicializarEstadisticas() {
    // La sección de estadísticas ya está incluida en el HTML principal
    actualizarEstadisticas();
}
// Función para cambiar entre secciones
function cambiarSeccion(seccionId) {
    // Ocultar todas las secciones
    const secciones = ['seccionFormulario', 'seccionRecibo', 'seccionHistorial', 'seccionEstadisticas'];
    
    secciones.forEach(seccion => {
        const elemento = document.getElementById(seccion);
        if (elemento) {
            elemento.style.display = 'none';
        }
    });
    
    // Mostrar la sección seleccionada
    const seccionSeleccionada = document.getElementById(seccionId);
    if (seccionSeleccionada) {
        seccionSeleccionada.style.display = 'block';
        
        // Actualizar la navegación para mostrar el elemento activo
        secciones.forEach(seccion => {
            const navId = seccion.replace('seccion', 'nav');
            const navElement = document.getElementById(navId);
            if (navElement) {
                if (seccion === seccionId) {
                    navElement.classList.add('active');
                } else {
                    navElement.classList.remove('active');
                }
            }
        });
        
        // Inicializar filtros si estamos en el historial
        if (seccionId === 'seccionHistorial') {
            inicializarFiltros();
            cargarRecibos(); // Cargar los recibos al entrar en la sección
        }
        
        // Actualizar estadísticas si estamos en esa sección
        if (seccionId === 'seccionEstadisticas') {
            actualizarEstadisticas();
        }
    }
}

// Configurar eventos de navegación
document.getElementById('navFormulario').addEventListener('click', function(e) {
    e.preventDefault();
    cambiarSeccion('seccionFormulario');
});

document.getElementById('navRecibo').addEventListener('click', function(e) {
    e.preventDefault();
    if (reciboActual) {
        cambiarSeccion('seccionRecibo');
    } else {
        mostrarNotificacion('No hay un recibo generado para mostrar', 'info');
    }
});

document.getElementById('navHistorial').addEventListener('click', function(e) {
    e.preventDefault();
    cambiarSeccion('seccionHistorial');
});

// El evento para "navEstadisticas" ya está incluido en la función inicializarEstadisticas

// Función para añadir estilos CSS dinámicos
function agregarEstilosNotificaciones() {
    if (!document.getElementById('notificacionesCSS')) {
        const estiloNotificaciones = document.createElement('style');
        estiloNotificaciones.id = 'notificacionesCSS';
        estiloNotificaciones.textContent = `
            .notificacion {
                position: fixed;
                top: 20px;
                right: 20px;
                max-width: 350px;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 1050;
                transform: translateY(-30px);
                opacity: 0;
                transition: all 0.3s ease;
            }
            
            .notificacion.visible {
                transform: translateY(0);
                opacity: 1;
            }
            
            .notificacion.info {
                background-color: #48cae4;
                color: white;
            }
            
            .notificacion.success {
                background-color: #38b000;
                color: white;
            }
            
            .notificacion.warning {
                background-color: #f48c06;
                color: white;
            }
            
            .notificacion.error {
                background-color: #e5383b;
                color: white;
            }
            
            .notificacion-contenido {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .notificacion-contenido i {
                font-size: 1.5rem;
            }
            
            .recibo-header-small {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                color: #4361ee;
                font-weight: 600;
            }
            
            .recibo-datos {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }
            
            .recibo-datos p {
                margin: 5px 0;
            }
            
            .recibo-datos i {
                width: 20px;
                margin-right: 5px;
                color: #4361ee;
            }
            
            @media (max-width: 768px) {
                .recibo-datos {
                    grid-template-columns: 1fr;
                }
            }
            
            nav ul li a.active {
                color: #4361ee;
                border-bottom: 3px solid #4361ee;
                font-weight: 600;
            }
            
            .mensaje-vacio {
                text-align: center;
                padding: 30px;
                color: #6c757d;
                background-color: #f8f9fa;
                border-radius: 8px;
                margin-top: 20px;
            }
            
            .texto-centrado {
                text-align: center;
                padding: 20px;
                color: #6c757d;
            }
        `;
        document.head.appendChild(estiloNotificaciones);
    }
}

// Inicializar la aplicación
function inicializarApp() {
    console.log('Inicializando aplicación...');
    agregarEstilosNotificaciones();
    cargarDatos();
    cambiarSeccion('seccionFormulario');
    console.log('Aplicación inicializada correctamente.');
}

// Cargar datos al iniciar la aplicación
window.addEventListener('load', inicializarApp);
