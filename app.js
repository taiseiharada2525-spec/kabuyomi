// ============================================================
// app.js — カブヨミ（iPhone向けPWA）メインロジック
// ============================================================

const STORAGE_KEY = "jstock.watchlist.v1";

const state = {
  watchlist: loadWatchlist(),
  news: [],
  indices: [],
  view: "news",        // news | mine | stocks | market
  category: "all",     // ニュース画面のカテゴリ
  query: "",           // 銘柄検索ワード
};

const VIEW_TITLE = { news: "最新ニュース", mine: "マイニュース", stocks: "銘柄登録", market: "市場概況" };

// ---------- localStorage ----------
function loadWatchlist() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveWatchlist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.watchlist));
}

// ---------- ユーティリティ ----------
const stockByCode = (code) => STOCK_MASTER.find((s) => s.code === code);
const isWatched = (code) => state.watchlist.includes(code);

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
}
const sentimentLabel = { positive: "強気", negative: "弱気", neutral: "中立" };

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ニュースが指定銘柄に関連するか（コード一致 or キーワード一致）
function newsMatchesStock(news, code) {
  if (news.relatedCodes.includes(code)) return true;
  const stock = stockByCode(code);
  if (!stock) return false;
  const hay = (news.title + news.summary).toLowerCase();
  return stock.keywords.some((k) => hay.includes(k.toLowerCase()));
}
function newsCountForCode(code) {
  return state.news.filter((n) => newsMatchesStock(n, code)).length;
}
function mineNews() {
  return state.news
    .filter((n) => state.watchlist.some((code) => newsMatchesStock(n, code)))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

// ---------- ウォッチリスト操作 ----------
function addStock(code) {
  if (!isWatched(code)) {
    state.watchlist.push(code);
    saveWatchlist();
    const s = stockByCode(code);
    toast(`⭐ ${s ? s.name : code} を登録しました`);
    render();
  }
}
function removeStock(code) {
  state.watchlist = state.watchlist.filter((c) => c !== code);
  saveWatchlist();
  const s = stockByCode(code);
  toast(`${s ? s.name : code} を削除しました`);
  render();
}
function toggleStock(code) { isWatched(code) ? removeStock(code) : addStock(code); }

// ---------- 共通パーツ ----------
function newsCardHtml(n) {
  const tags = n.relatedCodes.map((code) => {
    const s = stockByCode(code);
    return s ? `<span class="stock-tag ${isWatched(code) ? "watched" : ""}">${s.name}</span>` : "";
  }).join("");
  return `<article class="news-card" data-news="${n.id}">
    <div class="cat-row">
      <span class="chip cat">${n.category}</span>
      <span class="chip sentiment-${n.sentiment}">${sentimentLabel[n.sentiment]}</span>
      <span>${escapeHtml(n.source)}</span><span>・ ${timeAgo(n.publishedAt)}</span>
    </div>
    <h3>${escapeHtml(n.title)}</h3>
    <p>${escapeHtml(n.summary)}</p>
    ${tags ? `<div class="tags">${tags}</div>` : ""}
  </article>`;
}

// ---------- 各ビューの描画 ----------
function renderNewsView() {
  let list = [...state.news];
  if (state.category !== "all") list = list.filter((n) => n.category === state.category);
  list.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  if (list.length === 0) return `<div class="empty"><div class="big">📭</div>ニュースがありません</div>`;
  return `<div class="news-list">${list.map(newsCardHtml).join("")}</div>`;
}

function renderMineView() {
  if (state.watchlist.length === 0) {
    return `<div class="empty">
      <div class="big">⭐</div>
      まだ銘柄が登録されていません。<br>気になる銘柄を登録すると、関連ニュースがここに集まります。
      <br><button class="cta" data-goto="stocks">銘柄を登録する</button>
    </div>`;
  }
  const list = mineNews();
  const head = `<div class="sec-title">登録 ${state.watchlist.length} 銘柄 ・ 関連ニュース ${list.length} 件</div>`;
  if (list.length === 0)
    return head + `<div class="empty"><div class="big">🔍</div>登録銘柄に関連する新着ニュースはまだありません</div>`;
  return head + `<div class="news-list">${list.map(newsCardHtml).join("")}</div>`;
}

function renderStocksView() {
  // 検索 or サジェスト
  let suggestHtml = "";
  const q = state.query.trim();
  if (q) {
    const ql = q.toLowerCase();
    const matches = STOCK_MASTER.filter((s) =>
      s.name.toLowerCase().includes(ql) || s.code.includes(q) ||
      s.keywords.some((k) => k.toLowerCase().includes(ql))).slice(0, 12);
    suggestHtml = matches.length
      ? `<div class="suggest-list">${matches.map((s) => `
          <div class="suggest-item">
            <span class="code">${s.code}</span>
            <div class="row-main"><div class="nmline"><span class="name">${s.name}</span></div>
              <span class="sector">${s.sector}</span></div>
            <button class="${isWatched(s.code) ? "add-btn added" : "add-btn"}" data-add="${s.code}">
              ${isWatched(s.code) ? "登録済" : "＋ 登録"}</button>
          </div>`).join("")}</div>`
      : `<div class="empty">「${escapeHtml(q)}」に一致する銘柄がありません</div>`;
  }

  // 登録済みリスト
  let listHtml;
  if (state.watchlist.length === 0) {
    listHtml = `<div class="empty"><div class="big">🔍</div>銘柄名・コードで検索して、<br>マイ銘柄に登録しましょう。<br><span style="font-size:12px">例: トヨタ / 7203 / 半導体</span></div>`;
  } else {
    listHtml = `<div class="suggest-list">${state.watchlist.map((code) => {
      const s = stockByCode(code); if (!s) return "";
      return `<div class="stock-row">
        <span class="code">${s.code}</span>
        <div class="row-main"><div class="nmline"><span class="name">${s.name}</span>
          <span class="count-badge">ニュース ${newsCountForCode(code)}</span></div>
          <span class="sector">${s.sector}</span></div>
        <button class="del-btn" data-del="${code}">削除</button>
      </div>`;
    }).join("")}</div>`;
  }

  return `<div class="search-wrap">
      <input id="stockSearch" class="search-input" type="search" inputmode="search"
        placeholder="銘柄名・コード・キーワードで検索" value="${escapeHtml(state.query)}" autocomplete="off" />
    </div>
    ${q ? suggestHtml : `<div class="sec-title">⭐ マイ銘柄（${state.watchlist.length}）</div>${listHtml}`}`;
}

function renderMarketView() {
  const cards = state.indices.map((i) => {
    const dir = i.change >= 0 ? "up" : "down";
    const sign = i.change >= 0 ? "+" : "";
    return `<div class="index-card">
      <div class="nm">${i.name}</div>
      <div class="val">${i.value.toLocaleString("ja-JP", { minimumFractionDigits: 2 })}</div>
      <div class="chg ${dir}">${sign}${i.change.toLocaleString("ja-JP", { minimumFractionDigits: 2 })} (${sign}${i.changePct}%)</div>
    </div>`;
  }).join("");

  // 業種別ニュース件数ランキング
  const bySector = {};
  state.news.forEach((n) => n.relatedCodes.forEach((c) => {
    const s = stockByCode(c); if (s) bySector[s.sector] = (bySector[s.sector] || 0) + 1;
  }));
  const ranking = Object.entries(bySector).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = ranking.length ? ranking[0][1] : 1;
  const bars = ranking.map(([sec, cnt]) => `
    <div class="sector-row">
      <span class="lbl">${sec}</span>
      <span class="bar-bg"><span class="bar" style="width:${(cnt / max) * 100}%"></span></span>
      <span class="num">${cnt}</span>
    </div>`).join("");

  return `<div class="index-grid">${cards}</div>
    <div class="sec-title" style="margin-top:16px">🔥 注目セクター（関連ニュース件数）</div>
    <div class="sector-bar-wrap">${bars}</div>`;
}

// ---------- ヘッダー（ティッカー / チップ）----------
function renderTicker() {
  document.getElementById("ticker").innerHTML = state.indices.map((i) => {
    const dir = i.change >= 0 ? "up" : "down";
    const sign = i.change >= 0 ? "+" : "";
    return `<div class="tk"><div class="nm">${i.name}</div>
      <div class="val">${i.value.toLocaleString("ja-JP")}</div>
      <div class="chg ${dir}">${sign}${i.changePct}%</div></div>`;
  }).join("");
}
function renderChips() {
  const el = document.getElementById("chips");
  if (state.view !== "news") { el.innerHTML = ""; return; }
  const cats = ["all", ...new Set(state.news.map((n) => n.category))];
  const label = (c) => (c === "all" ? "すべて" : c);
  el.innerHTML = cats.map((c) =>
    `<button class="chip-btn ${state.category === c ? "active" : ""}" data-chip="${c}">${label(c)}</button>`
  ).join("");
}

// ---------- ルート描画 ----------
function render() {
  document.getElementById("viewTitle").textContent = VIEW_TITLE[state.view];

  // タブのactive
  document.querySelectorAll(".tab-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === state.view));

  // マイバッジ
  const badge = document.getElementById("mineBadge");
  const mc = mineNews().length;
  if (state.watchlist.length && mc) { badge.hidden = false; badge.textContent = mc; }
  else badge.hidden = true;

  renderTicker();
  renderChips();

  const screen = document.getElementById("screen");
  if (state.view === "news") screen.innerHTML = renderNewsView();
  else if (state.view === "mine") screen.innerHTML = renderMineView();
  else if (state.view === "stocks") screen.innerHTML = renderStocksView();
  else if (state.view === "market") screen.innerHTML = renderMarketView();

  // 銘柄検索のフォーカス維持
  if (state.view === "stocks") {
    const inp = document.getElementById("stockSearch");
    if (inp && document.activeElement !== inp && state.query) {
      // 値は value属性で反映済み
    }
  }
}

// ---------- ボトムシート ----------
function openSheet(newsId) {
  const n = state.news.find((x) => x.id === newsId);
  if (!n) return;
  const rel = n.relatedCodes.map((code) => {
    const s = stockByCode(code); if (!s) return "";
    return `<div class="stock-row">
      <span class="code">${s.code}</span>
      <div class="row-main"><div class="nmline"><span class="name">${s.name}</span></div>
        <span class="sector">${s.sector}</span></div>
      <button class="${isWatched(code) ? "add-btn added" : "add-btn"}" data-add="${code}">
        ${isWatched(code) ? "登録済" : "＋ 登録"}</button>
    </div>`;
  }).join("");
  document.getElementById("sheetBody").innerHTML = `
    <div class="meta">
      <span class="chip cat">${n.category}</span>
      <span class="chip sentiment-${n.sentiment}">${sentimentLabel[n.sentiment]}</span>
      <span>${escapeHtml(n.source)}</span><span>・ ${timeAgo(n.publishedAt)}</span>
    </div>
    <h2>${escapeHtml(n.title)}</h2>
    <p class="lead">${escapeHtml(n.summary)}</p>
    ${rel ? `<div class="rel-title">関連銘柄</div><div class="suggest-list">${rel}</div>` : ""}`;
  document.getElementById("sheetBackdrop").hidden = false;
}
function closeSheet() { document.getElementById("sheetBackdrop").hidden = true; }

// ---------- トースト ----------
let toastTimer;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 1800);
}

