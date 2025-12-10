import os

file_path = "src/lib/api/client.ts"

with open(file_path, "r") as f:
    content = f.read()

# 1. Insert getAuthHeader function
auth_helper = """
function getAuthHeader(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export const apiClient = {"""

if "function getAuthHeader" not in content:
    content = content.replace("export const apiClient = {", auth_helper)

# 2. Update headers in all methods
# We look for the pattern and replace it.
# Since all methods use the same headers structure, we can do a global replace.

old_headers = """      headers: {
        'Content-Type': 'application/json',
      },"""

new_headers = """      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },"""

if old_headers in content:
    content = content.replace(old_headers, new_headers)
else:
    print("Could not find headers pattern to replace.")

with open(file_path, "w") as f:
    f.write(content)

print("Successfully patched client.ts with auth headers.")
