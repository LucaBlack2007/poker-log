// Import Firebase modules from the CDN (Firebase v9 modular SDK)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// ------------------------------
// Firebase Configuration & Initialization
// ------------------------------
// Replace the placeholder values with your Firebase project configuration.
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBaGgjY0XWS_XKB0-6iFd_AFxnL8ZdK7wA",
  authDomain: "poker-log-91752.firebaseapp.com",
  projectId: "poker-log-91752",
  storageBucket: "poker-log-91752.firebasestorage.app",
  messagingSenderId: "782188578224",
  appId: "1:782188578224:web:c5d9b717d3ead9fe0d4275",
  measurementId: "G-03J2P4K2YN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ------------------------------
// Global Variables
// ------------------------------
let persons = []; // Array of players: { id, name, amount, transactions }
let isEditor = false;
let nextPersonId = 1;
let editorPassword = ""; // Will be loaded from Firestore

// ------------------------------
// Cache DOM Elements
// ------------------------------
const loginStatusEl = document.getElementById("loginStatus");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const editorPasswordInput = document.getElementById("editorPasswordInput");
const logoutButton = document.getElementById("logoutButton");
const addPersonForm = document.getElementById("addPersonForm");
const personNameInput = document.getElementById("personName");
const personAmountInput = document.getElementById("personAmount");
const personListEl = document.getElementById("personList");
const applyChangesButton = document.getElementById("applyChangesButton");
const totalChangeDisplay = document.getElementById("totalChangeDisplay");
const transactionNoteInput = document.getElementById("transactionNote");

// Modal elements
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");

// ------------------------------
// Firestore Persistence Functions
// ------------------------------

// Load players data from Firestore ("poker/data" document)
async function loadData() {
  try {
    const docRef = doc(db, "poker", "data");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      persons = docSnap.data().persons || [];
      if (persons.length > 0) {
        nextPersonId = Math.max(...persons.map((p) => p.id)) + 1;
      }
    } else {
      persons = [];
      await saveData();
    }
    updatePersonList();
  } catch (error) {
    console.error("Error loading persons:", error);
  }
}

// Save players data to Firestore ("poker/data" document)
async function saveData() {
  try {
    const docRef = doc(db, "poker", "data");
    await setDoc(docRef, { persons: persons });
  } catch (error) {
    console.error("Error saving persons:", error);
  }
}

// Load the editor password from Firestore ("poker/settings" document)
async function loadEditorPassword() {
  try {
    const settingsDocRef = doc(db, "poker", "settings");
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      editorPassword = docSnap.data().editorPassword;
    } else {
      // If the settings document doesn't exist, initialize it with a default password.
      editorPassword = "secret123";
      await setDoc(settingsDocRef, { editorPassword: editorPassword });
    }
  } catch (error) {
    console.error("Error loading editor password:", error);
  }
}

// ------------------------------
// UI Update Functions
// ------------------------------
function updateLoginUI() {
  if (isEditor) {
    loginStatusEl.textContent = "Editor: Logged In";
    logoutButton.style.display = "inline-block";
    loginForm.style.display = "none";
    personNameInput.disabled = false;
    personAmountInput.disabled = false;
    applyChangesButton.disabled = false;
  } else {
    loginStatusEl.textContent = "View Only Mode";
    logoutButton.style.display = "none";
    loginForm.style.display = "inline-block";
    personNameInput.disabled = true;
    personAmountInput.disabled = true;
    applyChangesButton.disabled = true;
  }
  updatePersonList();
  updateDynamicTotal();
}

function updatePersonList() {
  personListEl.innerHTML = "";
  persons.forEach((person) => {
    const row = document.createElement("div");
    row.className = "person-row";

    // Create a clickable player name to view transaction history
    const nameEl = document.createElement("div");
    nameEl.className = "person-name";
    nameEl.textContent = person.name;
    nameEl.addEventListener("click", () => showTransactionHistory(person));
    row.appendChild(nameEl);

    // Display the current amount
    const amountEl = document.createElement("div");
    amountEl.className = "person-amount";
    amountEl.textContent = `$${person.amount.toFixed(2)}`;
    row.appendChild(amountEl);

    // Create an adjustment input for bulk changes
    const adjustInput = document.createElement("input");
    adjustInput.type = "number";
    adjustInput.value = "0";
    adjustInput.step = "any";
    adjustInput.className = "person-adjust";
    adjustInput.dataset.personId = person.id;
    if (!isEditor) {
      adjustInput.disabled = true;
    }
    // Update dynamic total as you type
    adjustInput.addEventListener("input", updateDynamicTotal);
    row.appendChild(adjustInput);

    // Add a Remove button (only visible to editors)
    if (isEditor) {
      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => removePlayer(person.id));
      row.appendChild(removeButton);
    }
    personListEl.appendChild(row);
  });
}

