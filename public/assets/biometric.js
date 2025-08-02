
(function(){
  const $ = (sel)=>document.querySelector(sel);
  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute('aria-label','Live camera preview');
  const canvas = document.createElement('canvas');
  let stream = null;

  function setupUI(){
    const holder = document.getElementById('cameraHolder');
    if(!holder) return;
    holder.innerHTML = '';
    const controls = document.createElement('div');
    controls.className = 'stack';
    const startBtn = document.createElement('button');
    startBtn.className = 'btn btn-primary';
    startBtn.textContent = 'Start Camera';
    const captureBtn = document.createElement('button');
    captureBtn.className = 'btn btn-success';
    captureBtn.textContent = 'Capture Photo';
    captureBtn.style.display = 'none';
    const retakeBtn = document.createElement('button');
    retakeBtn.className = 'btn btn-secondary';
    retakeBtn.textContent = 'Retake';
    retakeBtn.style.display = 'none';
    const useBtn = document.createElement('button');
    useBtn.className = 'btn btn-primary';
    useBtn.textContent = 'Use Photo';
    useBtn.style.display = 'none';

    const preview = document.createElement('img');
    preview.style.display = 'none';
    preview.style.maxWidth = '320px';
    preview.style.borderRadius = '8px';
    preview.style.border = '1px solid #e5e7eb';

    holder.appendChild(video);
    holder.appendChild(preview);
    holder.appendChild(controls);
    controls.appendChild(startBtn);
    controls.appendChild(captureBtn);
    controls.appendChild(retakeBtn);
    controls.appendChild(useBtn);

    startBtn.addEventListener('click', async ()=>{
      if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
        alert('Camera not supported by this browser. Please use the file upload instead.');
        return;
      }
      try{
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: {ideal: 640}, height: {ideal: 480} }, audio: false });
        video.srcObject = stream;
        startBtn.style.display = 'none';
        captureBtn.style.display = '';
      }catch(err){
        alert('Could not access camera: ' + err.message);
      }
    });

    captureBtn.addEventListener('click', ()=>{
      if(!video.videoWidth) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      preview.src = dataUrl;
      preview.style.display = 'block';
      captureBtn.style.display = 'none';
      retakeBtn.style.display = '';
      useBtn.style.display = '';
      video.style.display = 'none';
    });

    retakeBtn.addEventListener('click', ()=>{
      preview.style.display = 'none';
      video.style.display = '';
      captureBtn.style.display = '';
      retakeBtn.style.display = 'none';
      useBtn.style.display = 'none';
    });

    useBtn.addEventListener('click', async ()=>{
      const dataUrl = preview.src;
      if(!dataUrl){ return; }
      
      const res = await fetch('/biometric', {
        method: 'POST',
        body: await (async ()=>{
          const blob = await (await fetch(dataUrl)).blob();
          const fd = new FormData();
          fd.append('selfie', blob, 'selfie.jpg');
          return fd;
        })()
      });
      
      window.location.href = '/biometric';
    });

    window.addEventListener('beforeunload', ()=>{
      if(stream){
        stream.getTracks().forEach(t=>t.stop());
      }
    });
  }

  document.addEventListener('DOMContentLoaded', setupUI);
})();
