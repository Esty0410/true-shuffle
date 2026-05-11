const CLIENT_ID = 'bda16eba344f499ea1c7df19e8483a19';
const REDIRECT_URI = 'http://127.0.0.1:5500/index.html';
const SCOPES = 'playlist-read-private playlist-read-collaborative user-library-read';

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

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&code_challenge_method=S256&code_challenge=${challenge}&show_dialog=true`;

    window.location.href = authUrl;
}

async function handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        const verifier = localStorage.getItem('code_verifier');
        await exchangeToken(code, verifier);
    } else {
        const token = localStorage.getItem('access_token');
        if (token) {
            await fetchPlaylists();
        }
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

async function fetchPlaylists() {
    const token = localStorage.getItem('access_token');

    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const data = await response.json();
    console.log(data);
    console.log(data.items);
    displayPlaylists(data.items);
}

function displayPlaylists(playlists) {
    const queueList = document.getElementById('queueList');
    queueList.innerHTML = '';

    playlists.forEach(playlist => {
        const li = document.createElement('li');
        li.textContent = playlist.name;
        li.addEventListener('click', () => selectPlaylist(playlist.id));
        queueList.appendChild(li);
    });
}

function trueShuffle(tracks) {
    const shuffled = [...tracks];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

function displayQueue(tracks) {
    const queueList = document.getElementById('queueList');
    queueList.innerHTML = '';

    tracks.forEach((trackItem, index) => {
        const li = document.createElement('li');
        li.className = 'queue-item';
        li.textContent = `${index + 1}. ${trackItem.item.name} - ${trackItem.item.artists[0].name}`;
        li.addEventListener('click', () => playSong(trackItem.item));
        queueList.appendChild(li);
    });
}

function playSong(track) {
    document.getElementById('songTitle').textContent = track.name;
    document.getElementById('songArtist').textContent = track.artists[0].name;

    if (track.album.images.length > 0) {
        document.getElementById('albumArt').src = track.album.images[0].url;
    }
}

async function selectPlaylist(playlistId) {
    const token = localStorage.getItem('access_token');

    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const data = await response.json();
    const tracks = data.items.items;
    const shuffledTracks = trueShuffle(tracks);
    displayQueue(shuffledTracks);
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