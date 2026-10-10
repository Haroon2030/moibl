"""اختبارات خدمة API الموبايل — الدخول، عزل البيانات، الموافقات."""
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import Client, TestCase

from apps.core.models import Branch, Company, PendingAction
from apps.core.services.pending_actions import create_pending_action
from apps.employees.models import (
    Employee, EmployeeAbsence, EmployeeLeave, EmployeeLoan, EmployeeSalaryChange, EmployeeStatement,
)

User = get_user_model()
BASE = '/m/v1'


class MobileApiBase(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        company = Company.objects.create(name='شركة الاختبار')
        self.branch_a = Branch.objects.create(name='فرع أ', code='MA1', company=company)
        self.branch_b = Branch.objects.create(name='فرع ب', code='MB1', company=company)
        self.emp_a = Employee.objects.create(
            name='موظف أ', branch=self.branch_a, employee_number='1001', id_number='1111111111',
            hire_date=date(2024, 1, 1), basic_salary=Decimal('5000'),
        )
        self.emp_b = Employee.objects.create(
            name='موظف ب', branch=self.branch_b, employee_number='2002', id_number='2222222222',
            hire_date=date(2024, 1, 1), basic_salary=Decimal('6000'),
        )
        self.manager = User.objects.create_user('mgr_a', password='pass-12345')
        self.branch_a.manager = self.manager
        self.branch_a.save(update_fields=['manager'])
        self.plain = User.objects.create_user('plain_user', password='pass-12345')
        self.admin = User.objects.create_superuser('mobile_admin', 'm@example.com', 'pass-12345')

    # مساعدات
    def employee_token(self, number='1001', id_number='1111111111'):
        r = self.client.post(f'{BASE}/auth/employee/', {'employee_number': number, 'id_number': id_number},
                             content_type='application/json')
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()['token']

    def manager_token(self, username='mgr_a', password='pass-12345'):
        r = self.client.post(f'{BASE}/auth/manager/', {'username': username, 'password': password},
                             content_type='application/json')
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()['token']

    def get(self, path, token):
        return self.client.get(f'{BASE}{path}', HTTP_AUTHORIZATION=f'Bearer {token}')

    def post(self, path, token, data=None):
        return self.client.post(f'{BASE}{path}', data or {}, content_type='application/json',
                                HTTP_AUTHORIZATION=f'Bearer {token}')


class AuthTests(MobileApiBase):
    def test_employee_login_and_me(self):
        token = self.employee_token()
        r = self.get('/me/', token)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['kind'], 'employee')
        self.assertEqual(r.json()['profile']['name'], 'موظف أ')

    def test_wrong_id_is_generic_401(self):
        r = self.client.post(f'{BASE}/auth/employee/', {'employee_number': '1001', 'id_number': '9999999999'},
                             content_type='application/json')
        self.assertEqual(r.status_code, 401)
        r2 = self.client.post(f'{BASE}/auth/employee/', {'employee_number': 'nope', 'id_number': '1'},
                              content_type='application/json')
        self.assertEqual(r2.status_code, 401)
        self.assertEqual(r.json()['detail'], r2.json()['detail'])  # لا نكشف وجود الرقم الوظيفي

    def test_terminated_employee_cannot_login(self):
        self.emp_a.status = Employee.Status.TERMINATED
        self.emp_a.save(update_fields=['status'])
        r = self.client.post(f'{BASE}/auth/employee/', {'employee_number': '1001', 'id_number': '1111111111'},
                             content_type='application/json')
        self.assertEqual(r.status_code, 401)

    def test_lockout_after_repeated_failures(self):
        for _ in range(5):
            self.client.post(f'{BASE}/auth/employee/', {'employee_number': '1001', 'id_number': 'bad'},
                             content_type='application/json')
        r = self.client.post(f'{BASE}/auth/employee/', {'employee_number': '1001', 'id_number': '1111111111'},
                             content_type='application/json')
        self.assertEqual(r.status_code, 429)

    def test_tampered_token_rejected(self):
        token = self.employee_token()
        self.assertEqual(self.get('/me/', token + 'x').status_code, 401)
        self.assertEqual(self.client.get(f'{BASE}/me/').status_code, 401)

    def test_changing_id_number_invalidates_token(self):
        token = self.employee_token()
        self.emp_a.id_number = '5555555555'
        self.emp_a.save(update_fields=['id_number'])
        self.assertEqual(self.get('/me/', token).status_code, 401)

    def test_manager_login_rules(self):
        self.manager_token()
        self.manager_token('mobile_admin')
        r = self.client.post(f'{BASE}/auth/manager/', {'username': 'plain_user', 'password': 'pass-12345'},
                             content_type='application/json')
        self.assertEqual(r.status_code, 401)  # مستخدم عادي غير مخوّل
        r = self.client.post(f'{BASE}/auth/manager/', {'username': 'mgr_a', 'password': 'wrong'},
                             content_type='application/json')
        self.assertEqual(r.status_code, 401)

    def test_kinds_are_separated(self):
        emp = self.employee_token()
        mgr = self.manager_token()
        self.assertEqual(self.get('/manager/approvals/', emp).status_code, 403)
        self.assertEqual(self.get('/employee/summary/', mgr).status_code, 403)


