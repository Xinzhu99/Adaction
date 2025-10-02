import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Pool } from "pg"


const app = express();

dotenv.config();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // recommandé pour Neon afin de sécuriser la connexion
});

app.use(cors({ origin: "http://127.0.0.1:5500"}));

app.get("/volunteers", async (req, res) => {  
  try {
    
  const result = await pool.query('SELECT * from volunteers')
  res.json(result.rows)
  } catch (error) {
    console.log(error)
  }
});


// 🚀 nouvelle route pour la page add_collect: ajouter une nouvelle collecte
app.post("/add_collection", async (req, res) => {
console.log("[POST/collection] body reçu:", req.body);
const { volunteers_name, collections_date, collections_location, quantities} = req.body; //!req.body est stocké dans une variable d'objet
try {
//récupérer le id du volunteer
	const volunteerResult = await pool.query(
	"SELECT id from volunteers WHERE name = $1",[volunteers_name]);
  console.log("volunteerResult", volunteerResult.rows);

  if (volunteerResult.rows.length ===0){
    return res.status(404).json({ok: false, message:"Bénévole non trouvé."})
  };

  const volunteer_id = volunteerResult.rows[0].id;

// insérer la collecte dans collections
  const insertCollection = await pool.query(
	"INSERT INTO collections\
	(volunteer_id, collection_date, location)\
	VALUES ($1,$2,$3) RETURNING id",
	[volunteer_id, collections_date, collections_location]
	);
  const collection_id = insertCollection.rows[0].id;
  console.log(collection_id);
// insérer des infos dans la table quantities 
//!unnest() permet de reansformer le tableau en lignes verticales dans la BDD
  const insertQuantities = await pool.query(
    "INSERT INTO quantities (collection_id, category_id, quantity)\
    SELECT $1, id, unnest($2::int[])\
    FROM categories\
    ORDER BY categories.id\
    ",
    [collection_id,quantities]
  );
//*renvoyer un message alerte
	return res.status(201).json({
		ok: true,
		message: `collecte ajoutée par ${volunteers_name}`,
	});
} catch (error) {
console.error("erreur lors de la création de la collecte", error);
}
});
//🚀route pour récupérer toutes les catégories déchets
app.get("/categories", async (req, res) => {  
  try {
  const result = await pool.query('SELECT name from categories ORDER BY id')
  res.json(result.rows)
  } catch (error) {
    console.log(error)
  }
});

//🚀 route pour la page my_collection
app.get("/my_collection/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query(
      `SELECT
        v.name AS volunteer_name,
        q.category_id,
        c.name AS category_name,
        SUM(q.quantity) AS total_by_category,
        SUM(SUM(q.quantity)) OVER (PARTITION BY v.id) AS total_global
      FROM quantities q
      JOIN collections col ON q.collection_id = col.id
      JOIN volunteers v ON col.volunteer_id = v.id
      JOIN categories c ON c.id = q.category_id
      WHERE v.id = $1
      GROUP BY v.name, q.category_id, c.name, v.id`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Erreur lors de la récupération de la collection:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/my_collection/:id/:location/:date", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const location = req.params.location;
    const date = req.params.date;
    const result = await pool.query(
      `SELECT
        v.name AS volunteer_name,
        q.category_id,
        c.name AS category_name,
        SUM(q.quantity) AS total_by_category,
        SUM(SUM(q.quantity)) OVER (PARTITION BY v.id) AS total_global
      FROM quantities q
      JOIN collections col ON q.collection_id = col.id
      JOIN volunteers v ON col.volunteer_id = v.id
      JOIN categories c ON c.id = q.category_id
      WHERE v.id = $1 AND col.collection_date=$2 AND col.location=$3
      GROUP BY v.name, q.category_id, c.name, v.id`,
      [id, date, location]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Erreur lors de la récupération de la collection:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
app.listen(3000, () => {  console.log("Serveur lancé sur http://localhost:3000");});
