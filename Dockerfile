# syntax=docker/dockerfile:1.6
# خدمة API تطبيق الموارد (mobile_api) — تُنشر على Dokploy خلف Traefik.
#
# المبدأ: backend واحد. لا ننسخ كود الموقع إلى هذا المستودع؛ نجلبه وقت البناء من مستودع الموقع
# ونشغّل فوقه خدمة mobile_api المستقلة. لا يُنفَّذ migrate هنا إطلاقًا: الموقع وحده يملك مخطط القاعدة.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_ENV=production \
    TZ=Asia/Riyadh \
    PORT=7081 \
    HR_BACKEND_DIR=/app/hr_backend

# نفس مكتبات النظام التي يحتاجها backend الموقع (mysqlclient / Pillow / psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        pkg-config \
        libmariadb-dev \
        libpq-dev \
        libjpeg-dev \
        zlib1g-dev \
        git \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# كود الموقع (backend فقط). HR_REF فرع أو وسم؛ غيّره (أو HR_CACHE_BUST) لإجبار جلب أحدث نسخة.
ARG HR_REPO=https://github.com/Haroon2030/HR.4.git
ARG HR_REF=main
ARG HR_CACHE_BUST=0
RUN echo "bust=${HR_CACHE_BUST}" \
    && git clone --depth 1 --branch "${HR_REF}" "${HR_REPO}" /tmp/hr \
    && mv /tmp/hr/backend /app/hr_backend \
    && rm -rf /tmp/hr

RUN pip install --upgrade pip && pip install -r /app/hr_backend/requirements.txt

# خدمة الموبايل
COPY api/ /app/api/

# مستخدم غير جذري
RUN useradd --system --create-home --uid 10001 app && chown -R app:app /app
USER app

WORKDIR /app/api
EXPOSE 7081

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/health/' % os.environ.get('PORT','7081'), timeout=4)"

# عامل واحد بعدة threads افتراضيًا: قفل محاولات الدخول مخزّن في ذاكرة العملية (LocMem)،
# فأكثر من عامل يضاعف عدد المحاولات المسموحة. للتوسع أضف REDIS_URL ثم ارفع GUNICORN_WORKERS.
CMD ["sh", "-c", "exec gunicorn mobile_api.wsgi:application --bind 0.0.0.0:${PORT:-7081} --workers ${GUNICORN_WORKERS:-1} --threads ${GUNICORN_THREADS:-8} --worker-class gthread --timeout ${GUNICORN_TIMEOUT:-60} --keep-alive 30 --access-logfile - --error-logfile -"]
