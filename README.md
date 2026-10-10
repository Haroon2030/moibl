# تطبيق الخدمة الذاتية (موبايل)

تطبيق React Native (Expo) للموظف ومدير الفرع، مع خدمة API مستقلة. لا يعدّل أي ملف في المشروع الأصلي.

## الهيكل
- `api/` خدمة Django جانبية (`mobile_api`) تستورد نماذج `backend/` وتعرضها عبر `/m/v1/`.
- `app/` تطبيق Expo (Expo Router + TypeScript).

## تشغيل الـ API
```
run_api.bat            # المنفذ 8010، بيئة التطوير (قاعدة sqlite المحلية)
```
أو يدويًا: `DJANGO_ENV=development python api/manage.py runserver 0.0.0.0:8010`
الاختبارات: `python api/manage.py test mobile_api`

## تشغيل التطبيق
```
cd app
npm install
npx expo start            # أو: npm run web للمعاينة في المتصفح
```
عنوان الخادم: `EXPO_PUBLIC_API_URL` (الافتراضي `http://10.0.2.2:8010` للمحاكي، وللجهاز الحقيقي استخدم IP الجهاز).

## الدخول
- الموظف: الرقم الوظيفي + رقم الهوية.
- مدير الفرع: اسم المستخدم + كلمة المرور (نفس حساب النظام).
- حماية: قفل بعد 5 محاولات فاشلة لمدة 15 دقيقة، ورسالة خطأ موحدة.

## الحدود
- شاشات الموظف للعرض فقط.
- المدير يعتمد/يرجع الطلب في مرحلة الفرع فقط.
- الإنتاج: عيّن `MOBILE_API_ALLOWED_HOSTS` و`MOBILE_API_CORS_ORIGINS` وشغّل خلف HTTPS.
- لبناء Android/iOS عبر EAS يلزم تحديد معرّف الحزمة في `app.json`.
