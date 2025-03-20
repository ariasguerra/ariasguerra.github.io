// ------------------------------
// Lógica de Pestañas
// ------------------------------
document.addEventListener('DOMContentLoaded', function() {
    const tabActa = document.getElementById('tabActa');
    const tabPdf = document.getElementById('tabPdf');
    const actaSection = document.getElementById('actaSection');
    const pdfSection = document.getElementById('pdfSection');

    tabActa.addEventListener('click', (e) => {
        e.preventDefault();
        tabActa.classList.add('active');
        tabPdf.classList.remove('active');
        actaSection.style.display = 'block';
        pdfSection.style.display = 'none';
    });

    tabPdf.addEventListener('click', (e) => {
        e.preventDefault();
        tabPdf.classList.add('active');
        tabActa.classList.remove('active');
        pdfSection.style.display = 'block';
        actaSection.style.display = 'none';
    });
});
