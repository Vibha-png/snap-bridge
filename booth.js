/* =========================================================
   SNAP BRIDGE - COMBINED BOOTH STUDIO (booth.js)
   Integrates Camera, WebRTC, Templates, Frames & Composite Export
   ========================================================= */

const socket = io();

const params = new URLSearchParams(window.location.search);
const roomCode = params.get("room");
const userName = params.get("name") || "You";

// Camera DOM
const localVideo = document.getElementById("localVideo");
const videoGrid = document.getElementById("videoGrid");
const statusText = document.getElementById("status");
const roomCodeText = document.getElementById("roomCode");
const cameraBtn = document.getElementById("cameraBtn");
const micBtn = document.getElementById("micBtn");
const flashOverlay = document.getElementById("flashOverlay");
const countdownOverlay = document.getElementById("countdownOverlay");
const countdownNumber = document.getElementById("countdownNumber");
const imageUploadInput = document.getElementById("imageUpload");

// Frame & Studio DOM
const photoFrame = document.getElementById("photoFrame");
const photoGrid = document.getElementById("photoGrid");
const templateDisplayName = document.getElementById("templateDisplayName");
const slotsStatus = document.getElementById("slotsStatus");
const frameTitle = document.getElementById("frameTitle");

// State
let localStream = null;
let cameraEnabled = true;
let microphoneEnabled = true;
let isCountingDown = false;
let activeRoomCode = roomCode || null;
let currentFilterName = "normal";
let currentFilterCss = "none";
const peers = new Map();
const peerCandidateQueues = new Map();
const remoteStreams = new Map();

// Robust STUN + TURN OpenRelay configuration for cross-network connectivity
const rtcConfig = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        { urls: "stun:stun.cloudflare.com:3478" },
        { urls: "stun:openrelay.metered.ca:80" },
        {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject"
        },
        {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject"
        },
        {
            urls: "turn:openrelay.metered.ca:443?transport=tcp",
            username: "openrelayproject",
            credential: "openrelayproject"
        }
    ],
    iceCandidatePoolSize: 10
};

let currentSize = 2; // 2x2 = 4 slots
let selectedSlot = 0;
let selectedTemplate = "spider";
let selectedFrameStyle = "classic";
let currentSpacing = 8;
let currentRoundness = 10;
let photos = []; // Array of photo dataURLs

if (roomCodeText) {
    roomCodeText.textContent = activeRoomCode || "SOLO";
}

/* =========================================================
   INITIALIZATION
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    initStudioFrame();
    startCamera();
});

function initStudioFrame() {
    createPhotoSlots(currentSize * currentSize);
    const savedTpl = localStorage.getItem("snapBridgeTemplate");
    if (savedTpl && templateThemeData[savedTpl]) {
        selectTemplateTheme(savedTpl);
    }
}

/* =========================================================
   START CAMERA & SOCKET JOIN
   ========================================================= */
async function startCamera() {
    try {
        let stream;
        try {
            // First attempt: acquire both video and audio
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "user"
                },
                audio: true
            });
        } catch (audioErr) {
            console.warn("Could not acquire microphone, falling back to camera only:", audioErr);
            // Fallback: acquire video only (e.g. desktop PC without mic or mic denied)
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "user"
                },
                audio: false
            });
        }

        localStream = stream;
        localVideo.srcObject = localStream;
        localVideo.muted = true;
        localVideo.play().catch(e => console.warn("Local video play warning:", e));
        applyFilterToVideo(localVideo);
        statusText.textContent = "Camera connected ✓ Ready to snap!";

        // Attach tracks to any peer connections that may have been created earlier
        peers.forEach(pc => {
            if (localStream) {
                localStream.getTracks().forEach(track => {
                    const senders = pc.getSenders();
                    const alreadyAdded = senders.some(s => s.track && s.track.kind === track.kind);
                    if (!alreadyAdded) {
                        pc.addTrack(track, localStream);
                    }
                });
            }
        });

        if (activeRoomCode) {
            joinExistingRoom(activeRoomCode);
        }
    } catch (error) {
        console.error("Camera access error:", error);
        if (window.isSecureContext === false && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
            statusText.textContent = "⚠️ Camera blocked: Non-localhost connection requires HTTPS. Run 'npm run tunnel'!";
        } else {
            statusText.textContent = "Camera blocked. Please allow camera permissions in browser settings.";
        }
    }
}

function joinExistingRoom(code) {
    socket.emit("join-room", { roomCode: code, name: userName }, (response) => {
        if (!response || (!response.ok && !response.success)) {
            statusText.textContent = response?.error || response?.message || "Unable to join room.";
            return;
        }

        activeRoomCode = code;
        if (roomCodeText) roomCodeText.textContent = activeRoomCode;
        statusText.textContent = `Room ${activeRoomCode} active ✓ Connected with friends!`;

        const usersList = Array.isArray(response.users) ? response.users : [];
        // As the newly joining client, create PC as NON-initiator (wait for the existing room member to send offer)
        usersList.forEach(user => {
            if (user && user.id && user.id !== socket.id) {
                createPeerConnection(user.id, false);
            }
        });
    });
}

