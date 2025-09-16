// --- SISTEMA DE LOGIN ---
// Lista de contraseñas válidas
const validPasswords = ["3456", "6863", "6794"];

// Elementos del DOM del login
const loginScreen = document.getElementById("loginScreen");
const loginBtn = document.getElementById("loginBtn");
const passwordInput = document.getElementById("passwordInput");
const loginError = document.getElementById("loginError");

// Ocultar la aplicación si no está logueado
if (localStorage.getItem("isLoggedIn") === "true") {
  loginScreen.style.display = "none"; // Oculta la pantalla de login
} else {
  document.querySelector("main").style.display = "none"; // Oculta la app
  document.getElementById("fab").style.display = "none";
}

// Evento de login
loginBtn.addEventListener("click", () => {
  const enteredPassword = passwordInput.value.trim();

  if (validPasswords.includes(enteredPassword)) {
    localStorage.setItem("isLoggedIn", "true");
    loginScreen.style.display = "none";

    // Mostrar la app
    document.querySelector("main").style.display = "block";
    document.getElementById("fab").style.display = "block";

    // Ejecutar limpieza inicial
    cleanOldReservations();
  } else {
    loginError.textContent = "Contraseña incorrecta.";
  }
});

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
firebase.initializeApp(firebaseConfig);
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

// --- ACTUALIZAR HORAS BLOQUEADAS ---
function updateBlockedHours() {
  const selectedObject = objectSelect.value;
  const selectedDate = dateInput.value;

  hourButtons.forEach(btn => {
    btn.classList.remove('blocked', 'selected');
    btn.disabled = false;
  });

  if (!selectedObject || !selectedDate) return;

  const currentReservations = reservations.filter(res =>
    res.object === selectedObject && res.date === selectedDate
  );

  const blockedHours = currentReservations.flatMap(res => res.hours);

  hourButtons.forEach(btn => {
    if (blockedHours.includes(btn.dataset.hour)) {
      btn.classList.add('blocked');
      btn.disabled = true;
    }
  });
}

// --- EVENTOS PARA DETECTAR CAMBIOS EN OBJETO O FECHA ---
objectSelect.addEventListener('change', updateBlockedHours);
dateInput.addEventListener('change', updateBlockedHours);

// --- CREAR RESERVA ---
reservationForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const selectedObject = objectSelect.value;
  const date = dateInput.value;
  const professor = document.getElementById('professorInput').value;
  const selectedHours = Array.from(document.querySelectorAll('#hours button.selected'))
    .map(btn => btn.dataset.hour);

  errorMessage.textContent = '';

  if (!selectedObject || !date || !professor || selectedHours.length === 0) {
    errorMessage.textContent = 'Por favor completa todos los campos y selecciona al menos una hora.';
    return;
  }

  const todayDate = new Date(today);
  const selectedDate = new Date(date);
  if (selectedDate < todayDate) {
    errorMessage.textContent = 'No puedes reservar en una fecha pasada.';
    return;
  }

  const conflict = reservations.some(res =>
    res.object === selectedObject &&
    res.date === date &&
    res.hours.some(h => selectedHours.includes(h))
  );

  if (conflict) {
    errorMessage.textContent = 'Error: Este objeto ya está reservado en alguna de las horas seleccionadas.';
    return;
  }

  try {
    await db.collection('reservations').add({
      object: selectedObject,
      date: date,
      professor: professor,
      hours: selectedHours
    });
  } catch (error) {
    console.error("Error al guardar la reserva:", error);
  }

  reservationForm.reset();
  hourButtons.forEach(btn => btn.classList.remove('selected'));

  updateBlockedHours();

  formPanel.classList.remove('open');
  fab.classList.remove('hidden');
});

// --- RENDERIZAR UNA TARJETA ---
function renderReservation(reservation) {
  const card = document.createElement('div');
  card.classList.add('reservation');
  card.dataset.id = reservation.id;

  card.innerHTML = `
    <h3>${reservation.object}</h3>
    <p><strong>Profesor:</strong> ${reservation.professor}</p>
    <p><strong>Fecha:</strong> ${reservation.date}</p>
    <p><strong>Hora:</strong> ${reservation.hours.map(h => `${h}ª`).join(', ')}</p>
  `;

  reservationList.appendChild(card);
}

// --- LIMPIAR RESERVAS AUTOMÁTICAMENTE ---
async function cleanOldReservations() {
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  
  // Hora actual en minutos desde medianoche
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const cutoffMinutes = 14 * 60 + 30; // 14:30 en minutos

  const snapshot = await db.collection('reservations').get();
  snapshot.forEach(doc => {
    const res = doc.data();
    const resDate = new Date(res.date);
    const resDateString = resDate.toISOString().split('T')[0];

    // Eliminar si la fecha es anterior a hoy
    if (resDateString < currentDate) {
      db.collection('reservations').doc(doc.id).delete();
    }
    // Eliminar si es hoy pero ya pasó de las 14:30
    else if (resDateString === currentDate && currentMinutes >= cutoffMinutes) {
      db.collection('reservations').doc(doc.id).delete();
    }
  });
}

// --- ESCUCHAR CAMBIOS EN TIEMPO REAL ---
db.collection('reservations').onSnapshot(snapshot => {
  reservations = [];
  reservationList.innerHTML = '';

  snapshot.forEach(doc => {
    const data = doc.data();
    reservations.push({ id: doc.id, ...data });
  });

  if (reservations.length === 0) {
    emptyMessage.style.display = 'block';
  } else {
    emptyMessage.style.display = 'none';
    reservations.forEach(renderReservation);
  }

  updateBlockedHours();
});

// --- EJECUTAR LIMPIEZA AL INICIO ---
cleanOldReservations();
