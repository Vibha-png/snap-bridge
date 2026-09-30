/* =====================================================
   SNAP BRIDGE PHOTO BOOTH
===================================================== */


let peer = null;

let localStream = null;

let roomCode = "";

let isHost = false;

let connections = {};

let calls = {};

let friends = 0;

const MAX_PEOPLE = 3;


/* =====================================================
   PAGE ELEMENTS
===================================================== */

const choosePage =
    document.getElementById("choosePage");

const roomPage =
    document.getElementById("roomPage");

const localVideo =
    document.getElementById("localVideo");


/* =====================================================
   SOLO BOOTH
===================================================== */

async function startSolo(){

    isHost = false;

    roomCode = "";

    openRoomPage();

    document.getElementById(
        "roomCode"
    ).textContent = "SOLO";

    document.getElementById(
        "shareURL"
    ).textContent =
        "Solo booth — no friends invited";

    document.getElementById(
        "waitingBar"
    ).innerHTML =
        "📸 Your solo booth is ready!";

    await startCamera();

}


/* =====================================================
   CREATE SHARED ROOM
===================================================== */

function createRoom(){

    isHost = true;

    roomCode =
        generateRoomCode();


    /*
       The room code itself becomes
       the PeerJS ID.
    */

    const peerID =
        "snapbridge-" + roomCode;


    peer =
        new Peer(peerID);


    peer.on(
        "open",
        async function(){

            console.log(
                "Room created:",
                roomCode
            );


            openRoomPage();


            document.getElementById(
                "roomCode"
            ).textContent =
                roomCode;


            createShareLink();


            document.getElementById(
                "waitingBar"
            ).innerHTML =
                "👥 Room created! Share the link or code with your friends.";


            await startCamera();

        }
    );


    /*
       When another person calls
       the host.
    */

    peer.on(
        "call",
        function(call){

            call.answer(
                localStream
            );


            call.on(
                "stream",
                function(stream){

                    addFriend(
                        stream,
                        call.peer
                    );

                }
            );


            calls[call.peer] =
                call;

        }
    );


    peer.on(
        "error",
        function(error){

            console.error(error);

            alert(
                "Unable to create the room. Please try again."
            );

        }
    );

}


/* =====================================================
   JOIN ROOM
===================================================== */

function joinRoom(){

    const input =
        document.getElementById(
            "roomCodeInput"
        );


    const code =
        input.value
        .trim()
        .toUpperCase();


    if(!code){

        alert(
            "Please enter a room code."
        );

        return;

    }


    roomCode = code;

    isHost = false;


    /*
       Join the host using the
       room code.
    */

    peer =
        new Peer();


    peer.on(
        "open",
        async function(){

            openRoomPage();


            document.getElementById(
                "roomCode"
            ).textContent =
                roomCode;


            createShareLink();


            document.getElementById(
                "waitingBar"
            ).innerHTML =
                "🔗 Connecting you to the shared booth...";


            await startCamera();


            connectToHost();

        }
    );


    /*
       Receive calls from host
       or other participants.
    */

    peer.on(
        "call",
        function(call){

            call.answer(
                localStream
            );


            call.on(
                "stream",
                function(stream){

                    addFriend(
                        stream,
                        call.peer
                    );

                }
            );


            calls[call.peer] =
                call;

        }
    );


    peer.on(
        "error",
        function(error){

            console.error(error);

            alert(
                "Room not found. Check the code and try again."
            );

        }
    );

}


/* =====================================================
   CONNECT TO HOST
===================================================== */

function connectToHost(){

    const hostID =
        "snapbridge-" +
        roomCode;


    /*
       Tell host that we joined.
    */

    const connection =
        peer.connect(
            hostID
        );


    connections[hostID] =
        connection;


    connection.on(
        "open",
        function(){

            console.log(
                "Connected to host"
            );


            document.getElementById(
                "waitingBar"
            ).innerHTML =
                "💗 You joined the booth!";


            /*
               Send our camera to host.
            */

            callPeer(
                hostID
            );

        }
    );


    connection.on(
        "error",
        function(){

            alert(
                "Could not connect to the booth."
            );

        }
    );

}


