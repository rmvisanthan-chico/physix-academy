/* PhysiX Academy — NCERT Simulations: 9th / 10th / 11th */
'use strict';
function ncArrow(g,x,y,dx,dy,col,w){const l=Math.hypot(dx,dy);if(l<2)return;g.strokeStyle=col;g.fillStyle=col;g.lineWidth=w||3;g.beginPath();g.moveTo(x,y);g.lineTo(x+dx,y+dy);g.stroke();const a=Math.atan2(dy,dx),h=(w||3)+5;g.beginPath();g.moveTo(x+dx,y+dy);g.lineTo(x+dx-h*Math.cos(a-0.42),y+dy-h*Math.sin(a-0.42));g.lineTo(x+dx-h*Math.cos(a+0.42),y+dy-h*Math.sin(a+0.42));g.closePath();g.fill();}
function ncLabel(g,x,y,t,col){g.fillStyle=col||'#9aa8c3';g.font='11px Segoe UI';g.fillText(t,x,y);}

/* 9th — Sound: Echo & SONAR */
Sims.register('ncert9-echo','Echo & SONAR (Class 9 Sound)','Clap → echo if wall ≥17.2 m. SONAR: d = vt/2.','🔊',frame=>{
  const cv=SU.canvas(frame,260);const ctr=SU.el('div','sim-controls');frame.appendChild(ctr);
  const ro=SU.el('div','sim-readouts');frame.appendChild(ro);
  const D=SU.slider(ctr,'Distance to wall d (m)',5,80,1,34.4);const V=SU.slider(ctr,'Speed v (m/s)',300,1600,10,344);const rT=SU.readout(ro,'Round-trip time t'),rH=SU.readout(ro,'Heard as');let t=0,ping=0;
  SU.loop(cv.c,dt=>{
    t+=dt;const d=D.get(),v=V.get(),tt=2*d/v;rT.set(tt.toFixed(3)+' s');rH.set(tt>=0.1?'✅ Distinct echo':'❌ Reverberation (merges)');
    if(t>1.4){t=0;ping=1;}
    const g=cv.g;g.fillStyle='#05070d';g.fillRect(0,0,cv.W,cv.H);
    const wallX=cv.W-60, srcX=60, mid=cv.H/2;
    g.strokeStyle='#33415c';g.lineWidth=2;g.beginPath();g.moveTo(wallX,20);g.lineTo(wallX,cv.H-20);g.stroke();
    g.fillStyle='#6b7a99';g.font='11px Segoe UI';g.fillText('WALL',wallX-18,18);
    g.fillStyle='#22d3ee';g.beginPath();g.arc(srcX,mid,10,0,7);g.fill();ncLabel(g,srcX-14,mid-14,'SOURCE','#22d3ee');
    const prog=Math.min(1, (t/0.7));const outX=srcX+(wallX-srcX)*Math.min(1,prog*1.4);
    const backProg=Math.max(0,prog-0.5)*2;const backX=wallX-(wallX-srcX)*Math.min(1,backProg);
    if(ping){
      g.fillStyle='rgba(34,211,238,.9)';g.beginPath();g.arc(outX,mid,6,0,7);g.fill();
      if(prog>0.5){g.fillStyle='rgba(251,191,36,.9)';g.beginPath();g.arc(backX,mid,6,0,7);g.fill();}
    }
    g.strokeStyle='rgba(154,168,195,.18)';g.setLineDash([4,4]);g.beginPath();g.moveTo(srcX,mid);g.lineTo(wallX,mid);g.stroke();g.setLineDash([]);
    ncLabel(g,srcX,mid+38,'d = '+d+' m',' #9aa8c3');
    ncLabel(g,wallX-40,mid+38,'2d = '+(2*d)+' m','#9aa8c3');
    g.fillStyle='rgba(255,255,255,.06)';g.fillRect(12,cv.H-36,cv.W-24,24);g.fillStyle='#9aa8c3';g.font='11px JetBrains Mono';g.fillText('t = 2d/v = '+(2*d)+' / '+v+' = '+tt.toFixed(3)+' s',18,cv.H-20);
  });
});

