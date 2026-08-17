#!/usr/bin/env python3
"""إصلاح استخدام query(): بعد التعديل query() يعيد array مباشرة،
فـ const { rows } = await query(...) يجب أن يصبح const rows = await query(...)
وكل rows[0]/rows.length في نفس السكوب يجب أن يصبح rows[0]... لكن rows هو الاسم الجديد.
الاستراتيجية: استبدال كل "const { rows } = await query" بـ "const rows = await query"
ثم استبدال "rows.rows" (double) و "x.rows" حيث x != rows... الأسلم: فقط استبدال
"const { rows }" في الملفات الثلاثة، ثم "rows.rows" -> "rows"، و ".rows[0]" حيث السطر
يستخدم المتغير rows = الآن array — أي الاستدعاءات اللاحقة x.rows يجب أن تصبح x مباشرة.
"""
import re, sys

FILES = [
    '/home/ubuntu/Eeerp/apps/server/routes/users.routes.js',
    '/home/ubuntu/Eeerp/apps/server/routes/accounts.routes.js',
    '/home/ubuntu/Eeerp/apps/server/routes/items.routes.js',
]

for path in FILES:
    src = open(path).read()
    orig = src
    # 1. تحويل destructuring
    src = src.replace('const { rows } = await query(', 'const rows = await query(')
    # 2. إذا كان هناك rows.rows بعد ذلك (لأن بعض الكود كتب x.rows[0] حيث x هو rows)
    src = src.replace('rows.rows', 'rows')
    open(path, 'w').write(src)
    print(f"{path}: replaced destructuring, rows.rows->{ 'rows' if 'rows.rows' in orig else 'none'}")

# التحقق: طباعة جميع الاستخدامات المتبقية ".rows" في الملفات الثلاثة
for path in FILES:
    for i, line in enumerate(open(path), 1):
        if '.rows' in line and 'await query' not in line:
            print(f"  {path}:{i}: {line.rstrip()[:100]}")
