require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? true : (process.env.FRONTEND_URL || 'http://localhost:5173'),
  credentials: true,
}));
app.use(express.json({ limit: '15mb' }));

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/clients',      require('./routes/clients'));
app.use('/api/sections',     require('./routes/sections'));
app.use('/api/tasks',        require('./routes/tasks'));
app.use('/api/tasks',        require('./routes/logs'));
app.use('/api/tasks',        require('./routes/activity'));
app.use('/api/reports',      require('./routes/reports'));
app.use('/api/contracts',    require('./routes/contracts'));

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../frontend/dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