/* =========================================================
   WEBRTC SIGNALING (ROBUST CROSS-NETWORK MULTI-PEER)
   ========================================================= */
function getOrCreateRemoteStream(userId) {
    let stream = remoteStreams.get(userId);
    if (!stream) {
        stream = new MediaStream();
        remoteStreams.set(userId, stream);
    }
    return stream;
}

function createPeerConnection(userId, initiator) {
    if (peers.has(userId)) return peers.get(userId);

    const pc = new RTCPeerConnection(rtcConfig);
    peers.set(userId, pc);
    if (!peerCandidateQueues.has(userId)) {
        peerCandidateQueues.set(userId, []);
    }

    if (localStream) {
        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });
    }

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("signal", { to: userId, data: { candidate: event.candidate } });
        }
    };

    pc.ontrack = (event) => {
        console.log(`[WebRTC] Received remote track from ${userId}: kind=${event.track.kind}, id=${event.track.id}`);

        const stream = getOrCreateRemoteStream(userId);

        // Add track if not already present
        const alreadyPresent = stream.getTracks().some(t => t.id === event.track.id);
        if (!alreadyPresent) {
            stream.addTrack(event.track);
        }

        // Also merge any tracks present in event.streams[0]
        if (event.streams && event.streams[0]) {
            event.streams[0].getTracks().forEach(t => {
                if (!stream.getTracks().some(existing => existing.id === t.id)) {
                    stream.addTrack(t);
                }
            });
        }

        addRemoteVideo(userId, stream);
    };

    pc.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] ICE state with ${userId}:`, pc.iceConnectionState);
        if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
            console.warn(`[WebRTC] Connection with ${userId} failed/disconnected. Attempting ICE restart...`);
            if (typeof pc.restartIce === "function") {
                pc.restartIce();
            }
        }
    };

    pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection state with ${userId}:`, pc.connectionState);
        if (pc.connectionState === "connected") {
            statusText.textContent = "Friends connected! Cameras split side-by-side ✨";
            updateSplitIndicator();
        } else if (pc.connectionState === "failed") {
            console.warn(`Connection to peer ${userId} failed. Re-attempting ICE restart...`);
            if (typeof pc.restartIce === "function") pc.restartIce();
        }
    };

    if (initiator) {
        pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
                socket.emit("signal", {
                    to: userId,
                    data: { description: pc.localDescription }
                });
            })
            .catch(err => console.error("WebRTC createOffer error:", err));
    }

    return pc;
}

socket.on("signal", async ({ from, data }) => {
    if (!from || !data) return;

    // Filter sync event relayed via signal
    if (data.filterChange) {
        handleRemoteFilterChange(data.filterChange);
        return;
    }

    const pc = createPeerConnection(from, false);
    try {
        if (data.description) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.description));

            // Flush queued ICE candidates now that remote description is set
            const queue = peerCandidateQueues.get(from) || [];
            while (queue.length > 0) {
                const cand = queue.shift();
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch (e) {
                    console.warn("Error adding queued candidate:", e);
                }
            }

            if (data.description.type === "offer") {
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit("signal", {
                    to: from,
                    data: { description: pc.localDescription }
                });
            }
        }

        if (data.candidate) {
            if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } else {
                const queue = peerCandidateQueues.get(from) || [];
                queue.push(data.candidate);
                peerCandidateQueues.set(from, queue);
            }
        }
    } catch (err) {
        console.error("WebRTC signal handling error:", err);
    }
});

// Existing room member receives notification of a new user joining and initiates the offer
socket.on("user-joined", (data) => {
    if (data && data.id) {
        createPeerConnection(data.id, true);
        statusText.textContent = `${data.name || "A friend"} joined the booth ✨`;
        updateSplitIndicator();
    }
});

socket.on("filter-changed", (data) => {
    if (data && data.filter) {
        handleRemoteFilterChange({ name: data.filter, css: data.css });
    }
});

function addRemoteVideo(userId, stream) {
    let card = document.getElementById("remote-" + userId);
    let video;

    if (card) {
        video = card.querySelector("video");
        if (video) {
            if (video.srcObject !== stream) {
                video.srcObject = stream;
            }
            ensureVideoPlaying(video, card);
            applyFilterToVideo(video);
        }
        updateSplitIndicator();
        return;
    }

    card = document.createElement("div");
    card.className = "video-card";
    card.id = "remote-" + userId;

    // Loading overlay until video starts playing
    const loader = document.createElement("div");
    loader.className = "video-loading-placeholder";
    loader.innerHTML = `
        <div class="video-spinner"></div>
        <span>Connecting Friend...</span>
    `;
    card.appendChild(loader);

    video = document.createElement("video");
    // CRITICAL FIX: muted=true and playsinline are required for browser autoplay policy!
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("muted", "");
    video.srcObject = stream;
    applyFilterToVideo(video);

    const label = document.createElement("div");
    label.className = "video-name";
    label.textContent = "Friend ✦";

    // Audio unmute toggle button on the video card
    const audioBtn = document.createElement("button");
    audioBtn.className = "video-audio-toggle";
    audioBtn.type = "button";
    audioBtn.title = "Click to Unmute / Mute Audio";
    audioBtn.innerHTML = "🔇";
    audioBtn.onclick = (e) => {
        e.stopPropagation();
        video.muted = !video.muted;
        audioBtn.innerHTML = video.muted ? "🔇" : "🔊";
        audioBtn.classList.toggle("unmuted", !video.muted);
        if (!video.muted) {
            video.play().catch(err => console.warn("Unmuted play warning:", err));
        }
    };

    card.appendChild(video);
    card.appendChild(label);
    card.appendChild(audioBtn);
    videoGrid.appendChild(card);

    ensureVideoPlaying(video, card);
    updateSplitIndicator();
}

