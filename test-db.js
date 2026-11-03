const { Client } = require('pg');

const connectionString = 'postgresql://postgres.rojeqghjbafupkqoctfs:%D0%B2%D0%B0%D0%B3%D0%BF%D1%80%D0%B2%D0%B0%D1%89%D0%B3%D0%BF%D1%80%D0%B0%D0%B2%D1%89%D0%BF%D1%80%D0%B0%D0%B2%D1%89%D0%BF@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';

console.log("Проверяю подключение к серверу...");

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000 // Ждем 5 секунд и выдаем ошибку
});

client.connect()
  .then(() => console.log('✅ УСПЕХ! База данных подключена.'))
  .catch(err => {
  console.error('❌ ОШИБКА:', err.message);
  if (err.errors) err.errors.forEach(e => console.error(' →', e.message));
  console.error('Код:', err.code);
})
  .finally(() => client.end());