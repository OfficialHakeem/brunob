const playButton = document.getElementById('play');
const pauseButton = document.getElementById('pause');
const prevButton = document.getElementById('prev');
const nextButton = document.getElementById('next');
const volumeSlider = document.getElementById('volume');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress');
const playlistEl = document.getElementById('playlist');
const songTitleEl = document.getElementById('song-title');
const songArtistEl = document.getElementById('song-artist');
const currentTimeEl = document.getElementById('current-time');
const totalDurationEl = document.getElementById('total-duration');
const shuffleButton = document.getElementById('shuffle');
const repeatButton = document.getElementById('repeat');
const themeToggleButton = document.getElementById('theme-toggle');
const albumArtPlaceholder = document.getElementById('album-art-placeholder');
const toastContainer = document.getElementById('toast-container');
const playlistToggleBtn = document.getElementById('playlist-toggle-btn');
const playlistDrawer = document.getElementById('playlist-drawer');
const playlistCloseBtn = document.getElementById('playlist-close-btn');

const statsButton = document.getElementById('stats-button');
const statsModal = document.getElementById('stats-modal');
const closeModalButton = document.querySelector('.close-modal');
const totalTimeElement = document.getElementById('total-time');
const tracksPlayedElement = document.getElementById('tracks-played');
const topSongsListElement = document.getElementById('top-songs-list');

const scWidget = document.getElementById('soundcloud-widget');

let player; 
let currentSongIndex = 0;
let isShuffle = false;
let repeatMode = 'none'; // 'none', 'one', 'all'
let isPlayerReady = false;
let progressInterval = null;

let playStartTime = 0;
let currentSongPlayTime = 0;
let trackingInterval;

// Estructura para estadísticas
let listeningStats = {
    totalListeningTime: 0,  
    songStats: {}
};

const playlist = [
    { 
        title: "So Far - Rekuya Remix", 
        artist: "Ólafur Arnalds", 
        url: "https://soundcloud.com/rekuyamusic/olafur-arnalds-so-far-rekuya-remix",
        cover: "placeholder_olafur.jpg"
    },
    { 
        title: "Lensko - Cetus", 
        artist: "Lensko", 
        url: "https://soundcloud.com/lensko/lensko-cetus",
        cover: "placeholder_lensko.jpg"
    }
];

let wakeLock = null;

function initializeSoundCloudWidget() {
    const widgetUrl = "https://w.soundcloud.com/player/?url=";
    
    if (playlist.length > 0) {
        const firstSongUrl = encodeURIComponent(playlist[0].url);
        scWidget.src = `${widgetUrl}${firstSongUrl}&auto_play=false&color=%23ff5500&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`;
        
        player = SC.Widget(scWidget);
        
        player.bind(SC.Widget.Events.READY, onPlayerReady);
        player.bind(SC.Widget.Events.PLAY_PROGRESS, onPlayProgress);
        player.bind(SC.Widget.Events.FINISH, onTrackFinish);
    }
}

// Eventos del widget de SoundCloud
function onPlayerReady() {
    console.log("SoundCloud player is ready");
    isPlayerReady = true;
    
    // Configurar un estado inicial mejor
    if (localStorage.getItem('scPlayerLastSong')) {
        loadState();
    } else {
        // Si no hay estado guardado, al menos configuramos el volumen
        player.setVolume(parseInt(volumeSlider.value));
        
        if (playlist.length > 0) {
            // Opcional: cargar la primera canción automáticamente
            loadSong(0);
        }
    }
}

function onPlayProgress() {
    if (progressInterval === null) {
        progressInterval = setInterval(updateProgressFromPlayer, 100);
    }
}

function onTrackFinish() {
    console.log("Track finished");
    handleSongEnd();
}

