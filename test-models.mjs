async function checkModels() {
  const apiKey = 'csk-2t5t4kyrwt9jw8wrvv2fewrr6evc9dh8tj58jw4pnptjrner';

  console.log("🔍 Pinging Cerebras Registry for Supported Models...");
  try {
    const res = await fetch('https://api.cerebras.ai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      console.error(`❌ HTTP Error: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.error(text);
      return;
    }

    const data = await res.json();
    console.log("✅ Models successfully retrieved!");
    console.log("-------------------------------------------------");
    data.data.forEach((model) => {
      console.log(`Model ID: \x1b[32m${model.id}\x1b[0m`);
      console.log(`Owned By: ${model.owned_by}`);
      console.log("-------------------------------------------------");
    });
  } catch (err) {
    console.error("❌ Network Error:", err);
  }
}

checkModels();
