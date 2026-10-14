/* =========================================
   SNAP BRIDGE
   TEMPLATES + PHOTO FRAMES
========================================= */


let currentSize = 1;
let selectedSlot = 0;
let selectedTemplate = "spider";
let cameraStream = null;


/* =========================================
   START
========================================= */

document.addEventListener("DOMContentLoaded", function () {

    createPhotoSlots(1);

    const saved = localStorage.getItem("snapBridgeTemplate");
    if (saved) {
        const card = document.querySelector(`.template-card[data-template="${saved}"]`);
        if (card) {
            selectTemplate(saved, card);
        }
    }

});


/* =========================================
   CREATE PHOTO SLOTS
========================================= */

function createPhotoSlots(total) {

    const grid = document.getElementById("photoGrid");

    grid.innerHTML = "";

    for (let i = 0; i < total; i++) {

        const slot = document.createElement("div");

        slot.className = "photo-slot";

        slot.dataset.index = i;

        slot.innerHTML = `
            <img id="photo-${i}" alt="Photo">

            <div class="placeholder">
                <span>＋</span>
                Add Photo
            </div>
        `;


        slot.addEventListener("click", function () {

            selectedSlot = i;

            openPhotoChoice();

        });


        grid.appendChild(slot);

    }

    updateStatus();

}


/* =========================================
   CHANGE LAYOUT
========================================= */

function changeLayout(size, button) {

    currentSize = size;

    const total = size * size;

    const grid = document.getElementById("photoGrid");

    grid.className = "photo-grid grid-" + size;

    createPhotoSlots(total);


    document.querySelectorAll(".layout-button")
        .forEach(btn => {

            btn.classList.remove("active");

        });


    button.classList.add("active");


    selectedSlot = 0;

}


/* =========================================
   CHOOSE PHOTO METHOD
========================================= */

function openPhotoChoice() {

    const answer = confirm(
        "How do you want to add the photo?\n\n" +
        "OK = Upload Image\n" +
        "Cancel = Take Photo"
    );


    if (answer) {

        openUpload();

    } else {

        openCamera();

    }

}


/* =========================================
   TEMPLATE SELECTION
========================================= */

