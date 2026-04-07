import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware equivalent to Vercel's built-in parsing
app.use(express.json());

// API Route - route requests directly to the handler we imported
app.all('/api/analyze', async (req, res) => {
    try {
        // Import dynamically here so the server can start without the Groq API key immediately crashing it
        const { default: analyzeHandler } = await import('./api/analyze.js');
        await analyzeHandler(req, res);
    } catch (err) {
        console.error('Error invoking handler:', err);
        res.status(500).json({ error: 'Internal Server Error: ' + err.message });
    }
});

// Serve frontend static files from the 'public' directory
app.use(express.static(path.resolve('public')));

app.use((req, res) => {
    res.sendFile(path.resolve('public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server started. Open http://localhost:${PORT} in your browser.`);
});