function ensureVideoPlaying(video, card) {
    if (!video) return;

    const hideLoader = () => {
        if (card) {
            const loader = card.querySelector(".video-loading-placeholder");
            if (loader) loader.style.display = "none";
        }
    };

    video.onloadeddata = hideLoader;
    video.onplaying = hideLoader;
    video.oncanplay = hideLoader;

    const attemptPlay = () => {
        video.muted = true; // Always guarantee muted for policy compliance
        const promise = video.play();
        if (promise !== undefined) {
            promise.then(() => {
                hideLoader();
            }).catch(err => {
                console.warn("[WebRTC] Autoplay retry muted:", err);
                video.muted = true;
                setTimeout(() => video.play().catch(() => {}), 300);
            });
        }
    };

    attemptPlay();

    const stream = video.srcObject;
    if (stream) {
        stream.getVideoTracks().forEach(track => {
            track.onunmute = () => {
                console.log("[WebRTC] Video track unmuted!");
                attemptPlay();
            };
        });
    }
}

function updateSplitIndicator() {
    const splitIndicator = document.getElementById("splitIndicator");
    const remoteCards = document.querySelectorAll("#videoGrid .video-card:not(#localCard)");
    if (!splitIndicator) return;
    if (remoteCards.length > 0) {
        splitIndicator.classList.add("active");
        splitIndicator.innerHTML = `<span>👯</span> Split Screen (${remoteCards.length + 1} Cameras)`;
    } else {
        splitIndicator.classList.remove("active");
    }
}

socket.on("user-left", (data) => {
    if (!data || !data.id) return;
    const pc = peers.get(data.id);
    if (pc) {
        pc.close();
        peers.delete(data.id);
        peerCandidateQueues.delete(data.id);
        remoteStreams.delete(data.id);
    }
    const card = document.getElementById("remote-" + data.id);
    if (card) card.remove();
    updateSplitIndicator();
    statusText.textContent = "Friend left the booth.";
});

/* =========================================================
   CAMERA TOGGLES & CONTROLS
   ========================================================= */
function toggleCamera() {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (track) {
        cameraEnabled = !cameraEnabled;
        track.enabled = cameraEnabled;
        cameraBtn.textContent = cameraEnabled ? "📷" : "🚫";
    }
}

function toggleMic() {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (track) {
        microphoneEnabled = !microphoneEnabled;
        track.enabled = microphoneEnabled;
        micBtn.textContent = microphoneEnabled ? "🎙️" : "🔇";
    }
}

function triggerFlash() {
    flashOverlay.classList.remove("active");
    void flashOverlay.offsetWidth;
    flashOverlay.classList.add("active");
    setTimeout(() => {
        flashOverlay.classList.remove("active");
    }, 400);
}

/* =========================================================
   PHOTO CAPTURE & SLOTS (SPLIT SCREEN COMPOSITE)
   ========================================================= */
function snapCurrentPhoto() {
    if (!localStream || !localVideo.videoWidth) {
        alert("Camera is not ready yet. You can also click 'Upload' to add an image.");
        return;
    }

    triggerFlash();

    // Collect all active video elements inside videoGrid (both local & friends)
    const allVideos = Array.from(videoGrid.querySelectorAll("video")).filter(v => v.videoWidth > 0 && v.readyState >= 2);
    if (allVideos.length === 0) {
        allVideos.push(localVideo);
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");

    const numCols = allVideos.length;
    const colWidth = canvas.width / numCols;

    allVideos.forEach((vid, idx) => {
        ctx.save();

        // Clip strictly to column region
        ctx.beginPath();
        ctx.rect(idx * colWidth, 0, colWidth, canvas.height);
        ctx.clip();

        // Apply active filter
        if (currentFilterCss && currentFilterCss !== "none") {
            ctx.filter = currentFilterCss;
        } else {
            ctx.filter = "none";
        }

        // Mirror image for selfie feel within the column
        ctx.translate(idx * colWidth + colWidth, 0);
        ctx.scale(-1, 1);

        // Aspect ratio center crop
        const targetRatio = colWidth / canvas.height;
        const sourceRatio = vid.videoWidth / vid.videoHeight;
        let sx = 0, sy = 0, sw = vid.videoWidth, sh = vid.videoHeight;

        if (sourceRatio > targetRatio) {
            sw = vid.videoHeight * targetRatio;
            sx = (vid.videoWidth - sw) / 2;
        } else {
            sh = vid.videoWidth / targetRatio;
            sy = (vid.videoHeight - sh) / 2;
        }

        ctx.drawImage(vid, sx, sy, sw, sh, 0, 0, colWidth, canvas.height);
        ctx.restore();

        // Draw vertical white split line between side-by-side cameras
        if (idx > 0) {
            ctx.save();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(idx * colWidth, 0);
            ctx.lineTo(idx * colWidth, canvas.height);
            ctx.stroke();
            ctx.restore();
        }
    });

    const photoDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPhotoInSlot(selectedSlot, photoDataUrl);

    // Auto-advance to next empty slot
    advanceToNextEmptySlot();
}

function startCountdownSnap() {
    if (isCountingDown) return;
    isCountingDown = true;
    countdownOverlay.classList.add("show");

    let count = 3;
    countdownNumber.textContent = count;

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownNumber.textContent = count;
        } else {
            clearInterval(interval);
            countdownOverlay.classList.remove("show");
            isCountingDown = false;
            snapCurrentPhoto();
        }
    }, 900);
}

