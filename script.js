// --- 0. CONFIGURACIÓN E ESTADO GLOBAL ---
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const canvas = new fabric.Canvas('ebook-canvas', { backgroundColor: '#ffffff' });

// Variables de estado para manejar múltiples páginas
let currentPdf = null;
let currentPageNum = 1;
let totalPages = 1;
let pagesData = {}; // Memoria que guardará lo que hay en cada página: { 1: {...}, 2: {...} }

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

// --- 1. LÓGICA DE MULTI-PÁGINA ---
function renderPage(num) {
    pageIndicator.innerText = `Página ${num} de ${totalPages}`;

    if (pagesData[num]) {
        // Si ya habíamos trabajado en esta página, la restauramos completa desde la memoria
        canvas.loadFromJSON(pagesData[num], canvas.renderAll.bind(canvas));
    } else {
        // Si es la primera vez que la vemos, extraemos el fondo del PDF
        if (!currentPdf) return;
        
        currentPdf.getPage(num).then(page => {
            const scale = 1.5;
            const viewport = page.getViewport({ scale: scale });

            const tempCanvas = document.createElement('canvas');
            const context = tempCanvas.getContext('2d');
            tempCanvas.height = viewport.height;
            tempCanvas.width = viewport.width;

            page.render({ canvasContext: context, viewport: viewport }).promise.then(() => {
                fabric.Image.fromURL(tempCanvas.toDataURL(), function(img) {
                    canvas.clear(); // Limpiamos el lienzo
                    canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                        scaleX: canvas.width / img.width,
                        scaleY: canvas.width / img.width 
                    });
                });
            });
        });
    }
}

function changePage(delta) {
    if (!currentPdf) {
        alert("Primero carga un PDF base.");
        return;
    }

    // 1. Guardar en memoria la página actual ANTES de cambiar
    pagesData[currentPageNum] = canvas.toJSON(['customData']);

    // 2. Calcular la nueva página y renderizarla
    let newPageNum = currentPageNum + delta;
    if (newPageNum >= 1 && newPageNum <= totalPages) {
        currentPageNum = newPageNum;
        canvas.discardActiveObject(); // Deseleccionar elementos
        propertiesPanel.style.display = 'none'; // Ocultar panel de propiedades
        renderPage(currentPageNum);
    }
}

document.getElementById('btn-prev-page').addEventListener('click', () => changePage(-1));
document.getElementById('btn-next-page').addEventListener('click', () => changePage(1));


// --- 2. CARGAR FONDO (Soporta Imágenes y PDF) ---
document.getElementById('btn-upload').addEventListener('click', () => document.getElementById('file-bg').click());

document.getElementById('file-bg').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();

    if (file.type === 'application/pdf') {
        fileReader.onload = function() {
            const typedarray = new Uint8Array(this.result);
            pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                currentPdf = pdf;
                totalPages = pdf.numPages;
                currentPageNum = 1;
                pagesData = {}; // Reiniciar memoria si se sube un PDF nuevo
                renderPage(currentPageNum);
            });
        };
        fileReader.readAsArrayBuffer(file);
    } else {
        // Para imágenes sueltas (1 sola página)
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

// --- 3. HERRAMIENTAS (Texto, Audio, Casilla) ---
document.getElementById('btn-text').addEventListener('click', () => {
    const text = new fabric.IText('Escribe aquí...', {
        left: 100, top: 100, fontSize: 20, fontFamily: 'Inter',
        fill: '#333', backgroundColor: '#e2e8f0', padding: 10,
        borderColor: '#3b82f6', cornerColor: '#3b82f6', transparentCorners: false,
        customData: { type: 'text', correctAnswer: '', points: 1 }
    });
    canvas.add(text); canvas.setActiveObject(text);
});

document.getElementById('btn-audio').addEventListener('click', () => {
    const audioBtn = new fabric.IText('🔊 Reproducir', {
        left: 150, top: 150, fontSize: 18, fontFamily: 'Inter',
        fill: '#ffffff', backgroundColor: '#3b82f6', padding: 12, rx: 5, ry: 5,
        editable: false, borderColor: '#3b82f6', cornerColor: '#3b82f6', transparentCorners: false,
        customData: { type: 'audio', audioUrl: '', points: 0 }
    });
    canvas.add(audioBtn); canvas.setActiveObject(audioBtn);
});

document.getElementById('btn-choice').addEventListener('click', () => {
    const checkbox = new fabric.Rect({
        left: 200, top: 200, width: 25, height: 25,
        fill: '#ffffff', stroke: '#334155', strokeWidth: 2,
        borderColor: '#3b82f6', cornerColor: '#3b82f6', transparentCorners: false,
        customData: { type: 'choice', isCorrect: false, points: 1 }
    });
    canvas.add(checkbox); canvas.setActiveObject(checkbox);
});

// --- 4. PANEL DE PROPIEDADES ---
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

// --- 5. ELIMINAR ELEMENTOS ---
document.getElementById('btn-delete').addEventListener('click', () => {
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
        canvas.discardActiveObject();
        activeObjects.forEach(obj => canvas.remove(obj));
    }
});

// --- 6. EXPORTAR LECCIÓN COMPLETA ---
document.getElementById('btn-export').addEventListener('click', () => {
    // 1. Guardar la página actual en la que estamos parados
    pagesData[currentPageNum] = canvas.toJSON(['customData']); 
    
    // 2. Exportar el objeto completo 'pagesData' que contiene todas las páginas
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pagesData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "leccion_completa.json");
    
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    alert("¡Éxito! Tu lección de varias páginas se ha guardado.");
});
