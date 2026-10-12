import { SU } from './core.js';
import { Sims } from './sims-a.js';
/* PhysiX Academy — More Sims: Thermo, KTG, Atoms (local trial) */
'use strict';
function msArrow(g,x,y,dx,dy,c,w){const l=Math.hypot(dx,dy);if(l<2)return;g.strokeStyle=c;g.fillStyle=c;g.lineWidth=w||2;g.beginPath();g.moveTo(x,y);g.lineTo(x+dx,y+dy);g.stroke();const a=Math.atan2(dy,dx),h=(w||2)+4;g.beginPath();g.moveTo(x+dx,y+dy);g.lineTo(x+dx-h*Math.cos(a-0.42),y+dy-h*Math.sin(a-0.42));g.lineTo(x+dx-h*Math.cos(a+0.42),y+dy-h*Math.sin(a+0.42));g.closePath();g.fill();}

Sims.register('thermo-engine','Heat Engine Cycle','Carnot vs real — the loop is drawn from Th and Tc, area = work, efficiency = 1−Tc/Th.','🔥',frame=>{
  /* The P-V loop used to be four hard-coded literals:
       const pts=[[ox+W*0.2,oy-H*0.3],[ox+W*0.7,oy-H*0.28],[ox+W*0.6,oy-H*0.72],[ox+W*0.15,oy-H*0.75]];
     independent of both sliders, so the readouts moved while the picture never
     did - a decorative illustration wearing the costume of a simulation.
     Everything below is derived from the reservoir temperatures instead.

     Same constants as the 3D Heat Engine Cycle (html5-sims/thermo-engine.html)
     so the two renderings of this cycle agree. */
  const R=8.314, N=40, GAMMA=1.4, V1=0.40, V2=1.20;   // J/(mol K), mol, -, m^3, m^3
  const nR=N*R;                                        // J/K
  const cv=SU.canvas(frame,360);const ctr=SU.el('div','sim-controls');frame.appendChild(ctr);const ro=SU.el('div','sim-readouts');frame.appendChild(ro);
  /* SU.slider's input handler calls oninput(...) unconditionally, so omitting it
     threw "oninput is not a function" every time a student dragged either
     slider. The animation loop redraws from TH.get()/TC.get() each frame, so a
     no-op callback is the honest thing to pass - the sibling simulations do the
     same. */
  const TH=SU.slider(ctr,'Hot Th (°C)',150,500,10,400,()=>{}), TC=SU.slider(ctr,'Cold Tc (°C)',20,100,5,40,()=>{});
  const rEff=SU.readout(ro,'Carnot η'), rW=SU.readout(ro,'Work per cycle');
  const rP=SU.readout(ro,'Peak pressure'), rV=SU.readout(ro,'Max volume');
  /* Round tick values (1/2/5 x 10^n) so the axis reads sensibly whatever the
     temperatures do. */
  const niceStep=(span,target)=>{const raw=span/Math.max(1,target),mag=Math.pow(10,Math.floor(Math.log10(raw))),nm=raw/mag;return (nm<1.5?1:nm<3?2:nm<7?5:10)*mag;};
  SU.loop(cv.c,()=>{
    /* Kelvin, and the cold reservoir may not sit above the hot one. */
    const th=TH.get()+273.15, tc=Math.min(TC.get()+273.15, th-5);
    const r=Math.pow(th/tc,1/(GAMMA-1));
    const press=(V,T)=>nR*T/V;
    const p1=press(V1,th), p3=press(V2*r,tc);
    const Qin=nR*th*Math.log(V2/V1), Qout=nR*tc*Math.log(V2/V1);
    const Wk=Qin-Qout, eff=1-tc/th;
    rEff.set((eff*100).toFixed(1)+'%');
    rW.set((Wk/1000).toFixed(1)+' kJ');
    rP.set((p1/1000).toFixed(0)+' kPa');
    rV.set((V2*r).toFixed(2)+' m³');

    const g=cv.g; g.fillStyle='#05070d'; g.fillRect(0,0,cv.W,cv.H);
    const ox=60,oy=cv.H-40,W=cv.W-80,H=280;
    const vmax=V2*r;
    const sx=V=>ox+(V-V1)/(vmax-V1)*W;
    const sy=p=>oy-p/p1*H;
    /* Four legs of a real Carnot cycle. The isothermal legs follow pV=nRT and
       are therefore hyperbolae that FALL as the gas expands; the adiabatic legs
       follow pV^gamma = const. Sampling 40 points per leg is plenty at this
       size and keeps the redraw cheap. */
    const legs=[
      {c:'#ff7a7a',name:'isothermal expansion',pts:sampleLeg(V1,V2,t=>press(t,th))},
      {c:'#ffc043',name:'adiabatic expansion',pts:sampleLeg(V2,V2*r,V=>press(V2,th)*Math.pow(V2/V,GAMMA))},
      {c:'#3ee0a4',name:'isothermal compression',pts:sampleLeg(V2*r,V1*r,t=>press(t,tc))},
      {c:'#31d7f0',name:'adiabatic compression',pts:sampleLeg(V1*r,V1,V=>press(V1*r,tc)*Math.pow(V1*r/V,GAMMA))}
    ];
    function sampleLeg(a,b,pf){
      const out=[];for(let j=0;j<40;j++){const V=a+(b-a)*j/39;out.push([sx(V),sy(pf(V))]);}return out;
    }

    /* shaded loop = the work this cycle encloses */
    g.fillStyle='rgba(34,211,238,.18)';
    g.beginPath();
    legs.forEach((L,i)=>L.pts.forEach((pt,j)=>(i||j)?g.lineTo(pt[0],pt[1]):g.moveTo(pt[0],pt[1])));
    g.closePath(); g.fill();
    g.lineWidth=2;
    legs.forEach(L=>{g.strokeStyle=L.c;g.beginPath();L.pts.forEach((pt,j)=>j?g.lineTo(pt[0],pt[1]):g.moveTo(pt[0],pt[1]));g.stroke();});
    /* corner states */
    g.fillStyle='#fbbf24';
    [[V1,p1],[V2,press(V2,th)],[V2*r,p3],[V1*r,press(V1*r,tc)]].forEach(s=>{g.beginPath();g.arc(sx(s[0]),sy(s[1]),4,0,7);g.fill();});

    /* axes, ticks and units */
    g.strokeStyle='#33415c'; g.lineWidth=1;
    g.strokeRect(ox,oy-H,W,H);
    g.fillStyle='#9aa8c3'; g.font='11px JetBrains Mono'; g.textAlign='center';
    const vs=niceStep(vmax-V1,5);
    for(let v=V1;v<=vmax+vs*1e-6;v+=vs){const x=sx(v);g.fillRect(x,oy-2,1,4);g.fillText(v.toFixed(2),x,oy+14);}
    const ps=niceStep(p1/1000,4);
    for(let p=0;p<=p1/1000+ps*1e-6;p+=ps){const y=sy(p*1000);g.fillRect(ox-4,y,4,1);g.fillText(p.toFixed(0),ox-30,y+4);}
    g.textAlign='left';  g.fillText('P (kPa)',ox-46,oy-H-6);
    g.textAlign='right'; g.fillText('V (m³)',ox+W,oy+28);
  });
});

