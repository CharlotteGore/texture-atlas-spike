const nativeImage = require('electron').nativeImage;
const fs = require('fs');

module.exports = (list, done) => {
    var toCheckIn = list.length;
    var result = {};
    list.forEach((file) => {
        fs.readFile(file, (err, buffer) => {
            const image = nativeImage.createFromBuffer(buffer);
            const size = image.getSize();
            // bitmap...
            const canvas = document.createElement('canvas');
            canvas.setAttribute('width', size.width);
            canvas.setAttribute('height', size.height);
            canvas.style.imageRendering = 'pixelated';
            const context = canvas.getContext('2d');

            var bitmap = image.getBitmap();
            var imageData = context.createImageData(size.width, size.height);
            for (var i = 0; i < (bitmap.length / 4); i++){
                var p = i * 4;
                imageData.data[p] = bitmap[p + 2];
                imageData.data[p + 1] = bitmap[p + 1];
                imageData.data[p + 2] = bitmap[p];
                imageData.data[p + 3] = bitmap[p + 3];
            };
            context.putImageData(imageData, 0, 0);

            result[file] = {
                file,
                size,
                area: size.width * size.height,
                context
            };
            // check if we're done now.
            toCheckIn--;
            if (toCheckIn === 0){
                done(null, result);
            }
        });
    });
}
