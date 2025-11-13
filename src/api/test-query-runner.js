import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: './env.txt' });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

// Test SQL Query Runner endpoints
async function testQueryRunner() {
  console.log('\n=== Testing SQL Query Runner ===\n');
  
  try {
    // Step 1: Login as admin to get token
    console.log('1. Logging in as admin...');
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
      }),
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      console.error('Login failed:', errorData);
      console.log('\nNote: Make sure admin credentials are correct in env.txt');
      console.log('   ADMIN_USERNAME and ADMIN_PASSWORD should be set');
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✓ Login successful\n');

    // Step 2: Test schema endpoint
    console.log('2. Testing schema endpoint...');
    const schemaResponse = await fetch(`${API_BASE_URL}/api/admin/database/schema`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (schemaResponse.ok) {
      const schemaData = await schemaResponse.json();
      console.log('✓ Schema fetched successfully');
      console.log(`   Table: ${schemaData.tableName}`);
      console.log(`   Columns: ${schemaData.columns.length}`);
      console.log('   Column names:', schemaData.columns.map(c => c.column_name).join(', '));
    } else {
      const errorData = await schemaResponse.json();
      console.error('✗ Schema fetch failed:', errorData);
    }
    console.log();

    // Step 3: Test SELECT query
    console.log('3. Testing SELECT query...');
    const selectQuery = "SELECT * FROM skills_standings WHERE matchType = 'VRC' LIMIT 5";
    const queryResponse = await fetch(`${API_BASE_URL}/api/admin/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: selectQuery,
        limit: 5,
      }),
    });

    if (queryResponse.ok) {
      const queryData = await queryResponse.json();
      console.log('✓ SELECT query executed successfully');
      console.log(`   Execution time: ${queryData.executionTime}`);
      console.log(`   Rows returned: ${queryData.rowCount}`);
      console.log(`   Columns: ${queryData.columns.join(', ')}`);
      if (queryData.rows && queryData.rows.length > 0) {
        console.log('   Sample row:', JSON.stringify(queryData.rows[0], null, 2));
      }
    } else {
      const errorData = await queryResponse.json();
      console.error('✗ SELECT query failed:', errorData);
    }
    console.log();

    // Step 4: Test query validation - try to query other table (should fail)
    console.log('4. Testing query validation (should fail - other table)...');
    const invalidQuery = "SELECT * FROM users LIMIT 5";
    const invalidResponse = await fetch(`${API_BASE_URL}/api/admin/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: invalidQuery,
        limit: 5,
      }),
    });

    if (!invalidResponse.ok) {
      const errorData = await invalidResponse.json();
      console.log('✓ Query validation working correctly');
      console.log(`   Error (expected): ${errorData.error}`);
    } else {
      console.error('✗ Query validation failed - should have blocked other tables!');
    }
    console.log();

    // Step 5: Test dangerous operation (should be blocked)
    console.log('5. Testing dangerous operation (should be blocked)...');
    const dangerousQuery = "DROP TABLE skills_standings";
    const dangerousResponse = await fetch(`${API_BASE_URL}/api/admin/database/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: dangerousQuery,
        confirm: 'EXECUTE',
      }),
    });

    if (!dangerousResponse.ok) {
      const errorData = await dangerousResponse.json();
      console.log('✓ Dangerous operation blocked correctly');
      console.log(`   Error (expected): ${errorData.error}`);
    } else {
      console.error('✗ Dangerous operation not blocked - security issue!');
    }
    console.log();

    // Step 6: Test COUNT query
    console.log('6. Testing COUNT query...');
    const countQuery = "SELECT COUNT(*) as total, matchType FROM skills_standings GROUP BY matchType";
    const countResponse = await fetch(`${API_BASE_URL}/api/admin/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: countQuery,
        limit: 100,
      }),
    });

    if (countResponse.ok) {
      const countData = await countResponse.json();
      console.log('✓ COUNT query executed successfully');
      console.log(`   Execution time: ${countData.executionTime}`);
      console.log(`   Rows returned: ${countData.rowCount}`);
      if (countData.rows && countData.rows.length > 0) {
        console.log('   Results:');
        countData.rows.forEach(row => {
          console.log(`     ${row.matchtype}: ${row.total} teams`);
        });
      }
    } else {
      const errorData = await countResponse.json();
      console.error('✗ COUNT query failed:', errorData);
    }
    console.log();

    // Step 7: Test DELETE query (without confirmation - should fail)
    console.log('7. Testing DELETE query without confirmation (should fail)...');
    const deleteQuery = "DELETE FROM skills_standings WHERE teamNumber = '99999Z' AND matchType = 'VRC'";
    const deleteResponse = await fetch(`${API_BASE_URL}/api/admin/database/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: deleteQuery,
        // No confirm field - should fail
      }),
    });

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      console.log('✓ DELETE query validation working correctly');
      console.log(`   Error (expected): ${errorData.error}`);
    } else {
      console.error('✗ DELETE query should require confirmation!');
    }
    console.log();

    console.log('=== Test Summary ===');
    console.log('✓ All tests completed');
    console.log('\nNote: To test DELETE/UPDATE/INSERT operations, use the admin UI at');
    console.log('   http://localhost:3001/admin/database');
    console.log('   and confirm the execution in the browser.');

  } catch (error) {
    console.error('Error during testing:', error.message);
    console.error(error.stack);
  }
}

// Run tests
testQueryRunner();

