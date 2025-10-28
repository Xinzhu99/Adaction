import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({ origin: "http://127.0.0.1:5500" }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

//& Récupérer les bénévoles:
app.get("/volunteers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.id, v.name, v.city,
             COALESCE(SUM(q.quantity), 0) AS total_quantity
      FROM volunteers v
      LEFT JOIN collections c ON v.id = c.volunteer_id
      LEFT JOIN quantities q ON c.id = q.collection_id
      GROUP BY v.id, v.name, v.city
      ORDER BY v.name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des bénévoles" });
  }
});

//& Création d'une route search pour la recherche d'un bénévole
app.get("/volunteers/search", async (req, res) => {
  const { city, name } = req.query;
  try {
    const result = await pool.query(
      `SELECT v.id, v.name, v.city,
              COALESCE(SUM(q.quantity), 0) AS total_quantity
       FROM volunteers v
       LEFT JOIN collections c ON v.id = c.volunteer_id
       LEFT JOIN quantities q ON c.id = q.collection_id
       WHERE ($1::text IS NULL OR v.city = $1)
         AND ($2::text IS NULL OR v.name ILIKE $2 || '%')
       GROUP BY v.id, v.name, v.city
       ORDER BY v.name ASC`,
      [city || null, name || null]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur lors de la recherche" });
  }
});

//& Récupérer les villes distinctes:
app.get("/cities", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT city FROM volunteers ORDER BY city ASC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des villes" });
  }
});

//& Modifier le nom et la ville du bénévole:
app.put("/volunteers/:id", async (req, res) => {
  const { id } = req.params;
  const { name, city } = req.body;

  try {
    const result = await pool.query(
      "UPDATE volunteers SET name = $1, city = $2 WHERE id = $3 RETURNING *",
      [name, city, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Bénévole introuvable" });
    }

    res.json({
      message: "Bénévole modifié avec succès",
      volunteer: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Erreur lors de la modification du bénévole" });
  }
});

//& Supprimer un bénévole:
app.delete("/volunteers/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM volunteers WHERE id = $1", [
      id,
    ]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Bénévole introuvable" });
    }
    res.json({ message: "Bénévole supprimé avec succès" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Erreur lors de la suppression du bénévole" });
  }
});

//🚀route pour récupérer toutes les catégories déchets
app.get("/categories", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT name, icon from categories ORDER BY id"
    );
    res.json(result.rows);
  } catch (error) {
    console.log(error);
  }
});

// 🚀 nouvelle route pour la page add_collect: ajouter une nouvelle collecte
app.post("/add_collection", async (req, res) => {
  console.log("[POST/collection] body reçu:", req.body);
  const { volunteers_id, collections_date, collections_location, quantities } =
    req.body;
  try {
    // insérer la collecte dans collections
    const insertCollection = await pool.query(
      "INSERT INTO collections\
	(volunteer_id, collection_date, location)\
	VALUES ($1,$2,$3) RETURNING id",
      [volunteers_id, collections_date, collections_location]
    );
    const collection_id = insertCollection.rows[0].id;
    console.log(collection_id);
    //récupérer tous les id de la tablea categories
    const getIds = await pool.query("SELECT id FROM categories ORDER BY id");
    const categoryIds = getIds.rows;
    console.log(categoryIds);
    if (categoryIds.length !== quantities.length) {
      return res.status(400).json({
        OK: false,
        message:
          "Le nombre de quantités ne correspond pas au nombre de catégpries exsistantes",
      });
    }
    //insérer des infos dans la table quantities
    for (let i = 0; i < categoryIds.length; i++) {
      const id = categoryIds[i].id;
      const qty = quantities[i];
      const insertQuantities = await pool.query(
        "INSERT INTO quantities (collection_id, category_id, quantity)\
        VALUES ($1, $2, $3)",
        [collection_id, id, qty]
      );
    }

    //*renvoyer un message alerte
    return res.status(201).json({
      ok: true,
      message: `collecte ajoutée avec succès`,
    });
  } catch (error) {
    console.error("erreur lors de la création de la collecte", error);
  }
});

