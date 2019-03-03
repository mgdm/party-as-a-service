//@ts-check

(function () {
    const FRAME_COLOURS = [
        [255, 141, 139],
        [254, 214, 137],
        [136, 255, 137],
        [135, 255, 255],
        [139, 181, 254],
        [215, 140, 255],
        [255, 140, 255],
        [255, 104, 247]
    ]

    const RENDERED_WIDTH = 116;
    const RENDERED_HEIGHT = 116;
    const OUTPUT_WIDTH = 128;
    const OUTPUT_HEIGHT = 128;

    const dropzone = document.getElementById('dropzone');
    const output = document.getElementById('output');

    const noop = function (e) {
        e.stopPropagation();
        e.preventDefault();
    }

    const makePositions = function (frameCount, offset) {
        const ORIGIN_X = (OUTPUT_WIDTH - RENDERED_WIDTH) / 2;
        const ORIGIN_Y = (OUTPUT_HEIGHT - RENDERED_HEIGHT) / 2;

        let result = [];
        for (let i = 0; i < frameCount; i++) {
            const angle = Math.PI * 2 / frameCount * i;
            const x = Math.round(ORIGIN_X + Math.cos(angle) * offset);
            const y = Math.round(ORIGIN_Y + Math.sin(angle) * offset);
            result.push([x, y]);
        }

        result.reverse();
        return result;
    }

    const enterDropzone = function (e) {
        noop(e);
        e.target.classList.add('inflight');
    }

    const leaveDropzone = function (e) {
        noop(e);
        e.target.classList.remove('inflight');
    }

    const drop = function (e) {
        noop(e);
        e.target.classList.remove('inflight');

        const files = e.dataTransfer.files;
        const file = files[0];
        if (!file.type.startsWith('image/')) {
            return;
        }

        const reader = new FileReader();
        reader.onload = handleImageDrop;
        reader.readAsDataURL(file);
    }

    const getImageData = function (canvas) {
        const ctx = canvas.getContext('2d');
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    const handleImageDrop = function (e) {
        const img = new Image();
        img.src = e.target.result;
        const rave = document.getElementById('rave').checked;
        const transparent = document.getElementById('transparent').checked;
        const reverse = document.getElementById('reverse').checked;
        const canvas = document.createElement('canvas');

        let width;
        let height;

        if (rave) {
            width = OUTPUT_WIDTH;
            height = OUTPUT_HEIGHT;
        } else {
            width = RENDERED_WIDTH;
            height = RENDERED_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;

        output.childNodes.forEach(child => output.removeChild(child));
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(255, 255, 255, 255)';
        ctx.fillRect(0, 0, width, height);

        const imageHeight = height * img.height / img.width;
        const yPos = (height - imageHeight) / 2

        ctx.drawImage(img, 0, yPos, width, imageHeight);
        const greyScale = greyscaleImage(getImageData(canvas));
        const frames = [];

        FRAME_COLOURS.forEach(rgb => frames.push(colourize(greyScale, width, height, rgb)));

        const b64 = render(frames, rave, transparent, reverse);
        const outputImage = document.createElement('img');
        outputImage.src = b64;

        output.appendChild(outputImage);
    }

    const render = function (frames, rave, transparent, reverse) {
        const encoder = new GIFEncoder();
        encoder.setRepeat(0);
        encoder.setDelay(500 / frames.length);
        encoder.setQuality(5);
        encoder.start();

        if (transparent) {
            encoder.setTransparent(0xffffff);
        }

        const canvas = document.createElement('canvas');
        canvas.width = OUTPUT_WIDTH;
        canvas.height = OUTPUT_HEIGHT;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(255, 255, 255, 255)';

        if (rave) {
            renderRaveImage(frames, ctx, canvas, encoder, reverse);
        } else {
            renderPartyImage(frames, ctx, canvas, encoder, reverse);
        }

        encoder.finish();
        const binary = encoder.stream().getData();
        return 'data:image/gif;base64,' + encode64(binary);
    }

    const greyscaleImage = function (imageData, width, height) {
        /* Inspired by https://www.html5rocks.com/en/tutorials/canvas/imagefilters/ */
        let d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
            let r = d[i];
            let g = d[i + 1];
            let b = d[i + 2];
            // CIE luminance for the RGB
            // The human eye is bad at seeing red and blue, so we de-emphasize them.
            let v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            d[i] = d[i + 1] = d[i + 2] = v
        }

        return imageData;
    }

    const colourize = function (imageData, width, height, rgb) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0, 0, 0, width, height);
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        ctx.fillRect(0, 0, width, height);
        return getImageData(canvas);
    }

    function renderPartyImage(frames, ctx, canvas, encoder, reverse) {
        const positions = makePositions(frames.length, 8);

        if (reverse) {
            positions.reverse();
        }

        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            const pos = positions[i];
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.putImageData(frame, pos[0], pos[1], 0, 0, frame.width, frame.height);
            encoder.addFrame(ctx);
        }
    }

    function renderRaveImage(frames, ctx, canvas, encoder, reverse) {
        let deltaR = Math.PI * 2 / frames.length;

        if (reverse) {
            deltaR = -deltaR;
        }

        let currentAngle = 0;

        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            const tmpCanvas = document.createElement('canvas');
            const tmpCtx = tmpCanvas.getContext('2d');
            tmpCtx.fillStyle = 'rgba(255, 255, 255, 255)';
            tmpCtx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);
            tmpCtx.putImageData(frame, 0, 0, 0, 0, frame.width, frame.height);

            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(currentAngle);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
            ctx.drawImage(tmpCanvas, 0, 0);
            ctx.restore();
            encoder.addFrame(ctx);
            currentAngle += deltaR;
        }
    }

    const logOutput = function (text) {
        console.log(text);
        output.innerHTML = text;
    }

    dropzone.addEventListener('dragenter', enterDropzone, false);
    dropzone.addEventListener('dragexit', leaveDropzone, false);
    dropzone.addEventListener('dragover', noop, false);
    dropzone.addEventListener('drop', drop, false);
})();


