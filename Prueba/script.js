// Variables globales
let quadrants = [];
let teams = [];
let motivesList = [];
let contactsList = [];
let selectedQuadrants = [];
let selectedOfficers = [null, null];
let activityResults = {};
let activityResultsList = [];

// Función principal para cargar datos
async function loadData() {
    try {
        const localData = loadFromLocalStorage();
        if (localData) {
            ({ quadrants, teams, motivesList, selectedQuadrants, selectedOfficers, activityResults } = localData);
            // Cargar contactsList desde localStorage pero asegurar que sea un array
            contactsList = JSON.parse(localStorage.getItem('contactsList') || '[]');
            
            // Cargar resultados de actividades
            try {
                const activityResultsResponse = await fetch('resultados_actividades.json');
                activityResultsList = await activityResultsResponse.json();
            } catch (error) {
                console.error('Error al cargar resultados de actividades:', error);
                // Usar una lista básica si falla la carga
                activityResultsList = getDefaultActivityResults();
            }
        } else {
            try {
                const [quadrantsResponse, motivesResponse, activityResultsResponse] = await Promise.all([
                    fetch('cuadrantes.json'),
                    fetch('claves_policiales.json'),
                    fetch('resultados_actividades.json')
                ]);
                quadrants = await quadrantsResponse.json();
                motivesList = await motivesResponse.json();
                activityResultsList = await activityResultsResponse.json();
            } catch (error) {
                console.error('Error al cargar archivos JSON:', error);
                
                // Intentar cargar archivos individualmente si falla la carga en paralelo
                try {
                    const quadrantsResponse = await fetch('cuadrantes.json');
                    quadrants = await quadrantsResponse.json();
                } catch (e) {
                    console.error('Error al cargar cuadrantes:', e);
                    quadrants = [];
                }
                
                try {
                    const motivesResponse = await fetch('claves_policiales.json');
                    motivesList = await motivesResponse.json();
                } catch (e) {
                    console.error('Error al cargar claves policiales:', e);
                    motivesList = [];
                }
                
                try {
                    const activityResultsResponse = await fetch('resultados_actividades.json');
                    activityResultsList = await activityResultsResponse.json();
                } catch (e) {
                    console.error('Error al cargar resultados de actividades:', e);
                    activityResultsList = getDefaultActivityResults();
                }
            }
            
            // Normalizar el nombre del CAI para consistencia
            quadrants.forEach(q => {
                if (q.cai === "SETE DE AGOSTO") {
                    q.cai = "SIETE DE AGOSTO";
                }
            });
            
            saveToLocalStorage();
        }
        
        // Inicializar la aplicación con los datos cargados
        initializeApp();
    } catch (error) {
        handleLoadError(error);
    }
}

// Función para obtener una lista predeterminada de resultados en caso de error
function getDefaultActivityResults() {
    return [
        {
            "categoria": "Capturas",
            "resultados": ["Captura en flagrancia"]
        },
        {
            "categoria": "Medidas correctivas",
            "resultados": ["Comparendo por infracción al Código de Policía"]
        }
    ];
}

// Inicialización de la aplicación - Función unificada
function initializeApp() {
    renderQuadrants();
    renderTeams();
    setupEventListeners();
    startTimers();
    setupFileUpload();
    loadOfficerDropdowns();
    updateCreateTeamButton();
    toggleCreateTeamElements(quadrants.filter(q => !isQuadrantInTeam(q.id)).length > 0);
    addStylesToResultDialog();
    addVoiceSearchStyles(); // Agregar estilos para búsqueda por voz
    setupVoiceSearch();     // Configurar búsqueda por voz
}

// Configurar la carga de archivo
function setupFileUpload() {
    const uploadButton = document.getElementById('uploadButton');
    const fileInput = document.getElementById('contactsFile');
    const fileStatus = document.getElementById('fileStatus');

    uploadButton.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            uploadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
            uploadButton.disabled = true;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    // Validar estructura del JSON de contactos
                    const data = JSON.parse(e.target.result);
                    if (!Array.isArray(data)) {
                        throw new Error("El archivo no contiene un arreglo válido");
                    }
                    
                    // Verificar que los objetos tengan las propiedades necesarias
                    const requiredProps = ['NOMBRES', 'APELLIDOS', 'GR', 'CC'];
                    const validData = data.every(item => 
                        requiredProps.every(prop => prop in item)
                    );
                    
                    if (!validData) {
                        throw new Error("La estructura de datos no es válida");
                    }
                    
                    contactsList = data;
                    localStorage.setItem('contactsList', JSON.stringify(contactsList));
                    fileStatus.textContent = 'Lista de funcionarios cargada y guardada correctamente';
                    fileStatus.style.color = 'green';
                    loadOfficerDropdowns();
                    saveToLocalStorage();

                    uploadButton.innerHTML = '<i class="fas fa-check"></i> Lista cargada';
                    uploadButton.style.backgroundColor = '#28a745';
                } catch (error) {
                    console.error('Error al parsear el archivo JSON:', error);
                    fileStatus.textContent = 'Error al cargar el archivo: ' + error.message;
                    fileStatus.style.color = 'red';

                    uploadButton.innerHTML = '<i class="fas fa-upload"></i> Cargar lista de funcionarios';
                    uploadButton.style.backgroundColor = '';
                }
                uploadButton.disabled = false;
            };
            reader.readAsText(file);
        }
    });
}

// Renderizado de cuadrantes
function renderQuadrants() {
    const caiList = document.getElementById('caiList');
    caiList.innerHTML = '';
    
    const availableQuadrants = quadrants.filter(q => !isQuadrantInTeam(q.id));
    
    const caiGroups = groupByCai(availableQuadrants);
    const sortedCais = Object.keys(caiGroups).sort();

    sortedCais.forEach(cai => {
        const caiDiv = document.createElement('div');
        caiDiv.className = 'cai-item';
        caiDiv.innerHTML = `<h3>${cai}</h3>`;

        const quadrantList = document.createElement('div');
        quadrantList.className = 'quadrant-list';

        const sortedQuadrants = caiGroups[cai].sort((a, b) => {
            return parseInt(a.name.slice(2)) - parseInt(b.name.slice(2));
        });

        sortedQuadrants.forEach(q => {
            const quadrantDiv = document.createElement('div');
            quadrantDiv.className = 'quadrant-item';
            quadrantDiv.dataset.id = q.id.toString(); // Convertir ID a string para consistencia
            quadrantDiv.textContent = q.name;
            quadrantList.appendChild(quadrantDiv);
        });

        caiDiv.appendChild(quadrantList);
        caiList.appendChild(caiDiv);
    });

    updateCreateTeamButton();
    toggleCreateTeamElements(availableQuadrants.length > 0);
}

// Verificar si un cuadrante está en un equipo
function isQuadrantInTeam(quadrantId) {
    // Conversión de tipo para consistencia en la comparación
    const id = parseInt(quadrantId);
    return teams.some(team => team.quadrants.some(q => parseInt(q.id) === id));
}

