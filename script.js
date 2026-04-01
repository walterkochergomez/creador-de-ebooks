// --- 0. CONFIGURACIÓN DE PDF.JS ---
// Le indicamos a la librería dónde está su "trabajador" en segundo plano
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// --- 1. INICIALIZAR EL LIENZO (FABRIC.JS) ---
const canvas = new fabric.Canvas('ebook-canvas', { backgroundColor: '#ffffff' });

// Referencias de la interfaz (DOM)
const propertiesPanel = document.getElementById('properties-panel');
const propText = document.getElementById('prop-text');
const propAudio = document.getElementById('prop-audio');
const propChoice = document.getElementById('prop-choice');

// Inputs del panel derecho
const inputAnswer = document.getElementById('prop-text-answer');
const inputAudioUrl = document.getElementById('prop-audio-url');
const inputIsCorrect = document.getElementById('prop-choice-correct');
const inputPoints = document.getElementById('prop-points');

// --- 2. CARGAR FONDO (Soporta Imágenes y PDF) ---
document.getElementById('btn-upload').addEventListener('click', () => {
    document.getElementById('file-bg').click();
});

document.getElementById('file-bg').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();

    // Si el usuario sube un PDF
    if (file.type === 'application/pdf') {
        fileReader.onload = function() {
            const typedarray = new Uint8Array(this.result);
            
            // Leer el documento PDF
            pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                // Tomar la primera página
                pdf.getPage(1).then(page => {
                    const scale = 1.5; // Escala para mejor resolución
                    const viewport = page.getViewport({ scale: scale });

                    // Crear un canvas temporal para "dibujar" el PDF
                    const tempCanvas = document.createElement('canvas');
                    const context = tempCanvas.getContext('2d');
                    tempCanvas.height = viewport.height;
                    tempCanvas.width = viewport.width;

                    const renderContext = { canvasContext: context, viewport: viewport };
                    
                    // Renderizar y pasar como imagen de fondo a Fabric.js
                    page.render(renderContext).promise.then(() => {
                        fabric.Image.fromURL(tempCanvas.toDataURL(), function(img) {
                            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                                scaleX: canvas.width / img.width,
                                scaleY: canvas.width / img.width 
                            });
                        });
                    });
                });
            });
        };
        fileReader.readAsArrayBuffer(file);
    } 
    // Si el usuario sube una imagen normal (PNG, JPG)
    else {
        fileReader.onload = function(f) {
            fabric.Image.fromURL(f.target.result, function(img) {
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                    scaleX: canvas.width / img.width,
                    scaleY: canvas.width / img.width 
                });
            });
        };
        fileReader.readAsDataURL(file);
    }
});

// --- 3. HERRAMIENTA: CAJA DE TEXTO ---
document.getElementById('btn-text').addEventListener('click', () => {
    const text = new fabric.IText('Escribe aquí...', {
        left: 100, top: 100, fontSize: 20, fontFamily: 'Inter',
        fill: '#333', backgroundColor: '#e2e8f0', padding: 10,
        borderColor: '#3b82f6', cornerColor: '#3b82f6', transparentCorners: false,
        // Datos ocultos para evaluar al alumno después
        customData: { type: 'text', correctAnswer: '', points: 1 }
    });
    canvas.add(text); canvas.setActiveObject(text);
});

// --- 4. HERRAMIENTA: BOTÓN DE AUDIO ---
document.getElementById('btn-audio').addEventListener('click', () => {
    const audioBtn = new fabric.IText('🔊 Reproducir', {
        left: 150, top: 150, fontSize: 18, fontFamily: 'Inter',
        fill: '#ffffff', backgroundColor: '#3b82f6', padding: 12, rx: 5, ry: 5,
        editable: false, // El botón no debe ser editado como texto normal
        borderColor: '#3b82f6', cornerColor: '#3b82f6', transparentCorners: false,
        customData: { type: 'audio', audioUrl: '', points: 0 }
    });
    canvas.add(audioBtn); canvas.setActiveObject(audioBtn);
});

// --- 5. HERRAMIENTA: CASILLA DE OPCIÓN MÚLTIPLE ---
document.getElementById('btn-choice').addEventListener('click', () => {
    const checkbox = new fabric.Rect({
        left: 200, top: 200, width: 25, height: 25,
        fill: '#ffffff', stroke: '#334155', strokeWidth: 2,
        borderColor: '#3b82f6', cornerColor: '#3b82f6', transparentCorners: false,
        customData: { type: 'choice', isCorrect: false, points: 1 }
    });
    canvas.add(checkbox); canvas.setActiveObject(checkbox);
});

// --- 6. LÓGICA DEL PANEL DE PROPIEDADES DINÁMICO ---
canvas.on('selection:created', updatePropertiesPanel);
canvas.on('selection:updated', updatePropertiesPanel);
canvas.on('selection:cleared', () => propertiesPanel.style.display = 'none');

function updatePropertiesPanel(event) {
    const obj = event.selected[0];
    if (!obj || !obj.customData) return;

    propertiesPanel.style.display = 'block';
    const data = obj.customData;

    // Ocultar todas las secciones primero
    propText.style.display = 'none';
    propAudio.style.display = 'none';
    propChoice.style.display = 'none';

    // Mostrar sección según el tipo y cargar sus datos actuales
    if (data.type === 'text') {
        propText.style.display = 'block';
        inputAnswer.value = data.correctAnswer || '';
        inputAnswer.oninput = (e) => obj.customData.correctAnswer = e.target.value;
    } 
    else if (data.type === 'audio') {
        propAudio.style.display = 'block';
        inputAudioUrl.value = data.audioUrl || '';
        inputAudioUrl.oninput = (e) => obj.customData.audioUrl = e.target.value;
    } 
    else if (data.type === 'choice') {
        propChoice.style.display = 'block';
        inputIsCorrect.checked = data.isCorrect || false;
        inputIsCorrect.onchange = (e) => obj.customData.isCorrect = e.target.checked;
    }

    // Puntos (común para todos)
    inputPoints.value = data.points || 0;
    inputPoints.oninput = (e) => obj.customData.points = parseInt(e.target.value) || 0;
}

// --- 7. ELIMINAR ELEMENTOS ---
document.getElementById('btn-delete').addEventListener('click', () => {
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
        canvas.discardActiveObject();
        activeObjects.forEach(obj => canvas.remove(obj));
    }
});

// --- 8. EXPORTAR LECCIÓN ---
document.getElementById('btn-export').addEventListener('click', () => {
    // Generar JSON incluyendo nuestra propiedad 'customData'
    const lessonData = canvas.toJSON(['customData']); 
    
    // Crear el archivo descargable
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lessonData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    
    // Nombre del archivo por defecto
    downloadAnchorNode.setAttribute("download", "leccion_studio21.json");
    
    // Ejecutar descarga
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    alert("¡Éxito! Tu lección se ha guardado como 'leccion_studio21.json'.");
});
