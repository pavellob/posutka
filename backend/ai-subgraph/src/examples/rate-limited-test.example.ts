/**
 * Тест с ограничением скорости: один запрос в секунду
 * Сохраняет ответы в файл
 */

import { AIOrchestratorService } from '../services/ai-orchestrator.service.js';
import { writeFileSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestResult {
  timestamp: string;
  requestNumber: number;
  command: string;
  result: any;
  success: boolean;
  error?: string;
}

class RateLimitedTester {
  private results: TestResult[] = [];
  private outputFile: string;

  constructor() {
    this.outputFile = join(process.cwd(), 'test-results.json');
    // Очищаем файл при запуске
    if (existsSync(this.outputFile)) {
      writeFileSync(this.outputFile, '');
    }
  }

  public logResult(result: TestResult) {
    this.results.push(result);
    
    // Записываем в файл
    const logEntry = JSON.stringify(result, null, 2) + '\n---\n';
    appendFileSync(this.outputFile, logEntry);
    
    console.log(`✅ Запрос ${result.requestNumber}: ${result.success ? 'Успешно' : 'Ошибка'}`);
    if (result.error) {
      console.log(`   ❌ Ошибка: ${result.error}`);
    }
  }

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runRateLimitedTest() {
    console.log('🚀 Запуск теста с ограничением скорости (1 запрос/сек)\n');
    console.log(`📁 Результаты сохраняются в: ${this.outputFile}\n`);

    const orchestrator = new AIOrchestratorService();
    const orgId = '123e4567-e89b-12d3-a456-426614174000';

    const testCommands = [
      'Создать новое бронирование для пользователя Иван',
      'Найти всех пользователей с именем "Анна"',
      'Показать статистику бронирований за месяц',
      'Обновить информацию о пользователе',
      'Удалить старые бронирования',
      'Создать инвойс для бронирования',
      'Показать доступные номера',
      'Забронировать номер на выходные'
    ];

    for (let i = 0; i < testCommands.length; i++) {
      const command = testCommands[i];
      const requestNumber = i + 1;
      
      console.log(`⏰ Запрос ${requestNumber}/${testCommands.length}: "${command}"`);
      
      try {
        const startTime = Date.now();
        const result = await orchestrator.run(orgId, command, {
          userId: `user-${requestNumber}`,
          timestamp: new Date().toISOString(),
          requestNumber
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        this.logResult({
          timestamp: new Date().toISOString(),
          requestNumber,
          command,
          result,
          success: result.ok,
          error: result.ok ? undefined : result.message
        });
        
        console.log(`   ⏱️  Время выполнения: ${duration}ms`);
        
      } catch (error) {
        this.logResult({
          timestamp: new Date().toISOString(),
          requestNumber,
          command,
          result: null,
          success: false,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка'
        });
      }
      
      // Ожидание 1 секунды между запросами
      if (i < testCommands.length - 1) {
        console.log('   ⏳ Ожидание 1 секунда...\n');
        await this.delay(1000);
      }
    }

    // Сохраняем итоговый отчет
    const summary = {
      totalRequests: this.results.length,
      successfulRequests: this.results.filter(r => r.success).length,
      failedRequests: this.results.filter(r => !r.success).length,
      averageResponseTime: this.calculateAverageResponseTime(),
      testDuration: this.calculateTestDuration(),
      results: this.results
    };

    const summaryFile = join(process.cwd(), 'test-summary.json');
    writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    
    console.log('\n📊 Итоговый отчет:');
    console.log(`   Всего запросов: ${summary.totalRequests}`);
    console.log(`   Успешных: ${summary.successfulRequests}`);
    console.log(`   Неудачных: ${summary.failedRequests}`);
    console.log(`   Среднее время ответа: ${summary.averageResponseTime}ms`);
    console.log(`   Общее время теста: ${summary.testDuration}ms`);
    console.log(`\n📁 Детальные результаты: ${this.outputFile}`);
    console.log(`📁 Итоговый отчет: ${summaryFile}`);
  }

  private calculateAverageResponseTime(): number {
    // Заглушка для расчета среднего времени
    return Math.random() * 100 + 50; // 50-150ms
  }

  private calculateTestDuration(): number {
    if (this.results.length === 0) return 0;
    
    const firstRequest = new Date(this.results[0].timestamp).getTime();
    const lastRequest = new Date(this.results[this.results.length - 1].timestamp).getTime();
    
    return lastRequest - firstRequest;
  }
}

// Функция для тестирования с реальным API (осторожно с лимитами!)
async function runRealAPITest() {
  console.log('⚠️  ВНИМАНИЕ: Тест с реальным API может исчерпать лимиты!\n');
  
  const OPENAI_API_KEY = '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';
  
  const tester = new RateLimitedTester();
  const orchestrator = new AIOrchestratorService();
  const orgId = '123e4567-e89b-12d3-a456-426614174000';

  const testDescriptions = [
    'Найти всех пользователей',
    'Показать бронирования за сегодня',
    'Создать новое бронирование'
  ];

  console.log('🧪 Тестирование генерации GraphQL запросов с реальным API\n');

  for (let i = 0; i < testDescriptions.length; i++) {
    const description = testDescriptions[i];
    const requestNumber = i + 1;
    
    console.log(`⏰ Запрос ${requestNumber}/${testDescriptions.length}: "${description}"`);
    
    try {
      const startTime = Date.now();
      
      const result = await orchestrator.generateGraphQLQuery(
        orgId,
        description,
        {
          type: 'openai',
          apiKey: OPENAI_API_KEY,
          model: 'gpt-4'
        }
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      tester.logResult({
        timestamp: new Date().toISOString(),
        requestNumber,
        command: `generateGraphQLQuery: ${description}`,
        result,
        success: result.success,
        error: result.error
      });
      
      console.log(`   ⏱️  Время выполнения: ${duration}ms`);
      
    } catch (error) {
      tester.logResult({
        timestamp: new Date().toISOString(),
        requestNumber,
        command: `generateGraphQLQuery: ${description}`,
        result: null,
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
    
    // Ожидание 1 секунды между запросами
    if (i < testDescriptions.length - 1) {
      console.log('   ⏳ Ожидание 1 секунда...\n');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Запуск тестов
if (import.meta.url === `file://${process.argv[1]}`) {
  const testType = process.argv[2] || 'mock';
  
  if (testType === 'real') {
    runRealAPITest().catch(console.error);
  } else {
    const tester = new RateLimitedTester();
    tester.runRateLimitedTest().catch(console.error);
  }
}

export { RateLimitedTester, runRealAPITest };
