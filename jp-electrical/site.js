(function(){
  var root=document.documentElement;
  var switches=document.querySelectorAll('.js-lights');
  var label=document.querySelector('.js-lights-label');
  function set(on){
    root.dataset.lights=on?'on':'off';
    switches.forEach(function(s){s.setAttribute('aria-pressed',on)});
    if(label)label.textContent=on?'Lights on':'Lights off';
  }
  switches.forEach(function(s){s.addEventListener('click',function(){set(root.dataset.lights!=='on')})});

  var top=document.querySelector('.top');
  function stick(){top.classList.toggle('stuck',scrollY>innerHeight*.5)}
  addEventListener('scroll',stick,{passive:true});stick();

  // Opening: the page starts dark, then strikes like a fluoro tube.
  // Only the first page of a visit flickers; after that the lights are already on.
  var calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen=false;
  try{seen=sessionStorage.getItem('jp-lit')==='1';sessionStorage.setItem('jp-lit','1')}catch(e){}
  if(calm||seen){set(true)}
  else{
    [[650,1],[740,0],[830,1],[900,0],[1080,1]].forEach(function(s){setTimeout(function(){set(!!s[1])},s[0])});
  }

  // Each photo lights as you walk into its room.
  var lamps=document.querySelectorAll('.lamp');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('lit');io.unobserve(e.target)}})},{threshold:.25});
    lamps.forEach(function(l){io.observe(l)});
  }else{lamps.forEach(function(l){l.classList.add('lit')})}

  // Switchboard (homepage)
  var tabs=document.querySelectorAll('.circuit[role="tab"]');
  if(tabs.length){
    var rooms=document.querySelectorAll('.room img');
    var roomLabel=document.querySelector('.js-room-label');
    var go=document.querySelector('.js-room-go');
    var pick=function(t){
      var name=t.querySelector('strong').textContent;
      tabs.forEach(function(x){x.setAttribute('aria-selected',x===t)});
      rooms.forEach(function(r,i){r.classList.toggle('show',i==t.dataset.room)});
      if(roomLabel)roomLabel.textContent='Circuit '+(+t.dataset.room+1)+' · '+name;
      if(go&&t.dataset.href){go.href=t.dataset.href;go.textContent='See '+name.toLowerCase()}
    };
    tabs.forEach(function(t){
      t.addEventListener('click',function(){pick(t)});
      t.addEventListener('mouseenter',function(){if(matchMedia('(hover:hover)').matches)pick(t)});
      t.addEventListener('focus',function(){pick(t)});
    });
  }
})();
