import streamlit as st
import duckdb
import os
import plotly.express as px
from streamlit_autorefresh import st_autorefresh

# 1️⃣ إعدادات الصفحة والتصميم العام (Layout)
st.set_page_config(
    page_title="CareShield | Healthcare Analytics",
    page_icon="🏥",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 🔄 التحديث التلقائي السحري: الداشبورد هتعمل ريفرش لنفسها كل 5 ثوانٍ أوتوماتيك
# أول ما الـ DAG يرمي داتا جديدة في الجولد، الداشبورد هتلقطها وتتحدث فوراً لايف!
st_autorefresh(interval=5000, key="datarefresh")

# 🎨 تصميم ستايل مخصص كحل إبداعي (CSS Injection) لتعديل مظهر البطاقات
st.markdown("""
    <style>
    .stMetric {
        background-color: #1e293b;
        padding: 20px;
        border-radius: 12px;
        border-left: 5px solid #0284c7;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
    .fraud-metric {
        border-left: 5px solid #ef4444 !important;
    }
    div[data-testid="stSidebar"] {
        background-color: #0f172a;
    }
    </style>
""", unsafe_allow_html=True)

# 2️⃣ القائمة الجانبية (Sidebar) للهوية البصرية للسيستم
with st.sidebar:
    st.markdown("<h2 style='color: #0284c7;'>🏥 CareShield OS</h2>", unsafe_allow_html=True)
    st.markdown("🌐 **Data Pipeline Status:** <span style='color: #10b981; font-weight: bold;'>LIVE</span>", unsafe_allow_html=True)
    st.markdown("🦆 **Engine:** DuckDB In-Memory OLAP", unsafe_allow_html=True)
    st.markdown("---")
    st.info("💡 الداشبورد متصلة بـ DuckDB ومحمية بـ Auto-Refresh (كل 5 ثوانٍ) لتلقي التحديثات فوراً من الـ Airflow Gold Layer.")

# 3️⃣ محرك الـ DuckDB لقراءة الـ Gold Layer لايف
@st.cache_data(ttl=2) # الكاش بيموت كل ثانيتين عشان يضمن قراءة الملفات الجديدة من على الهارد
def query_gold_layer():
    gold_path = '/opt/airflow/data/gold/*.parquet'
    
    # التأكد الهندسي من وجود ملفات باركيه في الجولد لير قبل الاستعلام
    gold_dir = '/opt/airflow/data/gold'
    if not os.path.exists(gold_dir) or not any(f.endswith('.parquet') for f in os.listdir(gold_dir)):
        return None

    # فتح اتصال سريع جداً في الذاكرة مع DuckDB وقراءة ملفات الجولد
    con = duckdb.connect(database=':memory:')
    df = con.execute(f"SELECT * FROM read_parquet('{gold_path}')").df()
    return df

# 4️⃣ بناء واجهة العرض الرئيسية
st.markdown("<h1 style='text-align: center; color: #f8fafc;'>🏥 Healthcare Fraud Analytics Dashboard</h1>", unsafe_allow_html=True)
st.markdown("<p style='text-align: center; color: #94a3b8;'>Real-Time Data Governance & Fraud Detection Platform</p>", unsafe_allow_html=True)
st.markdown("---")

df_gold = query_gold_layer()

if df_gold is not None and not df_gold.empty:
    
    # 📊 أ) حسابات الـ KPIs الأساسية لعرضها في البطاقات العلوية
    total_claims = len(df_gold)
    total_amount = df_gold['claim_amount'].sum() if 'claim_amount' in df_gold.columns else 0
    
    # حساب حالات ونسبة الاحتيال بناء على الفيتشرز المجمعة
    fraud_cases = df_gold[df_gold['is_fraud'] == 1].shape[0] if 'is_fraud' in df_gold.columns else 0
    fraud_rate = (fraud_cases / total_claims) * 100 if total_claims > 0 else 0

    # عرض البطاقات العلوية بتنسيق وبألوان جذابة
    kpi1, kpi2, kpi3, kpi4 = st.columns(4)
    
    with kpi1:
        st.metric(label="📊 Total Claims Processed", value=f"{total_claims:,}")
    with kpi2:
        st.metric(label="💰 Total Financial Volume", value=f"${total_amount:,.2f}")
    with kpi3:
        # كود جافا سكريبت أو تعديل الـ CSS كحيلة لتلوين بطاقة الاحتيال بالأحمر
        st.markdown('<div class="fraud-metric">', unsafe_allow_html=True)
        st.metric(label="🚨 Flagged Fraud Cases", value=f"{fraud_cases:,}")
        st.markdown('</div>', unsafe_allow_html=True)
    with kpi4:
        st.metric(label="📈 System Fraud Rate", value=f"{fraud_rate:.2f}%")

    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown("### 📈 Visual Deep-Dive Analysis")

    # 🔄 ب) تقسيم الشاشة لعرض الرسومات البيانية التفاعلية بشكل منظم (Grid)
    col_left, col_right = st.columns(2)

    with col_left:
        st.markdown("#### 🔒 Distribution of Integrity vs Fraud")
        if 'is_fraud' in df_gold.columns:
            # دونات شارت عصري وممتاز للعرض
            fig_pie = px.pie(
                df_gold, 
                names='is_fraud', 
                hole=0.5,
                color='is_fraud',
                color_discrete_map={0: '#0ea5e9', 1: '#ef4444'},
                labels={'is_fraud': 'Status (1=Fraud, 0=Clean)'}
            )
            fig_pie.update_layout(template="plotly_dark", paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
            st.plotly_chart(fig_pie, use_container_width=True)

    with col_right:
        st.markdown("#### 🏥 Top 10 High-Risk Healthcare Providers")
        if 'hospital_id' in df_gold.columns and 'is_fraud' in df_gold.columns:
            # تجميع بيانات المستشفيات الأكثر تقديماً لمطالبات احتيالية باستخدام بانداز سريعاً
            hospital_data = df_gold[df_gold['is_fraud'] == 1]['hospital_id'].value_count().reset_index()
            hospital_data.columns = ['Hospital ID', 'Fraudulent Claims Count']
            
            fig_bar = px.bar(
                hospital_data.head(10),
                x='Hospital ID',
                y='Fraudulent Claims Count',
                color='Fraudulent Claims Count',
                color_continuous_scale='Reds',
                text_auto=True
            )
            fig_bar.update_layout(template="plotly_dark", paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
            st.plotly_chart(fig_bar, use_container_width=True)

    # 📋 ج) عرض آخر البيانات المحدثة أسفل الشاشة لزيادة المصداقية
    st.markdown("---")
    st.markdown("### 📄 Latest Gold Layer Records Audited")
    st.dataframe(df_gold.tail(5), use_container_width=True)

else:
    # ⏳ شاشة الانتظار في حالة إن البايبلاين لسه مطلعش داتا في الجولد
    st.markdown("<br><br>", unsafe_allow_html=True)
    st.warning("⏳ Waiting for Gold Layer Stream Execution...")
    st.info("💡 السيستم شغال ومستعد تماماً. بمجرد قيام Airflow DAG بإنهاء مرحلة الـ Gold Layer بنجاح، ستظهر الرسوم البيانية والمؤشرات تلقائياً هنا دون الحاجة لإعادة تحميل الصفحة!")