/* PhysiX Academy — Games (trial/games): 2 physics-lab games */
'use strict';
const Games={list:[]};
Games.register=(id,title,desc,icon,run)=>Games.list.push({id,title,desc,icon,run});
Games.col={bg:'#05070d',grid:'#26314a',accent:'#22d3ee',ok:'#34d399',warn:'#fbbf24'};

/* Game 1 — Projectile Sniper: hit the moving target */
Games.register('sniper','Projectile Sniper','Adjust angle & power to hit the drifting target. 5 hits to win.','🎯',frame=>{
  const cv=SU.canvas(frame,300);const ctr=SU.el('div','sim-controls');frame.appendChild(ctr);
  const ro=SU.el('div','sim-readouts');frame.appendChild(ro);
  const act=SU.el('div','sim-actions');frame.appendChild(act);
  const ANG=SU.slider(ctr,'Angle (°)',10,80,1,42), PWR=SU.slider(ctr,'Power',6,18,0.5,11);
  const rScore=SU.readout(ro,'Score'), rBest=SU.readout(ro,'Best'), rWind=SU.readout(ro,'Wind');
  let score=0,best=+localStorage.getItem('physix-sniper')||0, wind=(Math.random()-0.5)*1.4, proj=null, target={x:0,y:0,vx:1.2}, hits=0;
  const resetTarget=()=>{target.x=cv.W*0.62+Math.random()*80; target.y=cv.H*0.35+Math.random()*60; target.vx=(Math.random()>0.5?1: -1)*(0.7+Math.random()*1.1);};
  resetTarget(); rBest.set(best); rWind.set(wind.toFixed(2)+' m/s');
  SU.btn(act,'🎯 Fire!',()=>{
    if(proj) return;
    const ang=ANG.get()*Math.PI/180, p=PWR.get();
    proj={x:34,y:cv.H-34,vx:Math.cos(ang)*p+wind*0.5,vy:-Math.sin(ang)*p, t:0};
  });
  SU.btn(act,'⟲ New target',()=>{resetTarget();});
  SU.loop(cv.c,dt=>{
    target.x+=target.vx; if(target.x< cv.W*0.55 || target.x>cv.W-18) target.vx*=-1;
    if(proj){
      proj.vy+=9.8*0.42*dt; proj.x+=proj.vx*22*dt; proj.y+=proj.vy*22*dt; proj.t+=dt;
      const dx=proj.x-target.x, dy=proj.y-target.y, hit=Math.hypot(dx,dy)<18;
      if(hit){ score++; hits++; if(score>best){best=score; localStorage.setItem('physix-sniper',best); rBest.set(best);} rScore.set(score+' /5'); proj=null; if(hits>=5){ rScore.set('🏆 Won! '+score+' pts'); hits=0; } else resetTarget(); }
      else if(proj.y>cv.H+12||proj.x>cv.W+12||proj.t>4){ proj=null; }
    }
    rScore.set(score+' /5'); 
    const g=cv.g; g.fillStyle=Games.col.bg; g.fillRect(0,0,cv.W,cv.H);
    g.strokeStyle=Games.col.grid; g.lineWidth=1; g.setLineDash([4,4]); g.beginPath();g.moveTo(0,cv.H-30);g.lineTo(cv.W,cv.H-30);g.stroke();g.setLineDash([]);
    // cannon
    const ang=ANG.get()*Math.PI/180; g.save(); g.translate(34,cv.H-34); g.rotate(-ang); g.fillStyle='#33415c'; g.fillRect(0,-8,28,16); g.restore();
    g.fillStyle='#1e293b'; g.beginPath();g.arc(34,cv.H-34,12,0,7);g.fill();
    // target
    g.fillStyle='#f87171'; g.beginPath();g.arc(target.x,target.y,12,0,7);g.fill(); g.fillStyle='#fff'; g.beginPath();g.arc(target.x,target.y,5,0,7);g.fill(); g.fillStyle='#f87171'; g.beginPath();g.arc(target.x,target.y,2.5,0,7);g.fill();
    // projectile
    if(proj){ g.fillStyle='#fbbf24'; g.beginPath();g.arc(proj.x,proj.y,5,0,7);g.fill(); g.fillStyle='rgba(251,191,36,.25)'; g.beginPath();g.arc(proj.x,proj.y,10,0,7);g.fill();}
    // wind
    g.fillStyle='#6b7a99'; g.font='11px JetBrains Mono'; g.fillText('wind '+wind.toFixed(2)+' m/s →',12,18);
    g.fillStyle='#9aa8c3'; g.font='10px Segoe UI'; g.fillText('5 hits to win',12,cv.H-8);
  });
});

