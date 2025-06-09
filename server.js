const app = require('./src/app');
const conectarDB = require('./src/config/db');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
conectarDB();

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});