/* Upload handler */
function triggerImageUpload() {
    imageUploadInput.value = "";
    imageUploadInput.click();
}

imageUploadInput.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        setPhotoInSlot(selectedSlot, e.target.result);
        advanceToNextEmptySlot();
    };
    reader.readAsDataURL(file);
});

function createPhotoSlots(count) {
    photoGrid.innerHTML = "";
    while (photos.length < count) {
        photos.push(null);
    }
    photos.length = count;

    for (let i = 0; i < count; i++) {
        const slot = document.createElement("div");
        slot.className = "photo-slot" + (i === selectedSlot ? " active-slot" : "");
        slot.dataset.index = i;
        slot.style.borderRadius = currentRoundness + "px";

        slot.innerHTML = `
            <img id="slot-img-${i}" alt="Photo ${i + 1}">
            <div class="placeholder">
                <span>＋</span>
                Slot ${i + 1}
            </div>
        `;

        if (photos[i]) {
            const img = slot.querySelector("img");
            img.src = photos[i];
            slot.classList.add("has-image");
        }

        slot.addEventListener("click", () => {
            selectSlot(i);
        });

        photoGrid.appendChild(slot);
    }

    updateSlotsStatus();
}

function selectSlot(index) {
    selectedSlot = index;
    document.querySelectorAll(".photo-slot").forEach(s => s.classList.remove("active-slot"));
    const target = photoGrid.querySelector(`.photo-slot[data-index="${index}"]`);
    if (target) target.classList.add("active-slot");
    statusText.textContent = `Slot ${index + 1} selected. Snap or upload to fill!`;
}

function setPhotoInSlot(index, dataUrl) {
    photos[index] = dataUrl;
    const slot = photoGrid.querySelector(`.photo-slot[data-index="${index}"]`);
    if (slot) {
        const img = slot.querySelector("img");
        img.src = dataUrl;
        slot.classList.add("has-image");
    }
    updateSlotsStatus();
}

function advanceToNextEmptySlot() {
    const nextEmpty = photos.findIndex(p => !p);
    if (nextEmpty !== -1) {
        selectSlot(nextEmpty);
    } else {
        statusText.textContent = "🎉 Frame is complete! Click 'Download' to save.";
    }
}

function updateSlotsStatus() {
    const filled = photos.filter(Boolean).length;
    const total = photos.length;
    slotsStatus.textContent = `${filled} / ${total} photos snapped`;
}

function clearStudioFrame() {
    if (photos.filter(Boolean).length === 0) return;
    if (!confirm("Clear all photos from this frame?")) return;

    photos = photos.map(() => null);
    document.querySelectorAll(".photo-slot").forEach(slot => {
        slot.classList.remove("has-image");
        const img = slot.querySelector("img");
        if (img) img.src = "";
    });
    selectedSlot = 0;
    selectSlot(0);
    updateSlotsStatus();
    statusText.textContent = "Frame cleared. Ready for new memories! ✨";
}

/* =========================================================
   STUDIO TABS & TEMPLATES
   ========================================================= */
function switchStudioTab(tab) {
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));

    if (tab === "templates") {
        document.getElementById("tabTemplatesBtn")?.classList.add("active");
        document.getElementById("tabTemplates")?.classList.add("active");
    } else if (tab === "filters") {
        document.getElementById("tabFiltersBtn")?.classList.add("active");
        document.getElementById("tabFilters")?.classList.add("active");
    } else if (tab === "frames") {
        document.getElementById("tabFramesBtn")?.classList.add("active");
        document.getElementById("tabFrames")?.classList.add("active");
    } else if (tab === "stickers") {
        document.getElementById("tabStickersBtn")?.classList.add("active");
        document.getElementById("tabStickers")?.classList.add("active");
    }
}

