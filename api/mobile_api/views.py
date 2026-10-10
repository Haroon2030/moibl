"""نقاط API الموبايل.

الموظف (عرض فقط): بياناته، السلف، تعديلات الراتب، الإجازات، الغياب، الإفادات، وتتبع طلباته.
مدير الفرع: صندوق الموافقات (اعتماد/إرجاع) عبر نفس خدمات المشروع وصلاحياته، بلا منطق مكرّر.
"""
from __future__ import annotations

import hmac
import logging
from decimal import Decimal

from django.contrib.auth import authenticate
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView, exception_handler

from . import auth

logger = logging.getLogger(__name__)

MAX_LIMIT = 100


# ── أدوات مساعدة ──────────────────────────────────────────────────────────

def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        return response
    logger.exception('Mobile API unexpected error', exc_info=exc)
    return Response({'detail': 'تعذّر إتمام العملية. حاول لاحقاً.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def health(_request):
    return JsonResponse({'status': 'ok'})


def _money(value) -> str | None:
    if value is None:
        return None
    return f'{Decimal(value):.2f}'


def _date(value) -> str | None:
    return value.isoformat() if value else None


def _limit(request) -> int:
    raw = request.query_params.get('limit', '')
    return min(int(raw), MAX_LIMIT) if raw.isdigit() and int(raw) > 0 else 50


def _prop(obj, name):
    """يقرأ خاصية/دالة قد تفشل (بيانات ناقصة) دون كسر الاستجابة."""
    try:
        value = getattr(obj, name)
        return value() if callable(value) else value
    except Exception:  # noqa: BLE001
        return None


def employee_dto(e) -> dict:
    return {
        'id': e.id,
        'name': e.name,
        'employee_number': e.employee_number,
        'branch': e.branch.name if e.branch_id else None,
        'department': e.department.name if e.department_id else None,
        'profession': e.profession.name if e.profession_id else None,
        'status': e.status,
        'status_display': e.get_status_display(),
        'hire_date': _date(e.hire_date),
    }


def _is_admin(user) -> bool:
    from .admin_views import is_admin_user

    return is_admin_user(user)


def user_dto(user) -> dict:
    from apps.core.services.approval_routing import managed_branch_ids
    from apps.core.models import Branch

    ids = managed_branch_ids(user)
    branches = list(Branch.objects.filter(pk__in=ids, is_deleted=False).order_by('name').values_list('name', flat=True))
    profile = getattr(user, 'profile', None)
    role = getattr(profile, 'role', None)
    return {
        'id': user.id,
        'name': user.get_full_name() or user.get_username(),
        'username': user.get_username(),
        'role': role.name if role else ('مدير النظام' if user.is_superuser else None),
        'branches': branches,
        'is_admin': _is_admin(user),
    }


def _summarize_payload(action_type: str, payload: dict) -> dict:
    """ملخص آمن لبيانات الطلب (قائمة بيضاء حسب النوع) — لا نعرض الحمولة الخام."""
    from apps.core.models import PendingAction
    from apps.employees.models import EmployeeLeave

    p = payload or {}
    T = PendingAction.ActionType
    if action_type == T.LEAVE:
        leave_label = dict(EmployeeLeave.LeaveType.choices).get(p.get('leave_type'), p.get('leave_type'))
        return {'نوع الإجازة': leave_label, 'من': p.get('date_from'), 'إلى': p.get('date_to'), 'ملاحظات': p.get('notes')}
    if action_type == T.LOAN_REQUEST:
        return {'المبلغ': p.get('amount'), 'القسط الشهري': p.get('monthly_deduction'),
                'عدد الأقساط': p.get('installments'), 'السبب': p.get('reason')}
    if action_type == T.SALARY_ADJUST:
        return {'الراتب الأساسي الجديد': p.get('new_basic_salary'), 'تاريخ السريان': p.get('effective_date'),
                'السبب': p.get('reason')}
    if action_type == T.ABSENCE:
        return {'تاريخ الغياب': p.get('absence_date'), 'الأيام': p.get('days'), 'السبب': p.get('reason')}
    return {}


def _clean(summary: dict) -> list[dict]:
    return [{'label': k, 'value': str(v)} for k, v in summary.items() if v not in (None, '')]


def _action_dto(a, *, detail: bool = False) -> dict:
    data = {
        'id': a.id,
        'type': a.action_type,
        'type_display': a.get_action_type_display(),
        'status': a.status,
        'status_display': a.get_status_display(),
        'requested_at': a.requested_at.isoformat() if a.requested_at else None,
        'summary': _clean(_summarize_payload(a.action_type, a.payload)),
    }
    if a.employee_id:
        data['employee'] = a.employee.name
    if a.branch_id:
        data['branch'] = a.branch.name
    if detail:
        if a.requested_by_id:
            data['requested_by'] = a.requested_by.get_full_name() or a.requested_by.get_username()
        else:
            # طلب رفعه الموظف نفسه من التطبيق (بلا حساب مستخدم)
            data['requested_by'] = f'{a.employee.name} (من التطبيق)' if (a.payload or {}).get('source') == 'mobile_employee' else None
        data['branch_notes'] = a.branch_notes or ''
    return data


# ── الدخول ────────────────────────────────────────────────────────────────

class EmployeeLoginView(APIView):
    authentication_classes: list = []
    permission_classes: list = []

    def post(self, request):
        from apps.employees.models import Employee

        number = str(request.data.get('employee_number') or '').strip()
        id_number = str(request.data.get('id_number') or '').strip()
        if not number or not id_number:
            raise ValidationError({'detail': 'أدخل الرقم الوظيفي ورقم الهوية.'})
        ip = auth.client_ip(request)
        auth.ensure_not_locked(auth.KIND_EMPLOYEE, number, ip)

        candidates = Employee.objects.filter(employee_number=number, is_deleted=False).select_related('branch', 'department')
        matches = [e for e in candidates if e.id_number and hmac.compare_digest(e.id_number.strip(), id_number)]
        if len(matches) != 1 or not auth._employee_can_login(matches[0]):
            auth.register_failure(auth.KIND_EMPLOYEE, number, ip)
            raise auth.LoginFailed()
        employee = matches[0]
        auth.clear_failures(auth.KIND_EMPLOYEE, number, ip)
        token = auth.issue_token(auth.KIND_EMPLOYEE, employee.pk, auth.employee_fingerprint(employee))
        return Response({'token': token, 'kind': auth.KIND_EMPLOYEE, 'profile': employee_dto(employee)})


class ManagerLoginView(APIView):
    authentication_classes: list = []
    permission_classes: list = []

    def post(self, request):
        username = str(request.data.get('username') or '').strip()
        password = str(request.data.get('password') or '')
        if not username or not password:
            raise ValidationError({'detail': 'أدخل اسم المستخدم وكلمة المرور.'})
        ip = auth.client_ip(request)
        auth.ensure_not_locked(auth.KIND_MANAGER, username, ip)

        user = authenticate(request=None, username=username, password=password)
        if user is None:
            # الموقع يقبل رقم المستخدم (user_number) كبديل لاسم المستخدم
            from apps.core.models import UserProfile

            profile = UserProfile.objects.select_related('user').filter(user_number=username).first()
            if profile:
                user = authenticate(request=None, username=profile.user.username, password=password)
        if user is None or not user.is_active:
            auth.register_failure(auth.KIND_MANAGER, username, ip)
            raise auth.LoginFailed()
        if not auth.is_manager_user(user):
            # لا نكشف أن الحساب صحيح لغير المخوّلين
            auth.register_failure(auth.KIND_MANAGER, username, ip)
            raise auth.LoginFailed()
        auth.clear_failures(auth.KIND_MANAGER, username, ip)
        token = auth.issue_token(auth.KIND_MANAGER, user.pk, auth.user_fingerprint(user))
        return Response({'token': token, 'kind': auth.KIND_MANAGER, 'profile': user_dto(user)})


class MeView(APIView):
    authentication_classes = [auth.MobileTokenAuthentication]
    permission_classes = [auth.IsAuthenticatedPrincipal]

    def get(self, request):
        p = request.user
        if p.kind == auth.KIND_EMPLOYEE:
            return Response({'kind': p.kind, 'profile': employee_dto(p.employee)})
        return Response({'kind': p.kind, 'profile': user_dto(p.user)})


# ── خدمات الموظف (عرض فقط) ────────────────────────────────────────────────

class EmployeeBase(APIView):
    authentication_classes = [auth.MobileTokenAuthentication]
    permission_classes = [auth.IsEmployee]

    @property
    def employee(self):
        return self.request.user.employee


class EmployeeSummaryView(EmployeeBase):
    def get(self, request):
        from apps.core.models import PendingAction
        from apps.employees.models import EmployeeLoan, EmployeeSalaryChange

        e = self.employee
        active_loans = EmployeeLoan.objects.filter(employee=e, status=EmployeeLoan.Status.ACTIVE)
        remaining = sum((Decimal(_prop(loan, 'remaining_balance') or 0) for loan in active_loans), Decimal('0'))
        open_statuses = [
            PendingAction.Status.PENDING_BRANCH, PendingAction.Status.PENDING_GM,
            PendingAction.Status.PENDING_OFFICER, PendingAction.Status.PENDING_ACCOUNTANT,
            PendingAction.Status.RETURNED,
        ]
        last_change = EmployeeSalaryChange.objects.filter(employee=e).order_by('-effective_date', '-id').first()
        return Response({
            'profile': employee_dto(e),
            'leave_balance': _money(_prop(e, 'remaining_leave_days')),
            'active_loans': active_loans.count(),
            'loans_remaining': _money(remaining),
            'open_requests': PendingAction.objects.filter(employee=e, status__in=open_statuses).count(),
            'last_salary_change': {
                'effective_date': _date(last_change.effective_date),
                'new_basic_salary': _money(last_change.new_basic_salary),
            } if last_change else None,
        })


class LoansView(EmployeeBase):
    def get(self, request):
        from apps.employees.models import EmployeeLoan

        loans = EmployeeLoan.objects.filter(employee=self.employee).order_by('-issued_at', '-id')[:_limit(request)]
        return Response({'results': [self._dto(loan) for loan in loans]})

    @staticmethod
    def _dto(loan) -> dict:
        return {
            'id': loan.id,
            'serial_number': loan.serial_number,
            'amount': _money(loan.amount),
            'monthly_deduction': _money(loan.monthly_deduction),
            'installments': loan.installments,
            'reason': loan.reason,
            'issued_at': _date(loan.issued_at),
            'first_deduction_date': _date(loan.first_deduction_date),
            'status': loan.status,
            'status_display': loan.get_status_display(),
            'remaining_balance': _money(_prop(loan, 'remaining_balance')),
        }


class LoanDetailView(EmployeeBase):
    def get(self, request, pk: int):
        from apps.employees.models import EmployeeLoan

        loan = get_object_or_404(EmployeeLoan, pk=pk, employee=self.employee)
        data = LoansView._dto(loan)
        data['installments_log'] = [
            {
                'period': f'{i.period_year}/{i.period_month:02d}',
                'due_date': _date(i.due_date),
                'amount': _money(i.amount),
                'status': i.status,
                'status_display': i.get_status_display(),
            }
            for i in loan.installments_log.order_by('period_year', 'period_month')
        ]
        return Response(data)


class SalaryView(EmployeeBase):
    def get(self, request):
        from apps.employees.models import EmployeeSalaryChange

        e = self.employee
        changes = EmployeeSalaryChange.objects.filter(employee=e).order_by('-effective_date', '-id')[:_limit(request)]
        return Response({
            'current': {
                'basic_salary': _money(e.basic_salary),
                'total_salary': _money(_prop(e, 'total_salary')),
            },
            'changes': [
                {
                    'id': c.id,
                    'effective_date': _date(c.effective_date),
                    'old_basic_salary': _money(c.old_basic_salary),
                    'new_basic_salary': _money(c.new_basic_salary),
                    'difference': _money(c.new_basic_salary - c.old_basic_salary),
                    'reason': c.reason,
                    'applied': c.applied,
                }
                for c in changes
            ],
        })


class LeavesView(EmployeeBase):
    def get(self, request):
        from apps.employees.models import EmployeeLeave

        e = self.employee
        leaves = EmployeeLeave.objects.filter(employee=e).order_by('-date_from', '-id')[:_limit(request)]
        return Response({
            'balance': {
                'accrued': _money(_prop(e, 'accrued_leave_days')),
                'remaining': _money(_prop(e, 'remaining_leave_days')),
            },
            'results': [
                {
                    'id': leave.id,
                    'leave_type': leave.leave_type,
                    'leave_type_display': leave.get_leave_type_display(),
                    'date_from': _date(leave.date_from),
                    'date_to': _date(leave.date_to),
                    'days': _money(leave.days),
                    'notes': leave.notes,
                }
                for leave in leaves
            ],
        })


class AbsencesView(EmployeeBase):
    def get(self, request):
        from apps.employees.models import EmployeeAbsence

        rows = EmployeeAbsence.objects.filter(employee=self.employee).order_by('-absence_date', '-id')[:_limit(request)]
        return Response({'results': [
            {
                'id': a.id,
                'serial_number': a.serial_number,
                'absence_date': _date(a.absence_date),
                'days': a.days,
                'deduction_amount': _money(a.deduction_amount),
                'reason': a.reason,
            }
            for a in rows
        ]})


class StatementsView(EmployeeBase):
    def get(self, request):
        from apps.employees.models import EmployeeStatement

        rows = EmployeeStatement.objects.filter(employee=self.employee).order_by('-statement_date', '-id')[:_limit(request)]
        return Response({'results': [self._dto(s, content=False) for s in rows]})

    @staticmethod
    def _dto(s, *, content: bool) -> dict:
        data = {
            'id': s.id,
            'serial_number': s.serial_number,
            'statement_type': s.statement_type,
            'statement_type_display': s.get_statement_type_display(),
            'title': s.title,
            'statement_date': _date(s.statement_date),
            'deduction_amount': _money(s.deduction_amount),
        }
        if content:
            data['content'] = s.content
        return data


class StatementDetailView(EmployeeBase):
    def get(self, request, pk: int):
        from apps.employees.models import EmployeeStatement

        s = get_object_or_404(EmployeeStatement, pk=pk, employee=self.employee)
        return Response(StatementsView._dto(s, content=True))


class MyRequestsView(EmployeeBase):
    """تتبع طلبات الموظف (سلفة، إجازة، تعديل راتب...) ومرحلتها الحالية في مسار الموافقات."""

    def get(self, request):
        from apps.core.models import PendingAction

        rows = (
            PendingAction.objects.filter(employee=self.employee)
            .select_related('branch').order_by('-requested_at', '-id')[:_limit(request)]
        )
        return Response({'results': [_action_dto(a) for a in rows]})


# ── مدير الفرع: الموافقات ─────────────────────────────────────────────────

def _inbox_queryset(user):
    from apps.core.web_views.pending_actions import _inbox_for, _user_visible_actions

    return _inbox_for(user, _user_visible_actions(user))


class ManagerBase(APIView):
    authentication_classes = [auth.MobileTokenAuthentication]
    permission_classes = [auth.IsManager]

    @property
    def user(self):
        return self.request.user.user


def _approval_dto(user, action, *, detail: bool = False) -> dict:
    from apps.core.models import PendingAction
    from apps.core.web_views._helpers import _can_act_at_stage, _can_return_at_stage

    at_branch = action.status == PendingAction.Status.PENDING_BRANCH
    data = _action_dto(action, detail=detail)
    data['can_approve'] = at_branch and _can_act_at_stage(user, action, PendingAction.Stage.BRANCH)
    data['can_return'] = at_branch and _can_return_at_stage(user, action, PendingAction.Stage.BRANCH)
    return data


class ApprovalsView(ManagerBase):
    def get(self, request):
        from apps.core.models import PendingAction

        scope = request.query_params.get('scope', 'pending')
        qs = _inbox_queryset(self.user).select_related('employee', 'branch', 'requested_by')
        if scope == 'pending':
            qs = qs.filter(status=PendingAction.Status.PENDING_BRANCH)
        rows = qs.order_by('-requested_at', '-id')[:_limit(request)]
        return Response({'results': [_approval_dto(self.user, a) for a in rows]})


def _visible_action_or_404(user, pk: int):
    from apps.core.models import PendingAction
    from apps.core.web_views.pending_actions import _user_visible_actions

    action = _user_visible_actions(user).filter(pk=pk).first()
    if action is None:
        raise NotFound('الطلب غير موجود أو لا تملك صلاحية رؤيته.')
    return PendingAction.objects.select_related('employee', 'branch', 'requested_by').get(pk=action.pk)


class ApprovalDetailView(ManagerBase):
    def get(self, request, pk: int):
        action = _visible_action_or_404(self.user, pk)
        return Response(_approval_dto(self.user, action, detail=True))


class ApprovalApproveView(ManagerBase):
    def post(self, request, pk: int):
        from apps.core.models import PendingAction
        from apps.core.services.pending_actions import branch_approve
        from apps.core.web_views._helpers import _can_act_at_stage

        notes = str(request.data.get('notes') or '').strip()
        with transaction.atomic():
            _visible_action_or_404(self.user, pk)
            action = PendingAction.objects.select_for_update().get(pk=pk)
            if not _can_act_at_stage(self.user, action, PendingAction.Stage.BRANCH):
                auth.deny('لا تملك صلاحية الموافقة على هذا الطلب.')
            try:
                branch_approve(action, self.user, notes)
            except ValueError as exc:
                raise ValidationError({'detail': str(exc)})
        action.refresh_from_db()
        return Response(_approval_dto(self.user, _visible_action_or_404(self.user, pk), detail=True))


class ApprovalReturnView(ManagerBase):
    def post(self, request, pk: int):
        from apps.core.models import PendingAction
        from apps.core.services.pending_actions import return_action
        from apps.core.web_views._helpers import _can_return_at_stage

        notes = str(request.data.get('notes') or '').strip()
        if not notes:
            raise ValidationError({'detail': 'ملاحظات الإرجاع إجبارية.'})
        with transaction.atomic():
            _visible_action_or_404(self.user, pk)
            action = PendingAction.objects.select_for_update().get(pk=pk)
            stage = action.current_stage
            if not stage or not _can_return_at_stage(self.user, action, stage):
                auth.deny('لا تملك صلاحية إرجاع هذا الطلب.')
            try:
                return_action(action, self.user, notes)
            except ValueError as exc:
                raise ValidationError({'detail': str(exc)})
        return Response(_approval_dto(self.user, _visible_action_or_404(self.user, pk), detail=True))
