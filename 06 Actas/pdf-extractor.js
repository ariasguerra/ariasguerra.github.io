// ------------------------------
// Funciones Extractor PDF
// ------------------------------
document.addEventListener('DOMContentLoaded', function() {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js';

    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const processButton = document.getElementById('processButton');
    const output = document.getElementById('output');
    const suggestion = document.getElementById('suggestion');
    const stats = document.getElementById('stats');
    const imageContainer = document.getElementById('imageContainer');
    const currentImage = document.getElementById('currentImage');
    const downloadAllButton = document.getElementById('downloadAll');

    const marginRange = document.getElementById('marginRange');
    const rangeValueSpan = document.getElementById('rangeValue');
    marginRange.addEventListener('input', () => {
        rangeValueSpan.textContent = marginRange.value;
    });

    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');

    let singlePageImages = []; // Páginas procesadas individualmente
    let processedImages = [];  // Imágenes finales (collages o individuales)
    let currentIndex = 0;

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length) {
            fileInput.files = files;
            handleFileSelection();
        }
    });

    fileInput.addEventListener('change', handleFileSelection);

    async function handleFileSelection() {
        const file = fileInput.files[0];
        if (!file || file.type !== 'application/pdf') {
            suggestion.textContent = 'Por favor, sube un archivo PDF válido.';
            return;
        }
        suggestion.textContent = 'Analizando el archivo...';
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            suggestion.textContent = 'Archivo PDF cargado correctamente.';
            processButton.onclick = () => processPDF(pdf);
        } catch (error) {
            suggestion.textContent = 'Error al cargar el archivo PDF.';
            console.error("Error al cargar el archivo PDF: ", error);
        }
    }

    async function processPDF(pdf) {
        output.textContent = 'Procesando PDF...';
        imageContainer.style.display = 'none';
        singlePageImages = [];
        processedImages = [];
        currentIndex = 0;
        downloadAllButton.style.display = 'none';

        try {
            const numPages = pdf.numPages;
            let processedPages = 0;
            let blankPages = 0;

            // Leemos qué opción se eligió (1 o 4)
            const pagesMode = parseInt(document.querySelector('input[name="pagesMode"]:checked').value, 10);

            // Renderizamos todas las páginas
            for (let i = 1; i <= numPages; i++) {
                const isBlank = await processPage(pdf, i);
                if (isBlank) {
                    blankPages++;
                } else {
                    processedPages++;
                }
                output.textContent = `Procesando página ${i} de ${numPages}...`;
            }

            // Si es modo 1: se añaden las imágenes individuales tal cual
            if (pagesMode === 1) {
                processedImages = singlePageImages;

            // Si es modo 4: se agrupan en collages de 4
            } else if (pagesMode === 4) {
                let index = 0;
                while (index < singlePageImages.length) {
                    const remaining = singlePageImages.length - index;
                    if (remaining >= 4) {
                        const group = singlePageImages.slice(index, index + 4);
                        const collage = await createCollageOfFour(group);
                        processedImages.push(collage);
                        index += 4;
                    } else {
                        // si sobran < 4, se añaden individualmente
                        const leftover = singlePageImages.slice(index);
                        processedImages.push(...leftover);
                        break;
                    }
                }
            }

            stats.textContent = `Páginas procesadas: ${processedPages}, Páginas en blanco omitidas: ${blankPages}`;
            output.textContent = 'Proceso completado. Todas las imágenes han sido generadas.';
            downloadAllButton.style.display = 'block';

            if (processedImages.length > 0) {
                currentIndex = 0;
                showImage(currentIndex);
                imageContainer.style.display = 'block';
            } else {
                imageContainer.style.display = 'none';
            }
        } catch (error) {
            output.textContent = `Error: ${error.message}`;
            console.error('Error durante el procesamiento del PDF:', error);
        }
    }

    // Procesa cada página y genera un DataURL
    async function processPage(pdf, pageNumber) {
        const page = await pdf.getPage(pageNumber);
        const scale = 3; 
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

        if (isPageBlank(imageData)) {
            return true; // Página en blanco
        }

        // Encontrar el área con contenido
        const bounds = findContentBounds(imageData);

        // Recortar el área con contenido
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = bounds.right - bounds.left;
        croppedCanvas.height = bounds.bottom - bounds.top;
        const croppedContext = croppedCanvas.getContext('2d');
        croppedContext.drawImage(
            canvas, 
            bounds.left, bounds.top, 
            croppedCanvas.width, croppedCanvas.height, 
            0, 0, 
            croppedCanvas.width, croppedCanvas.height
        );

        const dataUrl = croppedCanvas.toDataURL('image/png');
        // Guardamos esta imagen individual
        singlePageImages.push({
            name: `page_${pageNumber}.png`,
            dataUrl: dataUrl
        });

        return false; // No está en blanco
    }

    // Determina si una página está en blanco mediante muestreo aleatorio de pixeles
    function isPageBlank(imageData) {
        const { data, width, height } = imageData;
        const threshold = 245;
        const sampleSize = 100;
        const totalPixels = width * height;
        let whitePixels = 0;

        for (let i = 0; i < sampleSize; i++) {
            const randomPixel = Math.floor(Math.random() * totalPixels);
            const index = randomPixel * 4;
            if (data[index] > threshold && data[index + 1] > threshold && data[index + 2] > threshold) {
                whitePixels++;
            }
        }

        return (whitePixels / sampleSize) > 0.98;
    }

    // Encuentra la zona con contenido para recortar
    function findContentBounds(imageData) {
        const { data, width, height } = imageData;
        const initialMargin = parseInt(marginRange.value);

        let left = width, top = height, right = 0, bottom = 0;
        const threshold = 200;
        const extraMargin = 5;

        for (let y = initialMargin; y < height - initialMargin; y++) {
            for (let x = initialMargin; x < width - initialMargin; x++) {
                const i = (y * width + x) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // Detectar pixeles "oscuros"
                if (r < threshold || g < threshold || b < threshold) {
                    left = Math.min(left, x);
                    top = Math.min(top, y);
                    right = Math.max(right, x);
                    bottom = Math.max(bottom, y);
                }
            }
        }

        return {
            left: Math.max(initialMargin, left - extraMargin),
            top: Math.max(initialMargin, top - extraMargin),
            right: Math.min(width - initialMargin, right + extraMargin),
            bottom: Math.min(height - initialMargin, bottom + extraMargin)
        };
    }

    // Crea un collage de 4 imágenes en un lienzo tamaño carta (2x2)
    async function createCollageOfFour(imagesGroup) {
        const collageWidth = 1275;  // Aprox. ancho carta
        const collageHeight = 1650; // Aprox. alto carta

        const collageCanvas = document.createElement('canvas');
        collageCanvas.width = collageWidth;
        collageCanvas.height = collageHeight;
        const collageContext = collageCanvas.getContext('2d');

        const quadrantWidth = collageWidth / 2;
        const quadrantHeight = collageHeight / 2;

        for (let i = 0; i < imagesGroup.length; i++) {
            const imageData = imagesGroup[i];
            const imageEl = new Image();
            await new Promise((resolve) => {
                imageEl.onload = resolve;
                imageEl.src = imageData.dataUrl;
            });
            const row = Math.floor(i / 2);
            const col = i % 2;
            const dx = col * quadrantWidth;
            const dy = row * quadrantHeight;
            collageContext.drawImage(
                imageEl,
                0, 0, imageEl.width, imageEl.height,
                dx, dy, quadrantWidth, quadrantHeight
            );
        }

        return {
            name: 'collage.png',
            dataUrl: collageCanvas.toDataURL('image/png')
        };
    }

    // Navegación de imágenes
    function showImage(index) {
        if (processedImages.length === 0) return;

        currentImage.src = processedImages[index].dataUrl;
        currentImage.alt = processedImages[index].name || `Imagen ${index + 1}`;

        prevButton.disabled = (index === 0);
        nextButton.disabled = (index === processedImages.length - 1);
    }

    prevButton.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            showImage(currentIndex);
        }
    });

    nextButton.addEventListener('click', () => {
        if (currentIndex < processedImages.length - 1) {
            currentIndex++;
            showImage(currentIndex);
        }
    });

    // Al hacer clic en la imagen, se copia al portapapeles y pasa a la siguiente
    currentImage.addEventListener('click', async () => {
        try {
            const dataUrl = processedImages[currentIndex].dataUrl;
            const blob = await (await fetch(dataUrl)).blob();
            const clipboardItem = new ClipboardItem({ [blob.type]: blob });
            await navigator.clipboard.write([clipboardItem]);
            console.log('Imagen copiada al portapapeles.');

            if (currentIndex < processedImages.length - 1) {
                currentIndex++;
                showImage(currentIndex);
            }
        } catch (error) {
            console.error('Error al copiar la imagen:', error);
        }
    });

    // Descarga todas las imágenes en un ZIP
    async function downloadAllImages() {
        const zip = new JSZip();

        processedImages.forEach(image => {
            const base64Data = image.dataUrl.split(',')[1];
            let fileName = image.name;
            if (!fileName) {
                fileName = 'collage_' + Math.floor(Math.random() * 100000) + '.png';
            }
            zip.file(fileName, base64Data, { base64: true });
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'extracted_images.zip';
        link.click();
    }

    downloadAllButton.addEventListener('click', downloadAllImages);