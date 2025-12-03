#!/usr/bin/env python3
"""
Comprehensive Supabase Database Audit
Analyzes schema, indexes, RLS, constraints, and relationships
"""

import requests
import json
from typing import Dict, List, Any
from datetime import datetime

# Supabase Configuration
ACCESS_TOKEN = "sbp_d6447fd289e297e5c7c2c51f954a36a0a1e94641"
PROJECT_REF = "nkfimvovosdehmyyjubn"
API_BASE = f"https://api.supabase.com/v1/projects/{PROJECT_REF}"

headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Content-Type": "application/json"
}

def execute_query(sql: str) -> List[Dict[str, Any]]:
    """Execute SQL query via Supabase API"""
    url = f"{API_BASE}/database/query"
    payload = {"query": sql}

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()
        return result if isinstance(result, list) else []
    except Exception as e:
        print(f"Error executing query: {e}")
        print(f"SQL: {sql[:200]}...")
        return []

def get_all_tables() -> List[Dict[str, Any]]:
    """Get all tables in public schema"""
    sql = """
    SELECT
        schemaname,
        tablename,
        tableowner,
        hasindexes,
        hasrules,
        hastriggers
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
    """
    return execute_query(sql)

def get_table_columns(table_name: str) -> List[Dict[str, Any]]:
    """Get detailed column information for a table"""
    sql = f"""
    SELECT
        column_name,
        data_type,
        character_maximum_length,
        column_default,
        is_nullable,
        udt_name,
        is_identity,
        identity_generation
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = '{table_name}'
    ORDER BY ordinal_position;
    """
    return execute_query(sql)

def get_primary_keys(table_name: str) -> List[Dict[str, Any]]:
    """Get primary key constraints"""
    sql = f"""
    SELECT
        kcu.column_name,
        tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
    AND tc.table_name = '{table_name}'
    AND tc.constraint_type = 'PRIMARY KEY';
    """
    return execute_query(sql)

def get_foreign_keys(table_name: str) -> List[Dict[str, Any]]:
    """Get foreign key constraints"""
    sql = f"""
    SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = '{table_name}';
    """
    return execute_query(sql)

def get_check_constraints(table_name: str) -> List[Dict[str, Any]]:
    """Get check constraints"""
    sql = f"""
    SELECT
        con.conname AS constraint_name,
        pg_get_constraintdef(con.oid) AS constraint_definition
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
    AND rel.relname = '{table_name}'
    AND con.contype = 'c';
    """
    return execute_query(sql)

def get_all_indexes() -> List[Dict[str, Any]]:
    """Get all indexes in public schema"""
    sql = """
    SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
    """
    return execute_query(sql)

def get_table_indexes(table_name: str) -> List[Dict[str, Any]]:
    """Get indexes for a specific table"""
    sql = f"""
    SELECT
        indexname,
        indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = '{table_name}'
    ORDER BY indexname;
    """
    return execute_query(sql)

def get_all_views() -> List[Dict[str, Any]]:
    """Get all views in public schema"""
    sql = """
    SELECT
        schemaname,
        viewname,
        viewowner,
        definition
    FROM pg_views
    WHERE schemaname = 'public'
    ORDER BY viewname;
    """
    return execute_query(sql)

def get_all_functions() -> List[Dict[str, Any]]:
    """Get all RPC functions"""
    sql = """
    SELECT
        p.proname AS function_name,
        pg_get_function_arguments(p.oid) AS arguments,
        pg_get_functiondef(p.oid) AS definition,
        pg_get_function_result(p.oid) AS return_type,
        l.lanname AS language
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_language l ON p.prolang = l.oid
    WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    ORDER BY p.proname;
    """
    return execute_query(sql)

def get_all_triggers() -> List[Dict[str, Any]]:
    """Get all triggers"""
    sql = """
    SELECT
        trigger_schema,
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement,
        action_timing
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name;
    """
    return execute_query(sql)

