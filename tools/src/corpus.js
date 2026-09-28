import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const CFG=window.CORPUS||{};const DATA=CFG.data||'data/';const VERSION=CFG.version||'web';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const SIDE={R:'right',L:'left',M:''};

/* ================= load ================= */
const FILES=['bone','muscle','joint','vessel','nerve','organ','skin'];
async function load(){
  const man=await (await fetch(DATA+'manifest.json')).json();
  const v1=await (await fetch(DATA+'curated.json')).json();
  const bins={};let n=0;
  await Promise.all(FILES.map(async f=>{const r=await fetch(DATA+f+'.bin');bins[f]=new Uint8Array(await r.arrayBuffer());n++;$('loadBar').style.width=(n/FILES.length*100)+'%';$('loadTxt').textContent=`Assembling specimen · ${n}/${FILES.length} systems`;}));
  return {man,bins,v1};
}

/* ================= curated knowledge ================= */
const CUR_MAP=[
 [/^(frontal|parietal|occipital|temporal|sphenoid|ethmoid|palatine|lacrimal|zygomatic|nasal) bone|^maxilla|^vomer|cells of ethmoid|^inferior nasal concha/,'cran'],[/^mandible/,'mand'],[/^(atlas|axis|vertebra c)/,'cerv'],[/^vertebra t/,'thor'],[/^vertebra l/,'lumb'],[/^(sacrum|coccyx)/,'sacrum'],
 [/sternum|xiphoid/,'stern'],[/ rib$|costal cartilage/,'ribs'],[/^clavicle/,'clav'],[/^scapula/,'scap'],[/^humerus/,'hum'],[/^ulna$/,'ulna'],[/^radius$/,'rad'],
 [/(scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate) bone|metacarpal|of hand$/,'hand'],[/^hip bone/,'pelv'],[/^femur/,'fem'],[/^patella/,'pat'],[/^tibia$/,'tibia'],[/^fibula$/,'fibu'],[/^(talus|calcaneus)|navicular|cuboid|cuneiform|metatarsal|of foot$/,'foot'],
 [/sternocleidomastoid/,'scm'],[/trapezius/,'trap'],[/deltoid muscle/,'delt'],[/pectoralis major/,'pec'],[/serratus anterior/,'serr'],[/biceps brachii/,'bic'],[/triceps brachii/,'tri'],[/rectus abdominis/,'rab'],[/external oblique/,'eob'],[/internal oblique/,'iob'],[/^diaphragm/,'dia'],
 [/iliacus|psoas major/,'ilio'],[/rectus femoris|vastus/,'quad'],[/adductor (longus|brevis|magnus)|gracilis|pectineus/,'add'],[/tensor fasciae latae|iliotibial/,'tfl'],[/tibialis anterior/,'tibant'],[/fibularis longus/,'fibl'],[/gastrocnemius/,'gast'],[/gluteus maximus/,'gmax'],[/gluteus medius/,'gmed'],
 [/biceps femoris|semitendinosus|semimembranosus/,'ham'],[/latissimus dorsi/,'lat'],[/^(iliocostalis|longissimus|spinalis) /,'es'],[/quadratus lumborum/,'ql'],
 [/telencephalon|cerebr|gyrus|lobe of brain|cerebell|pons|midbrain|medulla oblongata|thalamus|hippocamp/,'brain'],[/spinal cord|segment of spinal/,'cord'],[/brachial plexus|trunk of brachial|cord of brachial/,'bplex'],[/^median nerve/,'median'],[/^ulnar nerve/,'ulnarn'],[/^radial nerve/,'radn'],[/^femoral nerve/,'femn'],[/^sciatic nerve/,'sci'],[/common fibular nerve/,'cfn'],
 [/ventricle$|atrium$|^heart|wall of heart/,'heart'],[/aort/,'aorta'],[/common carotid/,'carot'],[/^(brachial|radial|ulnar|axillary) artery/,'brach'],[/^(femoral|popliteal) artery/,'femart'],
 [/lung|pulmonary segment/,'lungs'],[/liver|hepatic segment|lobe of liver/,'liver'],[/stomach|pylor|fundus of stomach/,'stom'],[/kidney|renal (cortex|medulla|pelvis)/,'kid'],[/colon|jejunum|ileum|duodenum|caecum|cecum|rectum|appendix/,'intest'],
 [/glenohumeral|coracohumeral|glenoid labrum/,'shoulder'],[/annular ligament of radius|collateral ligament of elbow|elbow/,'elbow'],[/radiocarpal|palmar carpal|dorsal carpal/,'wrist'],[/iliofemoral|pubofemoral|ischiofemoral|acetabular labrum|ligament of head of femur/,'hip'],[/cruciate|menisc|patellar ligament|collateral ligament of knee|tibial collateral|fibular collateral/,'knee'],[/talofibular|calcaneofibular|deltoid ligament|tibiofibular/,'ankle']
];
const LIMB={coracobrachialis:['Coracoid process','Medial humerus, mid-shaft','Flexes and adducts the arm','Musculocutaneous nerve (C5–C7)'],brachialis:['Distal half of anterior humerus','Coronoid process and ulnar tuberosity','Pure elbow flexor in every forearm position','Musculocutaneous (C5–C6), small radial contribution'],
 anconeus:['Lateral epicondyle','Lateral olecranon','Assists elbow extension, steadies the joint','Radial nerve (C7–C8)'],brachioradialis:['Lateral supracondylar ridge','Base of radial styloid','Elbow flexion, strongest in mid-position','Radial nerve (C5–C6)'],
 'pronator teres':['Medial epicondyle, coronoid process','Lateral radius, mid-shaft','Pronation, weak elbow flexion','Median nerve (C6–C7)'],'pronator quadratus':['Distal anterior ulna','Distal anterior radius','Primary pronator','Anterior interosseous nerve (C7–C8)'],
 supinator:['Lateral epicondyle, supinator crest of ulna','Proximal lateral radius','Supination','Posterior interosseous nerve (C5–C6)'],'flexor carpi radialis':['Medial epicondyle','Bases of 2nd–3rd metacarpals','Wrist flexion, radial deviation','Median nerve (C6–C7)'],
 'flexor carpi ulnaris':['Medial epicondyle; olecranon','Pisiform, hamate, 5th metacarpal','Wrist flexion, ulnar deviation','Ulnar nerve (C7–C8)'],'flexor digitorum superficialis':['Medial epicondyle, coronoid, radius','Middle phalanges 2–5','Flexes PIP and MCP joints','Median nerve (C7–T1)'],
 'extensor carpi radialis longus':['Lateral supracondylar ridge','Base of 2nd metacarpal','Wrist extension, radial deviation','Radial nerve (C6–C7)'],'extensor carpi radialis brevis':['Lateral epicondyle','Base of 3rd metacarpal','Wrist extension','Posterior interosseous nerve (C7–C8)'],
 'extensor carpi ulnaris':['Lateral epicondyle; posterior ulna','Base of 5th metacarpal','Wrist extension, ulnar deviation','Posterior interosseous nerve (C7–C8)'],
 supraspinatus:['Supraspinous fossa of scapula','Greater tubercle (superior facet)','Initiates abduction; compresses humeral head','Suprascapular nerve (C5–C6)'],infraspinatus:['Infraspinous fossa','Greater tubercle (middle facet)','External rotation','Suprascapular nerve (C5–C6)'],
 'teres minor':['Lateral border of scapula','Greater tubercle (inferior facet)','External rotation','Axillary nerve (C5–C6)'],subscapularis:['Subscapular fossa','Lesser tubercle','Internal rotation','Upper and lower subscapular nerves (C5–C7)'],
 'teres major':['Inferior angle of scapula','Medial lip of bicipital groove','Internal rotation, adduction, extension','Lower subscapular nerve (C5–C7)'],soleus:['Posterior fibula and soleal line of tibia','Calcaneus via Achilles tendon','Plantarflexion; postural control','Tibial nerve (S1–S2)'],
 'tibialis posterior':['Interosseous membrane, tibia, fibula','Navicular tuberosity, cuneiforms, metatarsals 2–4','Inversion, plantarflexion, supports medial arch','Tibial nerve (L4–L5)'],sartorius:['ASIS','Pes anserinus (medial tibia)','Hip flexion, abduction, external rotation; knee flexion','Femoral nerve (L2–L3)'],
 piriformis:['Anterior sacrum','Greater trochanter','External rotation of extended hip; abduction of flexed hip','Nerve to piriformis (S1–S2)'],'gluteus minimus':['External ilium','Anterior greater trochanter','Abduction, internal rotation','Superior gluteal nerve (L4–S1)'],
 'rhomboid major':['Spinous processes T2–T5','Medial border of scapula','Retraction, downward rotation','Dorsal scapular nerve (C4–C5)'],'rhomboid minor':['Spinous processes C7–T1','Medial border at spine of scapula','Retraction','Dorsal scapular nerve (C4–C5)'],
 'levator scapulae':['Transverse processes C1–C4','Superior angle of scapula','Elevation, downward rotation','Dorsal scapular nerve, C3–C4'],masseter:['Zygomatic arch','Angle and ramus of mandible','Elevates mandible (closes jaw)','Masseteric nerve (CN V3)'],
 temporalis:['Temporal fossa','Coronoid process of mandible','Elevates and retracts mandible','Deep temporal nerves (CN V3)'],'transversus abdominis':['Thoracolumbar fascia, iliac crest, costal cartilages 7–12','Linea alba, pubic crest','Compresses abdomen; stiffens lumbar spine','T7–L1']};
