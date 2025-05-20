const express = require('express');
const path = require('path');
// const cors = require('cors');
const app = express();
const uploadRouter = require('./routes/upload');

// Middleware
// app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));


// Routes
app.use('/api', uploadRouter);

// Serve uploads if needed
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// app.use('/uploads', express.static(path.join(__dirname, 'public')));

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
