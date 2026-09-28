import json,sys,shutil,os
frag=open('/home/claude/body/app/frag.html').read();js=open('/home/claude/body/app/corpus.js').read();histo=open('/home/claude/corpus/histo.js').read()
D='/home/claude/desk/corpus-desktop'
ver=json.load(open(D+'/package.json'))['version']
frag=frag.replace('<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n','')
import re
frag=re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>','<link rel="stylesheet" href="fonts.css">',frag)
upd='''<script>
if(window.corpusDesktop){(function(){const D=window.corpusDesktop;if(D.platform)document.documentElement.classList.add(D.platform);const box=document.createElement('div');box.className='upd';box.hidden=true;document.body.appendChild(box);
 D.version().then(v=>{const l=document.getElementById('verLbl');if(l)l.textContent='v'+v;});
 D.onUpdate(s=>{let h='';
  if(s.status==='downloading')h=`<b>Downloading update${s.version?' '+s.version:''}…</b><span>${s.percent||0}% · you can keep working</span>`;
  else if(s.status==='ready')h=`<b>Corpus ${s.version} is ready</b><span>Restart to finish updating. It will also install the next time you quit.</span><div class="acts"><button class="btn" id="updLater">Later</button><button class="btn" id="updNow">Restart now</button></div>`;
  else if(s.status==='manual')h=`<b>Corpus ${s.version} is available</b><span>This build can't install updates by itself. Download the new version to replace it.</span><div class="acts"><button class="btn" id="updLater">Later</button><button class="btn" id="updGet">Download</button></div>`;
  box.innerHTML=h;box.hidden=!h;
  const n=document.getElementById('updNow');if(n)n.onclick=()=>D.installUpdate();const g=document.getElementById('updGet');if(g)g.onclick=()=>D.openDownload();const l=document.getElementById('updLater');if(l)l.onclick=()=>{box.hidden=true;};});
})();}
</script>'''
imp='{"imports":{"three":"./vendor/three/build/three.module.js","three/addons/":"./vendor/three/examples/jsm/"}}'
body=frag+f'\n<script type="importmap">{imp}</script>\n<script>{histo}</script>\n<script>window.CORPUS={{data:"data/",version:"v{ver}"}};</script>\n{upd}\n<script type="module">\n{js}\n</script>\n'
html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'self\' corpus:; script-src \'self\' \'unsafe-inline\' corpus:; style-src \'self\' \'unsafe-inline\' corpus:; img-src \'self\' data: blob: corpus:; connect-src \'self\' corpus:; font-src \'self\' corpus:"></head><body>'+body+'</body></html>'
open(D+'/app/index.html','w').write(html)
os.makedirs(D+'/app/data',exist_ok=True)
for f in os.listdir('/home/claude/body/web/data'): shutil.copy('/home/claude/body/web/data/'+f,D+'/app/data/'+f)
print('desktop page',len(html),'version',ver)
