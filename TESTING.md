# Testing Guide

## Backend Testing (Python/pytest)

### Test Structure

```
backend/tests/
├── conftest.py          # Shared fixtures
├── test_auth.py         # Authentication tests
├── test_users.py        # User management tests
└── test_activities.py   # Activity tests
```

### Running Tests

#### Run All Tests
```bash
cd backend
pytest -v
```

#### Run Specific Test File
```bash
pytest tests/test_auth.py -v
```

#### Run Specific Test
```bash
pytest tests/test_auth.py::TestAuth::test_login_success -v
```

#### Run with Coverage
```bash
pytest --cov=app tests/ --cov-report=html
```

#### Run Tests in Watch Mode
```bash
pytest-watch tests/
```

### Test Coverage

Current test coverage includes:

#### Authentication Tests (`test_auth.py`)
- ✅ User registration with validation
- ✅ Login with valid/invalid credentials
- ✅ Token verification
- ✅ Token refresh
- ✅ Duplicate username/email handling
- ✅ Password validation
- ✅ Disabled user login prevention

#### User Management Tests (`test_users.py`)
- ✅ Get own user profile
- ✅ Update user profile
- ✅ Change password
- ✅ List users (admin only)
- ✅ Disable/enable users (admin only)
- ✅ Promote/demote users (admin only)
- ✅ Permission enforcement

#### Activity Tests (`test_activities.py`)
- ✅ Create activities
- ✅ Read activities
- ✅ Update activities
- ✅ Delete activities
- ✅ Get daily statistics
- ✅ Permission enforcement
- ✅ Activity filtering by user

### Test Fixtures

Available fixtures in `conftest.py`:

```python
@pytest.fixture
def app()              # Flask app instance
def client(app)        # Test client
def test_user(app)     # Regular test user
def test_admin(app)    # Admin test user
def auth_token(client, test_user)    # Auth token for user
def admin_token(client, test_admin)  # Auth token for admin
```

### Example Test

```python
def test_login_success(self, client, test_user):
    """Test successful login"""
    response = client.post('/api/auth/login', json={
        'username': 'testuser',
        'password': 'password123'
    })
    
    assert response.status_code == 200
    data = response.get_json()
    assert 'token' in data
```

## Frontend Testing (Angular/Jasmine)

### Setup

Install testing dependencies:
```bash
npm install --save-dev @angular/core @angular/common @angular/forms jasmine karma karma-jasmine karma-chrome-launcher
```

### Test Structure

Tests would be located alongside components:

```
src/app/
├── services/
│   ├── auth.service.ts
│   ├── auth.service.spec.ts    # Auth service tests
│   ├── theme.service.ts
│   └── theme.service.spec.ts   # Theme service tests
├── login/
│   ├── login.component.ts
│   └── login.component.spec.ts # Login component tests
└── register/
    ├── register.component.ts
    └── register.component.spec.ts # Register component tests
```

### Running Tests

#### Run All Tests
```bash
npm test
```

#### Run Tests with Coverage
```bash
npm test -- --code-coverage
```

#### Run Tests in CI Mode (single run)
```bash
npm test -- --watch=false
```

#### Run Specific Test File
```bash
npm test -- --include='**/auth.service.spec.ts'
```

### Example Angular Test

```typescript
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should login successfully', (done) => {
    const mockResponse = { token: 'test-token', user: { id: 1 } };
    
    service.login('testuser', 'password123').subscribe(response => {
      expect(response.token).toBe('test-token');
      done();
    });

    const req = httpMock.expectOne('http://localhost:5000/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });
});
```

### Testing Best Practices

1. **Unit Tests**: Test individual services, components, and utilities
2. **Integration Tests**: Test interaction between components and services
3. **E2E Tests**: Test complete user workflows (use Cypress or Protractor)
4. **Test Coverage**: Aim for >80% code coverage
5. **Mock External Dependencies**: Use HttpClientTestingModule for HTTP calls

## Integration Testing

### Backend-Frontend Integration

Test the complete flow from frontend to backend:

```bash
# Terminal 1: Start backend
cd backend
python run.py

# Terminal 2: Start frontend
npm start

# Terminal 3: Run end-to-end tests
npm run e2e
```

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: 3.11
      - run: cd backend && pip install -r requirements.txt
      - run: cd backend && pytest

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 18
      - run: npm install
      - run: npm run test -- --watch=false
```

## Test Commands Summary

### Backend
```bash
pytest                          # Run all tests
pytest -v                       # Verbose output
pytest --cov=app               # With coverage
pytest tests/test_auth.py      # Specific file
pytest -k "test_login"         # Filter by name
```

### Frontend
```bash
npm test                           # Run tests
npm test -- --watch=false         # Single run
npm test -- --code-coverage       # With coverage
ng test --include='**/*.spec.ts'  # Specific tests
```

## Debugging Tests

### Backend
```bash
pytest -v -s              # Show print statements
pytest --pdb             # Drop to debugger on failure
pytest -x               # Stop on first failure
```

### Frontend
```bash
# Add to test
fit('should do something', () => {
  // Only this test runs
});

// Use browser debugging
fit('should...', () => {
  debugger;
  expect(true).toBe(true);
});
```

## Code Coverage Goals

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Adding New Tests

When adding features:

1. Write test first (TDD)
2. Make test fail
3. Write minimum code to pass
4. Refactor
5. Verify coverage

Example:

```python
# test_auth.py - Add new test
def test_register_with_weak_password(self, client):
    """New test"""
    response = client.post('/api/auth/register', json={
        'username': 'user',
        'email': 'user@test.com',
        'password': '123'
    })
    assert response.status_code == 400
```

Then implement the feature to pass the test.

## Resources

- [pytest Documentation](https://docs.pytest.org/)
- [Angular Testing Guide](https://angular.io/guide/testing)
- [Jasmine Documentation](https://jasmine.github.io/)
