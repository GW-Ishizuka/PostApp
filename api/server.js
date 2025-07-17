const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());

const pool = new Pool({
  user: 'postgres',
  host: 'post-app-db.cluster-cbmekq0gy9bp.ap-northeast-1.rds.amazonaws.com',  // 適宜書き換え
  database: 'post_app_db', // 適宜書き換え
  password: 'fWRUIWQcmIscZANWR4rr', // 適宜
  port: 5432,
});

async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('DB connection OK:', res.rows[0]);
  } catch (error) {
    console.error('DB connection error:', error);
  }
}

testConnection();

// 郵便番号から住所検索
app.get('/api/search/address', async (req, res) => {
  const { zipcode, page = 1, limit = 10 } = req.query;
  if (!zipcode) return res.status(400).json({ error: 'zipcode is required' });

  const offset = (Number(page) - 1) * Number(limit);

  try {
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM post_app.ken_all WHERE zip LIKE $1',
      [`${zipcode}%`]
    );
    const totalCount = Number(countResult.rows[0].count);

    const result = await pool.query(
      'SELECT zip, pref, city, town FROM post_app.ken_all WHERE zip LIKE $1 ORDER BY zip LIMIT $2 OFFSET $3',
      [`${zipcode}%`, Number(limit), offset]
    );

    res.json({
      totalCount,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCount / limit),
      results: result.rows,
    });
  } catch (err) {
    console.error('郵便番号検索エラー:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 住所から郵便番号検索（半角カナ＋濁点別扱いのまま部分一致）
app.get('/api/search/zipcode', async (req, res) => {
  const { address, page = 1, limit = 10 } = req.query;
  if (!address) return res.status(400).json({ error: 'address is required' });

  const offset = (Number(page) - 1) * Number(limit);
  const likeQuery = `%${address}%`;

  try {
    const countResult = await pool.query(
      `
      SELECT COUNT(*) FROM post_app.ken_all
      WHERE
        (kana_pref || kana_city || kana_town) ILIKE $1
        OR (pref || city || town) ILIKE $1
      `,
      [likeQuery]
    );

    const totalCount = Number(countResult.rows[0].count);

    const result = await pool.query(
      `
      SELECT zip, pref, city, town
      FROM post_app.ken_all
      WHERE
        (kana_pref || kana_city || kana_town) ILIKE $1
        OR (pref || city || town) ILIKE $1
      ORDER BY zip
      LIMIT $2 OFFSET $3
      `,
      [likeQuery, Number(limit), offset]
    );

    res.json({
      totalCount,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCount / limit),
      results: result.rows,
    });
  } catch (err) {
    console.error('住所検索エラー:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ヘルスチェック用
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const port = 4000;
app.listen(port, () => {
  console.log(`Postal code API server listening at http://localhost:${port}`);
});
