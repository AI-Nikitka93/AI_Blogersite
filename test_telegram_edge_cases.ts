import { buildTelegramPostText } from './src/lib/telegram';

const testPost1 = {
  title: 'Test Empty Observed',
  observed: [],
  source: '',
  opinion: 'Opinion',
  source_url: '',
  telegram_text: '',
  category: 'Tech'
} as any;

console.log('--- Test 1 (Empty Observed, Empty Source) ---');
console.log(buildTelegramPostText(testPost1, 'http://example.com/post/1'));

const testPost2 = {
  title: 'Test XSS URL',
  observed: ['Fact 1'],
  source: 'Source',
  opinion: 'Opinion',
  source_url: 'javascript:alert("XSS")',
  telegram_text: '',
  category: 'Tech'
} as any;

console.log('\n--- Test 2 (Malicious URL) ---');
console.log(buildTelegramPostText(testPost2, 'http://example.com/post/1'));
