<?php
// Simple SQL Injection Challenge
// For educational purposes only

// Initialize session
session_start();

// Database configuration (in a real app, this would be in a separate config file)
$db_host = 'localhost';
$db_user = 'ctf_user';
$db_pass = 'ctf_password';
$db_name = 'ctf_sqli';

// Flag (hidden in the database)
$flag = "CTF{SQL_1nj3ct10n_m4st3r}"; // This is just for reference, not accessible directly

// Connect to database
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

// Check connection
if ($conn->connect_error) {
    die("<div class='error'>Connection failed: " . $conn->connect_error . "</div>");
}

// Function to create database and tables if they don't exist
function setupDatabase($conn) {
    // Create database if it doesn't exist
    $sql = "CREATE DATABASE IF NOT EXISTS ctf_sqli";
    if ($conn->query($sql) !== TRUE) {
        echo "<div class='error'>Error creating database: " . $conn->error . "</div>";
    }
    
    // Select the database
    $conn->select_db("ctf_sqli");
    
    // Create users table
    $sql = "CREATE TABLE IF NOT EXISTS users (
        id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(30) NOT NULL,
        password VARCHAR(30) NOT NULL
    )";
    
    if ($conn->query($sql) !== TRUE) {
        echo "<div class='error'>Error creating users table: " . $conn->error . "</div>";
    }
    
    // Create secret_flags table
    $sql = "CREATE TABLE IF NOT EXISTS secret_flags (
        id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        flag_name VARCHAR(30) NOT NULL,
        flag_value VARCHAR(100) NOT NULL
    )";
    
    if ($conn->query($sql) !== TRUE) {
        echo "<div class='error'>Error creating secret_flags table: " . $conn->error . "</div>";
    }
    
    // Check if users table is empty
    $result = $conn->query("SELECT COUNT(*) as count FROM users");
    $row = $result->fetch_assoc();
    
    if ($row['count'] == 0) {
        // Insert sample users
        $sql = "INSERT INTO users (username, password) VALUES
            ('admin', 'supersecretadminpass'),
            ('john', 'password123'),
            ('sarah', 'sarahspassword')";
        
        if ($conn->query($sql) !== TRUE) {
            echo "<div class='error'>Error inserting users: " . $conn->error . "</div>";
        }
    }
    
    // Check if secret_flags table is empty
    $result = $conn->query("SELECT COUNT(*) as count FROM secret_flags");
    $row = $result->fetch_assoc();
    
    if ($row['count'] == 0) {
        // Insert flag
        $sql = "INSERT INTO secret_flags (flag_name, flag_value) VALUES
            ('main_flag', 'CTF{SQL_1nj3ct10n_m4st3r}')";
        
        if ($conn->query($sql) !== TRUE) {
            echo "<div class='error'>Error inserting flag: " . $conn->error . "</div>";
        }
    }
}

// Setup the database (this would normally be done separately)
setupDatabase($conn);

// Process login form
$error_message = "";
$login_success = false;
$username = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Get username and password from form
    $username = isset($_POST["username"]) ? $_POST["username"] : "";
    $password = isset($_POST["password"]) ? $_POST["password"] : "";
    
    // Vulnerable SQL query (intentionally vulnerable for the challenge)
    $sql = "SELECT * FROM users WHERE username = '$username' AND password = '$password'";
    
    // For debugging (comment out in production)
    // echo "<div class='debug'>Query: $sql</div>";
    
    $result = $conn->query($sql);
    
    if ($result && $result->num_rows > 0) {
        // Login successful
        $login_success = true;
        $_SESSION['logged_in'] = true;
        $_SESSION['username'] = $username;
    } else {
        // Login failed
        $error_message = "Invalid username or password";
    }
}

// Check if user is logged in
$logged_in = isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
$admin_access = $logged_in && $_SESSION['username'] === 'admin';

// Logout functionality
if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: " . $_SERVER['PHP_SELF']);
    exit;
}

// Close the database connection
$conn->close();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secure Login System</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        h1, h2 {
            color: #333;
        }
        .login-form {
            margin-bottom: 20px;
        }
        .login-form input {
            width: 100%;
            padding: 8px;
            margin-bottom: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .login-form button {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
        }
        .login-form button:hover {
            background: #45a049;
        }
        .error {
            color: red;
            margin-bottom: 10px;
        }
        .success {
            color: green;
            margin-bottom: 10px;
        }
        .debug {
            background: #f8f8f8;
            border: 1px solid #ddd;
            padding: 10px;
            margin-bottom: 10px;
            font-family: monospace;
        }
        .challenge-info {
            background: #ffffd9;
            padding: 15px;
            margin-bottom: 20px;
            border-left: 4px solid #ffcc00;
        }
        .admin-panel {
            background: #f0f0f0;
            padding: 15px;
            margin-top: 20px;
            border-radius: 4px;
        }
        .logout {
            display: inline-block;
            background: #f44336;
            color: white;
            padding: 5px 10px;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 10px;
        }
        .logout:hover {
            background: #d32f2f;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Secure Login System</h1>
        
        <div class="challenge-info">
            <h3>Challenge Information</h3>
            <p><strong>Difficulty:</strong> Beginner to Intermediate</p>
            <p><strong>Objective:</strong> Find and exploit the SQL injection vulnerability to:</p>
            <ol>
                <li>Login as any user without knowing the password</li>
                <li>Login specifically as the admin user</li>
                <li>Extract the secret flag from the database</li>
            </ol>
            <p><strong>Hint:</strong> The login form is vulnerable to SQL injection. Try manipulating the username and password fields.</p>
        </div>
        
        <?php if (!$logged_in): ?>
            <!-- Login Form -->
            <div class="login-form">
                <h2>Login</h2>
                <?php if ($error_message): ?>
                    <div class="error"><?php echo $error_message; ?></div>
                <?php endif; ?>
                
                <form method="post" action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>">
                    <div>
                        <label for="username">Username:</label>
                        <input type="text" id="username" name="username" value="<?php echo htmlspecialchars($username); ?>" required>
                    </div>
                    <div>
                        <label for="password">Password:</label>
                        <input type="password" id="password" name="password" required>
                    </div>
                    <button type="submit">Login</button>
                </form>
            </div>
        <?php else: ?>
            <!-- Logged In Content -->
            <div class="success">
                <p>Welcome, <?php echo htmlspecialchars($_SESSION['username']); ?>! You are successfully logged in.</p>
                <a href="?logout=1" class="logout">Logout</a>
            </div>
            
            <?php if ($admin_access): ?>
                <!-- Admin Panel (only visible to admin) -->
                <div class="admin-panel">
                    <h2>Admin Panel</h2>
                    <p>Congratulations! You have access to the admin panel.</p>
                    <p>Here's your flag: <strong><?php echo $flag; ?></strong></p>
                </div>
            <?php else: ?>
                <p>This is a regular user account. Only the admin can see the secret flag.</p>
            <?php endif; ?>
        <?php endif; ?>
    </div>
</body>
</html>