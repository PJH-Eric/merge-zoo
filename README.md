# 合成動物園（Merge Zoo）

把一樣的小動物碰在一起，合成更大隻！平板觸控優先的單機物理合成遊戲，手機、平板、桌機的直向與橫向都能玩。

- 八個世界：動物園（軟萌小彈）、海洋（慢慢沉、輕輕晃）、甜點（果凍 Q 彈）、太空（月球低重力）、冰原（滑溜溜）、叢林（黏黏的）、恐龍（沉重會震）、農場（彈彈草堆），每個世界各 10 級角色
- 五段難度：幼幼（不會輸）、簡單、普通、困難、神話
- 模式：經典無盡（自動存檔可續玩）、任務闖關 400 關、每日挑戰（台北時間切日＋當日特殊規則）
- 操作：拖曳放開放下、交換（S）、戳一戳（點箱子裡的動物）
- 道具：彩虹萬用球、炸彈貓、搖一搖；金色動物分數 ×2；冰凍塊、特殊箱子、旋轉箱子與機關只在闖關出現
- 動物圖鑑 80 張、成就 35 個、本機排行（模式 × 世界 × 難度）
- 繁體中文／简体中文／English、設定（音樂、音效、震動、減少動態、落點預告線、色彩輔助）、開局 3、2、1 倒數、結算分享圖片

規劃與所有規則決策見 [規劃書.md](規劃書.md)。

## 啟動

```bash
npm start          # http://localhost:3110（Windows 也可以直接點「啟動遊戲.bat」）
```

純前端、沒有執行期依賴；`public/` 直接放上任何靜態主機即可。

## 測試與工具

```bash
npm test               # 規則核心測試（合成、計分、連鎖、紅線、道具、冰塊、任務、旋轉、存檔、每日挑戰、400 關資料與抽樣通關）
npm run check:flow     # 完整流程巡檢：真的跑 3、2、1 倒數、暫停不偷跑、續玩、切換語言、闖關解鎖、每日紀錄、Esc 只關分享（需要 Python Playwright）
npm run check:ui       # 實際瀏覽器巡檢：各畫面 × 手機／平板／桌機直橫向 × 繁中／英文截圖與破版檢查（需要 Python Playwright）
npm run gen:levels     # 重新產生並校準 400 關（關卡產生器初稿 → 模擬玩家試玩 → 設定目標與星數 → 再驗證可通關）
npm run gen:hans       # 從繁中字典轉出簡中字典（需要 pip install opencc-python-reimplemented）
node scripts/art-sheet.js > tmp/art.html   # 80 隻角色對照表
```

## 專案結構

```
public/
  index.html, css/style.css
  js/core/      規則核心（與畫面分離，瀏覽器與 Node 共用）：engine.js、data.js、rng.js、daily.js、level-gen.js、level-data.js、levels.js
  js/art/       80 隻角色（animals.js＋animals-more.js）的手繪向量 SVG 產生器（不使用 emoji）
  js/ui/        kit.js 自繪元件（按鈕／開關／滑桿／捲軸／彈窗／選單）、render.js Canvas、play.js 遊戲畫面、screens.js 其他畫面、profile.js 存檔
  js/audio.js   Web Audio 程式合成的音效與 BGM（沒有外部音檔）
  js/locales/   zh-Hant.js、en.js（手寫）、zh-Hans.js（自動轉出）、result-share.js
scripts/        serve.js、gen-levels.js、gen-hans.py、inject-seo.js、art-sheet.js、lib/bot.js
tests/          verify.js、ui-check.py
```

## 部署（GitHub Pages）

推到 `main` 後由 `.github/workflows/pages.yml` 跑測試、執行 `scripts/inject-seo.js` 注入 GA4 與 SEO 標籤（設定在 `seo.config.json`），再把 `public/` 發佈到 GitHub Pages。單機遊戲不需要後端，也不需要 `GAME_SERVER_URL`。

目前只做本機 commit，尚未建立公開 repo、部署或整合 all-in-one。

## 第三方授權

- [Matter.js](https://github.com/liabru/matter-js) 0.20.0（MIT）：物理引擎，`public/js/vendor/matter.min.js`
- [html2canvas](https://html2canvas.hertzen.com/) 1.4.1（MIT）：結算分享圖片，按下分享時才載入
- 共用元件 `result-share.js`、`locales/result-share.js`、`analytics.js` 原樣沿用自同系列遊戲，請勿在單一遊戲內修改
- 角色、背景、音效與 BGM 都由程式產生，沒有外部素材授權問題