// Actualizar la barra de progreso en tiempo real
function updateProgressFromPlayer() {
    if (!isPlayerReady) return;
    player.getPosition(function(position) {
        player.getDuration(function(duration) {
            if (duration > 0 && !isNaN(position) && !isNaN(duration)) {
                const percent = (position / duration) * 100;
                progressBar.style.width = `${percent}%`;
                currentTimeEl.textContent = formatTime(position / 1000);
                totalDurationEl.textContent = formatTime(duration / 1000);
            } else {
                progressBar.style.width = '0%';
                currentTimeEl.textContent = '0:00';
                if (!isNaN(duration)) {
                    totalDurationEl.textContent = formatTime(duration / 1000);
                } else {
                    totalDurationEl.textContent = '0:00';
                }
            }
        });
    });
}

// Formatear tiempo de segundos a minutos:segundos
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// Formatear tiempo para mostrar en estadísticas (horas y minutos)
function formatTimeHM(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

// Cargar y reproducir una canción específica
function loadSong(index, autoplay = false) {
    if (!isPlayerReady || index >= playlist.length || index < 0) {
        console.error("Player not ready or invalid song index:", index);
        return;
    }
    
    currentSongIndex = index;
    const song = playlist[index];
    
    songTitleEl.textContent = song.title;
    songArtistEl.textContent = song.artist;
    
    // Cargar la canción en el widget
    player.load(song.url, { 
        auto_play: false, // Mantenemos esto en false para controlar la reproducción manualmente
        callback: function() {
            console.log(`Loaded song: ${song.title}`);
            updateActivePlaylistItem();
            
            // Obtener artwork (imagen de portada) desde la API de SoundCloud
            player.getCurrentSound(function(currentSound) {
                let artworkUrl = 'placeholder.png';
                
                if (currentSound && currentSound.artwork_url) {
                    artworkUrl = currentSound.artwork_url.replace('large', 't500x500');
                    albumArtPlaceholder.src = artworkUrl;
                    console.log("Artwork loaded from SoundCloud:", artworkUrl);
                } else if (song.cover) {
                    artworkUrl = song.cover;
                    albumArtPlaceholder.src = song.cover;
                } else {
                    albumArtPlaceholder.src = 'placeholder.png';
                }
                
                // Configurar Media Session API para controles en notificaciones
                setupMediaSession(song, artworkUrl);
            });
            
            showToastNotification(song.title, song.artist);
            
            player.getDuration(function(duration) {
                totalDurationEl.textContent = formatTime(duration / 1000);
                updateProgressFromPlayer();
                
                // Reproducir automáticamente si se solicitó
                if (autoplay) {
                    playSong();
                }
            });
        }
    });
    
    document.querySelector('.player-ui-container').classList.add('fade');
    setTimeout(() => {
        document.querySelector('.player-ui-container').classList.remove('fade');
    }, 300);
}

// Configurar Media Session API para controles en la notificación
function setupMediaSession(song, artworkUrl) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title,
            artist: song.artist,
            album: 'BrunoB Music Player',
            artwork: [
                { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' }
            ]
        });

        // Acciones de control multimedia
        navigator.mediaSession.setActionHandler('play', () => {
            playSong();
        });
        
        navigator.mediaSession.setActionHandler('pause', () => {
            pauseSong();
        });
        
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            prevSong();
        });
        
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            nextSong();
        });
        
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime) {
                if (isPlayerReady) {
                    player.seekTo(details.seekTime * 1000); // Convertir a milisegundos
                }
            }
        });
    }
}

// Actualizar el estado de la MediaSession
function updateMediaSessionState(isPlaying) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
}

// Resaltar la canción activa en la playlist
function updateActivePlaylistItem() {
    Array.from(playlistEl.children).forEach((item, idx) => {
        item.classList.toggle('active', idx === currentSongIndex);
    });
}

// Generar elementos de la lista de reproducción
function renderPlaylist() {
    playlistEl.innerHTML = '';
    
    playlist.forEach((song, index) => {
        const li = document.createElement('li');
        li.classList.add('playlist-item');
        li.innerHTML = `
            <span class="playlist-item-title">${song.title}</span>
            <span class="playlist-item-artist">${song.artist}</span>
        `;
        
        li.addEventListener('click', () => {
            currentSongIndex = index;
            loadSong(currentSongIndex);
            playSong();
        });
        
        playlistEl.appendChild(li);
    });
}

