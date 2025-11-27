# Fix for Nested Composite Exposed Roots Issue

## Problem Description

When a composite contains another composite as an input parameter (nested composites), the exposed-roots endpoint was unable to resolve the `current_value` for the inputs of the nested composite.

### Example Structure

```
Composite Parent (f103...)
  └─ debt_gdp_1 (node) → points to Composite Child (cfaf...)
       └─ Composite Child (cfaf...)
            ├─ gdp_usd (input)
            └─ gov_debt_usd (input)
```

### The Issue

When querying `/projects/{id}/exposed-roots` for the parent composite:
- ✅ The system correctly identified `debt_gdp_1` as a nested composite
- ✅ It recursively descended into the child composite to expose `gdp_usd` and `gov_debt_usd`
- ❌ But it was looking for these values in the **parent's cache** instead of the **child's cache**
- Result: `current_value` remained `None` with logs showing:
  ```
  [exposed-roots] available real keys=['debt_gdp_1', ...] trying=['gdp_usd']
  [exposed-roots] unresolved current_value for composite root gdp_usd
  ```

## Root Cause

The problem was in `_flatten_composite_root_entry()` in [projects.py](econ_graph_api/app/api/projects.py):

1. **Missing Instance Resolution**: When entering a nested composite, the code tried to find the project node corresponding to the nested composite. But if the match was not found via `match_node`, it didn't check `nodes_by_composite_id` to find nodes with that `composite_id`.

2. **Incorrect Path Construction**: The `child_path` was only updated if `nested_instance_id` was found, but without the fallback lookup, `nested_instance_id` remained `None` for many nested composites.

3. **Wrong Cache Lookup**: Even with `cache_owner = base_path[-1]`, if `base_path` didn't include the child composite's node ID, it would still query the wrong cache bucket.

## The Fix

### Changes in `_flatten_composite_root_entry()`

#### 1. Added Fallback Instance Resolution (lines 159-168)

```python
# If no project node matches, search for a node with this composite_id
if not nested_instance_id:
    potential_nodes = nodes_by_composite_id.get(composite_id, [])
    if potential_nodes:
        nested_instance_id = potential_nodes[0].id
        logger.info(
            "[exposed-roots] resolved nested composite entry=%s via composite_id to node=%s",
            entry.get("slug") or entry.get("id"),
            nested_instance_id,
        )
```

**Why**: When a composite entry doesn't have a direct slug/id match, we still need to find the node instance that uses this composite. The `nodes_by_composite_id` dict provides this mapping.

#### 2. Enhanced Path Construction Logging (lines 181-195)

```python
# Build child_path: always append nested_instance_id if it exists and differs from last
child_path = base_path
if nested_instance_id and (not base_path or base_path[-1] != nested_instance_id):
    child_path = base_path + [nested_instance_id]
    logger.info(
        "[exposed-roots] child_path updated to %s for nested composite %s",
        child_path,
        composite_id,
    )
elif not nested_instance_id:
    logger.warning(
        "[exposed-roots] no instance found for nested composite=%s, keeping base_path=%s",
        composite_id,
        base_path,
    )
```

**Why**: Better logging helps diagnose if the path is being built correctly. The warning alerts when we can't find a node instance for a nested composite.

#### 3. Improved Cache Owner Logging (lines 240-244)

```python
logger.info(
    "[exposed-roots] cache_owner determined: base_path=%s => cache_owner=%s",
    base_path,
    cache_owner,
)
```

**Why**: This confirms that the correct `cache_owner` (the last element of `base_path`) is being used to query the cache.

## Expected Behavior After Fix

With the fix in place:

1. **Path Construction**:
   - Parent composite: `base_path = [parent_node_id]`
   - Nested composite: `child_path = [parent_node_id, child_node_id]`
   - Leaf inputs: `base_path = [parent_node_id, child_node_id]`

2. **Cache Lookup**:
   - For `gdp_usd` and `gov_debt_usd`: `cache_owner = child_node_id` (from `base_path[-1]`)
   - Query: `composite_root_cache.list_real_keys(project_id, child_node_id)` → `['gdp_usd', 'gov_debt_usd', ...]`
   - Result: ✅ Values found and `current_value` populated

3. **Logs Should Show**:
   ```
   [exposed-roots] resolved nested composite entry=debt_gdp_1 via composite_id to node=<child_node_id>
   [exposed-roots] child_path updated to [<parent>, <child>] for nested composite <composite_id>
   [exposed-roots] cache_owner determined: base_path=[<parent>, <child>] => cache_owner=<child>
   [exposed-roots] available real keys=['gdp_usd', 'gov_debt_usd', ...] trying=['gdp_usd']
   ✅ No "unresolved current_value" error
   ```

## Testing

### Prerequisites
- API running at `http://localhost:8000`
- A project with nested composites (parent containing `debt_gdp_1` composite)

### Test Script

Run the provided test script:

```bash
python test_nested_composite_fix.py <project_id>
```

This script will:
1. Trigger `compute_all` to populate caches
2. Query `/projects/{id}/exposed-roots`
3. Verify that `gdp_usd` and `gov_debt_usd` have non-null `current_value`

### Check Logs

To see detailed debug logs:

```bash
./check_logs.sh
```

Or directly:

```bash
docker-compose logs api | grep "\[exposed-roots\]" | tail -50
```

## Verification Checklist

- [ ] `compute_all` completes without errors
- [ ] Logs show `child_path` being updated correctly for nested composites
- [ ] `cache_owner` is set to the child node ID (not parent)
- [ ] `list_real_keys()` returns the child's inputs (e.g., `['gdp_usd', 'gov_debt_usd']`)
- [ ] `current_value` is populated (not `None`) for nested composite inputs
- [ ] No "unresolved current_value" warnings for inputs that should have values

## Related Files

- [econ_graph_api/app/api/projects.py](econ_graph_api/app/api/projects.py) - Main fix location
- [econ_graph_api/app/services/computation.py](econ_graph_api/app/services/computation.py) - Cache population during compute
- [econ_graph_api/app/services/composite_root_cache.py](econ_graph_api/app/services/composite_root_cache.py) - Cache storage
- [test_nested_composite_fix.py](test_nested_composite_fix.py) - Test script
- [check_logs.sh](check_logs.sh) - Log checking script

## Future Improvements

1. **Multi-level Nesting**: This fix handles one level of nesting. For deeper nesting (composite → composite → composite), the recursive logic should work, but it needs testing.

2. **Performance**: If there are many nested composites, the recursive traversal might be slow. Consider caching the flattened structure.

3. **Error Handling**: Add more explicit error messages when a nested composite node cannot be found.

4. **Unit Tests**: Add automated tests for nested composite scenarios to prevent regressions.
