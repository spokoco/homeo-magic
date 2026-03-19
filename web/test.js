#!/usr/bin/env node
/**
 * Homeo-Magic Web UI Tests
 * Run with: node test.js
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:3333';
let passed = 0;
let failed = 0;

async function fetch(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ 
        ok: res.statusCode >= 200 && res.statusCode < 300,
        status: res.statusCode,
        text: () => Promise.resolve(data),
        json: () => Promise.resolve(JSON.parse(data))
      }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function test(name, fn) {
  process.stdout.write(`  ${name}... `);
  try {
    await fn();
    console.log('✅');
    passed++;
  } catch (e) {
    console.log(`❌ ${e.message}`);
    failed++;
  }
}

async function runTests() {
  console.log('🧪 Homeo-Magic Web UI Tests\n');

  // Test 1: Server is running
  await test('Server responds', async () => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });

  // Test 2: Page has correct title
  await test('Page title is correct', async () => {
    const res = await fetch(`${BASE_URL}/`);
    const html = await res.text();
    if (!html.includes('Homeo-Magic')) throw new Error('Title not found');
  });

  // Test 3: Data files are accessible
  await test('remedies.json loads', async () => {
    const res = await fetch(`${BASE_URL}/data/remedies.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data['Nux-v.']) throw new Error('Nux-v not found');
  });

  await test('symptoms.json loads', async () => {
    const res = await fetch(`${BASE_URL}/data/symptoms.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Object.keys(data).length < 1000) throw new Error('Too few symptoms');
  });

  // Test 4: Data has correct structure
  await test('symptoms have remedy grades', async () => {
    const res = await fetch(`${BASE_URL}/data/symptoms.json`);
    const data = await res.json();
    const firstSymptom = Object.values(data)[0];
    if (!firstSymptom.remedies) throw new Error('No remedies key');
    const grades = Object.values(firstSymptom.remedies);
    if (!grades.every(g => g >= 1 && g <= 3)) throw new Error('Invalid grades');
  });

  // Test 5: Repertorization logic (test the algorithm locally)
  await test('intersection algorithm works', async () => {
    const symptomsRes = await fetch(`${BASE_URL}/data/symptoms.json`);
    const remediesRes = await fetch(`${BASE_URL}/data/remedies.json`);
    const symptoms = await symptomsRes.json();
    const remedies = await remediesRes.json();

    // Pick 3 symptoms that should have Nux-v in common
    const testSymptoms = [
      'Head, pain, morning',
      'Mind, irritability',
      'Generalities, cold, in general agg.'
    ];

    // Calculate intersection
    const remedyScores = {};
    const remedyPresence = {};

    for (const symptom of testSymptoms) {
      if (!symptoms[symptom]) throw new Error(`Symptom not found: ${symptom}`);
      for (const [abbrev, weight] of Object.entries(symptoms[symptom].remedies)) {
        if (!remedyScores[abbrev]) {
          remedyScores[abbrev] = 0;
          remedyPresence[abbrev] = new Set();
        }
        remedyScores[abbrev] += weight;
        remedyPresence[abbrev].add(symptom);
      }
    }

    // Find remedies in all 3
    const intersection = Object.entries(remedyScores)
      .filter(([abbrev]) => remedyPresence[abbrev].size === 3)
      .sort((a, b) => b[1] - a[1]);

    if (intersection.length === 0) throw new Error('No intersection found');
    
    // Check Nux-v is high ranked
    const nuxRank = intersection.findIndex(([abbrev]) => abbrev === 'Nux-v.');
    if (nuxRank === -1) throw new Error('Nux-v not in results');
    if (nuxRank > 5) throw new Error(`Nux-v ranked too low: ${nuxRank + 1}`);
  });

  // Test 6: Search functionality
  await test('symptom search works (headache)', async () => {
    const res = await fetch(`${BASE_URL}/data/symptoms.json`);
    const symptoms = await res.json();
    const matches = Object.keys(symptoms).filter(s => 
      s.toLowerCase().includes('headache')
    );
    if (matches.length < 5) throw new Error(`Only ${matches.length} matches`);
  });

  // Test 7: UI has required elements
  await test('UI has search input', async () => {
    const res = await fetch(`${BASE_URL}/`);
    const html = await res.text();
    if (!html.includes('input') && !html.includes('Input')) {
      throw new Error('No input element found');
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Test runner failed:', e);
  process.exit(1);
});