// Renderizado de equipos
function renderTeams() {
    const teamsList = document.getElementById('teamsList');
    teamsList.innerHTML = '';

    const sortedTeams = teams.sort((a, b) => {
        if (!a.quadrants.length || !b.quadrants.length) return 0;
        return parseInt(a.quadrants[0].name.slice(2)) - parseInt(b.quadrants[0].name.slice(2));
    });

    const inactiveTeams = sortedTeams.filter(team => !team.active);
    const activeTeams = sortedTeams.filter(team => team.active);

    const inactiveTeamsByCai = groupTeamsByCai(inactiveTeams);
    const activeTeamsByCai = groupTeamsByCai(activeTeams);

    // Render inactive teams first
    for (const cai in inactiveTeamsByCai) {
        const caiTeams = inactiveTeamsByCai[cai];
        const caiSection = createCaiSection(cai, caiTeams);
        teamsList.appendChild(caiSection);
    }

    // Add separator if there are both inactive and active teams
    if (inactiveTeams.length > 0 && activeTeams.length > 0) {
        const separator = document.createElement('hr');
        separator.className = 'teams-separator';
        teamsList.appendChild(separator);
    }

    // Render active teams
    for (const cai in activeTeamsByCai) {
        const caiTeams = activeTeamsByCai[cai];
        const caiSection = createCaiSection(cai, caiTeams);
        teamsList.appendChild(caiSection);
    }

    // Add action buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'buttons-container';

    const resetButton = createButton('resetButton', 'Reiniciar Turno', resetLocalStorage);
    const reportButton = createButton('reportButton', 'Reporte', generateReport);
    const whatsappButton = createButton('whatsappButton', '<i class="fab fa-whatsapp"></i>', sendReportWhatsApp);
    const emailButton = createButton('emailButton', '<i class="far fa-envelope"></i>', sendReportEmail);

    buttonsContainer.appendChild(resetButton);
    buttonsContainer.appendChild(reportButton);
    buttonsContainer.appendChild(whatsappButton);
    buttonsContainer.appendChild(emailButton);

    teamsList.appendChild(buttonsContainer);

    saveToLocalStorage();
}

// Crear sección de CAI
function createCaiSection(cai, caiTeams) {
    const caiSection = document.createElement('div');
    caiSection.className = 'cai-teams-section';
    caiSection.innerHTML = `<h3>CAI ${cai}</h3>`;

    caiTeams.forEach(team => {
        const teamItem = document.createElement('div');
        teamItem.className = 'team-item';
        teamItem.setAttribute('data-team-name', team.name);
        teamItem.innerHTML = `
            <div class="team-header">
                ${!team.active ? `
                    <button class="undo-button" onclick="confirmUndoTeam('${team.name}')" title="Deshacer equipo">
                        <i class="fas fa-undo"></i>
                    </button>
                ` : ''}
                <span class="team-name">${team.name}</span>
                ${team.active && team.assignedTime ? `
                    <span class="timer" data-start-time="${team.assignedTime.getTime()}">00:00:00</span>
                    <button class="deactivate-button" onclick="toggleTeamStatus('${team.name}')" title="Desactivar equipo">
                        <i class="fas fa-power-off"></i>
                    </button>
                ` : `
                    <button class="activate-button" onclick="activateTeam('${team.name}')" title="Activar equipo">
                        <i class="fas fa-play"></i>
                    </button>
                `}
                <button class="call-button" onclick="callTeam('${team.name}')" title="Llamar al cuadrante">
                    <i class="fas fa-phone"></i>
                </button>
            </div>
        `;

        if (!team.active) {
            const searchContainer = createSearchContainer(team);
            teamItem.appendChild(searchContainer);
        } else {
            const activityDisplay = document.createElement('div');
            activityDisplay.className = 'activity-display';
            activityDisplay.innerHTML = `
                <span class="assignment-time">${team.assignedTime ? formatDate(team.assignedTime) : 'Pendiente'}</span>
                <span class="activity">Actividad: ${team.selectedMotive || 'No asignada'}</span>
            `;
            teamItem.appendChild(activityDisplay);
        }

        if (team.contacts && team.contacts.length > 0) {
            const contactsDisplay = document.createElement('div');
            contactsDisplay.className = 'team-contacts';
            contactsDisplay.innerHTML = `
                <h4>Funcionarios asignados:</h4>
                ${team.contacts.map(contact => `
                    <div class="officer-info">
                        <button class="call-officer-button" onclick="callOfficer('${contact.CELULAR || ''}')" title="Llamar al funcionario">
                            <i class="fas fa-phone"></i>
                        </button>
                        ${contact.GR || ''} ${contact.NOMBRES || ''} ${contact.APELLIDOS || ''}
                        ${contact.PLACA ? `<span class="officer-placa"> - Placa: ${contact.PLACA}</span>` : ''}
                    </div>
                `).join('')}
            `;
            teamItem.appendChild(contactsDisplay);
        }

        caiSection.appendChild(teamItem);
    });

    return caiSection;
}