function selectTemplate(template, card) {

    selectedTemplate = template;

    try {
        localStorage.setItem("snapBridgeTemplate", template);
    } catch(e) {}

    document.querySelectorAll(".template-card")
        .forEach(item => {
            if (item.dataset.template === template) {
                item.classList.add("selected");
            } else {
                item.classList.remove("selected");
            }
        });

    if (card) {
        card.classList.add("selected");
    }

    const frame =
        document.getElementById("photoFrame");

    if (frame) {
        frame.className = "photo-frame " + template;
    }

    const templateMeta = {
        spider: { name: "Spider Template", title: "Amazing Memories 🕷️", d1: "🕷️", d2: "🕸️", d3: "✦" },
        denim: { name: "Denim Template", title: "Good Vibes ☆", d1: "☆", d2: "✦", d3: "♡" },
        botanical: { name: "Botanical Template", title: "Nature Moments 🌿", d1: "🌿", d2: "🍃", d3: "✿" },
        bow: { name: "Pink Bow Template", title: "Sweet Memories 🎀", d1: "🎀", d2: "♡", d3: "🌸" },
        film: { name: "Film Strip Template", title: "Classic Roll 🎞️", d1: "📷", d2: "🎞️", d3: "✦" },
        rainbow: { name: "Rainbow Template", title: "Happy Days 🌈", d1: "🌈", d2: "☁️", d3: "✨" },
        neon: { name: "Neon Night Template", title: "Glow Together ✦", d1: "✦", d2: "⚡", d3: "💜" },
        rose: { name: "Rose Garden Template", title: "Forever Romance 🌹", d1: "🌹", d2: "♡", d3: "🌸" },
        lavender: { name: "Lavender Cloud", title: "Soft Lavender ☁️", d1: "☁️", d2: "💜", d3: "✨" },
        dreamy: { name: "Dreamy Purple", title: "Dream Together 🌙", d1: "🌙", d2: "⭐", d3: "💫" },
        floral: { name: "Floral Garden", title: "Pastel Blooms 🌼", d1: "🌼", d2: "🌸", d3: "🌿" },
        cutepink: { name: "Cute Pink", title: "Sweet & Pink 🎀", d1: "🎀", d2: "💖", d3: "🌸" },
        mint: { name: "Mint Fresh", title: "Fresh Vibe 🍃", d1: "🍃", d2: "🌿", d3: "✨" },
        butterfly: { name: "Butterfly Blue", title: "Flutter Moments 🦋", d1: "🦋", d2: "💙", d3: "✦" },
        scrapbook: { name: "Vintage Scrapbook", title: "Our Story 📜", d1: "📜", d2: "🏷️", d3: "♡" },
        ocean: { name: "Ocean Wave", title: "Ocean Breeze 🌊", d1: "🌊", d2: "🫧", d3: "🐬" },
        candy: { name: "Cotton Candy", title: "Sweet Treats 🍬", d1: "🍬", d2: "🍭", d3: "💖" },
        royal: { name: "Royal Velvet", title: "Royal Golden 👑", d1: "👑", d2: "⭐", d3: "✦" },
        kitty: { name: "Cute Kitty", title: "Meow Moments 🐾", d1: "🐾", d2: "🐱", d3: "♡" },
        polaroid: { name: "Classic Polaroid", title: "Instant Photo 📷", d1: "📷", d2: "🎞️", d3: "✨" },
        night: { name: "Pastel Night", title: "Midnight Magic 🌙", d1: "🌙", d2: "⭐", d3: "💜" }
    };

    const data = templateMeta[template] || templateMeta.spider;

    const nameEl = document.getElementById("selectedTemplateName");
    if (nameEl) nameEl.textContent = data.name;

    const titleEl = document.getElementById("frameTitle");
    if (titleEl) titleEl.textContent = data.title;

    const d1 = document.querySelector(".decoration.d1");
    if (d1) d1.textContent = data.d1;
    const d2 = document.querySelector(".decoration.d2");
    if (d2) d2.textContent = data.d2;
    const d3 = document.querySelector(".decoration.d3");
    if (d3) d3.textContent = data.d3;
}


/* =========================================
   FILTER TEMPLATES
========================================= */

function filterTemplates(category, button) {

    document.querySelectorAll(".category")
        .forEach(btn => {

            btn.classList.remove("active");

        });


    button.classList.add("active");


    document.querySelectorAll(".template-card")
        .forEach(card => {

            if (
                category === "all" ||
                card.dataset.category === category
            ) {

                card.style.display = "";

            } else {

                card.style.display = "none";

            }

        });

}


/* =========================================
   UPLOAD
========================================= */

function openUpload() {

    const input =
        document.getElementById("imageUpload");

    input.value = "";

    input.click();

}


document.getElementById("imageUpload")
    .addEventListener("change", function () {

        const file = this.files[0];

        if (!file) return;


        if (!file.type.startsWith("image/")) {

            alert("Please select an image.");

            return;

        }


        const reader = new FileReader();


        reader.onload = function (event) {

            insertPhoto(
                event.target.result,
                selectedSlot
            );

        };


        reader.readAsDataURL(file);

    });


/* =========================================
   INSERT PHOTO
========================================= */

function insertPhoto(source, index) {

    const image =
        document.getElementById(
            "photo-" + index
        );


    if (!image) return;


    image.src = source;


    image.parentElement
        .classList.add("has-image");


    updateStatus();


    /* Move to next empty slot */

    const total =
        currentSize * currentSize;


    if (selectedSlot < total - 1) {

        selectedSlot++;

    }

}


/* =========================================
   CAMERA
========================================= */

