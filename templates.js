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


    document.querySelectorAll(".template-card")
        .forEach(item => {

            item.classList.remove("selected");

        });


    card.classList.add("selected");


    const frame =
        document.getElementById("photoFrame");


    frame.className =
        "photo-frame " + template;


    const names = {

        spider: "Spider Template",

        denim: "Denim Template",

        botanical: "Botanical Template",

        bow: "Pink Bow Template",

        film: "Film Strip Template",

        rainbow: "Rainbow Template",

        neon: "Neon Night Template",

        rose: "Rose Garden Template"

    };


    document.getElementById(
        "selectedTemplateName"
    ).textContent = names[template];


    /* Change title */

    const title =
        document.getElementById("frameTitle");


    if (template === "spider") {

        title.textContent = "Amazing Memories";

    }

    else if (template === "denim") {

        title.textContent = "Good Vibes";

    }

    else if (template === "botanical") {

        title.textContent = "Beautiful Moments";

    }

    else if (template === "bow") {

        title.textContent = "Sweet Memories";

    }

    else if (template === "film") {

        title.textContent = "Capture Good Times";

    }

    else if (template === "rainbow") {

        title.textContent = "Happy Memories";

    }

    else if (template === "neon") {

        title.textContent = "Glow Together";

    }

    else if (template === "rose") {

        title.textContent = "Forever Moments";

    }

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
   PRINT
========================================= */

function printFrame() {

    window.print();

}


/* =========================================
   SAVE
========================================= */

function downloadFrame() {

    alert(
        "Your frame is ready!\n\n" +
        "Use Print → Save as PDF to save " +
        "your finished printable frame."
    );

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