// Añadir estilos para las categorías en la función que genera el diálogo
function addStylesToResultDialog() {
    // Verificar si los estilos ya existen
    if (document.getElementById('result-dialog-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'result-dialog-styles';
    style.textContent = `
        .result-category {
            margin-bottom: 10px;
        }
        
        .result-category h4 {
            margin: 0;
            padding: 5px;
            background-color: #f0f0f0;
            border-left: 3px solid #003366;
            font-size: 12px;
        }
        
        .result-category div {
            padding: 8px;
            cursor: pointer;
            padding-left: 15px;
            transition: background-color 0.3s, border-left 0.3s;
            border-left: 3px solid transparent;
        }
        
        .result-category div:hover {
            background-color: #f0f0f0;
        }
        
        .result-category div.selected {
            background-color: #e6f2ff;
            border-left: 3px solid #003366;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);
}

// Crear botón
function createButton(id, innerHTML, onClickHandler) {
    const button = document.createElement('button');
    button.id = id;
    button.innerHTML = innerHTML;
    button.onclick = onClickHandler;
    return button;
}

// Crear contenedor de búsqueda
function createSearchContainer(team) {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.innerHTML = `
        <input type="text" class="search-input" placeholder="Buscar motivo...">
        <div class="search-results"></div>
    `;

    const searchInput = searchContainer.querySelector('.search-input');
    const searchResults = searchContainer.querySelector('.search-results');

    searchInput.addEventListener('input', () => {
        filterMotives(searchInput.value, searchResults, team);
    });

    // Añadir eventos touch para mejor compatibilidad móvil
    searchInput.addEventListener('touchstart', () => {
        searchInput.focus();
    });

    document.addEventListener('click', (event) => {
        if (!searchContainer.contains(event.target)) {
            searchResults.style.display = 'none';
        }
    });

    // Añadir manejador touchend para dispositivos móviles
    document.addEventListener('touchend', (event) => {
        if (!searchContainer.contains(event.target)) {
            searchResults.style.display = 'none';
        }
    });

    return searchContainer;
}

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('caiList').addEventListener('click', event => {
        if (event.target.classList.contains('quadrant-item')) {
            toggleQuadrantSelection(event.target.dataset.id);
        }
    });

    // Añadir soporte para eventos touch
    document.getElementById('caiList').addEventListener('touchend', event => {
        if (event.target.classList.contains('quadrant-item')) {
            toggleQuadrantSelection(event.target.dataset.id);
            event.preventDefault(); // Prevenir eventos tap dobles
        }
    });

    document.getElementById('createTeamButton').addEventListener('click', createTeam);
}

// Alternar selección de cuadrante
function toggleQuadrantSelection(quadrantId) {
    // Convertir y comparar IDs consistentemente
    const stringId = quadrantId.toString();
    const index = selectedQuadrants.findIndex(id => id.toString() === stringId);
    
    if (index > -1) {
        selectedQuadrants.splice(index, 1);
    } else {
        selectedQuadrants.push(stringId);
    }
    updateQuadrantStyles();
    updateCreateTeamButton();
    saveToLocalStorage();
}

// Actualizar estilos de cuadrantes
function updateQuadrantStyles() {
    document.querySelectorAll('.quadrant-item').forEach(item => {
        // Comparar como strings
        if (selectedQuadrants.includes(item.dataset.id.toString())) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

// Crear equipo
function createTeam() {
    if (selectedOfficers[0] && selectedOfficers[1] && selectedQuadrants.length > 0) {
        if (selectedOfficers[0].CC === selectedOfficers[1].CC) {
            alert('No se puede crear un equipo con el mismo funcionario dos veces.');
            return;
        }

        const teamQuadrants = selectedQuadrants
            .map(id => quadrants.find(q => q.id.toString() === id.toString()))
            .filter(q => q)
            .sort((a, b) => parseInt(a.name.slice(2)) - parseInt(b.name.slice(2)));

        if (teamQuadrants.length === 0) {
            alert('No se pudo crear el equipo: los cuadrantes seleccionados no son válidos.');
            return;
        }

        const teamName = 'C-' + teamQuadrants.map(q => q.name.slice(2)).join('-');
        
        // Inicialización completa de propiedades
        const newTeam = {
            name: teamName,
            quadrants: teamQuadrants,
            active: false,
            selectedMotive: '',
            assignedTime: null,
            activityHistory: [],
            contacts: selectedOfficers.slice() // Usar una copia para evitar referencias
        };

        teams.push(newTeam);
        alert(`Equipo "${teamName}" creado con éxito.`);
        
        selectedOfficers = [null, null];
        selectedQuadrants = [];
        updateQuadrantStyles();
        updateOfficerDropdowns();
        saveToLocalStorage();
        renderTeams();
        renderQuadrants();
    } else {
        alert('Por favor, seleccione dos funcionarios y al menos un cuadrante para crear un equipo.');
    }
}

function confirmUndoTeam(teamName) {
    if (confirm(`¿Está seguro de que desea deshacer el equipo ${teamName}? Esta acción no se puede deshacer.`)) {
        undoTeam(teamName);
    }
}

function undoTeam(teamName) {
    const teamIndex = teams.findIndex(t => t.name === teamName);
    if (teamIndex > -1) {
        const team = teams[teamIndex];
        // Devolver los cuadrantes a la lista de disponibles
        team.quadrants.forEach(q => {
            if (!quadrants.some(quad => quad.id.toString() === q.id.toString())) {
                quadrants.push(q);
            }
        });
        teams.splice(teamIndex, 1);
        renderQuadrants();
        renderTeams();
        updateOfficerDropdowns();
        saveToLocalStorage();
    }
}

function toggleTeamStatus(teamName) {
    const team = teams.find(t => t.name === teamName);
    if (team && team.active) {
        showActivityResultDialog(team);
    }
}

function showActivityResultDialog(team) {
    const dialog = document.createElement('div');
    dialog.className = 'activity-result-dialog';
    dialog.innerHTML = `
        <h3>Resultado de la actividad</h3>
        <div style="position: relative;">
            <input type="text" id="resultSearch" placeholder="Buscar resultado...">
        </div>
        <div id="resultsList"></div>
        <button id="confirmResult" disabled>Confirmar</button>
    `;
    document.body.appendChild(dialog);

    const resultSearch = document.getElementById('resultSearch');
    const resultsList = document.getElementById('resultsList');
    const confirmButton = document.getElementById('confirmResult');
    
    // Agregar búsqueda por voz al cuadro de búsqueda del diálogo
    addVoiceButtonTo(resultSearch);
    
    // Función para mostrar todos los resultados agrupados por categoría
    function showAllResults() {
        resultsList.innerHTML = '';
        
        if (!activityResultsList || !Array.isArray(activityResultsList) || activityResultsList.length === 0) {
            displayActivityResults(searchActivityResults(''), resultsList);
            return;
        }
        
        // Mostrar resultados agrupados por categoría
        activityResultsList.forEach(category => {
            if (!category.categoria || !category.resultados || !Array.isArray(category.resultados)) {
                return;
            }
            
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'result-category';
            categoryDiv.innerHTML = `<h4>${category.categoria}</h4>`;
            
            category.resultados.forEach(result => {
                const div = document.createElement('div');
                div.textContent = result;
                div.addEventListener('click', () => {
                    resultsList.querySelectorAll('div').forEach(el => {
                        if (el.classList.contains('selected')) {
                            el.classList.remove('selected');
                        }
                    });
                    div.classList.add('selected');
                    confirmButton.disabled = false;
                });
                categoryDiv.appendChild(div);
            });
            
            resultsList.appendChild(categoryDiv);
        });
    }

    resultSearch.addEventListener('input', () => {
        if (resultSearch.value.trim() === '') {
            showAllResults();
        } else {
            const results = searchActivityResults(resultSearch.value);
            displayActivityResults(results, resultsList);
        }
    });

    confirmButton.addEventListener('click', () => {
        const selectedResult = resultsList.querySelector('.selected');
        if (selectedResult) {
            saveActivityResult(team, selectedResult.textContent);
            document.body.removeChild(dialog);
            completeTeamDeactivation(team);
        }
    });

    // Mostrar todos los resultados inicialmente
    showAllResults();
}

function searchActivityResults(query) {
    // Si no tenemos la lista, usar una predeterminada
    if (!activityResultsList || !Array.isArray(activityResultsList) || activityResultsList.length === 0) {
        const defaultResults = [
            "Captura", "Comparendo", "Traslado por Protección", "Cierre de Establecimiento",
            "Incautación de Arma Blanca", "Incautación de Arma de Fuego"
        ];
        return defaultResults.filter(result => result.toLowerCase().includes(query.toLowerCase()));
    }
    
    // Buscar en todas las categorías
    const allResults = [];
    
    activityResultsList.forEach(category => {
        if (category.resultados && Array.isArray(category.resultados)) {
            category.resultados.forEach(result => {
                if (result.toLowerCase().includes(query.toLowerCase())) {
                    allResults.push(result);
                }
            });
        }
    });
    
    return allResults;
}

function displayActivityResults(results, container) {
    container.innerHTML = '';
    
    if (results.length === 0) {
        const noResults = document.createElement('div');
        noResults.textContent = 'No se encontraron resultados';
        noResults.style.padding = '10px';
        noResults.style.fontStyle = 'italic';
        container.appendChild(noResults);
        return;
    }
    
    results.forEach(result => {
        const div = document.createElement('div');
        div.textContent = result;
        div.addEventListener('click', () => {
            container.querySelectorAll('div').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            document.getElementById('confirmResult').disabled = false;
        });
        container.appendChild(div);
    });
}

function saveActivityResult(team, result) {
    if (!team || !team.quadrants || team.quadrants.length === 0) {
        console.error('Error: Equipo inválido o sin cuadrantes');
        return;
    }

    const cai = team.quadrants[0].cai;
    
    // Verificar que activityHistory exista y tenga elementos
    if (!team.activityHistory || team.activityHistory.length === 0) {
        console.error('Error: El historial de actividades está vacío');
        return;
    }
    
    const activityIndex = team.activityHistory.length - 1;
    
    if (!activityResults[cai]) {
        activityResults[cai] = {};
    }
    if (!activityResults[cai][team.name]) {
        activityResults[cai][team.name] = [];
    }
    
    // Asegurarse de tener un array con el tamaño adecuado
    while (activityResults[cai][team.name].length <= activityIndex) {
        activityResults[cai][team.name].push(null);
    }
    
    activityResults[cai][team.name][activityIndex] = result;
    saveToLocalStorage();
}

function completeTeamDeactivation(team) {
    if (!team) return;
    
    team.active = false;
    const endTime = new Date();
    
    // Verificar que activityHistory exista y tenga elementos
    if (team.activityHistory && team.activityHistory.length > 0) {
        team.activityHistory[team.activityHistory.length - 1].endTime = endTime;
    }
    
    team.selectedMotive = '';
    team.assignedTime = null;
    renderTeams();
    updateTimers();
    saveToLocalStorage();
}

function filterMotives(query, resultsElement, team) {
    if (!motivesList || !Array.isArray(motivesList)) {
        console.error('Error: motivesList no es un array válido');
        return;
    }

    const filteredMotives = motivesList.filter(motive => 
        motive.text.toLowerCase().includes(query.toLowerCase()) ||
        motive.value.includes(query)
    );

    resultsElement.innerHTML = '';
    if (filteredMotives.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'search-result-item';
        noResults.textContent = 'No se encontraron coincidencias';
        noResults.style.fontStyle = 'italic';
        resultsElement.appendChild(noResults);
        resultsElement.style.display = 'block';
        return;
    }

    filteredMotives.forEach(motive => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.textContent = motive.text;
        item.onmousedown = () => {
            selectMotive(motive.value, team);
            resultsElement.parentNode.querySelector('.search-input').value = motive.text;
            resultsElement.style.display = 'none';
        };
        // Añadir soporte touch
        item.ontouchend = (e) => {
            selectMotive(motive.value, team);
            resultsElement.parentNode.querySelector('.search-input').value = motive.text;
            resultsElement.style.display = 'none';
            e.preventDefault();
        };
        resultsElement.appendChild(item);
    });

    resultsElement.style.display = filteredMotives.length > 0 ? 'block' : 'none';
}

function selectMotive(motiveCode, team) {
    if (!team) return;
    
    const motiveDescription = motivesList.find(motive => motive.value === motiveCode)?.text || '';
    team.selectedMotive = motiveDescription;
    
    // No establecer la hora asignada todavía, solo al activar
    
    const teamElement = document.querySelector(`.team-item[data-team-name="${team.name}"]`);
    if (teamElement) {
        const searchInput = teamElement.querySelector('.search-input');
        const activateButton = teamElement.querySelector('.activate-button');
        
        if (searchInput) {
            searchInput.value = motiveDescription;
            searchInput.classList.add('motive-selected');
        }
        
        if (activateButton) {
            // Solo habilitar si se ha seleccionado un motivo
            activateButton.disabled = !motiveDescription;
        }
    }
    saveToLocalStorage();
}

function activateTeam(teamName) {
    const team = teams.find(t => t.name === teamName);
    if (!team) return;
    
    if (team && team.selectedMotive) {
        team.active = true;
        const startTime = new Date();
        team.assignedTime = startTime;
        
        // Asegurarse de que activityHistory existe
        if (!team.activityHistory) {
            team.activityHistory = [];
        }
        
        team.activityHistory.push({
            motive: team.selectedMotive,
            startTime: startTime,
            endTime: null
        });
        renderTeams();
        updateTimers();
        saveToLocalStorage();
    } else {
        alert('Por favor, seleccione un motivo antes de activar el equipo.');
    }
}

function formatDate(date) {
    // Mejor verificación de fecha válida
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return 'Fecha no disponible';
    }
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function groupByCai(items) {
    if (!items || !Array.isArray(items)) return {};
    
    return items.reduce((groups, item) => {
        if (!item || !item.cai) return groups;
        
        if (!groups[item.cai]) {
            groups[item.cai] = [];
        }
        groups[item.cai].push(item);
        return groups;
    }, {});
}

function groupTeamsByCai(teams) {
    if (!teams || !Array.isArray(teams)) return {};
    
    return teams.reduce((groups, team) => {
        if (!team || !team.quadrants || team.quadrants.length === 0) return groups;
        
        const cai = team.quadrants[0]?.cai || 'Unknown CAI';
        if (!groups[cai]) {
            groups[cai] = [];
        }
        groups[cai].push(team);
        return groups;
    }, {});
}

function startTimers() {
    updateTimers();
    setInterval(updateTimers, 1000);
}

function updateTimers() {
    const timers = document.querySelectorAll('.timer');
    timers.forEach(timer => {
        const startTime = parseInt(timer.dataset.startTime);
        if (!isNaN(startTime)) {
            updateTimer(timer, startTime);
        }
    });
}

function updateTimer(timerElement, startTime) {
    if (!timerElement || !startTime) return;
    
    const currentTime = new Date().getTime();
    const difference = currentTime - startTime;
    
    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    
    timerElement.textContent = 
        (hours < 10 ? "0" + hours : hours) + ":" +
        (minutes < 10 ? "0" + minutes : minutes) + ":" +
        (seconds < 10 ? "0" + seconds : seconds);
}

function callTeam(teamName) {
    const team = teams.find(t => t.name === teamName);
    if (team && team.quadrants && team.quadrants.length > 0) {
        const phoneNumber = team.quadrants[0].phone;
        if (phoneNumber) {
            window.location.href = `tel:${phoneNumber}`;
        } else {
            alert('No se encontró un número de teléfono para este cuadrante.');
        }
    } else {
        alert('No se pudo encontrar información de contacto para este equipo.');
    }
}

function callOfficer(phoneNumber) {
    if (phoneNumber) {
        window.location.href = `tel:${phoneNumber}`;
    } else {
        alert('No se encontró un número de teléfono para este funcionario.');
    }
}

// Mejorar manejo de fechas en localStorage
function saveToLocalStorage() {
    try {
        // Crear una copia profunda para manipular
        const teamsToSave = JSON.parse(JSON.stringify(teams));
        
        // Convertir fechas a ISO strings para mejor serialización
        teamsToSave.forEach(team => {
            if (team.assignedTime) {
                team.assignedTime = new Date(team.assignedTime).toISOString();
            }
            if (team.activityHistory) {
                team.activityHistory.forEach(activity => {
                    if (activity.startTime) {
                        activity.startTime = new Date(activity.startTime).toISOString();
                    }
                    if (activity.endTime) {
                        activity.endTime = new Date(activity.endTime).toISOString();
                    }
                });
            }
        });
        
        const dataToSave = {
            quadrants,
            teams: teamsToSave,
            motivesList,
            selectedQuadrants,
            selectedOfficers,
            activityResults
        };
        
        localStorage.setItem('policeQuadrantsData', JSON.stringify(dataToSave));
        localStorage.setItem('contactsList', JSON.stringify(contactsList));
    } catch (error) {
        console.error('Error al guardar datos en localStorage:', error);
        alert('Hubo un problema al guardar los datos. Intente de nuevo más tarde.');
    }
}

function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('policeQuadrantsData');
        if (!savedData) return null;
        
        const parsedData = JSON.parse(savedData);
        
        // Restaurar fechas desde ISO strings
        if (parsedData.teams) {
            parsedData.teams.forEach(team => {
                if (team.assignedTime) {
                    team.assignedTime = new Date(team.assignedTime);
                }
                if (team.activityHistory) {
                    team.activityHistory.forEach(activity => {
                        if (activity.startTime) {
                            activity.startTime = new Date(activity.startTime);
                        }
                        if (activity.endTime) {
                            activity.endTime = new Date(activity.endTime);
                        }
                    });
                }
            });
        }
        
        return parsedData;
    } catch (error) {
        console.error('Error al cargar datos desde localStorage:', error);
        alert('Hubo un problema al cargar los datos guardados. Se inicializará con datos nuevos.');
        return null;
    }
}

function resetLocalStorage() {
    if (confirm('¿Está seguro de que desea reiniciar todos los datos para un nuevo turno? Esta acción no se puede deshacer.')) {
        localStorage.removeItem('policeQuadrantsData');
        // Preguntar si también quiere borrar la lista de contactos
        if (confirm('¿Desea mantener la lista de funcionarios? Presione Cancelar para conservarla o Aceptar para borrarla también.')) {
            localStorage.removeItem('contactsList');
        }
        location.reload();
    }
}

// Dividir los reportes en secciones más pequeñas para evitar problemas con límites de URL
function generateReport() {
    try {
        const reportContent = generateReportContent();
        const reportWindow = window.open('', 'Reporte', 'width=800,height=600');
        if (!reportWindow) {
            alert('El navegador bloqueó la apertura de la ventana de reporte. Por favor, permita ventanas emergentes para este sitio.');
            return;
        }
        reportWindow.document.write(reportContent);
        reportWindow.document.close();
        reportWindow.print();  // Abre el diálogo de impresión automáticamente
    } catch (error) {
        console.error('Error al generar reporte:', error);
        alert('Hubo un problema al generar el reporte. Intente de nuevo.');
    }
}

function generateReportContent() {
    const reportData = generateReportData();
    
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reporte de Actividades por CAI y Cuadrante</title>
        <style>
            @page {
                size: letter;
                margin: 1.5cm;
            }
            body {
                font-family: Arial, sans-serif;
                font-size: 10px;
                line-height: 1.4;
                color: #333;
            }
            h1 {
                color: #003366;
                text-align: center;
                margin-bottom: 15px;
                font-size: 16px;
            }
            h2 {
                color: #003366;
                font-size: 14px;
                margin-top: 20px;
                margin-bottom: 10px;
            }
            .report-date {
                text-align: right;
                font-style: italic;
                margin-bottom: 15px;
            }
            .cai-section {
                margin-bottom: 20px;
                page-break-inside: avoid;
            }
            .cai-title {
                background-color: #003366;
                color: white;
                padding: 3px 5px;
                margin-bottom: 5px;
                font-size: 12px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 10px;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 4px;
                text-align: left;
            }
            th {
                background-color: #f2f2f2;
                font-weight: bold;
            }
            .activity-list {
                padding-left: 20px;
                margin: 0;
            }
            .activity-item {
                margin-bottom: 5px;
            }
            @media print {
                body {
                    width: 21cm;
                    height: 29.7cm;
                    margin: 0;
                    padding: 0;
                }
                .page-break {
                    page-break-before: always;
                }
            }
        </style>
    </head>
    <body>
        <h1>Reporte de Actividades por CAI y Cuadrante</h1>
        <div class="report-date">
            Fecha y hora del reporte: ${new Date().toLocaleString('es-CO')}
        </div>
        
        <h2>1. Conformación de Equipos</h2>
        ${reportData.teamComposition}
        
        <div class="page-break"></div>
        
        <h2>2. Actividades Realizadas</h2>
        ${reportData.activities}
        
        <div class="page-break"></div>
        
        <h2>3. Consolidado de Resultados</h2>
        ${reportData.summaryTable}
    </body>
    </html>
    `;
}

function generateReportData() {
    let teamComposition = '';
    let activities = '';
    let summaryData = {};

    if (!teams || teams.length === 0) {
        return {
            teamComposition: '<p>No hay equipos registrados.</p>',
            activities: '<p>No hay actividades registradas.</p>',
            summaryTable: '<p>No hay resultados para mostrar.</p>'
        };
    }

    const teamsByCai = groupTeamsByCai(teams);

    // 1. Conformación de Equipos
    for (const cai in teamsByCai) {
        const caiTeams = teamsByCai[cai];
        teamComposition += `
        <div class="cai-section">
            <div class="cai-title">CAI ${cai}</div>
            <table>
                <tr>
                    <th>Cuadrante</th>
                    <th>Funcionarios</th>
                </tr>
        `;

        caiTeams.forEach(team => {
            if (!team.quadrants || team.quadrants.length === 0) return;
            
            const quadrantNumbers = team.quadrants.map(q => q.name.slice(2)).join('-');
            const officers = team.contacts && team.contacts.length ? team.contacts.map(contact => 
                `${contact.GR || ''} ${contact.NOMBRES || ''} ${contact.APELLIDOS || ''}${contact.PLACA ? ` - Placa: ${contact.PLACA}` : ''}`
            ).join('<br>') : 'Sin funcionarios asignados';

            teamComposition += `
                <tr>
                    <td>${quadrantNumbers}</td>
                    <td>${officers}</td>
                </tr>
            `;
        });

        teamComposition += `
            </table>
        </div>
        `;
    }

    // 2. Actividades Realizadas
    for (const cai in teamsByCai) {
        const caiTeams = teamsByCai[cai];
        activities += `
        <div class="cai-section">
            <div class="cai-title">CAI ${cai}</div>
            <table>
                <tr>
                    <th>Cuadrante</th>
                    <th>Funcionarios</th>
                    <th>Actividades</th>
                </tr>
        `;

        caiTeams.forEach(team => {
            if (!team.quadrants || team.quadrants.length === 0) return;
            
            const quadrantNumbers = team.quadrants.map(q => q.name.slice(2)).join('-');
            const officers = team.contacts && team.contacts.length ? team.contacts.map(contact => 
                `${contact.GR || ''} ${contact.NOMBRES || ''} ${contact.APELLIDOS || ''}`
            ).join('<br>') : 'Sin funcionarios asignados';

            let activityList = '<ul class="activity-list">';
            if (team.activityHistory && team.activityHistory.length > 0) {
                team.activityHistory.forEach((activity, index) => {
                    if (!activity) return;
                    
                    const startTime = activity.startTime ? formatDateTime(activity.startTime) : 'No disponible';
                    const endTime = activity.endTime ? formatDateTime(activity.endTime) : 'En curso';
                    const duration = activity.startTime && activity.endTime ? 
                                    calculateDuration(activity.startTime, activity.endTime) : 'N/A';
                    
                    activityList += `
                        <li class="activity-item">
                            ${activity.motive || 'Actividad sin descripción'}<br>
                            Inicio: ${startTime}, Fin: ${endTime}, Duración: ${duration}
                    `;
                    
                    // Verificar resultados de manera segura
                    if (activityResults && 
                        activityResults[cai] && 
                        activityResults[cai][team.name] && 
                        activityResults[cai][team.name][index]) {
                        
                        const result = activityResults[cai][team.name][index];
                        activityList += `<br>Resultado: ${result}`;
                        
                        // Actualizar el resumen
                        if (!summaryData[cai]) summaryData[cai] = {};
                        if (!summaryData[cai][quadrantNumbers]) summaryData[cai][quadrantNumbers] = {};
                        if (!summaryData[cai][quadrantNumbers][result]) summaryData[cai][quadrantNumbers][result] = 0;
                        summaryData[cai][quadrantNumbers][result]++;
                    }
                    
                    activityList += `</li>`;
                });
            } else {
                activityList += '<li>No hay actividades registradas</li>';
            }
            activityList += '</ul>';

            activities += `
                <tr>
                    <td>${quadrantNumbers}</td>
                    <td>${officers}</td>
                    <td>${activityList}</td>
                </tr>
            `;
        });

        activities += `
            </table>
        </div>
        `;
    }

    // 3. Consolidado de Resultados
    let summaryTable = `
    <table>
        <tr>
            <th>CAI</th>
            <th>Cuadrante</th>
            <th>Resultado</th>
            <th>Cantidad</th>
        </tr>
    `;

    let hasSummaryData = false;
    for (const cai in summaryData) {
        for (const quadrant in summaryData[cai]) {
            for (const result in summaryData[cai][quadrant]) {
                hasSummaryData = true;
                const count = summaryData[cai][quadrant][result];
                summaryTable += `
                <tr>
                    <td>${cai}</td>
                    <td>${quadrant}</td>
                    <td>${result}</td>
                    <td>${count}</td>
                </tr>
                `;
            }
        }
    }

    if (!hasSummaryData) {
        summaryTable += `
        <tr>
            <td colspan="4" style="text-align: center;">No hay resultados registrados</td>
        </tr>
        `;
    }

    summaryTable += `</table>`;

    return { teamComposition, activities, summaryTable };
}

// Mejorar el reporte simplificado para mensajería
function generateSimplifiedReport() {
    try {
        let report = "Reporte de Actividades por CAI y Cuadrante\n\n";
        report += "Fecha y hora del reporte: " + new Date().toLocaleString('es-CO') + "\n\n";

        if (!teams || teams.length === 0) {
            return report + "No hay equipos o actividades registradas.";
        }

        const teamsByCai = groupTeamsByCai(teams);
        let summaryData = {};
        let reportLength = report.length;
        const MAX_LENGTH = 4000; // Limitar tamaño para mensajería

        for (const cai in teamsByCai) {
            const caiTeams = teamsByCai[cai];
            const caiHeader = `CAI ${cai}:\n` + "-".repeat(40) + "\n\n";
            report += caiHeader;
            reportLength += caiHeader.length;

            for (const team of caiTeams) {
                if (!team.quadrants || team.quadrants.length === 0) continue;
                
                const quadrantNumbers = team.quadrants.map(q => q.name.slice(2)).join('-');
                let teamSection = `Cuadrante(s) ${quadrantNumbers}:\n`;
                
                // Agregar nombres de los funcionarios
                teamSection += "Funcionarios asignados:\n";
                if (team.contacts && team.contacts.length) {
                    team.contacts.forEach(contact => {
                        teamSection += `- ${contact.GR || ''} ${contact.NOMBRES || ''} ${contact.APELLIDOS || ''}`;
                        if (contact.PLACA) {
                            teamSection += ` - Placa: ${contact.PLACA}`;
                        }
                        teamSection += "\n";
                    });
                } else {
                    teamSection += "- Sin funcionarios asignados\n";
                }
                teamSection += "\n";
                
                if (team.activityHistory && team.activityHistory.length) {
                    team.activityHistory.forEach((activity, index) => {
                        if (!activity) return;
                        
                        const startTime = activity.startTime ? formatDateTime(activity.startTime) : 'No disponible';
                        const endTime = activity.endTime ? formatDateTime(activity.endTime) : 'En curso';
                        const duration = activity.startTime && activity.endTime ? 
                                        calculateDuration(activity.startTime, activity.endTime) : 'N/A';
                        
                        teamSection += `- ${activity.motive || 'Actividad sin descripción'}\n`;
                        teamSection += `  Inicio: ${startTime}, Fin: ${endTime}, Duración: ${duration}\n`;
                        
                        if (activityResults && 
                            activityResults[cai] && 
                            activityResults[cai][team.name] && 
                            activityResults[cai][team.name][index]) {
                            
                            const result = activityResults[cai][team.name][index];
                            teamSection += `  Resultado: ${result}\n`;
                            
                            // Actualizar el resumen
                            if (!summaryData[cai]) summaryData[cai] = {};
                            if (!summaryData[cai][quadrantNumbers]) summaryData[cai][quadrantNumbers] = {};
                            if (!summaryData[cai][quadrantNumbers][result]) summaryData[cai][quadrantNumbers][result] = 0;
                            summaryData[cai][quadrantNumbers][result]++;
                        }
                    });
                } else {
                    teamSection += "- No hay actividades registradas\n";
                }
                
                teamSection += "\n";
                
                // Verificar si agregar esta sección excedería el límite
                if (reportLength + teamSection.length > MAX_LENGTH) {
                    report += "... [Informe truncado por límite de tamaño] ...\n\n";
                    break;
                }
                
                report += teamSection;
                reportLength += teamSection.length;
            }
            
            // Si ya excedimos el límite, no seguir procesando CAIs
            if (reportLength > MAX_LENGTH) {
                break;
            }
        }

        // Añadir resumen solo si hay espacio
        if (reportLength < MAX_LENGTH) {
            const summaryHeader = "Resumen de Resultados:\n" + "=".repeat(40) + "\n\n";
            report += summaryHeader;
            reportLength += summaryHeader.length;
            
            let hasSummary = false;
            for (const cai in summaryData) {
                for (const quadrant in summaryData[cai]) {
                    for (const result in summaryData[cai][quadrant]) {
                        const count = summaryData[cai][quadrant][result];
                        const line = `${cai} - ${quadrant}: ${result} (${count})\n`;
                        
                        if (reportLength + line.length > MAX_LENGTH) {
                            report += "... [Resumen truncado por límite de tamaño] ...\n";
                            return report;
                        }
                        
                        report += line;
                        reportLength += line.length;
                        hasSummary = true;
                    }
                }
            }
            
            if (!hasSummary) {
                report += "No hay resultados registrados.\n";
            }
        }

        return report;
    } catch (error) {
        console.error('Error al generar reporte simplificado:', error);
        return "Error al generar el reporte. Por favor, intente de nuevo.";
    }
}

// Mejor manejo de tiempos
function calculateDuration(startTime, endTime = new Date()) {
    if (!startTime || !(startTime instanceof Date) || isNaN(startTime.getTime())) return 'N/A';
    if (!endTime || !(endTime instanceof Date) || isNaN(endTime.getTime())) return 'N/A';

    const difference = endTime.getTime() - startTime.getTime();
    if (difference < 0) return 'N/A'; // Error en las fechas
    
    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
}

function formatDateTime(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return 'Fecha no disponible';
    }
    
    try {
        return date.toLocaleString('es-CO', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
        });
    } catch (error) {
        console.error('Error al formatear fecha:', error);
        return date.toString();
    }
}
// Manejo de errores en generación de reportes
function sendReportWhatsApp() {
    try {
        const report = generateSimplifiedReport();
        if (!report) {
            alert('No se pudo generar el reporte. Intente de nuevo.');
            return;
        }
        
        const encodedReport = encodeURIComponent(report);
        // Verificar si el reporte es demasiado largo
        if (encodedReport.length > 4000) {
            alert('El reporte es demasiado grande para compartir por WhatsApp. Intente generar un reporte con menos equipos o actividades.');
            return;
        }
        
        const whatsappUrl = `https://wa.me/?text=${encodedReport}`;
        const newWindow = window.open(whatsappUrl, '_blank');
        
        if (!newWindow) {
            alert('El navegador bloqueó la apertura de WhatsApp. Por favor, permita ventanas emergentes para este sitio.');
        }
    } catch (error) {
        console.error('Error al enviar reporte por WhatsApp:', error);
        alert('Hubo un problema al compartir el reporte. Intente de nuevo.');
    }
}

