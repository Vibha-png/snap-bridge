/* ==========================================
   SNAP BRIDGE PHOTO FRAME
========================================== */


let currentSize = 1;

let selectedSlot = 0;

let cameraStream = null;


/* ==========================================
   INITIALIZE
========================================== */

document.addEventListener("DOMContentLoaded", function () {

    createPhotoSlots(1);

});


/* ==========================================
   CHANGE LAYOUT
========================================== */

function changeLayout(size) {

    currentSize = size;

    const totalPhotos = size * size;

    const grid = document.getElementById("photoGrid");

    grid.className = "photo-grid grid-layout-" + size;

    createPhotoSlots(totalPhotos);


    document.querySelectorAll(".layout-card")
        .forEach(card => {

            card.classList.remove("active");

        });


    const selected =
        document.querySelector(
            `.layout-card[data-size="${size}"]`
        );


    if (selected) {

        selected.classList.add("active");

    }


    updateStatus();

}


/* ==========================================
   CREATE PHOTO SLOTS
========================================== */

function createPhotoSlots(number) {

    const grid =
        document.getElementById("photoGrid");


    grid.innerHTML = "";


    for (let i = 0; i < number; i++) {

        const slot =
            document.createElement("div");


        slot.className = "photo-slot";


        slot.dataset.index = i;


        slot.innerHTML = `

            <img
                id="photo-${i}"
                alt="Photo"
            >
            <button class="slot-remove-btn" type="button" title="Clear photo" onclick="event.stopPropagation(); clearSinglePhoto(${i});" aria-label="Clear photo">✕</button>

            <div class="placeholder">

                <span>＋</span>

                Add Photo

            </div>

        `;


        slot.addEventListener(
            "click",
            function () {

                selectedSlot = i;

                openPhotoMenu();

            }
        );


        grid.appendChild(slot);

    }

}


/* ==========================================
   PHOTO MENU
========================================== */

function openPhotoMenu() {

    const choice =
        confirm(
            "Press OK to upload an image.\n\n" +
            "Press Cancel to take a photo."
        );


    if (choice) {

        openUpload();

    } else {

        openCamera();

    }

}


/* ==========================================
   UPLOAD IMAGE
========================================== */

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


        const reader =
            new FileReader();


        reader.onload = function (event) {

            insertPhoto(
                event.target.result,
                selectedSlot
            );

        };


        reader.readAsDataURL(file);

    });


/* ==========================================
   INSERT PHOTO
========================================== */

function insertPhoto(imageSource, index) {

    const image =
        document.getElementById(
            "photo-" + index
        );


    if (!image) return;


    image.src = imageSource;


    const slot =
        image.parentElement;


    slot.classList.add("has-image");


    updateStatus();

}


/* ==========================================
   CAMERA
========================================== */

async function openCamera() {

    const modal =
        document.getElementById("cameraModal");


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
            "Camera access was blocked.\n\n" +
            "Please allow camera permission in your browser."
        );


        closeCamera();

    }

}


/* ==========================================
   CAPTURE PHOTO
========================================== */

function capturePhoto() {

    const video =
        document.getElementById(
            "cameraVideo"
        );


    if (!video.videoWidth) {

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

        We intentionally DON'T use scaleX(-1).

        Therefore the captured photo isn't
        reversed/mirrored.
    */

    context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );


    const photo =
        canvas.toDataURL(
            "image/jpeg",
            0.92
        );


    insertPhoto(
        photo,
        selectedSlot
    );


    closeCamera();


    /* Automatically move to next slot */

    const total =
        currentSize * currentSize;


    if (selectedSlot < total - 1) {

        selectedSlot++;

    }

}


/* ==========================================
   CLOSE CAMERA
========================================== */

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


    const video =
        document.getElementById(
            "cameraVideo"
        );


    video.srcObject = null;

}


/* ==========================================
   CLEAR FRAME
========================================== */

function clearSinglePhoto(index) {
    const slots = document.querySelectorAll(".photo-slot");
    const slot = slots[index];
    if (slot) {
        const image = slot.querySelector("img");
        if (image) image.src = "";
        slot.classList.remove("has-image");
    }
    selectedSlot = index;
    updateStatus();
}

function clearFrame(event) {
    event = event || window.event;

    if (event && event.shiftKey) {
        const slots = document.querySelectorAll(".photo-slot");
        slots.forEach(slot => {
            const image = slot.querySelector("img");
            if (image) image.src = "";
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

    if (slots[selectedSlot] && slots[selectedSlot].classList.contains("has-image")) {
        clearSinglePhoto(selectedSlot);
        return;
    }

    const lastFilled = filledIndices[filledIndices.length - 1];
    clearSinglePhoto(lastFilled);
}


/* ==========================================
   STATUS
========================================== */

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


/* ==========================================
   FRAME STYLE
========================================== */

function changeFrameStyle(style, button) {

    const frame =
        document.getElementById(
            "photoFrame"
        );


    frame.className =
        "photo-frame " + style;


    document.querySelectorAll(
        ".style-option"
    ).forEach(btn => {

        btn.classList.remove(
            "selected"
        );

    });


    if (button) {
        button.classList.add("selected");
    } else {
        const found = Array.from(document.querySelectorAll(".style-option"))
            .find(btn => btn.textContent.trim().toLowerCase() === style.toLowerCase());
        if (found) {
            found.classList.add("selected");
        }
    }

}


/* ==========================================
   SPACING
========================================== */

function changeSpacing() {

    const value =
        document.getElementById(
            "spacing"
        ).value;


    document.getElementById(
        "photoGrid"
    ).style.gap =
        value + "px";

}


/* ==========================================
   ROUNDNESS
========================================== */

function changeRoundness() {

    const value =
        document.getElementById(
            "roundness"
        ).value;


    document.querySelectorAll(
        ".photo-slot"
    ).forEach(slot => {

        slot.style.borderRadius =
            value + "px";

    });

}


/* ==========================================
   PRINT
========================================== */

function printFrame() {

    window.print();

}


/* ==========================================
   SAVE
========================================== */

function downloadFrame() {

    alert(
        "To save your frame:\n\n" +
        "Choose Print → Save as PDF.\n\n" +
        "This keeps your photo frame printable."
    );

}


/* ==========================================
   CLOSE CAMERA WHEN CLICKING OUTSIDE
========================================== */

document.getElementById("cameraModal")
    .addEventListener("click", function (event) {

        if (event.target === this) {

            closeCamera();

        }

    });


/* ==========================================
   ESC KEY
========================================== */

document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {

        closeCamera();

    }

});

function logout() {
    if (confirm("Are you sure you want to log out of Snap Bridge?")) {
        if (typeof cameraStream !== "undefined" && cameraStream) {
            try { cameraStream.getTracks().forEach(t => t.stop()); } catch(e){}
        }
        localStorage.removeItem("snapBridgeLoggedIn");
        localStorage.removeItem("snapBridgeUser");
        sessionStorage.clear();
        window.location.href = "index.html";
    }
}
