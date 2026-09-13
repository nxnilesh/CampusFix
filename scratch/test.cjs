const http = require('http');

function request(method, path, data = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (cookie) {
      options.headers['Cookie'] = cookie;
    }
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body ? JSON.parse(body) : null
          });
        } catch(e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTest() {
  try {
    console.log("1. Registering user...");
    const regRes = await request('POST', '/api/auth/register/student', {
      email: 'testuser@campus.edu',
      password: 'Password123',
      name: 'Test Student',
      studentId: '12345',
      department: 'CSE',
      year: '3rd Year'
    });
    console.log("Register response:", regRes.status, regRes.data);
    
    if (regRes.status !== 201) {
      console.log("Registration failed, stopping.");
      return;
    }
    
    console.log("2. Logging in...");
    const loginRes = await request('POST', '/api/auth/login', {
      identifier: 'testuser@campus.edu',
      password: 'Password123',
      expectedRole: 'student'
    });
    console.log("Login response:", loginRes.status, loginRes.data);
    
    if (loginRes.status !== 200) {
      console.log("Login failed, stopping.");
      return;
    }
    
    // Extract cookie
    const setCookie = loginRes.headers['set-cookie'];
    const cookie = setCookie ? setCookie[0].split(';')[0] : null;
    
    console.log("3. Session check (refresh page)...");
    const meRes = await request('GET', '/api/auth/me', null, cookie);
    console.log("Me response:", meRes.status, meRes.data);
    
    console.log("4. Submit an issue...");
    const issueRes = await request('POST', '/api/issues', {
      title: 'Test Issue 123',
      description: 'The projector is broken',
      location: 'CSE Block',
      room: '204',
      priority: 'High',
      categoryId: 'some_id'
    }, cookie);
    console.log("Submit issue response:", issueRes.status, issueRes.data);
    
    console.log("5. Checking my issues...");
    const myIssuesRes = await request('GET', '/api/issues/my', null, cookie);
    console.log("My issues response:", myIssuesRes.status, myIssuesRes.data);
    
  } catch (err) {
    console.error("Test error:", err);
  }
}

runTest();