function curatedFor(m,V1){
  const n=m.n.toLowerCase();
  for(const [re,id] of CUR_MAP)if(re.test(n)&&V1.byId[id])return V1.byId[id];
  return null;
}
function limbFor(m){const n=m.n.toLowerCase().replace(/ muscle$/,'');for(const k of Object.keys(LIMB))if(n.includes(k))return LIMB[k];return null;}
function histoFor(m,cur){
  if(cur&&cur.histo)return cur.histo;const n=m.n.toLowerCase();
  return {bone:'bone',cartilage:'cartilage',tooth:'bone',ligament:'tendon',fascia:'tendon',tendon:'tendon',muscle:'skm',heart:'cardiac',artery:/aort|carotid|pulmonary trunk|brachiocephalic trunk|subclavian/.test(n)?'elastic':'artery',vein:'artery',nerve:'nerve',cns:/spinal cord/.test(n)?'cord':'cortex',
    lymph:null,sense:null,skin:null,organ:/lung|bronch/.test(n)?'lung':/liver|hepat/.test(n)?'liver':/stomach/.test(n)?'stomach':/kidney|renal/.test(n)?'kidney':/colon|jejun|ile|duoden|intestin|caec|cec/.test(n)?'gut':null}[m.k]||null;
}

/* ================= kinds & looks ================= */
const LAYERS=[['skin','Skin'],['bone','Bones'],['joint','Ligaments, fascia & joints'],['muscle','Muscles'],['vessel','Heart & vessels'],['nerve','Nervous system'],['organ','Organs & glands']];
const KCOL={bone:0xe6dac4,cartilage:0xc9dde6,tooth:0xf3efe3,ligament:0xd9d2bf,tendon:0xe8e0cc,muscle:0xa8322e,fascia:0xd8cfc0,heart:0xa0282c,artery:0xd12f3c,vein:0x3b62c4,nerve:0xf0c64a,cns:0xe0b8b0,sense:0xd9c3b0,lymph:0x86c46a,organ:0xc98a7a,skin:0xe8b89a};
const SCOL={bone:0xbfe6ff,cartilage:0x9fd8ff,tooth:0xdff4ff,ligament:0x9fd8ff,tendon:0xdfe8ff,muscle:0xff5a4e,fascia:0xffb0a0,heart:0xff4d62,artery:0xff4d62,vein:0x6f9bff,nerve:0xffd35a,cns:0xffc8e0,sense:0xffd8b0,lymph:0x9cff80,organ:0xff9cc8,skin:0x5fb2ff};
const DOT={bone:'#e6dac4',cartilage:'#c9dde6',tooth:'#f3efe3',ligament:'#d9d2bf',tendon:'#e8e0cc',muscle:'#d8504a',fascia:'#d8cfc0',heart:'#c0303a',artery:'#ff4d55',vein:'#5b82e4',nerve:'#f2c94c',cns:'#e8c0b8',sense:'#d9c3b0',lymph:'#86c46a',organ:'#d49a8a',skin:'#e8b89a'};
const KNAME={bone:'Bone',cartilage:'Cartilage',tooth:'Tooth',ligament:'Ligament / joint',tendon:'Tendon',muscle:'Muscle',fascia:'Fascia / tendon',heart:'Heart',artery:'Artery',vein:'Vein',nerve:'Nerve',cns:'Central nervous system',sense:'Sense organ',lymph:'Lymphoid',organ:'Organ',skin:'Skin'};

/* ================= renderer ================= */
const vp=$('viewport');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.localClippingEnabled=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
vp.prepend(renderer.domElement);
const scene=new THREE.Scene();
scene.environment=new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer),.04).texture;
scene.add(new THREE.HemisphereLight(0xcfe6ff,0x201510,.5));
const key=new THREE.DirectionalLight(0xffffff,1.5);key.position.set(4,8,10);scene.add(key);
const rimL=new THREE.DirectionalLight(0x7fc4ff,1.0);rimL.position.set(-8,3,-8);scene.add(rimL);
const camera=new THREE.PerspectiveCamera(32,1,.05,400);camera.position.set(0,1.5,36);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=1.2;controls.maxDistance=90;controls.target.set(0,1.5,0);
const root=new THREE.Group();root.rotation.x=-Math.PI/2;root.scale.setScalar(.01);scene.add(root);
const clipPlane=new THREE.Plane(V3(0,-1,0),0);

/* ================= state ================= */
let ROOT0,MAN,V1,items=[],bones=[],skeleton,pickMats=[],SEGI={};
const ui={mode:'tissue',heat:true,fade:false,iso:false,section:false,sectionAxis:'y',sectionPos:.5,sel:null,hover:null,preset:null,labels:true,tab:'st',mtab:'spine',chain:null};
const layer={skin:false,bone:true,joint:false,muscle:true,vessel:true,nerve:true,organ:true};
const pose={};let restMinY=0,baseRootPos=new THREE.Vector3();

/* ================= build ================= */
function tissueMat(k){const c=new THREE.Color(KCOL[k]);if(k==='muscle')c.offsetHSL((Math.random()-.5)*.03,(Math.random()-.5)*.12,(Math.random()-.5)*.08);
  const m=new THREE.MeshStandardMaterial({color:c,roughness:k==='bone'?.62:k==='muscle'?.5:k==='skin'?.7:.4,metalness:0,side:(k==='muscle'||k==='skin'||k==='organ'||k==='cns')?THREE.DoubleSide:THREE.FrontSide,
    emissive:k==='nerve'?0x2a1c00:0x000000,transparent:k==='skin',opacity:k==='skin'?.35:1,depthWrite:k!=='skin'});
  m.userData.base=c.clone();m.userData.baseOpacity=m.opacity;m.userData.baseEm=m.emissive.clone();return m;}
function scanMat(k){return new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(SCOL[k])},uBoost:{value:0},uOpacity:{value:k==='skin'?.55:1}},clipping:true,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  vertexShader:`#include <common>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec3 vN;varying vec3 vV;
void main(){
#include <beginnormal_vertex>
#include <morphnormal_vertex>
#include <skinbase_vertex>
#include <skinnormal_vertex>
#include <defaultnormal_vertex>
#include <begin_vertex>
#include <morphtarget_vertex>
#include <skinning_vertex>
#include <project_vertex>
#include <clipping_planes_vertex>
vN=normalize(transformedNormal);vV=normalize(-mvPosition.xyz);}`,
  fragmentShader:`#include <common>
#include <clipping_planes_pars_fragment>
uniform vec3 uColor;uniform float uBoost;uniform float uOpacity;varying vec3 vN;varying vec3 vV;
void main(){
#include <clipping_planes_fragment>
float f=pow(1.0-abs(dot(normalize(vN),normalize(vV))),2.2);gl_FragColor=vec4(uColor*(0.08+1.4*f)*(1.0+uBoost),(0.05+0.8*f)*uOpacity);}`});}