/* =====================================================
   CALL PEER
===================================================== */

function callPeer(peerID){

    if(
        !peerID ||
        peerID === peer.id
    ){

        return;

    }


    if(
        calls[peerID]
    ){

        return;

    }


    const call =
        peer.call(
            peerID,
            localStream
        );


    if(!call){

        return;

    }


    calls[peerID] =
        call;


    call.on(
        "stream",
        function(stream){

            addFriend(
                stream,
                peerID
            );

        }
    );


    call.on(
        "close",
        function(){

            removeFriend(
                peerID
            );

        }
    );

}


/* =====================================================
   ADD FRIEND
===================================================== */

function addFriend(
    stream,
    peerID
){

    /*
       Don't add same friend twice.
    */

    if(
        document.getElementById(
            "friendVideo-" +
            peerID
        )
    ){

        return;

    }


    if(
        friends >=
        MAX_PEOPLE - 1
    ){

        return;

    }


    friends++;


    let container;


    if(friends === 1){

        container =
            document.getElementById(
                "friend1"
            );

    }

    else if(friends === 2){

        container =
            document.getElementById(
                "friend2"
            );

    }

    else{

        return;

    }


    container.innerHTML = "";


    const video =
        document.createElement(
            "video"
        );


    video.id =
        "friendVideo-" +
        peerID;


    video.autoplay = true;

    video.playsInline = true;

    video.srcObject =
        stream;


    container.appendChild(
        video
    );


    const label =
        document.createElement(
            "div"
        );


    label.className =
        "personLabel";


    label.textContent =
        "👥 Friend " +
        friends;


    container.appendChild(
        label
    );


    updatePeopleCount();


    document.getElementById(
        "waitingBar"
    ).innerHTML =
        "💗 Friend " +
        friends +
        " joined! Get ready for the photo.";


    addFriendToList(
        friends
    );

}


/* =====================================================
   FRIEND LIST
===================================================== */

function addFriendToList(number){

    const list =
        document.getElementById(
            "friendList"
        );


    const item =
        document.createElement(
            "div"
        );


    item.className =
        "friendItem";


    item.id =
        "friendList-" +
        number;


    item.innerHTML = `

        <div class="avatar">
            🧑
        </div>

        <div>

            <strong>
                Friend ${number}
            </strong>

            <small>
                Joined
            </small>

        </div>

        <span class="greenDot"></span>

    `;


    list.appendChild(
        item
    );

}


/* =====================================================
   REMOVE FRIEND
===================================================== */

function removeFriend(
    peerID
){

    const video =
        document.getElementById(
            "friendVideo-" +
            peerID
        );


    if(!video){

        return;

    }


    const box =
        video.parentElement;


    box.innerHTML = `

        <div class="waitingPerson">

            <div>👤</div>

            <span>
                Waiting for Friend...
            </span>

        </div>

    `;


    friends =
        Math.max(
            0,
            friends - 1
        );


    updatePeopleCount();

}


/* =====================================================
   PEOPLE COUNT
===================================================== */

function updatePeopleCount(){

    const total =
        friends + 1;


    document.getElementById(
        "peopleCount"
    ).textContent =
        total + " / 3";


    document.getElementById(
        "friendCount"
    ).textContent =
        total + " / 3";

}


/* =====================================================
   CAMERA
===================================================== */

async function startCamera(){

    try{

        localStream =
            await navigator
            .mediaDevices
            .getUserMedia({

                video:{
                    width:{
                        ideal:1280
                    },

                    height:{
                        ideal:720
                    },

                    facingMode:
                        "user"

                },

                audio:true

            });


        localVideo.srcObject =
            localStream;


        console.log(
            "Camera started"
        );

    }

    catch(error){

        console.error(
            error
        );


        alert(
            "Please allow camera and microphone access for Snap Bridge."
        );

    }

}


