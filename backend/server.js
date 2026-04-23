const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Helper for sending generic errors
const handleError = (res, error, msg = "Server error") => {
  console.error(msg, error);
  res.status(500).json({ error: msg });
};

// GET /api/test
app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1');
    res.json({ message: "DB connected" });
  } catch (error) {
    handleError(res, error, 'Database connection failed');
  }
});

// GET /api/categories
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories');
    res.json(rows);
  } catch (error) {
    handleError(res, error);
  }
});

// GET /api/locations
app.get('/api/locations', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM locations');
    res.json(rows);
  } catch (error) {
    handleError(res, error);
  }
});

// GET /api/lost-reports
app.get('/api/lost-reports', async (req, res) => {
  try {
    const query = `
      SELECT r.*, u.name as user_name, u.email as user_email, c.category_name, l.location_name,
             (SELECT image_path FROM images WHERE report_id = r.lost_id AND report_type = 'lost' LIMIT 1) as image_path
      FROM lost_reports r
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN categories c ON r.category_id = c.category_id
      LEFT JOIN locations l ON r.location_id = l.location_id
      ORDER BY r.created_at DESC
    `;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/lost-reports
app.post('/api/lost-reports', async (req, res) => {
  const { user_id, category_id, location_id, item_name, description, lost_date, lost_time } = req.body;
  try {
    const query = `
      INSERT INTO lost_reports (user_id, category_id, location_id, item_name, description, lost_date, lost_time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [user_id, category_id, location_id, item_name, description, lost_date, lost_time]);
    res.status(201).json({ message: 'Lost report added successfully', id: result.insertId });
  } catch (error) {
    handleError(res, error);
  }
});

// GET /api/found-reports
app.get('/api/found-reports', async (req, res) => {
  try {
    const query = `
      SELECT r.*, u.name as user_name, u.email as user_email, c.category_name, l.location_name,
             (SELECT image_path FROM images WHERE report_id = r.found_id AND report_type = 'found' LIMIT 1) as image_path
      FROM found_reports r
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN categories c ON r.category_id = c.category_id
      LEFT JOIN locations l ON r.location_id = l.location_id
      ORDER BY r.created_at DESC
    `;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/found-reports
app.post('/api/found-reports', async (req, res) => {
  const { user_id, category_id, location_id, item_name, description, found_date, found_time } = req.body;
  try {
    const query = `
      INSERT INTO found_reports (user_id, category_id, location_id, item_name, description, found_date, found_time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [user_id, category_id, location_id, item_name, description, found_date, found_time]);
    res.status(201).json({ message: 'Found report added successfully', id: result.insertId });
  } catch (error) {
    handleError(res, error);
  }
});

// GET /api/claims
app.get('/api/claims', async (req, res) => {
  try {
    const query = `
      SELECT c.*, lr.item_name as lost_item_name, u1.name as claimed_by_name, u1.email as claimed_by_email, u2.name as admin_name,
             (SELECT image_path FROM credentials WHERE claim_id = c.claim_id ORDER BY uploaded_at DESC LIMIT 1) as proof_image
      FROM claims c
      LEFT JOIN lost_reports lr ON c.lost_id = lr.lost_id
      LEFT JOIN users u1 ON c.claimed_by = u1.user_id
      LEFT JOIN users u2 ON c.admin_id = u2.user_id
      ORDER BY c.created_at DESC
    `;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/claims
app.post('/api/claims', async (req, res) => {
  const { lost_id, found_id, claimed_by, remarks } = req.body;
  try {
    const query = `
      INSERT INTO claims (lost_id, found_id, claimed_by, remarks)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [lost_id, found_id || null, claimed_by, remarks]);
    res.status(201).json({ message: 'Claim added successfully', id: result.insertId });
  } catch (error) {
    handleError(res, error);
  }
});

// PATCH /api/claims/:id
app.patch('/api/claims/:id', async (req, res) => {
  const { id } = req.params;
  const { status, admin_id } = req.body;
  try {
    const query = `UPDATE claims SET status = ?, admin_id = ? WHERE claim_id = ?`;
    await db.query(query, [status, admin_id, id]);
    res.json({ message: 'Claim updated successfully' });
  } catch (error) {
    handleError(res, error);
  }
});

// GET /api/match
app.get('/api/match', async (req, res) => {
  try {
    const query = `
      SELECT lr.lost_id, lr.item_name as lost_item, fr.found_id, fr.item_name as found_item, c.category_name, l.location_name
      FROM lost_reports lr
      JOIN found_reports fr ON lr.category_id = fr.category_id AND lr.location_id = fr.location_id
      JOIN categories c ON lr.category_id = c.category_id
      JOIN locations l ON lr.location_id = l.location_id
      WHERE lr.status = 'open' AND fr.status = 'open'
    `;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    handleError(res, error);
  }
});

// GET /api/audit-log
app.get('/api/audit-log', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM audit_log ORDER BY action_date DESC');
    res.json(rows);
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/register
app.post('/api/register', async (req, res) => {
  const { name, email, phone, role } = req.body;
  try {
    const query = `INSERT INTO users (name, email, phone, role) VALUES (?, ?, ?, ?)`;
    const [result] = await db.query(query, [name, email, phone, role || 'student']);
    res.status(201).json({ message: 'User registered successfully', id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_SIGNAL_EXCEPTION' || error.sqlState === '45000' || error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Duplicate email not allowed' });
    } else {
      handleError(res, error);
    }
  }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { email, role } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, role]);
    if (rows.length > 0) {
      res.json({ message: 'Login successful', user: rows[0] });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/upload-lost-image
app.post('/api/upload-lost-image', upload.single('image'), async (req, res) => {
  const { lost_id } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No image provided' });
  try {
    const imagePath = '/uploads/' + req.file.filename;
    await db.query('INSERT INTO images (report_id, report_type, image_path) VALUES (?, ?, ?)', [lost_id, 'lost', imagePath]);
    res.json({ message: 'Image uploaded', imagePath });
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/upload-found-image
app.post('/api/upload-found-image', upload.single('image'), async (req, res) => {
  const { found_id } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No image provided' });
  try {
    const imagePath = '/uploads/' + req.file.filename;
    await db.query('INSERT INTO images (report_id, report_type, image_path) VALUES (?, ?, ?)', [found_id, 'found', imagePath]);
    res.json({ message: 'Image uploaded', imagePath });
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/upload-credential
app.post('/api/upload-credential', upload.single('image'), async (req, res) => {
  const { user_id, claim_id } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No image provided' });
  try {
    const imagePath = '/uploads/' + req.file.filename;
    await db.query('INSERT INTO credentials (user_id, claim_id, image_path) VALUES (?, ?, ?)', [user_id, claim_id, imagePath]);
    res.json({ message: 'Credential uploaded', imagePath });
  } catch (error) {
    handleError(res, error);
  }
});

// GET /api/credentials/:claim_id
app.get('/api/credentials/:claim_id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT image_path FROM credentials WHERE claim_id = ? ORDER BY uploaded_at DESC LIMIT 1', [req.params.claim_id]);
    res.json(rows[0] || null);
  } catch (error) {
    handleError(res, error);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
