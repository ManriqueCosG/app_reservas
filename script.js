// CONFIGURAR FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyD-OhDPQRecetiYg5ULbE_j7Eta8J6wtfM",
  authDomain: "reservas-8581a.firebaseapp.com",
  projectId: "reservas-8581a",
  storageBucket: "reservas-8581a.firebasestorage.app",
  messagingSenderId: "466171175031",
  appId: "1:466171175031:web:73e77f7ed9aa20b6b2e672",
  measurementId: "G-VB354NGK4M"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ELEMENTOS DOM
const fab = document.getElementById('fab');
const backFab = document.getElementById('backFab');
const formPanel = document.getElementById('formPanel');
const closePanel = document.getElementById('closePanel');
const reservationForm = document.getElementById('reservationForm');
const hoursContainer = document.getElementById('hours');
const reservationList = document.getElementById('reservationList');
const emptyMessage = document.getElementById('emptyMessage');
const errorMessage = document.getElementById('errorMessage');

// HORAS SELECCIONADAS
let selectedHours = [];

// Abrir y cerrar panel
fab.addEventListener('click', () => {
  formPanel.classList.add('open');
  fab.classList.add('hidden');
});

closePanel.addEventListener('click', () => {
  formPanel.classList.remove('open');
  fab.classList.remove('hidden');
  errorMessage.textContent = '';
});

// Selección de horas
hoursContainer.addEventListener('click', (e) => {
  if (e.target.tagName === 'BUTTON') {
    const hour = e.target.getAttribute('data-hour');
    e.target.classList.toggle('selected');

    if (selectedHours.includes(hour)) {
      selectedHours = selectedHours.filter(h => h !== hour);
    } else {
      selectedHours.push(hour);
    }
  }
});

// Guardar reserva en Firebase
reservationForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMessage.textContent = '';

  const selectedObject = document.getElementById('objectSelect').value;
  const date = document.getElementById('dateInput').value;
  const professor = document.getElementById('professorInput').value.trim();

  if (!selectedObject || !date || !professor || selectedHours.length === 0) {
    errorMessage.textContent = 'Por favor completa todos los campos.';
    return;
  }

  // Verificar si la hora está libre
  const snapshot = await db.collection('reservas')
    .where('objeto', '==', selectedObject)
    .where('fecha', '==', date)
    .get();

  let conflict = false;
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.horas.some(h => selectedHours.includes(h))) {
      conflict = true;
    }
  });

  if (conflict) {
    errorMessage.textContent = 'Algunas de las horas seleccionadas ya están reservadas.';
    return;
  }

  // Guardar en Firebase
  await db.collection('reservas').add({
    objeto: selectedObject,
    fecha: date,
    horas: selectedHours,
    profesor: professor,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  // Reset
  reservationForm.reset();
  selectedHours = [];
  document.querySelectorAll('#hours button').forEach(btn => btn.classList.remove('selected'));

  formPanel.classList.remove('open');
  fab.classList.remove('hidden');
});

// Escuchar reservas en tiempo real
db.collection('reservas')
  .orderBy('timestamp', 'asc')
  .onSnapshot(snapshot => {
    reservationList.innerHTML = '';

    if (snapshot.empty) {
      emptyMessage.style.display = 'block';
      return;
    } else {
      emptyMessage.style.display = 'none';
    }

    snapshot.forEach(doc => {
      const reserva = doc.data();
      const card = document.createElement('div');
      card.classList.add('reservation');
      card.innerHTML = `
        <h3>${reserva.objeto}</h3>
        <p><strong>Profesor:</strong> ${reserva.profesor}</p>
        <p><strong>Fecha:</strong> ${reserva.fecha}</p>
        <p><strong>Horas:</strong> ${reserva.horas.join(', ')}</p>
      `;
      reservationList.appendChild(card);
    });
  });
