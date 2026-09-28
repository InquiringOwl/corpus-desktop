import pickle,glob,re,json,numpy as np,collections,sys,trimesh,fast_simplification as fs
from scipy.spatial import cKDTree
np.random.seed(0)
R=[]
for f in sorted(glob.glob('exp/*.pkl')): R+=pickle.load(open(f,'rb'))
for r in R:
    if 'V' in r: r['V']=r['V'].astype(np.float64)*1000
    if 'splines' in r: r['splines']=[(P.astype(np.float64)*1000,rd) for P,rd in r['splines']]
skel=[r for r in R if r['cat'].startswith('1:') and 'V' in r]
allsk=np.vstack([r['V'] for r in skel]);lo=allsk.min(0)-60;hi=allsk.max(0)+60
def cen(r): return r['V'].mean(0) if 'V' in r else np.vstack([p for p,_ in r['splines']]).mean(0)
R=[r for r in R if np.all(cen(r)>lo) and np.all(cen(r)<hi)]
print('kept',len(R))

def base(n):
    n=re.sub(r'\.(r|l)$','',n);return n.strip('()')
def side(n): return 'R' if n.endswith('.r') else 'L' if n.endswith('.l') else 'M'

# ---------- classification ----------
def kind(r):
    n=r['name'].lower();c=r['cat'];ch=' '.join(r['chain']).lower()
    if c.startswith('1:'): return 'cartilage' if 'cartilage' in n else 'tooth' if re.search(r'incisor|canine|molar|premolar',n) else 'bone'
    if c.startswith('3:'): return 'ligament'
    if c.startswith('4:'):
        if re.search(r'fascia|aponeuro|retinacul|septum|sheath|bursa|ligament',n): return 'fascia'
        if re.search(r'tendon|tract|tendinous',n): return 'tendon'
        return 'muscle'
    if c.startswith('5:'):
        if 'heart' in ch and 'V' in r: return 'heart'
        if re.search(r'veins\.g',ch) or re.search(r'\bvein|sinus|plexus|vena',n): return 'vein'
        return 'artery'
    if c.startswith('7:'):
        cl=[x.lower() for x in r['chain']]
        if 'sense organs.g' in cl: return 'sense'
        if 'central nervous system.g' in cl: return 'cns'
        return 'nerve'
    if c.startswith('6:'): return 'lymph'
    return 'organ'
LAYER={'bone':'bone','cartilage':'bone','tooth':'bone','ligament':'joint','muscle':'muscle','fascia':'joint','tendon':'muscle','heart':'vessel','vein':'vessel','artery':'vessel','nerve':'nerve','cns':'nerve','sense':'organ','lymph':'organ','organ':'organ','skin':'skin'}
for r in R: r['kind']=kind(r)

# ---------- segments ----------
SEG=['pelvis','lumbar','thorax','neck','head','jaw']
for s in 'rl': SEG+=[f'girdle.{s}',f'hum.{s}',f'ulna.{s}',f'rad.{s}',f'hand.{s}']
for s in 'rl': SEG+=[f'fem.{s}',f'leg.{s}',f'foot.{s}']
PAR={'lumbar':'pelvis','thorax':'lumbar','neck':'thorax','head':'neck','jaw':'head'}
for s in 'rl': PAR.update({f'girdle.{s}':'thorax',f'hum.{s}':f'girdle.{s}',f'ulna.{s}':f'hum.{s}',f'rad.{s}':f'ulna.{s}',f'hand.{s}':f'rad.{s}',f'fem.{s}':'pelvis',f'leg.{s}':f'fem.{s}',f'foot.{s}':f'leg.{s}'})
SI={s:i for i,s in enumerate(SEG)}
def bone_seg(r):
    b=base(r['name']);s=side(r['name']).lower()
    if re.match(r'Mandible|Lower ',b): return 'jaw'
    if re.match(r'Atlas|Axis|Vertebra C|Hyoid|Thyroid cart|Cricoid|Arytenoid|Corniculate',b): return 'neck'
    if re.match(r'Vertebra T|.*rib$|Costal cart|.*sternum|Xiphoid',b): return 'thorax'
    if re.match(r'Vertebra L',b): return 'lumbar'
    if re.match(r'Sacrum|Coccyx|Hip bone',b): return 'pelvis'
    if re.match(r'Clavicle|Scapula',b): return f'girdle.{s}'
    if b=='Humerus': return f'hum.{s}'
    if b=='Ulna': return f'ulna.{s}'
    if b=='Radius': return f'rad.{s}'
    if re.search(r'Scaphoid|Lunate|Triquetrum|Pisiform|Trapezium|Trapezoid|Capitate|Hamate|metacarpal|of hand',b): return f'hand.{s}'
    if b=='Femur': return f'fem.{s}'
    if re.match(r'Tibia|Fibula|Patella',b): return f'leg.{s}'
    if re.search(r'Talus|Calcaneus|Navicular|Cuboid|cuneiform|metatarsal|of foot',b): return f'foot.{s}'
    return 'head'
