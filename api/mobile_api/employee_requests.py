"""رفع طلبات الموظف من التطبيق: إجازة وسلفة.

يعيد استخدام create_pending_action في المشروع نفسه، فيدخل الطلب مسار الموافقات المعتاد
(مدير الفرع ← ...) بنفس قواعد الموقع: كفالة + رصيد للإجازة، ونفس تحقق السلفة.
الموظف بلا حساب مستخدم، فيُسجَّل requested_by فارغًا ويُعلَّم الطلب بـ source في الحمولة.
"""
from __future__ import annotations

from datetime import date, timedelta
from decimal import ROUND_UP, Decimal, InvalidOperation

from django.db import transaction
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .views import EmployeeBase, _action_dto

SOURCE = 'mobile_employee'
MAX_LEAVE_DAYS = 365
MAX_INSTALLMENTS = 60
MAX_TEXT = 500
TWO = Decimal('0.01')


def _fail(message: str):
    raise ValidationError({'detail': message})


def _text(value, limit: int = MAX_TEXT) -> str:
    return str(value or '').strip()[:limit]


def _parse_date(value, label: str) -> date:
    try:
        return date.fromisoformat(str(value or '').strip()[:10])
    except ValueError:
        _fail(f'{label} غير صحيح.')


def _parse_decimal(value, label: str) -> Decimal:
    try:
        d = Decimal(str(value).strip().replace(',', ''))
    except (InvalidOperation, ValueError, AttributeError):
        _fail(f'{label} غير صحيح.')
    if not d.is_finite():
        _fail(f'{label} غير صحيح.')
    return d


def _open_actions(employee, action_type):
    from apps.core.models import PendingAction

    return PendingAction.objects.filter(
        employee=employee, action_type=action_type,
        status__in=[
            PendingAction.Status.PENDING_BRANCH, PendingAction.Status.PENDING_GM,
            PendingAction.Status.PENDING_OFFICER, PendingAction.Status.PENDING_ACCOUNTANT,
        ],
    )


def _lock_employee(pk):
    from apps.employees.models import Employee

    return Employee.objects.select_for_update().select_related('branch').get(pk=pk)


class RequestOptionsView(EmployeeBase):
    """بيانات تساعد شاشة الطلب: الأنواع، الرصيد، وهل الطلب متاح."""

    def get(self, request):
        from apps.core.models import PendingAction
        from apps.employees.models import EmployeeLeave

        e = self.employee
        try:
            remaining = e.remaining_leave_days
        except Exception:  # noqa: BLE001
            remaining = None
        return Response({
            'leave': {
                'types': [{'key': k, 'label': v} for k, v in EmployeeLeave.LeaveType.choices],
                'balance': None if remaining is None else str(Decimal(remaining).quantize(Decimal('0.1'))),
                'has_sponsorship': bool(e.sponsorship_id),
                'max_days': MAX_LEAVE_DAYS,
            },
            'loan': {
                'max_installments': MAX_INSTALLMENTS,
                'open_request': _open_actions(e, PendingAction.ActionType.LOAN_REQUEST).exists(),
            },
        })


