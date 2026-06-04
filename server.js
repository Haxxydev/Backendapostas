'use strict';

/**
 * CONFIGURAÇÃO E DEPENDÊNCIAS
 * Em produção, moveríamos essas configs para um arquivo .env
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const logger = require('morgan'); // Logger profissional para monitoramento

const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = '/api/v1';

// SEGURANÇA E MIDDLEWARES
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS || '*' }));
app.use(express.json({ limit: '10kb' }));
app.use(logger('combined')); // Logs detalhados para debug/auditoria

// Limitação de taxa (Rate Limiting) centralizada
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { success: false, error: 'Muitas requisições, tente novamente mais tarde.' }
});
app.use(globalLimiter);

/**
 * SERVICE LAYER (Lógica de Negócio)
 * Em um cenário real, isso estaria em pastas separadas: /services/game.service.js
 */
class GameService {
    static SYMBOLS = ['🐯', '💎', '7', '🍒', '🍋', '🍀', '💰'];
    static PAYTABLE = { '🐯': 10, '💎': 5, '7': 3, '🍒': 2, '🍋': 1.5, '🍀': 1.2, '💰': 1 };

    static spin(betAmount) {
        // Implementação de RNG (Random Number Generator) seguro
        const grid = Array.from({ length: 3 }, () =>
            Array.from({ length: 3 }, () => this.SYMBOLS[crypto.randomInt(this.SYMBOLS.length)])
        );

        let winAmount = 0;
        grid.forEach(row => {
            if (row[0] === row[1] && row[1] === row[2]) {
                winAmount += betAmount * (this.PAYTABLE[row[0]] || 0);
            }
        });

        return { grid, winAmount };
    }
}

/**
 * CONTROLLER LAYER (Rotas e Validações)
 */
const gameController = {
    async handleSpin(req, res) {
        const { betAmount } = req.body;
        
        // Validação rigorosa
        if (!betAmount || betAmount < 1 || betAmount > 500) {
            return res.status(400).json({ success: false, error: 'Valor de aposta inválido.' });
        }

        try {
            // Em produção: AQUI ENTRARIA A CHAMADA AO BANCO DE DADOS
            // Ex: await db.users.updateBalance(userId, -betAmount);
            
            const result = GameService.spin(betAmount);
            
            return res.status(200).json({
                success: true,
                data: {
                    grid: result.grid,
                    betAmount,
                    winAmount: result.winAmount,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            next(error);
        }
    }
};

/**
 * ROTAS
 */
app.post(`${API_VERSION}/game/spin`, gameController.handleSpin);

// Error Handling Global
app.use((err, req, res, next) => {
    console.error(`[FATAL_ERROR] ${err.message}`);
    res.status(500).json({ success: false, error: 'Ocorreu um erro interno no sistema.' });
});

app.listen(PORT, () => {
    console.log(`[CORE] Server started on port ${PORT} [${new Date().toISOString()}]`);
});