/* 10th — Spherical Mirror Bench */
Sims.register('ncert10-mirror','Spherical Mirror Bench (Class 10 Light)','Concave f<0, Convex f>0. Mirror equation 1/f=1/v+1/u.','🪞',frame=>{
  const cv=SU.canvas(frame,280);const ctr=SU.el('div','sim-controls');frame.appendChild(ctr);const ro=SU.el('div','sim-readouts');frame.appendChild(ro);
  const F=SU.slider(ctr,'Focal length f (cm)',-30,-6,1,-15);const U=SU.slider(ctr,'Object distance u (cm)',-60,-8,1,-25);const H=SU.slider(ctr,'Object height h (cm)',1,8,0.5,4);
  const rV=SU.readout(ro,'Image v'),rM=SU.readout(ro,'m = -v/u'),rN=SU.readout(ro,'Nature');
  SU.loop(cv.c,()=>{
    const f=F.get(),u=U.get(),h=H.get();const v=1/(1/f - 1/u);const m=-v/u;const hi=h*m;
    const finite=isFinite(v);rV.set(finite?v.toFixed(1)+' cm':'∞');rM.set(finite?m.toFixed(2):'—');rN.set(!finite?'At infinity':v<0?'Real, inverted':'Virtual, erect');
    const g=cv.g;g.fillStyle='#05070d';g.fillRect(0,0,cv.W,cv.H);
    const cx=cv.W/2, py=cv.H/2;const sc=3;
    g.strokeStyle='#26314a';g.lineWidth=1;g.beginPath();g.moveTo(0,py);g.lineTo(cv.W,py);g.stroke();
    g.beginPath();g.moveTo(cx,20);g.lineTo(cx,cv.H-20);g.stroke();
    const isConcave=f<0;
    g.strokeStyle=isConcave?'#22d3ee':'#fbbf24';g.lineWidth=3;
    g.beginPath();if(isConcave){g.moveTo(cx-70,20);g.quadraticCurveTo(cx-90,py,cx-70,cv.H-20);}else{g.moveTo(cx+70,20);g.quadraticCurveTo(cx+90,py,cx+70,cv.H-20);}g.stroke();
    const ox=cx+u*sc, oy=py - h*12;
    g.fillStyle='#f87171';g.fillRect(ox-2,oy,4,h*12);
    g.beginPath();g.arc(ox,oy,4,0,7);g.fill();ncLabel(g,ox-10,oy-6,'O','#f87171');
    g.fillStyle='#fbbf24';g.beginPath();g.arc(cx+f*sc,py,5,0,7);g.fill();ncLabel(g,cx+f*sc-6,py-10,'F','#fbbf24');
    g.fillStyle='#38bdf8';g.beginPath();g.arc(cx+2*f*sc,py,5,0,7);g.fill();ncLabel(g,cx+2*f*sc-6,py-10,'C','#38bdf8');
    if(finite&&Math.abs(v)<90){
      const ix=cx+v*sc, iy=py - hi*12;
      g.fillStyle= m<0?'#34d399':'#a78bfa';g.fillRect(ix-2,iy,4,Math.abs(hi)*12);
      g.beginPath();g.arc(ix,iy,4,0,7);g.fill();ncLabel(g,ix+6,iy,'I','#34d399');
      g.strokeStyle='rgba(52,211,153,.45)';g.setLineDash([5,5]);g.lineWidth=1;
      g.beginPath();g.moveTo(ox,oy);g.lineTo(ix,iy);g.stroke();g.setLineDash([]);
    }
    g.fillStyle='#6b7a99';g.font='10px Segoe UI';g.fillText(isConcave?'Concave (f<0)':'Convex (f>0)',12,18);
    g.fillText('1/f = 1/v + 1/u',12,cv.H-10);
  });
});

