const express = require('express');
// We need to use 'node-fetch' for a modern Node.js version, but the built-in 'fetch' is now available 
// in newer Node versions. Since 'node-fetch' was previously installed, we'll keep using it.
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const port = 3000;

// =========================================================
// 🚨 YOUR DISCORD CREDENTIALS 🚨 
// =========================================================
const CLIENT_ID = '1430204560802316450';
const CLIENT_SECRET = 'agiJRDlppR4l-QJ2SPJHA4RLjlEugxCD'; 
// *** UPDATED REDIRECT URI ***
const REDIRECT_URI = 'https://vatrix-bypasser.vercel.app/'; 
const SCOPE = 'identify'; 
// =========================================================

// --- 1. LOGIN PAGE (Root Route: http://localhost:3000) ---
// If the user visits the root, they are shown the login button from login.html.
app.get('/', (req, res) => {
    // NOTE: We are still serving login.html from localhost:3000 for development.
    res.sendFile(path.join(__dirname, 'login.html'));
});


// --- 2. DISCORD CALLBACK ROUTE ---
// Discord redirects the user here with a temporary 'code' after authorization.
// NOTE: Since the REDIRECT_URI is now set to a remote server (Vercel), this 
// route will ONLY fire when the code is run on that Vercel server.
// For testing locally, you would need to change REDIRECT_URI back to localhost.
app.get('/callback', async (req, res) => {
    const code = req.query.code; // The temporary authorization code
    
    if (!code) {
        // If there's no code, it might be the initial hit or an error from Discord
        return res.status(400).send('Error: Missing authorization code from Discord.');
    }

    // --- SECURE STEP: Exchange code for Access Token ---
    try {
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI, // Must match the URI registered with Discord
                scope: SCOPE,
            }).toString(),
        });

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) {
            console.error('Token Error:', tokenData);
            return res.status(500).send('Error exchanging code for token. Access Denied.');
        }

        // --- Use the Access Token to get the user's Discord info ---
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                authorization: `Bearer ${accessToken}`,
            },
        });
        
        const userData = await userResponse.json();

        // --- AUTHENTICATION SUCCESS: Redirect to the protected dashboard ---
        console.log(`User Logged In: ${userData.username}#${userData.discriminator || '0'}`);
        // After successful login, redirect the user to the main page of your Vercel app.
        // We are passing user data back to the browser via query parameters (insecure for real data).
        return res.redirect(`${REDIRECT_URI}dashboard?username=${encodeURIComponent(userData.username)}&id=${userData.id}`);

    } catch (error) {
        console.error('Error during OAuth process:', error);
        res.status(500).send('An unexpected error occurred during the login process. Check server logs.');
    }
});


// --- 3. PROTECTED CONTENT ROUTE (The Dashboard - for local testing only) ---
// This route is primarily for local testing, as the Vercel app will handle its own routing.
app.get('/dashboard', (req, res) => {
    const username = req.query.username || 'Authenticated User';
    const userID = req.query.id || 'N/A';
    
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Local Test Dashboard</title></head>
        <body style="font-family: sans-serif; background-color: #2f3136; color: white; padding: 50px;">
            <div style="background-color: #36393f; padding: 30px; border-radius: 8px;">
                <h1>Welcome, ${username}!</h1>
                <p>This is the **Local Dashboard** view.</p>
                <p>In a live deployment, you would be redirected to your **Vercel app's** dashboard.</p>
                <hr>
                <p><strong>Discord User ID:</strong> ${userID}</p>
                <br>
                <a href="/" style="color: #7289DA;">Log Out</a>
            </div>
        </body>
        </html>
    `);
});

// --- Start the server ---
app.listen(port, () => {
    console.log(`✅ Server running locally at: http://localhost:${port}`);
    // If you plan to deploy this server code to Vercel, you need to use the 
    // Vercel deployment method (e.g., configuring as a serverless function).
});