class EmployeeDataTests(MobileApiBase):
    def setUp(self):
        super().setUp()
        self.loan_a = EmployeeLoan.objects.create(
            employee=self.emp_a, serial_number='LN-A', amount=Decimal('1200'), monthly_deduction=Decimal('400'),
            installments=3, issued_at=date.today(), first_deduction_date=date.today() + timedelta(days=30),
        )
        self.loan_a.generate_installments()
        self.loan_b = EmployeeLoan.objects.create(
            employee=self.emp_b, serial_number='LN-B', amount=Decimal('900'), monthly_deduction=Decimal('300'),
            installments=3, issued_at=date.today(),
        )
        EmployeeLeave.objects.create(employee=self.emp_a, leave_type='annual', date_from=date(2025, 5, 1),
                                     date_to=date(2025, 5, 5), days=Decimal('5'))
        EmployeeAbsence.objects.create(employee=self.emp_a, serial_number='AB-1', absence_date=date(2025, 6, 1), days=1,
                                       total_salary_snapshot=Decimal('5000'), deduction_amount=Decimal('166.67'))
        EmployeeStatement.objects.create(employee=self.emp_a, statement_type='warning', title='إنذار تأخير',
                                         statement_date=date(2025, 7, 1), content='نص الإنذار')
        EmployeeSalaryChange.objects.create(employee=self.emp_a, effective_date=date(2025, 1, 1),
                                            old_basic_salary=Decimal('4500'), new_basic_salary=Decimal('5000'),
                                            reason='علاوة سنوية')
        create_pending_action(
            action_type=PendingAction.ActionType.LEAVE, employee=self.emp_a,
            payload={'leave_type': 'annual', 'date_from': '2026-11-01', 'date_to': '2026-11-03', 'internal_secret': 'x'},
            requested_by=self.admin,
        )
        self.token = self.employee_token()

    def test_lists_return_only_own_data(self):
        loans = self.get('/employee/loans/', self.token).json()['results']
        self.assertEqual([item['serial_number'] for item in loans], ['LN-A'])
        self.assertEqual(self.get('/employee/leaves/', self.token).json()['results'][0]['days'], '5.00')
        self.assertEqual(self.get('/employee/absences/', self.token).json()['results'][0]['serial_number'], 'AB-1')
        self.assertEqual(self.get('/employee/statements/', self.token).json()['results'][0]['title'], 'إنذار تأخير')
        salary = self.get('/employee/salary/', self.token).json()
        self.assertEqual(salary['changes'][0]['difference'], '500.00')
        self.assertEqual(salary['current']['basic_salary'], '5000.00')

    def test_other_employees_records_are_404(self):
        self.assertEqual(self.get(f'/employee/loans/{self.loan_b.pk}/', self.token).status_code, 404)
        detail = self.get(f'/employee/loans/{self.loan_a.pk}/', self.token)
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(len(detail.json()['installments_log']), 3)
        stmt_b = EmployeeStatement.objects.create(employee=self.emp_b, statement_type='warning', title='ب',
                                                  statement_date=date(2025, 7, 1))
        self.assertEqual(self.get(f'/employee/statements/{stmt_b.pk}/', self.token).status_code, 404)

    def test_requests_show_safe_summary_only(self):
        rows = self.get('/employee/requests/', self.token).json()['results']
        self.assertEqual(len(rows), 1)
        labels = {s['label'] for s in rows[0]['summary']}
        self.assertEqual(labels, {'نوع الإجازة', 'من', 'إلى'})
        self.assertNotIn('internal_secret', str(rows[0]))

    def test_summary(self):
        data = self.get('/employee/summary/', self.token).json()
        self.assertEqual(data['active_loans'], 1)
        self.assertEqual(data['open_requests'], 1)
        self.assertEqual(data['last_salary_change']['new_basic_salary'], '5000.00')

    def test_read_only_no_write_endpoints(self):
        for path in ('/employee/loans/', '/employee/leaves/', '/employee/salary/'):
            self.assertEqual(self.post(path, self.token).status_code, 405)


