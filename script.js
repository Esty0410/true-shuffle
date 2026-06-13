const CLIENT_ID = 'bda16eba344f499ea1c7df19e8483a19';
const REDIRECT_URI = 'http://127.0.0.1:5500/index.html';
const SCOPES = 'playlist-read-private playlist-read-collaborative user-library-read user-modify-playback-state user-read-playback-state';
let activeDeviceId = null;
let currentQueue = [];
let currentTrackIndex = 0;
let progressInterval = null;
let isSeeking = false;
let currentDuration = 0;
let isDragging = false;
let draggedIndex = null;
let isAutoAdvancing = false;
let playingQueue = [];

setTimeout(() => {
    document.getElementById('intro').classList.add('intro-hidden');
}, 2000);

async function getDevices() {
    const token = localStorage.getItem('access_token');
    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const data = await response.json();
    const activeDevice = data.devices.find(device => device.is_active);
    if (activeDevice) {
        activeDeviceId = activeDevice.id;
        await fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                device_ids: [activeDevice.id],
                play: false
            })
        });
    }
}

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

function showScreen(screenId) {
    document.querySelectorAll('.screen-playlists, .screen-queue, .screen-nowplaying')
        .forEach(screen => screen.classList.remove('screen-active'));
    document.getElementById(screenId).classList.add('screen-active');
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
            await getDevices();
            showScreen('screenPlaylists');
        } else {
            showScreen('screenPlaylists');
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

    if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        window.location.href = '/index.html';
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
    displayPlaylists(data.items);
}

function displayPlaylists(playlists) {
    showScreen('screenPlaylists');
    document.getElementById('connectBtn').style.display = 'none';
    const queueList = document.getElementById('queueList');
    queueList.innerHTML = '';

    playlists.forEach(playlist => {
        const li = document.createElement('li');
        li.className = 'playlist-item';
        li.innerHTML = `<span>${playlist.name}</span>`;
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

function displayQueue(tracks, switchScreen = true) {
    if (switchScreen) showScreen('screenQueue');
    const queueList = document.getElementById('songList');
    queueList.innerHTML = '';

    currentQueue = tracks;

    tracks.forEach((trackItem, index) => {
        const li = document.createElement('li');
        li.className = 'queue-item';
        li.innerHTML = `
            <span>${index + 1}. ${trackItem.item.name} - ${trackItem.item.artists[0].name}</span>
            <i class="fa-solid fa-grip-lines drag-handle"></i>
        `; 
        li.addEventListener('click', () => playSong(trackItem.item));
        li.draggable = true;
        li.addEventListener('dragstart', () => {
            draggedIndex = index;
        });
        li.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        li.addEventListener('drop', () => {
            const draggedTrack = currentQueue.splice(draggedIndex, 1)[0];
            currentQueue.splice(index, 0, draggedTrack);
            displayQueue(currentQueue);
        });
        queueList.appendChild(li);
    });
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
    displayQueue(tracks);
}

function updatePlayButtons(playing) {
    const icon = playing ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    document.getElementById('playBtn').innerHTML = icon;
    document.getElementById('miniPlayBtn').innerHTML = icon;
    document.getElementById('miniPlayBtn2').innerHTML = icon;
}

async function playSong(track, updateQueue = true) {
    showScreen('screenNowPlaying');

    if (updateQueue) {
        currentTrackIndex = currentQueue.findIndex(item => item.item.uri === track.uri);
    }
    if (updateQueue) {
        playingQueue = [...currentQueue];
    }
    updateNowPlayingQueue();

    document.getElementById('songTitle').textContent = track.name;
    const miniTitle = document.getElementById('miniTitle');
    const miniTitle2 = document.getElementById('miniTitle2');
    if (miniTitle) {
        miniTitle.textContent = `${track.name} - ${track.artists[0].name}`;
        miniTitle.classList.add('scrolling');
    }
    if (miniTitle2) {
        miniTitle2.textContent = `${track.name} - ${track.artists[0].name}`;
        miniTitle2.classList.add('scrolling');
    }

    document.getElementById('miniPlayer').style.display = 'flex';
    document.getElementById('miniPlayer2').style.display = 'flex';
    updatePlayButtons(true);

    document.getElementById('songArtist').textContent = track.artists[0].name;

    if (track.album.images.length > 0) {
    document.getElementById('albumArt').src = track.album.images[0].url;
    document.getElementById('albumArt').style.display = 'block';
    document.getElementById('albumPlaceholder').style.display = 'none';
    }

    const token = localStorage.getItem('access_token');

    await getDevices();

    const playResponse = await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            uris: [track.uri]
        })
    });

    if (playResponse.status === 403 || playResponse.status === 404) {
        alert('please open spotify on your device first, then try again');
        return;
    }

    isPlaying = true;
    updatePlayButtons(true);

    clearInterval(progressInterval);
    progressInterval = setInterval(updateProgressBar, 1000);
}

