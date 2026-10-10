#!/usr/bin/env python
"""أمر إدارة خدمة API الموبايل (مستقلة عن مشروع Django الأصلي)."""
import os
import sys


def main():
    # أمان: بدون تحديد صريح نستخدم التطوير، فلا نصل لقاعدة الإنتاج عن طريق ملف .env بالخطأ.
    os.environ.setdefault('DJANGO_ENV', 'development')
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mobile_api.settings')
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
