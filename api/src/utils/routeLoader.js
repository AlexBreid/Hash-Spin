// src/utils/routeLoader.js
const fs = require('fs');
const path = require('path');
const express = require('express');

/**
 * Динамически загружает все route файлы из папки
 * и экспортирует их paths на фронт
 */
class RouteLoader {
  constructor(routesDir) {
    this.routesDir = routesDir;
    this.routes = new Map(); // Хранит { key: { path, method } }
    this.expressRouters = []; // Для подключения к Express
  }

  /**
   * Загружает все route файлы из папки
   */
  loadRoutes() {
    try {
      if (!fs.existsSync(this.routesDir)) {
        return;
      }

      const files = fs.readdirSync(this.routesDir);

      for (const file of files) {
        // Пропускаем не-js файлы и специальные файлы
        if (!file.endsWith('Routes.js') || file === 'index.js') {
          continue;
        }

        const filePath = path.join(this.routesDir, file);

        try {
          // Загружаем route файл
          delete require.cache[require.resolve(filePath)];
          const router = require(filePath);

          // Сохраняем router для подключения к Express
          this.expressRouters.push(router);

          // Извлекаем endpoints из router'а
          this.extractEndpoints(file, router);

          } catch (err) {
          }
      }

      } catch (err) {
      }
  }

  /**
   * Извлекает все endpoints из Express router'а
   */
  extractEndpoints(fileName, router) {
    if (!router.stack) {
      return;
    }

    const moduleName = fileName.replace('Routes.js', '').toUpperCase();

    for (const layer of router.stack) {
      if (layer.route) {
        // Это прямой route (не middleware)
        const methods = Object.keys(layer.route.methods);
        const path = layer.route.path;

        for (const method of methods) {
          // Генерируем ключ для API
          // Например: USER_GET_PROFILE, REFERRAL_POST_CLAIM_BONUS
          const routeName = this.generateRouteName(path, method);
          const apiKey = `${moduleName}_${routeName}`;

          this.routes.set(apiKey, {
            path,
            method: method.toUpperCase(),
            module: moduleName,
          });
        }
      }
    }
  }

  /**
   * Генерирует имя route из пути и метода
   * /api/v1/profile → GET_PROFILE
   * /api/v1/referral/stats → GET_STATS
   */
  generateRouteName(path, method) {
    // Убираем /api/v1/ префикс
    let cleanPath = path.replace(/^\/api\/v\d+\/?/, '');

    // Заменяем / на _
    cleanPath = cleanPath.replace(/\//g, '_');

    // Убираем :id и подобные параметры
    cleanPath = cleanPath.replace(/:[\w]+/g, '');

    // Убираем пробелы в конце
    cleanPath = cleanPath.trim();

    return `${method.toUpperCase()}_${cleanPath}`.replace(/_+/g, '_');
  }

  /**
   * Получить все routes в формате для фронта
   */
  getApiPaths() {
    const paths = {};

    for (const [key, route] of this.routes) {
      paths[key] = {
        path: route.path,
        method: route.method,
      };
    }

    return paths;
  }

  /**
   * Получить Express routers для подключения
   */
  getExpressRouters() {
    return this.expressRouters;
  }

  /**
   * Вывести все загруженные routes в консоль
   */
  printRoutes() {
    const sortedRoutes = Array.from(this.routes.entries()).sort();

    for (const [key, route] of sortedRoutes) {
      }

    }
}

module.exports = RouteLoader;