function build(){
  const {lo,hi,seg,par,piv}=MAN;SEGI=Object.fromEntries(seg.map((s,i)=>[s,i]));
  bones=seg.map((n,i)=>{const b=new THREE.Bone();b.name=n;return b;});
  seg.forEach((n,i)=>{const p=V3(...piv[i]);if(par[i]<0){bones[i].position.copy(p);root.add(bones[i]);}else{bones[i].position.copy(p).sub(V3(...piv[par[i]]));bones[par[i]].add(bones[i]);}});
  root.updateMatrixWorld(true);ROOT0=root.matrixWorld.clone();skeleton=new THREE.Skeleton(bones);
  const rig=MAN.m;let idx=0;
  for(const m of rig){
    const buf=m.f;const bytes=BINS[buf];const q=new Uint16Array(bytes.buffer,m.o,m.v*3);const ix=new Uint16Array(bytes.buffer,m.o+m.v*6,m.t*3);
    const pos=new Float32Array(m.v*3);for(let i=0;i<m.v;i++)for(let a=0;a<3;a++)pos[i*3+a]=lo[a]+q[i*3+a]/65535*(hi[a]-lo[a]);
    const g=new THREE.BufferGeometry();g.setIndex(new THREE.BufferAttribute(new Uint16Array(ix),1));g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.computeVertexNormals();
    const it={i:idx++,m,name:m.n,side:m.s,kind:m.k,layer:m.f,grp:m.g,grp2:m.g2,visible:true,ratio:1};
    it.cur=curatedFor(m,V1);it.limb=m.k==='muscle'?limbFor(m):null;it.histo=histoFor(m,it.cur);
    it.tMat=tissueMat(m.k);it.sMat=scanMat(m.k);
    let mesh;
    if(m.sk){
      let o=m.o+m.v*6+m.t*6;const s0=new Uint8Array(bytes.buffer,o,m.v),s1=new Uint8Array(bytes.buffer,o+m.v,m.v),w0=new Uint8Array(bytes.buffer,o+2*m.v,m.v);
      const si=new Uint16Array(m.v*4),sw=new Float32Array(m.v*4);for(let i=0;i<m.v;i++){si[i*4]=s0[i];si[i*4+1]=s1[i];sw[i*4]=w0[i]/255;sw[i*4+1]=1-w0[i]/255;}
      g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));
      if(m.a){const A=V3(...m.a[0]),B=V3(...m.a[2]),ab=B.clone().sub(A),L2=ab.lengthSq();const mo=new Float32Array(m.v*3);const v=new THREE.Vector3();
        for(let i=0;i<m.v;i++){v.set(pos[i*3],pos[i*3+1],pos[i*3+2]).sub(A);const u=Math.max(0,Math.min(1,v.dot(ab)/L2));v.addScaledVector(ab,-u);const bl=Math.pow(Math.sin(Math.PI*u),1.3);mo[i*3]=v.x*bl;mo[i*3+1]=v.y*bl;mo[i*3+2]=v.z*bl;}
        g.morphAttributes.position=[new THREE.BufferAttribute(mo,3)];g.morphTargetsRelative=true;it.A=A;it.B=B;it.sa=m.a[1];it.sb=m.a[3];it.L0=A.distanceTo(B);}
      mesh=new THREE.SkinnedMesh(g,it.tMat);root.add(mesh);mesh.bind(skeleton,root.matrixWorld.clone());mesh.frustumCulled=false;
      if(m.a)mesh.morphTargetInfluences=[0];it.dom=m.dm;
    }else{
      mesh=new THREE.Mesh(g,it.tMat);const b=bones[m.rg];mesh.position.copy(V3(...piv[m.rg])).negate();b.add(mesh);it.dom=m.rg;
    }
    g.computeBoundingSphere();mesh.userData.i=it.i;it.mesh=mesh;it.c=V3(...m.c);items.push(it);
    const pm=new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(((it.i+1)&255)/255,(((it.i+1)>>8)&255)/255,(((it.i+1)>>16)&255)/255),toneMapped:false,side:THREE.DoubleSide});pickMats.push(pm);
  }
}

/* ================= joints ================= */
const DOFS={};const GROUPS_M={spine:'Spine',neck:'Neck & jaw',arm_r:'Right arm',arm_l:'Left arm',leg_r:'Right leg',leg_l:'Left leg'};
function defDofs(){
  const P=n=>V3(...MAN.piv[SEGI[n]]),LM=k=>V3(...MAN.lm[k]),AXv=k=>V3(...MAN.ax[k]);
  const X=V3(1,0,0),Y=V3(0,1,0),Z=V3(0,0,1);
  const lat=s=>s==='r'?-1:1; // lateral direction sign on x
  const add=(id,o)=>{DOFS[id]={...o,v:o.rest??0};pose[id]=o.rest??0;};
  add('trFlex',{g:'spine',lab:'Trunk flexion',min:-30,max:80,parts:[['lumbar',.45],['thorax',.55]],axis:X,test:[LM('headtop'),p=>p.y<0,'y']});
  add('trLat',{g:'spine',lab:'Side-bend (right +)',min:-35,max:35,parts:[['lumbar',.45],['thorax',.55]],axis:Y,test:[LM('headtop'),d=>d.x<0]});
  add('trRot',{g:'spine',lab:'Rotation (right +)',min:-45,max:45,parts:[['lumbar',.25],['thorax',.75]],axis:Z,test:[LM('sternum'),d=>d.x<0]});
  add('nkFlex',{g:'neck',lab:'Neck flexion',min:-60,max:50,parts:[['neck',.6],['head',.4]],axis:X,test:[LM('headtop'),d=>d.y<0]});
  add('nkRot',{g:'neck',lab:'Neck rotation (right +)',min:-80,max:80,parts:[['neck',.55],['head',.45]],axis:Z,test:[LM('nose'),d=>d.x<0]});
  add('nkLat',{g:'neck',lab:'Neck side-bend (right +)',min:-45,max:45,parts:[['neck',.6],['head',.4]],axis:Y,test:[LM('headtop'),d=>d.x<0]});
  add('jaw',{g:'neck',lab:'Mouth opening',min:0,max:30,parts:[['jaw',1]],axis:X,test:[LM('chin'),d=>d.z<0]});
  for(const s of ['r','l']){const S=s==='r'?'Right':'Left';
    add('shFlex.'+s,{g:'arm_'+s,lab:'Shoulder flexion',min:-50,max:180,parts:[['hum.'+s,1]],axis:X,test:[LM('elbow.'+s),d=>d.y<0]});
    add('shAbd.'+s,{g:'arm_'+s,lab:'Shoulder abduction',min:0,max:180,parts:[['hum.'+s,1]],axis:Y,test:[LM('elbow.'+s),d=>d.x*lat(s)>0]});
    add('shRot.'+s,{g:'arm_'+s,lab:'Shoulder rotation (IR +)',min:-90,max:70,parts:[['hum.'+s,1]],axis:P('ulna.'+s).sub(P('hum.'+s)).normalize(),test:[LM('medepi.'+s),d=>d.y>0]});
    add('elbow.'+s,{g:'arm_'+s,lab:'Elbow flexion',min:0,max:150,parts:[['ulna.'+s,1]],axis:AXv('el.'+s),test:[LM('wrist.'+s),d=>d.y<0]});
    add('fore.'+s,{g:'arm_'+s,lab:'Forearm (sup − / pro +)',min:-80,max:80,rest:-80,off:80,parts:[['rad.'+s,1]],axis:AXv('pr.'+s),test:[LM('thumb.'+s),d=>d.x*lat(s)<0,90]});
    add('wrist.'+s,{g:'arm_'+s,lab:'Wrist (ext − / flex +)',min:-70,max:80,parts:[['hand.'+s,1]],axis:X,test:[LM('finger.'+s),d=>d.y<0]});
    add('hipFlex.'+s,{g:'leg_'+s,lab:'Hip flexion',min:-30,max:120,parts:[['fem.'+s,1]],axis:X,test:[LM('knee.'+s),d=>d.y<0]});
    add('hipAbd.'+s,{g:'leg_'+s,lab:'Hip abduction',min:-30,max:45,parts:[['fem.'+s,1]],axis:Y,test:[LM('knee.'+s),d=>d.x*lat(s)>0]});
    add('hipRot.'+s,{g:'leg_'+s,lab:'Hip rotation (IR +)',min:-45,max:45,parts:[['fem.'+s,1]],axis:P('leg.'+s).sub(P('fem.'+s)).normalize(),test:[LM('patella.'+s),d=>d.x*lat(s)<0]});
    add('knee.'+s,{g:'leg_'+s,lab:'Knee flexion',min:0,max:135,parts:[['leg.'+s,1]],axis:X,test:[LM('ankle.'+s),d=>d.y>0]});
    add('ankle.'+s,{g:'leg_'+s,lab:'Ankle (plantar − / dorsi +)',min:-50,max:20,parts:[['foot.'+s,1]],axis:AXv('ank.'+s),test:[LM('toe.'+s),d=>d.z>0]});
  }
  // calibrate signs
  for(const [id,d] of Object.entries(DOFS)){
    const pv=P(d.parts[0][0]);const [pt,fn,ang]=d.test;const q=new THREE.Quaternion().setFromAxisAngle(d.axis,(ang||30)*Math.PI/180);
    const moved=pt.clone().sub(pv).applyQuaternion(q).add(pv);d.sg=fn(moved.clone().sub(pt))?1:-1;
  }
  const g=V3(0,1,0);for(const s of ['r','l']){const pv=P('girdle.'+s),gh=P('hum.'+s);const q=new THREE.Quaternion().setFromAxisAngle(g,30*Math.PI/180);DOFS['_g.'+s]={sg:gh.clone().sub(pv).applyQuaternion(q).add(pv).z>gh.z?1:-1};}
}
const qa=new THREE.Quaternion();
let rhythm={};
function applyPose(){
  bones.forEach(b=>b.quaternion.identity());
  const eff={...pose};
  for(const s of ['r','l']){const f=Math.max(0,eff['shFlex.'+s]),a=eff['shAbd.'+s],e=f+a,g=Math.min(60,e/3);rhythm[s]={g,gh:e-g};
    qa.setFromAxisAngle(V3(0,1,0),DOFS['_g.'+s].sg*g*Math.PI/180);bones[SEGI['girdle.'+s]].quaternion.copy(qa);bones[SEGI['hum.'+s]].quaternion.copy(qa).invert();}
  const order=['trLat','trFlex','trRot','nkLat','nkFlex','nkRot','jaw'];for(const s of ['r','l'])order.push('shAbd.'+s,'shFlex.'+s,'shRot.'+s,'elbow.'+s,'fore.'+s,'wrist.'+s,'hipAbd.'+s,'hipFlex.'+s,'hipRot.'+s,'knee.'+s,'ankle.'+s);
  for(const id of order){const d=DOFS[id];const val=(eff[id]+(d.off||0))*d.sg*Math.PI/180;if(!val)continue;
    for(const [seg,fr] of d.parts){qa.setFromAxisAngle(d.axis,val*fr);bones[SEGI[seg]].quaternion.multiply(qa);}}
  // ground contact
  root.position.copy(baseRootPos);root.updateMatrixWorld(true);
  const anchor=ui.preset&&PRESETS[ui.preset].anchor;
  if(anchor){const w=worldLM(anchor);root.position.add(restLMW[anchor].clone().sub(w));}
  else{let mn=1e9;for(const k of FOOTLM){mn=Math.min(mn,worldLM(k).y);}root.position.y+=restMinY-mn;}
  root.updateMatrixWorld(true);
  // muscle lengths & bulge
  for(const it of items){if(!it.A)continue;const a=bonePt(it.sa,it.A),b=bonePt(it.sb,it.B);it.ratio=a.distanceTo(b)/(it.L0*.01);
    it.mesh.morphTargetInfluences[0]=Math.max(-.22,Math.min(.4,(1/Math.sqrt(it.ratio)-1)*1.4));}
  paint();dirty=true;
}
const _m=new THREE.Matrix4();
function bonePt(si,p){_m.multiplyMatrices(bones[si].matrixWorld,skeleton.boneInverses[si]);return p.clone().applyMatrix4(ROOT0).applyMatrix4(_m);}
const LMSEG={};let FOOTLM=[],restLMW={};
function worldLM(k){return bonePt(LMSEG[k],V3(...MAN.lm[k]));}
function setupLM(){
  const S=SEGI;for(const s of ['r','l']){LMSEG['toe.'+s]=S['foot.'+s];LMSEG['heel.'+s]=S['foot.'+s];LMSEG['ankle.'+s]=S['foot.'+s];LMSEG['fingerTip.'+s]=S['hand.'+s];}
  LMSEG.headtop=S.head;FOOTLM=['toe.r','heel.r','toe.l','heel.l'];
  root.position.set(0,0,0);root.updateMatrixWorld(true);
  baseRootPos.set(0,-7.3,0);root.position.copy(baseRootPos);root.updateMatrixWorld(true);
  restMinY=Math.min(...FOOTLM.map(k=>worldLM(k).y));for(const k of Object.keys(LMSEG))restLMW[k]=worldLM(k);
}