/* 10th — Human Eye Defects */
Sims.register('ncert10-eye','Human Eye Defects (Class 10)','Myopia concave, hypermetropia convex. Power P=1/f (m).','👁️',frame=>{
  const cv=SU.canvas(frame,280);const ctr=SU.el('div','sim-controls');frame.appendChild(ctr);const ro=SU.el('div','sim-readouts');frame.appendChild(ro);
  const MODE=SU.slider(ctr,'Defect',0,1,1,0,v=>v? 'Hypermetropia':'Myopia');const PWR=SU.slider(ctr,'Lens power P (D)',-4,4,0.25,-2,v=>(v>0?'+':'')+v.toFixed(2)+' D');const rF=SU.readout(ro,'f = 1/P'),rC=SU.readout(ro,'Correction');
  SU.loop(cv.c,()=>{
    const myopia=MODE.get()===0, p=PWR.get();const f=p?100/p:Infinity; // cm
    rF.set(isFinite(f)?f.toFixed(1)+' cm':'∞');rC.set(myopia? (p<0?'✅ Concave — diverges to retina':'❌ Needs concave'): (p>0?'✅ Convex — converges to retina':'❌ Needs convex'));
    const g=cv.g;g.fillStyle='#05070d';g.fillRect(0,0,cv.W,cv.H);
    const ex=90,ey=cv.H/2,rx=320;
    g.fillStyle='#1a2338';g.beginPath();g.ellipse(ex,ey,42,34,0,0,7);g.fill();g.strokeStyle='#3a4a6a';g.lineWidth=2;g.stroke();
    g.fillStyle='#22d3ee';g.beginPath();g.ellipse(ex+12,ey,18,22,0,0,7);g.fill();
    g.fillStyle='#0b1020';g.beginPath();g.arc(ex+16,ey,7,0,7);g.fill();
    g.fillStyle='#cbd5e1';g.fillRect(rx-2,ey-40,4,80);
    g.fillStyle='#6b7a99';g.font='11px Segoe UI';g.fillText('RETINA',rx-16,ey+56);
    const lensX=190;const isConcave=p<0;
    g.strokeStyle=myopia?'#38bdf8':'#fbbf24';g.lineWidth=3;
    if(Math.abs(p)>0.2){
      g.beginPath();
      if(isConcave){g.moveTo(lensX,ey-36);g.quadraticCurveTo(lensX+10,ey,lensX,ey+36);}else{g.moveTo(lensX,ey-36);g.quadraticCurveTo(lensX-12,ey,lensX,ey+36);}
      g.stroke();
      ncLabel(g,lensX-18,ey-42,(p>0?'+':'')+p.toFixed(1)+'D',myopia?'#38bdf8':'#fbbf24');
    }else{ncLabel(g,lensX-14,ey-42,'No lens','#6b7a99');}
    const focus= myopia? ex+28 : rx+18;
    const correct=(myopia&&p<0)||(!myopia&&p>0);
    const target= correct? rx : focus;
    g.strokeStyle= correct?'#34d399':'#f87171';g.setLineDash([5,5]);g.lineWidth=2;
    g.beginPath();g.moveTo(ex+30,ey);g.lineTo(target,ey);g.stroke();g.setLineDash([]);
    g.fillStyle= correct?'#34d399':'#f87171';g.beginPath();g.arc(target,ey,6,0,7);g.fill();
    ncLabel(g,target+8,ey-8, correct?'On retina':'Before/Behind','#34d399');
    g.fillStyle='#6b7a99';g.font='10px JetBrains Mono';g.fillText((myopia?'Myopia: far image before retina':'Hypermetropia: near image behind'),12,18);
  });
});

/* 10th — Joule Heating & Bill */
Sims.register('ncert10-heating','Joule Heating & Bill (Class 10 Electricity)','H=I²Rt. Bill in kWh (1 kWh=3.6 MJ).','🔌',frame=>{
  const cv=SU.canvas(frame,280);const ctr=SU.el('div','sim-controls');frame.appendChild(ctr);const ro=SU.el('div','sim-readouts');frame.appendChild(ro);
  const P=SU.slider(ctr,'Device power P (W)',100,3000,100,1500);const H=SU.slider(ctr,'Daily use (h)',0.5,10,0.5,4);const RT=SU.slider(ctr,'Rate ₹/kWh',4,15,0.5,7);
  const rE=SU.readout(ro,'Daily kWh'),rM=SU.readout(ro,'Monthly kWh'),rC=SU.readout(ro,'Monthly ₹'),rI=SU.readout(ro,'Current @220V');
  SU.loop(cv.c,()=>{
    const p=P.get(),h=H.get(),rate=RT.get();const daily=p*h/1000,monthly=daily*30,cost=monthly*rate,cur=p/220;
    rE.set(daily.toFixed(2));rM.set(monthly.toFixed(1));rC.set('₹'+cost.toFixed(0));rI.set(cur.toFixed(2)+' A');
    const g=cv.g;g.fillStyle='#05070d';g.fillRect(0,0,cv.W,cv.H);
    const barW=cv.W-80, barH=18, x0=60;const fuels=[{label:'Heater',p:p,h:h},{label:'Bulb 60W',p:60,h:5},{label:'Fan 75W',p:75,h:8}];
    g.fillStyle='#9aa8c3';g.font='11px Segoe UI';g.fillText('Daily energy comparison (kWh)',12,22);
    fuels.forEach((f,i)=>{
      const kwh=f.p*f.h/1000;const w=Math.min(barW, kwh/6 * barW);
      const y=48+i*44;
      g.fillStyle='#26314a';g.fillRect(x0,y,barW,barH);
      g.fillStyle= i===0?'#fbbf24':'#33415c';g.fillRect(x0,y,w,barH);
      g.fillStyle='#e2e8f0';g.font='11px JetBrains Mono';g.fillText(f.label+' — '+kwh.toFixed(2)+' kWh',x0+6,y+13);
    });
    g.fillStyle='#6b7a99';g.font='11px JetBrains Mono';g.fillText('1 kWh = 3.6×10⁶ J',12,cv.H-14);
    g.fillStyle=cur>5?'#f87171':'#34d399';g.font='11px Segoe UI';g.fillText(cur>5?'⚠️ Use >5A fuse':'✅ 5A fuse OK',cv.W-110,cv.H-14);
  });
});