function sendReportEmail() {
    try {
        const report = generateSimplifiedReport();
        if (!report) {
            alert('No se pudo generar el reporte. Intente de nuevo.');
            return;
        }
        
        const subject = encodeURIComponent('Reporte de Actividades por CAI y Cuadrante');
        const body = encodeURIComponent(report);
        
        // Verificar si el reporte es demasiado largo
        if (body.length > 8000) {
            alert('El reporte es demasiado grande para compartir por correo electrónico desde la aplicación. Considere generar un reporte PDF.');
            return;
        }
        
        const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
        window.location.href = mailtoLink;
    } catch (error) {
        console.error('Error al enviar reporte por email:', error);
        alert('Hubo un problema al compartir el reporte. Intente de nuevo.');
    }
}

function loadOfficerDropdowns() {
    const officerSearchInputs = document.querySelectorAll('.officer-search');
    
    officerSearchInputs.forEach((input, index) => {
        const resultsContainer = document.getElementById(`officer-results-${index + 1}`);
        if (!resultsContainer) {
            console.error(`No se encontró el contenedor de resultados para el índice ${index + 1}`);
            return;
        }
        
        input.addEventListener('input', () => {
            filterOfficers(input.value, resultsContainer, index);
        });

        input.addEventListener('focus', () => {
            resultsContainer.style.display = 'block';
            filterOfficers(input.value, resultsContainer, index);
        });

        // Añadir soporte para dispositivos táctiles
        input.addEventListener('touchstart', () => {
            input.focus();
        });

        document.addEventListener('click', (event) => {
            if (!input.contains(event.target) && !resultsContainer.contains(event.target)) {
                resultsContainer.style.display = 'none';
            }
        });
        
        document.addEventListener('touchend', (event) => {
            if (!input.contains(event.target) && !resultsContainer.contains(event.target)) {
                resultsContainer.style.display = 'none';
            }
        });
    });
}

