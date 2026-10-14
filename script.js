const video = document.getElementById('video');
const loader = document.getElementById('loader');
const statusDot = document.querySelector('.status-dot');
const systemStatus = document.getElementById('system-status');

// URL to load models directly from a CDN
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
]).then(startVideo).catch(err => {
    console.error("Failed to load models:", err);
    systemStatus.innerText = "Error Loading Models";
    statusDot.style.backgroundColor = 'var(--error)';
    statusDot.style.boxShadow = '0 0 10px var(--error)';
});

function startVideo() {
    navigator.mediaDevices.getUserMedia(
        { video: {} }
    ).then(stream => {
        video.srcObject = stream;
    }).catch(err => {
        console.error("Error accessing webcam: ", err);
        systemStatus.innerText = "Camera Access Denied";
        statusDot.style.backgroundColor = 'var(--error)';
        statusDot.style.boxShadow = '0 0 10px var(--error)';
        loader.innerHTML = '<p>Error: Camera Access required.</p>';
    });
}

video.addEventListener('play', () => {
    // Media Wrapper contains video and will now contain canvas
    const wrapper = document.querySelector('.media-wrapper');
    
    // Create the overlay canvas
    const canvas = faceapi.createCanvasFromMedia(video);
    wrapper.append(canvas);
    
    // We must match canvas dimensions to the video
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    // Fade out and remove loader
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 500);

    // Update status UI
    systemStatus.innerText = "System Active";
    statusDot.classList.add('active');

    // Interval to detect faces roughly 10 times a second
    setInterval(async () => {
        // Use tiny face detector for efficiency
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
        
        // Resize results to fit canvas display size
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        // Clear previous drawings
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        resizedDetections.forEach(detection => {
            const { box } = detection.detection;
            const expressions = detection.expressions;

            // Find max probability expression
            let maxExp = 'neutral';
            let maxScore = -1;
            for (const exp in expressions) {
                if (expressions[exp] > maxScore) {
                    maxScore = expressions[exp];
                    maxExp = exp;
                }
            }

            const isSmiling = maxExp === 'happy';

            // Determine Label and Colors based on logic
            const labelText = isSmiling ? 'GOOD' : 'BAD';
            const boxColor = isSmiling ? '#10b981' : '#ef4444'; // Tailwind Success Green / Error Red

            // Configuration for drawing custom box
            const drawOptions = {
                label: labelText,
                lineWidth: 3,
                boxColor: boxColor,
                drawLabelOptions: {
                    anchorPosition: 'TOP_LEFT',
                    backgroundColor: boxColor,
                    fontColor: '#ffffff',
                    fontSize: 24,
                    padding: 8
                }
            };

            const drawBox = new faceapi.draw.DrawBox(box, drawOptions);
            drawBox.draw(canvas);
        });
    }, 100);
});