/* =====================================================
   TOGGLE CAMERA
===================================================== */

function toggleCamera(){

    if(!localStream){

        return;

    }


    const track =
        localStream
        .getVideoTracks()[0];


    if(track){

        track.enabled =
            !track.enabled;

    }

}


/* =====================================================
   SWITCH CAMERA
===================================================== */

async function switchCamera(){

    if(!localStream){

        return;

    }


    const oldTrack =
        localStream
        .getVideoTracks()[0];


    const currentFacing =
        oldTrack
        .getSettings()
        .facingMode;


    localStream
        .getTracks()
        .forEach(
            track =>
            track.stop()
        );


    const newFacing =
        currentFacing === "user"
        ? "environment"
        : "user";


    try{

        localStream =
            await navigator
            .mediaDevices
            .getUserMedia({

                video:{
                    facingMode:
                        newFacing
                },

                audio:true

            });


        localVideo.srcObject =
            localStream;


    }

    catch(error){

        console.error(error);

    }

}


/* =====================================================
   CAPTURE PHOTO
===================================================== */

function capturePhoto(){

    if(!localStream){

        alert(
            "Camera is not ready."
        );

        return;

    }


    const videos =
        document.querySelectorAll(
            ".photoStage video"
        );


    if(
        videos.length === 0
    ){

        return;

    }


    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        1400;

    canvas.height =
        1000;


    const ctx =
        canvas.getContext(
            "2d"
        );


    /*
       Premium light background
    */

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            canvas.width,
            canvas.height
        );


    gradient.addColorStop(
        0,
        "#e4efff"
    );


    gradient.addColorStop(
        .5,
        "#fff0fa"
    );


    gradient.addColorStop(
        1,
        "#e6faf2"
    );


    ctx.fillStyle =
        gradient;


    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    const count =
        videos.length;


    let columns =
        count === 1
        ? 1
        : 2;


    let rows =
        Math.ceil(
            count / columns
        );


    const padding =
        30;


    const cellWidth =
        (
            canvas.width -
            padding * 2
        ) / columns;


    const cellHeight =
        (
            canvas.height -
            padding * 2
        ) / rows;


    videos.forEach(
        function(video,index){

            const x =
                padding +
                (
                    index %
                    columns
                ) *
                cellWidth;


            const y =
                padding +
                Math.floor(
                    index / columns
                ) *
                cellHeight;


            ctx.save();


            /*
               Rounded clipping
            */

            roundedRect(
                ctx,
                x + 8,
                y + 8,
                cellWidth - 16,
                cellHeight - 16,
                25
            );


            ctx.clip();


            ctx.drawImage(
                video,
                x + 8,
                y + 8,
                cellWidth - 16,
                cellHeight - 16
            );


            ctx.restore();

        }
    );


    /*
       Premium border
    */

    ctx.strokeStyle =
        "#ffffff";

    ctx.lineWidth =
        18;


    roundedRect(
        ctx,
        15,
        15,
        canvas.width - 30,
        canvas.height - 30,
        35
    );


    ctx.stroke();


    /*
       Snap Bridge branding
    */

    ctx.fillStyle =
        "#253574";

    ctx.font =
        "bold 32px DM Sans";


    ctx.fillText(
        "📸 Snap Bridge",
        50,
        canvas.height - 35
    );


    /*
       Download
    */

    const link =
        document.createElement(
            "a"
        );


    link.download =
        "SnapBridge-" +
        Date.now() +
        ".png";


    link.href =
        canvas.toDataURL(
            "image/png"
        );


    link.click();

}


/* =====================================================
   ROUNDED RECTANGLE
===================================================== */