async function updateProgressBar() {
    if (isSeeking) return;

    const token = localStorage.getItem('access_token');

    const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok || response.status === 204) return;

    const data = await response.json();

    if (data && data.progress_ms && data.item) {
        currentDuration = data.item.duration_ms;
        const progress = (data.progress_ms / data.item.duration_ms) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;

        document.getElementById('currentTime').textContent = formatTime(data.progress_ms);
        document.getElementById('totalTime').textContent = formatTime(data.item.duration_ms);

        if (data.progress_ms >= data.item.duration_ms - 2000 && !isAutoAdvancing) {
            isAutoAdvancing = true;
            const nextIndex = currentTrackIndex + 1;
            if (nextIndex >= playingQueue.length) {
                isAutoAdvancing = false;
                return;
            }
            currentTrackIndex = nextIndex;
            await playSong(playingQueue[currentTrackIndex].item, false);
            isAutoAdvancing = false;
        }
    }
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

document.getElementById('backToPlaylists').addEventListener('click', () => {
    showScreen('screenPlaylists');
});

document.getElementById('backToQueue').addEventListener('click', () => {
    showScreen('screenQueue');
});

document.getElementById('goToNowPlaying').addEventListener('click', () => {
    showScreen('screenNowPlaying');
});

document.getElementById('shuffleQueueBtn').addEventListener('click', () => {
    const currentTrack = currentQueue[currentTrackIndex];
    currentQueue = trueShuffle(currentQueue);
    if (currentTrack) {
        currentTrackIndex = currentQueue.findIndex(item => item.item.uri === currentTrack.item.uri);
    }
    displayQueue(currentQueue, true);
});

