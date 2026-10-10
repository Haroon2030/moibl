import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_ENV', 'development')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mobile_api.settings')
application = get_wsgi_application()
