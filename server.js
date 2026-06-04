'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = '/api/v1';

// Segurança e Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    message: { success: false, error: 'Too many requests.' }
}));

const matches = [
    {
        id: 1,
        sport: 'Futebol',
        teamA: 'Brasil',
        teamB: 'Argentina',
        status: 'LIVE',
        minute: 67,
        oddsA: 1.85,
        oddsB: 2.10,
        updatedAt: new Date().toISOString()
    },
    {
        id: 2,
        sport: 'Futebol',
        teamA: 'Flamengo',
        teamB: 'Palmeiras',
        status: 'LIVE',
        minute: 34,
        oddsA: 2.40,
        oddsB: 1.55,
        updatedAt: new Date().toISOString()
    }
];

// Rotas de Monitoramento
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        name: 'BetSim API',
        version: '1.0.0',
        mode: 'simulation'
    });
});

app.get(`${API_VERSION}/health`, (req, res) => {
    res.status(200).json({
        success: true,
        status: 'online',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Rotas de Dados
app.get(`${API_VERSION}/odds`, (req, res) => {
    res.status(200).json({
        success: true,
        count: matches.length,
        data: matches
    });
});

app.get(`${API_VERSION}/odds/:id`, (req, res) => {
    const matchId = Number(req.params.id);
    
    if (!Number.isInteger(matchId) || matchId <= 0) {
        return res.status(400).json({
            success: false,
            error: 'Invalid match ID'
        });
    }

    const match = matches.find(m => m.id === matchId);
    if (!match) {
        return res.status(404).json({ success: false, error: 'Match not found' });
    }

    return res.status(200).json({ success: true, data: match });
});

// Handlers de Erro
app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found' }));

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
});