bones=[r for r in R if r['cat'].startswith('1:')]
for r in bones: r['seg']=bone_seg(r)
BN={r['name']:r for r in bones}
def V(n): return BN[n]['V']
tree_cache={}
def T(n):
    if n not in tree_cache: tree_cache[n]=cKDTree(V(n))
    return tree_cache[n]
def contact(a,b,thr):
    d,_=T(b).query(V(a),distance_upper_bound=thr);return V(a)[np.isfinite(d)]
def sphere(P):
    A=np.c_[2*P,np.ones(len(P))];f=(P**2).sum(1);c,*_=np.linalg.lstsq(A,f,rcond=None);return c[:3]
def nz(v): return v/np.linalg.norm(v)
piv={};ax={}
X=np.array([1.,0,0]);Y=np.array([0,1.,0]);Z=np.array([0,0,1.])
def mid(a,b,thr): return contact(a,b,thr).mean(0)
piv['lumbar']=mid('Vertebra L5','Sacrum',10)
piv['thorax']=mid('Vertebra T12','Vertebra L1',10)
piv['neck']=mid('Vertebra C7','Vertebra T1',10)
piv['head']=mid('Occipital bone','Atlas (C1)',10)
jc=np.vstack([contact('Mandible','Temporal bone.r',8),contact('Mandible','Temporal bone.l',8)]);piv['jaw']=jc.mean(0)
for s in 'rl':
    S=s
    piv[f'girdle.{s}']=mid(f'Clavicle.{s}','Manubrium of sternum',10)
    gh=contact(f'Humerus.{s}',f'Scapula.{s}',6);piv[f'hum.{s}']=sphere(gh) if len(gh)>30 else gh.mean(0)
    hv=V(f'Humerus.{s}');dist=hv[hv[:,2]<hv[:,2].min()+45]
    lat=dist[np.argmin(dist[:,0])] if s=='r' else dist[np.argmax(dist[:,0])];med=dist[np.argmax(dist[:,0])] if s=='r' else dist[np.argmin(dist[:,0])]
    el=np.vstack([contact(f'Humerus.{s}',f'Ulna.{s}',5),contact(f'Humerus.{s}',f'Radius.{s}',5)]).mean(0);piv[f'ulna.{s}']=el;ax[f'el.{s}']=nz(med-lat)
    rh=contact(f'Radius.{s}',f'Humerus.{s}',6).mean(0);uv=contact(f'Ulna.{s}',f'Radius.{s}',6);uh=uv[uv[:,2]<np.median(V(f'Ulna.{s}')[:,2])].mean(0)
    piv[f'rad.{s}']=rh;ax[f'pr.{s}']=nz(uh-rh)
    piv[f'hand.{s}']=np.vstack([contact(f'Radius.{s}',f'Scaphoid bone.{s}',6),contact(f'Radius.{s}',f'Lunate bone.{s}',6)]).mean(0)
    hp=contact(f'Femur.{s}',f'Hip bone.{s}',5);piv[f'fem.{s}']=sphere(hp) if len(hp)>30 else hp.mean(0)
    piv[f'leg.{s}']=contact(f'Femur.{s}',f'Tibia.{s}',14).mean(0)
    piv[f'foot.{s}']=contact(f'Tibia.{s}',f'Talus.{s}',6).mean(0)
    tv=V(f'Tibia.{s}');fv=V(f'Fibula.{s}');mm=tv[np.argmin(tv[:,2])];lm=fv[np.argmin(fv[:,2])];ax[f'ank.{s}']=nz(mm-lm) if s=='r' else nz(lm-mm)
    ax[f'ank.{s}']=nz(mm-lm)
