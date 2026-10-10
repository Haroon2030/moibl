"""نقاط API الأدمن/مدير الموارد — بيانات الموظفين (قراءة فقط).

المخوّل: المدير العام في نظام الموقع (superuser أو دور admin أو hr_manager) عبر نفس دالة الموقع.
"""
from __future__ import annotations

from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed, NotFound
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from . import auth
from .views import MAX_LIMIT, _date, _money, _prop

EXPIRY_WINDOW_DAYS = 60


def is_admin_user(user) -> bool:
    from apps.core.web_views._helpers import _is_general_manager

    return bool(user and user.is_active and (user.is_superuser or _is_general_manager(user)))


class IsAdmin(BasePermission):
    message = 'هذه الخدمة للأدمن ومدير الموارد فقط.'

    def has_permission(self, request, view):
        principal = request.user
        if principal is None or not getattr(principal, 'is_authenticated', False):
            raise AuthenticationFailed('سجّل الدخول للمتابعة.')
        return principal.kind == auth.KIND_MANAGER and is_admin_user(principal.user)


class AdminBase(APIView):
    authentication_classes = [auth.MobileTokenAuthentication]
    permission_classes = [IsAdmin]


def _employees():
    from apps.employees.models import Employee

    return Employee.objects.filter(is_deleted=False)


def _name(obj) -> str | None:
    if obj is None:
        return None
    return getattr(obj, 'name', None) or str(obj)


def _fk_name(e, field: str) -> str | None:
    return _name(_prop(e, field))


def _int_param(request, key: str, default: int, maximum: int | None = None) -> int:
    raw = request.query_params.get(key, '')
    value = int(raw) if raw.isdigit() else default
    return min(value, maximum) if maximum else value


def _list_dto(e) -> dict:
    return {
        'id': e.id,
        'name': e.name,
        'employee_number': e.employee_number,
        'branch': _fk_name(e, 'branch'),
        'department': _fk_name(e, 'department'),
        'profession': _fk_name(e, 'profession'),
        'nationality': _fk_name(e, 'nationality'),
        'phone': e.phone,
        'status': e.status,
        'status_display': e.get_status_display(),
        'hire_date': _date(e.hire_date),
    }


def _display(e, field: str) -> str | None:
    getter = getattr(e, f'get_{field}_display', None)
    return getter() if getter and getattr(e, field, '') else None


class AdminEmployeesOverviewView(AdminBase):
    """إحصاءات لوحة بيانات الموظفين."""

    def get(self, request):
        from apps.employees.models import Employee

        qs = _employees()
        today = timezone.localdate()
        soon = today + timedelta(days=EXPIRY_WINDOW_DAYS)
        working = qs.exclude(status=Employee.Status.TERMINATED)

        by_status = {row['status']: row['n'] for row in qs.values('status').annotate(n=Count('id'))}
        status_rows = [
            {'key': key, 'label': label, 'count': by_status.get(key, 0)} for key, label in Employee.Status.choices
        ]

        def top(field: str, limit: int = 8):
            rows = (
                working.values(f'{field}__name')
                .annotate(n=Count('id'))
                .order_by('-n')[:limit]
            )
            return [{'label': r[f'{field}__name'] or 'غير محدد', 'count': r['n']} for r in rows]

        def expiring(field: str) -> int:
            return working.filter(**{f'{field}__isnull': False, f'{field}__lte': soon}).count()

        return Response(
            {
                'total': qs.count(),
                'working': working.count(),
                'statuses': status_rows,
                'male': working.filter(gender='male').count(),
                'female': working.filter(gender='female').count(),
                'hired_last_30': qs.filter(hire_date__gte=today - timedelta(days=30)).count(),
                'by_branch': top('branch'),
                'by_department': top('department'),
                'by_nationality': top('nationality'),
                'expiring': {
                    'window_days': EXPIRY_WINDOW_DAYS,
                    'contract': expiring('contract_expiry_date'),
                    'medical_insurance': expiring('medical_insurance_expiry_date'),
                    'health_card': expiring('health_card_expiry'),
                },
            }
        )


class AdminEmployeeFiltersView(AdminBase):
    """قوائم الفلترة (الفروع والأقسام)."""

    def get(self, request):
        from apps.core.models import Branch
        from apps.departments.models import Department

        branches = Branch.objects.filter(is_deleted=False).order_by('name').values('id', 'name')
        departments = Department.objects.filter(is_deleted=False).order_by('name').values('id', 'name')
        return Response({'branches': list(branches), 'departments': list(departments)})


