// SELECCIÓN DE HORAS
const hourButtons = document.querySelectorAll('#hours button');
hourButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('selected');
  });
});

// ELEMENTOS DEL DOM
const fab = document.getElementById('fab');
const formPanel = document.getElementById('formPanel');
const closePanel = document.getElementById('closePanel');
const reservationForm = document.getElementById('reservationForm');
const errorMessage = document.getElementById('errorMessage');
const reservationList = document.getElementById('reservationList');
const emptyMessage = document.getElementById('emptyMessage');
const objectSelect = document.getElementById('objectSelect');
const addObjectBtn = document.getElementById('addObjectBtn');
const newObjectInput = document.getElementById('newObjectInput');

let reservations = [];

// MOSTRAR PANEL
fab.addEventListener('click', () => {
  formPanel.classList.add('open');
  fab.classList.add('hidden'); // Oculta FAB
});

// CERRAR PANEL
closePanel.addEventListener('click', () => {
  formPanel.classList.remove('open');
  fab.classList.remove('hidden'); // Muestra FAB
});

// AGREGAR NUEVO OBJETO
addObjectBtn.addEventListener('click', () => {
  const newObject = newObjectInput.value.trim();
  if (newObject) {
    const option = document.createElement('option');
    option.value = newObject;
    option.textContent = newObject;
    objectSelect.appendChild(option);
    objectSelect.value = newObject;
    newObjectInput.value = '';
  }
});

// CREAR RESERVA
reservationForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const selectedObject = objectSelect.value;
  const date = document.getElementById('dateInput').value;
  const professor = document.getElementById('professorInput').value;
  const selectedHours = Array.from(document.querySelectorAll('#hours button.selected'))
    .map(btn => btn.dataset.hour);

  errorMessage.textContent = '';

  if (!selectedObject || !date || !professor || selectedHours.length === 0) {
    errorMessage.textContent = 'Por favor completa todos los campos y selecciona al menos una hora.';
    return;
  }

  // VALIDAR CONFLICTOS
  const conflict = reservations.some(res =>
    res.object === selectedObject &&
    res.date === date &&
    res.hours.some(h => selectedHours.includes(h))
  );

  if (conflict) {
    errorMessage.textContent = 'Error: Este objeto ya está reservado en alguna de las horas seleccionadas.';
    return;
  }

  // AGREGAR RESERVA
  reservations.push({
    object: selectedObject,
    date: date,
    professor: professor,
    hours: selectedHours
  });

  if (emptyMessage) {
    emptyMessage.style.display = 'none';
  }

  // CREAR TARJETA
  const card = document.createElement('div');
  card.classList.add('reservation');
  card.innerHTML = `
    <h3>${selectedObject}</h3>
    <p><strong>Profesor:</strong> ${professor}</p>
    <p><strong>Fecha:</strong> ${date}</p>
    <p><strong>Horas:</strong> ${selectedHours.join(', ')}</p>
  `;
  reservationList.appendChild(card);

  // RESET FORM
  reservationForm.reset();
  hourButtons.forEach(btn => btn.classList.remove('selected'));

  // CERRAR PANEL Y MOSTRAR FAB
  formPanel.classList.remove('open');
  fab.classList.remove('hidden');
});
