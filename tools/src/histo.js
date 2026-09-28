/* ============ procedural histology ============ */
function RNG(seed){let s=(seed%2147483646)+1;return()=>(s=s*16807%2147483647)/2147483647;}
const TAU=Math.PI*2;
function ell(g,x,y,rx,ry,rot,fill){g.beginPath();g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rot||0,0,TAU);g.fillStyle=fill;g.fill();}
function circ(g,x,y,r,fill,stroke,lw){g.beginPath();g.arc(x,y,Math.max(.1,r),0,TAU);if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw||1;g.stroke();}}
const HEM='#4a2a7a',HEM2='#5b3590';

const HISTO={
bone:{t:'Compact bone',stain:'Ground section',mag:'×100',scale:'100 µm',
 feat:['Osteons (Haversian systems)','Central canal with vessels','Concentric lamellae','Osteocytes in lacunae','Canaliculi','Cement lines'],
 d:'Cortical bone is built from osteons: rings of mineralised collagen around a central canal that carries vessels and nerves. Osteocytes sit in lacunae and communicate through fine canaliculi.',
 draw(g,w,h,u,r){g.fillStyle='#d6c7b4';g.fillRect(0,0,w,h);
  g.strokeStyle='rgba(170,150,125,.55)';g.lineWidth=1.4*u;for(let i=0;i<40;i++){g.beginPath();const x=r()*w,y=r()*h;g.arc(x,y,40*u+r()*80*u,r()*6,r()*6+1.2);g.stroke();}
  const sp=108*u;for(let y=-sp*.3;y<h+sp;y+=sp*.86)for(let x=-sp*.3+((y/sp|0)%2)*sp*.5;x<w+sp;x+=sp){
   const cx=x+(r()-.5)*30*u,cy=y+(r()-.5)*30*u,R=(42+r()*16)*u;
   circ(g,cx,cy,R,'#e4d7c6');
   for(let rr=9*u;rr<R;rr+=4.6*u){circ(g,cx,cy,rr,null,(rr/u|0)%2?'#cdbba4':'#eee3d4',2*u);}
   circ(g,cx,cy,R,null,'#9c8467',1.6*u);
   for(let rr=13*u;rr<R-3*u;rr+=8.5*u){const n=Math.floor(TAU*rr/(15*u));for(let k=0;k<n;k++){if(r()<.35)continue;const a=k/n*TAU+r()*.3;const lx=cx+Math.cos(a)*rr,ly=cy+Math.sin(a)*rr;
     g.strokeStyle='rgba(70,55,40,.55)';g.lineWidth=.5*u;g.beginPath();g.moveTo(lx-Math.cos(a)*4*u,ly-Math.sin(a)*4*u);g.lineTo(lx+Math.cos(a)*4*u,ly+Math.sin(a)*4*u);g.stroke();
     ell(g,lx,ly,3.4*u,1.4*u,a+Math.PI/2,'#44352a');}}
   circ(g,cx,cy,7.5*u,'#5a4535');circ(g,cx,cy,5*u,'#2e231b');}}},
skm:{t:'Skeletal muscle',stain:'H&E, longitudinal',mag:'×400',scale:'25 µm',
 feat:['Cross-striations (A and I bands)','Many flattened peripheral nuclei','Long multinucleate fibres','Endomysium between fibres'],
 d:'Each fibre is a single multinucleate cell formed by fusion of myoblasts. The repeating sarcomeres create the light and dark bands; nuclei are pushed to the edge under the cell membrane.',
 draw(g,w,h,u,r){g.fillStyle='#f3cbd8';g.fillRect(0,0,w,h);g.save();g.translate(w/2,h/2);g.rotate(-.12);g.translate(-w,-h);
  let y=0;while(y<h*2){const fh=(22+r()*10)*u;const grd=g.createLinearGradient(0,y,0,y+fh);grd.addColorStop(0,'#cf6385');grd.addColorStop(.5,'#dc7896');grd.addColorStop(1,'#cc5f82');g.fillStyle=grd;g.fillRect(0,y+1.2*u,w*2,fh-2.4*u);
   for(let x=0;x<w*2;x+=3.3*u){g.fillStyle='rgba(110,25,65,.28)';g.fillRect(x,y+1.2*u,1.3*u,fh-2.4*u);}
   for(let x=r()*50*u;x<w*2;x+=(38+r()*50)*u){ell(g,x,y+(r()<.5?3*u:fh-3*u),9*u,2.1*u,0,HEM);}
   y+=fh;}
  g.restore();}},
cardiac:{t:'Cardiac muscle',stain:'H&E, longitudinal',mag:'×400',scale:'25 µm',
 feat:['Branching fibres','One or two central nuclei','Intercalated discs','Pale perinuclear zone','Striations'],
 d:'Cardiomyocytes are short branching cells joined end to end by intercalated discs, which contain gap junctions so the heart contracts as a unit.',
 draw(g,w,h,u,r){g.fillStyle='#f4d0dc';g.fillRect(0,0,w,h);const fh=26*u;
  for(let y=-fh;y<h+fh;y+=fh){const ph=r()*6;g.fillStyle='#d77a98';g.beginPath();for(let x=0;x<=w;x+=6*u)g.lineTo(x,y+3*u+Math.sin(x/(60*u)+ph)*4*u);for(let x=w;x>=0;x-=6*u)g.lineTo(x,y+fh-3*u+Math.sin(x/(60*u)+ph)*4*u);g.fill();
   for(let x=0;x<w;x+=3.4*u){g.fillStyle='rgba(120,30,70,.16)';g.fillRect(x,y+3*u,1.2*u,fh-6*u);}
   if(r()<.7){const bx=r()*w;g.fillStyle='#d77a98';g.beginPath();g.moveTo(bx,y+fh-6*u);g.lineTo(bx+30*u,y+fh+6*u);g.lineTo(bx+44*u,y+fh+6*u);g.lineTo(bx+14*u,y+fh-6*u);g.fill();}
   for(let x=r()*60*u;x<w;x+=(55+r()*45)*u){const cy=y+fh/2+Math.sin(x/(60*u)+ph)*4*u;ell(g,x,cy,11*u,4.8*u,0,'#f3dbe4');ell(g,x,cy,6.5*u,3.2*u,0,HEM);}
   for(let x=r()*80*u;x<w;x+=(70+r()*40)*u){g.strokeStyle='#5c1740';g.lineWidth=1.6*u;g.beginPath();g.moveTo(x,y+3*u);g.lineTo(x,y+fh/2);g.lineTo(x+4*u,y+fh/2);g.lineTo(x+4*u,y+fh-3*u);g.stroke();}}}},
tendon:{t:'Dense regular connective tissue',stain:'H&E, longitudinal',mag:'×200',scale:'50 µm',
 feat:['Parallel type I collagen bundles','Rows of flattened tenocyte nuclei','Wavy "crimp" pattern','Few blood vessels'],
 d:'Tendons, ligaments and the iliotibial band are packed with parallel collagen that resists tension along one axis. The sparse blood supply explains slow healing.',
 draw(g,w,h,u,r){g.fillStyle='#f7dbe5';g.fillRect(0,0,w,h);
  for(let y=0;y<h;y+=4.4*u){g.strokeStyle=r()<.5?'#e598b5':'#ecaabf';g.lineWidth=2.4*u;g.beginPath();const ph=y/(30*u);for(let x=0;x<=w;x+=4*u)g.lineTo(x,y+Math.sin(x/(9*u)+ph)*1.6*u);g.stroke();}
  for(let y=6*u;y<h;y+=(15+r()*6)*u)for(let x=r()*30*u;x<w;x+=(26+r()*30)*u)ell(g,x,y,8*u,1.2*u,.02,HEM);}},
cartilage:{t:'Hyaline (articular) cartilage',stain:'H&E',mag:'×200',scale:'50 µm',
 feat:['Chondrocytes in lacunae','Isogenous groups','Basophilic territorial matrix','No blood vessels','Perichondrium (absent on joint surfaces)'],
 d:'Glassy matrix rich in type II collagen and proteoglycans that cushions joint surfaces. Being avascular, it has very limited capacity to repair.',
 draw(g,w,h,u,r){const grd=g.createLinearGradient(0,0,0,h);grd.addColorStop(0,'#e6c9dd');grd.addColorStop(1,'#cdb6dc');g.fillStyle=grd;g.fillRect(0,0,w,h);
  g.fillStyle='#eab1c6';g.fillRect(0,0,w,26*u);for(let y=3*u;y<26*u;y+=5*u)for(let x=r()*20*u;x<w;x+=(22+r()*20)*u)ell(g,x,y,7*u,1.1*u,0,HEM);
  const sp=58*u;for(let y=48*u;y<h+sp;y+=sp)for(let x=sp*.3;x<w+sp;x+=sp){const cx=x+(r()-.5)*24*u,cy=y+(r()-.5)*20*u;circ(g,cx,cy,22*u,'rgba(125,80,165,.28)');
   const n=1+(r()*4|0);for(let k=0;k<n;k++){const a=k/n*TAU+r(),d=n>1?8*u:0;const lx=cx+Math.cos(a)*d,ly=cy+Math.sin(a)*d;ell(g,lx,ly,7*u,5.6*u,a,'#f5eff7');ell(g,lx,ly,5*u,4*u,a,'#c8a9d8');circ(g,lx,ly,1.9*u,'#553285');}}}},
nerve:{t:'Peripheral nerve',stain:'H&E, cross-section',mag:'×200',scale:'50 µm',
 feat:['Epineurium around the whole nerve','Perineurium around each fascicle','Endoneurium around each axon','Myelinated axons (pale halos)','Schwann cell nuclei'],
 d:'Axons are bundled into fascicles by three connective tissue sheaths. In paraffin sections the myelin lipid dissolves, leaving a pale ring around each dark axon.',
 draw(g,w,h,u,r){g.fillStyle='#f1cfdc';g.fillRect(0,0,w,h);for(let i=0;i<14;i++)circ(g,r()*w,r()*h,(10+r()*14)*u,'#fbf3f6','#e8b9ca',u);
  const fs=[[.32,.36,.24],[.7,.3,.19],[.62,.72,.22],[.26,.76,.15],[.9,.62,.12]];
  fs.forEach(([fx_,fy,fr])=>{const cx=fx_*w,cy=fy*h,R=fr*Math.min(w,h)*1.25;circ(g,cx,cy,R+3*u,'#c56b8d');circ(g,cx,cy,R,'#f7e5ec');
   const n=Math.floor(R*R/(40*u*u));for(let i=0;i<n;i++){const a=r()*TAU,d=Math.sqrt(r())*(R-5*u);const x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d,ar=(2+r()*2.6)*u;circ(g,x,y,ar,'#fffafc','rgba(198,106,145,.85)',.8*u);circ(g,x,y,ar*.34,'#a1487a');if(r()<.08)ell(g,x+ar,y,2.6*u,1.4*u,r()*3,HEM);}});}},
artery:{t:'Muscular artery',stain:'H&E, cross-section',mag:'×100',scale:'100 µm',
 feat:['Tunica intima with endothelium','Wavy internal elastic lamina','Thick tunica media (smooth muscle)','External elastic lamina','Tunica adventitia with vasa vasorum'],
 d:'Distributing arteries such as the brachial and femoral have a thick smooth-muscle media that adjusts their diameter and so the blood flow to each limb.',
 draw(g,w,h,u,r){drawVessel(g,w,h,u,r,false);}},
elastic:{t:'Elastic artery',stain:'H&E / elastic, cross-section',mag:'×100',scale:'100 µm',
 feat:['Many fenestrated elastic lamellae in the media','Smooth muscle between lamellae','Vasa vasorum in the outer wall','Thin intima'],
 d:'The aorta and carotids store energy as their elastic walls stretch in systole, then recoil to keep blood flowing during diastole (the Windkessel effect).',
 draw(g,w,h,u,r){drawVessel(g,w,h,u,r,true);}},
lung:{t:'Lung parenchyma',stain:'H&E',mag:'×100',scale:'100 µm',
 feat:['Alveoli','Thin interalveolar septa','Type I pneumocytes (gas exchange)','Type II pneumocytes (surfactant)','Alveolar macrophages','Bronchiole'],
 d:'Hundreds of millions of thin-walled alveoli bring air within about half a micron of blood. Type II cells secrete surfactant that stops alveoli collapsing.',
 draw(g,w,h,u,r){g.fillStyle='#e29ab5';g.fillRect(0,0,w,h);const sp=34*u;const pts=[];
  for(let y=0;y<h+sp;y+=sp*.87)for(let x=((y/(sp*.87)|0)%2)*sp/2;x<w+sp;x+=sp){pts.push([x+(r()-.5)*10*u,y+(r()-.5)*10*u]);}
  pts.forEach(([x,y])=>{if(r()<.5)ell(g,x+sp/2,y,2.4*u,1.8*u,r()*3,HEM);if(r()<.25)circ(g,x+sp/2,y+sp*.4,2.2*u,'#c9303f');});
  pts.forEach(([x,y])=>{g.beginPath();g.ellipse(x,y,(15+r()*3)*u,(14+r()*3)*u,r()*3,0,TAU);g.fillStyle='#fdf3f6';g.fill();});
  const bx=w*.7,by=h*.35,br=38*u;circ(g,bx,by,br+10*u,'#d4708f');g.beginPath();for(let a=0;a<=TAU+.01;a+=.05){const rr=br+Math.sin(a*14)*4*u;g.lineTo(bx+Math.cos(a)*rr,by+Math.sin(a)*rr);}g.fillStyle='#8a5aa8';g.fill();circ(g,bx,by,br-7*u,'#fbeef3');}},
liver:{t:'Liver lobule',stain:'H&E',mag:'×100',scale:'100 µm',
 feat:['Central vein','Hepatocyte plates radiating outward','Sinusoids with Kupffer cells','Portal triads: portal vein, hepatic artery, bile duct'],
 d:'Blood enters at the portal triads, flows through the sinusoids past the hepatocytes, and drains to the central vein. Bile flows the opposite way.',
 draw(g,w,h,u,r){g.fillStyle='#e8a3b9';g.fillRect(0,0,w,h);const cx=w/2,cy=h/2,M=Math.hypot(w,h)/2;
  for(let a=0;a<TAU;a+=TAU/52){const ca=Math.cos(a),sa=Math.sin(a);for(let d=20*u;d<M;d+=11*u){const x=cx+ca*d,y=cy+sa*d;ell(g,x,y,5.6*u,4.8*u,a,'#e290ab');if(r()<.7)circ(g,x,y,2.1*u,HEM2);}
   const a2=a+TAU/104;g.strokeStyle='#fbe9ef';g.lineWidth=2.2*u;g.beginPath();g.moveTo(cx+Math.cos(a2)*18*u,cy+Math.sin(a2)*18*u);g.lineTo(cx+Math.cos(a2)*M,cy+Math.sin(a2)*M);g.stroke();}
  circ(g,cx,cy,17*u,'#fdf5f8','#c46a8c',1.4*u);
  for(let k=0;k<6;k++){const a=k/6*TAU+.52,R=Math.min(w,h)*.46;const x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R;circ(g,x,y,20*u,'#f2c7d6');ell(g,x-5*u,y,9*u,6*u,0,'#fff6f9');circ(g,x+8*u,y-6*u,4*u,'#fff6f9','#b2365a',2.2*u);circ(g,x+6*u,y+8*u,5*u,'#fff6f9');for(let q=0;q<7;q++)circ(g,x+6*u+Math.cos(q)*5.2*u,y+8*u+Math.sin(q)*5.2*u,1.5*u,HEM);}}},
cortex:{t:'Cerebral cortex',stain:'H&E',mag:'×200',scale:'50 µm',
 feat:['Pyramidal neurons with apical dendrites','Nissl-rich cytoplasm','Neuropil','Glial nuclei','Capillaries'],
 d:'The neocortex has six layers. Large pyramidal neurons project their apical dendrites toward the surface and send axons to the spinal cord and other brain regions.',
 draw(g,w,h,u,r){g.fillStyle='#efcad8';g.fillRect(0,0,w,h);for(let i=0;i<2400;i++){g.fillStyle='rgba(150,70,115,.18)';g.fillRect(r()*w,r()*h,1.2*u,1.2*u);}
  for(let i=0;i<5;i++){const x=r()*w,y=r()*h;ell(g,x,y,14*u,6*u,r()*3,'#fbf0f4');ell(g,x+8*u,y,3*u,1.6*u,0,HEM);}
  for(let i=0;i<150;i++)circ(g,r()*w,r()*h,(1.6+r()*.9)*u,HEM);
  for(let i=0;i<20;i++){const x=r()*w,y=r()*h,s=(10+r()*5)*u;g.strokeStyle='#ad5f8a';g.lineWidth=1.8*u;g.beginPath();g.moveTo(x,y-s);g.lineTo(x+(r()-.5)*8*u,y-s-30*u);g.stroke();
   g.fillStyle='#ad5f8a';g.beginPath();g.moveTo(x,y-s*1.1);g.lineTo(x+s*.8,y+s*.55);g.lineTo(x-s*.8,y+s*.55);g.closePath();g.fill();circ(g,x,y,4.2*u,'#ecd0de');circ(g,x,y,1.4*u,'#3a1c5a');}}},
cord:{t:'Spinal cord',stain:'H&E, cross-section',mag:'×20',scale:'1 mm',
 feat:['Butterfly-shaped grey matter','Dorsal and ventral horns','Ventral horn motor neurons','White matter columns','Central canal','Anterior median fissure'],
 d:'Grey matter holds neuron cell bodies; the surrounding white matter carries ascending and descending tracts. Large motor neurons in the ventral horns send axons to skeletal muscle.',
 draw(g,w,h,u,r){g.fillStyle='#0b0f14';g.fillRect(0,0,w,h);const cx=w/2,cy=h/2,m=Math.min(w,h)*.42;
  ell(g,cx,cy,m*1.02,m*.82,0,'#e7a7c0');ell(g,cx,cy,m*.98,m*.78,0,'#f3cfdd');
  g.fillStyle='#c8739b';const E=(x,y,rx,ry,rot)=>{g.beginPath();g.ellipse(x,y,rx,ry,rot,0,TAU);g.fill();};
  E(cx,cy,m*.2,m*.08,0);for(const s of[-1,1]){E(cx+s*m*.22,cy-m*.3,m*.07,m*.36,-s*.45);E(cx+s*m*.3,cy+m*.22,m*.2,m*.25,s*.35);}
  circ(g,cx,cy,2.4*u,'#fff');for(const s of[-1,1])for(let i=0;i<9;i++)circ(g,cx+s*(m*.26+r()*m*.16),cy+m*(.12+r()*.26),2.2*u,'#3d1c63');
  g.strokeStyle='#0b0f14';g.lineWidth=3*u;g.beginPath();g.moveTo(cx,cy+m*.8);g.lineTo(cx,cy+m*.36);g.stroke();g.lineWidth=1*u;g.strokeStyle='#b35f86';g.beginPath();g.moveTo(cx,cy-m*.78);g.lineTo(cx,cy-m*.1);g.stroke();}},
kidney:{t:'Renal cortex',stain:'H&E',mag:'×200',scale:'50 µm',
 feat:['Glomerulus (capillary tuft)','Bowman capsule and space','Proximal tubules (pink, brush border)','Distal tubules (clearer lumen)'],
 d:'Each nephron starts at a glomerulus, where blood is filtered into Bowman space. The tubules then reclaim most of the water, salt and glucose.',
 draw(g,w,h,u,r){g.fillStyle='#e9a2bb';g.fillRect(0,0,w,h);const sp=31*u;
  for(let y=0;y<h+sp;y+=sp)for(let x=((y/sp|0)%2)*sp/2;x<w+sp;x+=sp){const cx=x+(r()-.5)*8*u,cy=y+(r()-.5)*8*u,pct=r()<.65;circ(g,cx,cy,13*u,pct?'#e0859f':'#eaa8bf','#f7d7e2',1.2*u);circ(g,cx,cy,(pct?3:6)*u,'#fdf1f5');for(let k=0;k<7;k++){const a=k/7*TAU+r()*.3;circ(g,cx+Math.cos(a)*9*u,cy+Math.sin(a)*9*u,1.8*u,HEM);}}
  [[.33,.4],[.72,.66]].forEach(([a,b])=>{const cx=a*w,cy=b*h;circ(g,cx,cy,36*u,'#fdf1f5','#c56f90',1.6*u);circ(g,cx+2*u,cy,28*u,'#d58caf');for(let i=0;i<80;i++){const t=r()*TAU,d=Math.sqrt(r())*26*u;circ(g,cx+2*u+Math.cos(t)*d,cy+Math.sin(t)*d,1.7*u,HEM);}for(let i=0;i<14;i++){const t=r()*TAU,d=r()*20*u;circ(g,cx+Math.cos(t)*d,cy+Math.sin(t)*d,2.2*u,'#f8e3ea');}});}},
gut:{t:'Small intestine (jejunum)',stain:'H&E',mag:'×100',scale:'100 µm',
 feat:['Villi','Enterocytes with brush border','Goblet cells','Crypts of Lieberkühn','Lamina propria','Muscularis mucosae'],
 d:'Finger-like villi covered in absorptive enterocytes multiply the surface area of the gut. Crypts at their base renew the lining every few days.',
 draw(g,w,h,u,r){g.fillStyle='#fbeef3';g.fillRect(0,0,w,h);const base=h*.66;
  g.fillStyle='#f0bcd0';g.fillRect(0,base,w,h-base);g.fillStyle='#d56d8f';g.fillRect(0,h*.86,w,12*u);
  for(let x=10*u;x<w;x+=22*u){g.fillStyle='#e7a0ba';g.fillRect(x,base+6*u,12*u,h*.18);for(let y=base+8*u;y<h*.84;y+=6*u)circ(g,x+(r()<.5?1.5:10.5)*u,y,1.7*u,HEM);}
  for(let x=18*u;x<w;x+=46*u){const vw=(28+r()*8)*u,top=h*(.06+r()*.14);const x0=x-vw/2;
   g.beginPath();g.moveTo(x0,base+4*u);g.lineTo(x0,top+vw/2);g.arc(x,top+vw/2,vw/2,Math.PI,0);g.lineTo(x0+vw,base+4*u);g.closePath();g.fillStyle='#d9829f';g.fill();
   g.beginPath();g.moveTo(x0+5*u,base+4*u);g.lineTo(x0+5*u,top+vw/2);g.arc(x,top+vw/2,vw/2-5*u,Math.PI,0);g.lineTo(x0+vw-5*u,base+4*u);g.fillStyle='#eeb3c7';g.fill();
   for(let y=top+vw/2;y<base;y+=5*u){for(const s of[-1,1]){if(r()<.1){ell(g,x+s*(vw/2-2.6*u),y,2.2*u,3.4*u,0,'#fdf6f9');continue;}ell(g,x+s*(vw/2-3*u),y,1.1*u,2.4*u,0,HEM);}}
   for(let i=0;i<10;i++)circ(g,x+(r()-.5)*(vw-14*u),top+vw/2+r()*(base-top-vw/2),1.5*u,'#7a4a98');}}},
stomach:{t:'Gastric mucosa',stain:'H&E',mag:'×100',scale:'100 µm',
 feat:['Gastric pits','Surface mucous cells','Parietal cells (acid, intrinsic factor)','Chief cells (pepsinogen)','Muscularis mucosae'],
 d:'Surface cells secrete protective mucus. Deep in the glands, pink parietal cells make hydrochloric acid and purple chief cells make pepsinogen.',
 draw(g,w,h,u,r){g.fillStyle='#f6dde7';g.fillRect(0,0,w,h);g.fillStyle='#fbf2f6';g.fillRect(0,0,w,h*.08);g.fillStyle='#d56d8f';g.fillRect(0,h*.88,w,12*u);
  for(let x=14*u;x<w;x+=30*u){g.fillStyle='#fdf6f9';g.fillRect(x-2*u,h*.08,4*u,h*.22);
   for(let y=h*.1;y<h*.3;y+=6*u)for(const s of[-1,1])ell(g,x+s*6*u,y,1.2*u,2.6*u,0,HEM);
   for(let y=h*.32;y<h*.86;y+=8.5*u)for(const s of[-1,1]){const deep=y>h*.64;const cx=x+s*7*u+(r()-.5)*2*u;circ(g,cx,y,5.2*u,deep?'#a58cd0':'#ec9fbd');circ(g,cx+(deep?s*2*u:0),y,1.8*u,HEM);}
   g.strokeStyle='#fdf6f9';g.lineWidth=1.4*u;g.beginPath();g.moveTo(x,h*.3);g.lineTo(x,h*.85);g.stroke();}}}
};
function drawVessel(g,w,h,u,r,elastic){g.fillStyle='#f6dce6';g.fillRect(0,0,w,h);
 for(let i=0;i<60;i++){g.strokeStyle='rgba(220,140,170,.6)';g.lineWidth=1.2*u;g.beginPath();const x=r()*w,y=r()*h;g.moveTo(x,y);g.quadraticCurveTo(x+20*u,y+(r()-.5)*20*u,x+40*u,y);g.stroke();}
 for(let i=0;i<50;i++)ell(g,r()*w,r()*h,5*u,1.2*u,r()*3,HEM);
 const cx=w/2,cy=h/2,m=Math.min(w,h),Lr=m*.2,M1=Lr+6*u,M2=m*(elastic?.4:.36);
 circ(g,cx,cy,M2+4*u,'#e8a5bd');circ(g,cx,cy,M2,'#df89a8');
 if(elastic){for(let rr=M1+5*u;rr<M2;rr+=6.5*u){g.strokeStyle='#b8477a';g.lineWidth=1.1*u;g.beginPath();for(let a=0;a<=TAU+.01;a+=.03)g.lineTo(cx+Math.cos(a)*(rr+Math.sin(a*30)*1.2*u),cy+Math.sin(a)*(rr+Math.sin(a*30)*1.2*u));g.stroke();}}
 const n=elastic?220:420;for(let i=0;i<n;i++){const a=r()*TAU,d=M1+r()*(M2-M1);ell(g,cx+Math.cos(a)*d,cy+Math.sin(a)*d,5*u,1.3*u,a+Math.PI/2,HEM2);}
 g.strokeStyle='#a4326a';g.lineWidth=2.2*u;g.beginPath();for(let a=0;a<=TAU+.01;a+=.02){const rr=Lr+4*u+Math.sin(a*24)*1.8*u;g.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);}g.stroke();
 circ(g,cx,cy,Lr+1.5*u,'#f9e6ed');circ(g,cx,cy,Lr,'#fff9fb');
 for(let i=0;i<26;i++){const a=r()*TAU,d=r()*Lr*.8;circ(g,cx+Math.cos(a)*d,cy+Math.sin(a)*d,2.6*u,'#e25563');}
 for(let i=0;i<5;i++){const a=r()*TAU,d=M2+14*u+r()*20*u;circ(g,cx+Math.cos(a)*d,cy+Math.sin(a)*d,5*u,'#fff9fb','#c35a84',1.4*u);}}

function drawHisto(cv,key,seed){
  const H=HISTO[key];if(!H)return;const dpr=Math.min(2,window.devicePixelRatio||1);
  const w=cv.clientWidth||300,h=cv.clientHeight||190;cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
  const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);const u=Math.max(w,h)/340;const r=RNG(seed||key.length*977+13);
  g.save();H.draw(g,w,h,u,r);g.restore();
  const vg=g.createRadialGradient(w/2,h/2,Math.min(w,h)*.28,w/2,h/2,Math.max(w,h)*.72);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.5)');g.fillStyle=vg;g.fillRect(0,0,w,h);
  const bl=40*u;g.fillStyle='rgba(0,0,0,.55)';g.fillRect(8,h-24,bl+56,18);g.fillStyle='#fff';g.fillRect(14,h-16,bl,3);g.font=`500 11px "Barlow Semi Condensed",sans-serif`;g.fillText(H.scale,20+bl,h-11);
}
