"""從繁中字典轉出簡中字典：python3 scripts/gen-hans.py
需要：pip install opencc-python-reimplemented
"""
import pathlib
from opencc import OpenCC

root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'public/js/locales/zh-Hant.js').read_text(encoding='utf-8')
cc = OpenCC('t2s')
out = cc.convert(src)
out = out.replace("I18N.add('zh-Hant'", "I18N.add('zh-Hans'", 1)
out = out.replace('/* ===== 繁体中文字典（主语系；简中由 scripts/gen-hans.py 转出）===== */',
                  '/* ===== 简体中文字典：由 scripts/gen-hans.py 从繁中自动转出，请勿手改 ===== */')
# 语言名称保持原样
out = out.replace("'lang.zh-Hant': '繁体中文'", "'lang.zh-Hant': '繁體中文'")
(root / 'public/js/locales/zh-Hans.js').write_text(out, encoding='utf-8')
print('zh-Hans.js 已更新')