class ApprovalsTests(MobileApiBase):
    def setUp(self):
        super().setUp()
        self.action_a = create_pending_action(
            action_type=PendingAction.ActionType.LEAVE, employee=self.emp_a,
            payload={'leave_type': 'annual', 'date_from': '2026-11-01', 'date_to': '2026-11-03'},
            requested_by=self.admin,
        )
        self.action_b = create_pending_action(
            action_type=PendingAction.ActionType.LEAVE, employee=self.emp_b,
            payload={'leave_type': 'annual', 'date_from': '2026-11-01', 'date_to': '2026-11-03'},
            requested_by=self.admin,
        )

    def test_manager_sees_only_managed_branch(self):
        token = self.manager_token()
        ids = [a['id'] for a in self.get('/manager/approvals/', token).json()['results']]
        self.assertIn(self.action_a.id, ids)
        self.assertNotIn(self.action_b.id, ids)
        self.assertEqual(self.get(f'/manager/approvals/{self.action_b.id}/', token).status_code, 404)

    def test_branch_manager_without_permission_cannot_act(self):
        token = self.manager_token()
        item = self.get(f'/manager/approvals/{self.action_a.id}/', token).json()
        self.assertFalse(item['can_approve'])
        self.assertEqual(self.post(f'/manager/approvals/{self.action_a.id}/approve/', token).status_code, 403)
        self.action_a.refresh_from_db()
        self.assertEqual(self.action_a.status, PendingAction.Status.PENDING_BRANCH)

    def test_admin_can_approve_and_return(self):
        token = self.manager_token('mobile_admin')
        self.assertTrue(self.get(f'/manager/approvals/{self.action_a.id}/', token).json()['can_approve'])
        r = self.post(f'/manager/approvals/{self.action_a.id}/approve/', token, {'notes': 'موافق'})
        self.assertEqual(r.status_code, 200, r.content)
        self.action_a.refresh_from_db()
        self.assertEqual(self.action_a.status, PendingAction.Status.PENDING_GM)
        self.assertEqual(self.action_a.branch_notes, 'موافق')
        self.assertEqual(self.action_a.branch_reviewed_by, self.admin)

        # لا يمكن اعتماد نفس الطلب مرتين من المرحلة الأولى
        again = self.post(f'/manager/approvals/{self.action_a.id}/approve/', token)
        self.assertIn(again.status_code, (400, 403))

    def test_return_requires_notes(self):
        token = self.manager_token('mobile_admin')
        r = self.post(f'/manager/approvals/{self.action_b.id}/return/', token, {})
        self.assertEqual(r.status_code, 400)
        r = self.post(f'/manager/approvals/{self.action_b.id}/return/', token, {'notes': 'يلزم تعديل التواريخ'})
        self.assertEqual(r.status_code, 200, r.content)
        self.action_b.refresh_from_db()
        self.assertEqual(self.action_b.status, PendingAction.Status.RETURNED)


