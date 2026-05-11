const CLIENT_ID = 'bda16eba344f499ea1c7df19e8483a19';
const REDIRECT_URI = 'http://127.0.0.1:5500/index.html';
const SCOPES = 'streaming user-read-playback-state user-modify-playback-state playlist-read-private';

function generateCodeVerifier() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function loginWithSpotify() {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem('code_verifier', verifier);

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&code_challenge_method=S256&code_challenge=${challenge}`;

    window.location.href = authUrl;
}

async function handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        const verifier = localStorage.getItem('code_verifier');
        await exchangeToken(code, verifier);
    }
}

async function exchangeToken(code, verifier) {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: REDIRECT_URI,
            client_id: CLIENT_ID,
            code_verifier: verifier
        })
    });

    const data = await response.json();
    console.log(data);

    if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        window.location.href = '/';
    }
}

const themeToggle = document.querySelector('.theme-toggle');
const body = document.querySelector('body');

themeToggle.addEventListener('click', () => {
    themeToggle.addEventListener('click', () => {
        if (body.getAttribute('data-theme') === 'dark') {
            body.removeAttribute('data-theme');
        } else {
            body.setAttribute('data-theme', 'dark');
        }
    });
});

const connectBtn = document.getElementById('connectBtn');
connectBtn.addEventListener('click', () => {
    loginWithSpotify();
});

handleCallback();