/* 11th — Vernier / Screw Gauge */
Sims.register('ncert11-measure','Vernier & Screw Gauge (Class 11 Units)','LC = 1 MSD − 1 VSD. Reading = MSR + VC×LC.','📏',frame=>{
  const cv=SU.canvas(frame,300);const ctr=SU.el('div','sim-controls');frame.appendChild(ctr);const ro=SU.el('div','sim-readouts');frame.appendChild(ro);
  const MS=SU.slider(ctr,'MSR (mm)',0,20,1,12);const VC=SU.slider(ctr,'VC (coinciding)',0,10,1,6);const T=SU.slider(ctr,'Type',0,1,1,0,v=>v?'Screw (LC 0.01)':'Vernier (LC 0.1)');
  const rLC=SU.readout(ro,'Least count'),rR=SU.readout(ro,'Reading');
  SU.loop(cv.c,()=>{
    const screw=T.get()===1, lc=screw?0.01:0.1, ms=MS.get(), vc=VC.get(), reading=ms+vc*lc;
    rLC.set(lc+' mm');rR.set(reading.toFixed(2)+' mm');
    const g=cv.g;g.fillStyle='#05070d';g.fillRect(0,0,cv.W,cv.H);
    const y0=90, x0=30, scaleW=cv.W-60;
    g.strokeStyle='#33415c';g.lineWidth=2;g.beginPath();g.moveTo(x0,y0);g.lineTo(x0+scaleW,y0);g.stroke();
    for(let i=0;i<=20;i++){const x=x0+i*scaleW/20;const major=i%5===0;g.beginPath();g.moveTo(x,y0);g.lineTo(x,y0+(major?18:10));g.strokeStyle=major?'#e2e8f0':'#64748b';g.stroke();if(major){g.fillStyle='#9aa8c3';g.font='9px JetBrains Mono';g.fillText(i+'',x-4,y0+28);}}
    const vx=x0+ ms*scaleW/20 + vc*lc*scaleW/5;
    g.fillStyle='rgba(56,189,248,.9)';g.fillRect(vx-1,y0-14,2,22);
    g.strokeStyle='#38bdf8';g.lineWidth=2;g.strokeRect(vx-14,y0-16,28,26);
    ncLabel(g,vx-10,y0-20,'VC','#38bdf8');
    g.fillStyle='#6b7a99';g.font='11px Segoe UI';g.fillText((screw?'Screw gauge':'Vernier')+' — drag VC to coincide',12,18);
    g.fillStyle='#e2e8f0';g.font='13px JetBrains Mono';g.fillText('MSR '+ms+' + VC '+vc+'×'+lc+' = '+reading.toFixed(2)+' mm',12,cv.H-18);
  });
});