class AdminEmployeesView(AdminBase):
    """قائمة الموظفين مع بحث وفلاتر وترقيم."""

    def get(self, request):
        from apps.employees.models import Employee

        qs = _employees().select_related('branch', 'department', 'profession', 'nationality')

        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(name_en__icontains=q)
                | Q(employee_number__icontains=q)
                | Q(id_number__icontains=q)
                | Q(phone__icontains=q)
            )
        status = request.query_params.get('status')
        if status in dict(Employee.Status.choices):
            qs = qs.filter(status=status)
        for key, field in (('branch', 'branch_id'), ('department', 'department_id')):
            raw = request.query_params.get(key, '')
            if raw.isdigit():
                qs = qs.filter(**{field: int(raw)})

        limit = _int_param(request, 'limit', 30, MAX_LIMIT)
        offset = _int_param(request, 'offset', 0)
        total = qs.count()
        rows = qs.order_by('name', 'id')[offset : offset + limit]
        return Response({'total': total, 'limit': limit, 'offset': offset, 'results': [_list_dto(e) for e in rows]})


class AdminEmployeeDetailView(AdminBase):
    """ملف الموظف الكامل مقسّم إلى أقسام."""

    def get(self, request, pk: int):
        e = (
            _employees()
            .select_related(
                'branch', 'department', 'administration', 'cost_center', 'profession', 'nationality',
                'sponsorship', 'insurance', 'insurance_class', 'housing', 'bank',
            )
            .filter(pk=pk)
            .first()
        )
        if e is None:
            raise NotFound('الموظف غير موجود.')

        def row(label, value):
            return {'label': label, 'value': None if value in (None, '') else str(value)}

        total_salary = sum(
            (getattr(e, f) or 0)
            for f in ('basic_salary', 'housing_allowance', 'transport_allowance', 'other_allowance', 'cash_amount', 'meal_allowance')
        )
        sections = [
            {
                'title': 'البيانات الأساسية',
                'icon': 'person-outline',
                'rows': [
                    row('الاسم', e.name),
                    row('الاسم بالإنجليزية', e.name_en),
                    row('الرقم الوظيفي', e.employee_number),
                    row('رقم الهوية', e.id_number),
                    row('الجنس', _display(e, 'gender')),
                    row('تاريخ الميلاد', _date(e.birth_date)),
                    row('الجنسية', _fk_name(e, 'nationality')),
                    row('الجوال', e.phone),
                    row('البريد الإلكتروني', e.email),
                ],
            },
            {
                'title': 'بيانات العمل',
                'icon': 'briefcase-outline',
                'rows': [
                    row('الحالة', e.get_status_display()),
                    row('الفرع', _fk_name(e, 'branch')),
                    row('القسم', _fk_name(e, 'department')),
                    row('الإدارة', _fk_name(e, 'administration')),
                    row('مركز التكلفة', _fk_name(e, 'cost_center')),
                    row('المهنة', _fk_name(e, 'profession')),
                    row('الكفالة', _fk_name(e, 'sponsorship')),
                    row('تاريخ المباشرة', _date(e.hire_date)),
                    row('تاريخ التوقف', _date(e.end_date)),
                    row('سبب الانتهاء', e.end_reason),
                ],
            },
            {
                'title': 'العقد والوثائق',
                'icon': 'document-text-outline',
                'rows': [
                    row('نوع العقد', _display(e, 'contract_type')),
                    row('بداية العقد', _date(e.contract_start_date)),
                    row('انتهاء العقد', _date(e.contract_expiry_date)),
                    row('التأمين الطبي', _fk_name(e, 'insurance')),
                    row('فئة التأمين', _fk_name(e, 'insurance_class')),
                    row('انتهاء التأمين الطبي', _date(e.medical_insurance_expiry_date)),
                    row('حالة الكرت الصحي', _display(e, 'health_card_status')),
                    row('انتهاء الكرت الصحي', _date(e.health_card_expiry)),
                    row('السكن', _fk_name(e, 'housing')),
                ],
            },
            {
                'title': 'الراتب والحساب البنكي',
                'icon': 'cash-outline',
                'rows': [
                    row('الراتب الأساسي', _money(e.basic_salary)),
                    row('بدل سكن', _money(e.housing_allowance)),
                    row('بدل نقل', _money(e.transport_allowance)),
                    row('بدل إضافي', _money(e.other_allowance)),
                    row('بدل وجبات', _money(e.meal_allowance)),
                    row('كاش', _money(e.cash_amount)),
                    row('إجمالي الراتب', _money(total_salary)),
                    row('البنك', _fk_name(e, 'bank')),
                    row('الآيبان', e.iban),
                    row('رصيد الإجازات', e.available_leave_balance),
                ],
            },
        ]
        notes = [
            {'title': title, 'text': text}
            for title, text in (
                ('الإنذارات', e.warnings),
                ('الإفادات', e.statements),
                ('الحضور والانصراف', e.attendance_notes),
                ('جدول الدوام', e.work_schedule),
            )
            if (text or '').strip()
        ]
        return Response({**_list_dto(e), 'sections': sections, 'notes': notes})
