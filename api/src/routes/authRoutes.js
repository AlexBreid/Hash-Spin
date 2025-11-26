// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { useOneTimeToken, generateSessionToken } = require('../services/authService');
const prisma = require('../../prismaClient');

// ====================================
// 1. АВТОРИЗАЦИЯ ПО ТОКЕНУ (TELEGRAM)
// ====================================
router.post('/login-with-token', async(req, res) => {  
    const { token: oneTimeToken } = req.body;

      
    if (!oneTimeToken) {     return res.status(400).json({       success: false,       error: 'One-time token is required'     });   }

      
    try {     // Пытаемся получить пользователя и использовать токен
             const user = await useOneTimeToken(oneTimeToken);

             if (!user) {       console.error(`[AUTH ERROR 401] Token rejected.`);       return res.status(401).json({         success: false,         error: 'Invalid, expired, or used token'       });     }

             // Создаем JWT-токен сессии
             const sessionToken = generateSessionToken(user);

            
        console.log(`🎉 Successful login via token. User ID: ${user.id}`);

             return res.json({       success: true,       token: sessionToken,       user: {         id: user.id,         username: user.username,         firstName: user.firstName       }     });   } catch (error) {     console.error('❌ Error in login-with-token:', error);     return res.status(500).json({       success: false,       error: 'Internal server error'     });   }
});

// ================================================
// 2. АВТОРИЗАЦИЯ ПО ЛОГИНУ И ПАРОЛЮ (НОВЫЙ ENDPOINT)
// ================================================
router.post('/login-with-credentials', async(req, res) => {  
    const { username, password } = req.body;

       // Валидация входных данных
      
    if (!username || !password) {     return res.status(400).json({       success: false,       error: 'Username and password are required'     });   }

      
    try {     // Поиск пользователя по username или id (если username - это ID)
             let user = await prisma.user.findFirst({       where: {         OR: [          { username: username },            // Поиск по ID (числовой логин)
                               { id: isNaN(username) ? undefined : parseInt(username) }        
                ]       }     });

             // Проверка существования пользователя
             if (!user) {       console.warn(`[AUTH FAILED] User not found: ${username}`);       return res.status(401).json({         success: false,         error: 'Invalid username or password'       });     }

             // Проверка наличия хеша пароля в БД
             if (!user.passwordHash) {       console.warn(`[AUTH FAILED] User ${username} has no password set`);       return res.status(401).json({         success: false,         error: 'Invalid username or password'       });     }

             // Проверка пароля
             const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

             if (!isPasswordValid) {       console.warn(`[AUTH FAILED] Invalid password for user: ${username}`);       return res.status(401).json({         success: false,         error: 'Invalid username or password'       });     }

             // Успешная авторизация - генерируем JWT токен
             const sessionToken = generateSessionToken(user);

            
        console.log(`🎉 Successful login via credentials. User ID: ${user.id}`);

             return res.json({       success: true,       token: sessionToken,       user: {         id: user.id,         username: user.username,         firstName: user.firstName,         lastName: user.lastName       }     });

           } catch (error) {     console.error('❌ Error in login-with-credentials:', error);     return res.status(500).json({       success: false,       error: 'Internal server error'     });   }
});

module.exports = router;