const templateThemeData = {
    spider: { name: "Spider Template", title: "Amazing Memories 🕷️", decor1: "🕷️", decor2: "🕸️", decor3: "✦" },
    denim: { name: "Denim Template", title: "Good Vibes ☆", decor1: "☆", decor2: "✦", decor3: "♡" },
    bow: { name: "Pink Bow Template", title: "Sweet Memories 🎀", decor1: "🎀", decor2: "♡", decor3: "🌸" },
    film: { name: "Film Strip Template", title: "Classic Roll 🎞️", decor1: "📷", decor2: "🎞️", decor3: "✦" },
    botanical: { name: "Botanical Template", title: "Nature Moments 🌿", decor1: "🌿", decor2: "🍃", decor3: "✿" },
    rainbow: { name: "Rainbow Template", title: "Happy Days 🌈", decor1: "🌈", decor2: "☁️", decor3: "✨" },
    neon: { name: "Neon Night Template", title: "Glow Together ✦", decor1: "✦", decor2: "⚡", decor3: "💜" },
    rose: { name: "Rose Garden Template", title: "Forever Romance 🌹", decor1: "🌹", decor2: "♡", decor3: "🌸" },
    lavender: { name: "Lavender Cloud", title: "Soft Lavender ☁️", decor1: "☁️", decor2: "💜", decor3: "✨" },
    dreamy: { name: "Dreamy Purple", title: "Dream Together 🌙", decor1: "🌙", decor2: "⭐", decor3: "💫" },
    floral: { name: "Floral Garden", title: "Pastel Blooms 🌼", decor1: "🌼", decor2: "🌸", decor3: "🌿" },
    cutepink: { name: "Cute Pink", title: "Sweet & Pink 🎀", decor1: "🎀", decor2: "💖", decor3: "🌸" },
    mint: { name: "Mint Fresh", title: "Fresh Vibe 🍃", decor1: "🍃", decor2: "🌿", decor3: "✨" },
    butterfly: { name: "Butterfly Blue", title: "Flutter Moments 🦋", decor1: "🦋", decor2: "💙", decor3: "✦" },
    scrapbook: { name: "Vintage Scrapbook", title: "Our Story 📜", decor1: "📜", decor2: "🏷️", decor3: "♡" },
    ocean: { name: "Ocean Wave", title: "Ocean Breeze 🌊", decor1: "🌊", decor2: "🫧", decor3: "🐬" },
    candy: { name: "Cotton Candy", title: "Sweet Treats 🍬", decor1: "🍬", decor2: "🍭", decor3: "💖" },
    royal: { name: "Royal Velvet", title: "Royal Golden 👑", decor1: "👑", decor2: "⭐", decor3: "✦" },
    kitty: { name: "Cute Kitty", title: "Meow Moments 🐾", decor1: "🐾", decor2: "🐱", decor3: "♡" },
    polaroid: { name: "Classic Polaroid", title: "Instant Photo 📷", decor1: "📷", decor2: "🎞️", decor3: "✨" },
    night: { name: "Pastel Night", title: "Midnight Magic 🌙", decor1: "🌙", decor2: "⭐", decor3: "💜" }
};

function selectTemplateTheme(theme, button) {
    selectedTemplate = theme;
    document.querySelectorAll(".template-btn").forEach(btn => btn.classList.remove("selected"));
    if (button) button.classList.add("selected");

    const data = templateThemeData[theme] || templateThemeData.spider;
    templateDisplayName.textContent = data.name;
    frameTitle.textContent = data.title;

    document.getElementById("decorTopLeft").textContent = data.decor1;
    document.getElementById("decorTopRight").textContent = data.decor2;
    document.getElementById("decorBottomRight").textContent = data.decor3;

    updateFrameClasses();
}

function filterTemplateCategory(cat, button) {
    document.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("active"));
    if (button) button.classList.add("active");

    document.querySelectorAll(".template-btn").forEach(card => {
        if (cat === "all" || card.dataset.cat === cat) {
            card.style.display = "";
        } else {
            card.style.display = "none";
        }
    });
}

/* =========================================================
   FRAME LAYOUT & STYLES
   ========================================================= */
function changeStudioLayout(size, button) {
    currentSize = size;
    document.querySelectorAll(".layout-btn").forEach(btn => btn.classList.remove("active"));
    if (button) button.classList.add("active");

    photoGrid.className = `photo-grid grid-${size}`;
    const totalSlots = size * size;
    createPhotoSlots(totalSlots);
    if (selectedSlot >= totalSlots) selectedSlot = 0;
    selectSlot(selectedSlot);
}

function changeStudioFrameStyle(style, button) {
    selectedFrameStyle = style;
    document.querySelectorAll(".style-btn").forEach(btn => btn.classList.remove("selected"));
    if (button) button.classList.add("selected");
    updateFrameClasses();
}

function updateFrameClasses() {
    photoFrame.className = `photo-frame ${selectedTemplate} ${selectedFrameStyle}`;
}

function changeStudioSpacing(val) {
    currentSpacing = val;
    document.getElementById("spacingVal").textContent = val + "px";
    photoGrid.style.gap = val + "px";
}

function changeStudioRoundness(val) {
    currentRoundness = val;
    document.getElementById("roundnessVal").textContent = val + "px";
    document.querySelectorAll(".photo-slot").forEach(slot => {
        slot.style.borderRadius = val + "px";
    });
}

