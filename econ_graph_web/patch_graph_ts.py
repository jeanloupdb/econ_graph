
import os

file_path = 'src/lib/composites/graph.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Fix: Remove created_at and updated_at from ensureCompositeNodeDefaults return object
# because Node type expects string | undefined, but we are assigning string | null
# Actually, Node interface usually has optional string for dates.
# The error says: Type 'string | null' is not assignable to type 'string | undefined'.
# This means Node defines them as optional (string | undefined) but we are passing null.
# We should use undefined instead of null for these fields.

# Replace ?? null with ?? undefined for created_at and updated_at
content = content.replace('created_at: payload.created_at ?? null,', 'created_at: payload.created_at ?? undefined,')
content = content.replace('updated_at: payload.updated_at ?? null,', 'updated_at: payload.updated_at ?? undefined,')

with open(file_path, 'w') as f:
    f.write(content)

print("Patched graph.ts: used undefined instead of null for dates")
