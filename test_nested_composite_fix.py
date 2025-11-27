#!/usr/bin/env python3
"""
Test script to verify the nested composite fix for exposed-roots.
This script tests that gdp_usd and gov_debt_usd values are correctly resolved
when they are inputs of a nested composite (debt_gdp_1).
"""

import requests
import json
import sys

API_BASE = "http://localhost:8000"

def test_exposed_roots(project_id: str):
    """Test the exposed-roots endpoint for nested composites."""
    print(f"\n{'='*80}")
    print(f"Testing /projects/{project_id}/exposed-roots")
    print(f"{'='*80}\n")

    # Call exposed-roots
    response = requests.get(f"{API_BASE}/projects/{project_id}/exposed-roots")

    if response.status_code != 200:
        print(f"❌ ERROR: Got status {response.status_code}")
        print(response.text)
        return False

    data = response.json()
    composite_roots = data.get("composite_roots", [])

    print(f"Found {len(composite_roots)} composite roots\n")

    # Look for gdp_usd and gov_debt_usd entries
    gdp_entry = None
    debt_entry = None

    for root in composite_roots:
        internal_id = root.get("internal_id", "")
        raw_id = root.get("raw_internal_id", "")

        if "gdp_usd" in internal_id or "gdp_usd" in raw_id:
            gdp_entry = root
        if "gov_debt_usd" in internal_id or "gov_debt_usd" in raw_id:
            debt_entry = root

    print("\n" + "="*80)
    print("RESULTS")
    print("="*80 + "\n")

    success = True

    # Check gdp_usd
    if gdp_entry:
        print("✓ Found gdp_usd entry:")
        print(f"  - internal_id: {gdp_entry.get('internal_id')}")
        print(f"  - raw_internal_id: {gdp_entry.get('raw_internal_id')}")
        print(f"  - current_value: {gdp_entry.get('current_value')}")
        print(f"  - composite_instance_path: {gdp_entry.get('composite_instance_path')}")
        print(f"  - linked_node_instance_id: {gdp_entry.get('linked_node_instance_id')}")

        if gdp_entry.get('current_value') is None:
            print("  ❌ current_value is None (PROBLEM!)")
            success = False
        else:
            print("  ✓ current_value is set")
    else:
        print("❌ gdp_usd entry NOT FOUND")
        success = False

    print()

    # Check gov_debt_usd
    if debt_entry:
        print("✓ Found gov_debt_usd entry:")
        print(f"  - internal_id: {debt_entry.get('internal_id')}")
        print(f"  - raw_internal_id: {debt_entry.get('raw_internal_id')}")
        print(f"  - current_value: {debt_entry.get('current_value')}")
        print(f"  - composite_instance_path: {debt_entry.get('composite_instance_path')}")
        print(f"  - linked_node_instance_id: {debt_entry.get('linked_node_instance_id')}")

        if debt_entry.get('current_value') is None:
            print("  ❌ current_value is None (PROBLEM!)")
            success = False
        else:
            print("  ✓ current_value is set")
    else:
        print("❌ gov_debt_usd entry NOT FOUND")
        success = False

    print("\n" + "="*80)
    if success:
        print("✅ TEST PASSED: All nested composite inputs have values")
    else:
        print("❌ TEST FAILED: Some nested composite inputs are missing values")
    print("="*80 + "\n")

    return success


def main():
    if len(sys.argv) < 2:
        print("Usage: python test_nested_composite_fix.py <project_id>")
        sys.exit(1)

    project_id = sys.argv[1]

    print(f"\nTesting nested composite fix for project: {project_id}")

    # First, trigger compute_all to ensure values are in cache
    print(f"\n{'='*80}")
    print(f"Step 1: Triggering compute_all to populate cache")
    print(f"{'='*80}\n")

    response = requests.post(f"{API_BASE}/projects/{project_id}/compute-all")
    if response.status_code != 200:
        print(f"❌ compute_all failed with status {response.status_code}")
        print(response.text)
        sys.exit(1)

    print("✓ compute_all completed successfully\n")

    # Now test exposed-roots
    success = test_exposed_roots(project_id)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
