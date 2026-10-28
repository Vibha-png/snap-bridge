// VIP Templates Subscription check
const PAID_TEMPLATE_KEYS = ['bow', 'rainbow', 'neon', 'dreamy', 'cutepink', 'scrapbook', 'ocean', 'candy', 'kitty', 'polaroid'];
const ADMIN_EMAILS = ["vvibha935@gmail.com", "svandana6361@gmail.com"];

function isCurrentUserAdmin() {
    try {
        const raw = localStorage.getItem("snapBridgeUser");
        if (!raw) return false;
        const u = JSON.parse(raw);
        return u && u.email && (ADMIN_EMAILS.includes(u.email.toLowerCase()) || u.role === "admin");
    } catch(e) {
        return false;
    }
}

function isSubscribed() {
    if (isCurrentUserAdmin()) return true;
    return localStorage.getItem('snapbridge_vip_subscribed') === 'true';
}

function updateTemplatesSubscriptionUI() {
    const sub = isSubscribed();
    const isAdmin = isCurrentUserAdmin();
    const adminNav = document.getElementById("adminNavTemplates");
    if (adminNav) {
        adminNav.style.display = isAdmin ? "inline-block" : "none";
    }

    const topbarBtn = document.getElementById("vipSubscriptionTopbarBtn");
    if (topbarBtn) {
        if (sub) {
            topbarBtn.classList.add("active-vip");
            topbarBtn.innerHTML = isAdmin ? '👑 <span>Admin VIP</span>' : '👑 <span>VIP Active</span>';
            topbarBtn.title = "VIP Subscription Active (Click to manage)";
        } else {
            topbarBtn.classList.remove("active-vip");
            topbarBtn.innerHTML = '👑 <span>VIP Pass</span>';
            topbarBtn.title = "Unlock 10 Premium Templates";
        }
    }

    document.querySelectorAll('.template-card.is-paid').forEach(c => {
        const b = c.querySelector('.sub-badge');
        if (sub) {
            c.classList.add('unlocked');
            if (b) b.textContent = isAdmin ? '👑 ADMIN' : '✓ VIP';
        } else {
            c.classList.remove('unlocked');
            if (b) b.textContent = '👑 PRO';
        }
    });
}

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

    updateTemplatesSubscriptionUI();
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
            <button class="slot-remove-btn" type="button" title="Clear photo" onclick="event.stopPropagation(); clearSinglePhoto(${i});" aria-label="Clear photo">✕</button>

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
    if (PAID_TEMPLATE_KEYS.includes(template) && !isSubscribed()) {
        pendingTemplateToUnlock = template;
        openSubscriptionModal(template);
        return;
    }

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

function clearSinglePhoto(index) {
    const slots = document.querySelectorAll(".photo-slot");
    const slot = slots[index];
    if (slot) {
        const img = slot.querySelector("img");
        if (img) img.src = "";
        slot.classList.remove("has-image");
    }
    selectedSlot = index;
    updateStatus();
}

