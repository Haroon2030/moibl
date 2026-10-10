"""CORS مبسّط — لمعاينة التطبيق على المتصفح فقط. تطبيق الموبايل الأصلي لا يحتاجه."""
from django.conf import settings
from django.http import HttpResponse


class MobileCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get('Origin')
        allowed = origin and origin in getattr(settings, 'MOBILE_API_CORS_ORIGINS', [])
        if allowed and request.method == 'OPTIONS':
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)
        if allowed:
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
            response['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
            response['Access-Control-Max-Age'] = '600'
            response['Vary'] = 'Origin'
        return response
