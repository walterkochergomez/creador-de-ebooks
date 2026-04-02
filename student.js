// --- 1. INICIALIZAR EL LIENZO ---
const canvas = new fabric.Canvas('student-canvas', { backgroundColor: '#e2e8f0' });

let lessonData = {}; 
let currentPageNum = 1;
let totalPages = 1;
let currentAudio = null; 

// Referencias DOM
const pageIndicator = document.getElementById('page-indicator');
const btnEvaluate = document.getElementById('btn-evaluate');

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
            btnEvaluate.style.display = 'flex'; // Mostrar botón de revisión
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

    canvas.loadFromJSON(pageJson, function() {
        
        canvas.getObjects().forEach(function(obj) {
            
            // 1. Congelar propiedades básicas para que no puedan mover ni deformar nada
            obj.set({
                selectable: true, // Debe ser seleccionable para interactuar (escribir, clics)
                hasControls: false, 
                hasBorders: false, 
                lockMovementX: true, 
                lockMovementY: true, 
                hoverCursor: 'default'
            });

            // 2. Lógica Específica: Caja de Texto (Textbox)
            if (obj.customData && obj.customData.type === 'text') {
                obj.set({ 
                    editable: true, 
                    hoverCursor: 'text', 
                    text: ' ', // Espacio para que la caja mantenga su altura y no colapse
                    backgroundColor: '#f1f5f9' // Gris claro para indicar que es rellenable
                });

                // Efecto visual: Al enfocar la caja
                obj.on('editing:entered', function() {
                    if (obj.text === ' ' || obj.text === 'Escribe aquí...') {
                        obj.selectAll(); 
                    }
                    obj.set('backgroundColor', '#ffffff'); // Fondo blanco al editar
                    canvas.renderAll();
                });

                // Efecto visual: Al salir de la caja
                obj.on('editing:exited', function() {
                    obj.set('backgroundColor', '#f1f5f9'); // Vuelve a gris
                    if (obj.text.trim() === '') {
                        obj.set('text', ' '); // Evitar que desaparezca si la dejan vacía
                    }
                    canvas.renderAll();
                });
            }

            // 3. Lógica Específica: Botón de Audio
            if (obj.customData && obj.customData.type === 'audio') {
                obj.set({ 
                    editable: false, // El alumno no edita el texto del botón
                    hoverCursor: 'pointer' 
                });
                
                obj.on('mousedown', function() {
                    const url = obj.customData.audioUrl;
                    if (url) {
                        if (currentAudio) currentAudio.pause(); // Pausar si hay otro sonando
                        currentAudio = new Audio(url);
                        currentAudio.play().catch(() => alert("Error al reproducir el audio. Verifica el enlace."));
                    } else {
                        alert("Este botón no tiene un audio asignado.");
                    }
                });
            }

            // 4. Lógica Específica: Checkbox (Opción Múltiple)
            if (obj.customData && obj.customData.type === 'choice') {
                obj.set({ hoverCursor: 'pointer' });
                obj.studentChecked = false; // Estado local para el alumno
                
                obj.on('mousedown', function() {
                    obj.studentChecked = !obj.studentChecked;
                    // Cambio visual al marcar/desmarcar
                    obj.set('fill', obj.studentChecked ? '#3b82f6' : '#ffffff');
                    canvas.renderAll();
                });
            }
        });
        
        canvas.renderAll();
    });
}

// --- 4. PAGINACIÓN ---
function changePage(delta) {
    if (Object.keys(lessonData).length === 0) return;
    
    // Guardar respuestas actuales del alumno antes de cambiar de página
    // (Por si vuelve atrás, no pierda lo que escribió)
    lessonData[currentPageNum] = canvas.toJSON(['customData', 'studentChecked']);

    let newPageNum = currentPageNum + delta;
    if (newPageNum >= 1 && newPageNum <= totalPages) {
        currentPageNum = newPageNum;
        if (currentAudio) currentAudio.pause(); // Detener audios al cambiar de página
        renderStudentPage(currentPageNum);
    }
}

document.getElementById('btn-prev-page').addEventListener('click', () => changePage(-1));
document.getElementById('btn-next-page').addEventListener('click', () => changePage(1));

// --- 5. ZOOM ---
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

// --- 6. EVALUAR RESPUESTAS ---
document.getElementById('btn-evaluate').addEventListener('click', () => {
    alert("Pronto implementaremos la validación de respuestas. ¡Asegúrate de haber asignado las respuestas correctas en el Creador!");
});