def get_rls_policies(table_name: str) -> List[Dict[str, Any]]:
    """Get Row Level Security policies for a table"""
    sql = f"""
    SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = '{table_name}';
    """
    return execute_query(sql)

def get_rls_status(table_name: str) -> bool:
    """Check if RLS is enabled on a table"""
    sql = f"""
    SELECT relrowsecurity
    FROM pg_class
    JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
    WHERE nspname = 'public'
    AND relname = '{table_name}';
    """
    result = execute_query(sql)
    return result[0].get('relrowsecurity', False) if result else False

def get_all_foreign_keys() -> List[Dict[str, Any]]:
    """Get all foreign key relationships"""
    sql = """
    SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name,
        rc.update_rule,
        rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name;
    """
    return execute_query(sql)

def audit_database():
    """Main audit function"""
    print("=" * 80)
    print("SUPABASE DATABASE AUDIT - INDIGO YIELD PLATFORM")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Project: {PROJECT_REF}")
    print("=" * 80)
    print()

    # Get all tables
    print("📋 Fetching all tables...")
    tables = get_all_tables()
    print(f"Found {len(tables)} tables\n")

    audit_report = {
        "metadata": {
            "timestamp": datetime.now().isoformat(),
            "project_ref": PROJECT_REF,
            "total_tables": len(tables)
        },
        "tables": {},
        "views": [],
        "all_indexes": [],
        "all_functions": [],
        "all_triggers": [],
        "all_foreign_keys": [],
        "issues": {
            "missing_rls": [],
            "missing_primary_keys": [],
            "missing_indexes": [],
            "orphaned_relationships": [],
            "data_integrity_concerns": []
        }
    }

    # Analyze each table
    for table in tables:
        table_name = table['tablename']
        print(f"\n{'=' * 80}")
        print(f"TABLE: {table_name}")
        print('=' * 80)

        table_info = {
            "name": table_name,
            "owner": table.get('tableowner'),
            "has_indexes": table.get('hasindexes'),
            "has_triggers": table.get('hastriggers'),
            "columns": [],
            "primary_keys": [],
            "foreign_keys": [],
            "check_constraints": [],
            "indexes": [],
            "rls_enabled": False,
            "rls_policies": []
        }

        # Columns
        print("\nColumns:")
        columns = get_table_columns(table_name)
        for col in columns:
            print(f"  - {col['column_name']}: {col['data_type']}" +
                  (f"({col['character_maximum_length']})" if col['character_maximum_length'] else "") +
                  f" | Nullable: {col['is_nullable']}" +
                  (f" | Default: {col['column_default']}" if col['column_default'] else ""))
            table_info['columns'].append(col)

        # Primary Keys
        print("\nPrimary Keys:")
        pks = get_primary_keys(table_name)
        if pks:
            for pk in pks:
                print(f"  - {pk['column_name']} (constraint: {pk['constraint_name']})")
                table_info['primary_keys'].append(pk)
        else:
            print("  ⚠️  No primary key found!")
            audit_report['issues']['missing_primary_keys'].append(table_name)

        # Foreign Keys
        print("\nForeign Keys:")
        fks = get_foreign_keys(table_name)
        if fks:
            for fk in fks:
                print(f"  - {fk['column_name']} -> {fk['foreign_table_name']}.{fk['foreign_column_name']}")
                table_info['foreign_keys'].append(fk)
        else:
            print("  None")

        # Check Constraints
        print("\nCheck Constraints:")
        checks = get_check_constraints(table_name)
        if checks:
            for check in checks:
                print(f"  - {check['constraint_name']}: {check['constraint_definition']}")
                table_info['check_constraints'].append(check)
        else:
            print("  None")

        # Indexes
        print("\nIndexes:")
        indexes = get_table_indexes(table_name)
        if indexes:
            for idx in indexes:
                print(f"  - {idx['indexname']}")
                print(f"    {idx['indexdef']}")
                table_info['indexes'].append(idx)
        else:
            print("  None")

        # RLS Status
        print("\nRow Level Security:")
        rls_enabled = get_rls_status(table_name)
        table_info['rls_enabled'] = rls_enabled
        print(f"  Enabled: {rls_enabled}")

        if not rls_enabled:
            print("  ⚠️  RLS is NOT enabled on this table!")
            audit_report['issues']['missing_rls'].append(table_name)

        # RLS Policies
        policies = get_rls_policies(table_name)
        if policies:
            print(f"  Policies ({len(policies)}):")
            for policy in policies:
                print(f"    - {policy['policyname']} ({policy['cmd']}) for roles: {policy['roles']}")
                table_info['rls_policies'].append(policy)
        else:
            if rls_enabled:
                print("  ⚠️  RLS enabled but no policies defined!")

        audit_report['tables'][table_name] = table_info

    # Get all views
    print(f"\n\n{'=' * 80}")
    print("VIEWS")
    print('=' * 80)
    views = get_all_views()
    print(f"Found {len(views)} views\n")
    for view in views:
        print(f"\nVIEW: {view['viewname']}")
        print(f"Definition:\n{view['definition'][:500]}...")
        audit_report['views'].append(view)

    # Get all indexes
    print(f"\n\n{'=' * 80}")
    print("ALL INDEXES")
    print('=' * 80)
    all_indexes = get_all_indexes()
    print(f"Found {len(all_indexes)} indexes\n")
    for idx in all_indexes:
        print(f"{idx['tablename']}.{idx['indexname']}")
        audit_report['all_indexes'].append(idx)

    # Get all functions
    print(f"\n\n{'=' * 80}")
    print("RPC FUNCTIONS")
    print('=' * 80)
    functions = get_all_functions()
    print(f"Found {len(functions)} functions\n")
    for func in functions:
        print(f"\nFUNCTION: {func['function_name']}({func['arguments']})")
        print(f"Returns: {func['return_type']}")
        print(f"Language: {func['language']}")
        audit_report['all_functions'].append(func)

    # Get all triggers
    print(f"\n\n{'=' * 80}")
    print("TRIGGERS")
    print('=' * 80)
    triggers = get_all_triggers()
    print(f"Found {len(triggers)} triggers\n")
    for trigger in triggers:
        print(f"\nTRIGGER: {trigger['trigger_name']}")
        print(f"Table: {trigger['event_object_table']}")
        print(f"Event: {trigger['action_timing']} {trigger['event_manipulation']}")
        print(f"Action: {trigger['action_statement']}")
        audit_report['all_triggers'].append(trigger)

    # Get all foreign keys
    print(f"\n\n{'=' * 80}")
    print("FOREIGN KEY RELATIONSHIPS")
    print('=' * 80)
    all_fks = get_all_foreign_keys()
    print(f"Found {len(all_fks)} foreign key relationships\n")
    for fk in all_fks:
        print(f"{fk['table_name']}.{fk['column_name']} -> " +
              f"{fk['foreign_table_name']}.{fk['foreign_column_name']}" +
              f" (ON UPDATE: {fk['update_rule']}, ON DELETE: {fk['delete_rule']})")
        audit_report['all_foreign_keys'].append(fk)

    # Summary of issues
    print(f"\n\n{'=' * 80}")
    print("AUDIT SUMMARY - ISSUES FOUND")
    print('=' * 80)

    print(f"\n⚠️  Tables without RLS ({len(audit_report['issues']['missing_rls'])}):")
    for table in audit_report['issues']['missing_rls']:
        print(f"  - {table}")

    print(f"\n⚠️  Tables without Primary Keys ({len(audit_report['issues']['missing_primary_keys'])}):")
    for table in audit_report['issues']['missing_primary_keys']:
        print(f"  - {table}")

    # Save to JSON
    output_file = "/Users/mama/indigo-yield-platform-v01/database_audit_report.json"
    with open(output_file, 'w') as f:
        json.dump(audit_report, f, indent=2, default=str)

    print(f"\n\n✅ Full audit report saved to: {output_file}")
    print("\n" + "=" * 80)

    return audit_report

if __name__ == "__main__":
    audit_database()
