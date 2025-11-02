const API_URL = "http://localhost:3000";

let paremString = window.location.search;
let searchParams = new URLSearchParams(paremString);
let userName = searchParams.get("user");
console.log(userName)

//fonction pour récupérer id du bénévole à partir du name input
async function getUserId(name) {
  try {
    const res = await fetch(`${API_URL}/volunteers/${name}`);
    const data = await res.json();
    const idData = data.id;
    return idData;
  } catch (error) {
    console.error("Erreur getUserId:", error);
  }
}
let id = await getUserId(userName);
if(id){
  localStorage.setItem("userId",id);
}else{
   id = localStorage.getItem("userId");
 }
console.log(id)


//fonction pour implanter la liste des locations dans select options
async function loadLocations(id) {
  try {
    const res = await fetch(`${API_URL}/locations/${id}`);
    const cities = await res.json();
    console.log(cities);
    const select = document.getElementById("citySelect");

    cities.forEach((c) => {
      const option = document.createElement("option");
      option.value = c.location;
      option.textContent = c.location;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Erreur fetchCities:", err);
    return [];
  }
}
loadLocations(id);

//fonction pour récupérer toutes les stats du bénévole
const getData = async (id) => {
  try {
    const response = await fetch(`${API_URL}/my_collection/${id}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Problème de connexion au serveur", error);
  }
};
getData(id);
//fonction pour afficher les stats
const loadData = async (result) => {
  const total = document.querySelector("#total");
  const container = document.querySelector(".container");
  const errorMsg = document.querySelector("#errorMsg");
  try {
    const data = await result;
    if (data.length === 0) {
      errorMsg.innerHTML = "";
      errorMsg.innerHTML = "Auncune collecte trouvée.";
      total.innerHTML = "";
      container.innerHTML = "";
    } else {
      errorMsg.innerHTML = "";
      total.innerHTML = `Vous avez effectué ${data[0].total_global} collectes au total ! `;
      container.innerHTML = "";
      for (const item of data) {
        container.innerHTML += `
       <div class=" collect-card">
      <span>${item.category_icon}</span>
      <h3>${item.category_name}</h3>
      <p>${item.total_by_category} collectés</p>
    </div>
     `;
      }
    }
  } catch (error) {
    console.error("Problème de connexion au serveur", error);
  }
};
loadData(getData(id));
//déclencheur du bouton search
document.querySelector(".search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const location = document.querySelector("#citySelect").value;
  const date = document.querySelector("#collections-date").value;
  console.log(date);
  loadData(getFilteredData(id, location, date));
});
//fonction pour récupérer les stats filtrés
const getFilteredData = async (id, location, date) => {
  try {
    if (date === "") {
      date = "All";
    }
    const response = await fetch(
      `${API_URL}/my_collection/${id}/${location}/${date}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Problème de connexion au serveur", error);
  }
};
//bouton reset
document.querySelector("#reset").addEventListener("click", (e) => {
  e.preventDefault()
  loadData(getData(id));
})
