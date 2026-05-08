const key = 'auXFbIRPeEgvOeXdC63QZHQYgm4RPcCE';
async function test() {
  try {
    const response = await fetch('https://api.mistral.ai/v1/models', {
      headers: {
        'Authorization': `Bearer ${key}`
      }
    });
    const data = await response.json();
    console.log('Mistral Models Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Test failed:', err);
  }
}
test();
