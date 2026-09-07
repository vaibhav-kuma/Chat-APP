# Web Vulnerability Lab Setup Guide

## Overview
This guide will help you set up a local web vulnerability testing environment using Docker. The environment includes several deliberately vulnerable web applications for practicing security testing techniques.

## Prerequisites
- Docker and Docker Compose installed on your system
- Basic understanding of web technologies (HTML, CSS, JavaScript, PHP)
- Basic knowledge of Docker concepts

## Included Applications

1. **DVWA (Damn Vulnerable Web Application)**
   - A PHP/MySQL web application with various vulnerabilities
   - Accessible at: http://localhost:8080
   - Default credentials: admin/password

2. **OWASP Juice Shop**
   - A modern vulnerable web application with a complete shopping cart flow
   - Accessible at: http://localhost:3000
   - No default credentials (part of the challenges)

3. **WebGoat**
   - An interactive security training application
   - Accessible at: http://localhost:8081/WebGoat
   - Register your own account on first use

4. **Custom Vulnerable PHP Application**
   - A simple PHP application with common vulnerabilities
   - Accessible at: http://localhost:8082
   - No authentication required

## Setup Instructions

1. Open a terminal/command prompt in this directory

2. Start the environment:
   ```
   docker-compose up -d
   ```

3. Verify all containers are running:
   ```
   docker-compose ps
   ```

4. Access the applications through your web browser using the URLs listed above

5. To stop the environment:
   ```
   docker-compose down
   ```

## Usage Tips

1. **Use a dedicated browser profile** for security testing to isolate cookies and sessions

2. **Set up a proxy tool** like Burp Suite or OWASP ZAP to intercept and modify requests

3. **Take notes** on vulnerabilities you discover and exploitation techniques

4. **Review application source code** when available to understand vulnerabilities

5. **Use the documentation** provided with each application for challenge hints

## Security Warning

These applications are intentionally vulnerable. NEVER:
- Expose them to the public internet
- Use them in a production environment
- Use real credentials or sensitive information while testing

## Troubleshooting

1. **Port conflicts**: If you see errors about ports already in use, modify the port mappings in docker-compose.yml

2. **Container fails to start**: Check Docker logs with `docker-compose logs [service_name]`

3. **Application errors**: Some applications may need additional setup steps; refer to their documentation

## Next Steps

After setting up the environment, proceed to the exercises in each application's documentation to practice identifying and exploiting web vulnerabilities.