class EmployeeSubmitRequestTests(MobileApiBase):
    """رفع إجازة وسلفة من الموظف: يدخل مسار الموافقات ويظهر لمدير الفرع."""

    def setUp(self):
        super().setUp()
        from apps.setup.models import Sponsorship

        self.emp_a.sponsorship = Sponsorship.objects.create(code='SP1', company_name='كفالة الاختبار')
        self.emp_a.save(update_fields=['sponsorship'])
        self.token = self.employee_token()

    def leave(self, **extra):
        today = date.today()
        body = {'leave_type': 'annual', 'date_from': (today + timedelta(days=10)).isoformat(),
                'date_to': (today + timedelta(days=12)).isoformat(), 'notes': 'سفر'}
        body.update(extra)
        return self.post('/employee/requests/leave/', self.token, body)

    def loan(self, **extra):
        body = {'amount': '3000', 'installments': 3, 'reason': 'ظرف طارئ'}
        body.update(extra)
        return self.post('/employee/requests/loan/', self.token, body)

    def test_leave_creates_pending_action_for_branch(self):
        r = self.leave()
        self.assertEqual(r.status_code, 201, r.content)
        a = PendingAction.objects.get(pk=r.json()['id'])
        self.assertEqual(a.action_type, 'leave')
        self.assertEqual(a.status, PendingAction.Status.PENDING_BRANCH)
        self.assertEqual(a.employee_id, self.emp_a.id)
        self.assertEqual(a.branch_id, self.branch_a.id)
        self.assertIsNone(a.requested_by)
        self.assertEqual(a.payload['days'], '3')
        # يظهر في صندوق مدير الفرع ويُعرض مقدّم الطلب
        mgr = self.manager_token()
        listing = self.get('/manager/approvals/', mgr).json()['results']
        self.assertIn(a.id, [x['id'] for x in listing])
        detail = self.get(f'/manager/approvals/{a.id}/', mgr).json()
        self.assertIn('من التطبيق', detail['requested_by'])
        # وفي طلباتي
        mine = self.get('/employee/requests/', self.token).json()['results']
        self.assertEqual(mine[0]['id'], a.id)

    def test_leave_requires_sponsorship(self):
        self.emp_a.sponsorship = None
        self.emp_a.save(update_fields=['sponsorship'])
        r = self.leave()
        self.assertEqual(r.status_code, 400)
        self.assertIn('كفالة', r.json()['detail'])
        self.assertEqual(PendingAction.objects.count(), 0)

    def test_leave_validation(self):
        today = date.today()
        self.assertEqual(self.leave(date_to=(today).isoformat()).status_code, 400)  # نهاية قبل البداية
        self.assertEqual(self.leave(date_from='bad').status_code, 400)
        self.assertEqual(self.leave(leave_type='nope').status_code, 400)
        old = (today - timedelta(days=200)).isoformat()
        self.assertEqual(self.leave(date_from=old, date_to=old).status_code, 400)
        self.assertEqual(PendingAction.objects.count(), 0)

    def test_leave_balance_exceeded(self):
        far = date.today() + timedelta(days=300)
        r = self.leave(date_from=date.today().isoformat(), date_to=far.isoformat())
        self.assertEqual(r.status_code, 400)
        self.assertIn('الرصيد', r.json()['detail'])
        # الإجازة المرضية لا تتأثر بالرصيد
        ok = self.leave(leave_type='sick', date_from=date.today().isoformat(), date_to=far.isoformat())
        self.assertEqual(ok.status_code, 201, ok.content)

    def test_overlapping_open_leave_blocked(self):
        self.assertEqual(self.leave().status_code, 201)
        r = self.leave()
        self.assertEqual(r.status_code, 400)
        self.assertEqual(PendingAction.objects.filter(action_type='leave').count(), 1)

    def test_loan_creates_pending_action_with_computed_installment(self):
        r = self.loan()
        self.assertEqual(r.status_code, 201, r.content)
        a = PendingAction.objects.get(pk=r.json()['id'])
        self.assertEqual(a.action_type, 'loan_request')
        self.assertEqual(a.status, PendingAction.Status.PENDING_BRANCH)
        self.assertEqual(a.payload['amount'], '3000.00')
        self.assertEqual(a.payload['monthly_deduction'], '1000.00')
        self.assertEqual(a.payload['installments'], 3)
        self.assertEqual(EmployeeLoan.objects.count(), 0)  # لا تُصرف قبل الاعتماد

    def test_loan_validation_and_single_open_request(self):
        for bad in ({'amount': '0'}, {'amount': 'abc'}, {'amount': '-5'}, {'installments': 0},
                    {'installments': 'x'}, {'installments': 999}, {'reason': ''}, {'reason': '   '}):
            self.assertEqual(self.loan(**bad).status_code, 400, bad)
        self.assertEqual(PendingAction.objects.count(), 0)
        self.assertEqual(self.loan().status_code, 201)
        again = self.loan()
        self.assertEqual(again.status_code, 400)
        self.assertEqual(PendingAction.objects.filter(action_type='loan_request').count(), 1)

    def test_branch_manager_approval_runs_through_existing_flow(self):
        r = self.loan()
        mgr = self.manager_token('mobile_admin')  # الأدمن يملك صلاحية المرحلة (كبقية اختبارات الموافقات)
        ok = self.post(f"/manager/approvals/{r.json()['id']}/approve/", mgr, {'notes': 'موافق'})
        self.assertEqual(ok.status_code, 200, ok.content)
        a = PendingAction.objects.get(pk=r.json()['id'])
        self.assertNotEqual(a.status, PendingAction.Status.PENDING_BRANCH)

    def test_options_endpoint(self):
        o = self.get('/employee/requests/options/', self.token).json()
        self.assertTrue(o['leave']['has_sponsorship'])
        self.assertIsNotNone(o['leave']['balance'])
        self.assertFalse(o['loan']['open_request'])
        self.loan()
        self.assertTrue(self.get('/employee/requests/options/', self.token).json()['loan']['open_request'])

    def test_requires_employee_token_and_isolated(self):
        mgr = self.manager_token()
        self.assertEqual(self.post('/employee/requests/loan/', mgr, {'amount': '10', 'reason': 'x'}).status_code, 403)
        self.assertEqual(self.client.post(f'{BASE}/employee/requests/loan/', {}, content_type='application/json').status_code, 401)
        self.loan()
        other = self.employee_token('2002', '2222222222')
        self.assertEqual(self.get('/employee/requests/', other).json()['results'], [])
