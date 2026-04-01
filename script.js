// 1. Inicializar el lienzo de Fabric.js
const canvas = new fabric.Canvas('ebook-canvas', {
    backgroundColor: '#ffffff'
});

// Referencias a elementos del DOM
const propertiesPanel = document.getElementById('properties-panel');
const inputCorrectAnswer = document.getElementById('correct-answer');
const btnText = document.getElementById('btn-text');
const btnDelete = document.getElementById('btn-delete');

// 2. Función para agregar una caja de texto rellenable
btnText.addEventListener('click', () => {
    // Creamos un texto editable
    const editableText = new fabric.IText('Doble clic para editar...', {
        left: 100,
        top: 100,
        fontFamily: 'Inter',
        fontSize: 20,
        fill: '#333333',
        backgroundColor: '#f1f5f9',
        padding: 10,
        borderColor: '#3b82f6', // Color de selección
        cornerColor: '#3b82f6',
        transparentCorners: false,
        // AQUÍ ESTÁ LA MAGIA: Guardamos metadatos ocultos
        customData: {
            correctAnswer: '',
            type: 'fill-in-blank',
            points: 1
        }
    });

    canvas.add(editableText);
    canvas.setActiveObject(editableText); // Lo seleccionamos automáticamente
});

// 3. Lógica para mostrar/ocultar el panel derecho según lo seleccionado
canvas.on('selection:created', showProperties);
canvas.on('selection:updated', showProperties);
canvas.on('selection:cleared', hideProperties);

function showProperties(event) {
    const selectedObj = event.selected[0];
    
    // Si es un objeto que tiene nuestras propiedades personalizadas
    if (selectedObj && selectedObj.customData) {
        propertiesPanel.style.display = 'block'; // Mostramos el panel
        
        // Cargamos el valor actual en el input
        inputCorrectAnswer.value = selectedObj.customData.correctAnswer || '';
        
        // Removemos listeners anteriores para evitar duplicados
        inputCorrectAnswer.oninput = null; 
        
        // Cuando el creador escribe en el input, se guarda en el objeto
        inputCorrectAnswer.oninput = (e) => {
            selectedObj.customData.correctAnswer = e.target.value;
        };
    }
}

function hideProperties() {
    propertiesPanel.style.display = 'none'; // Ocultamos el panel
}

// 4. Eliminar el elemento seleccionado
btnDelete.addEventListener('click', () => {
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
        canvas.discardActiveObject();
        activeObjects.forEach(function(object) {
            canvas.remove(object);
        });
    }
});
