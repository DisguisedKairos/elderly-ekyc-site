
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const session = require('express-session');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());

// Static
app.use(express.static(path.join(__dirname, 'public')));

// Sessions
app.use(session({
  secret: 'elderly-ekyc-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 30 } // 30 min
}));

// Uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));
const upload = multer({ dest: uploadsDir });

// Helpers
function ensureData(req) {
  if (!req.session.data) req.session.data = {};
  if (!req.session.files) req.session.files = {};
  return req.session.data;
}
function generateOTP(){
  return ('' + Math.floor(100000 + Math.random()*900000));
}
function pseudoScore(seed){
  const h = crypto.createHash('md5').update(seed || Date.now().toString()).digest('hex');
  const val = parseInt(h.slice(0,4), 16);
  const score = 0.75 + (val % 2500)/10000; // 0.75 - 0.999
  return Math.min(0.99, score);
}
function computeDecision(req){
  const data = req.session.data || {};
  const files = req.session.files || {};
  const reasons = [];
  if (!data.name || !data.nric || !data.email || !data.phone) reasons.push('Missing personal details.');
  if (!files.idFront || !files.idBack || !files.proofAddress) reasons.push('Documents incomplete.');
  if (!files.selfie) reasons.push('Selfie not uploaded.');
  const score = req.session.faceScore || 0;
  if (score < 0.8) reasons.push('Face match score too low.');
  if (!req.session.otpVerified) reasons.push('OTP not verified.');
  const status = reasons.length ? 'rejected' : 'approved';
  const message = status === 'approved' ? 'Your identity has been verified successfully.' : 'Please fix the items below and try again.';
  return { status, message, reasons, score };
}

// Routes
app.get('/', (req, res) => {
  res.render('landing', { title: 'Elderly eKYC Onboarding', progress: 0 });
});

// Register
app.get('/register', (req, res) => {
  const data = ensureData(req);
  res.render('register', { title: 'Register', data, progress: 10 });
});
app.post('/register', (req, res) => {
  const data = ensureData(req);
  const body = req.body || {};
  const required = ['name','nric','email','phone'];
  const missing = required.filter(k => !body[k] || String(body[k]).trim()==='');
  if (missing.length) {
    return res.status(400).render('register', { title:'Register', error: 'Please fill in all fields.', data: body, progress: 10 });
  }
  data.name = String(body.name).trim();
  data.nric = String(body.nric).trim();
  data.email = String(body.email).trim();
  data.phone = String(body.phone).trim();
  return res.redirect('/documents');
});

// MyInfo consent flow (simulation)
app.get('/myinfo/consent', (req, res) => {
  res.render('myinfo-consent', { title: 'MyInfo Consent', progress: 5 });
});
app.post('/myinfo/consent/agree', (req, res) => {
  ensureData(req);
  req.session.myinfoConsent = true;
  return res.redirect('/myinfo/autofill');
});
app.post('/myinfo/consent/decline', (req, res) => {
  ensureData(req);
  req.session.myinfoConsent = false;
  return res.redirect('/register');
});
app.get('/myinfo/autofill', (req, res) => {
  const data = ensureData(req);
  Object.assign(data, {
    name: 'Aisaac Sim',
    nric: 'S1234567A',
    email: 'aisaac@example.com',
    phone: '91234567'
  });
  return res.redirect('/register');
});

// Documents
app.get('/documents', (req, res) => {
  ensureData(req);
  const f = req.session.files || {};
  const files = Object.keys(f).map((field) => {
    const file = f[field];
    const label = field === 'idFront' ? 'ID Front' : field === 'idBack' ? 'ID Back' : field === 'Proof of Address' ? 'Proof of Address' : field;
    return { field, label, preview: '/uploads/' + file.filename };
  });
  res.render('documents', { title:'Documents', files, progress: 35 });
});
app.post('/documents', upload.fields([{name:'idFront', maxCount:1},{name:'idBack', maxCount:1},{name:'proofAddress', maxCount:1}]), (req, res) => {
  ensureData(req);
  const f = req.files || {};
  if (!f.idFront || !f.idBack || !f.proofAddress) {
    return res.status(400).render('documents', { title:'Documents', error:'Please upload all 3 documents.', progress: 35 });
  }
  ['idFront','idBack','proofAddress'].forEach((k) => {
    req.session.files[k] = f[k][0];
  });
  return res.redirect('/documents');
});

// Biometric
app.get('/biometric', (req, res) => {
  ensureData(req);
  const score = req.session.faceScore;
  res.render('biometric', { title:'Face Check', score, progress: 60, pageScript: '/assets/biometric.js' });
});
app.post('/biometric', upload.single('selfie'), (req, res) => {
  const data = ensureData(req);
  if (!req.file) {
    
    const snap = req.body && req.body.snapshot;
    if (!snap || !/^data:image\/(png|jpeg);base64,/.test(snap)) {
      return res.status(400).render('biometric', { title:'Face Check', error:'Please upload or capture a selfie.', progress: 60 });
    }
    const base64 = snap.split(',')[1];
    const buf = Buffer.from(base64, 'base64');
    const filename = 'selfie-' + Date.now() + '.jpg';
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buf);
    req.session.files.selfie = { filename };
    const seed = (data.name || '') + (req.session.files.idFront ? req.session.files.idFront.filename : '') + filename;
    const score = pseudoScore(seed);
    req.session.faceScore = score;
    return res.redirect('/biometric');
  }
  req.session.files.selfie = req.file;
  const seed = (data.name || '') + (req.session.files.idFront ? req.session.files.idFront.filename : '') + req.file.filename;
  const score = pseudoScore(seed);
  req.session.faceScore = score;
  return res.redirect('/biometric');
});

// OTP
app.get('/otp', (req, res) => {
  ensureData(req);
  if (!req.session.otp) req.session.otp = generateOTP();
  const info = `Simulation: your OTP is ${req.session.otp}`;
  res.render('otp', { title:'OTP', info, progress: 80 });
});
app.get('/otp/resend', (req, res) => {
  req.session.otp = generateOTP();
  res.redirect('/otp');
});
app.post('/otp', (req, res) => {
  const userOtp = (req.body && req.body.otp) ? String(req.body.otp).trim() : '';
  if (!userOtp || !/^[0-9]{6}$/.test(userOtp)) {
    return res.status(400).render('otp', { title:'OTP', error:'Please enter the 6-digit OTP.', progress: 80 });
  }
  if (userOtp !== req.session.otp) {
    return res.status(400).render('otp', { title:'OTP', error:'Incorrect OTP. Try again or resend.', progress: 80 });
  }
  req.session.otpVerified = true;
  return res.redirect('/decision');
});

// Decision
app.get('/decision', (req, res) => {
  const decision = computeDecision(req);
  const data = req.session.data || {};
  const files = req.session.files || {};
  const docsOk = !!(files.idFront && files.idBack && files.proofAddress);
  const score = req.session.faceScore || 0;
  const otpOk = !!req.session.otpVerified;
  res.render('decision', { title:'Decision', decision, data, docsOk, score, otpOk, progress: 100 });
});

// 404
app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`Elderly eKYC site running at http://localhost:${PORT}`);
});
