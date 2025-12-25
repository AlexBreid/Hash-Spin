#!/usr/bin/env node
/**
 * 🎮 PLINKO MICROSERVICE - Entry Point
 * Запусти этот файл отдельно для запуска микросервиса Plinko
 * Или используй npm скрипт: npm run game:plinko
 */

require('dotenv').config({ path: '../../.env' });
const app = require('./app');
const { createServer } = require('./server');
const config = require('./config');

async function startServer() {
  try {
    // Создаём HTTP сервер с Socket.IO
    const server = createServer(app);

    // Запускаем на нужном порту
    server.listen(config.port, config.host, () => {
      console.log(`\n🎮 ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓`);
      console.log(`   ┃ PLINKO MICROSERVICE STARTED    ┃`);
      console.log(`   ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫`);
      console.log(`   ┃ 🎲 Game: Plinko                ┃`);
      console.log(`   ┃ 📍 Host: ${config.host}           ┃`);
      console.log(`   ┃ 🔌 Port: ${config.port}              ┃`);
      console.log(`   ┃ 🌐 URL: http://${config.host}:${config.port}       ┃`);
      console.log(`   ┃ ✅ Status: Running             ┃`);
      console.log(`   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n`);

      console.log('📚 Available endpoints:');
      console.log(`   GET  http://${config.host}:${config.port}/health`);
      console.log(`   POST http://${config.host}:${config.port}/api/v1/plinko/play`);
      console.log(`   GET  http://${config.host}:${config.port}/api/v1/plinko/history/:userId`);
      console.log(`   GET  http://${config.host}:${config.port}/api/v1/plinko/stats/:userId\n`);

      console.log('🔗 Main API Server: ' + config.mainApiUrl);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down Plinko server...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start Plinko server:', error.message);
    process.exit(1);
  }
}

startServer();