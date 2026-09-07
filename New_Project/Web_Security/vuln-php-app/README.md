# Vulnerable PHP Application

## Overview
This is a deliberately vulnerable PHP application designed for educational purposes. It contains various common web security vulnerabilities to help learn about web application security testing and exploitation techniques.

## Vulnerabilities Included

1. **Cross-Site Scripting (XSS)**
   - Reflected XSS via URL parameters
   - No output encoding/escaping

2. **SQL Injection**
   - Authentication bypass
   - Direct inclusion of user input in SQL queries

3. **Command Injection**
   - Unsanitized user input passed to system commands
   - Ping functionality vulnerable to command chaining

4. **Cross-Site Request Forgery (CSRF)**
   - No CSRF tokens in forms
   - Password change functionality vulnerable

5. **Insecure File Upload**
   - No validation of file types
   - Potential for uploading malicious files

6. **Local File Inclusion (LFI)**
   - Unsanitized file path inclusion
   - Directory traversal possible

## Setup Instructions

1. This application is designed to run in a Docker container using the provided Dockerfile
2. It can be launched using the docker-compose.yml file in the parent directory
3. **IMPORTANT**: This application should ONLY be run in isolated, controlled environments

## Learning Exercises

1. **XSS Challenge**:
   - Try to execute JavaScript through the message parameter
   - Create a payload that steals cookies

2. **SQL Injection Challenge**:
   - Bypass the login without knowing credentials
   - Extract database information

3. **Command Injection Challenge**:
   - Execute system commands through the ping functionality
   - Access sensitive files

4. **CSRF Challenge**:
   - Create a malicious page that changes a user's password when visited

5. **File Upload Challenge**:
   - Upload a PHP web shell
   - Execute commands through the uploaded file

6. **LFI Challenge**:
   - Access system files outside the web root
   - Include malicious PHP code

## Security Warning

This application is intentionally vulnerable and should NEVER be deployed in a production environment or exposed to the public internet. It is designed solely for educational purposes in a controlled environment.