function filterOfficers(query, resultsElement, officerIndex) {
    if (!contactsList || !Array.isArray(contactsList) || contactsList.length === 0) {
        resultsElement.innerHTML = '<div class="officer-result-item">Por favor, cargue el archivo de contactos</div>';
        resultsElement.style.display = 'block';
        return;
    }

    // Obtener cédulas de funcionarios ya asignados
    const assignedOfficers = new Set();
    teams.forEach(team => {
        if (team.contacts && Array.isArray(team.contacts)) {
            team.contacts.forEach(contact => {
                if (contact && contact.CC) {
                    assignedOfficers.add(contact.CC.toString());
                }
            });
        }
    });
    
    // No excluir al oficial actualmente seleccionado
    if (selectedOfficers[officerIndex] && selectedOfficers[officerIndex].CC) {
        assignedOfficers.delete(selectedOfficers[officerIndex].CC.toString());
    }
    
    const filteredOfficers = contactsList.filter(officer => {
        if (!officer || !officer.CC) return false;
        
        const isAssigned = assignedOfficers.has(officer.CC.toString());
        const matchesQuery = `${officer.GR || ''} ${officer.APELLIDOS || ''} ${officer.NOMBRES || ''}`.toLowerCase().includes(query.toLowerCase());
        
        return !isAssigned && matchesQuery;
    });

    resultsElement.innerHTML = '';
    
    if (filteredOfficers.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'officer-result-item';
        noResults.textContent = 'No se encontraron funcionarios disponibles';
        resultsElement.appendChild(noResults);
    } else {
        filteredOfficers.forEach(officer => {
            const item = document.createElement('div');
            item.className = 'officer-result-item';
            item.textContent = `${officer.GR || ''} ${officer.APELLIDOS || ''} ${officer.NOMBRES || ''}`;
            
            item.onclick = () => {
                selectOfficer(officer, officerIndex);
                resultsElement.style.display = 'none';
            };
            
            // Añadir soporte táctil
            item.ontouchend = (e) => {
                selectOfficer(officer, officerIndex);
                resultsElement.style.display = 'none';
                e.preventDefault(); // Prevenir eventos tap dobles
            };
            
            resultsElement.appendChild(item);
        });
    }

    resultsElement.style.display = 'block';
}

