// Variables globales
let quadrants = [];
let teams = [];
let motivesList = [];
let contactsList = [];
let selectedQuadrants = [];
let selectedOfficers = [null, null];
let activityResults = {};

// Función principal para cargar datos
async function loadData() {
    try {
        const localData = loadFromLocalStorage();
        if (localData) {
            ({ quadrants, teams, motivesList, selectedQuadrants, selectedOfficers, activityResults } = localData);
            contactsList = JSON.parse(localStorage.getItem('contactsList') || '[]');
        } else {
            const [quadrantsResponse, motivesResponse] = await Promise.all([
                fetch('cuadrantes.json'),
                fetch('claves_policiales.json')
            ]);
            quadrants = await quadrantsResponse.json();
            motivesList = await motivesResponse.json();
            saveToLocalStorage();
        }
        
        initializeApp();
    } catch (error) {
        handleLoadError(error);
    }
}

// Inicialización de la aplicación
function initializeApp() {
    renderQuadrants();
    renderTeams();
    setupEventListeners();
    startTimers();
    setupFileUpload();
    loadOfficerDropdowns();
    updateCreateTeamButton();
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
                    contactsList = JSON.parse(e.target.result);
                    localStorage.setItem('contactsList', JSON.stringify(contactsList));
                    fileStatus.textContent = 'Lista de funcionarios cargada y guardada correctamente';
                    fileStatus.style.color = 'green';
                    loadOfficerDropdowns();
                    saveToLocalStorage();

                    uploadButton.innerHTML = '<i class="fas fa-check"></i> Lista cargada';
                    uploadButton.style.backgroundColor = '#28a745';
                } catch (error) {
                    console.error('Error al parsear el archivo JSON:', error);
                    fileStatus.textContent = 'Error al cargar el archivo. Asegúrese de que es un JSON válido.';
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
            quadrantDiv.dataset.id = q.id;
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
    return teams.some(team => team.quadrants.some(q => q.id === quadrantId));
}

