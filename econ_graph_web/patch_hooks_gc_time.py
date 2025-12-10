
import os

file_path = 'src/lib/api/hooks.ts'

with open(file_path, 'r') as f:
    content = f.read()

new_content = content.replace('cacheTime:', 'gcTime:')

with open(file_path, 'w') as f:
    f.write(new_content)

print("Patched hooks.ts: replaced cacheTime with gcTime")