function selectOfficer(officer, index) {
    if (!officer || typeof index !== 'number' || index < 0 || index > 1) {
        console.error('Parámetros inválidos para selectOfficer:', officer, index);
        return;
    }
    
    // Verificar si el otro oficial ya está seleccionado
    if (selectedOfficers[1 - index] && selectedOfficers[1 - index].CC === officer.CC) {
        alert('Este funcionario ya está seleccionado. Por favor, elija otro.');
        return;
    }

    selectedOfficers[index] = officer;
    const inputs = document.querySelectorAll('.officer-search');
    if (inputs[index]) {
        inputs[index].value = `${officer.GR || ''} ${officer.APELLIDOS || ''} ${officer.NOMBRES || ''}`;
    }
    updateCreateTeamButton();
    saveToLocalStorage();
}

function updateOfficerDropdowns() {
    const inputs = document.querySelectorAll('.officer-search');
    inputs.forEach((input, index) => {
        if (selectedOfficers[index]) {
            const officer = selectedOfficers[index];
            input.value = `${officer.GR || ''} ${officer.APELLIDOS || ''} ${officer.NOMBRES || ''}`;
        } else {
            input.value = '';
        }
    });
}

function updateCreateTeamButton() {
    const createTeamButton = document.getElementById('createTeamButton');
    if (!createTeamButton) return;
    
    const hasOfficers = selectedOfficers[0] && selectedOfficers[1];
    const hasQuadrants = selectedQuadrants && selectedQuadrants.length > 0;
    
    createTeamButton.disabled = !(hasOfficers && hasQuadrants);
}