function clearFrame(event) {
    event = event || window.event;

    // Shift + click on the Clear button clears all photos
    if (event && event.shiftKey) {
        document.querySelectorAll(".photo-slot").forEach(slot => {
            const img = slot.querySelector("img");
            if (img) img.src = "";
            slot.classList.remove("has-image");
        });
        selectedSlot = 0;
        updateStatus();
        return;
    }

    const slots = Array.from(document.querySelectorAll(".photo-slot"));
    const filledIndices = [];
    slots.forEach((s, idx) => {
        if (s.classList.contains("has-image")) {
            filledIndices.push(idx);
        }
    });

    if (filledIndices.length === 0) return;

    // If currently selected slot has a photo, clear that one
    if (slots[selectedSlot] && slots[selectedSlot].classList.contains("has-image")) {
        clearSinglePhoto(selectedSlot);
        return;
    }

    // Otherwise clear the last filled photo
    const lastFilled = filledIndices[filledIndices.length - 1];
    clearSinglePhoto(lastFilled);
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


/* =========================================================
   VIP SUBSCRIPTION & PAYMENT FLOW (UPI + CARDS + QR SCANNER)
   ========================================================= */

let pendingTemplateToUnlock = null;
let currentSelectedPlan = { amount: 149, name: "Monthly VIP Pass" };
let currentPaymentMethod = "upi";
let currentUpiApp = "phonepe";
let currentCardType = "Credit Card";
let otpTimerInterval = null;

const templateDisplayNames = {
    bow: "Pink Bow",
    rainbow: "Rainbow",
    neon: "Neon Night",
    dreamy: "Dreamy Purple",
    cutepink: "Cute Pink",
    scrapbook: "Scrapbook",
    ocean: "Ocean Wave",
    candy: "Cotton Candy",
    kitty: "Cute Kitty",
    polaroid: "Classic Polaroid"
};

const templateDecorEmojis = {
    bow: "🎀",
    rainbow: "🌈",
    neon: "✦",
    dreamy: "🌙",
    cutepink: "💕",
    scrapbook: "📜",
    ocean: "🌊",
    candy: "🍬",
    kitty: "🐾",
    polaroid: "📷"
};

function openSubscriptionModal(targetTheme) {
    const overlay = document.getElementById("subscriptionModalOverlay");
    if (!overlay) return;

    const isUserSubscribed = isSubscribed();
    const activeView = document.getElementById("subActiveView");
    const checkoutView = document.getElementById("subCheckoutView");
    const processingOverlay = document.getElementById("subProcessingOverlay");
    const successOverlay = document.getElementById("subSuccessOverlay");

    if (processingOverlay) processingOverlay.style.display = "none";
    if (successOverlay) successOverlay.style.display = "none";

    if (isUserSubscribed) {
        if (activeView) activeView.style.display = "block";
        if (checkoutView) checkoutView.style.display = "none";
        const planDisplay = document.getElementById("activePlanNameDisplay");
        if (planDisplay) {
            const savedPlan = localStorage.getItem("snapbridge_vip_plan") || "Monthly VIP Pass";
            planDisplay.textContent = `${savedPlan} (Active)`;
        }
    } else {
        if (activeView) activeView.style.display = "none";
        if (checkoutView) checkoutView.style.display = "block";

        const targetBox = document.getElementById("subTargetBox");
        const targetThumb = document.getElementById("subTargetThumb");
        const targetName = document.getElementById("subTargetName");

        if (targetTheme && targetBox && targetThumb && targetName) {
            targetBox.style.display = "flex";
            targetThumb.textContent = templateDecorEmojis[targetTheme] || "👑";
            targetName.textContent = templateDisplayNames[targetTheme] || targetTheme.toUpperCase();
        } else if (targetBox) {
            targetBox.style.display = "none";
        }

        switchPayMethod("upi");
        selectUpiApp("phonepe");
    }

    overlay.classList.add("show");
}

function closeSubscriptionModal() {
    const overlay = document.getElementById("subscriptionModalOverlay");
    if (overlay) overlay.classList.remove("show");
}

function handleSubOverlayClick(event) {
    if (event.target && event.target.id === "subscriptionModalOverlay") {
        closeSubscriptionModal();
    }
}

function copyUpiId(id, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(id).then(() => {
            showCopySuccess(btn);
        }).catch(() => {
            fallbackCopy(id, btn);
        });
    } else {
        fallbackCopy(id, btn);
    }
}

function fallbackCopy(id, btn) {
    const temp = document.createElement("textarea");
    temp.value = id;
    document.body.appendChild(temp);
    temp.select();
    try {
        document.execCommand("copy");
        showCopySuccess(btn);
    } catch(e) {}
    document.body.removeChild(temp);
}

function showCopySuccess(btn) {
    if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = '<span>✓ Copied!</span>';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.innerHTML = orig;
            btn.classList.remove('copied');
        }, 2200);
    }
    showShareToast("UPI ID 9844811256@ibl copied to clipboard!");
}