/* Game 2 — Torque Balance: balance beam with weights */
Games.register('balance','Torque Balance','Place weights to balance the beam. Torque = r × F.','⚖️',frame=>{
  const cv=SU.canvas(frame,300);const ctr=SU.el('div','sim-controls');frame.appendChild(ctr);
  const ro=SU.el('div','sim-readouts');frame.appendChild(ro);
  const act=SU.el('div','sim-actions');frame.appendChild(act);
  const LEFT_W=SU.slider(ctr,'Left weight (kg)',1,10,1,4), LEFT_R=SU.slider(ctr,'Left distance (m)',1,4,0.5,3);
  const RIGHT_W=SU.slider(ctr,'Right weight (kg)',1,10,1,4), RIGHT_R=SU.slider(ctr,'Right distance (m)',1,4,0.5,3);
  const rT=SU.readout(ro,'Net torque'), rS=SU.readout(ro,'State');
  let angle=0, angV=0, score=0;
  SU.btn(act,'⚖️ Check balance',()=>{
    const tauL=LEFT_W.get()*9.8*LEFT_R.get(), tauR=RIGHT_W.get()*9.8*RIGHT_R.get(), net=tauL-tauR;
    if(Math.abs(net)<2){ score++; rS.set('✅ Balanced! Score '+score); angle*=0.3; }
    else { rS.set( (net>0?'⬅️ Left heavy':'Right heavy ➡️')+' — adjust!'); }
  });
  SU.btn(act,'🔀 Random challenge',()=>{
    LEFT_W.set(1+Math.floor(Math.random()*5)); LEFT_R.set(1+Math.random()*3);
    // set right to be solvable near balance
    const lw=LEFT_W.get(), lr=LEFT_R.get();
    RIGHT_R.set(1+Math.random()*3);
    RIGHT_W.set(Math.max(1, Math.round(lw*lr / RIGHT_R.get())));
  });
  SU.loop(cv.c,dt=>{
    const tauL=LEFT_W.get()*9.8*LEFT_R.get(), tauR=RIGHT_W.get()*9.8*RIGHT_R.get(), net=tauL-tauR;
    const targetAng=Math.max(-0.45, Math.min(0.45, net*0.015));
    angV+=(targetAng-angle)*6*dt; angV*=0.94; angle+=angV*dt;
    rT.set(net.toFixed(1)+' N·m');
    if(Math.abs(net)<2 && !rS.el) rS.set('✅ Balanced!');
    const g=cv.g; g.fillStyle=Games.col.bg; g.fillRect(0,0,cv.W,cv.H);
    const cx=cv.W/2, cy=cv.H*0.62;
    // pivot
    g.fillStyle='#33415c'; g.beginPath();g.moveTo(cx-14,cy+46);g.lineTo(cx+14,cy+46);g.lineTo(cx,cy-6);g.closePath();g.fill();
    g.save(); g.translate(cx,cy); g.rotate(angle);
    // beam
    g.fillStyle='#1e293b'; g.fillRect(-150,-6,300,12); g.strokeStyle='#475569'; g.lineWidth=1; g.strokeRect(-150,-6,300,12);
    // left weight
    const lx=-LEFT_R.get()*32, lw=14+LEFT_W.get()*2.2;
    g.fillStyle='#38bdf8'; g.fillRect(lx-lw/2, -6-lw, lw,lw); g.fillStyle='#e0f2fe'; g.font='10px JetBrains Mono'; g.textAlign='center'; g.fillText(LEFT_W.get()+'kg',lx, -6-lw/2+3);
    // right weight
    const rx=RIGHT_R.get()*32, rw=14+RIGHT_W.get()*2.2;
    g.fillStyle='#fbbf24'; g.fillRect(rx-rw/2, -6-rw, rw,rw); g.fillStyle='#0b1020'; g.textAlign='center'; g.fillText(RIGHT_W.get()+'kg',rx, -6-rw/2+3);
    g.textAlign='left';
    g.restore();
    // level indicator
    g.fillStyle=Math.abs(angle)<0.06?'#34d399':'#f87171'; g.beginPath();g.arc(cx,cy-44,6,0,7);g.fill();
    g.fillStyle='#6b7a99'; g.font='11px Segoe UI'; g.fillText('Net torque → angle',12,18);
    g.font='11px JetBrains Mono'; g.fillText('τₗ='+tauL.toFixed(0)+'  τᵣ='+tauR.toFixed(0),12,32);
  });
  // fix readout element reference for status
  rS.el=rS.el||document.createElement('div');
});

function viewGames(id){
  if(id){
    const g=Games.list.find(x=>x.id===id);
    if(!g){App.el.innerHTML='<div class="wrap"><p>Game not found.</p><a href="#/games">← All games</a></div>'; return;}
    App.el.innerHTML=`<div class="wrap"><a href="#/games" class="more">← All games</a><h1>${esc(g.title)}</h1><p class="muted">${esc(g.desc)}</p><div id="game-frame" class="sim-frame"></div></div>`;
    g.run(document.getElementById('game-frame'));
  } else {
    App.el.innerHTML=`<div class="wrap"><div class="page-head"><h1>Games</h1><p class="sub">2 physics-based games — learn by playing. Like PhysicsLab.</p></div><div class="grid g2">${Games.list.map(g=>`<a class="card hover" href="#/games/${g.id}"><div class="lv-num">${esc(g.icon)}</div><h3>${esc(g.title)}</h3><p class="muted">${esc(g.desc)}</p><span class="chip plain">Play →</span></a>`).join('')}</div></div>`;
  }
  afterRender();
}