// ---------- イベント ----------
function bindEvents() {
  // 下タブ
  document.getElementById("tabbar").addEventListener("click", (e) => {
    const b = e.target.closest(".tab-btn"); if (!b) return;
    state.view = b.dataset.view;
    state.query = "";
    window.scrollTo({ top: 0 });
    render();
  });

  // 画面内クリック（委譲）
  document.getElementById("screen").addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) { e.stopPropagation(); addStock(add.dataset.add); return; }
    const del = e.target.closest("[data-del]");
    if (del) { removeStock(del.dataset.del); return; }
    const goto = e.target.closest("[data-goto]");
    if (goto) { state.view = goto.dataset.goto; render(); return; }
    const card = e.target.closest("[data-news]");
    if (card) { openSheet(card.dataset.news); return; }
  });

  // 銘柄検索（委譲: input）
  document.getElementById("screen").addEventListener("input", (e) => {
    if (e.target.id === "stockSearch") {
      state.query = e.target.value;
      // 入力中はリストだけ差し替え（フォーカス維持のため screen 全体は再描画しない）
      const inp = e.target;
      const sel = inp.selectionStart;
      render();
      const again = document.getElementById("stockSearch");
      if (again) { again.focus(); try { again.setSelectionRange(sel, sel); } catch {} }
    }
  });

  // カテゴリチップ
  document.getElementById("chips").addEventListener("click", (e) => {
    const c = e.target.closest("[data-chip]"); if (!c) return;
    state.category = c.dataset.chip;
    render();
  });

  // 詳細シート内クリック（関連銘柄の登録）
  document.getElementById("sheetBody").addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) { addStock(add.dataset.add); openSheet(currentSheetId); }
  });
  document.getElementById("sheetBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "sheetBackdrop") closeSheet();
  });

  // 更新ボタン（再取得アニメーション）
  document.getElementById("refreshBtn").addEventListener("click", async (e) => {
    e.currentTarget.classList.add("spin");
    state.news = await fetchNews();
    state.indices = await fetchIndices();
    render();
    toast("最新の情報に更新しました");
    setTimeout(() => e.currentTarget.classList.remove("spin"), 600);
  });
}

// openSheet の対象を覚えておく（関連銘柄登録後の再描画用）
let currentSheetId = null;
const _openSheet = openSheet;
openSheet = function (id) { currentSheetId = id; _openSheet(id); };

// ---------- 初期化 ----------
async function init() {
  state.news = await fetchNews();
  state.indices = await fetchIndices();
  bindEvents();
  render();

  // Service Worker 登録（オフライン対応）
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
document.addEventListener("DOMContentLoaded", init);