// Renderizado de equipos
function renderTeams() {
    const teamsList = document.getElementById('teamsList');
    teamsList.innerHTML = '';

    const sortedTeams = teams.sort((a, b) => {
        return parseInt(a.quadrants[0].name.slice(2)) - parseInt(b.quadrants[0].name.slice(2));
    });

    const inactiveTeams = sortedTeams.filter(team => !team.active);
    const activeTeams = sortedTeams.filter(team => team.active);

    const inactiveTeamsByCai = groupTeamsByCai(inactiveTeams);
    const activeTeamsByCai = groupTeamsByCai(activeTeams);

    // Render inactive teams first
    for (const [cai, caiTeams] of Object.entries(inactiveTeamsByCai)) {
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
    for (const [cai, caiTeams] of Object.entries(activeTeamsByCai)) {
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
                ${team.active ? `
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
                <span class="assignment-time">${formatDate(team.assignedTime)}</span>
                <span class="activity">Actividad: ${team.selectedMotive}</span>
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
                        <button class="call-officer-button" onclick="callOfficer('${contact.CELULAR}')" title="Llamar al funcionario">
                            <i class="fas fa-phone"></i>
                        </button>
                        ${contact.GR} ${contact.NOMBRES} ${contact.APELLIDOS}
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

    document.addEventListener('click', (event) => {
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

    document.getElementById('createTeamButton').addEventListener('click', createTeam);
}

// Alternar selección de cuadrante
function toggleQuadrantSelection(quadrantId) {
    const index = selectedQuadrants.indexOf(quadrantId);
    if (index > -1) {
        selectedQuadrants.splice(index, 1);
    } else {
        selectedQuadrants.push(quadrantId);
    }
    updateQuadrantStyles();
    updateCreateTeamButton();
    saveToLocalStorage();
}

// Actualizar estilos de cuadrantes
function updateQuadrantStyles() {
    document.querySelectorAll('.quadrant-item').forEach(item => {
        if (selectedQuadrants.includes(item.dataset.id)) {
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
            .map(id => quadrants.find(q => q.id === id))
            .filter(q => q)
            .sort((a, b) => parseInt(a.name.slice(2)) - parseInt(b.name.slice(2)));

        const teamName = 'C-' + teamQuadrants.map(q => q.name.slice(2)).join('-');
        
        const newTeam = {
            name: teamName,
            quadrants: teamQuadrants,
            active: false,
            selectedMotive: '',
            activityHistory: [],
            contacts: selectedOfficers
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
            if (!quadrants.some(quad => quad.id === q.id)) {
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
        <input type="text" id="resultSearch" placeholder="Buscar resultado...">
        <div id="resultsList"></div>
        <button id="confirmResult" disabled>Confirmar</button>
    `;
    document.body.appendChild(dialog);

    const resultSearch = document.getElementById('resultSearch');
    const resultsList = document.getElementById('resultsList');
    const confirmButton = document.getElementById('confirmResult');

    resultSearch.addEventListener('input', () => {
        const results = searchActivityResults(resultSearch.value);
        displayActivityResults(results, resultsList);
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
    const initialResults = searchActivityResults('');
    displayActivityResults(initialResults, resultsList);
}

function searchActivityResults(query) {
    // Esta es una lista de ejemplo, deberías reemplazarla con tu propia lista de resultados
    const allResults = [
        'Captura', 'Comparendo', 'Traslado por Protección', 'Apoyo brindado',
        'Informe elaborado', 'Operativo exitoso', 'Accidente atendido', 'Denuncia recibida'
    ];
    return allResults.filter(result => result.toLowerCase().includes(query.toLowerCase()));
}

function displayActivityResults(results, container) {
    container.innerHTML = '';
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
    const cai = team.quadrants[0].cai;
    const activityIndex = team.activityHistory.length - 1;
    
    if (!activityResults[cai]) {
        activityResults[cai] = {};
    }
    if (!activityResults[cai][team.name]) {
        activityResults[cai][team.name] = [];
    }
    
    activityResults[cai][team.name][activityIndex] = result;
    saveToLocalStorage();
}

function completeTeamDeactivation(team) {
    team.active = false;
    const endTime = new Date();
    team.activityHistory[team.activityHistory.length - 1].endTime = endTime;
    team.selectedMotive = '';
    team.assignedTime = null;
    renderTeams();
    updateTimers();
    saveToLocalStorage();
}

function filterMotives(query, resultsElement, team) {
    const filteredMotives = motivesList.filter(motive => 
        motive.text.toLowerCase().includes(query.toLowerCase()) ||
        motive.value.includes(query)
    );

    resultsElement.innerHTML = '';
    filteredMotives.forEach(motive => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.textContent = motive.text;
        item.onmousedown = () => {
            selectMotive(motive.value, team);
            resultsElement.parentNode.querySelector('.search-input').value = motive.text;
            resultsElement.style.display = 'none';
        };
        resultsElement.appendChild(item);
    });

    resultsElement.style.display = filteredMotives.length > 0 ? 'block' : 'none';
}

function selectMotive(motiveCode, team) {
    const motiveDescription = motivesList.find(motive => motive.value === motiveCode)?.text || '';
    team.selectedMotive = motiveDescription;
    team.assignedTime = new Date();
    
    const teamElement = document.querySelector(`.team-item[data-team-name="${team.name}"]`);
    if (teamElement) {
        const searchInput = teamElement.querySelector('.search-input');
        const activateButton = teamElement.querySelector('.activate-button');
        
        if (searchInput) {
            searchInput.value = motiveDescription;
            searchInput.classList.add('motive-selected');
        }
        
        if (activateButton) {
            activateButton.disabled = false;
        }
    }
    saveToLocalStorage();
}

function activateTeam(teamName) {
    const team = teams.find(t => t.name === teamName);
    if (team && team.selectedMotive) {
        team.active = true;
        const startTime = new Date();
        team.assignedTime = startTime;
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
    if (!(date instanceof Date)) {
        return 'Fecha no disponible';
    }
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function groupByCai(items) {
    return items.reduce((groups, item) => {
        if (!groups[item.cai]) {
            groups[item.cai] = [];
        }
        groups[item.cai].push(item);
        return groups;
    }, {});
}

function groupTeamsByCai(teams) {
    return teams.reduce((groups, team) => {
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
        updateTimer(timer, startTime);
    });
}

function updateTimer(timerElement, startTime) {
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
    if (team && team.quadrants.length > 0) {
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

function saveToLocalStorage() {
    const dataToSave = {
        quadrants,
        teams,
        motivesList,
        selectedQuadrants,
        selectedOfficers,
        activityResults
    };
    localStorage.setItem('policeQuadrantsData', JSON.stringify(dataToSave));
    localStorage.setItem('contactsList', JSON.stringify(contactsList));
}

function loadFromLocalStorage() {
    const savedData = localStorage.getItem('policeQuadrantsData');
    const savedContacts = localStorage.getItem('contactsList');
    if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (parsedData.teams) {
            parsedData.teams.forEach(team => {
                if (team.assignedTime) {
                    team.assignedTime = new Date(team.assignedTime);
                }
                if (team.activityHistory) {
                    team.activityHistory.forEach(activity => {
                        activity.startTime = new Date(activity.startTime);
                        if (activity.endTime) {
                            activity.endTime = new Date(activity.endTime);
                        }
                    });
                }
            });
        }
        if (savedContacts) {
            parsedData.contactsList = JSON.parse(savedContacts);
        }
        return parsedData;
    }
    return null;
}

function resetLocalStorage() {
    if (confirm('¿Está seguro de que desea reiniciar todos los datos para un nuevo turno? Esta acción no se puede deshacer.')) {
        localStorage.removeItem('policeQuadrantsData');
        localStorage.removeItem('contactsList');
        location.reload();
    }
}

function generateReport() {
    const reportContent = generateReportContent();
    const reportWindow = window.open('', 'Reporte', 'width=800,height=600');
    reportWindow.document.write(reportContent);
    reportWindow.document.close();
    reportWindow.print();  // Abre el diálogo de impresión automáticamente
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

    const teamsByCai = groupTeamsByCai(teams);

    // 1. Conformación de Equipos
    for (const [cai, caiTeams] of Object.entries(teamsByCai)) {
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
            const quadrantNumbers = team.quadrants.map(q => q.name.slice(2)).join('-');
            const officers = team.contacts.map(contact => 
                `${contact.GR} ${contact.NOMBRES} ${contact.APELLIDOS}${contact.PLACA ? ` - Placa: ${contact.PLACA}` : ''}`
            ).join('<br>');

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
    for (const [cai, caiTeams] of Object.entries(teamsByCai)) {
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
            const quadrantNumbers = team.quadrants.map(q => q.name.slice(2)).join('-');
            const officers = team.contacts.map(contact => 
                `${contact.GR} ${contact.NOMBRES} ${contact.APELLIDOS}`
            ).join('<br>');

            







let activityList = '<ul class="activity-list">';
            team.activityHistory.forEach((activity, index) => {
                const startTime = formatDateTime(activity.startTime);
                const endTime = activity.endTime ? formatDateTime(activity.endTime) : 'En curso';
                const duration = activity.endTime ? calculateDuration(activity.startTime, activity.endTime) : 'N/A';
                
                activityList += `
                    <li class="activity-item">
                        ${activity.motive}<br>
                        Inicio: ${startTime}, Fin: ${endTime}, Duración: ${duration}
                `;
                
                if (activityResults[cai] && activityResults[cai][team.name] && activityResults[cai][team.name][index]) {
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

    for (const [cai, caiData] of Object.entries(summaryData)) {
        for (const [quadrant, results] of Object.entries(caiData)) {
            for (const [result, count] of Object.entries(results)) {
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

    summaryTable += `</table>`;

    return { teamComposition, activities, summaryTable };
}

function generateSimplifiedReport() {
    let report = "Reporte de Actividades por CAI y Cuadrante\n\n";
    report += "Fecha y hora del reporte: " + new Date().toLocaleString('es-CO') + "\n\n";

    const teamsByCai = groupTeamsByCai(teams);
    let summaryData = {};

    for (const [cai, caiTeams] of Object.entries(teamsByCai)) {
        report += `CAI ${cai}:\n`;
        report += "-".repeat(40) + "\n\n";

        caiTeams.forEach(team => {
            const quadrantNumbers = team.quadrants.map(q => q.name.slice(2)).join('-');
            report += `Cuadrante(s) ${quadrantNumbers}:\n`;
            
            // Agregar nombres de los funcionarios
            report += "Funcionarios asignados:\n";
            team.contacts.forEach(contact => {
                report += `- ${contact.GR} ${contact.NOMBRES} ${contact.APELLIDOS}`;
                if (contact.PLACA) {
                    report += ` - Placa: ${contact.PLACA}`;
                }
                report += "\n";
            });
            report += "\n";
            
            team.activityHistory.forEach((activity, index) => {
                const startTime = formatDateTime(activity.startTime);
                const endTime = activity.endTime ? formatDateTime(activity.endTime) : 'En curso';
                const duration = activity.endTime ? calculateDuration(activity.startTime, activity.endTime) : 'N/A';
                report += `- ${activity.motive}\n`;
                report += `  Inicio: ${startTime}, Fin: ${endTime}, Duración: ${duration}\n`;
                
                if (activityResults[cai] && activityResults[cai][team.name] && activityResults[cai][team.name][index]) {
                    const result = activityResults[cai][team.name][index];
                    report += `  Resultado: ${result}\n`;
                    
                    // Actualizar el resumen
                    if (!summaryData[cai]) summaryData[cai] = {};
                    if (!summaryData[cai][quadrantNumbers]) summaryData[cai][quadrantNumbers] = {};
                    if (!summaryData[cai][quadrantNumbers][result]) summaryData[cai][quadrantNumbers][result] = 0;
                    summaryData[cai][quadrantNumbers][result]++;
                }
            });
            
            report += "\n";
        });
    }

    report += "Resumen de Resultados:\n";
    report += "=".repeat(40) + "\n\n";

    for (const [cai, caiData] of Object.entries(summaryData)) {
        for (const [quadrant, results] of Object.entries(caiData)) {
            for (const [result, count] of Object.entries(results)) {
                report += `${cai} - ${quadrant}: ${result} (${count})\n`;
            }
        }
    }

    return report;
}

function calculateDuration(startTime, endTime = new Date()) {
    if (!startTime) return 'N/A';

    const difference = endTime - startTime;
    
    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
}

function formatDateTime(date) {
    return new Date(date).toLocaleString('es-CO', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
    });
}

function sendReportWhatsApp() {
    const report = generateSimplifiedReport();
    const encodedReport = encodeURIComponent(report);
    const whatsappUrl = `https://wa.me/?text=${encodedReport}`;
    window.open(whatsappUrl, '_blank');
}

function sendReportEmail() {
    const report = generateSimplifiedReport();
    const subject = encodeURIComponent('Reporte de Actividades por CAI y Cuadrante');
    const body = encodeURIComponent(report);
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
}

function loadOfficerDropdowns() {
    const officerSearchInputs = document.querySelectorAll('.officer-search');
    
    officerSearchInputs.forEach((input, index) => {
        const resultsContainer = document.getElementById(`officer-results-${index + 1}`);
        
        input.addEventListener('input', () => {
            filterOfficers(input.value, resultsContainer, index);
        });

        input.addEventListener('focus', () => {
            resultsContainer.style.display = 'block';
            filterOfficers(input.value, resultsContainer, index);
        });

        document.addEventListener('click', (event) => {
            if (!input.contains(event.target) && !resultsContainer.contains(event.target)) {
                resultsContainer.style.display = 'none';
            }
        });
    });
}

function filterOfficers(query, resultsElement, officerIndex) {
    if (!contactsList || contactsList.length === 0) {
        resultsElement.innerHTML = '<div class="officer-result-item">Por favor, cargue el archivo de contactos</div>';
        resultsElement.style.display = 'block';
        return;
    }

    const assignedOfficers = new Set(teams.flatMap(team => team.contacts.map(contact => contact.CC)));
    
    const filteredOfficers = contactsList.filter(officer => 
        !assignedOfficers.has(officer.CC) &&
        `${officer.GR} ${officer.APELLIDOS} ${officer.NOMBRES}`.toLowerCase().includes(query.toLowerCase())
    );

    resultsElement.innerHTML = '';
    filteredOfficers.forEach(officer => {
        const item = document.createElement('div');
        item.className = 'officer-result-item';
        item.textContent = `${officer.GR} ${officer.APELLIDOS} ${officer.NOMBRES}`;
        item.onclick = () => {
            selectOfficer(officer, officerIndex);
            resultsElement.style.display = 'none';
        };
        resultsElement.appendChild(item);
    });

    resultsElement.style.display = filteredOfficers.length > 0 ? 'block' : 'none';
}

function selectOfficer(officer, index) {
    if (selectedOfficers[1 - index] && selectedOfficers[1 - index].CC === officer.CC) {
        alert('Este funcionario ya está seleccionado. Por favor, elija otro.');
        return;
    }

    selectedOfficers[index] = officer;
    const inputs = document.querySelectorAll('.officer-search');
    inputs[index].value = `${officer.GR} ${officer.APELLIDOS} ${officer.NOMBRES}`;
    updateCreateTeamButton();
    saveToLocalStorage();
}

function updateOfficerDropdowns() {
    const inputs = document.querySelectorAll('.officer-search');
    inputs.forEach((input, index) => {
        if (selectedOfficers[index]) {
            const officer = selectedOfficers[index];
            input.value = `${officer.GR} ${officer.APELLIDOS} ${officer.NOMBRES}`;
        } else {
            input.value = '';
        }
    });
}

function updateCreateTeamButton() {
    const createTeamButton = document.getElementById('createTeamButton');
    createTeamButton.disabled = !(selectedOfficers[0] && selectedOfficers[1] && selectedQuadrants.length > 0);
}

function toggleCreateTeamElements(show) {
    const officerSelection = document.querySelector('.officer-selection');
    const createTeamButton = document.getElementById('createTeamButton');
    
    if (show) {
        officerSelection.style.display = 'flex';
        createTeamButton.style.display = 'block';
    } else {
        officerSelection.style.display = 'none';
        createTeamButton.style.display = 'none';
    }
}

function updateUIAfterDataLoad() {
    renderQuadrants();
    renderTeams();
    updateOfficerDropdowns();
    updateCreateTeamButton();
}

function initializeApp() {
    setupEventListeners();
    startTimers();
    setupFileUpload();
    loadOfficerDropdowns();
    updateUIAfterDataLoad();
}

function handleLoadError(error) {
    console.error('Error al cargar los datos:', error);
    alert('Hubo un error al cargar los datos. Por favor, recargue la página o contacte al administrador.');
}

async function loadData() {
    try {
        const localData = loadFromLocalStorage();
        if (localData) {
            ({ quadrants, teams, motivesList, selectedQuadrants, selectedOfficers, activityResults } = localData);
            contactsList = JSON.parse(localStorage.getItem('contactsList') || '[]');
        } else {
            const [quadrantsResponse, motivesResponse] = await Promise.all([
                fetch('cuadrantes.json'),
                fetch('claves_policiales.json')
            ]);
            quadrants = await quadrantsResponse.json();
            motivesList = await motivesResponse.json();
            saveToLocalStorage();
        }
        
        initializeApp();
    } catch (error) {
        handleLoadError(error);
    }
}

// Iniciar la aplicación
loadData();