function addStickerToFrame(emoji) {
    frameTitle.textContent += " " + emoji;
    statusText.textContent = `Added ${emoji} to frame!`;
}

/* =========================================================
   PRINT & HIGH-RES COMPOSITE DOWNLOAD
   ========================================================= */
function printStudioFrame() {
    window.print();
}

async function downloadCompositeFrame() {
    const filledCount = photos.filter(Boolean).length;
    if (filledCount === 0) {
        alert("Please snap or upload at least one photo first!");
        return;
    }

    statusText.textContent = "Rendering high-res photo frame...";

    const canvas = document.getElementById("photoCanvas");
    const ctx = canvas.getContext("2d");

    // Output dimension (e.g. 1200 x 1400)
    const outW = 1200;
    const outH = 1420;
    canvas.width = outW;
    canvas.height = outH;

    // 1. Draw Template Background
    drawTemplateBackground(ctx, outW, outH, selectedTemplate, selectedFrameStyle);

    // 2. Draw Frame Border
    drawFrameBorders(ctx, outW, outH, selectedTemplate, selectedFrameStyle);

    // 3. Draw Grid Photos
    const padding = 70;
    const bottomReserve = 130;
    const gridW = outW - padding * 2;
    const gridH = outH - padding * 2 - bottomReserve;

    const gap = (currentSpacing / 8) * 16;
    const cols = currentSize;
    const rows = currentSize;

    const slotW = (gridW - (cols - 1) * gap) / cols;
    const slotH = (gridH - (rows - 1) * gap) / rows;
    const roundness = (currentRoundness / 10) * 18;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const index = r * cols + c;
            const x = padding + c * (slotW + gap);
            const y = padding + r * (slotH + gap);

            ctx.save();
            roundRect(ctx, x, y, slotW, slotH, roundness);
            ctx.clip();

            if (photos[index]) {
                const img = await loadImage(photos[index]);
                drawCoverImage(ctx, img, x, y, slotW, slotH);
            } else {
                ctx.fillStyle = "#ffffffdd";
                ctx.fillRect(x, y, slotW, slotH);
                ctx.fillStyle = "#a2a8be";
                ctx.font = "bold 28px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(`+ Slot ${index + 1}`, x + slotW / 2, y + slotH / 2);
            }
            ctx.restore();

            // Inner slot outline
            ctx.save();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4;
            roundRect(ctx, x, y, slotW, slotH, roundness);
            ctx.stroke();
            ctx.restore();
        }
    }

    // 4. Draw Title & Text
    const titleText = frameTitle.textContent.trim() || "Snap Bridge ✨";
    ctx.save();
    ctx.font = "bold 44px 'Pacifico', 'DM Sans', cursive, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (selectedTemplate === "film" || selectedTemplate === "neon" || selectedTemplate === "royal" || selectedTemplate === "night") {
        ctx.fillStyle = selectedTemplate === "neon" ? "#e99eff" : (selectedTemplate === "royal" ? "#f7d27e" : (selectedTemplate === "night" ? "#b7b9f5" : "#ffffff"));
        ctx.shadowColor = selectedTemplate === "neon" ? "#c660ff" : "#000000";
        ctx.shadowBlur = 10;
    } else {
        ctx.fillStyle = "#17255f";
    }
    ctx.fillText(titleText, outW / 2, outH - 75);
    ctx.restore();

    // 5. Download image
    const outputUrl = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.href = outputUrl;
    downloadLink.download = "snap-bridge-memories.png";
    downloadLink.click();

    statusText.textContent = "Frame saved! Download started ✓";
}

function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.src = src;
    });
}