/* 11th — Spinning Skater (Conservation of L) */
Sims.register('ncert11-rotation','Spinning Skater (Class 11 Rotation)','L=Iω conserved. Arms in → I↓ → ω↑.','🌀',frame=>{
  const cv=SU.canvas(frame,300);const ctr=SU.el('div','sim-controls');frame.appendChild(ctr);const ro=SU.el('div','sim-readouts');frame.appendChild(ro);
  const R=SU.slider(ctr,'Arm radius r (m)',0.2,0.9,0.05,0.8);const rL=SU.readout(ro,'I ∝ mr²'),rW=SU.readout(ro,'ω'),rK=SU.readout(ro,'K = ½Iω²');
  let ang=0;SU.loop(cv.c,dt=>{
    const r=R.get(), I=r*r, w0=2, L=I*w0, w=L/I; // L conserved from w0 at r=0.8
    const I0=0.64, L0=I0*w0; const w2=L0/(r*r);
    ang+=w2*dt;const I2=(r*r).toFixed(2), wF=w2.toFixed(2);
    rL.set(I2+' kg·m²');rW.set(wF+' rad/s');rK.set((0.5* (r*r)*w2*w2).toFixed(2)+' J');
    const g=cv.g;g.fillStyle='#05070d';g.fillRect(0,0,cv.W,cv.H);
    const cx=cv.W/2,cy=cv.H/2+10;
    g.strokeStyle='#33415c';g.lineWidth=1;g.beginPath();g.arc(cx,cy, r*55,0,7);g.stroke();
    g.save();g.translate(cx,cy);g.rotate(ang);
    g.fillStyle='#22d3ee';g.beginPath();g.arc(0,0,18,0,7);g.fill();
    g.fillStyle='#fbbf24';g.beginPath();g.arc(r*55,0,10,0,7);g.fill();g.beginPath();g.arc(-r*55,0,10,0,7);g.fill();
    g.restore();
    ncLabel(g,cx-16,cy-44,'Iω = const','#38bdf8');
    g.fillStyle='#6b7a99';g.font='11px Segoe UI';g.fillText('Arms in → I↓ → spin faster',12,18);
  });
});