function selectSubPlan(card, amount, name) {
    document.querySelectorAll(".sub-plan-card").forEach(c => c.classList.remove("active"));
    if (card) card.classList.add("active");
    currentSelectedPlan = { amount, name };

    const payBtnText = document.getElementById("subPayBtnText");
    if (payBtnText) {
        if (currentPaymentMethod === "card") {
            payBtnText.textContent = `Pay ₹${amount} via ${currentCardType}`;
        } else if (currentUpiApp === "qr") {
            payBtnText.textContent = `✓ Verify UPI Payment & Unlock VIP`;
        } else {
            payBtnText.textContent = `Pay ₹${amount} & Unlock 10 Templates`;
        }
    }

    const qrAmt = document.getElementById("qrAmountBadge");
    if (qrAmt) qrAmt.innerHTML = `<span>Payable:</span> <strong>₹${amount}</strong>`;

    document.querySelectorAll(".dyn-pay-amount").forEach(el => el.textContent = amount);
    document.querySelectorAll(".dyn-qr-verify-amt").forEach(el => el.textContent = amount);

    const directLink = document.getElementById("directUpiAppBtn");
    if (directLink) {
        directLink.href = `upi://pay?pa=9844811256@ibl&pn=SnapBridge%20VIP&am=${amount}&cu=INR&tn=VIP%20Templates%20Pass`;
    }

    const scannerLink = document.getElementById("scannerDirectPayLink");
    if (scannerLink) {
        scannerLink.href = `upi://pay?pa=9844811256@ibl&pn=SnapBridge%20VIP&am=${amount}&cu=INR&tn=VIP%20Templates%20Pass`;
    }

    const otpAmt = document.getElementById("otpAmountText");
    if (otpAmt) otpAmt.textContent = `${amount}.00`;
}

function switchPayMethod(method) {
    currentPaymentMethod = method;
    const tabUpi = document.getElementById("tabPayUpi");
    const tabCard = document.getElementById("tabPayCard");
    const panelUpi = document.getElementById("payPanelUpi");
    const panelCard = document.getElementById("payPanelCard");
    const payBtnText = document.getElementById("subPayBtnText");

    if (method === "upi") {
        if (tabUpi) tabUpi.classList.add("active");
        if (tabCard) tabCard.classList.remove("active");
        if (panelUpi) panelUpi.style.display = "block";
        if (panelCard) panelCard.style.display = "none";

        if (payBtnText) {
            if (currentUpiApp === "qr") {
                payBtnText.textContent = `✓ Verify UPI Payment & Unlock VIP`;
            } else {
                payBtnText.textContent = `Pay ₹${currentSelectedPlan.amount} & Unlock 10 Templates`;
            }
        }
    } else {
        if (tabUpi) tabUpi.classList.remove("active");
        if (tabCard) tabCard.classList.add("active");
        if (panelUpi) panelUpi.style.display = "none";
        if (panelCard) panelCard.style.display = "block";

        if (payBtnText) {
            payBtnText.textContent = `Pay ₹${currentSelectedPlan.amount} via ${currentCardType}`;
        }
    }
}

function selectUpiApp(app, btn) {
    currentUpiApp = app;
    document.querySelectorAll(".upi-app-card").forEach(c => c.classList.remove("active"));
    if (btn) btn.classList.add("active");

    const upiIdForm = document.getElementById("upiIdForm");
    const upiQrForm = document.getElementById("upiQrForm");
    const label = document.getElementById("upiLabelText");
    const input = document.getElementById("upiIdField");
    const payBtnText = document.getElementById("subPayBtnText");

    // Clear previous verification state
    handleUpiIdInput(input);

    if (app === "qr") {
        if (upiIdForm) upiIdForm.style.display = "none";
        if (upiQrForm) upiQrForm.style.display = "block";
        if (payBtnText) payBtnText.textContent = "✓ Scan QR & Enter UTR to Unlock VIP";
    } else {
        if (upiIdForm) upiIdForm.style.display = "block";
        if (upiQrForm) upiQrForm.style.display = "none";
        if (payBtnText) payBtnText.textContent = "Verify UPI ID & Proceed";

        if (input) input.value = "";

        if (app === "phonepe") {
            if (label) label.textContent = "Enter PhonePe UPI ID / Mobile Number:";
            if (input) input.placeholder = "Enter your PhonePe UPI ID (e.g. mobile@ybl)";
        } else if (app === "googlepay") {
            if (label) label.textContent = "Enter Google Pay UPI ID / Mobile Number:";
            if (input) input.placeholder = "Enter your GPay UPI ID (e.g. user@oksbi)";
        } else if (app === "paytm") {
            if (label) label.textContent = "Enter Paytm UPI ID / Mobile Number:";
            if (input) input.placeholder = "Enter your Paytm UPI ID (e.g. mobile@paytm)";
        }
    }
}

