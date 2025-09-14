// --- CONFIGURAR FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyD1-3Sr2PF4MEhcBA5cZHG-lT1sp8Lk1pg",
  authDomain: "app-reserva-48699.firebaseapp.com",
  projectId: "app-reserva-48699",
  storageBucket: "app-reserva-48699.firebasestorage.app",
  messagingSenderId: "999532400444",
  appId: "1:999532400444:web:ef3d1333a6d06e31871839",
  measurementId: "G-JGXP31S2Q1"
};

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- SELECCIÓN DE HORAS ---
const hourButtons = document.querySelectorAll('#hours button');
hourButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    // Evitar seleccionar una hora bloqueada
    if (btn.classList.contains('blocked')) return;
    btn.classList.toggle('selected');
  });
});

// --- ELEMENTOS DEL DOM ---
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
const dateInput = document.getElementById('dateInput');

let reservations = [];

// --- CONFIGURAR FECHA MÍNIMA (no fechas pasadas) ---
const today = new Date().toISOString().split('T')[0];
dateInput.setAttribute('min', today);

// --- MOSTRAR PANEL ---
fab.addEventListener('click', () => {
  formPanel.classList.add('open');
  fab.classList.add('hidden');
});

// --- CERRAR PANEL ---
closePanel.addEventListener('click', () => {
  formPanel.classList.remove('open');
  fab.classList.remove('hidden');
});

// --- AGREGAR NUEVO OBJETO ---
addObjectBtn.addEventListener('click', () => {
  const newObject = newObjectInput.value.trim();
  if (newObject) {
    const option = document.createElement('option');
    option.value = newObject;
    option.textContent = newObject;
    objectSelect.appendChild(option);
    objectSelect.value = newObject;
    newObjectInput.value = '';

    updateBlockedHours(); // Actualizar visualización de horas
  }
});

// --- ACTUALIZAR HORAS BLOQUEADAS ---
function updateBlockedHours() {
  const selectedObject = objectSelect.value;
  const selectedDate = dateInput.value;

  // Resetear estilos de horas
  hourButtons.forEach(btn => {
    btn.classList.remove('blocked', 'selected');
    btn.disabled = false;
  });

  if (!selectedObject || !selectedDate) return;

  // Buscar reservas para ese objeto y esa fecha
  const currentReservations = reservations.filter(res =>
    res.object === selectedObject && res.date === selectedDate
  );

  // Obtener todas las horas ocupadas
  const blockedHours = currentReservations.flatMap(res => res.hours);

  // Marcar como bloqueadas en la UI
  hourButtons.forEach(btn => {
    if (blockedHours.includes(btn.dataset.hour)) {
      btn.classList.add('blocked');
      btn.disabled = true; // No se puede seleccionar
    }
  });
}

// --- EVENTOS PARA DETECTAR CAMBIOS EN OBJETO O FECHA ---
objectSelect.addEventListener('change', updateBlockedHours);
dateInput.addEventListener('change', updateBlockedHours);

// --- CREAR RESERVA EN FIREBASE ---
async function createReservation(reservation) {
  try {
    await db.collection('reservations').add(reservation);
    console.log("Reserva guardada en Firebase");
  } catch (error) {
    console.error("Error guardando reserva:", error);
  }
}

// --- SUBMIT DEL FORMULARIO ---
reservationForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const selectedObject = objectSelect.value;
  const date = dateInput.value;
  const professor = document.getElementById('professorInput').value;
  const selectedHours = Array.from(document.querySelectorAll('#hours button.selected'))
    .map(btn => btn.dataset.hour);

  errorMessage.textContent = '';

  // Validar campos
  if (!selectedObject || !date || !professor || selectedHours.length === 0) {
    errorMessage.textContent = 'Por favor completa todos los campos y selecciona al menos una hora.';
    return;
  }

  // Validar fecha pasada
  const todayDate = new Date(today);
  const selectedDate = new Date(date);
  if (selectedDate < todayDate) {
    errorMessage.textContent = 'No puedes reservar en una fecha pasada.';
    return;
  }

  // Validar conflictos en Firestore
  const snapshot = await db.collection('reservations')
    .where('object', '==', selectedObject)
    .where('date', '==', date)
    .get();

  let conflict = false;
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.hours.some(h => selectedHours.includes(h))) {
      conflict = true;
    }
  });

  if (conflict) {
    errorMessage.textContent = 'Error: Este objeto ya está reservado en alguna de las horas seleccionadas.';
    return;
  }

  // Crear reserva en Firebase
  await createReservation({
    object: selectedObject,
    date,
    professor,
    hours: selectedHours
  });

  // Reset formulario
  reservationForm.reset();
  hourButtons.forEach(btn => btn.classList.remove('selected'));

  // Actualizar horas bloqueadas
  updateBlockedHours();

  // Cerrar panel
  formPanel.classList.remove('open');
  fab.classList.remove('hidden');
});

// --- ESCUCHAR CAMBIOS EN TIEMPO REAL ---
db.collection('reservations').onSnapshot((snapshot) => {
  reservations = [];
  reservationList.innerHTML = '';

  snapshot.forEach(doc => {
    const data = doc.data();
    reservations.push({ id: doc.id, ...data });
    renderReservation({ id: doc.id, ...data });
  });

  if (reservations.length === 0) {
    emptyMessage.style.display = 'block';
  } else {
    emptyMessage.style.display = 'none';
  }

  // Actualizar visualización de horas bloqueadas
  updateBlockedHours();
});

// --- RENDERIZAR UNA TARJETA ---
function renderReservation(reservation) {
  const card = document.createElement('div');
  card.classList.add('reservation');
  card.dataset.id = reservation.id;

  card.innerHTML = `
    <button class="btn-delete">&times;</button>
    <h3>${reservation.object}</h3>
    <p><strong>Profesor:</strong> ${reservation.professor}</p>
    <p><strong>Fecha:</strong> ${reservation.date}</p>
    <p><strong>Horas:</strong> ${reservation.hours.join(', ')}</p>
  `;

  // Evento para eliminar reserva en Firebase
  card.querySelector('.btn-delete').addEventListener('click', () => {
    deleteReservation(reservation.id);
  });

  reservationList.appendChild(card);
}

// --- ELIMINAR RESERVA EN FIREBASE ---
async function deleteReservation(id) {
  try {
    await db.collection('reservations').doc(id).delete();
    console.log("Reserva eliminada en Firebase");
  } catch (error) {
    console.error("Error eliminando reserva:", error);
  }
}