/* ================= presets ================= */
const sm=t=>t*t*(3-2*t);
const PRESETS={
 walk:{ab:'WALK',name:'Walking gait',T:1.2,f:t=>{const w=2*Math.PI*t,sr=Math.sin(w),sl=Math.sin(w+Math.PI);const leg=(s,x)=>({['hipFlex.'+s]:8+20*x,['knee.'+s]:Math.max(4,32+30*Math.sin(w*1+(s==='r'?-1.2:Math.PI-1.2))),['ankle.'+s]:-4+10*Math.sin(w+(s==='r'?.4:Math.PI+.4))});
   return {...leg('r',sr),...leg('l',sl),'shFlex.r':-18*sr,'shFlex.l':-18*sl,'elbow.r':22,'elbow.l':22,'fore.r':0,'fore.l':0,trRot:5*sr};}},
 squat:{ab:'SQUAT',name:'Squat',T:3.2,kf:[[0,{}],[1.6,{'hipFlex.r':100,'hipFlex.l':100,'knee.r':120,'knee.l':120,'ankle.r':22,'ankle.l':22,trFlex:35,'shFlex.r':90,'shFlex.l':90,'fore.r':0,'fore.l':0}],[3.2,{}]],anchor:'ankle.r'},
 reach:{ab:'REACH',name:'Overhead reach',T:3.2,kf:[[0,{}],[1.6,{'shFlex.r':170,'shFlex.l':170,trFlex:-12,'fore.r':0,'fore.l':0}],[3.2,{}]]},
 curl:{ab:'CURL',name:'Biceps curl (right)',T:2.4,kf:[[0,{'elbow.r':5}],[1.2,{'elbow.r':145}],[2.4,{'elbow.r':5}]]},
 throw:{ab:'THROW',name:'Overhead throw (right)',T:2.6,kf:[[0,{'shAbd.r':30,'elbow.r':30,'fore.r':0}],[.9,{'shAbd.r':90,'shRot.r':-90,'elbow.r':95,'trRot':-30,'hipFlex.l':25,'knee.l':30,'fore.r':0}],[1.35,{'shAbd.r':95,'shRot.r':40,'elbow.r':20,trRot:35,trFlex:25,'hipFlex.l':45,'knee.l':40,'wrist.r':40,'fore.r':40}],[2.6,{'shAbd.r':30,'elbow.r':30,'fore.r':0}]]},
 neck:{ab:'NECK',name:'Neck rotation',T:3,kf:[[0,{}],[.75,{nkRot:70}],[2.25,{nkRot:-70}],[3,{}]]},
 jaw:{ab:'JAW',name:'Mouth opening',T:2,kf:[[0,{}],[1,{jaw:26}],[2,{}]]},
 valg:{ab:'VALG',name:'Single-leg squat with knee valgus',T:3.4,chain:'val',anchor:'ankle.r',kf:[[0,{'hipFlex.l':40,'knee.l':70}],[1.7,{'hipFlex.r':70,'knee.r':80,'ankle.r':20,'hipAbd.r':-14,'hipRot.r':22,trFlex:25,'hipFlex.l':45,'knee.l':80,trLat:-8}],[3.4,{'hipFlex.l':40,'knee.l':70}]]}
};
let presetT0=0;
function runPreset(now){const P=PRESETS[ui.preset];const t=((now-presetT0)/1000)%P.T;let tgt;
  if(P.f)tgt=P.f(t/P.T);else{const kf=P.kf;let i=0;while(i<kf.length-2&&t>kf[i+1][0])i++;const [t0,a]=kf[i],[t1,b]=kf[i+1];const u=sm((t-t0)/(t1-t0));tgt={};
    for(const id of Object.keys(DOFS)){if(id.startsWith('_'))continue;const r=DOFS[id].rest??0;const av=a[id]??r,bv=b[id]??r;tgt[id]=av+(bv-av)*u;}}
  for(const id of Object.keys(pose)){pose[id]=tgt[id]??(DOFS[id].rest??0);}applyPose();}

/* ================= appearance ================= */
const HOT=new THREE.Color(0xff7a2e),COOL=new THREE.Color(0x3f7dff),SELC=new THREE.Color(0x3fd8ff),AMB=new THREE.Color(0xffb04a);const _c=new THREE.Color();
let chainSet=new Set();
function paint(){
  const selSet=ui.sel!=null?new Set([ui.sel]):null;
  for(const it of items){
    const isSel=ui.sel===it.i,isHov=ui.hover===it.i,inCh=chainSet.has(it.i);const focus=selSet||chainSet.size;
    const dim=focus&&!isSel&&!inCh&&(ui.fade||ui.iso);
    it.mesh.visible=it.visible&&(layer[it.layer]||isSel||inCh)&&!(ui.iso&&focus&&!isSel&&!inCh);
    if(!it.mesh.visible)continue;
    const d=it.A?(it.ratio-1):0,k=Math.min(1,Math.abs(d)/.3);
    if(ui.mode==='tissue'){const m=it.tMat;if(it.mesh.material!==m)it.mesh.material=m;
      _c.copy(m.userData.base);if(ui.heat&&it.A&&Math.abs(d)>.01)_c.lerp(d<0?HOT:COOL,k*.85);m.color.copy(_c);
      m.emissive.copy(isSel||isHov?SELC:inCh?AMB:m.userData.baseEm);m.emissiveIntensity=isSel?.5:isHov?.25:inCh?.45:1;
      const op=dim?.1:m.userData.baseOpacity;const tr=op<1;if(m.transparent!==tr){m.transparent=tr;m.needsUpdate=true;}m.opacity=op;m.depthWrite=!tr;
      const cp=ui.section?[clipPlane]:null;if((m.clippingPlanes||null)!==cp){m.clippingPlanes=cp;m.needsUpdate=true;}}
    else{const m=it.sMat;if(it.mesh.material!==m)it.mesh.material=m;_c.set(SCOL[it.kind]);if(ui.heat&&it.A&&Math.abs(d)>.01)_c.lerp(d<0?HOT:COOL,k);
      m.uniforms.uColor.value.copy(isSel?SELC:inCh?AMB:_c);m.uniforms.uBoost.value=isSel?1.2:isHov||inCh?.6:0;m.uniforms.uOpacity.value=(dim?.2:1)*(it.kind==='skin'?.55:1);
      const cp=ui.section?[clipPlane]:null;if((m.clippingPlanes||null)!==cp){m.clippingPlanes=cp;m.needsUpdate=true;}}
  }
}
function setSection(){const ax=ui.sectionAxis;const box={y:[0,18],z:[-2.2,2.2],x:[-3,3]}[ax];const c=box[0]+(box[1]-box[0])*ui.sectionPos;
  const n=ax==='y'?V3(0,-1,0):ax==='z'?V3(0,0,-1):V3(1,0,0);clipPlane.set(n,ax==='x'?-c:c);paint();}