piv['pelvis']=(piv['fem.r']+piv['fem.l'])/2
for k,v in piv.items(): print(k,np.round(v,1))
# landmarks for sign tests
LM={}
LM['headtop']=V('Parietal bone.r').mean(0)*.5+V('Parietal bone.l').mean(0)*.5
LM['sternum']=V('Body of sternum').mean(0);LM['chin']=V('Mandible')[np.argmin(V('Mandible')[:,2])]
LM['nose']=V('Nasal bone.r').mean(0)
for s in 'rl':
    LM[f'elbow.{s}']=piv[f'ulna.{s}'];LM[f'wrist.{s}']=piv[f'hand.{s}'];LM[f'knee.{s}']=piv[f'leg.{s}'];LM[f'ankle.{s}']=piv[f'foot.{s}']
    LM[f'finger.{s}']=V(f'Distal phalanx of third finger of hand.{s}').mean(0);LM[f'thumb.{s}']=V(f'Distal phalanx of first finger of hand.{s}').mean(0)
    LM[f'toe.{s}']=V(f'Distal phalanx of first finger of foot.{s}').mean(0);LM[f'patella.{s}']=V(f'Patella.{s}').mean(0)
    hv=V(f'Humerus.{s}');d=hv[hv[:,2]<hv[:,2].min()+45];LM[f'medepi.{s}']=d[np.argmax(d[:,0])] if s=='r' else d[np.argmin(d[:,0])]
    LM[f'medfoot.{s}']=V(f'First metatarsal bone.{s}').mean(0)
    cv=V(f'Calcaneus.{s}');LM[f'heel.{s}']=cv[np.argmin(cv[:,2])]
    LM[f'fingerTip.{s}']=V(f'Distal phalanx of third finger of hand.{s}')[np.argmin(V(f'Distal phalanx of third finger of hand.{s}')[:,2])]

# ---------- skin (BodyParts3D, aligned) ----------
try:
    sk=trimesh.load('/home/claude/bp3d/stl/FMA7163.stl');M=np.load('bp2z.npy')
    Vs=np.asarray(sk.vertices,float);Vs=(np.c_[Vs,np.ones(len(Vs))]@M.T)[:,:3]
    R.append(dict(name='Skin',cat='0: Integument',chain=['Integument.g'],type='MESH',V=Vs,F=np.asarray(sk.faces,np.int32),kind='skin'))
    print('skin',len(sk.faces))
except Exception as e: print('no skin',e)

# ---------- curves -> tubes ----------
RAD=[(r'aorta',11),(r'pulmonary trunk',12),(r'brachiocephalic trunk',6),(r'common carotid',3.6),(r'internal carotid',2.6),(r'external carotid',2.2),(r'subclavian artery',4),(r'vertebral artery',1.8),(r'axillary artery',3.4),(r'brachial artery',2.3),(r'(radial|ulnar) artery',1.5),
 (r'common iliac artery',5),(r'external iliac artery',4.2),(r'internal iliac artery',3),(r'femoral artery',3.8),(r'deep artery of thigh',2.6),(r'popliteal artery',3),(r'tibial artery',1.8),(r'coeliac|celiac',3),(r'mesenteric artery',3),(r'renal artery',2.8),(r'pulmonary artery',6),
 (r'vena cava',12),(r'brachiocephalic vein',6),(r'internal jugular',5),(r'subclavian vein',4.5),(r'axillary vein',4),(r'common iliac vein',6),(r'external iliac vein',5),(r'femoral vein',4.4),(r'popliteal vein',3.2),(r'great saphenous',2.4),(r'portal vein',6),(r'renal vein',4),(r'pulmonary vein',5),(r'azygos',3),
 (r'sciatic',5),(r'femoral nerve',3),(r'tibial nerve',3),(r'common fibular',2.5),(r'median nerve',2.4),(r'ulnar nerve',2.2),(r'radial nerve',2.2),(r'musculocutaneous',1.6),(r'axillary nerve',1.8),(r'vagus',1.8),(r'obturator nerve',1.8),(r'phrenic',1.1),(r'trunk of brachial|cord of brachial',3),(r'lumbosacral trunk',3),
 (r'bronch',3.2)]
