/* =========================================================
   SNAP BRIDGE - script.js
   ========================================================= */


/* =========================================================
   PAGE LOADER
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    console.log("📸 Snap Bridge loaded successfully!");

    initializeNavigation();
    initializeAnimations();
    initializeForms();
    initializeButtons();
    initializePasswordToggle();

});


/* =========================================================
   NAVIGATION
   ========================================================= */

function initializeNavigation() {

    const menuButton =
        document.querySelector(".menu-btn");

    const navLinks =
        document.querySelector(".nav-links");


    if (menuButton && navLinks) {

        menuButton.addEventListener("click", function () {

            navLinks.classList.toggle("mobile-open");

        });

    }


    /*
       Close mobile menu after clicking a link.
    */

    if (navLinks) {

        const links =
            navLinks.querySelectorAll("a");

        links.forEach(function (link) {

            link.addEventListener("click", function () {

                navLinks.classList.remove(
                    "mobile-open"
                );

            });

        });

    }

}


/* =========================================================
   SMOOTH SCROLL
   ========================================================= */

document.addEventListener("click", function (event) {

    const link =
        event.target.closest(
            'a[href^="#"]'
        );

    if (!link) return;


    const targetId =
        link.getAttribute("href");


    if (
        targetId === "#" ||
        targetId.length <= 1
    ) {
        return;
    }


    const target =
        document.querySelector(targetId);


    if (target) {

        event.preventDefault();

        target.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

});


/* =========================================================
   ANIMATIONS
   ========================================================= */

function initializeAnimations() {

    const animatedElements =
        document.querySelectorAll(
            ".feature-card, .step, .about-image, .polaroid, .cta"
        );


    if (
        !("IntersectionObserver" in window)
    ) {

        animatedElements.forEach(function (element) {

            element.style.opacity = "1";

        });

        return;

    }


    const observer =
        new IntersectionObserver(
            function (entries) {

                entries.forEach(function (entry) {

                    if (entry.isIntersecting) {

                        entry.target.classList.add(
                            "show-animation"
                        );

                        observer.unobserve(
                            entry.target
                        );

                    }

                });

            },
            {
                threshold: 0.15
            }
        );


    animatedElements.forEach(function (element) {

        element.classList.add(
            "before-animation"
        );

        observer.observe(element);

    });

}


/* =========================================================
   LOGIN / SIGNUP FORMS
   ========================================================= */

function initializeForms() {

    const forms =
        document.querySelectorAll("form");


    forms.forEach(function (form) {

        form.addEventListener(
            "submit",
            function (event) {

                handleFormSubmit(
                    event,
                    form
                );

            }
        );

    });

}


/* =========================================================
   FORM HANDLER
   ========================================================= */

function handleFormSubmit(
    event,
    form
) {

    event.preventDefault();


    const email =
        form.querySelector(
            'input[type="email"]'
        );


    const password =
        form.querySelector(
            'input[type="password"]'
        );


    /*
       SIGNUP FORM
    */

    const nameInput =
        form.querySelector(
            'input[name="name"], input[id="name"]'
        );


    if (nameInput) {

        const name =
            nameInput.value.trim();


        const emailValue =
            email
                ? email.value.trim()
                : "";


        const passwordValue =
            password
                ? password.value
                : "";


        if (!name) {

            showMessage(
                form,
                "Please enter your name.",
                "error"
            );

            return;

        }


        if (!isValidEmail(emailValue)) {

            showMessage(
                form,
                "Please enter a valid email address.",
                "error"
            );

            return;

        }


        if (passwordValue.length < 6) {

            showMessage(
                form,
                "Password should contain at least 6 characters.",
                "error"
            );

            return;

        }


        /*
           Store basic demo account locally.

           This is NOT a real database.
        */

        const user = {

            name: name,

            email: emailValue,

            password: passwordValue

        };


        localStorage.setItem(
            "snapBridgeUser",
            JSON.stringify(user)
        );


        showMessage(
            form,
            "Account created successfully! ✨",
            "success"
        );


        setTimeout(function () {

            window.location.href =
                "index.html";

        }, 1200);


        return;

    }


    /*
       LOGIN FORM
    */

    if (email && password) {

        const emailValue =
            email.value.trim();


        const passwordValue =
            password.value;


        if (!isValidEmail(emailValue)) {

            showMessage(
                form,
                "Please enter a valid email address.",
                "error"
            );

            return;

        }


        if (!passwordValue) {

            showMessage(
                form,
                "Please enter your password.",
                "error"
            );

            return;

        }


        const savedUser =
            localStorage.getItem(
                "snapBridgeUser"
            );


        if (savedUser) {

            const user =
                JSON.parse(savedUser);


            if (
                emailValue === user.email &&
                passwordValue === user.password
            ) {

                localStorage.setItem(
                    "snapBridgeLoggedIn",
                    "true"
                );


                showMessage(
                    form,
                    "Welcome back, " +
                    user.name +
                    "! 📸",
                    "success"
                );


                setTimeout(function () {

                    window.location.href =
                        "index.html";

                }, 1000);


                return;

            }


            showMessage(
                form,
                "Incorrect email or password.",
                "error"
            );


            return;

        }


        /*
           Demo login if no account
           has been created yet.
        */

        localStorage.setItem(
            "snapBridgeLoggedIn",
            "true"
        );


        showMessage(
            form,
            "Login successful! ✨",
            "success"
        );


        setTimeout(function () {

            window.location.href =
                "index.html";

        }, 1000);

    }

}


/* =========================================================
   EMAIL VALIDATION
   ========================================================= */

function isValidEmail(email) {

    const pattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return pattern.test(email);

}


/* =========================================================
   FORM MESSAGE
   ========================================================= */

function showMessage(
    form,
    message,
    type
) {

    let messageBox =
        form.querySelector(
            ".form-message"
        );


    if (!messageBox) {

        messageBox =
            document.createElement(
                "div"
            );

        messageBox.className =
            "form-message";

        form.appendChild(
            messageBox
        );

    }


    messageBox.textContent =
        message;


    messageBox.classList.remove(
        "success",
        "error"
    );


    messageBox.classList.add(
        type
    );

}


/* =========================================================
   PASSWORD SHOW / HIDE
   ========================================================= */

function initializePasswordToggle() {

    const passwordInputs =
        document.querySelectorAll(
            'input[type="password"]'
        );


    passwordInputs.forEach(function (input) {

        const wrapper =
            input.parentElement;


        /*
           Don't add duplicate button.
        */

        if (
            wrapper.querySelector(
                ".password-toggle"
            )
        ) {
            return;
        }


        /*
           Only add if parent is suitable.
        */

        wrapper.style.position =
            "relative";


        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.className =
            "password-toggle";


        button.textContent =
            "👁";


        button.style.position =
            "absolute";

        button.style.right =
            "12px";

        button.style.top =
            "50%";

        button.style.transform =
            "translateY(-50%)";

        button.style.border =
            "none";

        button.style.background =
            "transparent";

        button.style.cursor =
            "pointer";

        button.style.fontSize =
            "17px";


        button.addEventListener(
            "click",
            function () {

                if (
                    input.type ===
                    "password"
                ) {

                    input.type =
                        "text";

                    button.textContent =
                        "🙈";

                }
                else {

                    input.type =
                        "password";

                    button.textContent =
                        "👁";

                }

            }
        );


        wrapper.appendChild(
            button
        );

    });

}


/* =========================================================
   BUTTONS
   ========================================================= */

function initializeButtons() {

    /*
       Start Booth buttons
    */

    const startButtons =
        document.querySelectorAll(
            ".start-btn, .start-booth, .hero-start"
        );


    startButtons.forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                goToBooth();

            }
        );

    });


    /*
       Login buttons
    */

    const loginButtons =
        document.querySelectorAll(
            ".login-btn"
        );


    loginButtons.forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                window.location.href =
                    "login.html";

            }
        );

    });


    /*
       Signup buttons
    */

    const signupButtons =
        document.querySelectorAll(
            ".signup-btn"
        );


    signupButtons.forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                window.location.href =
                    "signup.html";

            }
        );

    });

}