Sims.register('ktg-gas','Kinetic Gas','Heat → faster molecules → higher pressure. T ∝ ⟨½mv²⟩.','💨',frame=>{
  const cv=SU.canvas(frame,360);const ctr=SU.el('div','sim-controls');frame.appendChild(ctr);const ro=SU.el('div','sim-readouts');frame.appendChild(ro);
  const T=SU.slider(ctr,'Temperature (K)',200,600,10,300);const rRMS=SU.readout(ro,'rms speed'), rP=SU.readout(ro,'Pressure');
  let pts=[];for(let i=0;i<80;i++) pts.push({x:Math.random()*cv.W,y:Math.random()*cv.H,vx:(Math.random()-0.5)*2,vy:(Math.random()-0.5)*2});
  SU.loop(cv.c,dt=>{
    const tK=T.get(), scale=Math.sqrt(tK/300); rRMS.set((483*scale).toFixed(0)+' m/s (O₂)'); rP.set((scale*1.2).toFixed(2)+' bar (demo)');
    const g=cv.g; g.fillStyle='#05070d';g.fillRect(0,0,cv.W,cv.H);
    g.strokeStyle='#26314a'; g.strokeRect(4,4,cv.W-8,cv.H-8);
    pts.forEach(p=>{
      p.vx+=(Math.random()-0.5)*0.2*scale; p.vy+=(Math.random()-0.5)*0.2*scale;
      p.vx*=0.99; p.vy*=0.99;
      p.x+=p.vx*scale; p.y+=p.vy*scale;
      if(p.x<6||p.x>cv.W-6) p.vx*=-1; if(p.y<6||p.y>cv.H-6) p.vy*=-1;
      g.fillStyle='#38bdf8'; g.beginPath();g.arc(p.x,p.y,3,0,7);g.fill();
    });
    g.fillStyle='#6b7a99';g.font='11px Segoe UI';g.fillText('Heat → molecules faster → more collisions',12,18);
  });
});

Sims.register('atoms-bohr','Bohr Atom','n=1,2,3 — radius ∝ n², energy ∝ -1/n².','⚛️',frame=>{
  const cv=SU.canvas(frame,360);const ctr=SU.el('div','sim-controls');frame.appendChild(ctr);const ro=SU.el('div','sim-readouts');frame.appendChild(ro);
  const N=SU.slider(ctr,'Shell n',1,4,1,1);const rR=SU.readout(ro,'rₙ'), rE=SU.readout(ro,'Eₙ');
  SU.loop(cv.c,()=>{
    const n=N.get(), r=0.53*n*n, E=-13.6/(n*n);
    rR.set(r.toFixed(2)+' Å'); rE.set(E.toFixed(2)+' eV');
    const g=cv.g; g.fillStyle='#05070d';g.fillRect(0,0,cv.W,cv.H);
    const cx=cv.W/2,cy=cv.H/2;
    g.fillStyle='#fbbf24'; g.beginPath();g.arc(cx,cy,8,0,7);g.fill();g.fillStyle='#fff';g.font='10px Segoe UI';g.textAlign='center';g.fillText('+',cx,cy+3);g.textAlign='left';
    g.strokeStyle='#33415c'; for(let i=1;i<=4;i++){g.beginPath();g.arc(cx,cy,18+ i*22,0,7);g.strokeStyle=i===n?'#22d3ee':'#26314a';g.stroke();}
    g.fillStyle='#38bdf8'; const ang=Date.now()*0.001*(0.5+n*0.2); const rr=18+n*22; g.beginPath();g.arc(cx+Math.cos(ang)*rr, cy+Math.sin(ang)*rr,5,0,7);g.fill();
    g.fillStyle='#9aa8c3';g.font='11px JetBrains Mono';g.fillText('rₙ=n²a₀  Eₙ=-13.6/n² eV',12,18);
  });
});
