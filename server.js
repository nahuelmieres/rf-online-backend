const { server } = require('./src/app'); // Cambiado para importar server
const conectarDB = require('./src/config/db');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
conectarDB();

// Usar server.listen en lugar de app.listen
server.listen(PORT, () => {
  console.log(`✅ Servidor Express + Socket.io corriendo en http://localhost:${PORT}`);
});