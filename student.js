// Inicializar el lienzo (sin fondo al principio)
const canvas = new fabric.Canvas('student-canvas', { backgroundColor: '#e2e8f0' });

let lessonData = {}; // Aquí guardaremos todo el JSON
let currentPageNum = 1;
let totalPages = 1;
let currentAudio = null; // Para evitar que suenen dos audios a la vez

// Referencias DOM
const pageIndicator = document.getElementById('page-indicator');
const btnEvaluate = document.getElementById('btn-evaluate');

// --- 1. CARGAR EL ARCHIVO JSON ---
document.getElementById('btn-load-lesson').addEventListener('click', () => {
    document.getElementById('file-lesson').click();
});

document.getElementById('file-lesson').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            lessonData = JSON.parse(event.target.result);
            // Averiguar cuántas páginas tiene el JSON (contando las llaves del objeto)
            totalPages = Object.keys(lessonData).length;
            currentPageNum = 1;
            
            // Mostrar el botón de revisar respuestas
            btnEvaluate.style.display = 'inline-block';
            
            renderStudentPage(currentPageNum);
        } catch (error) {
            alert("Error: El archivo no es una lección válida.");
        }
    };
    reader.readAsText(file);
});

// --- 2. RENDERIZAR LA PÁGINA PARA EL ESTUDIANTE ---
function renderStudentPage(num) {
    pageIndicator.innerText = `Página ${num} de ${totalPages}`;
    
    // Cargamos los datos de la página actual desde el JSON
    const pageJson = lessonData[num];
    if (!pageJson) return;

    canvas.loadFromJSON(pageJson, function() {
        
        // UNA VEZ CARGADO, RECORREMOS TODOS LOS OBJETOS PARA "BLOQUEARLOS"
        canvas.getObjects().forEach(function(obj) {
            
            // Bloqueamos movimiento, rotación y escalado
            obj.set({
                selectable: true, // Debe ser seleccionable para poder interactuar
                hasControls: false, // Quitamos los cuadritos de redimensionar
                hasBorders: false,  // Quitamos el borde azul de selección
                lockMovementX: true, // No se puede mover
                lockMovementY: true, // No se puede mover
                hoverCursor: 'default'
            });

            // Si es una CAJA DE TEXTO
            if (obj.customData && obj.customData.type === 'text') {
                obj.set({
                    editable: true, // El alumno PUEDE escribir
                    hoverCursor: 'text',
                    text: '' // Vaciamos la respuesta que dejó el profesor de ejemplo (opcional)
                });
            }

            // Si es un BOTÓN DE AUDIO
            if (obj.customData && obj.customData.type === 'audio') {
                obj.set({
                    editable: false, // El alumno no puede cambiar el texto del botón
                    hoverCursor: 'pointer'
                });
                
                // Evento al hacer clic en el botón
                obj.on('mousedown', function() {
                    const url = obj.customData.audioUrl;
                    if (url) {
                        if (currentAudio) currentAudio.pause(); // Pausar anterior si lo hay
                        currentAudio = new Audio(url);
                        currentAudio.play().catch(e => alert("No se pudo reproducir el audio. Verifica la URL."));
                    } else {
                        alert("Este botón no tiene un audio asignado.");
                    }
                });
            }

            // Si es una OPCIÓN MÚLTIPLE (Checkbox)
            if (obj.customData && obj.customData.type === 'choice') {
                obj.set({ hoverCursor: 'pointer' });
                // Le agregamos una propiedad temporal para saber si el alumno la marcó
                obj.studentChecked = false; 
                
                // Evento al hacer clic en el cuadrito
                obj.on('mousedown', function() {
                    obj.studentChecked = !obj.studentChecked; // Cambia el estado
                    
                    if (obj.studentChecked) {
                        obj.set('fill', '#3b82f6'); // Se pinta azul al marcar
                    } else {
                        obj.set('fill', '#ffffff'); // Vuelve a blanco al desmarcar
                    }
                    canvas.renderAll(); // Refrescar lienzo
                });
            }
        });

        canvas.renderAll(); // Renderizar los cambios
    });
}

// --- 3. CONTROLES DE PÁGINA ---
function changePage(delta) {
    if (Object.keys(lessonData).length === 0) return; // Si no hay lección cargada

    // NOTA: En una versión avanzada, aquí guardaríamos lo que el alumno escribió 
    // antes de cambiar de página. Por ahora, navegamos simple.
    
    let newPageNum = currentPageNum + delta;
    if (newPageNum >= 1 && newPageNum <= totalPages) {
        currentPageNum = newPageNum;
        if (currentAudio) currentAudio.pause(); // Pausar audio si cambia de página
        renderStudentPage(currentPageNum);
    }
}

document.getElementById('btn-prev-page').addEventListener('click', () => changePage(-1));
document.getElementById('btn-next-page').addEventListener('click', () => changePage(1));