async function openCamera() {

    const modal =
        document.getElementById(
            "cameraModal"
        );


    modal.classList.add("show");


    try {

        cameraStream =
            await navigator.mediaDevices.getUserMedia({

                video: {
                    facingMode: "user"
                },

                audio: false

            });


        const video =
            document.getElementById(
                "cameraVideo"
            );


        video.srcObject =
            cameraStream;


    } catch (error) {

        console.error(error);

        alert(
            "Camera permission is required.\n\n" +
            "Please allow camera access in your browser."
        );

        closeCamera();

    }

}


/* =========================================
   CAPTURE PHOTO
========================================= */

function capturePhoto() {

    const video =
        document.getElementById(
            "cameraVideo"
        );


    if (
        video.readyState <
        HTMLMediaElement.HAVE_CURRENT_DATA
    ) {

        alert("Camera is not ready yet.");

        return;

    }


    const canvas =
        document.createElement("canvas");


    canvas.width =
        video.videoWidth;


    canvas.height =
        video.videoHeight;


    const context =
        canvas.getContext("2d");


    /*
       IMPORTANT:

       No scaleX(-1).

       This means the saved photo is
       NOT horizontally reversed.
    */

    context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );


    const image =
        canvas.toDataURL(
            "image/jpeg",
            0.92
        );


    insertPhoto(
        image,
        selectedSlot
    );


    closeCamera();

}


/* =========================================
   CLOSE CAMERA
========================================= */

function closeCamera() {

    const modal =
        document.getElementById(
            "cameraModal"
        );


    modal.classList.remove("show");


    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(track => track.stop());


        cameraStream = null;

    }


    document.getElementById(
        "cameraVideo"
    ).srcObject = null;

}


/* =========================================
   STATUS
========================================= */

function updateStatus() {

    const slots =
        document.querySelectorAll(
            ".photo-slot"
        );


    let filled = 0;


    slots.forEach(slot => {

        if (
            slot.classList.contains(
                "has-image"
            )
        ) {

            filled++;

        }

    });


    const total =
        currentSize * currentSize;


    document.getElementById(
        "photoStatus"
    ).textContent =
        `${filled} / ${total} photos added`;

}


/* =========================================
   CLEAR
========================================= */

function clearFrame() {

    document.querySelectorAll(
        ".photo-slot"
    ).forEach(slot => {

        const img =
            slot.querySelector("img");


        img.src = "";


        slot.classList.remove(
            "has-image"
        );

    });


    selectedSlot = 0;

    updateStatus();

}


/* =========================================
   SAVE & BOOTH
========================================= */

function openInBooth() {
    try {
        localStorage.setItem("snapBridgeTemplate", selectedTemplate);
    } catch(e) {}
    window.location.href = "booth.html";
}