function roundedRect(
    ctx,
    x,
    y,
    width,
    height,
    radius
){

    ctx.beginPath();

    ctx.moveTo(
        x + radius,
        y
    );

    ctx.lineTo(
        x + width - radius,
        y
    );

    ctx.quadraticCurveTo(
        x + width,
        y,
        x + width,
        y + radius
    );

    ctx.lineTo(
        x + width,
        y + height - radius
    );

    ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height
    );

    ctx.lineTo(
        x + radius,
        y + height
    );

    ctx.quadraticCurveTo(
        x,
        y + height,
        x,
        y + height - radius
    );

    ctx.lineTo(
        x,
        y + radius
    );

    ctx.quadraticCurveTo(
        x,
        y,
        x + radius,
        y
    );

    ctx.closePath();

}


/* =====================================================
   GENERATE ROOM CODE
===================================================== */

function generateRoomCode(){

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


    let code = "";


    for(
        let i = 0;
        i < 6;
        i++
    ){

        code +=
            chars.charAt(
                Math.floor(
                    Math.random() *
                    chars.length
                )
            );

    }


    return code;

}


/* =====================================================
   CREATE SHARE LINK
===================================================== */

function createShareLink(){

    const link =
        window.location.origin +
        window.location.pathname +
        "?room=" +
        roomCode;


    document.getElementById(
        "shareURL"
    ).textContent =
        link;

}


/* =====================================================
   SHARE ROOM
===================================================== */

async function shareRoom(){

    if(!roomCode){

        alert(
            "Create a Shared Booth first."
        );

        return;

    }


    const link =
        window.location.origin +
        window.location.pathname +
        "?room=" +
        roomCode;


    const shareData = {

        title:
            "Snap Bridge 📸",

        text:
            "Join my Snap Bridge photo booth! Room code: " +
            roomCode,

        url:
            link

    };


    if(
        navigator.share
    ){

        try{

            await navigator.share(
                shareData
            );

        }

        catch(error){

            console.log(
                "Share cancelled"
            );

        }

    }

    else{

        try{

            await navigator
                .clipboard
                .writeText(
                    link
                );


            alert(
                "🔗 Booth link copied!"
            );

        }

        catch(error){

            prompt(
                "Copy this link:",
                link
            );

        }

    }

}


/* =====================================================
   ADD STICKER
===================================================== */

function addSticker(
    emoji
){

    const sticker =
        document.createElement(
            "div"
        );


    sticker.className =
        "photoDecoration";


    sticker.style.left =
        (
            Math.random() *
            70 + 15
        ) + "%";


    sticker.style.top =
        (
            Math.random() *
            70 + 10
        ) + "%";


    sticker.textContent =
        emoji;


    document.getElementById(
        "photoStage"
    ).appendChild(
        sticker
    );

}


/* =====================================================
   TOOL BUTTON
===================================================== */

function showTool(
    tool
){

    document
        .querySelectorAll(
            ".tool"
        )
        .forEach(
            button =>
            button.classList.remove(
                "active"
            )
        );


    event.currentTarget
        .classList.add(
            "active"
        );


    console.log(
        "Selected:",
        tool
    );

}


/* =====================================================
   OPEN ROOM
===================================================== */

function openRoomPage(){

    choosePage
        .classList.add(
            "hidden"
        );


    roomPage
        .classList.remove(
            "hidden"
        );

}


/* =====================================================
   EXIT ROOM
===================================================== */

function exitRoom(){

    if(localStream){

        localStream
            .getTracks()
            .forEach(
                track =>
                track.stop()
            );

    }


    if(peer){

        peer.destroy();

    }


    location.href =
        window.location.pathname;

}


/* =====================================================
   HOME
===================================================== */

function goHome(){

    window.location.href =
        "index.html";

}


/* =====================================================
   AUTO JOIN FROM LINK
===================================================== */

window.addEventListener(
    "load",
    function(){

        const params =
            new URLSearchParams(
                window.location.search
            );


        const room =
            params.get(
                "room"
            );


        if(room){

            document.getElementById(
                "roomCodeInput"
            ).value =
                room;

            /*
               Automatically join when
               someone opens a shared link.
            */

            setTimeout(
                function(){

                    joinRoom();

                },
                500
            );

        }

    }
);