function toggleCreateTeamElements(show) {
    const officerSelection = document.querySelector('.officer-selection');
    const createTeamButton = document.getElementById('createTeamButton');
    
    if (!officerSelection || !createTeamButton) return;
    
    if (show) {
        officerSelection.style.display = 'flex';
        createTeamButton.style.display = 'block';
    } else {
        officerSelection.style.display = 'none';
        createTeamButton.style.display = 'none';
    }
}

function handleLoadError(error) {
    console.error('Error al cargar los datos:', error);
    alert('Hubo un error al cargar los datos. Por favor, recargue la página o contacte al administrador.');
    
    // Inicializar con valores predeterminados para evitar errores fatales
    quadrants = [];
    teams = [];
    motivesList = [];
    contactsList = [];
    selectedQuadrants = [];
    selectedOfficers = [null, null];
    activityResults = {};
    
    // Intentar cargar datos mínimos para que la aplicación funcione
    fetch('cuadrantes.json')
        .then(response => response.json())
        .then(data => {
            quadrants = data;
            renderQuadrants();
        })
        .catch(() => {
            alert('No se pudieron cargar los datos básicos. La aplicación podría no funcionar correctamente.');
        });
}

// Funciones para implementación de búsqueda por voz

// Función para agregar búsqueda por voz a todos los inputs de búsqueda
function setupVoiceSearch() {
    // Verificar si el navegador soporta la API de reconocimiento de voz
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.log('El navegador no soporta reconocimiento de voz.');
        return;
    }

    // Obtener todos los campos de búsqueda
    const searchInputs = [
        ...document.querySelectorAll('.officer-search'),
        ...document.querySelectorAll('.search-input')
    ];

    // Agregar el botón de voz a cada campo de búsqueda
    searchInputs.forEach(input => {
        addVoiceButtonTo(input);
    });

    // Agregar un observador para detectar nuevos campos de búsqueda añadidos dinámicamente
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const newInputs = [
                            ...node.querySelectorAll('.officer-search'),
                            ...node.querySelectorAll('.search-input')
                        ];
                        newInputs.forEach(input => addVoiceButtonTo(input));
                    }
                });
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Función para agregar el botón de voz a un input específico
function addVoiceButtonTo(input) {
    // Verificar si ya tiene el botón de voz
    if (input.parentNode.querySelector('.voice-button')) return;

    // Crear el botón de voz
    const voiceButton = document.createElement('button');
    voiceButton.type = 'button';
    voiceButton.className = 'voice-button';
    voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
    voiceButton.title = 'Búsqueda por voz';
    
    // Posicionar el botón correctamente en relación al input
    const inputStyle = window.getComputedStyle(input);
    const inputHeight = parseInt(inputStyle.height);
    
    // Ajustar el estilo del contenedor si es necesario
    const parentElement = input.parentNode;
    if (window.getComputedStyle(parentElement).position === 'static') {
        parentElement.style.position = 'relative';
    }
    
    // Estilo para el botón de voz
    voiceButton.style.position = 'absolute';
    voiceButton.style.right = '8px';
    voiceButton.style.top = '50%';
    voiceButton.style.transform = 'translateY(-50%)';
    voiceButton.style.background = 'transparent';
    voiceButton.style.border = 'none';
    voiceButton.style.color = '#007bff';
    voiceButton.style.cursor = 'pointer';
    voiceButton.style.zIndex = '10';
    voiceButton.style.fontSize = '16px';
    
    // Ajustar el padding del input para evitar que el texto se superponga con el botón
    input.style.paddingRight = '30px';
    
    // Agregar el botón al DOM
    parentElement.appendChild(voiceButton);
    
    // Agregar evento de clic al botón
    voiceButton.addEventListener('click', () => {
        startSpeechRecognition(input, voiceButton);
    });
}


        }
    };
    
    recognition.onerror = (event) => {
        console.error('Error en reconocimiento de voz:', event.error);
        
        // Función para iniciar el reconocimiento de voz (VERSIÓN CORREGIDA)
function startSpeechRecognition(input, button) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'es-CO';  // Establecer el idioma a español de Colombia
    recognition.continuous = true; // Cambiar a continuo para capturar frases más largas
    recognition.interimResults = true; // Mostrar resultados intermedios para mejor retroalimentación
    
    // Variable para almacenar texto previo (para búsquedas consecutivas)
    const previousText = input.value.trim();
    
    // Cambiar el ícono mientras escucha
    button.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    button.style.color = '#dc3545';
    
    // Mostrar indicador visual de que está escuchando
    const listeningIndicator = document.createElement('div');
    listeningIndicator.className = 'listening-indicator';
    listeningIndicator.textContent = 'Escuchando...';
    listeningIndicator.style.position = 'absolute';
    listeningIndicator.style.top = '100%';
    listeningIndicator.style.left = '0';
    listeningIndicator.style.right = '0';
    listeningIndicator.style.textAlign = 'center';
    listeningIndicator.style.backgroundColor = '#007bff';
    listeningIndicator.style.color = 'white';
    listeningIndicator.style.padding = '4px';
    listeningIndicator.style.borderRadius = '0 0 4px 4px';
    listeningIndicator.style.fontSize = '12px';
    listeningIndicator.style.zIndex = '100';
    
    input.parentNode.appendChild(listeningIndicator);
    
    let finalTranscript = previousText;
    
    recognition.onresult = (event) => {
        let interimTranscript = '';
        
        // Combinar todos los resultados para frases más complejas
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                // Limpiar el resultado final (eliminar puntos finales y espacios extra)
                let cleanTranscript = transcript.trim();
                if (cleanTranscript.endsWith('.')) {
                    cleanTranscript = cleanTranscript.slice(0, -1);
                }
                
                // Agregar a texto previo si existe
                if (finalTranscript) {
                    finalTranscript += ' ' + cleanTranscript;
                } else {
                    finalTranscript = cleanTranscript;
                }
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Mostrar resultados intermedios para retroalimentación
        if (interimTranscript) {
            // Mostrar combinación de texto final y provisional
            let displayText = finalTranscript;
            if (displayText && interimTranscript) {
                displayText += ' ' + interimTranscript;
            } else if (interimTranscript) {
                displayText = interimTranscript;
            }
            
            input.value = displayText;
        } else {
            input.value = finalTranscript;
        }
        
        // Solo disparar el evento input cuando hay resultados finales
        // para evitar búsquedas en cada palabra intermedia
        if (finalTranscript) {
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };
    
    // Usar un temporizador para detener automáticamente después de un tiempo sin hablar
    let silenceTimer;
    const resetSilenceTimer = () => {
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
            recognition.stop();
        }, 3000); // Detener después de 3 segundos de silencio
    };
    
    recognition.onaudiostart = resetSilenceTimer;
    recognition.onsoundstart = resetSilenceTimer;
    recognition.onspeechstart = resetSilenceTimer;
    recognition.onspeechend = resetSilenceTimer;
    
    recognition.onend = () => {
        clearTimeout(silenceTimer);
        button.innerHTML = '<i class="fas fa-microphone"></i>';
        button.style.color = '#007bff';
        
        if (listeningIndicator.parentNode) {
            listeningIndicator.parentNode.removeChild(listeningIndicator);
        }
        
        // Enfoque en el input al terminar y posicionar cursor al final
        input.focus();
        const length = input.value.length;
        input.setSelectionRange(length, length);
    };
    
    recognition.onerror = (event) => {
        console.error('Error en reconocimiento de voz:', event.error);
        button.innerHTML = '<i class="fas fa-microphone"></i>';
        button.style.color = '#007bff';
        
        if (listeningIndicator.parentNode) {
            listeningIndicator.parentNode.removeChild(listeningIndicator);
        }
        
        if (event.error !== 'no-speech') {
            // No mostrar error si simplemente no habló el usuario
            alert('Error en el reconocimiento de voz: ' + event.error);
        }
    };
    
    recognition.start();
}

// Agregar estilos CSS para los elementos de búsqueda por voz
function addVoiceSearchStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .voice-button {
            transition: color 0.3s ease;
        }
        
        .voice-button:hover {
            color: #0056b3 !important;
        }
        
        .voice-button:active {
            transform: translateY(-50%) scale(0.95);
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .listening-indicator {
            animation: pulse 1.5s infinite;
        }
        
        /* Ajuste para los cuadros de búsqueda en el diálogo de resultados */
        .activity-result-dialog input {
            padding-right: 30px !important;
        }
    `;
    document.head.appendChild(style);
}

// Iniciar la aplicación
loadData();
