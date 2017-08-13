// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const imageLoader = require('./image-loader.js');
const fs = require('fs');
const path = require('path');
const root = '../scumm/assets/textures';
const pack = require('bin-pack');
const nextPow = require('next-power-of-two');
const canvasToBuffer = require('electron-canvas-to-buffer');
const upath = require('upath');
const THREE = require('three');
var checker = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAMAAADz0U65AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNS1jMDIxIDc5LjE1NTc3MiwgMjAxNC8wMS8xMy0xOTo0NDowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTQgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6OERFMjg3MzBCQTA5MTFFNEE5MTY4MjhFQzk4MkQwRjciIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6OERFMjg3MzFCQTA5MTFFNEE5MTY4MjhFQzk4MkQwRjciPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo4REUyODcyRUJBMDkxMUU0QTkxNjgyOEVDOTgyRDBGNyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo4REUyODcyRkJBMDkxMUU0QTkxNjgyOEVDOTgyRDBGNyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Poh5paMAAAAGUExURcHBwYODg+I7gB0AAAAWSURBVHjaYmAEAgYQwMMgIA1iAAQYAATIACFeF8q6AAAAAElFTkSuQmCC";

const universe = require(path.join(root, '../universe/universe.json'));

const tiledata = Object.keys(universe.tilesets).reduce((tilesets, tileset) => {
    var data = universe.tilesets[tileset];
    var key = path.basename(upath.toUnix(data.uri),'.png');
    data.universeKey = key;
    tilesets[key] = {
        textureSize: [data.textureSize, data.textureSize],
        tileSize: [data.tileSize, data.tileSize],
        gridSize: [data.gridSize, data.gridSize],
        textureId: tileset
    };
    return tilesets;
},{});

var loadList = Object.keys(tiledata).reduce((loadList, file) => {
    loadList.push(path.join(root, `${file}.png`));
    return loadList;
}, []);

