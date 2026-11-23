"""實際瀏覽器巡檢：python3 tests/ui-check.py [輸出資料夾]
先在另一個視窗執行 npm start。逐一打開所有畫面與彈層，
在手機／平板／桌機的直向與橫向、繁中與英文各截一張圖，並檢查：
水平溢出、主要按鈕跑出可視範圍、按鈕文字被截斷、觸控區太小、主控台錯誤。
"""
import sys, os, json
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://localhost:3110/')
OUT = sys.argv[1] if len(sys.argv) > 1 else 'tmp/shots'
os.makedirs(OUT, exist_ok=True)
VIEWPORTS = {
    'phone-p': (390, 844), 'phone-l': (844, 390), 'tablet-p': (820, 1180),
    'tablet-l': (1180, 820), 'desktop': (1440, 900),
    'phone-s': (360, 740), 'phone-sl': (740, 360), 'tablet-mini': (768, 1024), 'desktop-s': (1280, 720),
}
ONLY = os.environ.get('ONLY')

CHECK_JS = r"""
() => {
  const problems = [];
  const vw = innerWidth, vh = innerHeight;
  if (document.documentElement.scrollWidth > vw + 1) problems.push('水平溢出 ' + document.documentElement.scrollWidth + '>' + vw);
  const layer = document.querySelector('.modal-scrim:last-child .modal, .result-share-dialog-layer:not([hidden]) .result-share-dialog');
  const scope = layer || document;
  scope.querySelectorAll('button, a.pill-btn, [role=slider], [role=switch]').forEach(el => {
    if (el.closest('[hidden]') || el.offsetParent === null) return;
    const inScroll = el.closest('.sa-view, .tabs, .hud');
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    const label = (el.getAttribute('aria-label') || el.textContent || el.className).trim().slice(0, 24);
    if (!inScroll && (r.right > vw + 1 || r.left < -1 || r.bottom > vh + 1 || r.top < -1)) problems.push('超出畫面：' + label);
    if (r.width < 40 || r.height < 40) problems.push('觸控區太小：' + label + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    el.querySelectorAll('.btn-label, .btn-sub').forEach(s => { if (s.scrollWidth > s.clientWidth + 2) problems.push('文字截斷：' + label); });
  });
  // 斷行：短標籤、按鈕、標題不該被擠成兩行（長段說明文字可以換行）
  const lineCount = (el) => {
    const range = document.createRange(); range.selectNodeContents(el);
    const tops = [];
    for (const r of range.getClientRects()) { if (r.width < 1) continue; if (!tops.some(t => Math.abs(t - r.top) < r.height * 0.5)) tops.push(r.top); }
    return tops.length;
  };
  const seen = new Set();
  (layer || document).querySelectorAll('button, .pill-btn, .btn-label, .btn-sub, h1, h2, h3, .chip, .tab, label, [class*="title"], [class*="label"], [class*="name"], .hud *').forEach(el => {
    if (el.closest('[hidden]') || el.offsetParent === null || el.querySelector('br')) return;
    if (el.children.length && [...el.children].some(c => getComputedStyle(c).display.startsWith('block') || getComputedStyle(c).display === 'flex' || getComputedStyle(c).display === 'grid')) return;
    const text = (el.innerText || '').trim();
    if (!text || /[\r\n]/.test(text)) return;
    const len = [...text].reduce((n, ch) => n + (/[ -~]/.test(ch) ? 0.55 : 1), 0);
    if (len > 14) return;
    const label = text.slice(0, 20);
    if (seen.has(label)) return;
    if (lineCount(el) > 1) { seen.add(label); problems.push('斷行：' + label); }
    const cs = getComputedStyle(el);
    if ((cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 2) { seen.add(label); problems.push('文字被裁切：' + label); }
  });
  document.querySelectorAll('.sa-view').forEach(v => {
    const bar = v.parentElement.querySelector('.sa-bar');
    if (v.scrollHeight > v.clientHeight + 2 && bar && bar.classList.contains('hidden')) problems.push('可捲動但沒有自繪捲軸');
  });
  return problems;
}
"""


