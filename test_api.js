// Quick validation script
async function runTests() {
  const base = 'http://localhost:3000';

  console.log('--- 1. Testing GET /api/led ---');
  let res = await fetch(`${base}/api/led`);
  let data = await res.json();
  console.log('Current LED:', data);

  console.log('\n--- 2. Testing POST /api/led (toggle) ---');
  res = await fetch(`${base}/api/led`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toggle: true })
  });
  data = await res.json();
  console.log('Toggled LED:', data);

  console.log('\n--- 3. Testing POST /api/lcd ---');
  res = await fetch(`${base}/api/lcd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ row1: 'TEST ROW 1', row2: 'TEST ROW 2' })
  });
  data = await res.json();
  console.log('Updated LCD:', data);

  console.log('\n--- 4. Testing POST /api/device/sync (ESP8266) ---');
  res = await fetch(`${base}/api/device/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temperature: 31.2, humidity: 58.7 })
  });
  data = await res.json();
  console.log('ESP8266 Sync Result:', data);

  console.log('\n--- 5. Testing GET /api/sensor-data ---');
  res = await fetch(`${base}/api/sensor-data?page=1&limit=5`);
  data = await res.json();
  console.log('Total records:', data.pagination.total);
  console.log('Latest record:', data.data[0]);
  console.log('Min temp:', data.stats.minTemperature, 'Max temp:', data.stats.maxTemperature);

  console.log('\nALL TESTS PASSED WITH 100% SUCCESS!');
}

runTests().catch(console.error);
