<?php
// Start session
session_start();

// Database connection details
$db_host = 'localhost';
$db_user = 'root';
$db_pass = 'password';
$db_name = 'vulnapp';

// Connect to database (vulnerable to SQL injection)
function connectDB() {
    global $db_host, $db_user, $db_pass, $db_name;
    $conn = mysqli_connect($db_host, $db_user, $db_pass, $db_name);
    if (!$conn) {
        die("Connection failed: " . mysqli_connect_error());
    }
    return $conn;
}

// Initialize database tables (for demo purposes)
function initDB() {
    // This would normally create tables if they don't exist
    // For the demo, we'll just simulate this
    return true;
}

// Vulnerable to XSS
function displayMessage() {
    if (isset($_GET['message'])) {
        // Vulnerable: No output encoding
        echo "<div class='message'>" . $_GET['message'] . "</div>";
    }
}

// Vulnerable to SQL Injection
function login() {
    if (isset($_POST['username']) && isset($_POST['password'])) {
        $username = $_POST['username'];
        $password = $_POST['password'];
        
        $conn = connectDB();
        
        // Vulnerable: Direct inclusion of user input in SQL query
        $query = "SELECT * FROM users WHERE username = '$username' AND password = '$password'";
        $result = mysqli_query($conn, $query);
        
        if (mysqli_num_rows($result) > 0) {
            $_SESSION['loggedin'] = true;
            $_SESSION['username'] = $username;
            return true;
        }
        
        mysqli_close($conn);
    }
    return false;
}

// Vulnerable to Command Injection
function pingHost() {
    if (isset($_POST['host'])) {
        $host = $_POST['host'];
        
        // Vulnerable: Direct inclusion of user input in system command
        $output = shell_exec("ping -c 4 " . $host);
        return $output;
    }
    return "";
}

// Vulnerable to File Inclusion
function includeFile() {
    if (isset($_GET['page'])) {
        $page = $_GET['page'];
        
        // Vulnerable: No validation of file path
        include($page . ".php");
    }
}

// Vulnerable to CSRF
function changePassword() {
    if (isset($_POST['new_password'])) {
        $new_password = $_POST['new_password'];
        
        // Vulnerable: No CSRF token validation
        // In a real app, this would update the password in the database
        return "Password changed successfully!";
    }
    return "";
}

// Vulnerable to Insecure File Upload
function uploadFile() {
    if (isset($_FILES['file'])) {
        $file = $_FILES['file'];
        $filename = $file['name'];
        $upload_dir = "uploads/";
        
        // Vulnerable: No validation of file type or content
        move_uploaded_file($file['tmp_name'], $upload_dir . $filename);
        return "File uploaded successfully!";
    }
    return "";
}

// Main application logic
$login_result = "";
$ping_result = "";
$password_result = "";
$upload_result = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['login'])) {
        if (login()) {
            $login_result = "Login successful!";
        } else {
            $login_result = "Login failed!";
        }
    }
    
    if (isset($_POST['ping'])) {
        $ping_result = pingHost();
    }
    
    if (isset($_POST['change_password'])) {
        $password_result = changePassword();
    }
    
    if (isset($_POST['upload'])) {
        $upload_result = uploadFile();
    }
}

// Initialize database for demo
initDB();
?>

<!DOCTYPE html>
<html>
<head>
    <title>Vulnerable PHP Application</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .section { border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
        .message { background-color: #f8f9fa; padding: 10px; margin-bottom: 15px; }
        pre { background-color: #f5f5f5; padding: 10px; overflow: auto; }
        input[type="text"], input[type="password"] { padding: 8px; width: 200px; }
        button { padding: 8px 15px; background-color: #4CAF50; color: white; border: none; cursor: pointer; }
        h2 { color: #333; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Vulnerable PHP Application</h1>
        <p>This application contains various security vulnerabilities for educational purposes.</p>
        
        <?php displayMessage(); ?>
        
        <div class="section">
            <h2>XSS Vulnerability</h2>
            <p>Try to inject JavaScript code through the URL parameter.</p>
            <p>Example: <code>?message=&lt;script&gt;alert('XSS')&lt;/script&gt;</code></p>
        </div>
        
        <div class="section">
            <h2>SQL Injection</h2>
            <p>Try to bypass the login using SQL injection.</p>
            <form method="post">
                <div>
                    <label for="username">Username:</label>
                    <input type="text" id="username" name="username" placeholder="Username">
                </div>
                <div style="margin-top: 10px;">
                    <label for="password">Password:</label>
                    <input type="password" id="password" name="password" placeholder="Password">
                </div>
                <div style="margin-top: 10px;">
                    <button type="submit" name="login">Login</button>
                </div>
            </form>
            <?php if ($login_result): ?>
                <p><?php echo $login_result; ?></p>
            <?php endif; ?>
            <p>Hint: Try <code>' OR '1'='1</code> as the username or password.</p>
        </div>
        
        <div class="section">
            <h2>Command Injection</h2>
            <p>Try to execute system commands through the ping functionality.</p>
            <form method="post">
                <div>
                    <label for="host">Host to ping:</label>
                    <input type="text" id="host" name="host" placeholder="localhost">
                </div>
                <div style="margin-top: 10px;">
                    <button type="submit" name="ping">Ping</button>
                </div>
            </form>
            <?php if ($ping_result): ?>
                <pre><?php echo $ping_result; ?></pre>
            <?php endif; ?>
            <p>Hint: Try <code>localhost && dir</code> on Windows or <code>localhost && ls</code> on Linux.</p>
        </div>
        
        <div class="section">
            <h2>CSRF Vulnerability</h2>
            <p>This form has no CSRF protection.</p>
            <form method="post">
                <div>
                    <label for="new_password">New Password:</label>
                    <input type="password" id="new_password" name="new_password" placeholder="New Password">
                </div>
                <div style="margin-top: 10px;">
                    <button type="submit" name="change_password">Change Password</button>
                </div>
            </form>
            <?php if ($password_result): ?>
                <p><?php echo $password_result; ?></p>
            <?php endif; ?>
        </div>
        
        <div class="section">
            <h2>File Upload Vulnerability</h2>
            <p>This form allows unrestricted file uploads.</p>
            <form method="post" enctype="multipart/form-data">
                <div>
                    <label for="file">File to upload:</label>
                    <input type="file" id="file" name="file">
                </div>
                <div style="margin-top: 10px;">
                    <button type="submit" name="upload">Upload</button>
                </div>
            </form>
            <?php if ($upload_result): ?>
                <p><?php echo $upload_result; ?></p>
            <?php endif; ?>
            <p>Hint: Try uploading a PHP file with malicious code.</p>
        </div>
        
        <div class="section">
            <h2>File Inclusion Vulnerability</h2>
            <p>Try to include files from the server.</p>
            <p>Example: <code>?page=../../../etc/passwd</code></p>
        </div>
    </div>
</body>
</html>