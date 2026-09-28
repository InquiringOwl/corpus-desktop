import bpy,json,sys,re,numpy as np,pickle,os,mathutils
from mathutils.geometry import interpolate_bezier
cat,part,nparts=sys.argv[-3],int(sys.argv[-2]),int(sys.argv[-1])
c=json.load(open('cols.json'))
def walk(n,acc):
    for o in c[n]['objs']: acc.append(o)
    for k in c[n]['children']: walk(k,acc)
acc=[];walk(cat,acc)
skip=re.compile(r'\.(g|j|t|s|i)$')
names=sorted(set(o[0] for o in acc if o[1] in('MESH','CURVE') and not skip.search(o[0])))
names=names[part::nparts]
def W(o):
    Mb=o.matrix_basis.copy()
    return Mb if o.parent is None else W(o.parent)@o.matrix_parent_inverse@Mb
out=[]
B=120
for b0 in range(0,len(names),B):
    batch=names[b0:b0+B]
    with bpy.data.libraries.load('Z-Anatomy/Startup.blend') as (src,dst):
        dst.objects=list(batch)
    scn=bpy.context.scene
    for o in list(bpy.data.objects):
        if o.name not in batch: continue
        # parent chain (group labels)
        chain=[];p=o.parent
        while p is not None: chain.append(p.name);p=p.parent
        M=np.array(W(o))
        rec=dict(name=o.name,cat=cat,chain=chain,type=o.type)
        if o.type=='MESH':
            if any(m.type=='SUBSURF' for m in o.modifiers) or any(m.type=='SOLIDIFY' for m in o.modifiers) or any(m.type=='MIRROR' for m in o.modifiers):
                scn.collection.objects.link(o);dg=bpy.context.evaluated_depsgraph_get();eo=o.evaluated_get(dg);me=eo.to_mesh()
            else: me=o.data;eo=None
            me.calc_loop_triangles()
            V=np.array([v.co[:] for v in me.vertices],float)
            F=np.array([t.vertices[:] for t in me.loop_triangles],np.int32)
            if eo is not None: eo.to_mesh_clear()
            if len(F)==0: continue
            V=(np.c_[V,np.ones(len(V))]@M.T)[:,:3]
            rec.update(V=V.astype(np.float32),F=F)
        else:
            cu=o.data;spl=[]
            for s in cu.splines:
                pts=[];rad=[]
                if s.type=='BEZIER':
                    bp=s.bezier_points;n=len(bp);seg=range(n-1+(1 if s.use_cyclic_u else 0))
                    for i in seg:
                        a=bp[i];b=bp[(i+1)%n]
                        ps=interpolate_bezier(a.co,a.handle_right,b.handle_left,b.co,8)
                        for k,q in enumerate(ps[:-1]):pts.append(q[:]);rad.append(a.radius+(b.radius-a.radius)*k/7)
                    pts.append(bp[-1].co[:]);rad.append(bp[-1].radius)
                else:
                    for q in s.points: pts.append(q.co[:3]);rad.append(q.radius)
                P=np.array(pts,float)
                if len(P)<2: continue
                P=(np.c_[P,np.ones(len(P))]@M.T)[:,:3]
                spl.append((P.astype(np.float32),np.array(rad,np.float32)))
            if not spl: continue
            sc=float(np.mean([np.linalg.norm(M[:3,i]) for i in range(3)]))
            rec.update(splines=spl,bevel=cu.bevel_depth*sc)
        out.append(rec)
    # purge
    for o in list(bpy.data.objects): bpy.data.objects.remove(o,do_unlink=True)
    for coll in (bpy.data.meshes,bpy.data.curves,bpy.data.materials,bpy.data.fonts):
        for d in list(coll):
            if d.users==0: coll.remove(d)
    print(cat,part,b0,len(out),flush=True)
key=re.sub(r'\W+','_',cat)
pickle.dump(out,open(f'exp/{key}_{part}.pkl','wb'))