//route pour la page my_collection : récupérer id du bénévole
app.get("/volunteers/:name", async (req, res) => {
  try {
    const name = req.params.name;
    const result = await pool.query(
      "SELECT id from volunteers WHERE name = $1",
      [name]
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, message: "Bénévole non trouvé." });
    } else {
      res.json({ id: result.rows[0].id });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération id du bénévole" });
  }
});
//🚀 route pour la page my_collection: récupérer les localisations
app.get("/locations/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query(
      "SELECT DISTINCT location\
      FROM collections\
      JOIN volunteers ON volunteers.id = collections.volunteer_id\
      WHERE volunteers.id = $1\
      ORDER BY location",
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des villes" });
  }
});

//🚀 route pour la page my_collection: affichage des stats
app.get("/my_collection/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query(
      `SELECT
        v.name AS volunteer_name,
        q.category_id,
        c.name AS category_name,
        c.icon AS category_icon,
        SUM(q.quantity) AS total_by_category,
        SUM(SUM(q.quantity)) OVER (PARTITION BY v.id) AS total_global
      FROM quantities q
      JOIN collections col ON q.collection_id = col.id
      JOIN volunteers v ON col.volunteer_id = v.id
      JOIN categories c ON c.id = q.category_id
      WHERE v.id = $1
      GROUP BY v.name, q.category_id, c.name, c.icon, v.id`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Erreur lors de la récupération de la collection:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
//🚀 route pour la page my_collection : search

app.get("/my_collection/:id/:location/:date", async (req, res) => {
  try {
    const id = Number(req.params.id);
    let location = req.params.location;
    let date = req.params.date;

    const result = await pool.query(
      `SELECT
        v.name AS volunteer_name,
        q.category_id,
        c.name AS category_name,
        c.icon AS category_icon,
        SUM(q.quantity) AS total_by_category,
        SUM(SUM(q.quantity)) OVER (PARTITION BY v.id) AS total_global
      FROM quantities q
      JOIN collections col ON q.collection_id = col.id
      JOIN volunteers v ON col.volunteer_id = v.id
      JOIN categories c ON c.id = q.category_id
      WHERE v.id = $1 AND ( $2::text = 'All' OR col.collection_date = $2::date) AND (col.location=$3 OR $3 = 'All')
      GROUP BY v.name, q.category_id, c.name, c.icon, v.id`,
      [id, date, location]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Erreur lors de la récupération de la collection:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Liste des villes présentes dans les collections
app.get("/cities", async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT DISTINCT location
            FROM collections
            WHERE location IS NOT NULL
            ORDER BY location
        `);
    // renvoie un tableau de strings
    const cities = result.rows.map((r) => r.location);
    res.json(cities);
  } catch (error) {
    console.error("Erreur SQL cities:", error);
    res.status(500).json({ error: error.message });
  }
});

// Liste des villes
app.get("/stats/overview", async (req, res) => {
  try {
    const { location, date } = req.query;
    const params = [];
    let where = "WHERE 1=1";

    if (date) {
      params.push(date);
      where += ` AND DATE(c."collection_date") = $${params.length}`;
    }

    if (location) {
      params.push(location);
      where += ` AND c.location = $${params.length}`;
    }
    // Total global ou filtré
    const totalQuery = `
      SELECT SUM(q.quantity) AS total
      FROM quantities q
      JOIN collections c ON q.collection_id = c.id
      ${where}
    `;
    const totalResult = await pool.query(totalQuery, params);
    // Total par catégorie
    const categoriesQuery = `
      SELECT cat.name, cat.icon, SUM(q.quantity) AS total
FROM quantities q
JOIN categories cat ON q.category_id = cat.id
JOIN collections c ON q.collection_id = c.id
${where}
GROUP BY cat.name, cat.icon

    `;
    const categoriesResult = await pool.query(categoriesQuery, params);
    console.log(categoriesResult.rows);
    res.json({
      total: totalResult.rows[0]?.total ? Number(totalResult.rows[0].total) : 0,
      categories: categoriesResult.rows.map((r) => ({
        name: r.name,
        total: r.total ? Number(r.total) : 0,
        icon: r.icon,
      })),
    });
  } catch (error) {
    console.error("Erreur SQL overview:", error);
    res.status(500).json({ error: error.message });
  }
});

// Ajouter un bénévole
app.post("/volunteers/add", async (req, res) => {
  try {
    const { name, city } = req.body;
    if (!name || !city) {
      return res.status(400).json({ error: "Nom et ville sont requis" });
    }
    const result = await pool.query(
      "INSERT INTO volunteers (name, city) VALUES ($1, $2) RETURNING *",
      [name, city]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Erreur SQL add volunteer:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${port}`);
});
