#!/bin/bash

echo "======================================"
echo "🚀 Load Balancer System - Startup"
echo "======================================"
echo ""

# Перевірка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не встановлено!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не встановлено!"
    exit 1
fi

echo "✅ Docker встановлено"
echo ""

# Генерація SSL сертифікатів якщо їх немає
if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
    echo "🔐 Генерація SSL сертифікатів..."
    ./generate-ssl.sh
    echo ""
fi

# Зупинка попередніх контейнерів
echo "🛑 Зупинка попередніх контейнерів..."
docker-compose down
echo ""

# Збірка та запуск
echo "🔨 Збірка контейнерів..."
docker-compose build
echo ""

echo "🚀 Запуск системи..."
docker-compose up -d
echo ""

# Очікування поки сервіси запустяться
echo "⏳ Очікування запуску сервісів (30 сек)..."
sleep 30
echo ""

# Перевірка статусу
echo "📊 Статус сервісів:"
docker-compose ps
echo ""

echo "======================================"
echo "✅ Система запущена!"
echo "======================================"
echo ""
echo "📱 Доступ до застосунку:"
echo "   Frontend: https://localhost"
echo "   API:      https://localhost/api"
echo ""
echo "🔑 Тестові облікові записи:"
echo "   Адмін:     admin / admin123"
echo "   Користувач: user1 / user123"
echo ""
echo "📝 Команди:"
echo "   Логи:      docker-compose logs -f"
echo "   Зупинити:  docker-compose down"
echo "   Перезапуск: docker-compose restart"
echo ""
echo "⚠️  При першому запуску браузер покаже попередження"
echo "    про самопідписаний SSL сертифікат - це нормально."
echo "======================================"
