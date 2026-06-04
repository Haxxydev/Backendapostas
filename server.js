'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();

const PORT = process.env.PORT || 3000;
const API_VERSION = '/api/v1';

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    message: {
        success: false,
        error: 'Too many requests.'
    }
}));

const spinLimiter = rateLimit({
    windowMs: 1000,
    max: 2,
    message: {
        success: false,
        error: 'Too many spin requests.'
    }
});

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

const userState = {
    balance: 5000.00
};

const GameEngine = {
    symbols: ['🐯', '💎', '7', '🍒', '🍋', '🍀', '💰'],
    multipliers: {
        '🐯': 10,
        '💎': 5,
        '7': 3,
        '🍒': 2,
        '🍋': 1.5,
        '🍀': 1.2,
        '💰': 1
    },

    getRandomSymbol() {
        return this.symbols[crypto.randomInt(0, this.symbols.length)];
    },

    generateGrid() {
        return Array.from({ length: 3 }, () =>
            Array.from({ length: 3 }, () => this.getRandomSymbol())
        );
    },

    calculateWin(grid, betAmount) {
        let totalMultiplier = 0;

        for (const row of grid) {
            if (row[0] === row[1] && row[1] === row[2]) {
                totalMultiplier += this.multipliers[row[0]] || 0;
            }
        }

        const winAmount = totalMultiplier > 0 ? betAmount * totalMultiplier : 0;

        return {
            isWin: winAmount > 0,
            winAmount: Number(winAmount.toFixed(2))
        };
    }
};

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
        return res.status(404).json({
            success: false,
            error: 'Match not found'
        });
    }

    return res.status(200).json({
        success: true,
        data: match
    });
});

app.get(`${API_VERSION}/game/balance`, (req, res) => {
    res.status(200).json({
        success: true,
        balance: Number(userState.balance.toFixed(2))
    });
});

app.post(`${API_VERSION}/game/spin`, spinLimiter, (req, res) => {
    const { betAmount } = req.body;

    const MIN_BET = 1;
    const MAX_BET = 500;

    if (
        typeof betAmount !== 'number' ||
        !Number.isFinite(betAmount) ||
        betAmount < MIN_BET ||
        betAmount > MAX_BET
    ) {
        return res.status(400).json({
            success: false,
            error: `Bet amount must be between ${MIN_BET} and ${MAX_BET}`
        });
    }

    const normalizedBet = Math.round(betAmount * 100) / 100;

    if (userState.balance < normalizedBet) {
        return res.status(400).json({
            success: false,
            error: 'Insufficient balance'
        });
    }

    userState.balance -= normalizedBet;

    const grid = GameEngine.generateGrid();
    const result = GameEngine.calculateWin(grid, normalizedBet);

    if (result.isWin) {
        userState.balance += result.winAmount;
    }

    return res.status(200).json({
        success: true,
        data: {
            grid,
            betAmount: normalizedBet,
            isWin: result.isWin,
            winAmount: result.winAmount,
            newBalance: Number(userState.balance.toFixed(2))
        }
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

app.use((err, req, res, next) => {
    console.error('[SERVER_ERROR]', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`BetSim API running on port ${PORT}`);
});