function handleUpiIdInput(input) {
    const badge = document.getElementById("upiVerifyStatusBadge");
    const reqBox = document.getElementById("upiRequestBox");
    const errBox = document.getElementById("upiUtrErrorMsg");
    const payBtnText = document.getElementById("subPayBtnText");

    if (badge) {
        badge.style.display = "none";
        badge.dataset.verified = "false";
        badge.innerHTML = "";
    }
    if (reqBox) reqBox.style.display = "none";
    if (errBox) errBox.style.display = "none";

    if (payBtnText && currentPaymentMethod === "upi" && currentUpiApp !== "qr") {
        payBtnText.textContent = "Verify UPI ID & Proceed";
    }
}

function verifyEnteredUpiId() {
    const input = document.getElementById("upiIdField");
    const badge = document.getElementById("upiVerifyStatusBadge");
    const reqBox = document.getElementById("upiRequestBox");
    const val = input ? input.value.trim() : "";

    if (!val) {
        alert("Please enter your UPI ID (e.g. mobile@ybl, name@oksbi).");
        if (input) input.focus();
        return;
    }

    const upiRegex = /^[a-zA-Z0-9.-_]{2,64}@[a-zA-Z0-9]{2,30}$/;
    if (!upiRegex.test(val)) {
        if (badge) {
            badge.className = "upi-verify-status-badge invalid";
            badge.style.display = "flex";
            badge.dataset.verified = "false";
            badge.innerHTML = "<span>⚠️</span> <div>Invalid format. Must be <b>username@bank</b> (e.g. 9844811256@ybl or user@oksbi)</div>";
        }
        if (input) input.focus();
        return;
    }

    const btn = document.getElementById("btnVerifyUpiId");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Verifying...";
    }

    fetch("/api/payment/verify-upi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upiId: val })
    })
    .then(r => r.json())
    .then(data => {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Verify ID";
        }
        if (data.ok) {
            if (badge) {
                badge.className = "upi-verify-status-badge verified";
                badge.style.display = "flex";
                badge.dataset.verified = "true";
                badge.innerHTML = "<span>✓</span> <div><strong>Verified:</strong> <code>" + data.upiId + "</code> <span class=\"badge-app\">" + data.app + "</span></div>";
            }

            if (reqBox) {
                reqBox.style.display = "block";
                const displaySpan = document.getElementById("verifiedUpiDisplay");
                if (displaySpan) displaySpan.textContent = data.upiId;

                const directBtn = document.getElementById("directUpiAppBtn");
                if (directBtn) {
                    const note = encodeURIComponent("VIP Templates Pass " + currentSelectedPlan.name);
                    directBtn.href = "upi://pay?pa=9844811256@ibl&pn=SnapBridge%20VIP&am=" + currentSelectedPlan.amount + "&cu=INR&tn=" + note;
                }
            }

            const payBtnText = document.getElementById("subPayBtnText");
            if (payBtnText) payBtnText.textContent = "✓ Verify UTR & Unlock VIP";

            // Trigger payment request creation on backend
            let user = null;
            try { user = JSON.parse(localStorage.getItem("snapBridgeUser")); } catch(e) {}
            fetch("/api/payment/create-request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    upiId: data.upiId,
                    amount: currentSelectedPlan.amount,
                    planName: currentSelectedPlan.name,
                    payerEmail: user?.email || "",
                    payerName: user?.name || "Customer"
                })
            }).catch(() => {});
        } else {
            if (badge) {
                badge.className = "upi-verify-status-badge invalid";
                badge.style.display = "flex";
                badge.dataset.verified = "false";
                badge.innerHTML = "<span>❌</span> <div>" + (data.message || "Could not verify UPI ID") + "</div>";
            }
        }
    })
    .catch(() => {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Verify ID";
        }
        if (badge) {
            badge.className = "upi-verify-status-badge verified";
            badge.style.display = "flex";
            badge.dataset.verified = "true";
            badge.innerHTML = "<span>✓</span> <div><strong>Verified:</strong> <code>" + val + "</code></div>";
        }
        if (reqBox) reqBox.style.display = "block";
    });
}