/* =========================================================
   GO TO BOOTH
   ========================================================= */

function goToBooth() {

    /*
       Open the booth selection page.

       The user will first see:

       Solo Booth
       Shared Booth
       Got a Code?
    */

    window.location.href =
        "choose-booth.html";

}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {
    if (confirm("Are you sure you want to log out of Snap Bridge?")) {
        localStorage.removeItem("snapBridgeLoggedIn");
        localStorage.removeItem("snapBridgeUser");
        sessionStorage.clear();
        window.location.href = "index.html";
    }
}


/* =========================================================
   GET CURRENT USER
   ========================================================= */

function getCurrentUser() {

    const data =
        localStorage.getItem(
            "snapBridgeUser"
        );


    if (!data) {

        return null;

    }


    try {

        return JSON.parse(data);

    }
    catch(error) {

        return null;

    }

}


/* =========================================================
   DISPLAY USER NAME
   ========================================================= */

function displayUserName() {

    const user =
        getCurrentUser();


    if (!user) {
        return;
    }


    const nameElements =
        document.querySelectorAll(
            ".user-name"
        );


    nameElements.forEach(function (element) {

        element.textContent =
            user.name;

    });

}


document.addEventListener(
    "DOMContentLoaded",
    displayUserName
);


/* =========================================================
   STICKER RANDOM MOVEMENT
   ========================================================= */

