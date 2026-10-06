# Conventional Commits Deep Dive

Complete guide to the Conventional Commits specification and its practical application.

## Specification

Based on [conventionalcommits.org](https://www.conventionalcommits.org/) v1.0.0

### Full Format

```
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

### Type Categories (Extended)

| Type | Purpose | When to Use | Example |
|------|---------|-------------|---------|
| **feat** | New feature | Adding new functionality for users | `feat(auth): add OAuth2 support` |
| **fix** | Bug fix | Fixing incorrect behavior | `fix(cart): prevent duplicate items` |
| **docs** | Documentation | Only documentation changes | `docs(readme): update installation steps` |
| **style** | Code style | Formatting, whitespace (no logic change) | `style(parser): fix indentation` |
| **refactor** | Code refactoring | Code change with no behavior change | `refactor(api): extract validation logic` |
| **perf** | Performance | Performance improvement | `perf(db): add index on user_id column` |
| **test** | Tests | Adding or updating tests | `test(auth): add login edge cases` |
| **build** | Build system | Build scripts, dependencies | `build(npm): upgrade to webpack 5` |
| **ci** | CI/CD | CI configuration changes | `ci(github): add automated testing workflow` |
| **chore** | Maintenance | Other changes (no src/test modification) | `chore(deps): update dependencies` |
| **revert** | Revert | Reverting previous commit | `revert: revert "feat(auth): add OAuth2"` |

### Scope Guidelines

**Good scopes** are specific but not too granular:

```bash
# ✓ GOOD: Clear, consistent scopes
feat(auth): ...        # Authentication module
fix(api): ...          # API layer
docs(contributing): ...# Specific doc file
perf(parser): ...      # Parser component

# ✗ TOO BROAD: Not helpful
feat(app): ...         # What part of app?
fix(code): ...         # Everything is code

# ✗ TOO NARROW: Too granular
feat(user-login-form): ...  # Just use "auth"
fix(cart-item-component): ...# Just use "cart"
```

**Scope patterns by project type:**

```bash
# Frontend projects
feat(ui): ...          # UI components
feat(store): ...       # State management
feat(router): ...      # Routing
fix(api-client): ...   # API integration

# Backend projects
feat(api): ...         # API endpoints
feat(db): ...          # Database
feat(auth): ...        # Authentication
fix(middleware): ...   # Middleware

# Full-stack projects
feat(client): ...      # Client-side
feat(server): ...      # Server-side
feat(shared): ...      # Shared code
```

### Breaking Changes

Two ways to indicate breaking changes:

#### Method 1: Use `!` after type/scope

```bash
feat(api)!: change user endpoint response format

BREAKING CHANGE: User API now returns camelCase instead of snake_case.

Before:
{
  "user_name": "john",
  "created_at": "2024-01-01"
}

After:
{
  "userName": "john",
  "createdAt": "2024-01-01"
}

Migration: Update all API consumers to handle new format.
```

#### Method 2: Use `BREAKING CHANGE:` footer

```bash
refactor(auth): redesign token validation

BREAKING CHANGE: JWT tokens now require 'iss' claim.

All existing tokens will be invalid after this change.
Users will need to re-authenticate.
```

### Body Guidelines

**When to include a body:**

```bash
# ✓ NEEDS BODY: Complex change requiring explanation
feat(cache): implement Redis caching layer

Previous implementation used in-memory cache which didn't scale
across multiple instances. Redis provides distributed caching with
configurable TTL and automatic eviction.

Configuration requires REDIS_URL environment variable.
Falls back to in-memory cache if Redis is unavailable.

# ✓ NO BODY NEEDED: Self-explanatory
fix(typo): correct variable name in auth module

# ✓ NO BODY NEEDED: Simple addition
docs(readme): add badge for build status
```

**Body formatting:**

```bash
# ✓ GOOD: Well-structured body
feat(search): implement full-text search

Motivation:
- Users reported difficulty finding products
- Current keyword search too restrictive

Implementation:
- PostgreSQL full-text search with tsvector
- Indexed on product name, description, tags
- Supports stemming and ranking

Performance:
- Search queries average 50ms
- Index size: ~100MB for 1M products

Limitations:
- English language only currently
- Requires PostgreSQL 12+

# ✗ BAD: Unstructured rambling
feat(search): implement full-text search

I added search because users wanted it and I used postgres
because it has fts and it's pretty fast and works well...
```

### Footer Examples

```bash
# Issue references
Fixes #123
Closes #456, #789
Refs #234

# Breaking changes
BREAKING CHANGE: removed support for Node 14

# Co-authors
Co-authored-by: Jane Doe <jane@example.com>
Co-authored-by: John Smith <john@example.com>

# Multiple footers
feat(api): add GraphQL endpoint

BREAKING CHANGE: REST API endpoints deprecated
Closes #567
Refs #234, #345
```

## Real-World Examples

### Example 1: Simple Feature

```bash
feat(cart): add quantity selector

Allows users to change item quantity directly in cart view.
Updates total price in real-time using client-side calculation.

Closes #234
```

**Why this is good:**
- Clear type (feat)
- Specific scope (cart)
- Concise subject (what was added)
- Body explains behavior
- Links to issue

### Example 2: Bug Fix with Investigation

```bash
fix(auth): prevent token leakage in error responses

Error responses were including full JWT token in error.details field,
exposing tokens in client-side error logs and monitoring systems.

Root cause: Generic error handler was serializing entire request
object, which included Authorization header.

Solution: Sanitize error objects before serialization, removing
sensitive headers (Authorization, Cookie, X-API-Key).

Fixes #789 (security vulnerability)
```

**Why this is good:**
- Explains what was wrong
- Explains root cause
- Explains solution
- Security context clear

### Example 3: Performance Optimization

```bash
perf(db): add composite index on user queries

Query performance for user search degraded as user table grew to 10M+
rows. Most queries filter by (status, created_at) combination.

Added composite index: idx_users_status_created_at

Results:
- Query time: 2500ms → 15ms (166x improvement)
- Index size: 450MB
- Index creation time: ~5 minutes

Trade-off: Slightly slower writes (negligible impact given read-heavy
workload). Recommend monitoring index bloat over time.
```

**Why this is good:**
- Quantifies improvement
- Explains trade-offs
- Provides monitoring guidance

### Example 4: Refactoring

```bash
refactor(parser): extract token validation into separate module

No behavior change. Moved token validation logic from parser.js
(800 lines) into dedicated validators/ directory.

Benefits:
- Improved testability (validators can be tested in isolation)
- Better code organization (SRP principle)
- Easier to add new token types

Files changed:
- src/parser.js (removed 200 lines)
- src/validators/token-validator.js (new, 150 lines)
- src/validators/index.js (new, 20 lines)
```

**Why this is good:**
- Explicitly states "no behavior change"
- Explains benefits
- Shows file structure changes

### Example 5: Documentation

```bash
docs(api): add examples for all authentication endpoints

Added request/response examples, error codes, and authentication
flow diagrams to API documentation.

Includes:
- Login endpoint examples (success, invalid credentials, rate limit)
- Logout endpoint examples
- Token refresh examples
- Common error scenarios

Based on feedback from issue #456 (docs unclear for new developers).
```

### Example 6: Breaking Change

```bash
feat(api)!: redesign error response format

BREAKING CHANGE: Error responses now use RFC 7807 Problem Details.

Before:
{
  "error": "Invalid input",
  "code": 400
}

After:
{
  "type": "https://api.example.com/errors/invalid-input",
  "title": "Invalid Input",
  "status": 400,
  "detail": "The 'email' field must be a valid email address",
  "instance": "/users/123"
}

Migration:
1. Update all API clients to parse new error format
2. Error handling middleware needs updating
3. See migration guide: docs/migration/v3-errors.md

Rationale: Standardized format improves API consistency and provides
better debugging information for developers.

Closes #345
```

## Anti-Patterns

### Anti-Pattern 1: Vague Messages

```bash
# ✗ BAD
git commit -m "update"
git commit -m "fix"
git commit -m "changes"
git commit -m "wip"
git commit -m "stuff"

# ✓ GOOD
git commit -m "feat(auth): add password reset flow"
git commit -m "fix(cart): prevent duplicate items on double-click"
git commit -m "refactor(parser): simplify regex patterns"
git commit -m "docs(api): document rate limiting behavior"
```

### Anti-Pattern 2: Mixing Multiple Types

```bash
# ✗ BAD: Multiple changes in one commit
git commit -m "feat(auth): add login, fix logout bug, update docs"

# ✓ GOOD: Separate commits
git commit -m "feat(auth): add OAuth login support"
git commit -m "fix(auth): prevent session leak on logout"
git commit -m "docs(auth): document OAuth configuration"
```

### Anti-Pattern 3: Implementation Details in Subject

```bash
# ✗ BAD: Too much implementation detail
git commit -m "feat(db): add UserRepository class with findById, findAll, and save methods using TypeORM decorators"

# ✓ GOOD: What, not how
git commit -m "feat(db): add user repository layer"

# Details go in body:
feat(db): add user repository layer

Implements data access layer for user operations using TypeORM.
Provides findById, findAll, create, update, and delete methods.
Handles connection pooling and query optimization.
```

### Anti-Pattern 4: Missing Context

```bash
# ✗ BAD: No context
git commit -m "fix(api): change timeout to 30s"

# ✓ GOOD: Explains why
git commit -m "fix(api): increase timeout to 30s for large exports

Previous 10s timeout caused failures for export operations with
>10k records. Analyzed metrics showing p95 export time is 25s.

Set to 30s to accommodate p99 while preventing indefinite hangs.
Added timeout monitoring to alert if p95 exceeds 20s.

Fixes #567"
```

### Anti-Pattern 5: Jokes or Informal Language

```bash
# ✗ BAD: Unprofessional
git commit -m "fix(auth): oops, forgot to hash passwords lol"
git commit -m "feat(ui): made it look less ugly"
git commit -m "refactor(code): this code was garbage"

# ✓ GOOD: Professional
git commit -m "fix(auth): add password hashing before storage"
git commit -m "feat(ui): redesign dashboard layout"
git commit -m "refactor(parser): simplify control flow"
```

## Commit Message Template

Create `.gitmessage` template:

```bash
# ~/.gitmessage
# <type>(<scope>): <subject>
#
# <body>
#
# <footer>

# Type: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
# Scope: Component/module affected (optional)
# Subject: Imperative, no period, max 50 chars
#
# Body: Explain what and why (not how). Wrap at 72 chars.
#
# Footer: Issue references, breaking changes
#   Fixes #123
#   BREAKING CHANGE: description
```

Configure Git to use it:

```bash
git config --global commit.template ~/.gitmessage
```

## Tools and Validation

### Commitlint Configuration

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'subject-max-length': [2, 'always', 50],
    'body-max-line-length': [2, 'always', 72],
  },
};
```

### Git Hooks for Validation

```bash
# .git/hooks/commit-msg
#!/bin/sh

# Validate commit message format
commit_msg=$(cat "$1")

# Check for conventional commits format
if ! echo "$commit_msg" | grep -qE '^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?: .+'; then
    echo "Error: Commit message must follow Conventional Commits format"
    echo "Example: feat(auth): add login endpoint"
    exit 1
fi

# Check subject line length
subject=$(echo "$commit_msg" | head -n1)
if [ ${#subject} -gt 72 ]; then
    echo "Error: Subject line too long (max 72 characters)"
    exit 1
fi
```

## Changelog Generation

Conventional commits enable automatic changelog generation:

```bash
# Using standard-version
npx standard-version

# Generates CHANGELOG.md:
## [2.1.0] - 2024-01-15

### Features
- **auth**: add OAuth2 support (#234)
- **api**: add rate limiting middleware (#345)

### Bug Fixes
- **cart**: prevent duplicate items (#456)
- **db**: fix connection pool leak (#567)

### BREAKING CHANGES
- **api**: error response format changed to RFC 7807
```

## Summary

**Conventional Commits provides:**
1. ✅ Standardized commit history
2. ✅ Automatic changelog generation
3. ✅ Easier code review
4. ✅ Better project navigation
5. ✅ Semantic versioning automation

**Key Rules:**
- Use standard types (feat, fix, docs, etc.)
- Keep subject line under 50 characters
- Use imperative mood ("add" not "added")
- Explain why in the body
- Reference issues in footer
- Mark breaking changes with `!` or `BREAKING CHANGE:`
