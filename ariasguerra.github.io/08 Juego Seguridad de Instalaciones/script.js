document.addEventListener("DOMContentLoaded", function() {
    const ballIconContainer = document.getElementById("ball-icon-container");
    if (ballIconContainer) {
        ballIconContainer.addEventListener('click', generateNumber);
    } else {
        console.error("No se encontró el contenedor del ícono de bola.");
    }
});

// Lista de riesgos original
const originalRisks = [
    "Falta de controles de acceso biométricos o digitales.",
    "Vulnerabilidad a incendios debido a falta de sistemas de detección o respuesta de emergencias.",
    "Instalación de explosivos en el área de parqueo de vehículos policiales.",
    "Infiltración de vehículos a los parqueaderos.",
    "Infiltración en la estación por parte de delincuentes.",
    "Intentos de fuga de los detenidos mediante colaboración interna o externa.",
    "Aglomeración de Personal Uniformado.",
    "Rutina y confianza del Personal Uniformado al frecuentar los estancamientos aledaños a la Estación de Policía.",
    "Manipulación de objetos extraños.",
    "Desentendimiento con la seguridad personal y de las instalaciones.",
    "Mala disposición de basuras."
];

// Crear una copia de la lista para trabajar
let risks = [...originalRisks];

function generateNumber() {
    if (risks.length === 0) {
        // Reestablecer la lista de riesgos si todos han sido utilizados
        risks = [...originalRisks];
    }

    const probability = Math.random();
    let selectedNumber = probability <= 0.85 ? Math.floor(Math.random() * 15) + 1 : Math.floor(Math.random() * 15) + 16;
    
    // Mostrar el número de funcionario seleccionado
    document.getElementById("selected-number").textContent = "Número seleccionado: " + selectedNumber;
    document.getElementById("number-section").classList.remove("hidden");

    // Seleccionar un riesgo aleatorio de la lista sin repetir
    const riskIndex = Math.floor(Math.random() * risks.length);
    const selectedRisk = risks.splice(riskIndex, 1)[0];  // Eliminar el riesgo seleccionado de la lista

    document.getElementById("risk-description").textContent = selectedRisk;
    document.getElementById("risk-card").classList.remove("hidden");
}