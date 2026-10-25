// Test URL Normalization & Resolution logic

const normalizeApiUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  const clean = trimmed.replace(/\/+$/, '');
  if (!clean) return '';
  if (clean.toLowerCase().endsWith('/api')) {
    return clean.slice(0, -4) + '/api';
  }
  return `${clean}/api`;
};

console.log('Testing normalizeApiUrl...');

const cases = [
  { input: 'https://visteon-backend.onrender.com', expected: 'https://visteon-backend.onrender.com/api' },
  { input: 'https://visteon-backend.onrender.com/', expected: 'https://visteon-backend.onrender.com/api' },
  { input: 'https://visteon-backend.onrender.com///', expected: 'https://visteon-backend.onrender.com/api' },
  { input: 'https://visteon-backend.onrender.com/api', expected: 'https://visteon-backend.onrender.com/api' },
  { input: 'https://visteon-backend.onrender.com/api/', expected: 'https://visteon-backend.onrender.com/api' },
  { input: 'https://visteon-backend.onrender.com/API/', expected: 'https://visteon-backend.onrender.com/api' },
  { input: 'http://localhost:5000', expected: 'http://localhost:5000/api' },
  { input: 'http://localhost:5000/api', expected: 'http://localhost:5000/api' },
  { input: '', expected: '' },
  { input: null, expected: '' },
  { input: undefined, expected: '' },
  { input: '   ', expected: '' },
];

let failed = 0;
for (const c of cases) {
  const result = normalizeApiUrl(c.input);
  if (result === c.expected) {
    console.log(`✅ PASS: "${c.input}" -> "${result}"`);
  } else {
    console.error(`❌ FAIL: "${c.input}" -> expected "${c.expected}", got "${result}"`);
    failed++;
  }
}

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\nAll 12 URL normalization test cases passed successfully!');
}
