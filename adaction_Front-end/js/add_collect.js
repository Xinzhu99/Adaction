const API_URL = "http://localhost:3000";

//fonction pour afficher la templates catégories déchets
const loadCategories = async () => {
  const container = document.querySelector(".grid");
  try {
    const response = await fetch(`${API_URL}/categories`);
    const data = await response.json();
    console.log(data);
    container.innerHTML = "";
    for (const item of data) {
      container.innerHTML += `<div class="categoryCard">
      <h2>${item.icon}</h2>
      <h3>${item.name}</h3>
      <div class="qtyContainer">
        <div class="btn sub"> - </div>
        <input class="qty" placeholder="0">
        <div class="btn add"> + </div>
      </div>
      </div>`;
    }
    addBtns();
    getUserInput();
  } catch (error) {
    console.log("Having difficulty connecting to api.", error);
  }
};
loadCategories();
//fonction qui permet de collecter tous les input nécessaire pour un post createCollection
const userId = localStorage.getItem("userId");
console.log(userId);
const getUserInput = () => {
  document.querySelector("#add").addEventListener("click", () => {
    const location = document.querySelector("#city").value;
    const date = document.querySelector("#date").value;
    const quantities = document.querySelectorAll(".qty");
    let quantityArr = [];
    for (const item of quantities) {
      quantityArr.push(item.value);
    }
    let newArr = quantityArr.map(Number);
    console.log(newArr);

    createCollection(date, location, newArr);
  });
};

const createCollection = async (date, location, arr) => {
  try {
    const response = await fetch(`${API_URL}/add_collection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }, //! je précise au serveur que je vais envoyer les data en fromat json
      body: JSON.stringify({
        volunteers_id: userId,
        collections_date: date,
        collections_location: location,
        quantities: arr,
      }),
    });
    const data = await response.json();
    alert(`${data.message}`);
  } catch (error) {
    console.log("Having difficulty connecting to api.", error);
  }
};
// Gestion des boutons + et -
const addBtns = () => {
  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.parentElement.querySelector(".qty");
      // if (!input) return;

      let value = Number(input.value) || 0;
      if (btn.classList.contains("add")) {
        value++;
      } else if (btn.classList.contains("sub")) {
        if (value>0){
        value -- ;
        }
      }
      input.value = value;
    });
  });
};
//gestion du modal
document.querySelector("#add").addEventListener(("click", ())=> {

})