function setupSeekBar() {
    const progressBar = document.getElementById('progressBar');

    progressBar.addEventListener('click', async (e) => {
        isSeeking = true;

        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        document.getElementById('progressFill').style.width = `${percentage * 100}%`;

        const token = localStorage.getItem('access_token');
        const response = await fetch('https://api.spotify.com/v1/me/player', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.item) {
            const seekMs = Math.floor(percentage * data.item.duration_ms);
            await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${seekMs}&device_id=${activeDeviceId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }

        setTimeout(() => {
            isSeeking = false;
        }, 500);
    });

    progressBar.addEventListener('mousedown', () => {
        isDragging = true;
        isSeeking = true;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const rect = progressBar.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = clickX / rect.width;
        document.getElementById('progressFill').style.width = `${percentage * 100}%`;
        document.getElementById('currentTime').textContent = formatTime(percentage * currentDuration);
    });

    document.addEventListener('mouseup', async (e) => {
        if (!isDragging) return;
        isDragging = false;

        const rect = progressBar.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = clickX / rect.width;

        const token = localStorage.getItem('access_token');
        await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${Math.floor(percentage * currentDuration)}&device_id=${activeDeviceId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        setTimeout(() => { isSeeking = false; }, 500);
    });
}

function updateNowPlayingQueue() {
        const list = document.getElementById('nowPlayingQueue');
        list.innerHTML = '';

        playingQueue.forEach((trackItem, index) => {
            const li = document.createElement('li');
            li.className = 'queue-item';
            li.innerHTML =`
            <span>${index + 1}. ${trackItem.item.name} - ${trackItem.item.artists[0].name}</span>
            <i class="fa-solid fa-grip-lines drag-handle"></i>
            `;
            li.draggable = true;
            li.addEventListener('click', () => {
                currentTrackIndex = index;
                playSong(trackItem.item, false);
            });
            li.addEventListener('dragstart', () => { draggedIndex = index; });
            li.addEventListener('dragover', (e) => { e.preventDefault(); });
            li.addEventListener('drop', () => {
                const draggedTrack = playingQueue.splice(draggedIndex, 1)[0];
                playingQueue.splice(index, 0, draggedTrack);
                displayQueue(playingQueue, false);
                updateNowPlayingQueue();
            });
            list.appendChild(li);            
        });
    }

const themeToggle = document.querySelector('.theme-toggle');
const body = document.querySelector('body');

themeToggle.addEventListener('click', () => {
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
    } else {
        body.setAttribute('data-theme', 'dark');
    }
});

const connectBtn = document.getElementById('connectBtn');
connectBtn.addEventListener('click', () => {
    loginWithSpotify();
});

const playBtn = document.getElementById('playBtn');
let isPlaying = false;

playBtn.addEventListener('click', async () => {
    const token = localStorage.getItem('access_token');

    if (isPlaying) {
        await fetch('https://api.spotify.com/v1/me/player/pause', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        isPlaying = false;
        updatePlayButtons(false);
    } else {
        await fetch('https://api.spotify.com/v1/me/player/play', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                device_id: activeDeviceId
            })
        });
        isPlaying = true;
        updatePlayButtons(true);
    }
});

const nextBtn = document.getElementById('nextBtn');

nextBtn.addEventListener('click', async () => {
    if (playingQueue.length === 0) return;

    currentTrackIndex = (currentTrackIndex + 1) % playingQueue.length;
    const nextTrack = playingQueue[currentTrackIndex].item;
    await playSong(nextTrack, false);
});

const prevBtn = document.getElementById('prevBtn');

prevBtn.addEventListener('click', async () => {
    if (playingQueue.length === 0) return;

    currentTrackIndex = (currentTrackIndex - 1 + playingQueue.length) % playingQueue.length;
    const prevTrack = playingQueue[currentTrackIndex].item;
    await playSong(prevTrack, false);
});

document.getElementById('miniPlayBtn').addEventListener('click', async () => {
    const token = localStorage.getItem('access_token');

    if(isPlaying) {
        await fetch('https://api.spotify.com/v1/me/player/pause', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        isPlaying = false;
        updatePlayButtons(false);
    } else {
        await fetch('https://api.spotify.com/v1/me/player/play', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_id: activeDeviceId })
        });
        isPlaying = true;
        updatePlayButtons(true);
    }
});

document.getElementById('miniPlayBtn2').addEventListener('click', async () => {
    const token = localStorage.getItem('access_token');

    if(isPlaying) {
        await fetch('https://api.spotify.com/v1/me/player/pause', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        isPlaying = false;
        updatePlayButtons(false);
    } else {
        await fetch('https://api.spotify.com/v1/me/player/play', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_id: activeDeviceId })
        });
        isPlaying = true;
        updatePlayButtons(true);
    }
});

document.getElementById('queuePanelBtn').addEventListener('click', () => {
    const list = document.getElementById('nowPlayingQueue');
    const icon = document.querySelector('#queuePanelBtn i');
    
    if (list.style.display === 'none') {
        list.style.display = 'flex';
        icon.style.transform = 'rotate(180deg)';
    } else {
        list.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
    }
});

document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
        const token = localStorage.getItem('access_token');
        const response = await fetch('https://api.spotify.com/v1/me/player', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok || response.status === 204) return;
        const data = await response.json();
        if (data && !data.is_playing && playingQueue.length > 0) {
            const nextIndex = currentTrackIndex + 1;
            if (nextIndex >= playingQueue.length) return;
            currentTrackIndex = nextIndex;
            await playSong(playingQueue[currentTrackIndex].item, false);
        }
    }
});

setupSeekBar();
handleCallback();