function animateStickers() {

    const stickers =
        document.querySelectorAll(
            ".floating-sticker"
        );


    stickers.forEach(function (sticker, index) {

        sticker.style.animationDelay =
            (index * 0.4) + "s";

    });

}


document.addEventListener(
    "DOMContentLoaded",
    animateStickers
);


/* =========================================================
   POLAROID TILT
   ========================================================= */

function initializePolaroids() {

    const polaroids =
        document.querySelectorAll(
            ".polaroid"
        );


    polaroids.forEach(function (photo) {

        photo.addEventListener(
            "mouseenter",
            function () {

                photo.style.zIndex =
                    "20";

            }
        );


        photo.addEventListener(
            "mouseleave",
            function () {

                photo.style.zIndex =
                    "";

            }
        );

    });

}


document.addEventListener(
    "DOMContentLoaded",
    initializePolaroids
);


/* =========================================================
   ADD DYNAMIC CSS FOR MOBILE MENU
   ========================================================= */

const dynamicStyle =
    document.createElement(
        "style"
    );


dynamicStyle.textContent = `

/* Mobile navigation */

@media (max-width: 650px) {

    .nav-links.mobile-open {

        display: flex;

        position: absolute;

        top: 68px;

        left: 0;

        width: 100%;

        padding: 20px;

        background: rgba(255,255,255,.96);

        backdrop-filter: blur(20px);

        flex-direction: column;

        gap: 18px;

        border-bottom: 1px solid #e0e5f0;

        box-shadow:
            0 15px 30px rgba(40,50,100,.10);

    }

}


/* Scroll animation */

.before-animation {

    opacity: 0;

    transform: translateY(25px);

    transition:
        opacity .7s ease,
        transform .7s ease;

}

.show-animation {

    opacity: 1;

    transform: translateY(0);

}


/* Form messages */

.form-message {

    margin-top: 12px;

    padding: 10px 13px;

    border-radius: 12px;

    font-size: 13px;

    font-weight: 700;

    text-align: center;

}

.form-message.success {

    background: #e5f8ee;

    color: #287b54;

}

.form-message.error {

    background: #fff0f0;

    color: #b34d4d;

}

`;


document.head.appendChild(
    dynamicStyle
);


/* =========================================================
   CONSOLE MESSAGE
   ========================================================= */

console.log(
    "✨ Snap Bridge is ready!"
);