
import os

file_path = 'src/lib/types/index.ts'

with open(file_path, 'r') as f:
    lines = f.readlines()

# We need to remove the second occurrence of graph_data in Composite interface
# The error log showed:
# 216:   graph_data: CompositeGraphData;
# ...
# 219:   graph_data?: CompositeGraphData;

# We will read lines and if we are inside Composite interface, we check for duplicates.
# Or simpler: just remove the specific line '  graph_data?: CompositeGraphData;' if it follows '  graph_data: CompositeGraphData;' closely.

new_lines = []
skip_next_graph_data = False
inside_composite = False

for line in lines:
    if 'export interface Composite {' in line:
        inside_composite = True
    
    if inside_composite and '}' in line:
        inside_composite = False
        skip_next_graph_data = False

    if inside_composite:
        if 'graph_data: CompositeGraphData;' in line:
            skip_next_graph_data = True
            new_lines.append(line)
            continue
        if 'graph_data?: CompositeGraphData;' in line and skip_next_graph_data:
            # Skip this duplicate line
            continue
    
    new_lines.append(line)

with open(file_path, 'w') as f:
    f.writelines(new_lines)

print("Patched types/index.ts: removed duplicate graph_data")
