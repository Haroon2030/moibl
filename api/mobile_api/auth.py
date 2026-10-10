"""مصادقة الموبايل: توكنات موقّعة بلا جلسات، قفل محاولات الدخول الفاشلة، وصلاحيات حسب نوع المستخدم.

نوعان من المستخدمين:
  - employee: موظف يدخل بالرقم الوظيفي + رقم الهوية (النظام الأصلي لا يملك حسابات للموظفين).
  - manager : مستخدم النظام (مدير فرع/مدير عام) بحسابه الحالي، لاعتماد الطلبات الواصلة إليه.
"""
from __future__ import annotations

import hashlib
import hmac

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.core.cache import cache
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import APIException, AuthenticationFailed, PermissionDenied, Throttled
from rest_framework.permissions import BasePermission

TOKEN_SALT = 'hr.mobile.auth.v1'
KIND_EMPLOYEE = 'employee'
KIND_MANAGER = 'manager'

LOGIN_ERROR = 'بيانات الدخول غير صحيحة.'


class LoginFailed(APIException):
    """فشل دخول → 401 (AuthenticationFailed بلا authenticator يتحول إلى 403 في DRF)."""

    status_code = 401
    default_detail = LOGIN_ERROR
    default_code = 'login_failed'


class Principal:
    """هوية الطلب الحالي (تحل محل request.user)."""

    is_authenticated = True

    def __init__(self, kind: str, employee=None, user=None):
        self.kind = kind
        self.employee = employee
        self.user = user


def _fingerprint(secret: str) -> str:
    return hashlib.sha256((secret or '').encode('utf-8')).hexdigest()[:16]


def employee_fingerprint(employee) -> str:
    return _fingerprint(employee.id_number)


def user_fingerprint(user) -> str:
    # تغيير كلمة المرور يُبطل التوكنات القديمة
    return _fingerprint(user.password)


def issue_token(kind: str, pk: int, fingerprint: str) -> str:
    return signing.dumps({'k': kind, 'i': pk, 'f': fingerprint}, salt=TOKEN_SALT, compress=True)


def _ttl_seconds() -> int:
    return int(getattr(settings, 'MOBILE_TOKEN_TTL_HOURS', 168)) * 3600


def _employee_can_login(employee) -> bool:
    from apps.employees.models import Employee

    return employee.status != Employee.Status.TERMINATED


def is_manager_user(user) -> bool:
    """مخوّل لهذا التطبيق: مدير فرع (أو مدير إدارة)، مدير عام، أو مدير نظام."""
    from apps.core.services.approval_routing import managed_branch_ids
    from apps.core.web_views._helpers import _is_general_manager

    if not user.is_active:
        return False
    if user.is_superuser or _is_general_manager(user):
        return True
    return bool(managed_branch_ids(user)) or user.managed_administrations.filter(is_deleted=False).exists()


class MobileTokenAuthentication(BaseAuthentication):
    """Authorization: Bearer <token>"""

    def authenticate(self, request):
        header = request.headers.get('Authorization', '')
        if not header.startswith('Bearer '):
            return None
        token = header[7:].strip()
        try:
            data = signing.loads(token, salt=TOKEN_SALT, max_age=_ttl_seconds())
        except signing.SignatureExpired:
            raise AuthenticationFailed('انتهت الجلسة، سجّل الدخول من جديد.')
        except signing.BadSignature:
            raise AuthenticationFailed('جلسة غير صالحة.')

        kind, pk, fp = data.get('k'), data.get('i'), data.get('f', '')
        if kind == KIND_EMPLOYEE:
            from apps.employees.models import Employee

            employee = Employee.objects.filter(pk=pk, is_deleted=False).select_related('branch', 'department').first()
            if not employee or not _employee_can_login(employee) or not hmac.compare_digest(fp, employee_fingerprint(employee)):
                raise AuthenticationFailed('انتهت الجلسة، سجّل الدخول من جديد.')
            return Principal(KIND_EMPLOYEE, employee=employee), token
        if kind == KIND_MANAGER:
            user = get_user_model().objects.filter(pk=pk, is_active=True).first()
            if not user or not hmac.compare_digest(fp, user_fingerprint(user)) or not is_manager_user(user):
                raise AuthenticationFailed('انتهت الجلسة، سجّل الدخول من جديد.')
            return Principal(KIND_MANAGER, user=user), token
        raise AuthenticationFailed('جلسة غير صالحة.')

    def authenticate_header(self, request):
        return 'Bearer'


class IsEmployee(BasePermission):
    message = 'هذه الخدمة للموظفين فقط.'

    def has_permission(self, request, view):
        principal = request.user
        if principal is None or not getattr(principal, 'is_authenticated', False):
            raise AuthenticationFailed('سجّل الدخول للمتابعة.')
        return principal.kind == KIND_EMPLOYEE


class IsManager(BasePermission):
    message = 'هذه الخدمة لمدراء الفروع فقط.'

    def has_permission(self, request, view):
        principal = request.user
        if principal is None or not getattr(principal, 'is_authenticated', False):
            raise AuthenticationFailed('سجّل الدخول للمتابعة.')
        return principal.kind == KIND_MANAGER


class IsAuthenticatedPrincipal(BasePermission):
    def has_permission(self, request, view):
        principal = request.user
        if principal is None or not getattr(principal, 'is_authenticated', False):
            raise AuthenticationFailed('سجّل الدخول للمتابعة.')
        return True


# ── قفل محاولات الدخول الفاشلة (حسب المعرّف + عنوان IP) ──────────────────────

def client_ip(request) -> str:
    forwarded = (request.META.get('HTTP_X_FORWARDED_FOR') or '').split(',')[0].strip()
    return forwarded or (request.META.get('REMOTE_ADDR') or 'unknown')


def _lock_key(kind: str, ident: str, ip: str) -> str:
    raw = f'{kind}|{ident.strip().lower()}|{ip}'
    return 'mobile:lock:' + hashlib.sha256(raw.encode('utf-8')).hexdigest()[:32]


def ensure_not_locked(kind: str, ident: str, ip: str) -> None:
    limit = int(getattr(settings, 'MOBILE_LOGIN_MAX_FAILURES', 5))
    if cache.get(_lock_key(kind, ident, ip), 0) >= limit:
        minutes = int(getattr(settings, 'MOBILE_LOGIN_LOCK_MINUTES', 15))
        raise Throttled(wait=minutes * 60, detail=f'محاولات كثيرة فاشلة. أعد المحاولة بعد {minutes} دقيقة.')


def register_failure(kind: str, ident: str, ip: str) -> None:
    key = _lock_key(kind, ident, ip)
    minutes = int(getattr(settings, 'MOBILE_LOGIN_LOCK_MINUTES', 15))
    cache.set(key, cache.get(key, 0) + 1, timeout=minutes * 60)


def clear_failures(kind: str, ident: str, ip: str) -> None:
    cache.delete(_lock_key(kind, ident, ip))


def deny(message: str):
    raise PermissionDenied(message)