/* 11th — Stress–Strain */
Sims.register('ncert11-solids','Stress–Strain Curve (Class 11 Solids)','Steel Y≈2×10¹¹ Pa vs rubber ~10⁷ Pa.','🧱',frame=>{
  const cv=SU.canvas(frame,300);const ctr=SU.el('div','sim-controls');frame.appendChild(ctr);const ro=SU.el('div','sim-readouts');frame.appendChild(ro);
  const MAT=SU.slider(ctr,'Material',0,1,1,0,v=>v?'Rubber':'Steel');const STRAIN=SU.slider(ctr,'Strain ε',0,0.12,0.005,0.04);const rS=SU.readout(ro,'Stress σ'),rY=SU.readout(ro,'Y');
  SU.loop(cv.c,()=>{
    const steel=MAT.get()===0, eps=STRAIN.get(), Y= steel?2e11:1e7, sig=Y*eps;
    rS.set((sig/1e6).toFixed(1)+' MPa');rY.set(steel?'200 GPa':'0.01 GPa');
    const g=cv.g;g.fillStyle='#05070d';g.fillRect(0,0,cv.W,cv.H);
    const ox=50,oy=cv.H-40, W=cv.W-70, H=cv.H-70;
    g.strokeStyle='#26314a';g.lineWidth=1;g.strokeRect(ox,oy-H,W,H);
    g.strokeStyle='#475569';g.beginPath();g.moveTo(ox,oy);g.lineTo(ox+W,oy);g.moveTo(ox,oy);g.lineTo(ox,oy-H);g.stroke();
    g.fillStyle='#9aa8c3';g.font='11px Segoe UI';g.fillText('strain ε',ox+W-46,oy+14);g.fillText('stress σ',ox-36,oy-H+12);
    const pts=100;g.strokeStyle= steel?'#38bdf8':'#fbbf24';g.lineWidth=3;g.beginPath();
    for(let i=0;i<=pts;i++){const e=i/pts*0.12;let s;if(steel){if(e<0.01)s=Y*e; else if(e<0.06)s=Y*0.01+ Y*0.08*(e-0.01); else s=Y*0.01+Y*0.08*0.05 - Y*0.02*(e-0.06);}else{s=Y*e/(1+e*8);}const x=ox+ e/0.12*W, y=oy - Math.min(1,s/(Y*0.02))*H*0.92; i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();
    const ex=ox+ eps/0.12*W, ey=oy - Math.min(1, (Y*eps)/(Y*0.02))*H*0.92;
    g.fillStyle='#f87171';g.beginPath();g.arc(ex,ey,6,0,7);g.fill();
    g.fillStyle='#6b7a99';g.font='10px JetBrains Mono';g.fillText('Y = σ/ε',ox+8,22);
  });
});

/* 11th — Bernoulli Venturi */
Sims.register('ncert11-venturi','Bernoulli Venturi (Class 11 Fluids)','A₁v₁=A₂v₂. Faster → lower pressure. Lift = ΔP×A.','💧',frame=>{
  const cv=SU.canvas(frame,300);const ctr=SU.el('div','sim-controls');frame.appendChild(ctr);const ro=SU.el('div','sim-readouts');frame.appendChild(ro);
  const V1=SU.slider(ctr,'Speed v₁ (m/s)',1,6,0.5,2.5);const RATIO=SU.slider(ctr,'Constriction',1.2,3.5,0.1,2);const rV2=SU.readout(ro,'v₂'),rDP=SU.readout(ro,'ΔP'),rL=SU.readout(ro,'Lift hint');
  let ph=0;SU.loop(cv.c,dt=>{
    const v1=V1.get(), ratio=RATIO.get(), v2=v1*ratio, rho=1000, dP=0.5*rho*(v2*v2 - v1*v1);
    ph+=dt*3; rV2.set(v2.toFixed(2)+' m/s');rDP.set((dP/1000).toFixed(1)+' kPa');rL.set('↑ '+(dP*0.02).toFixed(0)+' N (demo)');
    const g=cv.g;g.fillStyle='#05070d';g.fillRect(0,0,cv.W,cv.H);
    const y0=cv.H/2, h1=70, h2=h1/ratio, x0=30, x1=160, x2=300, x3=cv.W-30;
    g.fillStyle='#0f1a2e';g.strokeStyle='#3a4a6a';g.lineWidth=2;
    g.beginPath();g.moveTo(x0,y0-h1/2);g.lineTo(x1,y0-h1/2);g.lineTo(x2,y0-h2/2);g.lineTo(x3,y0-h2/2);g.lineTo(x3,y0+h2/2);g.lineTo(x2,y0+h2/2);g.lineTo(x1,y0+h1/2);g.lineTo(x0,y0+h1/2);g.closePath();g.fill();g.stroke();
    g.fillStyle='rgba(34,211,238,.7)';
    for(let i=0;i<18;i++){const prog=(ph*0.7 + i*0.31)%1;const seg=prog<0.45? prog/0.45 : 0.45+(prog-0.45)/0.55;let x,yw;if(seg<0.5){const t=seg/0.5;x=x0+(x1-x0)*t;yw=h1;}else{const t=(seg-0.5)/0.5;x=x2+(x3-x2)*t;yw=h2;}const y=y0 + (Math.sin(ph*2+i)*6);g.beginPath();g.arc(x,y,3,0,7);g.fill();}
    ncLabel(g,x0+8,y0-h1/2-8,'A₁ v₁','#9aa8c3');ncLabel(g,x2+8,y0-h2/2-8,'A₂ v₂','#9aa8c3');
    g.strokeStyle='#38bdf8';g.lineWidth=10;g.beginPath();g.moveTo(x1+22,y0-h1/2-26);g.lineTo(x1+22,y0-h1/2+12);g.stroke();
    g.strokeStyle='#fbbf24';g.lineWidth=10;g.beginPath();g.moveTo(x2+18,y0-h2/2-26);g.lineTo(x2+18,y0-h2/2+12);g.stroke();
    g.fillStyle='#6b7a99';g.font='11px Segoe UI';g.fillText('P high',x1+8,y0-h1/2-32);g.fillText('P low',x2+6,y0-h2/2-32);
    g.fillStyle='#6b7a99';g.font='11px JetBrains Mono';g.fillText('A₁v₁ = A₂v₂',12,18);
  });
});

/* NS — Entire PHYSIX LAB site inside PhysiX (local trial) */
Sims.register('ns','NS — PHYSIX LAB','Interactive Physics Simulations','🧪',frame=>{
  frame.style.padding='0';
  const wrap=document.createElement('div');
  wrap.innerHTML=`
<iframe src="https://physics-lab.vercel.app/" title="PHYSIX LAB entire site" style="width:100%;height:620px;border:0;background:#fff" loading="lazy" referrerpolicy="no-referrer"></iframe>
<style>
.pl-hero{text-align:center;padding:1.4rem 1rem 1rem;background:var(--panel)}
.pl-hero h1{margin:0;font-size:1.8rem;letter-spacing:-.02em}
.pl-hero-sub{margin:.2rem 0 0;color:var(--acc);font-weight:600}
.pl-hero-intro{margin:.4rem 0 0;color:var(--txt2);font-size:.9rem}
.pl-topics,.pl-featured,.pl-games-promo,.pl-stats{padding:1rem;border-top:1px solid var(--card-brd)}
.pl-section-sub{margin:.2rem 0 .9rem;color:var(--txt3);font-size:.84rem}
.pl-topic-grid,.pl-featured-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.9rem}
.pl-topic-card,.pl-featured-card{border:1px solid var(--card-brd);border-radius:12px;padding:.9rem;background:var(--panel2)}
.pl-count{font-family:"DM Mono",monospace;font-size:.66rem;color:var(--acc);border:1px solid var(--card-brd);padding:.14rem .38rem;border-radius:999px}
.pl-topic-card h3,.pl-featured-card h3{margin:.45rem 0 .28rem;font-size:1rem}
.pl-topic-card p,.pl-featured-card p{margin:0;color:var(--txt2);font-size:.84rem}
.pl-link{color:var(--acc);font-weight:600;font-size:.8rem;display:inline-block;margin-top:.4rem}
.pl-games-promo{text-align:center;background:color-mix(in srgb,var(--acc) 6%,var(--panel))}
.pl-games-sub{color:var(--txt3);font-size:.82rem}
.pl-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:.8rem;text-align:center}
@media(max-width:700px){.pl-stats{grid-template-columns:repeat(2,1fr)}}
.pl-stat-num{display:block;font-size:1.4rem;font-weight:800;color:var(--acc)}
.pl-stat-label{font-family:"DM Mono",monospace;font-size:.66rem;color:var(--txt3);text-transform:uppercase}
</style>
<header class="pl-hero">
  <h1>PHYSIX LAB</h1>
  <p class="pl-hero-sub">Interactive Physics Simulations</p>
  <p class="pl-hero-intro">Explore the fundamental laws of nature through interactive simulations.</p>
</header>
<section class="pl-topics">
  <h2>Physics Topics</h2>
  <p class="pl-section-sub">Choose your area of exploration</p>
  <div class="pl-topic-grid">
    <article class="pl-topic-card"><span class="pl-count">6 sims</span><h3>Classical Mechanics</h3><p>Motion, forces, energy, and momentum</p><a href="#" class="pl-link">Explore simulations</a></article>
    <article class="pl-topic-card"><span class="pl-count">3 sims</span><h3>Fluid Dynamics</h3><p>Pressure, viscosity, and flow behavior</p><a href="#" class="pl-link">Explore simulations</a></article>
    <article class="pl-topic-card"><span class="pl-count">3 sims</span><h3>Wave Physics</h3><p>Oscillations, interference, and wave propagation</p><a href="#" class="pl-link">Explore simulations</a></article>
    <article class="pl-topic-card"><span class="pl-count">0 sims</span><h3>Thermodynamics</h3><p>Heat transfer, the ideal gas law, and particle behaviour</p><a href="#" class="pl-link">Explore simulations</a></article>
    <article class="pl-topic-card"><span class="pl-count">2 sims</span><h3>Electricity & Magnetism</h3><p>Electric fields, circuits, and electromagnetic effects</p><a href="#" class="pl-link">Explore simulations</a></article>
    <article class="pl-topic-card"><span class="pl-count">2 sims</span><h3>Optics</h3><p>Light behavior, lenses, and optical instruments</p><a href="#" class="pl-link">Explore simulations</a></article>
  </div>
</section>
<section class="pl-featured">
  <h2>Featured Simulations</h2>
  <p class="pl-section-sub">Popular physics concepts to get you started</p>
  <div class="pl-featured-grid">
    <article class="pl-featured-card"><h3>Pendulum Motion</h3><p>Explore simple harmonic motion with an interactive pendulum</p></article>
    <article class="pl-featured-card"><h3>Projectile Motion</h3><p>Study the path of objects under gravity, and be able to predict the flight of objects</p></article>
    <article class="pl-featured-card"><h3>Flow Rate Simulator</h3><p>Visualize how pipe width and fluid velocity affect flow rate</p></article>
  </div>
</section>
<section class="pl-games-promo">
  <h2>PHYSIX LAB Games</h2>
  <h3>Ready to Play & Learn?</h3>
  <p>Dive into our collection of physics-based games designed to make learning fun and engaging.</p>
  <p class="pl-games-sub">Join thousands of students mastering physics through interactive gameplay</p>
</section>
<section class="pl-stats">
  <div class="pl-stat"><span class="pl-stat-num">19</span><span class="pl-stat-label">Simulations</span></div>
  <div class="pl-stat"><span class="pl-stat-num">6</span><span class="pl-stat-label">Topics</span></div>
  <div class="pl-stat"><span class="pl-stat-num">2</span><span class="pl-stat-label">Games</span></div>
  <div class="pl-stat"><span class="pl-stat-num">∞</span><span class="pl-stat-label">Possibilities</span></div>
  <div class="pl-stat"><span class="pl-stat-num">100%</span><span class="pl-stat-label">Interactive</span></div>
</section>
`;
  frame.appendChild(wrap);
  wrap.querySelectorAll('.pl-link').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();location.hash='#/sims';}));
});

