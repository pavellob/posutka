#!/bin/bash

# Скрипт для остановки всех субграфов

echo "🛑 Остановка всех GraphQL субграфов..."

if [ -f "subgraph_pids.txt" ]; then
    while read pid; do
        if kill -0 $pid 2>/dev/null; then
            echo "🔄 Остановка процесса $pid..."
            kill $pid
        fi
    done < subgraph_pids.txt
    
    # Ждем завершения процессов
    sleep 2
    
    # Принудительно завершаем, если процессы еще работают
    while read pid; do
        if kill -0 $pid 2>/dev/null; then
            echo "⚡ Принудительная остановка процесса $pid..."
            kill -9 $pid
        fi
    done < subgraph_pids.txt
    
    rm -f subgraph_pids.txt
    echo "✅ Все субграфы остановлены"
else
    echo "ℹ️  Файл с PID'ами не найден. Попытка остановить процессы по портам..."
    
    # Остановка процессов по портам
    for port in 4001 4002 4003 4004 4005 4006 4007 4008; do
        pid=$(lsof -ti:$port)
        if [ ! -z "$pid" ]; then
            echo "🔄 Остановка процесса на порту $port (PID: $pid)..."
            kill $pid
        fi
    done
    
    echo "✅ Процессы остановлены"
fi
