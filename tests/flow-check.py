"""完整流程巡檢（真的跑 3、2、1 倒數與真實點擊）：python3 tests/flow-check.py
先執行 npm start。檢查：首次經典先走教學、倒數中不能放下且不計時、暫停不偷跑、
繼續會重新倒數、結算後再來一局、經典存檔續玩、中途切換語言不中斷、闖關過關解鎖下一關、每日挑戰紀錄。
"""
import os, sys
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:3110/')
fails = []
def check(cond, msg):
    print(('✓ ' if cond else '✗ ') + msg)
    if not cond: fails.append(msg)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'))
    pg = b.new_page(viewport={'width': 1180, 'height': 820})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.evaluate('localStorage.clear()'); pg.goto(BASE); pg.wait_for_timeout(400)
    S = lambda js: pg.evaluate(js)
    # 首次經典：先教學
    pg.click('.mode-classic'); pg.click('.big-go'); pg.wait_for_timeout(500)
    check(S("MZPlay.current().session.mode") == 'tutorial', '第一次按經典會先進教學第 0 關')
    box = pg.locator('.stage').bounding_box()
    cx, cy = box['x'] + box['width'] / 2, box['y'] + 80
    pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx + 30, cy); pg.mouse.up(); pg.wait_for_timeout(300)
    check(S("MZPlay.current().session.stats.drops") == 1, '教學中拖曳放開可以放下')
    pg.click('.tut-actions .btn'); pg.wait_for_timeout(300)
    check(S("MZApp.screen") == 'setup', '跳過教學回到經典設定')
    # 正式經典：真的倒數
    pg.click('.big-go'); pg.wait_for_timeout(300)
    check(pg.is_visible('.countdown') and pg.inner_text('.count-num') == '3', '倒數遮罩出現並顯示 3')
    pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.up(); pg.keyboard.press('Space')
    check(S("MZPlay.current().session.stats.drops") == 0 and S("MZPlay.current().session.t") == 0, '倒數中點擊與空白鍵都無效且沒有計時')
    pg.wait_for_timeout(1000)
    check(pg.inner_text('.count-num') == '2', '一秒後換 2')
    pg.wait_for_timeout(2300)
    check(S("MZPlay.current().session.state") == 'playing', '倒數結束後開始')
    pg.wait_for_timeout(700)
    check(not pg.is_visible('.countdown'), '「開始！」之後遮罩消失')
    for i in range(6):
        pg.mouse.move(cx - 100 + i * 40, cy); pg.mouse.down(); pg.mouse.up(); pg.wait_for_timeout(600)
    check(S("MZPlay.current().session.stats.drops") >= 5, '開始後可以連續放下（冷卻 0.5 秒）')
    # 暫停不偷跑
    t0 = S("MZPlay.current().session.t")
    pg.click('#btn-pause'); pg.wait_for_timeout(3200)
    check(abs(S("MZPlay.current().session.t") - t0) < 0.05, '暫停超過 3 秒時間沒有偷跑')
    pg.click('.pause-actions .btn-primary'); pg.wait_for_timeout(300)
    check(pg.is_visible('.countdown') and pg.inner_text('.count-num') == '3', '繼續後從 3 重新倒數')
    pg.wait_for_timeout(3800)
    # 語言切換不中斷
    drops = S("MZPlay.current().session.stats.drops")
    pg.click('#btn-lang'); pg.click('.menu-item:has-text("English")'); pg.wait_for_timeout(300)
    check(S("MZPlay.current().session.stats.drops") == drops and S("MZPlay.current().session.state") == 'playing', '遊戲中切換語言不中斷對局')
    check('Score' in pg.inner_text('.hud'), '切換後 HUD 變成英文')
    # 存檔續玩
    score = S("MZPlay.current().session.score")
    pg.click('#btn-pause'); pg.click('.pause-actions .btn:has-text("Home")'); pg.wait_for_timeout(400)
    check(pg.is_visible('.continue'), '回首頁後出現「繼續上一局」')
    pg.click('.continue'); pg.wait_for_timeout(300)
    check(S("MZPlay.current().session.score") == score and S("MZPlay.current().session.stats.drops") == drops, '續玩還原分數與進度')
    pg.wait_for_timeout(3800)
    # 結算與再來一局
    S("MZPlay.current().session.finish('lose', 'line')"); pg.wait_for_timeout(1200)
    check(pg.is_visible('.result-modal') and pg.is_visible('.stage-canvas'), '結算疊在遊戲畫面上（盤面沒有卸載）')
    check(pg.locator('.result-modal .modal-actions .btn').count() == 2, '經典結算有「再來一局」「回到首頁」')
    check(pg.is_visible('.result-share-trigger'), '結算卡有「分享結果」')
    check(S("Profile.save()") is None, '對局結束後清掉經典存檔')
    pg.click('.result-modal .btn-primary'); pg.wait_for_timeout(300)
    check(S("MZPlay.current().session.state") == 'ready' and pg.is_visible('.countdown'), '再來一局會重新倒數')
    pg.wait_for_timeout(3800)
    # 闖關：過關後下一關解鎖
    S("MZApp.go('play', {mode: 'level', level: MZLevels.get('zoo', 1)})"); pg.wait_for_timeout(3800)
    S("MZPlay.current().session.score = 99999; MZPlay.current().session.step()"); pg.wait_for_timeout(1300)
    check(S("Profile.levelStars('zoo-1')") == 3, '闖關過關記錄 3 星')
    check(pg.is_visible('.result-modal .btn:has-text("Next level")'), '過關後可以按「下一關」')
    pg.click('.result-modal .btn:has-text("Next level")'); pg.wait_for_timeout(500)
    check(S("MZPlay.current().session.level.id") == 'zoo-2', '進入第 2 關')
    pg.wait_for_timeout(3600)
    S("MZPlay.current().session.finish('lose', 'line')"); pg.wait_for_timeout(1300)
    check(pg.is_visible('.result-modal .btn:has-text("Try again")') and S("Profile.levelStars('zoo-2')") == 0, '失敗不記星，可以再試一次')
    # 每日挑戰
    S("MZApp.go('setup', {mode: 'daily'})"); pg.wait_for_timeout(300)
    pg.click('.big-go'); pg.wait_for_timeout(3800)
    rule = S("MZPlay.current().session.rule")
    S("MZPlay.current().session.score = 1234; MZPlay.current().session.finish('lose','line')"); pg.wait_for_timeout(1300)
    check(S("Profile.dailyBest(MZDaily.taipeiDate(), 'normal')") == 1234, '每日挑戰記錄當天最佳（規則：' + rule + '）')
    check(S("Profile.streak()") == 1, '連續天數 1')
    # Esc 只關分享
    pg.click('.result-share-trigger'); pg.wait_for_timeout(2500)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    check(pg.is_visible('.result-modal'), 'Esc 只關分享視窗，結算還在')
    check(not errs, '沒有 JavaScript 錯誤 ' + ' '.join(errs[:3]))
    b.close()
print('失敗 %d 項' % len(fails))
sys.exit(1 if fails else 0)
