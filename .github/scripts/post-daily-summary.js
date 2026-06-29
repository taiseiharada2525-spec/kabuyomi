// 毎朝Xに日本株サマリーを投稿するスクリプト
// GitHub Actions から呼ばれる（環境変数にX APIキーが必要）

const { TwitterApi } = require('twitter-api-v2');

const client = new TwitterApi({
  appKey: process.env.X_API_KEY,
  appSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_SECRET,
});

// 注目テーマのローテーション（曜日別）
const THEMES = {
  1: { label: '月曜：半導体週', picks: ['東京エレクトロン(8035)', 'HOYA(7741)', 'キーエンス(6861)'], reason: '先週の米国半導体株高を受けた出遅れ買い期待' },
  2: { label: '火曜：自動車・EV', picks: ['トヨタ(7203)', 'デンソー(6902)', '日本電産(6594)'], reason: 'EV化対応の進捗と受注動向に注目' },
  3: { label: '水曜：金融・高配当', picks: ['三菱UFJ(8306)', '三井住友(8316)', 'みずほ(8411)'], reason: '金利上昇局面での業績改善期待' },
  4: { label: '木曜：テック・成長株', picks: ['ソニーG(6758)', 'リクルートHD(6098)', 'ソフトバンクG(9984)'], reason: 'AI関連の収益貢献度が拡大中' },
  5: { label: '金曜：週末リバランス', picks: ['ファーストリテイリング(9983)', 'オリエンタルランド(4661)', '任天堂(7974)'], reason: '消費関連・内需株への資金流入タイミング' },
};

function getJSTDate() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst;
}

function buildTweet() {
  const jst = getJSTDate();
  const dow = jst.getDay(); // 0=日, 1=月 ... 5=金
  const theme = THEMES[dow] || THEMES[1];
  const dateStr = `${jst.getMonth() + 1}/${jst.getDate()}`;

  const tweet = [
    `📊【${dateStr} 朝の日本株チェック】`,
    ``,
    `🔍 ${theme.label}`,
    ``,
    `今日の注目銘柄:`,
    ...theme.picks.map(p => `・${p}`),
    ``,
    `💡 ${theme.reason}`,
    ``,
    `詳細ニュースは #カブヨミ で👇`,
    `https://kabuyomi.vercel.app/`,
    ``,
    `#日本株 #株式投資 #個人投資家 #株`,
  ].join('\n');

  return tweet;
}

async function main() {
  try {
    const tweet = buildTweet();
    console.log('投稿内容:\n', tweet);
    console.log('\n文字数:', tweet.length);

    const rwClient = client.readWrite;
    const { data } = await rwClient.v2.tweet(tweet);
    console.log('✅ 投稿成功! Tweet ID:', data.id);
  } catch (err) {
    console.error('❌ 投稿失敗:', err.message);
    process.exit(1);
  }
}

main();
