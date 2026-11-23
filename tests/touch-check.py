"""觸控操作檢查：輕點動物中心才戳、拖曳或點邊緣是放下、戳不了就當放下、拖出畫面取消放下、手機資訊面板。
用法：先 node scripts/serve.js，再 python3 tests/touch-check.py"""
import sys
from playwright.sync_api import sync_playwright

URL = 'http://localhost:3110/?skipcountdown'
fails = []
def check(name, ok, info=None):
    print(("✓ " if ok else "✗ ") + name + ("" if ok or info is None else "  " + str(info)))
    if not ok: fails.append(name)

def setup(pg):
    pg.goto(URL); pg.evaluate("localStorage.setItem('merge-zoo.tutorial','true')")
    pg.goto(URL); pg.wait_for_timeout(300)
    pg.evaluate("MZApp.go('play',{mode:'classic',world:'zoo',difficulty:'normal'})"); pg.wait_for_timeout(600)
    pg.evaluate("""(()=>{const g=MZPlay.current(),s=g.session;for(let i=0;i<500;i++){if(s.canDrop())s.drop(((i*37)%400)-200);s.step();}
      for(let i=0;i<240;i++)s.step(); s.energy=60; g.updateHud(true);
      // 記錄真的戳到幾次（戳完可能剛好合成又加能量，不能只看能量）
      window.__pokes=0; const orig=s.poke.bind(s); s.poke=(x,y)=>{const r=orig(x,y); if(r==='ok') window.__pokes++; return r;};})()""")

def animal_screen(pg, edge=0):
    # 最大的一隻動物在螢幕上的位置；edge=0.85 表示點在牠的邊緣
    return pg.evaluate("""(edge)=>{const g=MZPlay.current(),s=g.session,r=g.renderer,c=g.canvas.getBoundingClientRect();
      const b=s.animals().filter(b=>b.mz.kind==='animal'&&s.worldToLocal(b.position.x,b.position.y).y>s.lineY+40).sort((a,b)=>b.circleRadius-a.circleRadius)[0];
      return [c.left+r.ox+(b.position.x+b.circleRadius*edge)*r.scale, c.top+r.oy+b.position.y*r.scale]}""", edge)

def state(pg):
    return pg.evaluate("(()=>{const s=MZPlay.current().session;return {drops:s.stats.drops,energy:Math.round(s.energy),t:s.t,pokes:window.__pokes}})()")

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
    for (w, h, name) in [(390, 844, '手機直向'), (820, 1180, '平板直向'), (1180, 820, '平板橫向')]:
        print('--', name)
        pg = b.new_page(viewport={'width': w, 'height': h}, has_touch=True, is_mobile=w < 900)
        setup(pg)
        cdp = pg.context.new_cdp_session(pg)
        def ready():
            # 等到可以放下、戳一戳冷卻結束、而且動物大致停住，避免機器忙碌時誤判
            pg.wait_for_function("(()=>{const s=MZPlay.current().session;return s.canDrop()&&s.pokeCd<=0&&s.animals().every(b=>Math.hypot(b.velocity.x,b.velocity.y)<2)})()", timeout=8000)
        def tap(x, y, hold=0):
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
            if hold: pg.wait_for_timeout(hold)
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            pg.wait_for_timeout(450)
        ready(); x, y = animal_screen(pg)
        s0 = state(pg); tap(x, y); s1 = state(pg)
        check(name + '：輕點動物中心＝戳一戳（不放下）', s1['pokes'] == s0['pokes'] + 1 and s1['drops'] == s0['drops'], (s0, s1, x, y))
        ready(); x, y = animal_screen(pg, 0.85)
        s2 = state(pg); tap(x, y); s3 = state(pg)
        check(name + '：點在動物邊緣＝放下，不會誤戳', s3['drops'] == s2['drops'] + 1 and s3['pokes'] == s2['pokes'], (s2, s3))
        ready(); x, y = animal_screen(pg)
        s4 = state(pg); tap(x, y, hold=450); s5 = state(pg)
        check(name + '：按住動物比較久＝放下，不會誤戳', s5['drops'] == s4['drops'] + 1 and s5['pokes'] == s4['pokes'], (s4, s5))
        pg.wait_for_timeout(700)
        ready()
        x, y = animal_screen(pg)
        # 能量歸零後立刻點（不然剛好合成又會補能量）
        pg.evaluate("(()=>{const g=MZPlay.current();g.session.energy=0;g.updateHud(true)})()")
        s6 = state(pg); tap(x, y); s7 = state(pg)
        check(name + '：能量不夠時點動物＝直接放下', s7['drops'] == s6['drops'] + 1 and s7['pokes'] == s6['pokes'], (s6, s7, x, y))
        st = pg.query_selector('.stage').bounding_box()
        # 拖出遊戲區＝取消放下（用 CDP 觸控事件模擬拖曳）
        pg.wait_for_timeout(600)
        cx = st['x'] + st['width'] / 2; cy = st['y'] + st['height'] * 0.4
        s5 = state(pg)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': cx, 'y': cy}]})
        for k in range(1, 8):
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': cx, 'y': cy - (cy - st['y'] + 30) * k / 7}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        pg.wait_for_timeout(300)
        check(name + '：拖出遊戲區放開＝取消放下', state(pg)['drops'] == s5['drops'])
        if w < h:
            pg.click('.info-btn'); pg.wait_for_timeout(350)
            t0 = state(pg)['t']; pg.wait_for_timeout(500); t1 = state(pg)['t']
            check(name + '：資訊面板打開時遊戲暫停', t1 == t0 and pg.is_visible('.hud .hud-scorecard'))
            pg.click('.hud-backdrop', position={'x': w - 20, 'y': 200}); pg.wait_for_timeout(350)
            t2 = state(pg)['t']; pg.wait_for_timeout(400)
            check(name + '：點旁邊關閉面板、遊戲繼續', state(pg)['t'] > t2 and not pg.evaluate("MZPlay.current().infoOpen"))
            check(name + '：底部只留交換與道具', pg.is_visible('.dock .swap-btn') and pg.is_visible('.dock .items') and not pg.is_visible('.hud-scorecard'))
        pg.close()
    b.close()
print('失敗 %d 項' % len(fails))
sys.exit(1 if fails else 0)
