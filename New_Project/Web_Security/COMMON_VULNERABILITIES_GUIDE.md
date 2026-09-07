# Common Web Vulnerabilities Guide

## Introduction

This guide provides practical information on identifying, exploiting, and mitigating common web vulnerabilities. It is designed for educational purposes to help security professionals understand how these vulnerabilities work and how to protect against them.

## 1. Cross-Site Scripting (XSS)

### Description
XSS vulnerabilities allow attackers to inject malicious client-side scripts into web pages viewed by other users.

### Types
- **Reflected XSS**: Malicious script comes from the current HTTP request
- **Stored XSS**: Malicious script is stored on the target server
- **DOM-based XSS**: Vulnerability exists in client-side code

### Detection
```javascript
// Test payloads
<script>alert('XSS')</script>
<img src="x" onerror="alert('XSS')">
<div onmouseover="alert('XSS')">
```

### Exploitation Example
1. Identify input fields that reflect user input
2. Test with benign payloads (e.g., `<b>test</b>`)
3. If successful, try more complex payloads
4. Analyze the context of injection for proper encoding

### Mitigation
- Input validation and sanitization
- Output encoding (HTML, JavaScript, CSS, URL)
- Content Security Policy (CSP)
- Use frameworks that automatically escape output
- X-XSS-Protection header

## 2. SQL Injection

### Description
SQL Injection allows attackers to interfere with database queries, potentially leading to unauthorized data access or manipulation.

### Types
- **Error-based**: Extract data through error messages
- **Union-based**: Leverage UNION operator to combine results
- **Blind**: No direct output (boolean-based or time-based)
- **Out-of-band**: Extract data through alternative channels

### Detection
```sql
-- Test payloads
' OR '1'='1
' OR 1=1 --
" OR 1=1 --
1' ORDER BY 1--+
1' UNION SELECT 1,2,3--+
```

### Exploitation Example
1. Identify injectable parameters
2. Determine database type
3. Map out database structure
4. Extract sensitive information

### Mitigation
- Parameterized queries/prepared statements
- ORM frameworks
- Input validation
- Least privilege database accounts
- WAF implementation

## 3. Cross-Site Request Forgery (CSRF)

### Description
CSRF tricks users into performing unwanted actions on a site where they're authenticated.

### Detection
- Check if sensitive actions lack unpredictable tokens
- Verify if the application relies solely on cookies for authentication
- Test if the application accepts requests from arbitrary origins

### Exploitation Example
```html
<!-- Example CSRF payload -->
<form action="https://vulnerable-site.com/change_password" method="POST" id="csrf-form">
  <input type="hidden" name="new_password" value="hacked">
</form>
<script>document.getElementById("csrf-form").submit();</script>
```

### Mitigation
- CSRF tokens
- SameSite cookie attribute
- Custom request headers
- Verify Origin/Referer headers
- Require re-authentication for sensitive actions

## 4. Server-Side Request Forgery (SSRF)

### Description
SSRF allows attackers to induce the server to make requests to unintended locations.

### Detection
- Identify parameters that accept URLs or file paths
- Test with internal IP addresses and localhost
- Use alternative IP representations (decimal, octal, hex)
- Try accessing cloud metadata services

### Exploitation Example
```
# Original URL
https://example.com/fetch?url=https://api.example.com/data

# SSRF attempts
https://example.com/fetch?url=http://localhost/admin
https://example.com/fetch?url=http://169.254.169.254/latest/meta-data/ (AWS)
https://example.com/fetch?url=http://127.0.0.1:25 (SMTP)
```

### Mitigation
- Whitelist allowed destinations
- Disable unnecessary protocols
- Use a dedicated service for remote resource access
- Implement network-level protections
- Validate and sanitize user input

## 5. Insecure Direct Object References (IDOR)

### Description
IDOR occurs when an application exposes a reference to an internal implementation object, allowing attackers to manipulate these references to access unauthorized data.

### Detection
- Identify endpoints with object references (IDs, filenames)
- Test access to resources belonging to other users
- Modify numeric IDs (increment/decrement)
- Try different HTTP methods

### Exploitation Example
```
# Original request
GET /api/users/123/profile

# IDOR attempts
GET /api/users/124/profile
GET /api/users/admin/profile
```

