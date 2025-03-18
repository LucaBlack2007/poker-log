// Data storage and state variables
let persons = []; // Each person: { id, name, amount, transactions }
let allowedEditors = ["lucablack2007@gmail.com", "forrest.holt@gmail.com"];
let isEditor = false;
let currentUserEmail = null;
let nextPersonId = 1;

// Cache DOM elements
const loginStatusEl = document.getElementById("loginStatus");
const logoutButton = document.getElementById("logoutButton");
const addPersonForm = document.getElementById("addPersonForm");
const personNameInput = document.getElementById("personName");
const personAmountInput = document.getElementById("personAmount");
const personListEl = document.getElementById("personList");
const applyChangesButton = document.getElementById("applyChangesButton");
const totalChangeDisplay = document.getElementById("totalChangeDisplay");
const editorSection = document.getElementById("editorSection");
const addEditorForm = document.getElementById("addEditorForm");
const editorEmailInput = document.getElementById("editorEmail");
const editorsUl = document.getElementById("editorsUl");
const transactionNoteInput = document.getElementById("transactionNote");

// Modal elements
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");

// --- Initialize Google Auth ---
gapi.load('auth2', function() {
  gapi.auth2.init().then(() => {
    console.log("Google Auth initialized");
  });
});

// --- UI Update Functions ---
function updateLoginUI() {
  if (isEditor) {
    loginStatusEl.textContent = `Editor: ${currentUserEmail}`;
    logoutButton.style.display = "inline-block";
    document.getElementById("gSignInButton").style.display = "none";
    personNameInput.disabled = false;
    personAmountInput.disabled = false;
    applyChangesButton.disabled = false;
    editorSection.style.display = "block";
  } else {
    loginStatusEl.textContent = "View Only Mode";
    logoutButton.style.display = "none";
    document.getElementById("gSignInButton").style.display = "block";
    personNameInput.disabled = true;
    personAmountInput.disabled = true;
    applyChangesButton.disabled = true;
    editorSection.style.display = "none";
  }
  updatePersonList();
  updateEditorList();
}

function updatePersonList() {
  personListEl.innerHTML = "";
  
  persons.forEach(person => {
    const row = document.createElement("div");
    row.className = "person-row";
    
    // Player name element (clickable to view history)
    const nameEl = document.createElement("div");
    nameEl.className = "person-name";
    nameEl.textContent = person.name;
    nameEl.addEventListener("click", () => showTransactionHistory(person));
    row.appendChild(nameEl);
    
    // Current amount element
    const amountEl = document.createElement("div");
    amountEl.className = "person-amount";
    amountEl.textContent = `$${person.amount.toFixed(2)}`;
    row.appendChild(amountEl);
    
    // Adjustment input element
    const adjustInput = document.createElement("input");
    adjustInput.type = "number";
    adjustInput.value = "0";
    adjustInput.className = "person-adjust";
    adjustInput.dataset.personId = person.id;
    if (!isEditor) {
      adjustInput.disabled = true;
    }
    row.appendChild(adjustInput);
    
    personListEl.appendChild(row);
  });
}

function updateEditorList() {
  editorsUl.innerHTML = "";
  allowedEditors.forEach(email => {
    const li = document.createElement("li");
    li.textContent = email;
    editorsUl.appendChild(li);
  });
}

// --- Modal Functions ---
function showTransactionHistory(person) {
  modalBody.innerHTML = `<h2>${person.name}'s Transaction History</h2>`;
  
  if (person.transactions.length === 0) {
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

// --- Google Sign-In Functions ---
function onSignIn(googleUser) {
  const profile = googleUser.getBasicProfile();
  const email = profile.getEmail();
  console.log("Signed in with email:", email);
  
  if (allowedEditors.includes(email.toLowerCase())) {
    isEditor = true;
    currentUserEmail = email.toLowerCase();
    updateLoginUI();
  } else {
    alert("This email is not authorized for editing.");
    signOut();
  }
}

function onFailure(error) {
  console.error('Google Sign-In error:', error);
}

function signOut() {
  const auth2 = gapi.auth2.getAuthInstance();
  auth2.signOut().then(() => {
    isEditor = false;
    currentUserEmail = null;
    updateLoginUI();
  });
}

logoutButton.addEventListener("click", signOut);

// --- Event Handlers ---
// Add a new person
addPersonForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!isEditor) return;
  
  const name = personNameInput.value.trim();
  const amount = parseFloat(personAmountInput.value);
  if (name && !isNaN(amount)) {
    persons.push({ id: nextPersonId++, name, amount, transactions: [] });
    personNameInput.value = "";
    personAmountInput.value = "";
    updatePersonList();
  }
});

// Apply all balance changes in bulk
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
    input.value = "0";
  });
  
  updatePersonList();
  totalChangeDisplay.textContent = `Total Change: $${totalChange.toFixed(2)}`;
  
  // Clear the note input after applying changes
  transactionNoteInput.value = "";
});

// Add a new editor email
addEditorForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!isEditor) return;
  
  const newEditorEmail = editorEmailInput.value.trim().toLowerCase();
  if (newEditorEmail && !allowedEditors.includes(newEditorEmail)) {
    allowedEditors.push(newEditorEmail);
    editorEmailInput.value = "";
    updateEditorList();
    alert(`Added ${newEditorEmail} as an editor.`);
  } else {
    alert("Email is either empty or already an editor.");
  }
});

updateLoginUI();
