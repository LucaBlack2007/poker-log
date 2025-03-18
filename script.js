// Data storage and state variables
let persons = []; // Each person: { id, name, amount, transactions }
let isEditor = false;
let nextPersonId = 1;
const EDITOR_PASSWORD = import.meta.env.VITE_EDITOR_PASSWORD; // Change this to your desired password

// Cache DOM elements
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

// --- Persistent Data Functions ---
function saveData() {
  localStorage.setItem("pokerPersons", JSON.stringify(persons));
  localStorage.setItem("isEditor", isEditor ? "true" : "false");
}

function loadData() {
  const storedPersons = localStorage.getItem("pokerPersons");
  if (storedPersons) {
    persons = JSON.parse(storedPersons);
    if (persons.length > 0) {
      nextPersonId = Math.max(...persons.map(p => p.id)) + 1;
    }
  }
  isEditor = localStorage.getItem("isEditor") === "true";
}

// --- UI Update Functions ---
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
  
  persons.forEach(person => {
    const row = document.createElement("div");
    row.className = "person-row";
    
    // Player name element (clickable to view transaction history)
    const nameEl = document.createElement("div");
    nameEl.className = "person-name";
    nameEl.textContent = person.name;
    nameEl.addEventListener("click", () => showTransactionHistory(person));
    row.appendChild(nameEl);
    
    // Current amount display
    const amountEl = document.createElement("div");
    amountEl.className = "person-amount";
    amountEl.textContent = `$${person.amount.toFixed(2)}`;
    row.appendChild(amountEl);
    
    // Adjustment input for bulk changes
    const adjustInput = document.createElement("input");
    adjustInput.type = "number";
    adjustInput.value = "0";
    adjustInput.className = "person-adjust";
    adjustInput.dataset.personId = person.id;
    if (!isEditor) {
      adjustInput.disabled = true;
    }
    // Update dynamic total as you type
    adjustInput.addEventListener("input", updateDynamicTotal);
    row.appendChild(adjustInput);
    
    // Remove button (only visible to editors)
    if (isEditor) {
      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => removePlayer(person.id));
      row.appendChild(removeButton);
    }
    
    personListEl.appendChild(row);
  });
}

// Dynamically update the total change display as numbers are typed
function updateDynamicTotal() {
  let total = 0;
  const adjustInputs = document.querySelectorAll(".person-adjust");
  adjustInputs.forEach(input => {
    const value = parseFloat(input.value) || 0;
    total += value;
  });
  totalChangeDisplay.textContent = `Total Change: $${total.toFixed(2)}`;
}

// --- Modal Functions ---
function showTransactionHistory(person) {
  modalBody.innerHTML = `<h2>${person.name}'s Transaction History</h2>`;
  
  if (!person.transactions || person.transactions.length === 0) {
    modalBody.innerHTML += "<p>No transactions yet.</p>";
  } else {
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    
    const headerRow = document.createElement("tr");
    ["Date", "Change", "Note"].forEach(text => {
      const th = document.createElement("th");
      th.textContent = text;
      th.style.border = "1px solid #ddd";
      th.style.padding = "8px";
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);
    
    person.transactions.forEach(tx => {
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

// --- Remove Player Function ---
function removePlayer(playerId) {
  if (confirm("Are you sure you want to remove this player?")) {
    persons = persons.filter(p => p.id !== playerId);
    saveData();
    updatePersonList();
  }
}

// --- Login/Logout Functions ---
loginButton.addEventListener("click", () => {
  const inputPassword = editorPasswordInput.value;
  if (inputPassword === EDITOR_PASSWORD) {
    isEditor = true;
    saveData();
    updateLoginUI();
  } else {
    alert("Incorrect password");
  }
});

logoutButton.addEventListener("click", () => {
  isEditor = false;
  saveData();
  updateLoginUI();
});

// --- Event Handlers ---
// Add a new player (with duplicate check and initial transaction logged)
addPersonForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!isEditor) return;
  
  const name = personNameInput.value.trim();
  const amount = parseFloat(personAmountInput.value);
  if (!name || isNaN(amount)) {
    alert("Please provide a valid name and amount.");
    return;
  }
  // Prevent duplicate player names (case-insensitive)
  if (persons.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    alert("Player already exists.");
    return;
  }
  
  // Create a new player and log the initial amount as a transaction
  const newPlayer = {
    id: nextPersonId++,
    name: name,
    amount: amount,
    transactions: [{
      change: amount,
      note: "Initial amount",
      date: new Date().toLocaleString()
    }]
  };
  persons.push(newPlayer);
  personNameInput.value = "";
  personAmountInput.value = "";
  saveData();
  updatePersonList();
});

// Apply all bulk balance changes
applyChangesButton.addEventListener("click", () => {
  if (!isEditor) return;
  
  let totalChange = 0;
  const note = transactionNoteInput.value.trim();
  
  const adjustInputs = document.querySelectorAll(".person-adjust");
  adjustInputs.forEach(input => {
    const change = parseFloat(input.value) || 0;
    const personId = parseInt(input.dataset.personId);
    const person = persons.find(p => p.id === personId);
    if (person && change !== 0) {
      person.amount += change;
      totalChange += change;
      
      // Record the transaction with the date, change, and optional note
      person.transactions.push({
        change: change,
        note: note,
        date: new Date().toLocaleString()
      });
    }
    input.value = "0"; // Reset after applying
  });
  
  saveData();
  updatePersonList();
  updateDynamicTotal(); // Reset the dynamic total display
  transactionNoteInput.value = ""; // Clear note input
});

// --- Initialize ---
loadData();
updateLoginUI();