// Funciones de control de reproducción
function playSong() {
    if (!isPlayerReady) return;
    player.play();
    playButton.style.display = 'none';
    pauseButton.style.display = 'flex';
    albumArtPlaceholder.classList.add('playing');
    console.log("Playing song");
    
    // Actualizar MediaSession y mantener la pantalla encendida
    updateMediaSessionState(true);
    requestWakeLock();
    
    // Iniciar seguimiento de tiempo
    startTimeTracking();
}

function pauseSong() {
    if (!isPlayerReady) return;
    player.pause();
    playButton.style.display = 'flex';
    pauseButton.style.display = 'none';
    albumArtPlaceholder.classList.remove('playing');
    console.log("Paused song");
    
    // Actualizar MediaSession
    updateMediaSessionState(false);
    
    // Detener seguimiento y guardar estadísticas
    stopTimeTracking();
}

function prevSong() {
    if (!isPlayerReady) return;
    
    // Detener seguimiento y guardar estadísticas
    stopTimeTracking();
    
    if (isShuffle) {
        playRandomSong();
    } else {
        const newIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
        loadSong(newIndex, true); // Añadir true para reproducción automática
    }
}

function nextSong() {
    if (!isPlayerReady) return;
    
    // Detener seguimiento y guardar estadísticas
    stopTimeTracking();
    
    if (isShuffle) {
        playRandomSong();
    } else {
        const newIndex = (currentSongIndex + 1) % playlist.length;
        loadSong(newIndex, true); // Añadir true para reproducción automática
    }
}

function playRandomSong() {
    if (!isPlayerReady || playlist.length <= 1) return;
    
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * playlist.length);
    } while (newIndex === currentSongIndex && playlist.length > 1);
    
    loadSong(newIndex, true); // Añadir true para reproducción automática
}

// Manejar clic en la barra de progreso
function setProgress(e) {
    if (!isPlayerReady) return;
    
    const width = this.clientWidth;
    const clickX = e.offsetX;
    
    player.getDuration(function(duration) {
        const seekPosition = (clickX / width) * duration;
        player.seekTo(seekPosition);
    });
}

// Activar/desactivar reproducción aleatoria
function toggleShuffle() {
    isShuffle = !isShuffle;
    shuffleButton.classList.toggle('active', isShuffle);
    localStorage.setItem('scPlayerShuffle', isShuffle);
}

// Cambiar modo de repetición
function toggleRepeat() {
    if (repeatMode === 'none') {
        repeatMode = 'all';
        repeatButton.setAttribute('title', 'Repetir todo');
    } else if (repeatMode === 'all') {
        repeatMode = 'one';
        repeatButton.setAttribute('title', 'Repetir una');
    } else {
        repeatMode = 'none';
        repeatButton.setAttribute('title', 'No repetir');
    }
    
    repeatButton.classList.toggle('active', repeatMode !== 'none');
    localStorage.setItem('scPlayerRepeat', repeatMode);
}

// Manejar fin de canción según el modo de repetición
function handleSongEnd() {
    if (repeatMode === 'one') {
        player.seekTo(0);
        playSong();
    } else if (repeatMode === 'all' || currentSongIndex < playlist.length - 1) {
        nextSong(); // Ya incluye autoplay = true
    } else {
        currentSongIndex = 0;
        loadSong(currentSongIndex, false); // No reproducir automáticamente al final de la lista
    }
}

// Guardar estado en LocalStorage
function saveState() {
    localStorage.setItem('scPlayerLastSong', JSON.stringify({
        index: currentSongIndex,
        volume: volumeSlider.value
    }));
}

