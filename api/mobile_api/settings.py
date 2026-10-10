"""
إعدادات خدمة API الموبايل
==========================
خدمة مستقلة تعمل بجانب مشروع HR دون تعديل أي ملف فيه:
  - تستورد إعدادات المشروع (قاعدة البيانات، التطبيقات، التخزين) من backend/config كما هي.
  - تستبدل الـ middleware وروابط الـ URL وإعدادات REST بما يناسب تطبيق الموبايل فقط.

أمان: DJANGO_ENV يفترض «development» إن لم يُحدَّد، حتى لا يقرأ ملف backend/.env (الذي قد يشير
إلى قاعدة الإنتاج) بالخطأ عند التشغيل المحلي. في الإنتاج حدّد DJANGO_ENV=production صراحة.
"""
import os
import sys
from pathlib import Path

# موبايل/api/mobile_api/settings.py → parents[3] = جذر المشروع
PROJECT_ROOT = Path(__file__).resolve().parents[2]
# backend واحد: كود مشروع HR الأصلي (بلا نسخ). يمكن تغييره بالمتغير HR_BACKEND_DIR.
BACKEND_DIR = Path(os.environ.get('HR_BACKEND_DIR') or PROJECT_ROOT.parent / 'HR' / 'backend')

# إعدادات القاعدة تُقرأ من .env الخاص بالموبايل (جذر هذا المجلد) لا من .env الموقع.
# المتغيرات الموجودة في البيئة لها الأولوية على ملف .env الموقع.
_env_file = PROJECT_ROOT / '.env'
if _env_file.exists():
    for _line in _env_file.read_text(encoding='utf-8').splitlines():
        _line = _line.strip()
        if _line and not _line.startswith('#') and '=' in _line:
            _k, _v = _line.split('=', 1)
            os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault('DJANGO_ENV', 'development')

from config.settings import *  # noqa: E402,F401,F403
from config.settings import ALLOWED_HOSTS as _BASE_ALLOWED_HOSTS, DEBUG as _BASE_DEBUG  # noqa: E402

ROOT_URLCONF = 'mobile_api.urls'
WSGI_APPLICATION = 'mobile_api.wsgi.application'

# middleware أدنى: الخدمة بلا جلسات ولا CSRF (مصادقة بالتوكن فقط).
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'mobile_api.middleware.MobileCorsMiddleware',
    'django.middleware.common.CommonMiddleware',
]

# لوحة Django الإدارية غير معروضة في هذه الخدمة (تبقى في INSTALLED_APPS لأن نماذج المشروع تعتمد عليها).
SILENCED_SYSTEM_CHECKS = ['admin.E408', 'admin.E409', 'admin.E410']

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [],
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES': ['rest_framework.parsers.JSONParser'],
    'UNAUTHENTICATED_USER': None,
    'EXCEPTION_HANDLER': 'mobile_api.views.api_exception_handler',
}

# TLS يُنهى عند البروكسي الخاص بالخدمة؛ لا نعيد التوجيه من هنا.
SECURE_SSL_REDIRECT = False

_extra_hosts = [h.strip() for h in os.environ.get('MOBILE_API_ALLOWED_HOSTS', '').split(',') if h.strip()]
ALLOWED_HOSTS = [*list(_BASE_ALLOWED_HOSTS), *_extra_hosts]
if _BASE_DEBUG:
    # أثناء التطوير: المحاكي (10.0.2.2) والجوال على الشبكة المحلية
    ALLOWED_HOSTS = ['*']

# صلاحية التوكن (بالساعات) — الافتراضي 7 أيام
MOBILE_TOKEN_TTL_HOURS = int(os.environ.get('MOBILE_TOKEN_TTL_HOURS', '168'))

# أصول مسموحة لنسخة الويب من التطبيق (للمعاينة فقط)
MOBILE_API_CORS_ORIGINS = [
    o.strip() for o in os.environ.get('MOBILE_API_CORS_ORIGINS', '').split(',') if o.strip()
]
if _BASE_DEBUG:
    MOBILE_API_CORS_ORIGINS += ['http://localhost:8081', 'http://127.0.0.1:8081', 'http://localhost:19006']

# قفل محاولات الدخول الفاشلة
MOBILE_LOGIN_MAX_FAILURES = int(os.environ.get('MOBILE_LOGIN_MAX_FAILURES', '5'))
MOBILE_LOGIN_LOCK_MINUTES = int(os.environ.get('MOBILE_LOGIN_LOCK_MINUTES', '15'))
