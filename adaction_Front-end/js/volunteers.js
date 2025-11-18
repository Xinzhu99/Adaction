
const API_URL = "https://adaction-i968.onrender.com";

//& Bouton reset (actualiser les données)

function reset(){
const resetButton = document.getElementById('reset-btn');

resetButton.addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("name-input").value = "";
  document.getElementById("citySelect").value = ""; 
  displayVolunteers(); 
});
}
//functions gestion loading 
const loadingDiv = document.getElementById("loading");

function showLoading() {
  loadingDiv.classList.remove("hidden");
}
function hideLoading() {
  loadingDiv.classList.add("hidden");
}


//& Récupérer tous les bénévoles
async function fetchVolunteers() {
  try {
    const res = await fetch(`${API_URL}/volunteers`);
    return await res.json();
  } catch (err) {
    console.error("Erreur fetchVolunteers:", err);
    return [];
  }
}

//& Récupérer les villes
async function fetchCities() {
  try {
    const res = await fetch(`${API_URL}/cities`);
    return await res.json();
  } catch (err) {
    console.error("Erreur fetchCities:", err);
    return [];
  }
}

//& Afficher la liste des bénévoles
async function displayVolunteers(volunteers = null) {

  showLoading()

  const data = volunteers || await fetchVolunteers();
  const container = document.getElementById("volunteers");
  const addVolunteer = document.getElementById("add-volunteer");

  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = "<p>Aucun profil trouvé.</p>";
    addVolunteer.style.display = "none";
    hideLoading()
    return;
  } else {
    addVolunteer.style.display = "block";
  }

  data.forEach(v => {
    const div = document.createElement("div");
    div.className = "volunteer-profil";

    div.innerHTML = `
      <div class="profil-box">
        <div class="info">
          <ul>
            <li><strong>Nom:</strong> <span class="name">${v.name}</span></li>
            <li><strong>Ville:</strong> <span class="city">${v.city}</span></li>
            <li><strong>Déchets collectés:</strong> ${v.total_quantity}</li>
          </ul>
        </div>
        <div class="actions">
          <button class="edit-btn" data-id="${v.id}">Modifier</button>
          <button class="delete-btn" data-id="${v.id}">Supprimer</button>
        </div>
      </div>
    `;

    container.appendChild(div);
  });

  addInlineEditing();
  deleteVolunteers();
  hideLoading()
}