/* 11th — PV Diagram & Work */
Sims.register('ncert11-pv','Thermodynamics PV Cycle (Class 11)','Work = area enclosed. Carnot η = 1−Tc/Th.','🔥',frame=>{
  const cv=SU.canvas(frame,300);const ctr=SU.el('div','sim-controls');frame.appendChild(ctr);const ro=SU.el('div','sim-readouts');frame.appendChild(ro);
  const CYC=SU.slider(ctr,'Cycle',0,3,1,0,v=>['Isothermal','Adiabatic','Isobaric','Carnot'][v]);const rW=SU.readout(ro,'W (area)'),rE=SU.readout(ro,'Note');
  SU.loop(cv.c,()=>{
    const c=CYC.get();const g=cv.g;g.fillStyle='#05070d';g.fillRect(0,0,cv.W,cv.H);
    const ox=60,oy=cv.H-40,W=cv.W-80,H=cv.H-70;
    g.strokeStyle='#26314a';g.lineWidth=1;g.strokeRect(ox,oy-H,W,H);
    g.strokeStyle='#475569';g.beginPath();g.moveTo(ox,oy);g.lineTo(ox+W,oy);g.moveTo(ox,oy);g.lineTo(ox,oy-H);g.stroke();
    g.fillStyle='#9aa8c3';g.font='11px Segoe UI';g.fillText('V →',ox+W-18,oy+14);g.fillText('P ↑',ox-18,oy-H+12);
    const pts=[];if(c===0){for(let i=0;i<=60;i++){const V=0.2+i/60*0.8, P=1/V; pts.push([ox+V*W*0.7, oy-P*H*0.32]);}}else if(c===1){for(let i=0;i<=60;i++){const V=0.2+i/60*0.8, P=Math.pow(V,-1.4); pts.push([ox+V*W*0.7, oy-P*H*0.55]);}}else if(c===2){pts.push([ox+W*0.18,oy-H*0.2],[ox+W*0.78,oy-H*0.2],[ox+W*0.78,oy-H*0.55],[ox+W*0.18,oy-H*0.55]);}else{pts.push([ox+W*0.16,oy-H*0.22],[ox+W*0.68,oy-H*0.24],[ox+W*0.60,oy-H*0.62],[ox+W*0.14,oy-H*0.58]);}
    if(c===2||c===3){g.fillStyle='rgba(34,211,238,.14)';g.beginPath();pts.forEach((p,i)=> i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fill();}
    g.strokeStyle='#22d3ee';g.lineWidth=3;g.beginPath();pts.forEach((p,i)=> i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));if(c!==2&&c!==3)g.stroke();else{g.closePath();g.stroke();}
    g.fillStyle='#fbbf24';pts.forEach(p=>{g.beginPath();g.arc(p[0],p[1],4,0,7);g.fill();});
    const names=['Isothermal: ΔU=0, PV=const','Adiabatic: Q=0, PV^γ=const','Isobaric: W=PΔV','Carnot: 2 isotherms + 2 adiabats'];
    rW.set((c===2||c===3)?'Area >0 = engine':'Area = heat input');rE.set(names[c]);
    g.fillStyle='#6b7a99';g.font='11px JetBrains Mono';g.fillText(names[c],12,18);
  });
});
