(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Recommend a salon in Bandra for a haircut under 1000' }],
        language: 'en'
      }),
    });
    const txt = await res.text();
    console.log('STATUS', res.status);
    console.log(txt);
  } catch (err) {
    console.error(err);
  }
})();