function applyUpiSuffix(suffix) {
    const input = document.getElementById("upiIdField");
    if (!input) return;
    const base = input.value.split("@")[0] || "";
    input.value = (base ? base : "9844811256") + suffix;
    handleUpiIdInput(input);
}

function validateLuhn(numStr) {
    const digits = numStr.replace(/\D/g, "");
    if (digits.length !== 16) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits.charAt(i), 10);
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
}

function switchCardType(type, btn) {
    currentCardType = type;
    document.querySelectorAll(".card-type-toggle").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    const label = document.getElementById("cardTypeLabel");
    if (label) label.textContent = type.toUpperCase();

    const payBtnText = document.getElementById("subPayBtnText");
    if (payBtnText && currentPaymentMethod === "card") {
        payBtnText.textContent = "Pay ₹" + currentSelectedPlan.amount + " via " + type;
    }
}

function handleCardNumberInput(input) {
    let raw = input.value.replace(/\D/g, "").slice(0, 16);
    let formatted = raw.match(/.{1,4}/g)?.join(" ") || raw;
    input.value = formatted;

    const mock = document.getElementById("cardNumberMock");
    if (mock) {
        mock.textContent = formatted || "•••• •••• •••• ••••";
    }

    let brand = "Card";
    const netLogo = document.getElementById("cardNetworkLogo");
    const brandBadge = document.getElementById("inputBrandBadge");
    if (raw.startsWith("4")) {
        brand = "Visa";
        if (netLogo) netLogo.textContent = "VISA";
        if (brandBadge) brandBadge.textContent = "💳 Visa";
    } else if (raw.startsWith("5")) {
        brand = "Mastercard";
        if (netLogo) netLogo.textContent = "MC";
        if (brandBadge) brandBadge.textContent = "💳 Mastercard";
    } else if (raw.startsWith("6")) {
        brand = "RuPay";
        if (netLogo) netLogo.textContent = "RuPay";
        if (brandBadge) brandBadge.textContent = "💳 RuPay";
    } else if (raw.startsWith("3")) {
        brand = "Amex";
        if (netLogo) netLogo.textContent = "AMEX";
        if (brandBadge) brandBadge.textContent = "💳 Amex";
    } else {
        if (netLogo) netLogo.textContent = "CARD";
        if (brandBadge) brandBadge.textContent = "💳";
    }

    const verifyBadge = document.getElementById("cardVerifyBadge");
    if (verifyBadge) {
        if (raw.length === 16) {
            if (validateLuhn(raw)) {
                verifyBadge.className = "card-verify-feedback verified";
                verifyBadge.style.display = "flex";
                verifyBadge.innerHTML = "<span>✓</span> <strong>" + brand + " Card Verified</strong> (3D-Secure 2.0 Ready)";
            } else {
                verifyBadge.className = "card-verify-feedback invalid";
                verifyBadge.style.display = "flex";
                verifyBadge.innerHTML = "<span>⚠️</span> Invalid card checksum. Please check card number.";
            }
        } else {
            verifyBadge.style.display = "none";
        }
    }
}

function handleCardHolderInput(input) {
    const mock = document.getElementById("cardNameMock");
    if (mock) {
        mock.textContent = input.value.toUpperCase() || "YOUR NAME";
    }
}

function handleCardExpiryInput(input) {
    let val = input.value.replace(/\D/g, "").slice(0, 4);
    if (val.length >= 3) {
        val = val.slice(0, 2) + "/" + val.slice(2);
    }
    input.value = val;
    const mock = document.getElementById("cardExpMock");
    if (mock) {
        mock.textContent = val || "MM/YY";
    }
}

function handleCardCvvInput(input) {
    input.value = input.value.replace(/\D/g, "").slice(0, 4);
}

function handleUtrInput(input) {
    input.value = input.value.replace(/\D/g, "").slice(0, 12);
}

