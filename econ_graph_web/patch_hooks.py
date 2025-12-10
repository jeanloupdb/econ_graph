
import os

file_path = 'src/lib/api/hooks.ts'

with open(file_path, 'r') as f:
    lines = f.readlines()

# Insert imports
insert_import_idx = -1
for i, line in enumerate(lines):
    if 'NodeUpdate,' in line:
        insert_import_idx = i + 1
        break

if insert_import_idx != -1:
    lines.insert(insert_import_idx, '  Edge,\n')
    lines.insert(insert_import_idx + 1, '  EdgeCreate,\n')

# Insert function
insert_func_idx = -1
for i, line in enumerate(lines):
    if 'export function useUpdateNode' in line:
        insert_func_idx = i
        break

if insert_func_idx != -1:
    func_code = [
        '\n',
        'export function useCreateEdge(\n',
        '  options?: UseMutationOptions<Edge, Error, EdgeCreate>\n',
        ') {\n',
        '  const queryClient = useQueryClient();\n',
        '\n',
        '  return useMutation<Edge, Error, EdgeCreate>({\n',
        "    mutationFn: (data) => apiClient.post<Edge, EdgeCreate>('/edges', data),\n",
        '    onSuccess: () => {\n',
        '      queryClient.invalidateQueries({ queryKey: queryKeys.nodes });\n',
        '    },\n',
        '    ...options,\n',
        '  });\n',
        '}\n',
        '\n'
    ]
    for line in reversed(func_code):
        lines.insert(insert_func_idx, line)

with open(file_path, 'w') as f:
    f.writelines(lines)

print("Patched hooks.ts")
