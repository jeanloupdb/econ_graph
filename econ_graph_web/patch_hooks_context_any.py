
import os

file_path = 'src/lib/api/hooks.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Fix: cast context to any in useUpdateNode onError
# We look for the line: if (context?.previousNode) {
# And change it to: if ((context as any)?.previousNode) {
# But since I can't easily match exact whitespace, I'll try a broader replacement or use regex if needed.
# However, simple string replacement should work if I match enough context.

old_code_1 = 'if (context?.previousNode) {'
new_code_1 = 'if ((context as any)?.previousNode) {'
content = content.replace(old_code_1, new_code_1)

old_code_2 = 'if (context?.previousNodes) {'
new_code_2 = 'if ((context as any)?.previousNodes) {'
content = content.replace(old_code_2, new_code_2)

# Also for useDeleteNode if it has similar pattern
# It likely has context?.previousNodes

# Let's also check where context.previousNode is used inside the block
old_code_3 = 'context.previousNode'
new_code_3 = '(context as any).previousNode'
content = content.replace(old_code_3, new_code_3)

old_code_4 = 'context.previousNodes'
new_code_4 = '(context as any).previousNodes'
content = content.replace(old_code_4, new_code_4)

with open(file_path, 'w') as f:
    f.write(content)

print("Patched hooks.ts: cast context to any")
