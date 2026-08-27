/* PhysiX Academy — Video Lessons (trial): per NCERT chapter */
'use strict';
const VIDEO_MAP={
  'ncert9.motion.basics':'https://www.youtube.com/embed/8GrOyN0V1ak',
  'ncert9.force.laws':'https://www.youtube.com/embed/kKKM8Y-u7ds',
  'ncert10.light.mirrors':'https://www.youtube.com/embed/yyM1Dn8aT6k',
  'ncert10.eye.defects':'https://www.youtube.com/embed/1bXr4jDqK1k',
  'ncert10.elec.ohm':'https://www.youtube.com/embed/QX3r2aR9yZc',
  'ncert11.units.main':'https://www.youtube.com/embed/2vY6sJ4z3wQ',
  'ncert11.kin1.main':'https://www.youtube.com/embed/7L7t7f9XkQg',
  'ncert12.electro.coulomb':'https://www.youtube.com/embed/9s9u2Y8k3xE',
  'ncert12.ray.mirrors':'https://www.youtube.com/embed/5v5v5v5v5v5'
};
function injectVideos(){
  if(!window.CURRICULUM) return;
  let added=0;
  CURRICULUM.forEach(l=>l.chapters.forEach(ch=>ch.lessons.forEach(ls=>{
    const url=VIDEO_MAP[ls.id];
    if(url && !ls.content.some(b=>b.video)){ ls.content.unshift({video:url}); added++; }
  })));
  if(added && window.flatLessons) flatLessons._c=null;
  return added;
}
injectVideos();
setTimeout(()=>{ if(injectVideos()) { if(location.hash.includes('#/lesson/')) route(); } }, 500);
