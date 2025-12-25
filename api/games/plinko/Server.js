/**
 * 🎮 PLINKO MICROSERVICE - HTTP Server + Socket.IO
 */

const http = require('http');
const socketIO = require('socket.io');
const config = require('./config');
const socketEvents = require('./socket/events');

/**
 * Создаёт HTTP сервер с Socket.IO
 */
exports.createServer = (app) => {
    // Создаём HTTP сервер
    const server = http.createServer(app);

    // Инициализируем Socket.IO
    const io = socketIO(server, {
        cors: config.socket.cors,
        transports: config.socket.transports
    });

    // Обработка socket событий
    socketEvents(io);

    // Сохраняем io в app для использования в других модулях
    app.locals.io = io;

    return server;
};

module.exports.socketIO = socketIO;