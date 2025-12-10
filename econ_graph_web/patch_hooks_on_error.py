
import os

file_path = 'src/lib/api/hooks.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Fix 1: useUpdateNode onError
old_sig_1 = 'onError: (err: Error, variables: NodeUpdate, context: { previousNode?: Node; previousNodes?: Node[] } | undefined) => {'
new_sig_1 = 'onError: (err, variables, context) => {'
content = content.replace(old_sig_1, new_sig_1)

# Fix 2: useDeleteNode onError (assuming line 364 corresponds to useDeleteNode based on context)
old_sig_2 = 'onError: (err: Error, variables: string, context: { previousNodes?: Node[] } | undefined) => {'
new_sig_2 = 'onError: (err, variables, context) => {'
content = content.replace(old_sig_2, new_sig_2)

# Also fix onMutate signatures if they are too specific and causing issues, though the error was on onError.
# TanStack Query v5 types are generic, so explicit types in callback args can mismatch if not exact.
# Removing explicit types from callback args is safer.

with open(file_path, 'w') as f:
    f.write(content)

print("Patched hooks.ts: simplified onError signatures")