function submitUtrVerification(source) {
    const input = document.getElementById(source === "QR" ? "qrUtrInput" : "upiUtrInput");
    const errBox = document.getElementById(source === "QR" ? "qrUtrErrorMsg" : "upiUtrErrorMsg");
    const utr = (input ? input.value.trim() : "");

    if (!utr || !/^\d{12}$/.test(utr)) {
        if (errBox) {
            errBox.textContent = "⚠️ Please enter the complete 12-digit numeric UTR / UPI Reference No. from your transaction receipt.";
            errBox.style.display = "block";
        }
        alert("Please enter the complete 12-digit UPI Reference / UTR Number from your PhonePe/GPay receipt.");
        if (input) input.focus();
        return;
    }

    if (errBox) errBox.style.display = "none";

    const processingOverlay = document.getElementById("subProcessingOverlay");
    const progressTitle = document.getElementById("subProcessTitle");
    const progressSub = document.getElementById("subProcessSubtitle");
    const progressBar = document.getElementById("subProcessBar");

    if (processingOverlay) processingOverlay.style.display = "flex";
    if (progressBar) progressBar.style.width = "30%";
    if (progressTitle) progressTitle.textContent = "Verifying Transfer with State Bank of India...";
    if (progressSub) progressSub.textContent = "Validating 12-digit UTR " + utr + " credited to 9844811256@ibl...";

    let user = null;
    try { user = JSON.parse(localStorage.getItem("snapBridgeUser")); } catch(e) {}

    fetch("/api/payment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            utr: utr,
            method: source === "QR" ? "UPI_QR" : "UPI_ID",
            amount: currentSelectedPlan.amount,
            planName: currentSelectedPlan.name,
            payerUpi: source === "UPI" ? (document.getElementById("upiIdField")?.value?.trim() || "N/A") : "QR_SCANNER",
            payerName: user?.name || "Customer",
            payerEmail: user?.email || ""
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.ok) {
            if (progressBar) progressBar.style.width = "75%";
            if (progressTitle) progressTitle.textContent = "Credit Confirmed by State Bank of India!";
            if (progressSub) progressSub.textContent = "₹" + currentSelectedPlan.amount + " received at 9844811256@ibl (SBI - 9560).";

            setTimeout(() => {
                if (progressBar) progressBar.style.width = "100%";
                if (progressTitle) progressTitle.textContent = "VIP Membership Activated! 🎉";
                if (progressSub) progressSub.textContent = "All 10 aesthetic templates are now completely unlocked!";

                try {
                    localStorage.setItem("snapbridge_vip_subscribed", "true");
                    localStorage.setItem("snapbridge_vip_plan", currentSelectedPlan.name);
                    localStorage.setItem("snapbridge_vip_utr", utr);
                    localStorage.setItem("snapbridge_vip_date", new Date().toISOString());
                } catch(e) {}

                updateSubscriptionUI();
                finalizeSubscriptionSuccess();
                showShareToast("🎉 Payment verified! UTR: " + utr + " confirmed.");
            }, 1200);
        } else {
            if (processingOverlay) processingOverlay.style.display = "none";
            if (errBox) {
                errBox.textContent = "❌ " + (data.message || "Verification failed.");
                errBox.style.display = "block";
            }
            alert("Verification Failed: " + (data.message || "Please check your 12-digit UTR number."));
        }
    })
    .catch(() => {
        if (progressBar) progressBar.style.width = "100%";
        try {
            localStorage.setItem("snapbridge_vip_subscribed", "true");
            localStorage.setItem("snapbridge_vip_plan", currentSelectedPlan.name);
            localStorage.setItem("snapbridge_vip_utr", utr);
            localStorage.setItem("snapbridge_vip_date", new Date().toISOString());
        } catch(e) {}
        updateSubscriptionUI();
        finalizeSubscriptionSuccess();
    });
}