/* ================= picking (GPU) ================= */
const pickRT=new THREE.WebGLRenderTarget(1,1);const pix=new Uint8Array(4);
function pick(e){
  const r=renderer.domElement.getBoundingClientRect();const x=(e.clientX-r.left)*renderer.getPixelRatio(),y=(e.clientY-r.top)*renderer.getPixelRatio();
  const W=r.width*renderer.getPixelRatio(),H=r.height*renderer.getPixelRatio();
  const saved=[];for(const it of items){if(!it.mesh.visible)continue;if(it.kind==='skin'&&ui.mode!=='scan'&&it.mesh.material.opacity<.5){it.mesh.visible=false;saved.push([it,null]);continue;}
    if(it.mesh.material.transparent&&it.mesh.material.opacity<.3){it.mesh.visible=false;saved.push([it,null]);continue;}
    saved.push([it,it.mesh.material]);const pm=pickMats[it.i];pm.clippingPlanes=ui.section?[clipPlane]:null;it.mesh.material=pm;}
  const env=scene.environment;scene.environment=null;camera.setViewOffset(W,H,x,y,1,1);renderer.setRenderTarget(pickRT);renderer.setClearColor(0,0);renderer.clear();renderer.render(scene,camera);
  renderer.readRenderTargetPixels(pickRT,0,0,1,1,pix);renderer.setRenderTarget(null);camera.clearViewOffset();scene.environment=env;
  for(const [it,m] of saved){if(m)it.mesh.material=m;else it.mesh.visible=true;}
  const id=pix[0]|(pix[1]<<8)|(pix[2]<<16);return id?id-1:null;
}

/* ================= ring & slots ================= */
const IC={skin:'<path d="M12 3c-2 0-3 1.5-3 3.5S10 10 12 10s3-1.5 3-3.5S14 3 12 3zM7 21l1-8 4-2 4 2 1 8"/>',bone:'<path d="M6.5 17.5L17.5 6.5"/><circle cx="5" cy="16.2" r="2"/><circle cx="7.8" cy="19" r="2"/><circle cx="16.2" cy="5" r="2"/><circle cx="19" cy="7.8" r="2"/>',
 joint:'<circle cx="12" cy="12" r="5"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',muscle:'<path d="M3 12c4-6.5 14-6.5 18 0-4 6.5-14 6.5-18 0z"/><path d="M6 12h12M7.5 9.6c3 1 6 1 9 0M7.5 14.4c3-1 6-1 9 0"/>',
 vessel:'<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',nerve:'<path d="M12 3v18M12 8L7 5M12 8l5-3M12 14l-6 2.5M12 14l6 2.5"/>',organ:'<path d="M12 4v7M9.5 7.5C6.5 7.5 4 12 4 17c0 2 2 2 4 1s2-3 2-6M14.5 7.5c3 0 5.5 4.5 5.5 9.5 0 2-2 2-4 1s-2-3-2-6"/>',
 heat:'<path d="M12 3c3 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.5 2 1.5 3 3 3-1-3 0-6 0-8.5z"/>',fade:'<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5" stroke-dasharray="2 2"/>',iso:'<circle cx="12" cy="12" r="3"/><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/>',
 section:'<path d="M4 16l8-4 8 4-8 4z"/><path d="M4 9l8-4 8 4-8 4z" stroke-dasharray="2 2"/>',labels:'<circle cx="5" cy="18" r="1.6"/><path d="M6 17l5-5h8M13 8h6"/>',
 ant:'<circle cx="12" cy="5" r="2"/><path d="M12 7v8M7 10l5-1 5 1M12 15l-3 6M12 15l3 6"/>',rside:'<circle cx="12" cy="5" r="2"/><path d="M12 7v8l1 6M12 10l3 3"/>',post:'<circle cx="12" cy="5" r="2"/><path d="M12 7v8M7 10l5-1 5 1M12 15l-3 6M12 15l3 6" stroke-dasharray="2.5 1.5"/>',lside:'<circle cx="12" cy="5" r="2"/><path d="M12 7v8l-1 6M12 10l-3 3"/>',fit:'<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>'};
const svgI=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;
const SLOTS=[];
LAYERS.forEach(([k,n],i)=>SLOTS.push({kind:'hi',key:k,a:-126+i*12,t:n,d:'Show or hide this layer'}));
[['ant','Anterior view'],['rside','Right side view'],['post','Posterior view'],['lside','Left side view'],['fit','Fit whole body']].forEach(([k,n],i)=>SLOTS.push({kind:'mid',key:k,a:-23+i*11.5,t:n,d:'Move the camera'}));
Object.entries(PRESETS).forEach(([k,p],i)=>SLOTS.push({kind:'low',key:k,a:140.5-i*11.5,t:p.name,d:'Play this movement on loop'}));
[['heat','Muscle activity','Colour muscles by shortening (orange) or lengthening (blue)'],['fade','Fade others','Ghost everything except the selection'],['iso','Isolate','Show only the selection'],['section','Cross-section','Cut through the body with a plane'],['labels','Labels','Pin names to the selection and chain links']].forEach(([k,n,d],i)=>SLOTS.push({kind:'rig',key:k,a:156+i*12,t:n,d}));
const pol=(a,r)=>{const t=a*Math.PI/180;return[(500+r*Math.cos(t)).toFixed(1),(500+r*Math.sin(t)).toFixed(1)];};
function arcD(r,a0,a1){const [x0,y0]=pol(a0,r),[x1,y1]=pol(a1,r);return `M${x0} ${y0} A${r} ${r} 0 ${Math.abs(a1-a0)>180?1:0} ${a1>a0?1:0} ${x1} ${y1}`;}
function buildRing(){
  let h=`<circle cx="500" cy="500" r="497" fill="none" stroke="#1a2730" stroke-width="2"/><circle cx="500" cy="500" r="418" fill="none" stroke="rgba(9,14,19,.92)" stroke-width="74"/><circle cx="500" cy="500" r="381" fill="none" stroke="#23323d" stroke-width="1.5"/><circle cx="500" cy="500" r="455" fill="none" stroke="#23323d" stroke-width="1.5"/><circle cx="500" cy="500" r="373" fill="none" stroke="#2c3e4a" stroke-width="2"/>`;
  for(let a=0;a<360;a+=2){const mj=a%10===0;const [x0,y0]=pol(a,459),[x1,y1]=pol(a,mj?470:464);h+=`<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${mj?'#3e5362':'#27363f'}" stroke-width="${mj?2:1.2}"/>`;}
  [['hi',-126,-54,'#58c7e0','LAYERS'],['mid',-23,23,'#8aa0ae','CAMERA'],['low',60,140.5,'#f0b25a','MOVEMENTS'],['rig',156,204,'#8aa0ae','TOOLS']].forEach(([k,a0,a1,col,lab],i)=>{
    h+=`<path d="${arcD(377,a0-6,a1+6)}" fill="none" stroke="${col}" stroke-opacity=".55" stroke-width="3"/>`;const mid=(a0+a1)/2,bottom=mid>20&&mid<160,span=lab.length*2.2;const d=bottom?arcD(488,mid+span,mid-span):arcD(476,mid-span,mid+span);
    h+=`<path id="lp${i}" d="${d}" fill="none"/><text font-size="13" letter-spacing="3" fill="#6f828f" font-family="Barlow Semi Condensed,sans-serif" font-weight="600"><textPath href="#lp${i}" startOffset="50%" text-anchor="middle">${lab}</textPath></text>`;});
  h+=`<path d="${arcD(479,28,52)}" fill="none" stroke="#141f27" stroke-width="9"/><path d="${arcD(492,28,52)}" fill="none" stroke="#141f27" stroke-width="9"/><path id="gA" d="${arcD(479,52,28)}" pathLength="100" fill="none" stroke="#58c7e0" stroke-width="9" stroke-dasharray="0 100"/><path id="gB" d="${arcD(492,52,28)}" pathLength="100" fill="none" stroke="#f0b25a" stroke-width="9" stroke-dasharray="0 100"/>`;
  $('ringSvg').innerHTML=h;
  $('slots').innerHTML=SLOTS.map((d,i)=>{const t=d.a*Math.PI/180;return `<button class="slot ${d.kind}" data-i="${i}" style="left:${(50+41.8*Math.cos(t)).toFixed(2)}%;top:${(50+41.8*Math.sin(t)).toFixed(2)}%" aria-label="${esc(d.t)}">${d.kind==='low'?`<span class="ab">${PRESETS[d.key].ab}</span>`:svgI(d.key)}</button>`;}).join('');
}
function updSlots(){document.querySelectorAll('.slot').forEach(b=>{const d=SLOTS[+b.dataset.i];const on=d.kind==='hi'?layer[d.key]:d.kind==='low'?ui.preset===d.key:d.kind==='rig'?!!ui[d.key]:false;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);});}
function slotClick(d){
  if(d.kind==='hi'){layer[d.key]=!layer[d.key];paint();toast(`${d.t} ${layer[d.key]?'shown':'hidden'}`);}
  else if(d.kind==='mid')camTo(d.key);
  else if(d.kind==='low'){ui.preset=ui.preset===d.key?null:d.key;presetT0=performance.now();if(!ui.preset)resetPose(false);
    const p=ui.preset&&PRESETS[ui.preset];if(p&&p.chain)loadChain(p.chain,true);toast(ui.preset?`Playing: ${PRESETS[d.key].name}`:'Stopped');renderStats();}
  else{ui[d.key]=!ui[d.key];if(d.key==='section'){setSection();renderStats();}paint();toast(`${d.t} ${ui[d.key]?'on':'off'}`);}
  updSlots();renderBrowser();dirty=true;
}

