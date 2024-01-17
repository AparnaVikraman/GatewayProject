const express = require('express');
const helmet = require('helmet');
const routes = require('./routes');
const app = express();

const port = 3001;
app.use(express.json())
app.use(helmet())
app.use('/', routes)

app.listen(port, () => console.log(`Gateway API listening at http://localhost:${port}`));