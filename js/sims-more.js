/* PhysiX Academy — More Sims: Thermo, KTG, Atoms (local trial) */
'use strict';
function msArrow(g,x,y,dx,dy,c,w){const l=Math.hypot(dx,dy);if(l<2)return;g.strokeStyle=c;g.fillStyle=c;g.lineWidth=w||2;g.beginPath();g.moveTo(x,y);g.lineTo(x+dx,y+dy);g.stroke();const a=Math.atan2(dy,dx),h=(w||2)+4;g.beginPath();g.moveTo(x+dx,y+dy);g.lineTo(x+dx-h*Math.cos(a-0.42),y+dy-h*Math.sin(a-0.42));g.lineTo(x+dx-h*Math.cos(a+0.42),y+dy-h*Math.sin(a+0.42));g.closePath();g.fill();}

Sims.register('thermo-engine','Heat Engine Cycle','Carnot vs real — see area = work, efficiency = 1−Tc/Th.','🔥',frame=>{
  const cv=SU.canvas(frame,300);const ctr=SU.el('div','sim-controls');frame.appendChild(ctr);const ro=SU.el('div','sim-readouts');frame.appendChild(ro);
  const TH=SU.slider(ctr,'Hot Th (°C)',150,500,10,400), TC=SU.slider(ctr,'Cold Tc (°C)',20,100,5,40);
  const rEff=SU.readout(ro,'Carnot η'), rW=SU.readout(ro,'Work (area)');
  SU.loop(cv.c,()=>{
    const th=TH.get()+273, tc=TC.get()+273, eff=1-tc/th; rEff.set((eff*100).toFixed(1)+'%'); rW.set((eff*100).toFixed(0)+' J/cycle (demo)');
    const g=cv.g; g.fillStyle='#05070d'; g.fillRect(0,0,cv.W,cv.H);
    const ox=60,oy=cv.H-40,W=cv.W-80,H=200; g.strokeStyle='#33415c'; g.strokeRect(ox,oy-H,W,H);
    const pts=[[ox+W*0.2,oy-H*0.3],[ox+W*0.7,oy-H*0.28],[ox+W*0.6,oy-H*0.72],[ox+W*0.15,oy-H*0.75]];
    g.fillStyle='rgba(34,211,238,.18)'; g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fill();
    g.strokeStyle='#22d3ee'; g.lineWidth=2; g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.stroke();
    g.fillStyle='#fbbf24'; pts.forEach(p=>{g.beginPath();g.arc(p[0],p[1],4,0,7);g.fill();});
    g.fillStyle='#9aa8c3';g.font='11px JetBrains Mono';g.fillText('P↑',ox-14,oy-H+10);g.fillText('V→',ox+W-12,oy+12);
  });
});

Sims.register('ktg-gas','Kinetic Gas','Heat → faster molecules → higher pressure. T ∝ ⟨½mv²⟩.','💨',frame=>{
  const cv=SU.canvas(frame,300);const ctr=SU.el('div','sim-controls');frame.appendChild(ctr);const ro=SU.el('div','sim-readouts');frame.appendChild(ro);
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
  const cv=SU.canvas(frame,300);const ctr=SU.el('div','sim-controls');frame.appendChild(ctr);const ro=SU.el('div','sim-readouts');frame.appendChild(ro);
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