def main():
    report = {}
    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch(**({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}))
        for lang in ['zh-Hant', 'zh-Hans', 'en']:
            for vname, (w, h) in VIEWPORTS.items():
                if ONLY and not (vname in ONLY.split(',') if ',' in ONLY or ONLY in VIEWPORTS else ONLY in vname):
                    continue
                ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=vname.startswith(('phone', 'tablet')))
                pg = ctx.new_page()
                pg.on('pageerror', lambda e: errors.append(str(e)))
                pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' and '404' not in m.text else None)
                pg.goto(BASE + '?skipcountdown')
                pg.evaluate("""(lang) => { localStorage.clear(); localStorage.setItem('merge-zoo.lang', JSON.stringify(lang));
                  localStorage.setItem('merge-zoo.tutorial', 'true');
                  localStorage.setItem('merge-zoo.codex', JSON.stringify(['zoo-1','zoo-2','zoo-3','zoo-4','ocean-1']));
                  localStorage.setItem('merge-zoo.achv', JSON.stringify({first_merge: 1, combo3: 1}));
                  localStorage.setItem('merge-zoo.levels', JSON.stringify({'zoo-1': 3, 'zoo-2': 2, 'zoo-3': 1}));
                  localStorage.setItem('merge-zoo.ranks', JSON.stringify({'classic|zoo|normal': [{score: 12450, at: Date.now(), max: 8}, {score: 3200, at: Date.now(), max: 6}]}));
                }""", lang)
                pg.goto(BASE + '?skipcountdown')
                pg.wait_for_timeout(500)

                def shot(name, settle=350):
                    pg.wait_for_timeout(settle)
                    key = f'{lang}_{vname}_{name}'
                    pg.screenshot(path=f'{OUT}/{key}.png')
                    probs = pg.evaluate(CHECK_JS)
                    if probs:
                        report[key] = probs

                def go(js):
                    pg.evaluate(js)

                def close_modal():
                    pg.keyboard.press('Escape')
                    pg.wait_for_timeout(200)

                shot('home')
                pg.click('#btn-settings'); shot('settings'); close_modal()
                pg.click('#btn-lang'); shot('lang'); close_modal()
                go("MZScreens.howto()"); shot('howto'); close_modal()
                go("MZApp.go('setup', {mode: 'classic'})"); shot('setup-classic')
                go("MZApp.go('setup', {mode: 'daily'})"); shot('setup-daily')
                go("MZApp.go('levels')"); shot('levels')
                go("MZScreens.levelInfo(MZLevels.get('zoo', 3), MZApp)"); shot('level-info'); close_modal()
                go("MZApp.go('codex')"); shot('codex')
                go("MZScreens.codexCard('zoo', 4)"); shot('codex-card'); close_modal()
                go("MZApp.go('achv')"); shot('achv')
                go("MZApp.go('rank')"); shot('rank')
                # 經典對局
                go("MZApp.go('play', {mode: 'classic', world: 'zoo', difficulty: 'normal'})")
                pg.wait_for_timeout(900)
                go("""(() => { const g = MZPlay.current(), s = g.session; for (let i = 0; i < 900; i++) { if (s.canDrop()) s.drop(((i * 37) % 300) - 150); s.step(); } g.updateHud(true); })()""")
                shot('play-classic', 500)
                pg.click('#btn-pause'); shot('pause'); close_modal()
                pg.wait_for_timeout(300)
                go("(() => { const s = MZPlay.current().session; s.items = ['rainbow','bomb']; s.armItem(0); MZPlay.current().updateHud(true); })()")
                shot('play-armed')
                go("MZPlay.current().session.finish('lose', 'line')")
                shot('result-classic', 1300)
                share = pg.query_selector('.result-share-trigger')
                if share:
                    share.click(); pg.wait_for_timeout(2500); shot('share', 200)
                    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
                    if not pg.query_selector('.result-modal'):
                        report[f'{lang}_{vname}_share'] = report.get(f'{lang}_{vname}_share', []) + ['Esc 連結算一起關掉了']
                # 闖關：旋轉＋特殊箱子、機關、冰塊
                for lid in [('sweets', 26), ('space', 1), ('ocean', 1), ('polar', 1), ('jungle', 1), ('dino', 1), ('farm', 1)]:
                    go(f"MZApp.go('play', {{mode: 'level', level: MZLevels.get('{lid[0]}', {lid[1]})}})")
                    pg.wait_for_timeout(400)
                    if pg.query_selector('.intro-modal'):
                        shot(f'intro-{lid[0]}')
                        pg.click('.intro-modal .modal-actions .btn')
                    pg.wait_for_timeout(500)
                    go("""(() => { const g = MZPlay.current(), s = g.session; for (let i = 0; i < 400; i++) { if (s.canDrop()) s.drop(((i * 53) % 300) - 150); s.step(); } g.updateHud(true); })()""")
                    shot(f'play-{lid[0]}{lid[1]}', 400)
                go("MZPlay.current().session.finish('win', 'goal')"); shot('result-level', 1300)
                # 幼幼班（結束這局）與教學
                go("MZApp.go('play', {mode: 'classic', world: 'space', difficulty: 'kids'})"); shot('play-kids', 900)
                go("MZApp.go('play', {mode: 'tutorial', world: 'zoo', difficulty: 'kids'})"); shot('tutorial', 600)
                go("MZApp.go('home')")
                ctx.close()
        b.close()
    print(json.dumps(report, ensure_ascii=False, indent=1))
    print('主控台錯誤：', errors[:10])
    print('問題畫面數：', len(report))
    return 1 if report or errors else 0


if __name__ == '__main__':
    sys.exit(main())
