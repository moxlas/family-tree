require('dotenv').config();

const app = require('./app');
const connectDB = require('./database/config');

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Family Tree API listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Unable to start the API:', error.message);
    process.exit(1);
  });
