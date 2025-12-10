
import os

file_path = 'src/lib/api/hooks.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Fix 1: useUpdateNode onMutate
# TanStack Query v5 expects onMutate to return context or promise of context.
# The issue might be type inference of updatedData if not explicitly typed or if generic params are strict.
# However, usually 'async (updatedData) =>' works if generic types are correct.
# The error message "Type error: No overload matches this call" often points to mismatch in options object structure.
# Let's try to make it explicit or simpler.

# Actually, looking at the error log from previous step (which was truncated in my thought process but visible in history),
# it pointed to line 212.
# Let's try to remove the type annotation if any, or just ensure it matches.
# In the file it is: onMutate: async (updatedData) => {
# We will replace it with: onMutate: async (updatedData: NodeUpdate) => {
# But wait, if I can't read the file easily to see context, I should be careful.
# The previous grep showed: 212:    onMutate: async (updatedData) => {

# Let's try to just make it generic 'variables' instead of 'updatedData' to be consistent with standard naming,
# though that shouldn't matter for types.
# Maybe the return type of onMutate is not matching what Mutation expects?
# It returns { previousNode, previousNodes }.

# Let's try to explicitly type the argument.
old_sig = 'onMutate: async (updatedData) => {'
new_sig = 'onMutate: async (updatedData: NodeUpdate) => {'
content = content.replace(old_sig, new_sig)

with open(file_path, 'w') as f:
    f.write(content)

print("Patched hooks.ts: explicit type for onMutate")
