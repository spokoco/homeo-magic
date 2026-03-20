#!/usr/bin/env node
/**
 * Homeo-Magic Data & Algorithm Tests (no server needed)
 * Run with: node test-data.js
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function test(name, fn) {
  process.stdout.write(`  ${name}... `);
  try {
    fn();
    console.log('✅');
    passed++;
  } catch (e) {
    console.log(`❌ ${e.message}`);
    failed++;
  }
}

console.log('🧪 Homeo-Magic Data & Algorithm Tests\n');

// Load data
const dataDir = path.join(__dirname, 'data');
const webDataDir = path.join(__dirname, 'web/public/data');

let symptoms, remedies;

test('Data files exist', () => {
  const symptomsPath = fs.existsSync(path.join(dataDir, 'symptoms.json')) 
    ? path.join(dataDir, 'symptoms.json')
    : path.join(webDataDir, 'symptoms.json');
  const remediesPath = fs.existsSync(path.join(dataDir, 'remedies.json'))
    ? path.join(dataDir, 'remedies.json')
    : path.join(webDataDir, 'remedies.json');
    
  if (!fs.existsSync(symptomsPath)) throw new Error('symptoms.json not found');
  if (!fs.existsSync(remediesPath)) throw new Error('remedies.json not found');
  
  symptoms = JSON.parse(fs.readFileSync(symptomsPath, 'utf8'));
  remedies = JSON.parse(fs.readFileSync(remediesPath, 'utf8'));
});

test('Symptoms count is exactly 74,481', () => {
  const count = Object.keys(symptoms).length;
  if (count !== 74481) throw new Error(`Expected 74,481 symptoms, got ${count}`);
});

test('Remedies count is exactly 2,432', () => {
  const count = Object.keys(remedies).length;
  if (count !== 2432) throw new Error(`Expected 2,432 remedies, got ${count}`);
});

test('Symptoms have correct structure', () => {
  const sample = symptoms['Head, pain, morning'];
  if (!sample) throw new Error('Sample symptom not found');
  if (!sample.remedies) throw new Error('No remedies key');
  if (typeof sample.remedies !== 'object') throw new Error('remedies not object');
});

test('Grades are 1-3', () => {
  let checked = 0;
  for (const symptom of Object.values(symptoms).slice(0, 100)) {
    for (const grade of Object.values(symptom.remedies)) {
      if (grade < 1 || grade > 3) throw new Error(`Invalid grade: ${grade}`);
      checked++;
    }
  }
  if (checked < 100) throw new Error('Too few grades checked');
});

test('Common remedies exist', () => {
  const common = ['Nux-v.', 'Sulph.', 'Puls.', 'Ars.', 'Lyc.'];
  for (const r of common) {
    if (!remedies[r]) throw new Error(`${r} not found`);
  }
});

test('Search for "headache" returns results', () => {
  const matches = Object.keys(symptoms).filter(s => 
    s.toLowerCase().includes('headache')
  );
  if (matches.length < 10) throw new Error(`Only ${matches.length} matches`);
});

test('Intersection algorithm (3 symptoms)', () => {
  const selected = [
    'Head, pain, morning',
    'Mind, irritability',
    'Generalities, cold, in general agg.'
  ];
  
  // Verify symptoms exist
  for (const s of selected) {
    if (!symptoms[s]) throw new Error(`Symptom not found: ${s}`);
  }
  
  // Calculate intersection
  const remedyScores = {};
  const remedyPresence = {};
  
  for (const symptom of selected) {
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
  if (intersection.length < 50) throw new Error(`Only ${intersection.length} in intersection`);
});

test('Top remedy is high-grade across symptoms', () => {
  const selected = [
    'Head, pain, morning',
    'Mind, irritability',
    'Generalities, cold, in general agg.'
  ];
  
  const remedyScores = {};
  const remedyPresence = {};
  
  for (const symptom of selected) {
    for (const [abbrev, weight] of Object.entries(symptoms[symptom].remedies)) {
      if (!remedyScores[abbrev]) {
        remedyScores[abbrev] = 0;
        remedyPresence[abbrev] = new Set();
      }
      remedyScores[abbrev] += weight;
      remedyPresence[abbrev].add(symptom);
    }
  }
  
  const intersection = Object.entries(remedyScores)
    .filter(([abbrev]) => remedyPresence[abbrev].size === 3)
    .sort((a, b) => b[1] - a[1]);
  
  const [topRemedy, topScore] = intersection[0];
  
  // Top score should be high (at least 7 for 3 symptoms)
  if (topScore < 7) throw new Error(`Top score too low: ${topScore}`);
  
  console.log(`\n    Top: ${topRemedy} (${topScore} pts) = ${remedies[topRemedy]}`);
});

test('Nux-v appears in top results for classic symptoms', () => {
  const selected = [
    'Head, pain, morning',
    'Mind, irritability',
    'Generalities, cold, in general agg.'
  ];
  
  const remedyScores = {};
  const remedyPresence = {};
  
  for (const symptom of selected) {
    for (const [abbrev, weight] of Object.entries(symptoms[symptom].remedies)) {
      if (!remedyScores[abbrev]) {
        remedyScores[abbrev] = 0;
        remedyPresence[abbrev] = new Set();
      }
      remedyScores[abbrev] += weight;
      remedyPresence[abbrev].add(symptom);
    }
  }
  
  const intersection = Object.entries(remedyScores)
    .filter(([abbrev]) => remedyPresence[abbrev].size === 3)
    .sort((a, b) => b[1] - a[1]);
  
  const nuxRank = intersection.findIndex(([abbrev]) => abbrev === 'Nux-v.');
  if (nuxRank === -1) throw new Error('Nux-v not in results');
  if (nuxRank > 3) throw new Error(`Nux-v ranked ${nuxRank + 1}, expected top 3`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