### Mitigation
- Implement proper access controls
- Use indirect references (mapping tables)
- Verify authorization for each access
- Avoid exposing internal identifiers

## 6. XML External Entity (XXE) Injection

### Description
XXE allows attackers to interfere with XML processing, potentially leading to file disclosure, SSRF, or denial of service.

### Detection
```xml
<!-- Test payload -->
<?xml version="1.0" encoding="ISO-8859-1"?>
<!DOCTYPE foo [
<!ELEMENT foo ANY >
<!ENTITY xxe SYSTEM "file:///etc/passwd" >]>
<foo>&xxe;</foo>
```

### Exploitation Example
1. Identify XML input points
2. Test with external entity declarations
3. Attempt to read local files or perform SSRF

### Mitigation
- Disable DTDs (Document Type Definitions)
- Use less complex data formats (JSON)
- Patch XML parsers
- Implement server-side input validation

## 7. Broken Authentication

### Description
Weaknesses in authentication mechanisms that allow attackers to compromise passwords, keys, or session tokens.

### Detection
- Test for weak password policies
- Check for brute force protection
- Verify session management (timeout, invalidation)
- Test credential recovery mechanisms

### Exploitation Example
- Password brute forcing
- Session fixation attacks
- Credential stuffing
- Exploiting "remember me" functionality

### Mitigation
- Implement multi-factor authentication
- Use strong password policies
- Secure session management
- Rate limiting and account lockout
- HTTPS for all authentication

## 8. Security Misconfiguration

### Description
Improper configuration of web servers, applications, databases, and frameworks leading to security vulnerabilities.

### Detection
- Check for default credentials
- Look for unnecessary features/ports
- Test for verbose error messages
- Scan for outdated software

### Exploitation Example
- Accessing admin interfaces with default credentials
- Exploiting unnecessary services
- Gathering information from error messages

### Mitigation
- Implement secure configuration baselines
- Remove unnecessary features
- Patch systems regularly
- Conduct security scans and audits
- Use minimal privilege principles

## 9. Insecure Deserialization

### Description
Processing untrusted serialized data, potentially leading to remote code execution.

### Detection
- Identify serialized objects in requests
- Look for serialization markers (Java, PHP, .NET)
- Test with modified serialized objects

### Exploitation Example
```php
// PHP example
O:8:"UserInfo":3:{s:4:"name":s:6:"Robert";s:3:"age":i:21;s:4:"role":s:5:"admin";}
```

### Mitigation
- Avoid deserializing untrusted data
- Implement integrity checks
- Run deserialization in low-privilege environments
- Type constraints before deserialization

## 10. File Upload Vulnerabilities

### Description
Insecure file upload functionality that allows attackers to upload malicious files.

### Detection
- Test uploading files with dangerous extensions (.php, .jsp)
- Try bypassing client-side validation
- Test content-type manipulation
- Attempt double extensions or null bytes

### Exploitation Example
```
# Original filename
malicious.php

# Bypass attempts
malicious.php.jpg
malicious.php%00.jpg
malicious.pHp
malicious.php.....  (trailing dots)
```

### Mitigation
- Validate file extensions and content-type
- Use content verification
- Store uploaded files outside web root
- Use a separate domain for user content
- Implement proper permissions

## Practical Exercises

To practice identifying and exploiting these vulnerabilities in a safe environment, use the vulnerable applications provided in the Web_Security directory:

1. **DVWA (Damn Vulnerable Web Application)**
   - Contains examples of most vulnerabilities listed
   - Configurable difficulty levels

2. **OWASP Juice Shop**
   - Modern, JavaScript-based vulnerable application
   - Realistic e-commerce scenarios

3. **WebGoat**
   - Structured lessons on web security
   - Guided exercises with solutions

4. **Custom Vulnerable PHP Application**
   - Simple application with intentional vulnerabilities
   - Good for beginners to understand core concepts

## Conclusion

Understanding how vulnerabilities work is essential for building secure applications. Always practice in designated environments and never attempt to exploit vulnerabilities without explicit permission.

Remember that the knowledge in this guide should be used ethically and responsibly to improve security, not to cause harm.