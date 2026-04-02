// --- 0. CONFIGURACIÓN DE PDF.JS ---
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// --- 1. INICIALIZAR EL LIENZO ---
const canvas = new fabric.Canvas('ebook-canvas', { backgroundColor: '#ffffff' });

// Variables de estado
let currentPdf = null;
let currentPageNum = 1;
let totalPages = 1;
let pagesData = {}; 

// Referencias del DOM
const propertiesPanel = document.getElementById('properties-panel');
const propText = document.getElementById('prop-text');
const propAudio = document.getElementById('prop-audio');
const propChoice = document.getElementById('prop-choice');
const inputAnswer = document.getElementById('prop-text-answer');
const inputAudioUrl = document.getElementById('prop-audio-url');
const inputIsCorrect = document.getElementById('prop-choice-correct');
const inputPoints = document.getElementById('prop-points');
const pageIndicator = document.getElementById('page-indicator');

// --- 2. CARGA Y RENDERIZADO (PDF/IMG) ---
function renderPage(num) {
    pageIndicator.innerText = `Página ${num} de ${totalPages}`;
    
    if (pagesData[num]) {
        canvas.loadFromJSON(pagesData[num], canvas.renderAll.bind(canvas));
    } else {
        if (!currentPdf) return;
        
        currentPdf.getPage(num).then(page => {
            const viewport = page.getViewport({ scale: 1.5 });
            const tempCanvas = document.createElement('canvas');
            const context = tempCanvas.getContext('2d');
            tempCanvas.height = viewport.height; 
            tempCanvas.width = viewport.width;

            page.render({ canvasContext: context, viewport: viewport }).promise.then(() => {
                fabric.Image.fromURL(tempCanvas.toDataURL(), function(img) {
                    canvas.clear();
                    canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                        scaleX: canvas.width / img.width, 
                        scaleY: canvas.width / img.width 
                    });
                });
            });
        });
    }
}

document.getElementById('btn-upload').addEventListener('click', () => document.getElementById('file-bg').click());

document.getElementById('file-bg').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const fileReader = new FileReader();

    if (file.type === 'application/pdf') {
        fileReader.onload = function() {
            pdfjsLib.getDocument(new Uint8Array(this.result)).promise.then(pdf => {
                currentPdf = pdf; 
                totalPages = pdf.numPages; 
                currentPageNum = 1; 
                pagesData = {}; 
                renderPage(1);
            });
        };
        fileReader.readAsArrayBuffer(file);
    } else {
        currentPdf = null; 
        totalPages = 1; 
        currentPageNum = 1; 
        pageIndicator.innerText = `Página 1 de 1`;
        
        fileReader.onload = function(f) {
            fabric.Image.fromURL(f.target.result, function(img) {
                canvas.clear();
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                    scaleX: canvas.width / img.width, 
                    scaleY: canvas.width / img.width 
                });
            });
        };
        fileReader.readAsDataURL(file);
    }
});

// --- 3. PAGINACIÓN ---
function changePage(delta) {
    if (!currentPdf && totalPages === 1) return;
    
    // Guardar estado actual
    pagesData[currentPageNum] = canvas.toJSON(['customData']);
    
    let newPageNum = currentPageNum + delta;
    if (newPageNum >= 1 && newPageNum <= totalPages) {
        currentPageNum = newPageNum;
        canvas.discardActiveObject(); 
        propertiesPanel.style.display = 'none';
        renderPage(currentPageNum);
    }
}

document.getElementById('btn-prev-page').addEventListener('click', () => changePage(-1));
document.getElementById('btn-next-page').addEventListener('click', () => changePage(1));

// --- 4. HERRAMIENTAS: CLIC PARA INSERTAR ---
let herramientaActiva = null;

function activarHerramienta(tipo, btnId) {
    herramientaActiva = tipo;
    canvas.defaultCursor = 'crosshair';
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(btnId).classList.add('active');
}

document.getElementById('btn-text').addEventListener('click', () => activarHerramienta('texto', 'btn-text'));
document.getElementById('btn-audio').addEventListener('click', () => activarHerramienta('audio', 'btn-audio'));
document.getElementById('btn-choice').addEventListener('click', () => activarHerramienta('opcion', 'btn-choice'));

