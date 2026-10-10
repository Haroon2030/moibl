from django.http import HttpResponse
from django.urls import path

from . import admin_views, employee_requests, views

def root(request):
    return HttpResponse(
        '<!doctype html><meta charset="utf-8"><title>API</title>'
        '<body dir="rtl" style="font-family:sans-serif;padding:2rem">'
        '<h2>خدمة API تطبيق الموظف تعمل ✔</h2>'
        '<p>هذه واجهة برمجية لا صفحة ويب. افتح التطبيق على <a href="http://localhost:8081">localhost:8081</a>.</p>'
        '<p><a href="/health/">/health/</a></p></body>'
    )


urlpatterns = [
    path('', root),
    path('health/', views.health),
    path('m/v1/auth/employee/', views.EmployeeLoginView.as_view()),
    path('m/v1/auth/manager/', views.ManagerLoginView.as_view()),
    path('m/v1/me/', views.MeView.as_view()),

    # الموظف (عرض فقط)
    path('m/v1/employee/summary/', views.EmployeeSummaryView.as_view()),
    path('m/v1/employee/loans/', views.LoansView.as_view()),
    path('m/v1/employee/loans/<int:pk>/', views.LoanDetailView.as_view()),
    path('m/v1/employee/salary/', views.SalaryView.as_view()),
    path('m/v1/employee/leaves/', views.LeavesView.as_view()),
    path('m/v1/employee/absences/', views.AbsencesView.as_view()),
    path('m/v1/employee/statements/', views.StatementsView.as_view()),
    path('m/v1/employee/statements/<int:pk>/', views.StatementDetailView.as_view()),
    path('m/v1/employee/requests/', views.MyRequestsView.as_view()),
    path('m/v1/employee/requests/options/', employee_requests.RequestOptionsView.as_view()),
    path('m/v1/employee/requests/leave/', employee_requests.LeaveRequestView.as_view()),
    path('m/v1/employee/requests/loan/', employee_requests.LoanRequestView.as_view()),

    # الأدمن / مدير الموارد — بيانات الموظفين
    path('m/v1/admin/employees/overview/', admin_views.AdminEmployeesOverviewView.as_view()),
    path('m/v1/admin/employees/filters/', admin_views.AdminEmployeeFiltersView.as_view()),
    path('m/v1/admin/employees/', admin_views.AdminEmployeesView.as_view()),
    path('m/v1/admin/employees/<int:pk>/', admin_views.AdminEmployeeDetailView.as_view()),

    # مدير الفرع
    path('m/v1/manager/approvals/', views.ApprovalsView.as_view()),
    path('m/v1/manager/approvals/<int:pk>/', views.ApprovalDetailView.as_view()),
    path('m/v1/manager/approvals/<int:pk>/approve/', views.ApprovalApproveView.as_view()),
    path('m/v1/manager/approvals/<int:pk>/return/', views.ApprovalReturnView.as_view()),
]
