require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5002;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'grievance' });
});

app.listen(PORT, () => {
  console.log(`service-grievance is running on port ${PORT}`);
});
