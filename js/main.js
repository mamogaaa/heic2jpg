let dropArea = document.querySelector('body')
let dropBox = document.querySelector('.drop-box')
let counter = 0

function decodeHeic(blob, type='image/jpeg') {
    return new Promise((resolve, reject) => {
        var reader = new HEIFReader(blob);
        var decoder = new HevcDecoder();
        var imgData = new ImageProvider(reader, decoder);
        var canvas = document.createElement('canvas')
        var ctx = canvas.getContext('2d')

        reader.requestFileInfo(function(payload) {
            if(payload.success !== true) {
                console.error("Could not read file:", url);
            } else {
                var fileInfo = payload;
                console.log("FileInfo contents:", fileInfo);
                
                if (fileInfo.rootLevelMetaBoxProperties) {
                    var masterContextId = fileInfo.rootLevelMetaBoxProperties.contextId;
                    var masterItemIds = [];
                    var imageFeaturesMap = fileInfo.rootLevelMetaBoxProperties.imageFeaturesMap;
                    
                    for (i in imageFeaturesMap) {
                        if (imageFeaturesMap.hasOwnProperty(i) && imageFeaturesMap[i].isMasterImage === true) {
                            masterItemIds.push(parseInt(i));
                        }
                    }
                    console.log("Master images in the file:", masterItemIds);
                    // console.log(decoder)

                    
                    
                    imgData.requestImageData(masterContextId, masterItemIds, function (data) {
                        console.log('data', data);
                        let frame = data.frames[0]
                        canvas.width = frame.width
                        canvas.height = frame.height
                        ctx.putImageData(new ImageData(data.frames[0].canvasFrameData, data.frames[0].width, data.frames[0].height), 0, 0)
                        resolve(canvas.toDataURL(type))
                    });
                    //imgData.requestImageData(masterContextId, masterItemIds, alert('Ok'));
                    
                }
                
            }
        });
    })
}

class HeicImageFile {
    constructor(file, container) {
        this.file = file
        this.url = null
        this.loading = true
        this.container = container
        if (!this.container) {
            this.container = document.createElement('div')
            this.container.className = 'heic-image-wrapper'
        }
    }

    async init() {
        this.render()
        this.url = await decodeHeic(this.file)
        this.loading = false
        console.log(this)
        this.render()
        window.hif = this

    }

    render () {
        this.container.innerHTML = `
            <div class="card heic-image ${this.loading ? 'heic-image-loading' : ''}" style="width: 250px; margin-right: 1rem;">
                <div class="card-header">${this.file.name}</div>
                <div class="card-body p-2">
                    ${this.loading ? 'Converting...' : ''}
                    ${this.loading ? '' : `
                        <img src="${this.url}" style="width: 100%; border-radius: 3px;" alt="">
                    `}
                </div>
                <div class="card-footer p-2">
                    <a class="btn btn-primary btn-block btn-sm" href="${this.url}" download="${this.file.name}.jpg">Download</a>
                </div>
            </div>
        `
    }
}

class ImageList {
    constructor(container) {
        this.fileList = []
        this.container = container
    }

    async add(file) {
        if (Array.isArray(file)) {
            for (let f of file)
                await this.add(f)
            return
        }
        let hif = new HeicImageFile(file)
        this.container.appendChild(hif.container)
        await hif.init()
        this.fileList.push(hif)
    }
}

let imageList = new ImageList(document.querySelector('.image-list'))


function processFiles(files) {
    let res = []
    for (let file of files) {
        if (file.type == 'image/heic')
            res.push(file)
    }
    console.log(res)
    imageList.add(res)
    if (res.length == 0) return alert('Invalid images provided!')
}

function selectFiles(accept, multiple) {
    return new Promise((resolve, reject) => {
        let fileInput = document.createElement('input')
        fileInput.type = 'file'
        fileInput.multiple = multiple
        fileInput.style.display = 'none'
        let changeTimeout
        if (accept) fileInput.accept = accept
        let onChangeListener = () => {
            clearTimeout(changeTimeout)
            changeTimeout = setTimeout(() => {
                document.body.onfocus = null
                let files = fileInput.files
                if (files.length == 0) return reject(new Error('no files selected!'))
                resolve(multiple ? files : files[0])
                fileInput.remove()
            }, 100)
        }
        document.body.onfocus = onChangeListener
        fileInput.addEventListener('change', onChangeListener)
        fileInput.click()
    })
}

async function handleFileSelectBtn() {
    let files = await selectFiles('.heic', true)
    processFiles(files)
}

dropArea.addEventListener('dragenter', e => {
    e.preventDefault()
    counter++
    dropBox.classList.add('drop-box-active')
}, false)
dropArea.addEventListener('dragleave', e => {
    e.preventDefault()
    counter--
    // dropArea.className = dropArea.className.replace('drop-box-active', '').trim()
    counter == 0 && dropBox.classList.remove('drop-box-active')
}, false)
dropArea.addEventListener('dragover', e => {
    e.preventDefault()
    dropBox.classList.add('drop-box-active')
}, false)
dropArea.addEventListener('drop', e => {
    e.preventDefault()
    dropBox.classList.remove('drop-box-active')
    processFiles(e.dataTransfer.files)
}, false)