class LeaveRequestView(EmployeeBase):
    def post(self, request):
        from apps.core.models import PendingAction
        from apps.core.services.pending_actions import create_pending_action
        from apps.employees.models import EmployeeLeave

        data = request.data
        valid_types = {k for k, _ in EmployeeLeave.LeaveType.choices}
        leave_type = _text(data.get('leave_type')) or EmployeeLeave.LeaveType.ANNUAL
        if leave_type not in valid_types:
            _fail('نوع الإجازة غير صالح.')
        d_from = _parse_date(data.get('date_from'), 'تاريخ البداية')
        d_to = _parse_date(data.get('date_to'), 'تاريخ النهاية')
        if d_to < d_from:
            _fail('تاريخ النهاية يجب أن يكون بعد تاريخ البداية.')
        days = Decimal((d_to - d_from).days + 1)
        if days > MAX_LEAVE_DAYS:
            _fail('مدة الإجازة طويلة جدًا.')
        if d_from < date.today() - timedelta(days=60):
            _fail('لا يمكن تقديم إجازة بتاريخ قديم. تواصل مع الموارد البشرية.')
        notes = _text(data.get('notes'))

        with transaction.atomic():
            employee = _lock_employee(self.employee.pk)
            if employee.status == employee.Status.TERMINATED:
                _fail('لا يمكن تقديم إجازة لموظف منتهي الخدمة.')
            if not employee.sponsorship_id:
                _fail('لا يمكن تقديم إجازة: الموظف غير مُسجَّل على كفالة.')
            if leave_type == EmployeeLeave.LeaveType.ANNUAL:
                remaining = Decimal(employee.remaining_leave_days or 0)
                if days > remaining:
                    _fail(f'الرصيد غير كافٍ: المتاح {remaining:g} يوم، والمطلوب {days:g} يوم.')

            for other in _open_actions(employee, PendingAction.ActionType.LEAVE):
                try:
                    o_from = date.fromisoformat(str(other.payload.get('date_from'))[:10])
                    o_to = date.fromisoformat(str(other.payload.get('date_to'))[:10])
                except ValueError:
                    continue
                if d_from <= o_to and o_from <= d_to:
                    _fail('لديك طلب إجازة قيد الموافقة يتداخل مع هذه الفترة.')

            action = create_pending_action(
                action_type=PendingAction.ActionType.LEAVE,
                employee=employee,
                payload={
                    'leave_type': leave_type,
                    'date_from': d_from.isoformat(),
                    'date_to': d_to.isoformat(),
                    'days': str(days),
                    'notes': notes,
                    'source': SOURCE,
                },
                requested_by=None,
            )
        return Response(_action_dto(action, detail=True), status=201)


class LoanRequestView(EmployeeBase):
    def post(self, request):
        from apps.core.models import PendingAction
        from apps.core.services.pending_actions import create_pending_action

        data = request.data
        amount = _parse_decimal(data.get('amount'), 'مبلغ السلفة').quantize(TWO)
        if amount <= 0:
            _fail('يجب أن يكون مبلغ السلفة أكبر من صفر.')
        if amount > Decimal('9999999.99'):
            _fail('مبلغ السلفة كبير جدًا.')
        raw_installments = data.get('installments')
        try:
            installments = 1 if raw_installments in (None, '') else int(str(raw_installments).strip())
        except ValueError:
            _fail('عدد الأقساط غير صحيح.')
        if not 1 <= installments <= MAX_INSTALLMENTS:
            _fail(f'عدد الأقساط يجب أن يكون بين 1 و{MAX_INSTALLMENTS}.')
        reason = _text(data.get('reason'))
        if not reason:
            _fail('اذكر سبب السلفة.')

        # القسط الشهري = المبلغ ÷ الأقساط مقرّبًا لأعلى؛ والقسط الأخير يبقى موجبًا (قاعدة الموقع)
        monthly = (amount / installments).quantize(TWO, rounding=ROUND_UP)
        if installments > 1 and monthly * (installments - 1) >= amount:
            _fail('عدد الأقساط كبير بالنسبة للمبلغ. قلّل عدد الأقساط.')

        with transaction.atomic():
            employee = _lock_employee(self.employee.pk)
            if employee.status == employee.Status.TERMINATED:
                _fail('لا يمكن تقديم سلفة لموظف منتهي الخدمة.')
            if _open_actions(employee, PendingAction.ActionType.LOAN_REQUEST).exists():
                _fail('لديك طلب سلفة قيد الموافقة. انتظر البت فيه قبل تقديم طلب جديد.')
            action = create_pending_action(
                action_type=PendingAction.ActionType.LOAN_REQUEST,
                employee=employee,
                payload={
                    'amount': str(amount),
                    'monthly_deduction': str(monthly),
                    'installments': installments,
                    'reason': reason,
                    'issued_at': date.today().isoformat(),
                    'first_deduction_date': None,
                    'notes': '',
                    'source': SOURCE,
                },
                requested_by=None,
            )
        return Response(_action_dto(action, detail=True), status=201)