function drawCoverImage(ctx, img, x, y, w, h) {
    const imgRatio = img.width / img.height;
    const targetRatio = w / h;
    let sx, sy, sw, sh;

    if (imgRatio > targetRatio) {
        sh = img.height;
        sw = sh * targetRatio;
        sx = (img.width - sw) / 2;
        sy = 0;
    } else {
        sw = img.width;
        sh = sw / targetRatio;
        sx = 0;
        sy = (img.height - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function drawTemplateBackground(ctx, w, h, template, style) {
    if (template === "spider") {
        for (let i = -h; i < w + h; i += 50) {
            ctx.fillStyle = "#e3384c";
            ctx.fillRect(i, 0, 25, h);
            ctx.fillStyle = "#163675";
            ctx.fillRect(i + 25, 0, 25, h);
        }
    } else if (template === "denim") {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "#325f82");
        grad.addColorStop(1, "#183e60");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    } else if (template === "bow") {
        ctx.fillStyle = "#fff3f6";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#ffd7e3";
        for (let y = 0; y < h; y += 45) {
            ctx.fillRect(0, y, w, 22);
        }
    } else if (template === "film") {
        ctx.fillStyle = "#202124";
        ctx.fillRect(0, 0, w, h);
    } else if (template === "botanical") {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "#ebdfc7");
        grad.addColorStop(1, "#fffbf2");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    } else if (template === "rainbow") {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "#c7f1ff");
        grad.addColorStop(0.5, "#ffe0f0");
        grad.addColorStop(1, "#fff3c4");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    } else if (template === "neon") {
        const rad = ctx.createRadialGradient(w/2, h/2, 50, w/2, h/2, w);
        rad.addColorStop(0, "#3c3a88");
        rad.addColorStop(1, "#0b0e26");
        ctx.fillStyle = rad;
        ctx.fillRect(0, 0, w, h);
    } else if (template === "lavender") {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "#e9efff");
        grad.addColorStop(0.5, "#c6d2ff");
        grad.addColorStop(1, "#ded2f8");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    } else if (template === "dreamy") {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#d9d2ff");
        grad.addColorStop(0.5, "#b7afe8");
        grad.addColorStop(1, "#9e91ca");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    } else if (template === "floral") {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "#fffdf7");
        grad.addColorStop(1, "#f8f0db");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    } else if (template === "cutepink") {
        ctx.fillStyle = "#fff5fb";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#f9e5f1";
        for (let x = -h; x < w + h; x += 40) {
            ctx.fillRect(x, 0, 20, h);
        }
    } else if (template === "mint") {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "#eaf9f3");
        grad.addColorStop(0.5, "#cdeedf");
        grad.addColorStop(1, "#bce4d1");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    } else if (template === "butterfly") {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "#e1eeff");
        grad.addColorStop(0.5, "#bbd7fc");
        grad.addColorStop(1, "#e5f1ff");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    } else if (template === "scrapbook") {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "#f5ecd8");
        grad.addColorStop(0.5, "#e5d6be");
        grad.addColorStop(1, "#efe4cb");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    } else if (template === "ocean") {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#dcf0fb");
        grad.addColorStop(0.5, "#a8dcf8");
        grad.addColorStop(1, "#71bde8");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    } else if (template === "candy") {
        ctx.fillStyle = "#ffebf3";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#e7f0ff";
        for (let y = 0; y < h; y += 50) {
            ctx.fillRect(0, y, w, 25);
        }
    } else if (template === "royal") {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "#2b1f48");
        grad.addColorStop(0.5, "#422d6e");
        grad.addColorStop(1, "#1c1533");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    } else if (template === "kitty") {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "#fff7fa");
        grad.addColorStop(0.5, "#ffe8f0");
        grad.addColorStop(1, "#ffd8e7");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    } else if (template === "polaroid") {
        ctx.fillStyle = "#fffdf5";
        ctx.fillRect(0, 0, w, h);
    } else if (template === "night") {
        const rad = ctx.createRadialGradient(w * 0.8, h * 0.2, 50, w/2, h/2, w);
        rad.addColorStop(0, "#464b85");
        rad.addColorStop(1, "#141733");
        ctx.fillStyle = rad;
        ctx.fillRect(0, 0, w, h);
    } else {
        // Rose / Default
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "#f5d4da");
        grad.addColorStop(1, "#fff7eb");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }
}

function drawFrameBorders(ctx, w, h, template, style) {
    ctx.save();
    let borderThickness = 28;
    let borderColor = "#ffffff";

    if (style === "lavender") borderColor = "#ebe7ff";
    else if (style === "mint") borderColor = "#e3f8ef";
    else if (style === "soft") borderColor = "#fff4f8";

    if (template === "film") borderColor = "#141517";
    else if (template === "neon") borderColor = "#d88aff";
    else if (template === "royal") borderColor = "#e2be6d";
    else if (template === "night") borderColor = "#8c90cf";
    else if (template === "lavender") borderColor = "#abb9ed";
    else if (template === "dreamy") borderColor = "#c9c0ee";
    else if (template === "floral") borderColor = "#d8c59f";
    else if (template === "cutepink") borderColor = "#e0b1d1";
    else if (template === "mint") borderColor = "#a3d9bf";
    else if (template === "butterfly") borderColor = "#a6cbf8";
    else if (template === "scrapbook") borderColor = "#cfbba0";
    else if (template === "ocean") borderColor = "#8ec5eb";
    else if (template === "candy") borderColor = "#f6c0d8";
    else if (template === "kitty") borderColor = "#f5b3ce";
    else if (template === "polaroid") borderColor = "#f2ede0";

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderThickness;
    ctx.strokeRect(borderThickness / 2, borderThickness / 2, w - borderThickness, h - borderThickness);
    ctx.restore();
}

/* =========================================================
   LIVE FILTERS MANAGEMENT
   ========================================================= */
function applyCameraFilter(name, css, buttonElement) {
    currentFilterName = name;
    currentFilterCss = css;

    const videos = videoGrid.querySelectorAll("video");
    videos.forEach(v => {
        v.style.filter = css;
    });

    document.querySelectorAll(".filter-pill").forEach(pill => pill.classList.remove("active"));
    document.querySelectorAll(".filter-card").forEach(card => card.classList.remove("active"));

    if (buttonElement) {
        buttonElement.classList.add("active");
    }

    document.querySelectorAll(`.filter-pill[onclick*="'${name}'"]`).forEach(p => p.classList.add("active"));
    document.querySelectorAll(`.filter-card[onclick*="'${name}'"]`).forEach(c => c.classList.add("active"));

    // Sync filter change to all peers in the room
    if (activeRoomCode) {
        socket.emit("change-filter", { roomCode: activeRoomCode, filter: name, css: css });
    }
}

