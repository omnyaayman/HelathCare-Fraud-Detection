#!/bin/bash

echo "============================================================"
echo "🚀 Starting Metabase Dashboard"
echo "============================================================"

# تشغيل Metabase في الخلفية
echo "📊 Starting Metabase server..."
java -jar /app/metabase.jar &

# انتظار Metabase حتى يصبح جاهزاً
echo "⏳ Waiting for Metabase to start (45 seconds)..."
sleep 45

# التحقق من أن Metabase شغال
echo "🔍 Checking if Metabase is ready..."
for i in {1..10}; do
    if curl -s http://localhost:3000/api/health > /dev/null; then
        echo "✅ Metabase is ready!"
        break
    fi
    echo "⏳ Still waiting... (attempt $i/10)"
    sleep 5
done

# تشغيل سكربت التهيئة
echo "🚀 Initializing Metabase Dashboards..."
python3 /init_metabase.py

echo "============================================================"
echo "✅ Metabase initialization complete!"
echo "🌐 Open your browser: http://localhost:3000"
echo "👤 Email: admin@metabase.com"
echo "🔑 Password: metabase123"
echo "============================================================"

# البقاء في المقدمة
wait