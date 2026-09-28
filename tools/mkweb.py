import sys
frag=open('app/frag.html').read();js=open('app/corpus.js').read();histo=open('/home/claude/corpus/histo.js').read()
def page(importmap,cfg,full=False):
    body=frag+f'\n<script type="importmap">{importmap}</script>\n<script>{histo}</script>\n<script>window.CORPUS={cfg};</script>\n<script type="module">\n{js}\n</script>\n'
    if full: body='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+body+'</body></html>'
    return body
cdn='{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}'
local='{"imports":{"three":"./vendor/three/build/three.module.js","three/addons/":"./vendor/three/examples/jsm/"}}'
ver=sys.argv[1] if len(sys.argv)>1 else '1.0.0'
open('web/index.html','w').write(page(cdn,'{data:"data/",version:"Web '+ver+'"}'))
open('web/test.html','w').write(page(local,'{data:"data/",version:"Test"}',True))