DEF={'artery':.9,'vein':1.1,'nerve':.8,'cns':.8,'organ':1.5,'sense':.6}
def tube(P,rads,r0,seg=None):
    L=np.r_[0,np.cumsum(np.linalg.norm(np.diff(P,axis=0),axis=1))]
    if L[-1]<1e-6: return None
    step=max(2.5,min(9,r0*2.2));n=max(2,int(L[-1]/step)+1);t=np.linspace(0,L[-1],n)
    Q=np.c_[[np.interp(t,L,P[:,k]) for k in range(3)]].T;rr=np.interp(t,L,rads)
    rr=np.clip(rr,.35,2.5)*r0
    seg=seg or (5 if r0<1.5 else 7 if r0<3.5 else 12)
    Tg=np.gradient(Q,axis=0);Tg/=np.linalg.norm(Tg,axis=1,keepdims=True)+1e-9
    ref=np.array([0,0,1.]) if abs(Tg[0,2])<.9 else np.array([1.,0,0]);N=np.cross(Tg[0],ref);N/=np.linalg.norm(N)
    Vs=[];Ns=N
    for i in range(n):
        Ns=Ns-Tg[i]*np.dot(Ns,Tg[i]);Ns/=np.linalg.norm(Ns)+1e-9;Bn=np.cross(Tg[i],Ns)
        for k in range(seg):
            a=2*np.pi*k/seg;Vs.append(Q[i]+rr[i]*(np.cos(a)*Ns+np.sin(a)*Bn))
    F=[]
    for i in range(n-1):
        for k in range(seg):
            a=i*seg+k;b=i*seg+(k+1)%seg;c=a+seg;d=b+seg;F+=[[a,c,b],[b,c,d]]
    return np.array(Vs),np.array(F,np.int32)
for r in R:
    if 'splines' not in r: continue
    k=r['kind'];n=r['name'].lower();r0=DEF.get(k,1)
    for pat,v in RAD:
        if re.search(pat,n): r0=v;break
    Vs=[];Fs=[];off=0
    for P,rd in r['splines']:
        t=tube(P,rd if rd.max()>0 else np.ones(len(P)),r0)
        if t is None: continue
        Vs.append(t[0]);Fs.append(t[1]+off);off+=len(t[0])
    if Vs: r['V']=np.vstack(Vs);r['F']=np.vstack(Fs);r['tube']=1
R=[r for r in R if 'V' in r and len(r.get('F',[]))>0]

# ---------- decimation ----------
BUD={'bone':(.5,6000,60),'cartilage':(.4,2500,40),'tooth':(.25,400,40),'ligament':(.22,1200,40),'muscle':(.28,4500,80),'fascia':(.12,2500,60),'tendon':(.2,2500,40),'heart':(.35,6000,80),'artery':(1,99999,0),'vein':(1,99999,0),'nerve':(1,99999,0),'cns':(.13,7000,60),'sense':(.2,2500,40),'lymph':(.25,600,30),'organ':(.3,7000,60),'skin':(.0,45000,0)}
tot=0
for r in R:
    f,cap,mn=BUD[r['kind']]
    if r.get('tube'):continue
    nf=len(r['F']);tgt=int(min(cap,max(mn,nf*f))) if r['kind']!='skin' else cap
    if nf>tgt and nf>80:
        try:
            v,fa=fs.simplify(r['V'].astype(np.float32),r['F'].astype(np.int32),target_reduction=1-tgt/nf);r['V']=np.asarray(v,float);r['F']=np.asarray(fa,np.int32)
        except Exception as e: print('dec fail',r['name'],e)
    tot+=len(r['F'])
print('tris after',tot,sum(len(r['F']) for r in R))

# ---------- weights ----------
segV=collections.defaultdict(list)
for r in R:
    if r['kind'] in('bone','cartilage','tooth') and 'seg' in r: segV[r['seg']].append(r['V'])
trees={s:cKDTree(np.vstack(segV[s])) for s in SEG}
def path(a,b):
    def up(x):
        p=[x]
        while x in PAR: x=PAR[x];p.append(x)
        return p
    pa,pb=up(a),up(b);common=next(x for x in pa if x in pb)
    return pa[:pa.index(common)+1]+pb[:pb.index(common)]
def depth(x):
    d=0
    while x in PAR: x=PAR[x];d+=1
    return d