//& Inline Editing (champs input qui apparaît lorsque le bouton modifier(edit-btn) est cliqué)
function addInlineEditing() {
  document.querySelectorAll(".edit-btn").forEach(btn => {

    btn.addEventListener("click", (e) => {
      const profilBox = e.target.closest(".profil-box");
      const id = e.target.dataset.id;

      const nameSpan = profilBox.querySelector(".name");
      const citySpan = profilBox.querySelector(".city");

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = nameSpan.textContent;

      const cityInput = document.createElement("input");
      cityInput.type = "text";
      cityInput.value = citySpan.textContent;

      nameSpan.replaceWith(nameInput);
      citySpan.replaceWith(cityInput);

      //* Changer le bouton Modifier en Sauvegarder
      e.target.textContent = "Sauvegarder";
      e.target.classList.add("save-btn");
      e.target.classList.remove("edit-btn");

      //* Fonction pour envoyer les modifications au serveur
      const saveChanges = async () => {
        const newName = nameInput.value.trim();
        const newCity = cityInput.value.trim();
        if (newName && newCity) {
          try {
            await fetch(`${API_URL}/volunteers/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: newName, city: newCity })
            });
            await displayVolunteers();
            await loadCities();
            showMessageModal('Modifications enregistrées avec succès')
          } catch (err) {
            console.error("Erreur modification inline:", err)
          }
        }
      };

      //* Sauvegarde au clic sur le bouton
      e.target.addEventListener("click", saveChanges, { once: true })
    });
  });
}


//& Supprimer un Bénévole

let deleteId = null;

function deleteVolunteers() {
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      deleteId = e.target.dataset.id;
      openModal();
    });
  });
}


function openModal() {
  const modal = document.getElementById("deleteModal");
  const confirmButton = document.getElementById('confirmDelete');
  const cancelButton = document.getElementById('cancelDelete');
  const message = document.getElementById('message');


  confirmButton.style.display = "inline-block";
  cancelButton.style.display = "inline-block";
  message.innerText = 'Êtes-vous sûr de vouloir supprimer ce bénévole ?';

  modal.style.display = "block";
}

function closeModal() {
  document.getElementById("deleteModal").style.display = "none";
  deleteId = null;
}

function showMessageModal(messageText) {
  const modal = document.getElementById("deleteModal");
  const confirmButton = document.getElementById('confirmDelete');
  const cancelButton = document.getElementById('cancelDelete');
  const message = document.getElementById('message');

  modal.style.display = "block";
  confirmButton.style.display = "none";
  cancelButton.style.display = "none";

  message.innerHTML = "";
  message.innerText = messageText;
}


document.getElementById("confirmDelete").addEventListener("click", async () => {
  if (!deleteId) return;
  try {
    await fetch(`${API_URL}/volunteers/${deleteId}`,
      { method: "DELETE" });
    await displayVolunteers();

    showMessageModal('Bénévole supprimé avec succès')
  } catch (err) {
    console.error("Erreur suppression:", err);
  }
});

document.getElementById("cancelDelete").addEventListener("click", closeModal);
document.querySelector(".close").addEventListener("click", closeModal);

window.addEventListener("click", e => {
  if (e.target === document.getElementById("deleteModal"))
    closeModal();
});

//& Ajouter un bénévole (partie Ursula)

const volunteerForm = document.getElementById("volunteer-form");

volunteerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const volunteerName = document.getElementById("volunteerName").value.trim();
    const volunteerCity = document.getElementById("volunteerCity").value.trim();

    showLoading()
    try {
        const response = await fetch(`${API_URL}/volunteers/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: volunteerName, city: volunteerCity }),
        });

        if (!response.ok) {
            throw new Error(`Erreur HTTP : ${response.status}`);
        }

        const data = await response.json();
        volunteerForm.reset();
        await displayVolunteers();

    } catch (error) {
        console.error("Erreur lors de l'ajout du bénévole :", error);
        alert("Échec de l'ajout du bénévole. Veuillez réessayer.");
    } finally {
      hideLoading()
    }
});

//& Afficher modal d'ajout bénévole

const volunteerModal = document.getElementById('add-volunteer_modal')
const addVolunteer = document.getElementById("add-volunteer")
const saveButton = document.getElementById('save-btn')
const closeCross = document.getElementById('closeForm')


  closeCross.addEventListener('click', () => {
  volunteerModal.style.display = 'none '
  addVolunteer.style.display = 'block'
  })


addVolunteer.addEventListener('click', () => {
volunteerModal.style.display = 'flex'
addVolunteer.style.display = "none"
})

saveButton.addEventListener('click', () => {
  volunteerModal.style.display = 'none'
  showMessageModal('Bénévole ajouté avec succès')
})

//& Rechercher les bénévoles selon la ville et le nom :

document.querySelector(".search-form").addEventListener("submit", async e => {
  e.preventDefault();

  const city = document.getElementById("citySelect").value;
  const name = document.getElementById("name-input").value.trim();

  const params = new URLSearchParams();
  if (city) params.append("city", city);
  if (name) params.append("name", name);

  showLoading()

  try {
    const res = await fetch(`${API_URL}/volunteers/search?${params}`);
    const data = await res.json();

    await displayVolunteers(data);

  } catch (err) {
    console.error("Erreur recherche:", err);
  } finally{
    hideLoading()
  }
});

//& Implanter les villes dans select options:
async function loadCities() {
  const cities = await fetchCities();
  const select = document.getElementById("citySelect");

  select.innerHTML = "";

  cities.forEach(c => {
    const option = document.createElement("option");
    option.value = c.city;
    option.textContent = c.city;
    select.appendChild(option);
  });
}

await loadCities();
await displayVolunteers();
reset()






