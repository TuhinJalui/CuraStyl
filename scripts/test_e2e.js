(async () => {
  try {
    console.log('\n1) Gemini status');
    let res = await fetch('http://localhost:3000/api/ai/gemini-status');
    console.log('Status', res.status);
    console.log(await res.text());

    console.log('\n2) Chat');
    res = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Recommend a salon in Bandra for a haircut under 1000' }], language: 'en' }),
    });
    console.log('Chat', res.status);
    console.log(await res.text());

    console.log('\n3) Generate image');
    res = await fetch('http://localhost:3000/api/ai/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'a stylish haircut editorial photo, warm tones', count: 2 }),
    });
    console.log('Generate image', res.status);
    console.log(await res.text());

    console.log('\n4) Image analyze (1x1 PNG)');
    const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';
    res = await fetch('http://localhost:3000/api/ai/image-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: tinyPng, purpose: 'face' }),
    });
    console.log('Image analyze', res.status);
    console.log(await res.text());

    console.log('\nE2E script finished');
  } catch (err) {
    console.error('E2E failed', err);
    process.exit(1);
  }
})();
