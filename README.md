# Elderly eKYC Site (from scratch)

Elderly-friendly onboarding flow with EJS + Express.

## Run
```bash
npm install
npm start
# open http://localhost:3001/
```

## Routes
- `/` — Landing
- `/register` — Step 1 (Retrieve MyInfo, Mock Autofill, Save and Continue)
- `/myinfo/consent` — Consent screen (Agree/No Thanks)
- `/myinfo/autofill` — Mock MyInfo autofill (simulation)
- `/documents` — Step 2 (uploads for idFront, idBack, proofAddress)
- `/biometric` — Step 3 (selfie upload, simulated face match score)
- `/otp` — Step 4 (6-digit OTP mock + resend)
- `/decision` — Step 5 (result, approval or reasons to fix)