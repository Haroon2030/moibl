// يشغّل معاينة الويب من مجلد التطبيق بغض النظر عن مجلد الاستدعاء
process.chdir(__dirname);
process.env.CI = '1';
process.argv = [process.argv[0], 'expo', 'start', '--web', '--port', '8081'];
require('expo/bin/cli');
