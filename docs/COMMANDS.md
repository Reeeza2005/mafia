# جعبه‌ابزار دستورات توسعه و نگهداری (Dev Commands)

این دستورات را می‌توانید ذخیره کرده و در موقعیت‌های مختلف اجرا کنید:

### ۱. دستور بررسی سلامت و بیلد پروژه
npm run build

### ۲. دستور بررسی برنچ و تغییرات ذخیره‌نشده
git status

### ۳. ذخیره و ثبت تغییرات در گیت
git add .
git commit -m "feat(core): update core files"
git push

### ۴. راستی‌آزمایی حضور ۳۰ نقش رسمی
python3 -c '
import re
txt = open("src/core/types/roles.ts").read()
roles = re.findall(r""([a-zA-Z0-9_]+)"", txt)
print(f"تعداد نقش‌های ثبت‌شده در هسته: {len(roles)} از ۳۰")
'
