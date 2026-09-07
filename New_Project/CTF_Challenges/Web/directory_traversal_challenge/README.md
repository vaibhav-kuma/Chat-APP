# Directory Traversal Challenge

## Overview
This challenge simulates a simple document viewer application that contains a directory traversal vulnerability. Participants must identify and exploit this vulnerability to access files outside the intended directory and retrieve a hidden flag.

## Description
The application provides a web interface where users can view text files stored on the server. However, the application fails to properly validate file paths, creating a directory traversal vulnerability that allows attackers to access files outside the intended directory.

## Learning Objectives
- Understand how directory traversal vulnerabilities occur
- Learn techniques to identify vulnerable parameters
- Practice exploiting directory traversal vulnerabilities
- Understand proper path validation methods
- Learn how to bypass basic security filters

## Setup Instructions
1. Ensure you have PHP installed on your system
2. Place the challenge files in your web server's document root
3. Access the challenge through your web browser (e.g., http://localhost/directory_traversal_challenge/)

## Challenge Tasks

### Basic Exploitation
1. Identify the vulnerable parameter in the application
2. Determine how to bypass the basic path validation
3. Access a file outside the intended directory to verify the vulnerability

### Flag Retrieval
1. Find and retrieve the hidden flag file
2. The flag format is CTF{...}

### Advanced Exploitation
1. Try different directory traversal techniques (e.g., using different encodings)
2. Attempt to bypass any filtering that might be in place
3. Access sensitive system files (in a controlled environment only)

## Hints

<details>
<summary>Hint 1: Path Traversal Basics</summary>
The <code>../</code> sequence can be used to navigate to parent directories in file paths.
</details>

<details>
<summary>Hint 2: Bypassing Filters</summary>
The application blocks some obvious traversal attempts. Think about alternative ways to represent path traversal sequences.
</details>

<details>
<summary>Hint 3: Finding the Flag</summary>
Check the source code or comments for clues about where the flag might be stored.
</details>

## Solution

<details>
<summary>Click to reveal solution</summary>

### Exploitation Steps

1. **Identify the vulnerability**: The application takes a filename parameter and appends it to a base directory without proper path validation.

2. **Bypass the filter**: The application blocks paths containing `../` and `..%2f`, but there are other ways to represent traversal sequences:
   - Using URL encoding: `..%252f` (double-encoded slash)
   - Using alternative path separators: `..\` (on Windows systems)
   - Using nested traversal: `....//` (which becomes `../` after normalization)

3. **Basic exploitation**: Access a file outside the files directory:
   ```
   ?file=..%252f..%252fsecret_data.txt
   ```
   or
   ```
   ?file=....//....//secret_data.txt
   ```

4. **Retrieving the flag**: Based on the hint in the secret file and the admin comment, the flag is stored in `/admin/flag.txt`. Access it using:
   ```
   ?file=..%252f..%252fadmin%252fflag.txt
   ```
   or
   ```
   ?file=....//....//admin//flag.txt
   ```

### The Flag
The flag is: `CTF{d1r3ct0ry_tr4v3rs4l_3xp3rt}`

</details>

## Prevention
To prevent directory traversal vulnerabilities:

1. **Use safe APIs**: Use programming language features that accept a filename but not a path.

2. **Input validation**: Validate user input to ensure it only contains expected characters.

3. **Path canonicalization**: Convert all paths to their canonical form before validation.

4. **Chroot jail**: Restrict the application to a specific directory.

5. **Allowlist approach**: Only allow access to specific, known-safe files rather than trying to block malicious paths.

6. **Access controls**: Implement proper access controls to ensure users can only access files they are authorized to view.

## Additional Resources
- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [PortSwigger Web Security Academy: Directory Traversal](https://portswigger.net/web-security/file-path-traversal)
- [HackTricks: Directory Traversal](https://book.hacktricks.xyz/pentesting-web/file-inclusion)

## Credits
This challenge was created for educational purposes as part of a cybersecurity learning environment.

## Disclaimer
This challenge contains intentional vulnerabilities for educational purposes. Do not deploy this code in a production environment or use the techniques demonstrated here against systems without explicit permission.