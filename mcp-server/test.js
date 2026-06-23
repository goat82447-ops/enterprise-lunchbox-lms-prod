#!/usr/bin/env node
/**
 * Test client for MCP Project Context Server
 */

const { spawn } = require('child_process');
const path = require('path');

async function testMCP() {
  return new Promise((resolve, reject) => {
    const server = spawn('node', [path.join(__dirname, 'server.js')]);
    const responses = [];

    server.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        try {
          const res = JSON.parse(line);
          responses.push(res);
        } catch (err) {
          // Ignore parse errors
        }
      }
    });

    server.stderr.on('data', (data) => {
      console.log('[MCP]', data.toString());
    });

    // Send test requests
    const requests = [
      { method: 'project:summary', params: {} },
      { method: 'sources:list', params: { type: 'frontend-ts' } },
      { method: 'healing:context', params: {} },
      { method: 'project:search', params: { keyword: 'login' } },
      {
        method: 'issue:analyze',
        params: {
          title: 'Order API returns 500 when coupon is missing',
          body: 'Backend microservice endpoint should handle optional coupon code safely',
          surface: 'backend_node',
        }
      },
    ];

    for (const req of requests) {
      server.stdin.write(JSON.stringify(req) + '\n');
    }

    // Wait for responses
    setTimeout(() => {
      server.kill();
      console.log('\n=== Test Results ===');
      responses.forEach(res => {
        if (res.success) {
          console.log(`✓ ${JSON.stringify(res).slice(0, 80)}...`);
        } else {
          console.log(`✗ Error: ${res.error}`);
        }
      });
      resolve();
    }, 2000);
  });
}

testMCP().catch(console.error);