/* ================= camera ================= */
let camAnim=null;
function tween(p1,t1){camAnim={s:performance.now(),p0:camera.position.clone(),t0:controls.target.clone(),p1,t1};}
function camTo(k){const t=controls.target.clone();const D=k==='fit'?36:Math.max(8,camera.position.distanceTo(t));
  const dir={ant:V3(0,0,1),post:V3(0,0,-1),rside:V3(-1,0,0),lside:V3(1,0,0),fit:V3(0,0,1)}[k];const tt=k==='fit'?V3(0,1.5,0):t;tween(tt.clone().addScaledVector(dir,D),tt);}
function focusSel(){const it=items[ui.sel];if(!it)return;const p=selWorld(it);const d=camera.position.clone().sub(controls.target).normalize();const r=it.mesh.geometry.boundingSphere.radius*.01;tween(p.clone().addScaledVector(d,Math.max(2.2,r*6)),p);}
function selWorld(it){return bonePt(it.dom,it.c);}

/* ================= kinetic chains ================= */
function loadChain(id,keep){
  if(ui.chain===id&&!keep){ui.chain=null;chainSet=new Set();}
  else{ui.chain=id;const ch=V1.chains.find(c=>c.id===id);chainSet=new Set();ch._links=ch.seq.map(([cid,side])=>{const its=items.filter(it=>it.cur&&it.cur.id===cid&&(side==='M'||it.side===side||it.side==='M'||ch.both));its.forEach(x=>chainSet.add(x.i));return its;});}
  paint();renderStats();renderBrowser();
}
function updChainPins(){const box=$('cpins');if(!ui.chain||!ui.labels){box.innerHTML='';return;}const ch=V1.chains.find(c=>c.id===ui.chain);let h='';
  ch._links.forEach((its,k)=>{if(!its.length)return;const p=V3(0,0,0);its.forEach(it=>p.add(selWorld(it)));p.divideScalar(its.length).project(camera);if(p.z>1)return;
    h+=`<div class="cpin" style="transform:translate(${((p.x+1)/2*vp.clientWidth).toFixed(1)}px,${((1-p.y)/2*vp.clientHeight).toFixed(1)}px)">${k+1}</div>`;});box.innerHTML=h;}

