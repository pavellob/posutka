#!/bin/bash

echo "🏗️  Сборка и тестирование Posutka Federation..."

# Собираем Docker образ
echo "🐳 Сборка Docker образа..."
docker build -t posutka-federation:latest .

if [ $? -eq 0 ]; then
    echo "✅ Docker образ собран успешно!"
    
    # Запускаем контейнер в фоне
    echo "🚀 Запуск контейнера..."
    docker run -d \
        --name posutka-test \
        -p 4001:4001 \
        -p 4002:4002 \
        -p 4003:4003 \
        -p 4004:4004 \
        -p 4005:4005 \
        -p 4006:4006 \
        -p 4007:4007 \
        -p 4008:4008 \
        -p 4009:4009 \
        posutka-federation:latest
    
    # Ждем запуска
    echo "⏳ Ожидание запуска сервисов..."
    sleep 30
    
    # Проверяем Gateway
    echo "🔍 Проверка Gateway..."
    if curl -s -f "http://localhost:4009/graphql" -X POST -H "Content-Type: application/json" -d '{"query":"{ __schema { types { name } } }"}' > /dev/null; then
        echo "✅ Gateway работает!"
        
        # Проверяем подграфы
        echo "🔍 Проверка подграфов..."
        for port in 4001 4002 4003 4004 4005 4006 4007 4008; do
            if curl -s -f "http://localhost:$port/graphql" -X POST -H "Content-Type: application/json" -d '{"query":"{ __schema { types { name } } }"}' > /dev/null; then
                echo "✅ Подграф на порту $port работает!"
            else
                echo "❌ Подграф на порту $port не отвечает"
            fi
        done
        
        echo ""
        echo "🎉 Posutka Federation запущена успешно!"
        echo "📊 Gateway: http://localhost:4009/graphql"
        echo "📊 Подграфы: http://localhost:4001-4008/graphql"
        echo ""
        echo "Для остановки: docker stop posutka-test && docker rm posutka-test"
        
    else
        echo "❌ Gateway не отвечает"
        docker logs posutka-test
        docker stop posutka-test
        docker rm posutka-test
        exit 1
    fi
    
else
    echo "❌ Ошибка при сборке Docker образа"
    exit 1
fi
