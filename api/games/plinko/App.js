/**
 * 🎮 PLINKO MICROSERVICE - Express App
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const compression = require('compression');
const config = require('./config');

module.exports = (() => {
    const app = express();

    // ====================================
    // MIDDLEWARE
    // ====================================

    // CORS - используем config.socket.cors
    const corsOptions = config.socket && config.socket.cors ?
        config.socket.cors :
        { origin: '*', methods: ['GET', 'POST'] };

    app.use(cors(corsOptions));

    // Body parsing
    app.use(bodyParser.json({ limit: '10mb' }));
    app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

    // Compression
    app.use(compression());

    // Cache control
    app.use((req, res, next) => {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        next();
    });

    // Request logging
    app.use((req, res, next) => {
        console.log(`📨 [${req.method}] ${req.path}`);
        next();
    });

    // ====================================
    // HEALTH CHECK
    // ====================================

    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            game: 'plinko',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development'
        });
    });

    // ====================================
    // API ROUTES
    // ====================================

    try {
        const plinkoRoutes = require('./api/routes');
        app.use('/api/v1/plinko', plinkoRoutes);
        console.log('✅ Plinko routes loaded');
    } catch (err) {
        console.warn('⚠️ Failed to load routes:', err.message);
    }

    // ====================================
    // INFO ENDPOINT
    // ====================================

    app.get('/api/v1/plinko/info', (req, res) => {
        res.json({
            success: true,
            game: {
                name: config.game.name,
                displayName: config.game.displayName,
                icon: config.game.icon,
                description: 'Ball falls through pegs. Center = higher payout.',
                rules: [
                    'Choose number of rows (8-16)',
                    'Choose risk level (low, medium, high)',
                    'Place bet and watch the ball fall',
                    'Win based on final position'
                ],
                minBet: config.game.minBet,
                maxBet: config.game.maxBet,
                minRows: config.game.minRows,
                maxRows: config.game.maxRows,
                risks: config.game.risks
            }
        });
    });

    // ====================================
    // 404 HANDLER
    // ====================================

    app.use('*', (req, res) => {
        res.status(404).json({
            success: false,
            error: 'Endpoint not found',
            path: req.path,
            method: req.method,
            game: 'plinko'
        });
    });

    // ====================================
    // ERROR HANDLER
    // ====================================

    app.use((err, req, res, next) => {
        console.error('❌ Error:', err.message);
        res.status(500).json({
            success: false,
            error: err.message || 'Internal server error',
            game: 'plinko'
        });
    });

    return app;
})();