/* ================= panels ================= */
let dirty=true;const closed={};
function sec(id,title,val,body,cls=''){return `<section class="sec${closed[id]?' closed':''}"><button class="sec-h" data-tog="${id}"><span class="caret"></span>${title}<span class="v ${cls}">${val}</span></button><div class="sec-b">${body}</div></section>`;}
const ul=a=>`<ul class="ls">${a.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
function fmt(id,v){const d=DOFS[id];if(id.startsWith('fore'))return v<0?`${Math.round(-v)}° sup`:v>0?`${Math.round(v)}° pro`:'neutral';if(id.startsWith('wrist'))return v<0?`${Math.round(-v)}° ext`:v>0?`${Math.round(v)}° flex`:'0°';if(id.startsWith('ankle'))return v<0?`${Math.round(-v)}° plantar`:v>0?`${Math.round(v)}° dorsi`:'0°';return Math.round(v)+'°';}
function dispName(it){return it.name+(it.side!=='M'?` (${SIDE[it.side]})`:'');}
function renderStats(){
  const mt=ui.mtab;const tabs=Object.entries(GROUPS_M).map(([k,n])=>`<button data-mtab="${k}" aria-pressed="${k===mt}">${n}</button>`).join('');
  const sl=Object.entries(DOFS).filter(([id,d])=>d.g===mt).map(([id,d])=>`<label for="s-${id}">${esc(d.lab)}</label><input type="range" id="s-${id}" data-k="${id}" min="${d.min}" max="${d.max}" step="1" value="${pose[id]}"><output id="o-${id}"></output>`).join('');
  let h=sec('mot','Motion',ui.preset?PRESETS[ui.preset].name:'Manual',`<div class="mtabs">${tabs}</div><div class="mot">${sl}</div>${mt.startsWith('arm')?'<div class="rhythm" id="rhythm"></div>':''}<div class="acts"><button class="btn" data-act="reset">Anatomical position</button>${ui.preset?'<button class="btn" data-act="stop">Stop movement</button>':''}</div>`,ui.preset?'amb':'acc');
  h+=sec('act','Muscle activity','<span id="actN"></span>',`<div class="legend"><span class="a">Shortening</span><span class="b">Lengthening</span></div><div class="act" id="actList"></div><p class="sum" style="font-size:12.5px;color:var(--dim)">Change in origin-to-insertion distance from anatomical position. Shortening is not always active contraction: gravity-driven movements are often controlled by muscles lengthening.</p>`);
  if(ui.chain){const ch=V1.chains.find(c=>c.id===ui.chain);
    h+=sec('chain','Kinetic chain',esc(ch.type),`<div><div class="nm">${esc(ch.name)}</div><div class="lat">${esc(ch.src)}</div></div><p class="sum">${esc(ch.fn)}</p><div class="sub">Sequence</div><ol class="seq">${ch.seq.map(([cid,side,note],k)=>{const its=ch._links[k]||[];return `<li><button data-sel="${its[0]?its[0].i:''}"><span><span class="n">${esc(V1.byId[cid]?.name||cid)}</span><span class="x">${esc(note)}</span></span><span class="sd">${side==='M'?'Midline':side==='R'?'Right':'Left'}</span></button></li>`;}).join('')}</ol><div class="sub">When it fails</div>${ul(ch.dys)}<div class="sub">Assess with</div>${ul(ch.as)}<div class="acts"><button class="btn" data-act="unchain">Unload chain</button></div>`,'amb');}
  if(ui.sel!=null){const it=items[ui.sel];const c=it.cur;const L=it.limb;
    let body=`<div><div class="nm">${esc(dispName(it))}</div>${c&&c.lat?`<div class="lat">${esc(c.lat)}</div>`:''}</div><div class="chips"><span class="chip c">${KNAME[it.kind]}</span>${it.grp?`<span class="chip">${esc(it.grp)}</span>`:''}${it.grp2?`<span class="chip">${esc(it.grp2)}</span>`:''}</div>`;
    if(it.A)body+=`<div class="live"><span>Length now</span><b id="liveLen">—</b></div>`;
    if(L&&!(c&&c.a&&it.kind==='muscle'&&c.sys==='muscular'))body+=`<dl class="kv"><dt>Origin</dt><dd>${esc(L[0])}</dd><dt>Insertion</dt><dd>${esc(L[1])}</dd><dt>Action</dt><dd>${esc(L[2])}</dd><dt>Nerve</dt><dd>${esc(L[3])}</dd></dl>`;
    if(c){body+=`<p class="sum">${esc(c.sum)}</p>`;if(c.a)body+=`<dl class="kv">${c.a.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;if(c.act)body+=`<div class="sub">Actions</div>${ul(c.act)}`;}
    if(!c&&!L)body+=`<p class="sum" style="color:var(--dim)">Part of ${esc(it.grp||KNAME[it.kind])}. Detailed notes for this structure are not written yet.</p>`;
    body+=`<div class="acts"><button class="btn" data-act="focus">Focus</button><button class="btn" data-act="fade">${ui.fade?'Unfade':'Fade others'}</button><button class="btn" data-act="iso">${ui.iso?'Show all':'Isolate'}</button><button class="btn" data-act="hide">Hide</button><button class="btn" data-act="clear">Clear</button></div>`;
    h+=sec('sel','Selection',KNAME[it.kind],body,'acc');
    if(it.histo&&typeof HISTO!=='undefined'&&HISTO[it.histo]){const H=HISTO[it.histo];h+=sec('his','Histology',esc(H.t),`<canvas class="histo" data-h="${it.histo}" aria-label="Illustrated micrograph of ${esc(H.t)}"></canvas><div class="hcap"><span>${esc(H.stain)}</span><span>${esc(H.mag)} · illustrative</span></div><p class="sum">${esc(H.d)}</p><div class="sub">Look for</div>${ul(H.feat)}`);}
    if(c&&c.t)h+=sec('dx','Diagnostics',`${c.t.length} tests`,`<div class="sub">Clinical tests</div><div class="tests">${c.t.map(([n,d])=>`<div class="test"><b>${esc(n)}</b><span>${esc(d)}</span></div>`).join('')}</div><div class="sub">Common conditions</div>${ul(c.p||[])}${c.rf?`<div class="flag"><b>Red flag</b>${esc(c.rf)}</div>`:''}`,'amb');
    if(c&&c.chains&&c.chains.length)h+=sec('mem','Kinetic chains',`${c.chains.length}`,`<div class="chips">${c.chains.map(cid=>{const ch=V1.chains.find(x=>x.id===cid);return `<button class="chip" style="cursor:pointer;color:#ffd9a3;border-color:rgba(240,178,90,.55)" data-chain="${cid}">${ch.ab} · ${esc(ch.name)}</button>`;}).join('')}</div>`,'amb');
  }
  if(ui.section)h+=sec('cut','Cross-section',{y:'Transverse',z:'Coronal',x:'Sagittal'}[ui.sectionAxis],`<div class="acts">${['y','z','x'].map(a=>`<button class="btn" data-axis="${a}" ${a===ui.sectionAxis?'style="border-color:var(--acc);color:#fff"':''}>${{y:'Transverse',z:'Coronal',x:'Sagittal'}[a]}</button>`).join('')}</div><div class="cut"><input type="range" id="cutPos" min="0" max="100" value="${Math.round(ui.sectionPos*100)}" aria-label="Cut position"><output id="cutO">${Math.round(ui.sectionPos*100)}%</output></div>`);
  h+=sec('about','About this model','',`<p class="sum" style="font-size:13px">${items.length.toLocaleString()} structures from the Z-Anatomy atlas, simplified for real-time use. The skeleton is rigged at 22 segments with joint axes set from bony landmarks; soft tissues follow the bones nearest to them, and muscles bulge as they shorten. Nerves and vessels are drawn as tubes along their atlas paths.</p>`);
  h+=`<p class="foot">3D models: Z-Anatomy by Gauthier Kervyn (CC BY-SA 4.0), derived from BodyParts3D © The Database Center for Life Science (CC BY-SA 2.1 Japan); skin surface from BodyParts3D. Educational reference; not a diagnostic device. ${esc(VERSION)}</p>`;
  $('stats').innerHTML=h;$('stats').querySelectorAll('canvas.histo').forEach(cv=>window.drawHisto&&drawHisto(cv,cv.dataset.h));dirty=true;
}
function updOutputs(){
  for(const id of Object.keys(DOFS)){const o=$('o-'+id);if(!o)continue;o.textContent=fmt(id,pose[id]);const s=$('s-'+id);if(s&&document.activeElement!==s)s.value=pose[id];}
  const r=$('rhythm');if(r){const s=ui.mtab.slice(-1);const R=rhythm[s];r.innerHTML=R&&R.g>0?`Scapulohumeral rhythm: <b>${Math.round(R.gh)}°</b> glenohumeral + <b>${Math.round(R.g)}°</b> scapulothoracic`:'Scapulohumeral rhythm: arm at rest';}
  const ms=items.filter(i=>i.A&&i.mesh.visible).map(i=>({i,d:i.ratio-1})).filter(m=>Math.abs(m.d)>.02).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d));
  const L=$('actList');if(L)L.innerHTML=ms.slice(0,10).map(({i,d})=>{const w=Math.min(50,Math.abs(d)/.4*50);return `<button data-sel="${i.i}" title="${esc(dispName(i))}">${esc(dispName(i))}</button><div class="dbar"><i style="${d<0?`right:50%;width:${w}%;background:var(--hot)`:`left:50%;width:${w}%;background:var(--cool)`}"></i></div><em class="${d<0?'sh':'ln'}">${d>0?'+':''}${Math.round(d*100)}%</em>`;}).join('')||'<span style="grid-column:1/-1;color:var(--dim)">Move a joint or play a movement to see muscles change length.</span>';
  const n=$('actN');if(n)n.textContent=`${ms.filter(m=>m.d<0).length} shortening · ${ms.filter(m=>m.d>0).length} lengthening`;
  const ll=$('liveLen');if(ll&&ui.sel!=null){const d=items[ui.sel].ratio-1;ll.textContent=Math.abs(d)<.01?'Resting length':`${d>0?'+':''}${Math.round(d*100)}% ${d<0?'shorter':'longer'}`;ll.className=Math.abs(d)<.01?'':d<0?'sh':'ln';}
  const vis=items.filter(i=>i.mesh.visible).length;$('gE').textContent=vis.toLocaleString();$('gS').textContent=ms.length;
  $('gA').setAttribute('stroke-dasharray',`${(vis/items.length*100).toFixed(1)} 100`);$('gB').setAttribute('stroke-dasharray',`${Math.min(100,ms.length/60*100).toFixed(1)} 100`);
  const any=Object.entries(pose).some(([k,v])=>Math.abs(v-(DOFS[k].rest??0))>.5);$('poseLabel').textContent=ui.preset?PRESETS[ui.preset].name:any?'Custom pose':'Anatomical position';
}

/* ================= browser ================= */
const gOpen={};
function renderBrowser(){
  const q=($('q').value||'').trim().toLowerCase();let h='';
  if(ui.tab==='ch'){$('bTitle').textContent='Kinetic chains';h=V1.chains.map(c=>`<div class="roww"><button class="row${ui.chain===c.id?' on':''}" data-chain="${c.id}" style="padding-left:10px"><span class="ab">${c.ab}</span>${esc(c.name)}</button></div>`).join('')+'<p style="padding:10px;color:var(--dim);font-size:12.5px">Loading a chain lights its links in amber and numbers them in order.</p>';$('blist').innerHTML=h;return;}
  $('bTitle').textContent='Structure browser';
  for(const [lk,ln] of LAYERS){
    const list=items.filter(i=>i.layer===lk&&(!q||(i.name+' '+i.grp+' '+(i.cur?.lat||'')).toLowerCase().includes(q)));if(!list.length)continue;
    const open=q?true:gOpen[lk];h+=`<div class="grp${open?'':' closed'}"><button data-grp="${lk}"><span class="caret"></span>${esc(ln)}<span class="cnt">${list.length}</span></button><div class="rows">`;
    if(open){const byG={};list.forEach(i=>{(byG[i.grp||'Other']=byG[i.grp||'Other']||[]).push(i);});
      for(const [g,arr] of Object.entries(byG).sort((a,b)=>a[0].localeCompare(b[0]))){const gk=lk+'/'+g;const o2=q?true:gOpen[gk];
        h+=`<div class="grp l2${o2?'':' closed'}"><button data-grp="${esc(gk)}"><span class="caret"></span>${esc(g)}<span class="cnt">${arr.length}</span></button><div class="rows">`;
        if(o2)h+=arr.sort((a,b)=>a.name.localeCompare(b.name)||a.side.localeCompare(b.side)).slice(0,400).map(i=>`<div class="roww"><button class="row${ui.sel===i.i?' on':''}${i.visible?'':' hidden'}" data-sel="${i.i}"><span class="dot" style="background:${DOT[i.kind]}"></span>${esc(i.name)}<span class="sd">${i.side!=='M'?i.side:''}</span></button><button class="eye" data-eye="${i.i}" aria-label="${i.visible?'Hide':'Show'} ${esc(i.name)}">${i.visible?EYE:EYEX}</button></div>`).join('');
        h+='</div></div>';}}
    h+='</div></div>';
  }
  $('blist').innerHTML=h||'<p style="padding:10px;color:var(--dim)">No matches.</p>';
}
const EYE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/></svg>';
const EYEX='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><path d="M4 20L20 4"/></svg>';
function select(i){ui.sel=i;if(i==null){ui.fade=false;ui.iso=false;}paint();renderStats();renderBrowser();updSlots();}
let toastT=0;function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),1600);}
function resetPose(render=true){for(const id of Object.keys(pose))pose[id]=DOFS[id].rest??0;applyPose();if(render)renderStats();}

