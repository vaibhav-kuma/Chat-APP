<?php
// Command Injection Challenge
// For educational purposes only

// Set up the flag
$flag = "CTF{c0mm4nd_1nj3ct10n_m4st3r}"; // This is stored here for simplicity, in a real CTF it would be elsewhere

// Initialize variables
$output = "";
$error = "";
$command = "";

// Process form submission
if (isset($_POST['submit'])) {
    // Get the IP address to ping
    $ip = $_POST['ip'];
    
    // Validate IP address format (basic validation only)
    if (filter_var($ip, FILTER_VALIDATE_IP)) {
        // VULNERABLE CODE: Direct command injection vulnerability
        // The user input is directly concatenated into the command without proper sanitization
        $command = "ping -c 4 " . $ip;
        
        // Execute the command and capture output
        exec($command, $output_array, $return_code);
        
        // Format the output
        $output = implode("\n", $output_array);
        
        // Check for errors
        if ($return_code !== 0) {
            $error = "Error executing command. Return code: $return_code";
        }
    } else {
        $error = "Invalid IP address format";
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Network Ping Tool</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            color: #333;
        }
        .container {
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 5px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input[type="text"] {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 3px;
            box-sizing: border-box;
        }
        input[type="submit"] {
            background-color: #4CAF50;
            color: white;
            padding: 10px 15px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
        input[type="submit"]:hover {
            background-color: #45a049;
        }
        .output {
            background-color: #000;
            color: #00ff00;
            padding: 15px;
            border-radius: 3px;
            margin-top: 20px;
            white-space: pre-wrap;
            font-family: monospace;
        }
        .error {
            color: red;
            margin-top: 10px;
        }
        .hint {
            margin-top: 30px;
            padding: 10px;
            background-color: #ffffd0;
            border-left: 4px solid #ffcc00;
        }
        .admin-note {
            color: #999;
            font-size: 12px;
            margin-top: 50px;
            padding: 10px;
            border-top: 1px dashed #ddd;
        }
    </style>
</head>
<body>
    <h1>Network Ping Tool</h1>
    
    <div class="container">
        <p>This tool allows you to ping an IP address to check network connectivity.</p>
        
        <form method="post" action="">
            <div class="form-group">
                <label for="ip">IP Address:</label>
                <input type="text" id="ip" name="ip" placeholder="Enter an IP address (e.g., 8.8.8.8)" value="<?php echo htmlspecialchars($ip ?? ''); ?>" required>
            </div>
            
            <div class="form-group">
                <input type="submit" name="submit" value="Ping">
            </div>
        </form>
        
        <?php if ($error): ?>
            <div class="error"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>
        
        <?php if ($output): ?>
            <h3>Command Output:</h3>
            <div class="output"><?php echo htmlspecialchars($command); ?>

<?php echo htmlspecialchars($output); ?></div>
        <?php endif; ?>
        
        <div class="hint">
            <strong>Hint:</strong> The system is running a standard Linux distribution. The ping tool is used to check network connectivity.
        </div>
    </div>
    
    <div class="admin-note">
        <!-- This comment would normally not be visible in a real application -->
        <!-- Admin note: Need to fix the command injection vulnerability in the ping tool. -->
        <!-- Also, remember to move the flag from the source code to /etc/flag.txt -->
    </div>
</body>
</html>