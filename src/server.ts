import { app } from './app.js';
import { CONFIG } from './config.js';

app.listen(CONFIG.PORT, () => {
  console.log(`=========================================`);
  console.log(`🔞 ToonGod 18+ API Dashboard berjalan di:`);
  console.log(`👉 http://localhost:${CONFIG.PORT}`);
  console.log(`⚠️ Mode: Adult 18+ Webtoon & Manhwa Only`);
  console.log(`=========================================`);
});
