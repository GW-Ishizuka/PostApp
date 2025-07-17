import React, { useState, useEffect } from 'react';
import axios from 'axios';

// デバウンスフック
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}

// ひらがな → 全角カタカナ
function toKatakana(str) {
  return str.replace(/[\u3041-\u3096]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

// 濁点・半濁点付き全角カナをベース文字＋濁点・半濁点に分解
function decomposeKana(str) {
  const baseMap = {
    'ガ': 'カ', 'ギ': 'キ', 'グ': 'ク', 'ゲ': 'ケ', 'ゴ': 'コ',
    'ザ': 'サ', 'ジ': 'シ', 'ズ': 'ス', 'ゼ': 'セ', 'ゾ': 'ソ',
    'ダ': 'タ', 'ヂ': 'チ', 'ヅ': 'ツ', 'デ': 'テ', 'ド': 'ト',
    'バ': 'ハ', 'ビ': 'ヒ', 'ブ': 'フ', 'ベ': 'ヘ', 'ボ': 'ホ',
    'パ': 'ハ', 'ピ': 'ヒ', 'プ': 'フ', 'ペ': 'ヘ', 'ポ': 'ホ',
  };
  const dakuten = 'ﾞ';
  const handakuten = 'ﾟ';

  let result = '';
  for (const ch of str) {
    if (baseMap[ch]) {
      result += baseMap[ch];
      if ('パピプペポ'.includes(ch)) {
        result += handakuten;
      } else {
        result += dakuten;
      }
    } else {
      result += ch;
    }
  }
  return result;
}

// 全角カタカナ → 半角カタカナ変換テーブル（簡易）
const kanaToHalfMap = {
  'ア':'ｱ', 'イ':'ｲ', 'ウ':'ｳ', 'エ':'ｴ', 'オ':'ｵ',
  'カ':'ｶ', 'キ':'ｷ', 'ク':'ｸ', 'ケ':'ｹ', 'コ':'ｺ',
  'サ':'ｻ', 'シ':'ｼ', 'ス':'ｽ', 'セ':'ｾ', 'ソ':'ｿ',
  'タ':'ﾀ', 'チ':'ﾁ', 'ツ':'ﾂ', 'テ':'ﾃ', 'ト':'ﾄ',
  'ナ':'ﾅ', 'ニ':'ﾆ', 'ヌ':'ﾇ', 'ネ':'ﾈ', 'ノ':'ﾉ',
  'ハ':'ﾊ', 'ヒ':'ﾋ', 'フ':'ﾌ', 'ヘ':'ﾍ', 'ホ':'ﾎ',
  'マ':'ﾏ', 'ミ':'ﾐ', 'ム':'ﾑ', 'メ':'ﾒ', 'モ':'ﾓ',
  'ヤ':'ﾔ', 'ユ':'ﾕ', 'ヨ':'ﾖ',
  'ラ':'ﾗ', 'リ':'ﾘ', 'ル':'ﾙ', 'レ':'ﾚ', 'ロ':'ﾛ',
  'ワ':'ﾜ', 'ヲ':'ｦ', 'ン':'ﾝ',
  'ァ':'ｧ', 'ィ':'ｨ', 'ゥ':'ｩ', 'ェ':'ｪ', 'ォ':'ｫ',
  'ッ':'ｯ', 'ャ':'ｬ', 'ュ':'ｭ', 'ョ':'ｮ',
  'ー':'ｰ',
  'ﾞ':'ﾞ', 'ﾟ':'ﾟ', // 濁点・半濁点も含める
};

// 半角カナに変換（濁点・半濁点はそのまま）
function normalizeKana(str) {
  let result = '';
  for (const ch of str) {
    result += kanaToHalfMap[ch] ?? ch;
  }
  return result;
}

function App() {
  const [mode, setMode] = useState('zip'); // 'zip' or 'address'
  const [zipcode, setZipcode] = useState('');
  const [address, setAddress] = useState('');
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const debouncedZipcode = useDebounce(zipcode, 500);
  const debouncedAddress = useDebounce(address, 500);
  const apiBase = 'http://43.206.192.39:4000';

  useEffect(() => {
    const fetchData = async () => {
      if (mode === 'zip') {
        if (debouncedZipcode.length === 0) {
          setResults([]);
          setTotalPages(1);
          setPage(1);
          return;
        }
        try {
          const res = await axios.get(`${apiBase}/api/search/address`, {
            params: { zipcode: debouncedZipcode, page, limit: 10 },
          });
          setResults(res.data.results);
          setTotalPages(res.data.totalPages);
        } catch {
          setResults([]);
          setTotalPages(1);
        }
      } else {
        if (debouncedAddress.length === 0) {
          setResults([]);
          setTotalPages(1);
          setPage(1);
          return;
        }
        try {
          // ひらがな→全角カタカナ
          const katakana = toKatakana(debouncedAddress);
          // 濁点・半濁点付き全角カタカナを分解
          const decomposed = decomposeKana(katakana);
          // 半角カタカナに正規化
          const normalized = normalizeKana(decomposed);

          const res = await axios.get(`${apiBase}/api/search/zipcode`, {
            params: { address: normalized, page, limit: 10 },
          });
          setResults(res.data.results);
          setTotalPages(res.data.totalPages);
        } catch {
          setResults([]);
          setTotalPages(1);
        }
      }
    };

    fetchData();
  }, [debouncedZipcode, debouncedAddress, mode, page]);

  useEffect(() => {
    setPage(1);
  }, [mode, debouncedZipcode, debouncedAddress]);

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      <h1 style={{ textAlign: 'center', marginBottom: '1rem', color: '#0070f3' }}>郵便番号・住所リアルタイム検索</h1>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
        <label style={{ cursor: 'pointer' }}>
          <input
            type="radio"
            checked={mode === 'zip'}
            onChange={() => {
              setMode('zip');
              setZipcode('');
              setAddress('');
              setResults([]);
              setPage(1);
              setTotalPages(1);
            }}
          />
          郵便番号から住所
        </label>
        <label style={{ cursor: 'pointer' }}>
          <input
            type="radio"
            checked={mode === 'address'}
            onChange={() => {
              setMode('address');
              setZipcode('');
              setAddress('');
              setResults([]);
              setPage(1);
              setTotalPages(1);
            }}
          />
          住所から郵便番号
        </label>
      </div>

      {mode === 'zip' ? (
        <input
          type="text"
          placeholder="郵便番号（例: 1000001）"
          value={zipcode}
          onChange={(e) => {
            const val = e.target.value;
            if (/^\d{0,7}$/.test(val)) {
              setZipcode(val);
              setPage(1);
            }
          }}
          style={{ width: '100%', padding: 12, fontSize: 18, borderRadius: 6, border: '1px solid #ccc' }}
        />
      ) : (
        <input
          type="text"
          placeholder="住所（例: とうきょう、千代田区など）"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{ width: '100%', padding: 12, fontSize: 18, borderRadius: 6, border: '1px solid #ccc' }}
        />
      )}

      <div style={{ marginTop: 24 }}>
        <h2 style={{ borderBottom: '2px solid #0070f3', paddingBottom: 4, color: '#0070f3' }}>検索結果</h2>
        {results.length === 0 ? (
          <p style={{ fontStyle: 'italic', color: '#888' }}>結果がありません</p>
        ) : (
          <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
            {results.map((r, i) => (
              <li key={i} style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>
                {`${r.zip} ${r.pref}${r.city}${r.town}`}
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>
              前へ
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages}>
              次へ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