function handleRemoteFilterChange(filterData) {
    if (!filterData) return;
    const { name, css } = filterData;
    currentFilterName = name;
    currentFilterCss = css;

    const videos = videoGrid.querySelectorAll("video");
    videos.forEach(v => {
        v.style.filter = css;
    });

    document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".filter-card").forEach(c => c.classList.remove("active"));
    document.querySelectorAll(`.filter-pill[onclick*="'${name}'"]`).forEach(p => p.classList.add("active"));
    document.querySelectorAll(`.filter-card[onclick*="'${name}'"]`).forEach(c => c.classList.add("active"));
    showShareToast(`Friend switched filter to ${name} ✨`);
}

function applyFilterToVideo(videoEl) {
    if (videoEl && currentFilterCss) {
        videoEl.style.filter = currentFilterCss;
    }
}

/* =========================================================
   SHARE INVITE LINK & MODAL
   ========================================================= */
function getShareableUrl(code) {
    const origin = window.location.origin;
    const path = window.location.pathname.replace(/\/+$/, "");
    return `${origin}${path}?room=${encodeURIComponent(code)}`;
}

function ensureRoomCode(callback) {
    if (activeRoomCode && activeRoomCode !== "SOLO") {
        if (callback) callback(activeRoomCode);
        return;
    }

    // Emit create-room to get an official room code from server
    socket.emit("create-room", { name: userName || "Host" }, (res) => {
        if (res && res.ok && res.roomCode) {
            activeRoomCode = res.roomCode;
            if (roomCodeText) roomCodeText.textContent = activeRoomCode;
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set("room", activeRoomCode);
            window.history.replaceState({}, "", newUrl.toString());
            statusText.textContent = `Room ${activeRoomCode} created ✓ Invite friends!`;
            if (callback) callback(activeRoomCode);
        } else {
            // Local fallback
            const localCode = "SB-" + Math.random().toString(36).substring(2, 8).toUpperCase();
            activeRoomCode = localCode;
            if (roomCodeText) roomCodeText.textContent = activeRoomCode;
            socket.emit("join-room", { roomCode: activeRoomCode, name: userName });
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set("room", activeRoomCode);
            window.history.replaceState({}, "", newUrl.toString());
            if (callback) callback(activeRoomCode);
        }
    });
}

function openShareModal() {
    ensureRoomCode((code) => {
        const shareOverlay = document.getElementById("shareModalOverlay");
        const codeDisplay = document.getElementById("shareCodeDisplay");
        const urlInput = document.getElementById("shareUrlInput");

        if (codeDisplay) codeDisplay.textContent = code;
        if (urlInput) urlInput.value = getShareableUrl(code);
        if (shareOverlay) shareOverlay.classList.add("show");
    });
}

function closeShareModal() {
    const shareOverlay = document.getElementById("shareModalOverlay");
    if (shareOverlay) shareOverlay.classList.remove("show");
}

function handleShareOverlayClick(event) {
    if (event.target && event.target.id === "shareModalOverlay") {
        closeShareModal();
    }
}

function copyShareLink() {
    const urlInput = document.getElementById("shareUrlInput");
    const link = urlInput ? urlInput.value : getShareableUrl(activeRoomCode);
    if (!link) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link)
            .then(() => showShareToast("Link copied to clipboard! Send to your friend 👯"))
            .catch(() => fallbackCopyText(link));
    } else {
        fallbackCopyText(link);
    }
}

function copyShareCode() {
    const code = activeRoomCode || (document.getElementById("shareCodeDisplay")?.textContent);
    if (!code || code === "SOLO") return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code)
            .then(() => showShareToast(`Room code ${code} copied!`))
            .catch(() => fallbackCopyText(code));
    } else {
        fallbackCopyText(code);
    }
}

function fallbackCopyText(text) {
    const tempInput = document.createElement("input");
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
        document.execCommand("copy");
        showShareToast("Copied to clipboard!");
    } catch (e) {
        prompt("Copy this link:", text);
    }
    document.body.removeChild(tempInput);
}

function shareWhatsApp() {
    const urlInput = document.getElementById("shareUrlInput");
    const link = urlInput ? urlInput.value : getShareableUrl(activeRoomCode);
    const msg = `Join my Snap Bridge split screen photo booth! 📸✨ ${link}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
}

function shareNative() {
    const urlInput = document.getElementById("shareUrlInput");
    const link = urlInput ? urlInput.value : getShareableUrl(activeRoomCode);
    if (navigator.share) {
        navigator.share({
            title: "Snap Bridge Photo Booth",
            text: "Join me in this split screen photo booth! 👯✨",
            url: link
        }).catch(() => {});
    } else {
        copyShareLink();
    }
}

function showShareToast(message) {
    const toast = document.getElementById("shareToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

/* =========================================================
   LEAVE BOOTH
   ========================================================= */
function leaveBooth() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    peers.forEach(peer => peer.close());
    peers.clear();

    if (activeRoomCode) {
        socket.emit("leave-room", activeRoomCode);
    }
    window.location.href = "home.html";
}