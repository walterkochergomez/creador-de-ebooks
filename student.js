const canvas = new fabric.Canvas('student-canvas', { backgroundColor: '#e2e8f0' });

let lessonData = {}; 
let currentPageNum = 1;
let totalPages = 1;
let currentAudio = null; 

const pageIndicator = document.getElementById('page-indicator');
const btnEvaluate = document.getElementById('btn-evaluate');

// --- 1. CARGAR LECCIÓN ---
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
            btnEvaluate.style.display = 'flex';
            renderStudentPage(currentPageNum);
        } catch (error) {
            alert("Error: El archivo no es una lección válida.");
        }
    };
    reader.readAsText(file);
});

// --- 2. RENDERIZAR Y BLOQUEAR OBJETOS ---
function renderStudentPage(num) {
    pageIndicator.innerText = `Página ${num} de ${totalPages}`;
    const pageJson = lessonData[num];
    if (!pageJson) return;

    canvas.loadFromJSON(pageJson, function() {
        canvas.getObjects().forEach(function(obj) {
            
            // Congelamos todos los objetos para que no se muevan
            obj.set({
                selectable: true, hasControls: false, hasBorders: false, 
                lockMovementX: true, lockMovementY: true, hoverCursor: 'default'
            });

            // Lógica Caja de Texto
            if (obj.customData && obj.customData.type === 'text') {
                obj.set({ editable: true, hoverCursor: 'text', text: '' });
            }

            // Lógica Botón de Audio
            if (obj.customData && obj.customData.type === 'audio') {
                obj.set({ editable: false, hoverCursor: 'pointer' });
                obj.on('mousedown', function() {
                    const url = obj.customData.audioUrl;
                    if (url) {
                        if (currentAudio) currentAudio.pause();
                        currentAudio = new Audio(url);
                        currentAudio.play().catch(() => alert("Error al reproducir el audio."));
                    }
                });
            }

            // Lógica Checkbox
            if (obj.customData && obj.customData.type === 'choice') {
                obj.set({ hoverCursor: 'pointer' });
                obj.studentChecked = false; 
                obj.on('mousedown', function() {
                    obj.studentChecked = !obj.studentChecked;
                    obj.set('fill', obj.studentChecked ? '#3b82f6' : '#ffffff');
                    canvas.renderAll();
                });
            }
        });
        canvas.renderAll();
    });
}

// --- 3. PAGINACIÓN ---
function changePage(delta) {
    if (Object.keys(lessonData).length === 0) return;
    
    // Guardar respuestas actuales antes de cambiar de página
    lessonData[currentPageNum] = canvas.toJSON(['customData', 'studentChecked']);

    let newPageNum = currentPageNum + delta;
    if (newPageNum >= 1 && newPageNum <= totalPages) {
        currentPageNum = newPageNum;
        if (currentAudio) currentAudio.pause();
        renderStudentPage(currentPageNum);
    }
}
document.getElementById('btn-prev-page').addEventListener('click', () => changePage(-1));
document.getElementById('btn-next-page').addEventListener('click', () => changePage(1));

// --- 4. ZOOM ---
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

// --- 5. EVALUAR RESPUESTAS (Base para el futuro) ---
document.getElementById('btn-evaluate').addEventListener('click', () => {
    alert("¡Aquí implementaremos la lógica que cuenta los puntos sumando las cajas de texto correctas y los checkboxes marcados!");
});