// Cargar estado desde LocalStorage
function loadState() {
    const currentTheme = localStorage.getItem('scPlayerTheme') || 'dark';
    document.body.className = currentTheme + '-mode';
    
    isShuffle = localStorage.getItem('scPlayerShuffle') === 'true';
    shuffleButton.classList.toggle('active', isShuffle);
    
    repeatMode = localStorage.getItem('scPlayerRepeat') || 'none';
    if (repeatMode === 'all') repeatButton.setAttribute('title', 'Repetir todo');
    else if (repeatMode === 'one') repeatButton.setAttribute('title', 'Repetir una');
    else repeatButton.setAttribute('title', 'No repetir');
    repeatButton.classList.toggle('active', repeatMode !== 'none');
    
    const lastSongData = JSON.parse(localStorage.getItem('scPlayerLastSong'));
    if (isPlayerReady) {
        if (lastSongData && playlist[lastSongData.index]) {
            currentSongIndex = lastSongData.index;
            volumeSlider.value = lastSongData.volume || 50;
            player.setVolume(parseInt(volumeSlider.value));
            loadSong(currentSongIndex);
        } else if (playlist.length > 0) {
            volumeSlider.value = 50;
            player.setVolume(50);
            loadSong(0);
        }
    } else {
        console.warn("Player not ready during loadState, will try to load song when ready.");
    }
}

// Alternar tema claro/oscuro
function toggleTheme() {
    if (document.body.classList.contains('dark-mode')) {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        localStorage.setItem('scPlayerTheme', 'light');
    } else {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
        localStorage.setItem('scPlayerTheme', 'dark');
    }
}

