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
    let currentSongType = null; 
    let shuffleMode = true;

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

    function extractMediaId(url, type) {
        if (type === 'youtube') {
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
            const match = url.match(regExp);
            return (match && match[2].length === 11) ? match[2] : null;
        }
        else if (type === 'soundcloud') {
            return url;
        }
        return null;
    }

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
            
            navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
            
            if (song.duration) {
                navigator.mediaSession.setPositionState({
                    duration: song.duration,
                    playbackRate: 1,
                    position: 0
                });
            }
        }
    }
    
    function updateMediaSessionPosition(currentTime, duration) {
        if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
            navigator.mediaSession.setPositionState({
                duration: duration,
                playbackRate: 1,
                position: currentTime
            });
        }
    }

    function togglePlay() {
        if (currentSongType === 'youtube') {
            const currentVideoId = youtubePlayer.src.split('/').pop().split('?')[0];
            
            if (isPlaying) {
                youtubePlayer.src = `https://www.youtube.com/embed/${currentVideoId}`;
                playButton.innerHTML = '<span class="icon">▶</span>';
                isPlaying = false;
                clearInterval(youtubeProgressInterval);
            } else {
                youtubePlayer.src = `https://www.youtube.com/embed/${currentVideoId}?autoplay=1`;
                playButton.innerHTML = '<span class="icon">⏸</span>';
                isPlaying = true;
                startYoutubeProgressTimer();
            }
            
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
            }
        } 
        else if (currentSongType === 'soundcloud') {
            if (isPlaying) {
                soundcloudPlayer.contentWindow.postMessage('{"method":"pause"}', '*');
                playButton.innerHTML = '<span class="icon">▶</span>';
                isPlaying = false;
                clearInterval(soundcloudProgressInterval);
            } else {
                soundcloudPlayer.contentWindow.postMessage('{"method":"play"}', '*');
                playButton.innerHTML = '<span class="icon">⏸</span>';
                isPlaying = true;
                startSoundcloudProgressTimer();
            }
            
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
            }
        }
        else if (audioPlayer.src) {
            if (audioPlayer.paused) {
                audioPlayer.play();
                playButton.innerHTML = '<span class="icon">⏸</span>';
                isPlaying = true;
            } else {
                audioPlayer.pause();
                playButton.innerHTML = '<span class="icon">▶</span>';
                isPlaying = false;
            }
            
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
            }
        }
    }

    function updateProgress() {
        if (audioPlayer.duration) {
            const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            progressFill.style.width = percent + '%';
            
            currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
            durationDisplay.textContent = formatTime(audioPlayer.duration);
        }
    }

    function simulateYoutubeProgress() {
        const currentTime = (Date.now() - currentYoutubeStartTime) / 1000;
        
        if (currentTime <= currentYoutubeDuration) {
            const percent = (currentTime / currentYoutubeDuration) * 100;
            progressFill.style.width = percent + '%';
            
            currentTimeDisplay.textContent = formatTime(currentTime);
            durationDisplay.textContent = formatTime(currentYoutubeDuration);
            
            updateMediaSessionPosition(currentTime, currentYoutubeDuration);
        } else {
            clearInterval(youtubeProgressInterval);
            playNextSong();
        }
    }
    
    function startYoutubeProgressTimer() {
        clearInterval(youtubeProgressInterval);
        currentYoutubeStartTime = Date.now();
        youtubeProgressInterval = setInterval(simulateYoutubeProgress, 1000);
    }

    function simulateSoundcloudProgress() {
        const currentTime = (Date.now() - currentYoutubeStartTime) / 1000;
        
        if (currentTime <= currentYoutubeDuration) {
            const percent = (currentTime / currentYoutubeDuration) * 100;
            progressFill.style.width = percent + '%';
            
            currentTimeDisplay.textContent = formatTime(currentTime);
            durationDisplay.textContent = formatTime(currentYoutubeDuration);
            
            updateMediaSessionPosition(currentTime, currentYoutubeDuration);
        } else {
            // La canción ha terminado, reproduce la siguiente
            clearInterval(soundcloudProgressInterval);
            playNextSong();
        }
    }
    
    function startSoundcloudProgressTimer() {
        clearInterval(soundcloudProgressInterval);
        currentYoutubeStartTime = Date.now();
        soundcloudProgressInterval = setInterval(simulateSoundcloudProgress, 1000);
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' + secs : secs}`;
    }

    function setProgress(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        
        if (audioPlayer.duration) {
            audioPlayer.currentTime = (clickX / width) * audioPlayer.duration;
        } else if (currentYoutubeDuration > 0) {

            const newTime = (clickX / width) * currentYoutubeDuration;
            const timePassedSinceStart = (Date.now() - currentYoutubeStartTime) / 1000;
            currentYoutubeStartTime = Date.now() - (newTime * 1000);
            simulateYoutubeProgress();
        }
    }

    function getRandomSong() {
        const availableSongs = songs.filter(song => song.id != currentSongId);
        
        if (availableSongs.length === 0) {
            return null; 
        }
        
        const randomIndex = Math.floor(Math.random() * availableSongs.length);
        return availableSongs[randomIndex];
    }

    function playNextSong() {
        stopCurrentPlayback();
        
        let nextSong;
        
        if (shuffleMode) {
            nextSong = getRandomSong();
        } else {
            const currentIndex = findCurrentIndex();
            if (currentIndex !== -1 && currentIndex < songs.length - 1) {
                nextSong = songs[currentIndex + 1];
            }
        }
        
        if (nextSong) {
            playSong(nextSong);
            const nextLi = playlistList.querySelector(`li[data-id='${nextSong.id}']`);
            if (nextLi) {
                nextLi.click();
            }
        }
    }

    // Función para ir a la canción anterior
    function playPrevSong() {
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
    function stopCurrentPlayback() {
        if (currentSongType === 'youtube') {
            // Detener YouTube
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

    function findCurrentIndex() {
        return songs.findIndex(song => song.id == currentSongId);
    }

    function playSong(song) {
        currentSongId = song.id;
        currentSongType = song.type;
        document.getElementById('currentSongTitle').textContent = song.title;
        
        audioPlayer.style.display = "none";
        youtubeContainer.style.display = "none";
        soundcloudContainer.style.display = "none";
        
        clearInterval(youtubeProgressInterval);
        clearInterval(soundcloudProgressInterval);
        
        if (song.type === 'youtube') {
            const youtubeId = extractMediaId(song.src, 'youtube');
            if (youtubeId) {
                currentYoutubeDuration = song.duration || 240;
                
                youtubePlayer.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1`;
                youtubeContainer.style.display = "block";
                isPlaying = true;
                playButton.innerHTML = '<span class="icon">⏸</span>';
                
                startYoutubeProgressTimer();
                
                setupMediaSession(song);
            } else {
                console.error("No se pudo extraer el ID de YouTube:", song.src);
            }
        } 
        else if (song.type === 'soundcloud') {
            const soundcloudUrl = song.src;
            
            currentYoutubeDuration = song.duration || 240;
            
            const soundcloudEmbedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloudUrl)}&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false`;
            soundcloudPlayer.src = soundcloudEmbedUrl;
            soundcloudContainer.style.display = "block";
            isPlaying = true;
            playButton.innerHTML = '<span class="icon">⏸</span>';
            
            startSoundcloudProgressTimer();
            setupMediaSession(song);
        } else {
            audioPlayer.src = song.src;
            audioPlayer.style.display = "block";
            
            if (isPlaying) {
                audioPlayer.play();
            } else {
                playButton.innerHTML = '<span class="icon">▶</span>';
            }
          
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
            isPlaying = true;
            playButton.innerHTML = '<span class="icon">⏸</span>';
            audioPlayer.play();
        }
    }

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