function downloadFrame() {
    const frame = document.getElementById("photoFrame");
    const slots = document.querySelectorAll(".photo-slot");
    const titleEl = document.getElementById("frameTitle");
    const title = titleEl ? titleEl.textContent.trim() : "Snap Bridge";

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const width = 800;
    const height = 960;
    canvas.width = width;
    canvas.height = height;

    // Background themes
    const bgGradients = {
        spider: ["#173574", "#e5394f"],
        denim: ["#183b5c", "#315c7d"],
        botanical: ["#fffaf0", "#e9dcc4"],
        bow: ["#fff2f5", "#ffd9e3"],
        film: ["#17181b", "#25262a"],
        rainbow: ["#c9f2ff", "#ffe0f0"],
        neon: ["#0d1027", "#3c3b83"],
        rose: ["#fff8ed", "#f5d5da"],
        lavender: ["#e9efff", "#ded2f8"],
        dreamy: ["#d9d2ff", "#9e91ca"],
        floral: ["#fffdf7", "#f8f0db"],
        cutepink: ["#fff5fb", "#f9e5f1"],
        mint: ["#eaf9f3", "#bce4d1"],
        butterfly: ["#e1eeff", "#bbd7fc"],
        scrapbook: ["#f5ecd8", "#efe4cb"],
        ocean: ["#dcf0fb", "#71bde8"],
        candy: ["#ffebf3", "#e7f0ff"],
        royal: ["#2b1f48", "#1c1533"],
        kitty: ["#fff7fa", "#ffd8e7"],
        polaroid: ["#fffdf5", "#f2ede0"],
        night: ["#141733", "#464b85"]
    };

    const colors = bgGradients[selectedTemplate] || ["#f5f8ff", "#e0e7fa"];
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Frame border
    ctx.strokeStyle = selectedTemplate === "neon" ? "#d889ff" : (selectedTemplate === "royal" ? "#e2be6d" : "#ffffff");
    ctx.lineWidth = 18;
    ctx.strokeRect(9, 9, width - 18, height - 18);

    // Grid layout
    const size = currentSize;
    const padding = 54;
    const bottomSpace = 110;
    const availW = width - padding * 2;
    const availH = height - padding * 2 - bottomSpace;
    const gap = 14;

    const cellW = (availW - (size - 1) * gap) / size;
    const cellH = (availH - (size - 1) * gap) / size;

    slots.forEach((slot, index) => {
        const row = Math.floor(index / size);
        const col = index % size;
        const x = padding + col * (cellW + gap);
        const y = padding + row * (cellH + gap);

        const img = slot.querySelector("img");
        if (img && img.src && img.complete && img.naturalWidth > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, cellW, cellH);
            ctx.clip();
            const scale = Math.max(cellW / img.naturalWidth, cellH / img.naturalHeight);
            const w = img.naturalWidth * scale;
            const h = img.naturalHeight * scale;
            const ix = x + (cellW - w) / 2;
            const iy = y + (cellH - h) / 2;
            ctx.drawImage(img, ix, iy, w, h);
            ctx.restore();

            ctx.strokeStyle = "rgba(255,255,255,0.9)";
            ctx.lineWidth = 5;
            ctx.strokeRect(x, y, cellW, cellH);
        } else {
            ctx.fillStyle = "rgba(255,255,255,0.75)";
            ctx.fillRect(x, y, cellW, cellH);
            ctx.strokeStyle = "rgba(0,0,0,0.08)";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, cellW, cellH);
            ctx.fillStyle = "#8a96aa";
            ctx.font = "28px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("📸", x + cellW / 2, y + cellH / 2);
        }
    });

    // Draw Title Banner & Text
    const isDark = ["neon", "night", "film", "royal"].includes(selectedTemplate);
    const bannerX = 50;
    const bannerW = width - 100;
    const bannerH = 64;
    const bannerY = height - 102;
    ctx.save();
    ctx.fillStyle = isDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.85)";
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 12);
        ctx.fill();
    } else {
        ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = isDark ? "#ffffff" : "#17275f";
    ctx.font = "bold 32px 'Pacifico', 'DM Sans', 'Segoe UI Emoji', 'Apple Color Emoji', cursive, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(title || "Snap Bridge ✨", width / 2, bannerY + bannerH / 2);
    ctx.restore();

    // Draw Corner Decorations (Emojis)
    const d1 = document.querySelector(".decoration.d1")?.textContent.trim() || "";
    const d2 = document.querySelector(".decoration.d2")?.textContent.trim() || "";
    const d3 = document.querySelector(".decoration.d3")?.textContent.trim() || "";
    ctx.save();
    ctx.font = '48px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
    ctx.shadowBlur = 6;
    if (d1) {
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(d1, 24, 20);
    }
    if (d2) {
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillText(d2, width - 24, 20);
    }
    if (d3) {
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(d3, width - 24, height - 20);
    }
    ctx.restore();

    const link = document.createElement("a");
    link.download = `SnapBridge-${selectedTemplate}-frame.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
}


/* =========================================
   CLOSE MODAL
========================================= */

document.getElementById("cameraModal")
    .addEventListener("click", function(event) {

        if (event.target === this) {

            closeCamera();

        }

    });


document.addEventListener("keydown", function(event) {

    if (event.key === "Escape") {

        closeCamera();

    }

});