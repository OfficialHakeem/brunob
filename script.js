document.addEventListener("DOMContentLoaded", function() {
    const songs = [
        { 
            id: 1, 
            title: 'tv off', 
            src: 'https://soundcloud.com/kendrick-lamar-music/tv-off', 
            tags: ['Hype'], 
            type: 'soundcloud',
            duration: 220 // 3:40 minutos
        },
        { 
            id: 2, 
            title: 'Falling', 
            src: 'https://soundcloud.com/hip-hop-center/nightcore-falling', 
            tags: ['nightcore', 'Sad'], 
            type: 'soundcloud',
            duration: 148  // 2:28 minutos
        },
        { 
            id: 3, 
            title: 'The One That Got Away', 
            src: 'https://www.youtube.com/watch?v=FY1QOsrnJB0', 
            tags: ['nightcore', 'Sad'], 
            type: 'youtube',
            duration: 205  // 3:25 minutos
        },
        {
            id: 4,
            title: 'So Far',
            src: 'https://soundcloud.com/rekuyamusic/olafur-arnalds-so-far-rekuya-remix',
            tags: ['lofi', 'chill'],
            type: 'soundcloud',
            duration: 301  // 4:59 minutos
        }
    ];

    const playlistList = document.getElementById('playlistList');
    const tagButtons = document.querySelectorAll('.tag-buttons button');
    const audioPlayer = document.getElementById("audioPlayer");
    const youtubeContainer = document.getElementById("youtubeContainer");
    const youtubePlayer = document.getElementById("youtubePlayer");
    const soundcloudContainer = document.getElementById("soundcloudContainer");
    const soundcloudPlayer = document.getElementById("soundcloudPlayer");
    
    // Controles personalizados
    const playButton = document.getElementById('playButton');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const progressBar = document.querySelector('.progress-bar');
    const progressFill = document.querySelector('.progress-fill');
    const currentTimeDisplay = document.getElementById('currentTime');
    const durationDisplay = document.getElementById('duration');
    
    let currentSongId = null;
    let currentSongTags = {};
    let isPlaying = false;
    let currentSongType = null; // Para saber qué tipo de canción está reproduciéndose
    let shuffleMode = true; // Modo aleatorio activado por defecto

    // Variables para manejar el progreso simulado de YouTube
    let currentYoutubeStartTime = 0;
    let currentYoutubeDuration = 0;
    let youtubeProgressInterval = null;
    let soundcloudProgressInterval = null;

    function renderPlaylist(filteredSongs) {
        playlistList.innerHTML = ''; 
        filteredSongs.forEach(song => {
            const li = document.createElement('li');
            li.textContent = song.title;
            li.dataset.id = song.id;
            li.dataset.src = song.src;
            li.dataset.tags = Array.isArray(song.tags) ? song.tags.join(',') : song.tags;
            li.dataset.type = song.type || 'local'; 
            li.addEventListener('click', onSelectSong);
            playlistList.appendChild(li);
        });
        document.getElementById('playlist').style.display = 'block';
    }

    // Función para extraer el ID de video de una URL de YouTube o SoundCloud
    function extractMediaId(url, type) {
        if (type === 'youtube') {
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
            const match = url.match(regExp);
            return (match && match[2].length === 11) ? match[2] : null;
        }
        else if (type === 'soundcloud') {
            // Para SoundCloud, usamos la URL completa
            return url;
        }
        return null;
    }

    // Función para configurar la Media Session API para reproducción en segundo plano
    function setupMediaSession(song) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title,
                artist: song.artist || 'Artista desconocido',
                album: song.album || 'Álbum desconocido',
                artwork: [
                    { src: song.artwork || './default-artwork.jpg', sizes: '512x512', type: 'image/jpeg' }
                ]
            });

            // Configurar manejadores de acciones para los controles de medios
            navigator.mediaSession.setActionHandler('play', () => {
                if (!isPlaying) togglePlay();
            });
            
            navigator.mediaSession.setActionHandler('pause', () => {
                if (isPlaying) togglePlay();
            });
            
            navigator.mediaSession.setActionHandler('previoustrack', () => {
                playPrevSong();
            });
            
            navigator.mediaSession.setActionHandler('nexttrack', () => {
                playNextSong();
            });
            
            // Actualizar el estado de reproducción
            navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
            
            // Configurar manejo de posición (barra de progreso)
            if (song.duration) {
                navigator.mediaSession.setPositionState({
                    duration: song.duration,
                    playbackRate: 1,
                    position: 0
                });
            }
        }
    }
    
    // Función que actualiza la posición de la Media Session
    function updateMediaSessionPosition(currentTime, duration) {
        if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
            navigator.mediaSession.setPositionState({
                duration: duration,
                playbackRate: 1,
                position: currentTime
            });
        }
    }

    // Función para reproducir o pausar la música
    function togglePlay() {
        if (currentSongType === 'youtube') {
            const currentVideoId = youtubePlayer.src.split('/').pop().split('?')[0];
            
            if (isPlaying) {
                // Pausa: recargar iframe sin autoplay
                youtubePlayer.src = `https://www.youtube.com/embed/${currentVideoId}`;
                playButton.innerHTML = '<span class="icon">▶</span>';
                isPlaying = false;
                clearInterval(youtubeProgressInterval);
            } else {
                // Play: recargar iframe con autoplay
                youtubePlayer.src = `https://www.youtube.com/embed/${currentVideoId}?autoplay=1`;
                playButton.innerHTML = '<span class="icon">⏸</span>';
                isPlaying = true;
                startYoutubeProgressTimer();
            }
            
            // Actualizar estado de Media Session
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
            }
        } 
        else if (currentSongType === 'soundcloud') {
            if (isPlaying) {
                // Pausar SoundCloud
                // Usando el API de SoundCloud través de postMessage
                soundcloudPlayer.contentWindow.postMessage('{"method":"pause"}', '*');
                playButton.innerHTML = '<span class="icon">▶</span>';
                isPlaying = false;
                clearInterval(soundcloudProgressInterval);
            } else {
                // Reproducir SoundCloud
                soundcloudPlayer.contentWindow.postMessage('{"method":"play"}', '*');
                playButton.innerHTML = '<span class="icon">⏸</span>';
                isPlaying = true;
                startSoundcloudProgressTimer();
            }
            
            // Actualizar estado de Media Session
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
            }
        }
        else if (audioPlayer.src) {
            // Audio local
            if (audioPlayer.paused) {
                audioPlayer.play();
                playButton.innerHTML = '<span class="icon">⏸</span>';
                isPlaying = true;
            } else {
                audioPlayer.pause();
                playButton.innerHTML = '<span class="icon">▶</span>';
                isPlaying = false;
            }
            
            // Actualizar estado de Media Session
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
            }
        }
    }

    // Función para actualizar la barra de progreso
    function updateProgress() {
        if (audioPlayer.duration) {
            const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            progressFill.style.width = percent + '%';
            
            // Actualizar tiempo
            currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
            durationDisplay.textContent = formatTime(audioPlayer.duration);
        }
    }

    // Función para simular el progreso de YouTube
    function simulateYoutubeProgress() {
        // Calcula el tiempo transcurrido desde el inicio
        const currentTime = (Date.now() - currentYoutubeStartTime) / 1000;
        
        if (currentTime <= currentYoutubeDuration) {
            // Actualiza la barra de progreso
            const percent = (currentTime / currentYoutubeDuration) * 100;
            progressFill.style.width = percent + '%';
            
            // Actualiza los displays de tiempo
            currentTimeDisplay.textContent = formatTime(currentTime);
            durationDisplay.textContent = formatTime(currentYoutubeDuration);
            
            // Actualizar Media Session para reproducción en segundo plano
            updateMediaSessionPosition(currentTime, currentYoutubeDuration);
        } else {
            // La canción ha terminado, reproduce la siguiente
            clearInterval(youtubeProgressInterval);
            playNextSong();
        }
    }
    
    // Función para iniciar el temporizador de progreso de YouTube
    function startYoutubeProgressTimer() {
        clearInterval(youtubeProgressInterval);
        currentYoutubeStartTime = Date.now();
        youtubeProgressInterval = setInterval(simulateYoutubeProgress, 1000);
    }

    // Función para simular el progreso de SoundCloud
    function simulateSoundcloudProgress() {
        // Calcula el tiempo transcurrido desde el inicio
        const currentTime = (Date.now() - currentYoutubeStartTime) / 1000;
        
        if (currentTime <= currentYoutubeDuration) {
            // Actualiza la barra de progreso
            const percent = (currentTime / currentYoutubeDuration) * 100;
            progressFill.style.width = percent + '%';
            
            // Actualiza los displays de tiempo
            currentTimeDisplay.textContent = formatTime(currentTime);
            durationDisplay.textContent = formatTime(currentYoutubeDuration);
            
            // Actualizar Media Session para reproducción en segundo plano
            updateMediaSessionPosition(currentTime, currentYoutubeDuration);
        } else {
            // La canción ha terminado, reproduce la siguiente
            clearInterval(soundcloudProgressInterval);
            playNextSong();
        }
    }
    
    // Función para iniciar el temporizador de progreso de SoundCloud
    function startSoundcloudProgressTimer() {
        clearInterval(soundcloudProgressInterval);
        currentYoutubeStartTime = Date.now();
        soundcloudProgressInterval = setInterval(simulateSoundcloudProgress, 1000);
    }

    // Función para formatear el tiempo en minutos:segundos
    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' + secs : secs}`;
    }

    // Función para cambiar la posición en la canción
    function setProgress(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        
        if (audioPlayer.duration) {
            // Si es una fuente de audio local
            audioPlayer.currentTime = (clickX / width) * audioPlayer.duration;
        } else if (currentYoutubeDuration > 0) {
            // Si es un video de YouTube, simula el salto
            const newTime = (clickX / width) * currentYoutubeDuration;
            const timePassedSinceStart = (Date.now() - currentYoutubeStartTime) / 1000;
            currentYoutubeStartTime = Date.now() - (newTime * 1000);
            simulateYoutubeProgress();
        }
    }

    // Función para obtener una canción aleatoria diferente a la actual
    function getRandomSong() {
        // Filtramos la canción actual para no repetirla
        const availableSongs = songs.filter(song => song.id != currentSongId);
        
        if (availableSongs.length === 0) {
            return null; // No hay más canciones disponibles
        }
        
        // Elegir una canción aleatoria del array filtrado
        const randomIndex = Math.floor(Math.random() * availableSongs.length);
        return availableSongs[randomIndex];
    }

    // Función para ir a la canción siguiente
    function playNextSong() {
        // Detener la reproducción actual primero
        stopCurrentPlayback();
        
        let nextSong;
        
        if (shuffleMode) {
            // Modo aleatorio: seleccionar una canción al azar
            nextSong = getRandomSong();
        } else {
            // Modo secuencial: ir a la siguiente canción en la lista
            const currentIndex = findCurrentIndex();
            if (currentIndex !== -1 && currentIndex < songs.length - 1) {
                nextSong = songs[currentIndex + 1];
            }
        }
        
        // Si se encontró una canción para reproducir
        if (nextSong) {
            playSong(nextSong);
            
            // Actualizar la lista visual
            const nextLi = playlistList.querySelector(`li[data-id='${nextSong.id}']`);
            if (nextLi) {
                nextLi.click();
            }
        }
    }

    // Función para ir a la canción anterior
    function playPrevSong() {
        // Detener la reproducción actual primero
        stopCurrentPlayback();
        
        const currentIndex = findCurrentIndex();
        if (currentIndex > 0) {
            const prevSong = songs[currentIndex - 1];
            playSong(prevSong);
            
            // Actualizar la lista visual
            const prevLi = playlistList.querySelector(`li[data-id='${prevSong.id}']`);
            if (prevLi) {
                prevLi.click();
            }
        }
    }

    // Función para detener la reproducción actual según el tipo de medio
    function stopCurrentPlayback() {
        // Detener cualquier reproductor que esté activo
        if (currentSongType === 'youtube') {
            // Detener YouTube (cargar un src vacío)
            youtubePlayer.src = '';
            clearInterval(youtubeProgressInterval);
        } 
        else if (currentSongType === 'soundcloud') {
            // Detener SoundCloud
            soundcloudPlayer.contentWindow.postMessage('{"method":"pause"}', '*');
            soundcloudPlayer.src = '';
            clearInterval(soundcloudProgressInterval);
        }
        else if (audioPlayer.src) {
            // Detener audio local
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
        }
    }

    // Función auxiliar para encontrar el índice actual
    function findCurrentIndex() {
        return songs.findIndex(song => song.id == currentSongId);
    }

    // Función para reproducir una canción específica
    function playSong(song) {
        currentSongId = song.id;
        currentSongType = song.type;
        document.getElementById('currentSongTitle').textContent = song.title;
        
        // Ocultar todos los reproductores inicialmente
        audioPlayer.style.display = "none";
        youtubeContainer.style.display = "none";
        soundcloudContainer.style.display = "none";
        
        // Limpiar cualquier temporizador existente
        clearInterval(youtubeProgressInterval);
        clearInterval(soundcloudProgressInterval);
        
        if (song.type === 'youtube') {
            // Extraer ID del video de YouTube
            const youtubeId = extractMediaId(song.src, 'youtube');
            if (youtubeId) {
                currentYoutubeDuration = song.duration || 240; // 4 minutos por defecto
                
                // Cargar video en el iframe
                youtubePlayer.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1`;
                youtubeContainer.style.display = "block";
                isPlaying = true;
                playButton.innerHTML = '<span class="icon">⏸</span>';
                
                // Iniciar simulación de progreso
                startYoutubeProgressTimer();
                
                // Configurar Media Session para reproducción en segundo plano
                setupMediaSession(song);
            } else {
                console.error("No se pudo extraer el ID de YouTube:", song.src);
            }
        } 
        else if (song.type === 'soundcloud') {
            // Reproducir canción de SoundCloud
            const soundcloudUrl = song.src;
            
            currentYoutubeDuration = song.duration || 240; // 4 minutos por defecto
            
            // Cargar SoundCloud en iframe (oculto)
            const soundcloudEmbedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloudUrl)}&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false`;
            soundcloudPlayer.src = soundcloudEmbedUrl;
            soundcloudContainer.style.display = "block";
            isPlaying = true;
            playButton.innerHTML = '<span class="icon">⏸</span>';
            
            // Iniciar simulación de progreso
            startSoundcloudProgressTimer();
            
            // Configurar Media Session para reproducción en segundo plano
            setupMediaSession(song);
        } else {
            // Para fuentes de audio locales (mp3, etc.)
            audioPlayer.src = song.src;
            audioPlayer.style.display = "block";
            
            if (isPlaying) {
                audioPlayer.play();
            } else {
                playButton.innerHTML = '<span class="icon">▶</span>';
            }
            
            // Configurar Media Session para reproducción en segundo plano
            setupMediaSession(song);
            
            // Para audio elemento, configurar evento de actualización de tiempo
            audioPlayer.addEventListener('timeupdate', function() {
                if ('mediaSession' in navigator) {
                    updateMediaSessionPosition(audioPlayer.currentTime, audioPlayer.duration);
                }
            });
        }
        
        // Actualizar las etiquetas
        if (Array.isArray(song.tags)) {
            currentSongTags = {};
            song.tags.forEach(tag => { currentSongTags[tag] = 1; });
        } else {
            currentSongTags = {};
        }
    }

    // Eventos para los controles personalizados
    playButton.addEventListener('click', togglePlay);
    nextButton.addEventListener('click', playNextSong);
    prevButton.addEventListener('click', playPrevSong);
    // Se eliminó la capacidad de hacer clic en la barra de progreso
    
    // Actualizar la barra de progreso mientras se reproduce
    audioPlayer.addEventListener('timeupdate', updateProgress);
    
    // Cambiar a la siguiente canción cuando termine la actual
    audioPlayer.addEventListener('ended', playNextSong);

    // Función para manejar la selección de canción
    function onSelectSong() {
        const songId = this.dataset.id;
        const selectedSong = songs.find(song => song.id == songId);
        
        if (selectedSong) {
            playSong(selectedSong);
            // Activar reproducción
            isPlaying = true;
            playButton.innerHTML = '<span class="icon">⏸</span>';
            audioPlayer.play();
        }
    }

    // Lógica de filtrado por tags
    tagButtons.forEach(button => {
        button.addEventListener('click', function() {
            const selectedTag = this.dataset.tag;

            // Marcar botón activo
            tagButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // Filtrar canciones
            let filteredSongs;
            if (selectedTag === 'all') {
                filteredSongs = songs;
            } else {
                filteredSongs = songs.filter(song =>
                    Array.isArray(song.tags) && song.tags.includes(selectedTag)
                );
            }
            renderPlaylist(filteredSongs);
        });
    });

    // Renderizar la lista completa al inicio
    renderPlaylist(songs);
    document.querySelector('.tag-buttons button[data-tag="all"]').classList.add('active');

    // Reproducir primera canción al cargar
    if (songs.length > 0) {
        const firstSong = songs[0];
        playSong(firstSong);
        
        audioPlayer.play().catch(error => {
            console.warn("Autoplay fue bloqueado por el navegador:", error);
            // Actualizar estado si no se pudo reproducir
            isPlaying = false;
            playButton.innerHTML = '<span class="icon">▶</span>';
        });
    }
});
