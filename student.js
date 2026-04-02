// --- 1. INICIALIZAR EL LIENZO ---
const canvas = new fabric.Canvas('student-canvas', { backgroundColor: '#e2e8f0' });

let lessonData = {}; 
let currentPageNum = 1;
let totalPages = 1;
let currentAudio = null; 
let pagesEvaluated = {}; 

const pageIndicator = document.getElementById('page-indicator');
const btnEvaluate = document.getElementById('btn-evaluate');
const btnReset = document.getElementById('btn-reset-page');

// --- 2. CARGAR LECCIÓN ---
document.getElementById('btn-load-lesson').addEventListener('click', () => document.getElementById('file-lesson').click());

document.getElementById('file-lesson').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            lessonData = JSON.parse(event.target.result);
            totalPages = Object.keys(lessonData).length;
            currentPageNum = 1;
            pagesEvaluated = {}; 
            btnReset.style.display = 'flex'; // Mostrar botón reset al cargar
            renderStudentPage(currentPageNum);
        } catch (error) {
            alert("Error: El archivo no es una lección válida.");
        }
    };
    reader.readAsText(file);
});

// --- 3. RENDERIZAR Y PREPARAR OBJETOS ---
function renderStudentPage(num) {
    pageIndicator.innerText = `Página ${num} de ${totalPages}`;
    const pageJson = lessonData[num];
    if (!pageJson) return;

    // Control de visibilidad del botón de evaluación
    btnEvaluate.style.display = pagesEvaluated[num] ? 'none' : 'flex';

    canvas.loadFromJSON(pageJson, function() {
        canvas.getObjects().forEach(function(obj) {
            configurarInteractividad(obj, pagesEvaluated[num]);
        });
        canvas.renderAll();
    });
}

// Función auxiliar para configurar si un objeto es interactivo o está bloqueado
function configurarInteractividad(obj, estaEvaluado) {
    if (!obj.customData) return;

    if (!estaEvaluado) {
        // MODO ACTIVO: El estudiante puede responder
        obj.set({
            selectable: true,
            hasControls: false,
            hasBorders: false,
            lockMovementX: true,
            lockMovementY: true,
            hoverCursor: 'default'
        });

        if (obj.customData.type === 'text') {
            obj.set({ editable: true, hoverCursor: 'text' });
            obj.on('editing:entered', function() {
                if (obj.text === ' ') obj.selectAll();
                obj.set('backgroundColor', '#ffffff');
                canvas.renderAll();
            });
            obj.on('editing:exited', function() {
                obj.set('backgroundColor', '#f1f5f9');
                canvas.renderAll();
            });
        }

        if (obj.customData.type === 'audio') {
            obj.set({ editable: false, hoverCursor: 'pointer' });
            obj.on('mousedown', () => playAudio(obj.customData.audioUrl));
        }

        if (obj.customData.type === 'choice') {
            obj.set({ hoverCursor: 'pointer' });
            obj.on('mousedown', function() {
                obj.studentChecked = !obj.studentChecked;
                obj.set('fill', obj.studentChecked ? '#3b82f6' : '#ffffff');
                canvas.renderAll();
            });
        }
    } else {
        // MODO BLOQUEADO: Página ya revisada
        obj.set({ selectable: false, evented: false });
        // El audio siempre debe ser clickable
        if (obj.customData.type === 'audio') {
            obj.set({ selectable: true, evented: true, hoverCursor: 'pointer' });
            obj.on('mousedown', () => playAudio(obj.customData.audioUrl));
        }
    }
}

function playAudio(url) {
    if (!url) return;
    if (currentAudio) currentAudio.pause();
    currentAudio = new Audio(url);
    currentAudio.play().catch(() => alert("Error al reproducir audio."));
}

// --- 4. PAGINACIÓN ---
function changePage(delta) {
    if (Object.keys(lessonData).length === 0) return;
    
    // Guardar estado actual antes de movernos
    lessonData[currentPageNum] = canvas.toJSON(['customData', 'studentChecked', 'selectable', 'editable', 'backgroundColor', 'fill', 'stroke', 'evented']);

    let newPageNum = currentPageNum + delta;
    if (newPageNum >= 1 && newPageNum <= totalPages) {
        currentPageNum = newPageNum;
        if (currentAudio) currentAudio.pause();
        renderStudentPage(currentPageNum);
    }
}

document.getElementById('btn-prev-page').addEventListener('click', () => changePage(-1));
document.getElementById('btn-next-page').addEventListener('click', () => changePage(1));

// --- 5. EVALUAR RESPUESTAS ---
document.getElementById('btn-evaluate').addEventListener('click', () => {
    let puntosObtenidos = 0;
    let puntosTotales = 0;

    canvas.getObjects().forEach(function(obj) {
        if (!obj.customData) return;
        const data = obj.customData;

        if (data.type === 'text' && data.correctAnswer) {
            puntosTotales += data.points || 0;
            const resAlumno = (obj.text || "").trim().toLowerCase();
            const resEsperada = data.correctAnswer.trim().toLowerCase();

            if (resAlumno === resEsperada) {
                obj.set({ backgroundColor: '#dcfce7', fill: '#166534' });
                puntosObtenidos += data.points || 0;
            } else {
                obj.set({ backgroundColor: '#fee2e2', fill: '#991b1b' });
            }
            obj.set({ editable: false, selectable: false });
        }

        if (data.type === 'choice') {
            puntosTotales += data.points || 0;
            const esCorrecto = (data.isCorrect === !!obj.studentChecked);
            if (esCorrecto) {
                obj.set({ stroke: '#166534', fill: obj.studentChecked ? '#166534' : '#ffffff' });
                puntosObtenidos += data.points || 0;
            } else {
                obj.set({ stroke: '#991b1b', fill: obj.studentChecked ? '#991b1b' : '#ffffff' });
            }
            obj.off('mousedown');
            obj.set({ selectable: false });
        }
    });

    canvas.renderAll();
    pagesEvaluated[currentPageNum] = true;
    btnEvaluate.style.display = 'none';
    alert(`Revisión: ${puntosObtenidos} / ${puntosTotales} puntos.`);
});

// --- 6. RESETEAR PÁGINA ACTUAL ---
btnReset.addEventListener('click', () => {
    if (!confirm("¿Seguro que quieres borrar tus respuestas de esta página?")) return;

    pagesEvaluated[currentPageNum] = false; // Quitar marca de evaluada
    
    canvas.getObjects().forEach(function(obj) {
        if (!obj.customData) return;

        // Resetear Textos
        if (obj.customData.type === 'text') {
            obj.set({
                text: ' ',
                backgroundColor: '#f1f5f9',
                fill: '#333333',
                editable: true,
                selectable: true
            });
        }

        // Resetear Checkboxes
        if (obj.customData.type === 'choice') {
            obj.studentChecked = false;
            obj.set({
                fill: '#ffffff',
                stroke: '#334155',
                selectable: true
            });
        }

        // Re-vincular eventos y quitar bloqueos
        obj.set({ evented: true });
        configurarInteractividad(obj, false);
    });

    canvas.renderAll();
    btnEvaluate.style.display = 'flex'; // Volver a mostrar el botón de revisar
});

// --- 7. ZOOM ---
let zoomActual = 1;
const anchoBase = 794; const altoBase = 1123;
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