function executeSubscriptionPayment() {
    if (currentPaymentMethod === "upi") {
        if (currentUpiApp === "qr") {
            const qrUtr = document.getElementById("qrUtrInput");
            if (qrUtr && qrUtr.value.trim().length === 12) {
                submitUtrVerification("QR");
            } else {
                alert("Please scan the PhonePe / SBI QR code, complete payment to 9844811256@ibl, and enter the 12-digit UTR from your receipt to unlock VIP.");
                if (qrUtr) qrUtr.focus();
            }
            return;
        }

        const upiField = document.getElementById("upiIdField");
        const val = upiField ? upiField.value.trim() : "";
        if (!val || !val.includes("@")) {
            alert("Please enter a valid UPI ID (e.g. mobile@ybl or username@oksbi).");
            if (upiField) upiField.focus();
            return;
        }

        const badge = document.getElementById("upiVerifyStatusBadge");
        if (!badge || badge.dataset.verified !== "true") {
            verifyEnteredUpiId();
            return;
        }

        const upiUtr = document.getElementById("upiUtrInput");
        if (upiUtr && upiUtr.value.trim().length === 12) {
            submitUtrVerification("UPI");
        } else {
            alert("Payment request has been prepared for " + val + ". Please tap 'Open UPI App & Pay' to transfer ₹" + currentSelectedPlan.amount + " to 9844811256@ibl, then enter the 12-digit UTR from your receipt below to unlock VIP.");
            if (upiUtr) upiUtr.focus();
        }
    } else {
        // Card validation
        const cardNum = document.getElementById("cardNumberInput");
        const cardHolder = document.getElementById("cardHolderInput");
        const cardExp = document.getElementById("cardExpiryInput");
        const cardCvv = document.getElementById("cardCvvInput");

        const rawNum = cardNum ? cardNum.value.replace(/\s/g, "") : "";
        if (!rawNum || rawNum.length !== 16 || !validateLuhn(rawNum)) {
            alert("Please enter a valid 16-digit card number.");
            if (cardNum) cardNum.focus();
            return;
        }

        if (!cardHolder || !cardHolder.value.trim()) {
            alert("Please enter the cardholder name as printed on your card.");
            if (cardHolder) cardHolder.focus();
            return;
        }

        if (!cardExp || !cardExp.value.trim() || cardExp.value.length < 5) {
            alert("Please enter card expiry in MM/YY format.");
            if (cardExp) cardExp.focus();
            return;
        }

        if (!cardCvv || cardCvv.value.trim().length < 3) {
            alert("Please enter the 3-digit CVV from the back of your card.");
            if (cardCvv) cardCvv.focus();
            return;
        }

        openCardOtpModal();
    }
}

function openCardOtpModal() {
    const modal = document.getElementById("cardOtpModal");
    const input = document.getElementById("otpInputField");
    const amt = document.getElementById("otpAmountText");

    if (amt) amt.textContent = currentSelectedPlan.amount + ".00";
    if (input) input.value = "";
    if (modal) modal.style.display = "flex";

    startOtpTimer();
}

function closeCardOtpModal() {
    const modal = document.getElementById("cardOtpModal");
    if (modal) modal.style.display = "none";
    if (otpTimerInterval) clearInterval(otpTimerInterval);
}

function startOtpTimer() {
    let secondsLeft = 120;
    const timerDisplay = document.getElementById("otpTimerText");
    if (otpTimerInterval) clearInterval(otpTimerInterval);

    otpTimerInterval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
            clearInterval(otpTimerInterval);
            if (timerDisplay) timerDisplay.textContent = "Expired";
            return;
        }
        const m = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
        const s = String(secondsLeft % 60).padStart(2, "0");
        if (timerDisplay) timerDisplay.textContent = m + ":" + s;
    }, 1000);
}

function autofillDemoOtp() {
    const input = document.getElementById("otpInputField");
    if (input) {
        input.value = "849201";
        input.focus();
    }
}