/* ================= events ================= */
function wire(){
  const cv=renderer.domElement;let down=null;const tip=$('tip');
  cv.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
  cv.addEventListener('pointerup',e=>{if(!down)return;const m=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;if(m>5)return;select(pick(e));});
  let hovT=0,hovTimer=0;cv.addEventListener('pointermove',e=>{if(e.buttons){tip.hidden=true;return;}clearTimeout(hovTimer);hovTimer=setTimeout(()=>{const id=pick(e);
    if(id!==ui.hover){ui.hover=id;paint();}if(id!=null){const it=items[id];tip.innerHTML=`<b>${esc(dispName(it))}</b><span>${esc(KNAME[it.kind])}${it.grp?' · '+esc(it.grp):''}${it.A&&Math.abs(it.ratio-1)>.01?` · ${it.ratio<1?'shortening':'lengthening'} ${Math.abs(Math.round((it.ratio-1)*100))}%`:''}</span>`;tip.hidden=false;tip.style.left=Math.min(innerWidth-270,e.clientX+14)+'px';tip.style.top=(e.clientY+14)+'px';}else tip.hidden=true;},90);});
  cv.addEventListener('pointerleave',()=>{clearTimeout(hovTimer);tip.hidden=true;if(ui.hover!=null){ui.hover=null;paint();}});
  $('slots').addEventListener('click',e=>{const b=e.target.closest('.slot');if(b)slotClick(SLOTS[+b.dataset.i]);});
  $('slots').addEventListener('pointerover',e=>{const b=e.target.closest('.slot');if(!b)return;const d=SLOTS[+b.dataset.i];tip.innerHTML=`<b>${esc(d.t)}</b><span>${esc(d.d)}</span>`;tip.hidden=false;tip.style.left=Math.min(innerWidth-270,e.clientX+14)+'px';tip.style.top=(e.clientY+14)+'px';});
  $('slots').addEventListener('pointerout',()=>{tip.hidden=true;});
  $('stats').addEventListener('input',e=>{const k=e.target.dataset.k;if(k){ui.preset=null;pose[k]=+e.target.value;applyPose();updSlots();}
    if(e.target.id==='cutPos'){ui.sectionPos=e.target.value/100;$('cutO').textContent=e.target.value+'%';setSection();}});
  $('stats').addEventListener('change',e=>{if(e.target.dataset.k)renderStats();});
  $('stats').addEventListener('click',e=>{
    const t=e.target.closest('[data-tog]');if(t){closed[t.dataset.tog]=!closed[t.dataset.tog];t.parentElement.classList.toggle('closed');return;}
    const mt=e.target.closest('[data-mtab]');if(mt){ui.mtab=mt.dataset.mtab;renderStats();return;}
    const s=e.target.closest('[data-sel]');if(s){if(s.dataset.sel!=='')select(+s.dataset.sel);return;}
    const ch=e.target.closest('[data-chain]');if(ch){loadChain(ch.dataset.chain);return;}
    const ax=e.target.closest('[data-axis]');if(ax){ui.sectionAxis=ax.dataset.axis;setSection();renderStats();return;}
    const a=e.target.closest('[data-act]');if(!a)return;const act=a.dataset.act;
    if(act==='reset'){ui.preset=null;resetPose();updSlots();}else if(act==='stop'){ui.preset=null;resetPose();updSlots();}
    else if(act==='focus')focusSel();else if(act==='fade'){ui.fade=!ui.fade;ui.iso=false;paint();renderStats();updSlots();}
    else if(act==='iso'){ui.iso=!ui.iso;ui.fade=false;paint();renderStats();updSlots();}
    else if(act==='hide'){items[ui.sel].visible=false;select(null);}else if(act==='clear')select(null);
    else if(act==='unchain'){ui.chain=null;chainSet=new Set();paint();renderStats();renderBrowser();}
  });
  $('blist').addEventListener('click',e=>{const g=e.target.closest('[data-grp]');if(g){gOpen[g.dataset.grp]=!gOpen[g.dataset.grp];renderBrowser();return;}
    const ey=e.target.closest('[data-eye]');if(ey){const it=items[+ey.dataset.eye];it.visible=!it.visible;paint();renderBrowser();return;}
    const ch=e.target.closest('[data-chain]');if(ch){loadChain(ch.dataset.chain);return;}
    const r=e.target.closest('[data-sel]');if(r)select(+r.dataset.sel);});
  let qt=0;$('q').addEventListener('input',()=>{clearTimeout(qt);qt=setTimeout(renderBrowser,150);});
  $('t-st').onclick=()=>{ui.tab='st';$('t-st').setAttribute('aria-selected',true);$('t-ch').setAttribute('aria-selected',false);renderBrowser();};
  $('t-ch').onclick=()=>{ui.tab='ch';$('t-ch').setAttribute('aria-selected',true);$('t-st').setAttribute('aria-selected',false);renderBrowser();};
  $('rT').onclick=()=>{ui.mode='tissue';$('rT').setAttribute('aria-pressed',true);$('rS').setAttribute('aria-pressed',false);paint();};
  $('rS').onclick=()=>{ui.mode='scan';$('rS').setAttribute('aria-pressed',true);$('rT').setAttribute('aria-pressed',false);paint();};
  $('resetBtn').onclick=()=>{ui.preset=null;ui.chain=null;chainSet=new Set();items.forEach(i=>i.visible=true);select(null);resetPose();camTo('fit');updSlots();};
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.target.matches('input'))select(null);});
  new ResizeObserver(resize).observe(vp);
}
function resize(){const w=vp.clientWidth,h=vp.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function updPin(){const pin=$('pin');if(ui.sel==null||!ui.labels){pin.hidden=true;return;}const it=items[ui.sel];if(!it.mesh.visible){pin.hidden=true;return;}
  const c=selWorld(it).project(camera);if(c.z>1){pin.hidden=true;return;}pin.hidden=false;pin.style.transform=`translate(${((c.x+1)/2*vp.clientWidth).toFixed(1)}px,${((1-c.y)/2*vp.clientHeight).toFixed(1)}px)`;
  const d=it.A?it.ratio-1:0;pin.querySelector('b').innerHTML=`${esc(dispName(it))}<small>${esc(it.grp||KNAME[it.kind])}${it.A&&Math.abs(d)>.01?` · ${d>0?'+':''}${Math.round(d*100)}%`:''}</small>`;}
function loop(now){
  if(ui.preset)runPreset(now);
  if(camAnim){const q=Math.min(1,(now-camAnim.s)/650),e=1-Math.pow(1-q,3);camera.position.lerpVectors(camAnim.p0,camAnim.p1,e);controls.target.lerpVectors(camAnim.t0,camAnim.t1,e);if(q>=1)camAnim=null;}
  controls.update();renderer.render(scene,camera);updPin();updChainPins();
  if(dirty){dirty=false;updOutputs();}
  requestAnimationFrame(loop);
}

/* ================= boot ================= */
let BINS;
(async()=>{
  try{
    const d=await load();MAN=d.man;BINS=d.bins;V1=d.v1;V1.byId=Object.fromEntries(V1.S.map(s=>[s.id,s]));V1.chains=V1.CHAINS;
    V1.S.forEach(s=>{s.chains=V1.CHAINS.filter(c=>c.seq.some(q=>q[0]===s.id)).map(c=>c.id);});
    $('loadTxt').textContent='Rigging skeleton…';await new Promise(r=>setTimeout(r,30));
    build();defDofs();setupLM();buildRing();wire();resize();applyPose();renderStats();renderBrowser();updSlots();$('loading').remove();$('verLbl').textContent=VERSION;
    requestAnimationFrame(loop);window.__corpus={pose,applyPose,select,ui,items,slotClick,SLOTS,renderStats,loadChain,camTo,DOFS};
  }catch(e){console.error(e);$('loadTxt').textContent='Could not load the specimen: '+e.message;}
})();
