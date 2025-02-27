// Módulo para la visualización gráfica del personal
const PersonalChart = (function() {
    let chart = null;
    const chartColors = {
        oficiales: '#1e88e5',       // Azul
        suboficiales: '#43a047',    // Verde
        patrulleros: '#fb8c00',     // Naranja
        patrullerosPolicia: '#f4511e', // Naranja rojizo
        auxiliares: '#8e24aa',      // Púrpura
        personalCivil: '#546e7a'    // Gris azulado
    };
    
    function initialize() {
        // Configurar Chart.js para usar el tema corporativo
        Chart.defaults.color = '#444';
        Chart.defaults.font.family = 'Arial, sans-serif';
        
        // Inicializar gráfico vacío
        const ctx = document.getElementById('personnel-chart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: Object.values(chartColors),
                    borderColor: Object.values(chartColors).map(color => color),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw} (${(context.raw / context.dataset.data.reduce((a, b) => a + b, 0) * 100).toFixed(1)}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }
    
    function updateChart(summary) {
        if (!chart) {
            initialize();
        }
        
        // Preparar los datos para el gráfico
        const labels = {
            'oficiales': 'Oficiales',
            'suboficiales': 'Suboficiales',
            'patrulleros': 'Patrulleros',
            'patrullerosPolicia': 'Patrulleros de Policía',
            'auxiliares': 'Auxiliares',
            'personalCivil': 'Personal Civil'
        };
        
        // Convertir el objeto summary a formato para gráfico
        const chartLabels = [];
        const chartData = [];
        const chartBackgroundColors = [];
        
        Object.entries(summary).forEach(([key, categoryData]) => {
            if (key in labels) {
                const count = Object.values(categoryData).reduce((sum, count) => sum + count, 0);
                if (count > 0) {
                    chartLabels.push(labels[key]);
                    chartData.push(count);
                    chartBackgroundColors.push(chartColors[key]);
                }
            }
        });
        
        // Actualizar el gráfico
        chart.data.labels = chartLabels;
        chart.data.datasets[0].data = chartData;
        chart.data.datasets[0].backgroundColor = chartBackgroundColors;
        chart.data.datasets[0].borderColor = chartBackgroundColors;
        chart.update();
    }
    
    // Función para inicializar los botones de filtro
    function setupFilterButtons() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Quitar clase activa de todos los botones
                filterButtons.forEach(btn => btn.classList.remove('active'));
                
                // Añadir clase activa al botón seleccionado
                this.classList.add('active');
                
                // Aplicar filtro según el botón
                const filterId = this.id.replace('filter-', '');
                applyFilter(filterId);
            });
        });
    }
    
    // Aplicar filtro a los contactos
    function applyFilter(filterId) {
        // Si existe en el contexto global la función de búsqueda, usarla
        if (typeof ContactModel !== 'undefined' && ContactModel.searchContacts) {
            let searchTerm = '';
            
            // Determinar el término de búsqueda según el filtro
            switch(filterId) {
                case 'oficiales':
                    searchTerm = 'subteniente teniente capitán mayor coronel general';
                    break;
                case 'suboficiales':
                    searchTerm = 'subintendente intendente';
                    break;
                case 'patrulleros':
                    searchTerm = 'patrullero';
                    break;
                case 'auxiliares':
                    searchTerm = 'auxiliar';
                    break;
                case 'civiles':
                    searchTerm = 'no uniformado';
                    break;
                case 'all':
                    // No aplicamos filtro, mostramos todos
                    break;
            }
            
            // Si no hay término de búsqueda y no es "todos", no hacemos nada
            if (!searchTerm && filterId !== 'all') return;
            
            if (filterId === 'all') {
                // Para mostrar todos, podemos hacer una búsqueda vacía o cargar el primer contacto
                if (AppController && AppController.resetToFirstContact) {
                    AppController.resetToFirstContact();
                }
            } else {
                // Ejecutar la búsqueda
                const results = ContactModel.searchContacts(searchTerm);
                
                // Actualizar la vista
                if (AppController && AppController.updateCurrentContactView) {
                    AppController.updateCurrentContactView();
                }
                
                // Mostrar mensaje con la cantidad de resultados
                if (UIController && UIController.showMessage) {
                    UIController.showMessage(`${results.length} ${filterId} encontrados`, 2000);
                }
                
                // Destacar visualmente la categoría seleccionada
                highlightCategory(filterId);
            }
        }
    }
    
    // Resaltar visualmente la categoría seleccionada
    function highlightCategory(categoryId) {
        // Primero eliminamos cualquier resaltado anterior
        document.querySelectorAll('.highlight').forEach(el => {
            el.classList.remove('highlight');
        });
        
        // Resaltar la categoría seleccionada
        const categoryItem = document.getElementById(`${categoryId}-item`);
        if (categoryItem) {
            categoryItem.classList.add('highlight');
        }
    }
    
    // Hacer que los contadores de categorías sean cliqueables para filtrar
    function setupCategoryCounters() {
        const categoryCounters = document.querySelectorAll('.clickable');
        
        categoryCounters.forEach(counter => {
            counter.addEventListener('click', function() {
                // Obtener la categoría del ID del contador
                const categoryId = this.id.replace('-count', '');
                
                // Activar el botón de filtro correspondiente
                const filterBtn = document.getElementById(`filter-${categoryId}`);
                if (filterBtn) {
                    filterBtn.click();
                } else {
                    // Si no hay botón específico, usar la lógica directamente
                    applyFilter(categoryId);
                }
            });
        });
    }
    
    return {
        initialize,
        updateChart,
        setupFilterButtons,
        setupCategoryCounters
    };
})();