// Toast Notification Function
function showToastNotification(title, artist) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="toast-title">${title}</span><br><span class="toast-artist">${artist}</span>`;
    toastContainer.appendChild(toast);

    toast.offsetHeight;

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 2500);
}

// Playlist Drawer Toggle Functionality
function togglePlaylistDrawer() {
    playlistDrawer.classList.toggle('open');
}

// Cargar estadísticas desde localStorage
function loadStats() {
    const savedStats = localStorage.getItem('scPlayerStats');
    if (savedStats) {
        listeningStats = JSON.parse(savedStats);
    }
}

// Guardar estadísticas en localStorage
function saveStats() {
    localStorage.setItem('scPlayerStats', JSON.stringify(listeningStats));
}

// Iniciar seguimiento de tiempo cuando se reproduce una canción
function startTimeTracking() {
    if (!isPlayerReady) return;
    
    playStartTime = Date.now();
    
    if (trackingInterval) {
        clearInterval(trackingInterval);
    }
    
    // Actualizar tiempo cada segundo
    trackingInterval = setInterval(() => {
        // Acumular tiempo de reproducción para la canción actual
        currentSongPlayTime = Math.floor((Date.now() - playStartTime) / 1000);
    }, 1000);
}

// Detener seguimiento de tiempo
function stopTimeTracking() {
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
    }
    
    if (playStartTime > 0 && currentSongIndex >= 0 && currentSongIndex < playlist.length) {
        // Obtener la URL de la canción actual como identificador
        const songUrl = playlist[currentSongIndex].url;
        
        // Actualizar estadísticas para esta canción
        if (!listeningStats.songStats[songUrl]) {
            listeningStats.songStats[songUrl] = {
                title: playlist[currentSongIndex].title,
                artist: playlist[currentSongIndex].artist,
                playCount: 0,
                totalTimeListened: 0
            };
        }
        
        // Incrementar contadores
        listeningStats.songStats[songUrl].playCount += 1;
        listeningStats.songStats[songUrl].totalTimeListened += currentSongPlayTime;
        listeningStats.totalListeningTime += currentSongPlayTime;
        
        // Guardar estadísticas actualizadas
        saveStats();
    }
    
    // Reiniciar contadores
    playStartTime = 0;
    currentSongPlayTime = 0;
}

// Mostrar estadísticas en el modal
function showStats() {
    // Mostrar tiempo total
    totalTimeElement.textContent = formatTimeHM(listeningStats.totalListeningTime);
    
    // Contar canciones únicas reproducidas
    const tracksPlayed = Object.keys(listeningStats.songStats).length;
    tracksPlayedElement.textContent = tracksPlayed;
    
    // Obtener canciones más escuchadas
    const topSongs = Object.entries(listeningStats.songStats)
        .map(([url, stats]) => ({ url, ...stats }))
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 5); // Top 5
    
    // Limpiar lista previa
    topSongsListElement.innerHTML = '';
    
    // Generar lista de canciones más escuchadas
    if (topSongs.length > 0) {
        topSongs.forEach((song, index) => {
            const songItem = document.createElement('div');
            songItem.className = 'top-song-item';
            songItem.innerHTML = `
                <div class="song-rank">#${index + 1}</div>
                <div class="top-song-info">
                    <div class="top-song-title">${song.title}</div>
                    <div class="top-song-artist">${song.artist}</div>
                </div>
                <div class="song-stats">
                    <div class="play-count">${song.playCount} reproducciones</div>
                    <div class="time-listened">${formatTimeHM(song.totalTimeListened)}</div>
                </div>
            `;
            topSongsListElement.appendChild(songItem);
        });
    } else {
        topSongsListElement.innerHTML = '<div class="no-stats">Aún no has escuchado ninguna canción</div>';
    }
    
    // Mostrar modal con animación
    statsModal.classList.add('show');
}

// Mantener la pantalla encendida durante la reproducción
async function requestWakeLock() {
    if ('wakeLock' in navigator && !wakeLock) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock activado');
            
            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock liberado');
                wakeLock = null;
            });
        } catch (err) {
            console.error(`Error al activar Wake Lock: ${err.name}, ${err.message}`);
        }
    }
}

// Liberar el WakeLock cuando sea necesario
function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release()
            .then(() => {
                wakeLock = null;
            });
    }
}

// Registrar el Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registrado con éxito:', registration);
                })
                .catch(error => {
                    console.log('Error al registrar el Service Worker:', error);
                });
        });
    }
}

// Configurar eventos
function setupEventListeners() {
    playButton.addEventListener('click', playSong);
    pauseButton.addEventListener('click', pauseSong);
    prevButton.addEventListener('click', prevSong);
    nextButton.addEventListener('click', nextSong);
    volumeSlider.addEventListener('input', (e) => {
        if (isPlayerReady) {
            player.setVolume(e.target.value);
            saveState();
        }
    });
    progressContainer.addEventListener('click', setProgress);
    shuffleButton.addEventListener('click', toggleShuffle);
    repeatButton.addEventListener('click', toggleRepeat);
    themeToggleButton.addEventListener('click', toggleTheme);
    playlistToggleBtn.addEventListener('click', togglePlaylistDrawer);
    playlistCloseBtn.addEventListener('click', togglePlaylistDrawer);

    document.addEventListener('click', function(event) {
        if (playlistDrawer.classList.contains('open') && 
            !playlistDrawer.contains(event.target) && 
            !playlistToggleBtn.contains(event.target)) {
            playlistDrawer.classList.remove('open');
        }
    });

    window.addEventListener('beforeunload', () => {
        saveState();
        stopTimeTracking();
    });

    // Eventos para el modal de estadísticas
    statsButton.addEventListener('click', showStats);
    closeModalButton.addEventListener('click', () => {
        statsModal.classList.remove('show');
    });
    
    // Cerrar modal al hacer clic fuera de él
    statsModal.addEventListener('click', (e) => {
        if (e.target === statsModal) {
            statsModal.classList.remove('show');
        }
    });
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Mostrar un estado de "cargando" en la interfaz
    songTitleEl.textContent = "Cargando...";
    songArtistEl.textContent = "Iniciando reproductor";
    
    renderPlaylist();
    initializeSoundCloudWidget();
    setupEventListeners();
    loadStats();
    registerServiceWorker();
    
    // Manejar visibilidad para seguir/detener la reproducción cuando la pestaña no está visible
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            // La pestaña es visible
            console.log("Pestaña visible");
        } else {
            // La pestaña no es visible, pero la música seguirá sonando
            console.log("Pestaña en segundo plano");
        }
    });

    if (!localStorage.getItem('scPlayerTheme')) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.className = localStorage.getItem('scPlayerTheme') + '-mode';
    }
});

// Limpiar recursos cuando se cierra o recarga la página
window.addEventListener('beforeunload', () => {
    saveState();
    stopTimeTracking();
    releaseWakeLock();
});
