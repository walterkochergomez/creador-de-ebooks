const canvas = new fabric.Canvas('ebook-canvas', { backgroundColor: '#ffffff' });

// Referencias del DOM
const propertiesPanel = document.getElementById('properties-panel');
const propText = document.getElementById('prop-text');
const propAudio = document.getElementById('prop-audio');
const propChoice = document.getElementById('prop-choice');

// Inputs del panel
const inputAnswer = document.getElementById('prop-text-answer');
const inputAudioUrl = document.getElementById('prop-audio-url');
const inputIsCorrect = document.getElementById('prop-choice-correct');
const inputPoints = document.getElementById('prop-points');

// --- 1. CARGAR FONDO (Imagen de la lección) ---
document.getElementById('btn-upload').addEventListener('click', () => {
    document.getElementById('file-bg').click(); // Simula clic en el input oculto
});

document.getElementById('file-bg').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(f) {
        fabric.Image.fromURL(f.target.result, function(img) {
            // Ajustamos la imagen para que cubra el ancho del A4
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                scaleX: canvas.width / img.width,
                scaleY: canvas.width / img.width 
            });
        });
    };
    reader.readAsDataURL(file);
});

// --- 2. HERRAMIENTA: CAJA DE TEXTO ---
document.getElementById('btn-text').addEventListener('click', () => {
    const text = new fabric.IText('Escribe aquí...', {
        left: 100, top: 100, fontSize: 20, fontFamily: 'Inter',
        fill: '#333', backgroundColor: '#e2e8f0', padding: 10,
        customData: { type: 'text', correctAnswer: '', points: 1 }
    });
    canvas.add(text); canvas.setActiveObject(text);
});

// --- 3. HERRAMIENTA: BOTÓN DE AUDIO ---
document.getElementById('btn-audio').addEventListener('click', () => {
    // Usamos un texto con icono como representación visual del botón
    const audioBtn = new fabric.IText('🔊 Reproducir', {
        left: 150, top: 150, fontSize: 18, fontFamily: 'Inter',
        fill: '#ffffff', backgroundColor: '#3b82f6', padding: 12, rx: 5, ry: 5,
        editable: false, // El alumno no debería editar este texto
        customData: { type: 'audio', audioUrl: '', points: 0 }
    });
    canvas.add(audioBtn); canvas.setActiveObject(audioBtn);
});

// --- 4. HERRAMIENTA: CASILLA DE OPCIÓN MÚLTIPLE ---
document.getElementById('btn-choice').addEventListener('click', () => {
    // Un cuadrado simple que simula un checkbox
    const checkbox = new fabric.Rect({
        left: 200, top: 200, width: 25, height: 25,
        fill: '#ffffff', stroke: '#334155', strokeWidth: 2,
        customData: { type: 'choice', isCorrect: false, points: 1 }
    });
    canvas.add(checkbox); canvas.setActiveObject(checkbox);
});

// --- 5. LÓGICA DEL PANEL DINÁMICO ---
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

    // Mostrar sección según el tipo y cargar sus datos
    if (data.type === 'text') {
        propText.style.display = 'block';
        inputAnswer.value = data.correctAnswer;
        inputAnswer.oninput = (e) => obj.customData.correctAnswer = e.target.value;
    } 
    else if (data.type === 'audio') {
        propAudio.style.display = 'block';
        inputAudioUrl.value = data.audioUrl;
        inputAudioUrl.oninput = (e) => obj.customData.audioUrl = e.target.value;
    } 
    else if (data.type === 'choice') {
        propChoice.style.display = 'block';
        inputIsCorrect.checked = data.isCorrect;
        inputIsCorrect.onchange = (e) => obj.customData.isCorrect = e.target.checked;
    }

    // Puntos (común para todos excepto audio)
    inputPoints.value = data.points;
    inputPoints.oninput = (e) => obj.customData.points = parseInt(e.target.value);
}

// --- 6. ELIMINAR ELEMENTOS ---
document.getElementById('btn-delete').addEventListener('click', () => {
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
        canvas.discardActiveObject();
        activeObjects.forEach(obj => canvas.remove(obj));
    }
});
