
(function(){
  const root = document.documentElement;
  const status = document.getElementById('a11y-status');

  function announce(msg){
    if (!status) return;
    status.textContent = msg;
    setTimeout(()=>{ status.textContent = ''; }, 2000);
  }

  const smaller = document.getElementById('textSmaller');
  const bigger  = document.getElementById('textBigger');
  function getFont(){ return parseFloat(getComputedStyle(root).getPropertyValue('--base-font')); }
  smaller && smaller.addEventListener('click', ()=>{
    const v = Math.max(16, getFont() - 2);
    root.style.setProperty('--base-font', v + 'px');
    announce('Text smaller');
  });
  bigger && bigger.addEventListener('click', ()=>{
    const v = Math.min(26, getFont() + 2);
    root.style.setProperty('--base-font', v + 'px');
    announce('Text bigger');
  });

  const hc = document.getElementById('toggleContrast');
  hc && hc.addEventListener('click', ()=>{
    const on = document.body.classList.toggle('high-contrast');
    hc.setAttribute('aria-pressed', on ? 'true' : 'false');
    announce(on ? 'High contrast on' : 'High contrast off');
  });

  const reader = document.getElementById('readAloud');
  reader && reader.addEventListener('click', ()=>{
    const synth = window.speechSynthesis;
    if (!synth) { announce('Speech not supported'); return; }
    synth.cancel();
    const text = document.getElementById('content').innerText;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.9; utter.pitch = 1.0;
    synth.speak(utter);
    reader.setAttribute('aria-pressed', 'true');
    announce('Reading page');
  });

  const main = document.getElementById('content');
  main && main.focus();
})();