def treedist(a,b): return len(path(a,b))-1
for r in R:
    if r['kind'] in('bone','cartilage','tooth'): continue
    Vv=r['V'];D=np.stack([trees[s].query(Vv)[0] for s in SEG],1)
    k=r['kind'];att=6 if k in('muscle','fascia','ligament','tendon') else 20 if k in('artery','vein','nerve') else 8
    if k=='skin':
        S=list(range(len(SEG)))
    else:
        S=[i for i in range(len(SEG)) if D[:,i].min()<att]
        if not S: S=[int(np.argmin(D.min(0)))]
    names=[SEG[i] for i in S];full=set(names)
    for a in names:
        for b in names: full|=set(path(a,b))
    S2=sorted(SI[x] for x in full)
    if len(S2)==1: r['rigid']=S2[0];continue
    Ds=D[:,S2];W=1/(Ds+3)**4;o=np.argsort(-W,1)[:,:2];w=np.take_along_axis(W,o,1);w=w/w.sum(1,keepdims=True)
    r['s0']=np.array(S2)[o[:,0]].astype(np.uint8);r['s1']=np.array(S2)[o[:,1]].astype(np.uint8);r['w0']=np.round(w[:,0]*255).astype(np.uint8)
    if k=='muscle' and len(names)>=2:
        best=None
        for a in names:
            for b in names:
                if a<b and (best is None or treedist(a,b)>best[0]): best=(treedist(a,b),a,b)
        _,a,b=best;ia,ib=SI[a],SI[b]
        C=Vv.mean(0);U,S_,Vt=np.linalg.svd(Vv-C,full_matrices=False);pr=(Vv-C)@Vt[0];lo_,hi_=np.quantile(pr,[.03,.97])
        E1=Vv[pr<=lo_].mean(0);E2=Vv[pr>=hi_].mean(0)
        d1a=trees[a].query(E1)[0]+trees[b].query(E2)[0];d1b=trees[b].query(E1)[0]+trees[a].query(E2)[0]
        A,B_=(E1,E2) if d1a<=d1b else (E2,E1)
        if depth(a)>depth(b): a,b,ia,ib,A,B_=b,a,ib,ia,B_,A
        if np.linalg.norm(A-B_)>25: r['anc']=[[float(x) for x in A],ia,[float(x) for x in B_],ib]
print('weights done')

# ---------- pack ----------
allV=np.vstack([r['V'] for r in R]);glo=allV.min(0)-1;ghi=allV.max(0)+1
files=collections.defaultdict(bytearray);man=[]
for i,r in enumerate(R):
    L=LAYER[r['kind']];buf=files[L];Vv=r['V'];F=r['F'];nv=len(Vv)
    if nv>65535:
        # split not supported: aggressive decimate
        v,fa=fs.simplify(Vv.astype(np.float32),F.astype(np.int32),target_reduction=1-60000/len(F));Vv=np.asarray(v,float);F=np.asarray(fa,np.int32);nv=len(Vv)
        for key in('s0','s1','w0'):
            if key in r: r.pop(key)
        r['rigid']=r.get('rigid',SI['thorax'])
    o=len(buf);q=np.round((Vv-glo)/(ghi-glo)*65535).astype('<u2');buf+=q.tobytes();buf+=F.astype('<u2').tobytes()
    sk=None
    if 's0' in r:
        buf+=r['s0'].tobytes()+r['s1'].tobytes()+r['w0'].tobytes();sk=1
    while len(buf)%4: buf+=b'\0'
    ch=[c[:-2] if c.endswith('.g') else c for c in r['chain']]
    m=dict(n=base(r['name']),s=side(r['name']),k=r['kind'],f=L,o=o,v=nv,t=len(F),g=ch[0] if ch else '',g2=ch[1] if len(ch)>1 else '')
    if 'seg' in r: m['rg']=SI[r['seg']]
    elif 'rigid' in r: m['rg']=r['rigid']
    if sk: m['sk']=1;m['dm']=int(np.bincount(r['s0'],minlength=len(SEG)).argmax())
    m['c']=[round(float(x),1) for x in Vv.mean(0)]
    if 'anc' in r: m['a']=[[round(x,1) for x in r['anc'][0]],r['anc'][1],[round(x,1) for x in r['anc'][2]],r['anc'][3]]
    man.append(m)
import os;os.makedirs('out',exist_ok=True)
for L,b in files.items(): open(f'out/{L}.bin','wb').write(bytes(b));print(L,len(b)/1e6,'MB')
J=dict(lo=glo.round(3).tolist(),hi=ghi.round(3).tolist(),seg=SEG,par=[SI.get(PAR.get(s),-1) for s in SEG],piv=[np.round(piv[s],2).tolist() for s in SEG],
       ax={k:np.round(v,4).tolist() for k,v in ax.items()},lm={k:np.round(v,1).tolist() for k,v in LM.items()},m=man)
json.dump(J,open('out/manifest.json','w'),separators=(',',':'))
print('meshes',len(man),'manifest',os.path.getsize('out/manifest.json')/1e6)