// Dynamically update the total change display
function updateDynamicTotal() {
  let total = 0;
  const adjustInputs = document.querySelectorAll(".person-adjust");
  adjustInputs.forEach((input) => {
    const value = parseFloat(input.value) || 0;
    total += value;
  });
  totalChangeDisplay.textContent = `Total Change: $${total.toFixed(2)}`;
}

// ------------------------------
// Modal Functions
// ------------------------------
function showTransactionHistory(person) {
  modalBody.innerHTML = `<h2>${person.name}'s Transaction History</h2>`;
  if (!person.transactions || person.transactions.length === 0) {
    modalBody.innerHTML += "<p>No transactions yet.</p>";
  } else {
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    const headerRow = document.createElement("tr");
    ["Date", "Change", "Note"].forEach((text) => {
      const th = document.createElement("th");
      th.textContent = text;
      th.style.border = "1px solid #ddd";
      th.style.padding = "8px";
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);
    person.transactions.forEach((tx) => {
      const row = document.createElement("tr");
      const dateCell = document.createElement("td");
      dateCell.textContent = tx.date;
      dateCell.style.border = "1px solid #ddd";
      dateCell.style.padding = "8px";
      row.appendChild(dateCell);
      const changeCell = document.createElement("td");
      changeCell.textContent = `$${tx.change.toFixed(2)}`;
      changeCell.style.border = "1px solid #ddd";
      changeCell.style.padding = "8px";
      row.appendChild(changeCell);
      const noteCell = document.createElement("td");
      noteCell.textContent = tx.note || "";
      noteCell.style.border = "1px solid #ddd";
      noteCell.style.padding = "8px";
      row.appendChild(noteCell);
      table.appendChild(row);
    });
    modalBody.appendChild(table);
  }
  modal.style.display = "block";
}

closeModal.addEventListener("click", () => {
  modal.style.display = "none";
});
window.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.style.display = "none";
  }
});

// ------------------------------
// Remove Player Function
// ------------------------------
async function removePlayer(playerId) {
  if (confirm("Are you sure you want to remove this player?")) {
    persons = persons.filter((p) => p.id !== playerId);
    await saveData();
    updatePersonList();
  }
}

// ------------------------------
// Login/Logout Functions
// ------------------------------
loginButton.addEventListener("click", () => {
  const inputPassword = editorPasswordInput.value;
  if (inputPassword === editorPassword) {
    isEditor = true;
    updateLoginUI();
  } else {
    alert("Incorrect password");
  }
});
logoutButton.addEventListener("click", () => {
  isEditor = false;
  updateLoginUI();
});

// ------------------------------
// Event Handlers
// ------------------------------
// Add a new player (with duplicate prevention and initial transaction logged)
addPersonForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!isEditor) return;
  const name = personNameInput.value.trim();
  const amount = parseFloat(personAmountInput.value);
  if (!name || isNaN(amount)) {
    alert("Please provide a valid name and amount.");
    return;
  }
  if (persons.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    alert("Player already exists.");
    return;
  }
  const newPlayer = {
    id: nextPersonId++,
    name: name,
    amount: amount,
    transactions: [
      {
        change: amount,
        note: "Initial amount",
        date: new Date().toLocaleString(),
      },
    ],
  };
  persons.push(newPlayer);
  personNameInput.value = "";
  personAmountInput.value = "";
  await saveData();
  updatePersonList();
});

// Apply all bulk balance changes
applyChangesButton.addEventListener("click", async () => {
  if (!isEditor) return;
  let totalChange = 0;
  const note = transactionNoteInput.value.trim();
  const adjustInputs = document.querySelectorAll(".person-adjust");
  adjustInputs.forEach((input) => {
    const change = parseFloat(input.value) || 0;
    const personId = parseInt(input.dataset.personId);
    const person = persons.find((p) => p.id === personId);
    if (person && change !== 0) {
      person.amount += change;
      totalChange += change;
      person.transactions.push({
        change: change,
        note: note,
        date: new Date().toLocaleString(),
      });
    }
    input.value = "0"; // Reset the input
  });
  await saveData();
  updatePersonList();
  updateDynamicTotal();
  transactionNoteInput.value = "";
});

// ------------------------------
// Initialize Application
// ------------------------------
(async function init() {
  await loadEditorPassword(); // Load the editor password from Firestore
  await loadData(); // Load players data from Firestore
  updateLoginUI();
})();