canvas.on('mouse:down', function(options) {
    if (!herramientaActiva) return;
    
    const puntero = canvas.getPointer(options.e);
    let nuevoObjeto = null;

    if (herramientaActiva === 'texto') {
        // MEJORA: Usamos Textbox para tener un ancho fijo y que no desaparezca si está vacío
        nuevoObjeto = new fabric.Textbox('Escribe aquí...', {
            left: puntero.x, 
            top: puntero.y, 
            width: 180, 
            fontSize: 20, 
            fontFamily: 'Inter',
            fill: '#333', 
            backgroundColor: '#e2e8f0', 
            padding: 10,
            borderColor: '#3b82f6', 
            cornerColor: '#3b82f6', 
            transparentCorners: false,
            customData: { type: 'text', correctAnswer: '', points: 1 }
        });
    } else if (herramientaActiva === 'audio') {
        nuevoObjeto = new fabric.IText('▶️ Audio', {
            left: puntero.x, top: puntero.y, fontSize: 18, fontFamily: 'Inter', fontWeight: 'bold',
            fill: '#ffffff', backgroundColor: '#10b981', padding: 12, rx: 5, ry: 5, editable: true,
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 4, offsetX: 2, offsetY: 2 }),
            borderColor: '#3b82f6', cornerColor: '#3b82f6', transparentCorners: false,
            customData: { type: 'audio', audioUrl: '', points: 0 }
        });
    } else if (herramientaActiva === 'opcion') {
        nuevoObjeto = new fabric.Rect({
            left: puntero.x, top: puntero.y, width: 25, height: 25,
            fill: '#ffffff', stroke: '#334155', strokeWidth: 2,
            borderColor: '#3b82f6', cornerColor: '#3b82f6', transparentCorners: false,
            customData: { type: 'choice', isCorrect: false, points: 1 }
        });
    }

    if (nuevoObjeto) { 
        canvas.add(nuevoObjeto); 
        canvas.setActiveObject(nuevoObjeto); 
    }
    
    // Resetear herramienta
    herramientaActiva = null; 
    canvas.defaultCursor = 'default';
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
});

// --- 5. PANEL DE PROPIEDADES DINÁMICO ---
canvas.on('selection:created', updatePropertiesPanel);
canvas.on('selection:updated', updatePropertiesPanel);
canvas.on('selection:cleared', () => propertiesPanel.style.display = 'none');

function updatePropertiesPanel(event) {
    const obj = event.selected[0];
    if (!obj || !obj.customData) return;
    
    propertiesPanel.style.display = 'block';
    const data = obj.customData;

    propText.style.display = 'none'; 
    propAudio.style.display = 'none'; 
    propChoice.style.display = 'none';

    if (data.type === 'text') {
        propText.style.display = 'block';
        inputAnswer.value = data.correctAnswer || ''; 
        inputAnswer.oninput = (e) => obj.customData.correctAnswer = e.target.value;
    } else if (data.type === 'audio') {
        propAudio.style.display = 'block';
        inputAudioUrl.value = data.audioUrl || ''; 
        inputAudioUrl.oninput = (e) => obj.customData.audioUrl = e.target.value;
    } else if (data.type === 'choice') {
        propChoice.style.display = 'block';
        inputIsCorrect.checked = data.isCorrect || false; 
        inputIsCorrect.onchange = (e) => obj.customData.isCorrect = e.target.checked;
    }
    
    inputPoints.value = data.points || 0; 
    inputPoints.oninput = (e) => obj.customData.points = parseInt(e.target.value) || 0;
}

document.getElementById('btn-delete').addEventListener('click', () => {
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) { 
        canvas.discardActiveObject(); 
        activeObjects.forEach(obj => canvas.remove(obj)); 
    }
});

// --- 6. ZOOM ---
let zoomActual = 1;
const anchoBase = 794; 
const altoBase = 1123;

function aplicarZoom(cambio) {
    zoomActual += cambio;
    if (zoomActual < 0.5) zoomActual = 0.5;
    if (zoomActual > 2.5) zoomActual = 2.5;
    
    canvas.setZoom(zoomActual);
    canvas.setWidth(anchoBase * zoomActual);
    canvas.setHeight(altoBase * zoomActual);
    document.getElementById('zoom-level').innerText = Math.round(zoomActual * 100) + '%';
}

document.getElementById('btn-zoom-in').addEventListener('click', () => aplicarZoom(0.1));
document.getElementById('btn-zoom-out').addEventListener('click', () => aplicarZoom(-0.1));

// --- 7. EXPORTAR JSON ---
document.getElementById('btn-export').addEventListener('click', () => {
    // Asegurarnos de guardar la página actual antes de exportar
    pagesData[currentPageNum] = canvas.toJSON(['customData']); 
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pagesData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "leccion_completa.json");
    
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});
