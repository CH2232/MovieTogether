    const firebaseConfig = {
        apiKey: "AIzaSyDbwDfECl46A6zHo7vIasxZ1SAPS8lw2j0", 
        authDomain: "movietogether-192f3.firebaseapp.com",
        databaseURL: "https://movietogether-192f3-default-rtdb.asia-southeast1.firebasedatabase.app/", 
        projectId: "movietogether-192f3",
        storageBucket: "movietogether-192f3.firebasestorage.app",
        messagingSenderId: "716171400213",
        appId: "1:716171400213:web:770641cc293b3be1ddea1c"
    };

    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();

document.addEventListener('DOMContentLoaded', () => {

    const TMDB_API_KEY = '947b1a9d2c0bd3d94f2db3dfd63e390a'; 

    const homePage = document.getElementById('home-page');
    const votePage = document.getElementById('vote-page');
    const resultsPage = document.getElementById('results-page');
    const voterCardTemplate = document.getElementById('voter-card-template');

    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const findMovieBtn = document.getElementById('find-movie-btn');
    const respinBtn = document.getElementById('respin-btn');
    const startOverBtn = document.getElementById('start-over-btn');
    const goBackBtn = document.getElementById('go-back-btn');
    
    const roomIdInput = document.getElementById('room-id-input');
    const roomNicknameDisplay = document.getElementById('room-nickname-display');
    const votersContainer = document.getElementById('voters-container');
    const roomIdText = document.getElementById('room-id-text');
    const loadingSpinner = document.getElementById('loading-spinner');
    const resultsContent = document.getElementById('results-content');
    const rationaleText = document.getElementById('rationale-text');
    const moviePoster = document.getElementById('movie-poster');
    const movieTitle = document.getElementById('movie-title');
    const movieOverview = document.getElementById('movie-overview');
    const movieReleaseDate = document.getElementById('movie-release-date');
    const movieGenres = document.getElementById('movie-genres');
    const movieRuntime = document.getElementById('movie-runtime');
    const scoreCircle = document.getElementById('score-circle');
    const scoreValue = document.getElementById('score-value');
    const trailerContainer = document.getElementById('trailer-container');
    const movieTrailer = document.getElementById('movie-trailer');
    const watchProvidersContainer = document.getElementById('watch-providers-container');
    const providerLogos = document.getElementById('provider-logos');

    let currentRoomId = null;
    let currentUserId = null;
    let currentMovieList = [];
    let lastVotes = [];
    let lastCommonGenres = [];

    // ฟังก์ชันหลักของเว็บ
    function initializeApp() {
        currentUserId = localStorage.getItem('movieTogetherUserId');
        if (!currentUserId) {
            currentUserId = 'user_' + Math.random().toString(36).substring(2, 10);
            localStorage.setItem('movieTogetherUserId', currentUserId);
        }

        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('room');
        if (roomId) {
            const roomRef = database.ref('rooms/' + roomId);
            roomRef.once('value', (snapshot) => {
                if (snapshot.exists()) {
                    currentRoomId = roomId;
                    const roomData = snapshot.val();
                    const isHost = roomData.hostId === currentUserId;
                    setupVotePage(roomData.nickname, roomId, isHost);
                    listenToRoomChanges(roomId, isHost);
                    showPage('vote-page');
                } else {
                    alert("ไม่พบห้องที่คุณต้องการเข้าร่วม!");
                    window.history.pushState({}, '', window.location.pathname);
                    showPage('home-page');
                }
            });
        } else {
            showPage('home-page');
        }
    }

    function showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
    }

    function createRoom() {
        const roomId = Math.random().toString(36).substring(2, 8);
        const adj = roomAdjectives[Math.floor(Math.random() * roomAdjectives.length)];
        const noun = roomNouns[Math.floor(Math.random() * roomNouns.length)];
        const roomNickname = `ลัทธิ${noun}${adj}`;
        database.ref('rooms/' + roomId).set({
            nickname: roomNickname,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            hostId: currentUserId,
            voters: {}
        }).then(() => {
            window.location.href = `${window.location.pathname}?room=${roomId}`;
        }).catch(error => {
            console.error("Error creating room: ", error);
            alert("เกิดข้อผิดพลาดในการสร้างห้อง");
        });
    }

    function joinRoom() {
        const roomId = roomIdInput.value.trim();
        if (roomId) {
            window.location.href = `${window.location.pathname}?room=${roomId}`;
        } else {
            alert("กรุณากรอกรหัสห้อง");
        }
    }

    function setupVotePage(nickname, id, isHost) {
        roomNicknameDisplay.textContent = nickname;
        if (roomIdText && id) roomIdText.textContent = id;
        if (isHost) {
            findMovieBtn.textContent = "รอทุกคนพร้อม...";
            findMovieBtn.disabled = true;
        } else {
            findMovieBtn.textContent = "รอ Host เริ่มค้นหา...";
            findMovieBtn.disabled = true;
        }
    }

    function listenToRoomChanges(roomId, isHost) {
        const roomRef = database.ref('rooms/' + roomId);
        roomRef.on('value', (snapshot) => {
            votersContainer.innerHTML = '';
            const roomData = snapshot.val();
            if (!roomData || !roomData.voters) return;

            const voters = roomData.voters;
            const voterIds = Object.keys(voters);
            let allReady = true;

            voterIds.forEach(voterId => {
                renderVoterCard(voterId, voters[voterId]);
                if (!voters[voterId].isReady) {
                    allReady = false;
                }
            });

            if (isHost) {
                if (voterIds.length > 0 && allReady) {
                    findMovieBtn.disabled = false;
                    findMovieBtn.textContent = "ค้นหาหนังเลย!";
                } else {
                    findMovieBtn.disabled = true;
                    findMovieBtn.textContent = "รอทุกคนกดยืนยัน...";
                }
            }
            
            if (!voters[currentUserId]) {
                addCurrentUserToRoom();
            }
        });
    }

    function addCurrentUserToRoom() {
        if (!currentRoomId || !currentUserId) return;
        const newUserRef = database.ref(`rooms/${currentRoomId}/voters/${currentUserId}`);
        newUserRef.set({
            name: `ผู้เล่น #${(Math.random() * 100).toFixed(0)}`,
            genres: {},
            isReady: false
        });
    }

    function renderVoterCard(voterId, voterData) {
        const templateContent = voterCardTemplate.content.cloneNode(true);
        const newCard = templateContent.querySelector('.voter-card');
        const nameInput = newCard.querySelector('.voter-name');
        const genreContainer = newCard.querySelector('.genre-cards-container');

        nameInput.value = voterData.name;
        
        const statusDiv = document.createElement('div');
        statusDiv.className = 'voter-status';
        newCard.appendChild(statusDiv);

        if (voterId !== currentUserId) {
            nameInput.disabled = true;
            if (voterData.isReady) {
                statusDiv.textContent = '✅ พร้อมแล้ว';
                statusDiv.classList.add('ready');
            } else {
                statusDiv.textContent = '🤔 กำลังเลือก...';
            }
        } else {
            nameInput.addEventListener('change', (e) => {
                database.ref(`rooms/${currentRoomId}/voters/${currentUserId}/name`).set(e.target.value);
            });
            
            const readyBtn = document.createElement('button');
            readyBtn.className = 'ready-btn';
            if (voterData.isReady) {
                readyBtn.textContent = 'แก้ไขการเลือก';
                readyBtn.classList.add('selected');
                genreContainer.style.pointerEvents = 'none';
                genreContainer.style.opacity = '0.7';
            } else {
                readyBtn.textContent = 'ยืนยันการเลือก';
            }
            readyBtn.addEventListener('click', () => {
                database.ref(`rooms/${currentRoomId}/voters/${currentUserId}/isReady`).set(!voterData.isReady);
            });
            statusDiv.appendChild(readyBtn);
        }
        
        genres.forEach(genre => {
            const card = document.createElement('div');
            card.className = 'genre-card';
            card.textContent = genre.name;
            card.dataset.genreId = genre.id;
            if (voterData.genres && voterData.genres[genre.id]) {
                card.classList.add('selected');
            }
            if (voterId === currentUserId && !voterData.isReady) {
                card.addEventListener('click', () => {
                    const genreRef = database.ref(`rooms/${currentRoomId}/voters/${currentUserId}/genres/${genre.id}`);
                    if (card.classList.contains('selected')) {
                        genreRef.remove();
                    } else {
                        genreRef.set(true);
                    }
                });
            }
            genreContainer.appendChild(card);
        });
        votersContainer.appendChild(newCard);
    }
    
    function collectVotes() {
        if (!currentRoomId) return;
        const votersRef = database.ref(`rooms/${currentRoomId}/voters`);
        votersRef.once('value', (snapshot) => {
            const voters = snapshot.val();
            const votes = [];
            if (voters) {
                Object.keys(voters).forEach(voterId => {
                    const selectedGenreIds = voters[voterId].genres ? Object.keys(voters[voterId].genres).map(Number) : [];
                    votes.push({
                        name: voters[voterId].name,
                        genres: selectedGenreIds
                    });
                });
            }
            const validVotes = votes.filter(vote => vote.genres.length > 0);
            if (validVotes.length === 0) {
                alert("กรุณาเลือกแนวหนังอย่างน้อยหนึ่งแนว!");
                return;
            }
            findMovieMatch(votes);
        });
    }

    async function findMovieMatch(votes) {
        showPage('results-page');
        loadingSpinner.classList.remove('hidden');
        resultsContent.classList.add('hidden');
        lastVotes = votes;
        const validVotes = votes.filter(vote => vote.genres.length > 0);
        const allSelectedGenreIds = new Set();
        validVotes.forEach(vote => vote.genres.forEach(genreId => allSelectedGenreIds.add(genreId)));
        const combinedGenreIds = Array.from(allSelectedGenreIds);
        lastCommonGenres = combinedGenreIds;
        if (combinedGenreIds.length === 0) {
            setTimeout(() => { alert("กรุณาเลือกแนวหนังอย่างน้อยหนึ่งแนว!"); showPage('vote-page'); }, 500);
            return;
        }
        currentMovieList = await fetchMovieIdsFromTMDB(combinedGenreIds);
        if (currentMovieList && currentMovieList.length > 0) {
            displayRandomMovie();
        } else {
            setTimeout(() => { alert("ไม่พบหนังที่มีครบทุกแนวที่คุณเลือกเลย!"); showPage('vote-page'); }, 500);
            return;
        }
    }

    async function fetchMovieIdsFromTMDB(genreIds) {
        const genreString = genreIds.join(',');
        const url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreString}&sort_by=popularity.desc&language=th-TH&include_adult=false&page=1`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.results.map(movie => movie.id);
        } catch (error) {
            console.error("Error fetching movie list:", error);
            return [];
        }
    }

    async function fetchMovieDetails(movieId) {
        const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=th-TH&append_to_response=videos,watch/providers`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error(`Error fetching details for movie ID ${movieId}:`, error);
            return null;
        }
    }

    function generateRationale(votes, commonGenres) {
        const commonGenreNames = commonGenres.map(id => genres.find(g => g.id === id)?.name).filter(Boolean);
        let rationale = "เพราะ ";
        let parts = [];
        const relevantVoters = votes.filter(vote => vote.genres.some(genreId => commonGenres.includes(genreId)));
        relevantVoters.forEach(voter => {
            const voterMatchedGenres = voter.genres.filter(id => commonGenres.includes(id)).map(id => genres.find(g => g.id === id)?.name).filter(Boolean);
            if (voterMatchedGenres.length > 0) {
                parts.push(`<strong>${voter.name}</strong> ชอบแนว <strong>${voterMatchedGenres.join(' & ')}</strong>`);
            }
        });
        rationale += [...new Set(parts)].join(' และ ');
        rationale += `, เราจึงขอเสนอ...`;
        return rationale;
    }

    async function displayRandomMovie() {
        loadingSpinner.classList.remove('hidden');
        resultsContent.classList.add('hidden');
        if (currentMovieList.length === 0) {
            loadingSpinner.classList.add('hidden');
            alert("ไม่มีหนังเหลือให้สุ่มแล้ว!");
            respinBtn.disabled = true;
            resultsContent.classList.remove('hidden');
            return;
        }
        const randomIndex = Math.floor(Math.random() * currentMovieList.length);
        const movieId = currentMovieList.splice(randomIndex, 1)[0];
        const movie = await fetchMovieDetails(movieId);
        if (!movie) {
            loadingSpinner.classList.add('hidden');
            alert("เกิดข้อผิดพลาดในการดึงข้อมูลหนัง ลองสุ่มใหม่อีกครั้ง");
            displayRandomMovie();
            return;
        }
        const rationaleSentence = generateRationale(lastVotes, lastCommonGenres);
        rationaleText.innerHTML = rationaleSentence;
        movieTitle.textContent = movie.title;
        movieOverview.textContent = movie.overview || "ไม่มีเรื่องย่อ";
        moviePoster.src = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/500x750.png?text=No+Image';
        movieReleaseDate.textContent = new Date(movie.release_date).getFullYear() || 'N/A';
        movieGenres.textContent = movie.genres.map(g => g.name).join(', ');
        const hours = Math.floor(movie.runtime / 60);
        const minutes = movie.runtime % 60;
        movieRuntime.textContent = movie.runtime ? `${hours}h ${minutes}m` : 'N/A';
        const score = Math.round(movie.vote_average * 10);
        scoreValue.textContent = score;
        if (score >= 70) scoreCircle.style.borderColor = '#21d07a';
        else if (score >= 40) scoreCircle.style.borderColor = '#d2d531';
        else scoreCircle.style.borderColor = '#db2360';
        let trailerKey = null;
        if (movie.videos?.results.length > 0) {
            const videos = movie.videos.results;
            const officialTrailer = videos.find(v => v.type === 'Trailer' && v.official === true && v.site === 'YouTube');
            const anyTrailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            const anyTeaser = videos.find(v => v.type === 'Teaser' && v.site === 'YouTube');
            const firstVideo = videos.find(v => v.site === 'YouTube');
            if (officialTrailer) trailerKey = officialTrailer.key;
            else if (anyTrailer) trailerKey = anyTrailer.key;
            else if (anyTeaser) trailerKey = anyTeaser.key;
            else if (firstVideo) trailerKey = firstVideo.key;
        }
        if (trailerKey) {
            trailerContainer.style.display = 'block';
            movieTrailer.src = `https://www.youtube.com/embed/${trailerKey}`;
        } else {
            trailerContainer.style.display = 'none';
        }
        providerLogos.innerHTML = '';
        const providers = movie['watch/providers']?.results?.TH?.flatrate;
        if (providers && providers.length > 0) {
            watchProvidersContainer.style.display = 'block';
            providers.forEach(provider => {
                const logoImg = document.createElement('img');
                logoImg.src = `https://image.tmdb.org/t/p/original${provider.logo_path}`;
                logoImg.alt = provider.provider_name;
                logoImg.title = provider.provider_name;
                providerLogos.appendChild(logoImg);
            });
        } else {
            watchProvidersContainer.style.display = 'none';
        }
        loadingSpinner.classList.add('hidden');
        resultsContent.classList.remove('hidden');
        if (typeof confetti === 'function') {
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        }
        respinBtn.disabled = false;
    }

    createRoomBtn.addEventListener('click', createRoom);
    joinRoomBtn.addEventListener('click', joinRoom);
    roomIdInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') joinRoom();
    });
    findMovieBtn.addEventListener('click', collectVotes);
    respinBtn.addEventListener('click', displayRandomMovie);
    startOverBtn.addEventListener('click', () => {
        window.history.pushState({}, '', window.location.pathname);
        showPage('home-page');
    });
    goBackBtn.addEventListener('click', () => {
        window.history.pushState({}, '', window.location.pathname);
        showPage('home-page');
    });

    initializeApp();

});