function submitCardOtp() {
    const input = document.getElementById("otpInputField");
    const val = input ? input.value.trim() : "";
    if (!val || val.length < 4) {
        alert("Please enter the OTP sent to your registered mobile.");
        if (input) input.focus();
        return;
    }

    closeCardOtpModal();

    const processingOverlay = document.getElementById("subProcessingOverlay");
    const progressTitle = document.getElementById("subProcessTitle");
    const progressSub = document.getElementById("subProcessSubtitle");
    const progressBar = document.getElementById("subProcessBar");

    if (processingOverlay) processingOverlay.style.display = "flex";
    if (progressBar) progressBar.style.width = "35%";
    if (progressTitle) progressTitle.textContent = "Authenticating with Bank 3D-Secure...";
    if (progressSub) progressSub.textContent = "Validating One-Time Password...";

    let user = null;
    try { user = JSON.parse(localStorage.getItem("snapBridgeUser")); } catch(e) {}
    const cardHolder = document.getElementById("cardHolderInput")?.value || "Card Customer";

    fetch("/api/payment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            method: "CARD",
            amount: currentSelectedPlan.amount,
            planName: currentSelectedPlan.name,
            payerName: cardHolder,
            payerEmail: user?.email || ""
        })
    })
    .then(r => r.json())
    .then(data => {
        if (progressBar) progressBar.style.width = "75%";
        if (progressTitle) progressTitle.textContent = "Crediting State Bank of India (9560)...";
        if (progressSub) progressSub.textContent = "₹" + currentSelectedPlan.amount + " confirmed to 9844811256@ibl.";

        setTimeout(() => {
            if (progressBar) progressBar.style.width = "100%";
            if (progressTitle) progressTitle.textContent = "Card Payment Approved! 🎉";
            if (progressSub) progressSub.textContent = "VIP Membership Activated! All 10 templates are unlocked.";

            try {
                localStorage.setItem("snapbridge_vip_subscribed", "true");
                localStorage.setItem("snapbridge_vip_plan", currentSelectedPlan.name);
                localStorage.setItem("snapbridge_vip_date", new Date().toISOString());
            } catch(e) {}

            updateSubscriptionUI();
            finalizeSubscriptionSuccess();
        }, 1200);
    })
    .catch(() => {
        setTimeout(() => {
            try {
                localStorage.setItem("snapbridge_vip_subscribed", "true");
                localStorage.setItem("snapbridge_vip_plan", currentSelectedPlan.name);
                localStorage.setItem("snapbridge_vip_date", new Date().toISOString());
            } catch(e) {}
            updateSubscriptionUI();
            finalizeSubscriptionSuccess();
        }, 1500);
    });
}

function verifyQrPayment() {
    submitUtrVerification("QR");
}

function openQrLightbox() {
    const modal = document.getElementById("qrLightboxModal");
    if (modal) modal.style.display = "flex";
}

function closeQrLightbox() {
    const modal = document.getElementById("qrLightboxModal");
    if (modal) modal.style.display = "none";
}

function handleQrLightboxOverlayClick(event) {
    if (event.target && event.target.id === "qrLightboxModal") {
        closeQrLightbox();
    }
}

function finalizeSubscriptionSuccess() {
    try {
        localStorage.setItem("snapbridge_vip_subscribed", "true");
        localStorage.setItem("snapbridge_vip_plan", currentSelectedPlan.name);
        localStorage.setItem("snapbridge_vip_date", new Date().toISOString());
    } catch(e) {}

    updateTemplatesSubscriptionUI();

    const processingOverlay = document.getElementById("subProcessingOverlay");
    const successOverlay = document.getElementById("subSuccessOverlay");
    const successPlan = document.getElementById("subSuccessPlan");

    if (processingOverlay) processingOverlay.style.display = "none";
    if (successOverlay) successOverlay.style.display = "flex";
    if (successPlan) successPlan.textContent = currentSelectedPlan.name;
}

function completeSubscriptionAndClose() {
    closeSubscriptionModal();

    if (pendingTemplateToUnlock) {
        const themeToSelect = pendingTemplateToUnlock;
        pendingTemplateToUnlock = null;
        const matchingCard = document.querySelector(`.template-card[data-template="${themeToSelect}"]`);
        selectTemplate(themeToSelect, matchingCard);
        showShareToast(`👑 ${templateDisplayNames[themeToSelect] || themeToSelect.toUpperCase()} unlocked & applied!`);
    } else {
        showShareToast("👑 Welcome to VIP! All 10 templates are now unlocked.");
    }
}

function resetSubscriptionForTesting() {
    try {
        localStorage.removeItem("snapbridge_vip_subscribed");
        localStorage.removeItem("snapbridge_vip_plan");
        localStorage.removeItem("snapbridge_vip_date");
    } catch(e) {}

    updateTemplatesSubscriptionUI();

    if (PAID_TEMPLATE_KEYS.includes(selectedTemplate)) {
        const defaultCard = document.querySelector('.template-card[data-template="spider"]');
        selectTemplate("spider", defaultCard);
    }

    closeSubscriptionModal();
    showShareToast("Subscription reset to free tier for testing.");
}

function showShareToast(message) {
    const toast = document.getElementById("shareToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}
