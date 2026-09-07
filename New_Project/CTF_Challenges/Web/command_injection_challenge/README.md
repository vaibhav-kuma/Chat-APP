# Command Injection Challenge

## Overview
This challenge simulates a simple network ping tool that contains a command injection vulnerability. Participants must identify and exploit this vulnerability to execute arbitrary commands on the server and retrieve a hidden flag.

## Description
The application provides a web interface where users can enter an IP address to ping. However, the application fails to properly sanitize user input before passing it to a system command, creating a command injection vulnerability.

## Learning Objectives
- Understand how command injection vulnerabilities occur
- Learn techniques to identify vulnerable parameters
- Practice exploiting command injection vulnerabilities
- Understand proper input sanitization methods
- Learn how to chain commands in different operating systems

## Setup Instructions
1. Ensure you have PHP installed on your system
2. Place the challenge files in your web server's document root
3. Access the challenge through your web browser (e.g., http://localhost/command_injection_challenge/)

## Challenge Tasks

### Basic Exploitation
1. Identify the vulnerable parameter in the application
2. Determine how to inject additional commands
3. Execute a simple command to verify the vulnerability (e.g., listing directory contents)

### Flag Retrieval
1. Find and retrieve the hidden flag
2. The flag format is CTF{...}

### Advanced Exploitation
1. Try different command injection techniques (e.g., using different separators)
2. Attempt to bypass any filtering that might be in place
3. Execute more complex commands or command chains

## Hints

<details>
<summary>Hint 1: Command Separators</summary>
In Unix-like systems, commands can be separated using characters like <code>;</code>, <code>&&</code>, <code>||</code>, or <code>|</code>.
</details>

<details>
<summary>Hint 2: Bypassing Validation</summary>
The application performs basic IP validation. Think about how you might input a valid IP while still injecting commands.
</details>

<details>
<summary>Hint 3: Finding the Flag</summary>
Check the source code or look for common locations where flags might be stored (e.g., environment variables, configuration files, or specific directories).
</details>

## Solution

<details>
<summary>Click to reveal solution</summary>

### Exploitation Steps

1. **Identify the vulnerability**: The application takes an IP address and passes it directly to the `ping` command without proper sanitization.

2. **Basic command injection**: Enter a valid IP followed by a command separator and another command:
   ```
   8.8.8.8; ls -la
   ```

3. **Retrieving the flag**: The flag is actually stored in the source code of the application. You can view it using:
   ```
   8.8.8.8; cat index.php
   ```
   
   Alternatively, if the flag was moved to /etc/flag.txt as mentioned in the admin comment, you could use:
   ```
   8.8.8.8; cat /etc/flag.txt
   ```

4. **Alternative techniques**: You can also use other command separators:
   ```
   8.8.8.8 && ls -la
   8.8.8.8 || ls -la
   8.8.8.8 | ls -la
   ```

### The Flag
The flag is: `CTF{c0mm4nd_1nj3ct10n_m4st3r}`

</details>

## Prevention
To prevent command injection vulnerabilities:

1. **Avoid using shell commands**: When possible, use language-specific functions instead of executing system commands.

2. **Input validation**: Validate and sanitize all user inputs, especially those used in system commands.

3. **Parameterized commands**: Use command parameterization to separate the command from its arguments.

4. **Allowlist approach**: Only allow specific, known-safe inputs rather than trying to block malicious ones.

5. **Principle of least privilege**: Run the application with the minimum privileges needed.

## Additional Resources
- [OWASP Command Injection](https://owasp.org/www-community/attacks/Command_Injection)
- [PortSwigger Web Security Academy: OS Command Injection](https://portswigger.net/web-security/os-command-injection)
- [HackTricks: Command Injection](https://book.hacktricks.xyz/pentesting-web/command-injection)

## Credits
This challenge was created for educational purposes as part of a cybersecurity learning environment.

## Disclaimer
This challenge contains intentional vulnerabilities for educational purposes. Do not deploy this code in a production environment or use the techniques demonstrated here against systems without explicit permission.