imageLoader(loadList, (err, data) => {
//imageLoader([path.join(root, 'format-test.png')], (err, data) => {
    var totalVolume = Object.keys(data).reduce((total, file) => {
        total += data[file].area;
        return total;
    }, 0);
    var sorted = Object.keys(data).sort((a, b) => data[a].area - data[b].area);
    var toPack = sorted.reduce((toPack, key) => {
        toPack.push({
            width: data[key].size.width,
            height: data[key].size.height,
            raw: data[key]
        });
        return toPack
    }, []);

    var result = pack(toPack);
    result.fileWidth = nextPow(result.width);
    result.fileHeight = nextPow(result.height);

    var canvas = document.createElement('canvas');
    canvas.setAttribute('width', result.fileWidth);
    canvas.setAttribute('height', result.fileHeight);
    canvas.style.imageRendering = 'pixelated';
    var context = canvas.getContext('2d');

    result.items.forEach((item) => {
        context.drawImage(item.item.raw.context.canvas, item.x, item.y, item.width, item.height);
    });

    var bundleIndex = {
        width: result.fileWidth,
        height: result.fileHeight,
        items: result.items.reduce((items, item) => {
            var file = path.basename(item.item.raw.file, '.png');
            items[file] = {
                x: item.x,
                y: item.y,
                width: item.width,
                height: item.height,
                gridSize: tiledata[file].gridSize,
                tileSize: tiledata[file].tileSize,
                uv: {
                    x: item.x / result.fileWidth,
                    y: 1 - (item.y / result.fileHeight),
                    width: item.width / result.fileWidth,
                    height: item.height / result.fileHeight
                }
            }
            return items;
        }, {})
    }

    var buffer = canvasToBuffer(canvas, 'image/png');

    fs.writeFile(path.join(root, 'universe-texture.png'), buffer, (err) => {
        if (!err){
            console.log('universe-texture.png written');

            var scene, camera, renderer;
            var geo, mat;

            const init =  () => {
                scene = new THREE.Scene();

                camera = new THREE.OrthographicCamera( -1, 1, 1, -1, -1, 1 );
                scene  = new THREE.Scene();
                var tex = new THREE.Texture(canvas);
                tex.minFilter = THREE.NearestFilter;
                tex.magFilter = THREE.NearestFilter;
                tex.needsUpdate = true;
                tex.transparent = true;

                var checkImage = document.createElement('img');
                var checkTex = new THREE.CanvasTexture( checkImage );

                checkTex.minFilter = THREE.NearestFilter;
                checkTex.magFilter = THREE.NearestFilter;
                checkTex.wrapS = THREE.RepeatWrapping;
                checkTex.wrapT = THREE.RepeatWrapping;
                checkTex.repeat.set(64,64);

                geometry = new THREE.PlaneBufferGeometry(2,2);
                material = new THREE.MeshBasicMaterial( { color: 0x444444, map: checkTex } );

                checkImage.src = checker;

                mesh = new THREE.Mesh( geometry, material );
                mesh.position.z = -0.1
                scene.add( mesh );

                geo = new THREE.PlaneBufferGeometry(2, 2);
                mat = new THREE.MeshBasicMaterial({color: 0xffffff, map: tex, transparent: true});
                quad = new THREE.Mesh(geo, mat);
                quad.position.z = 0;
                scene.add( quad);

                renderer = new THREE.WebGLRenderer({devicePixelRatio: window.devicePixelRatio});
                renderer.setSize( 1024, 1024);
                document.body.appendChild( renderer.domElement );

                renderer.render(scene, camera);

            }

            init();

            console.log(bundleIndex);
            window.data = bundleIndex;
            window.render = () => renderer.render(scene, camera);
            window.geo = geo;
            window.setToTexture = (key) => {
              var use = bundleIndex.items[key].uv;
              var uvs = geo.attributes.uv.array;

              var tlu = use.x;
              var tlv = use.y;
              var bru = use.x + use.width;
              var brv = use.y - use.height;

              uvs[0] = uvs[4] = tlu;
              uvs[1] = uvs[3] = tlv;

              uvs[6] = uvs[2] = bru;
              uvs[7] = uvs[5] = brv;

              geo.attributes.uv.needsUpdate = true;
              render();
            }

            window.setToTile = (key, tileId) => {
              var use = bundleIndex.items[key].uv;
              var uvs = geo.attributes.uv.array;

              var tilesPerColumn = bundleIndex.items[key].gridSize[1];
              var tilesPerRow = bundleIndex.items[key].gridSize[0];

              var row = tileId % tilesPerColumn;
              var col = Math.floor(tileId / tilesPerColumn);

              var tileUVWidth = (use.width / tilesPerRow);
              var tileUVHeight = (use.height / tilesPerColumn);

              console.log(tileUVWidth, tileUVHeight);

              var tlu = use.x + (tileUVWidth * col);
              var tlv = use.y - (tileUVHeight * row);
              var bru = use.x + (tileUVWidth * col) + tileUVWidth;
              var brv = use.y - (tileUVHeight * row) - tileUVHeight;

              uvs[0] = uvs[4] = tlu;
              uvs[1] = uvs[3] = tlv;

              uvs[6] = uvs[2] = bru;
              uvs[7] = uvs[5] = brv;

              geo.attributes.uv.needsUpdate = true;
              render();
            }

            window.setToFull = () => {
                var uvs = geo.attributes.uv.array;
                uvs[0] = uvs[4] = 0;
                uvs[1] = uvs[3] = 1;
                uvs[6] = uvs[2] = 1;
                uvs[7] = uvs[5] = 0;
                geo.attributes.uv.needsUpdate = true;
                render();
            }
        }
    });

    fs.writeFile(path.join(root, 'universe-texture.json'), JSON.stringify(bundleIndex, null, 2), 'utf8', (err) => {
        if (!err){
            console.log('universe-texture.json written');
        }
    });
});
