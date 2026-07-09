@echo off
echo Starting Healthcare Fraud Detection System...

:: تشغيل الباك إند
start cmd /k "uvicorn app.main:app --reload --port 8000"

:: تشغيل الفرونت إند
start cmd /k "cd frontend && npm run dev"

:: الانتظار 3 ثواني عشان السيرفرات تلحق تقوم
timeout /t 3 /nobreak > nul

:: فتح واجهة المشروع في المتصفح أوتوماتيك
start http://localhost:5173