(function() {
    'use strict';

    var imgUrl = 'https://api.imgur.com/3/gallery/OMFVy',
        totalImageCount = 0,
        renderedCount = 0,
        galleryPhotos = [],
        DEFAULT_PAGE_SIZE = 10,
        ieVersion = getIEVersion(),
        ie = ieVersion > 0.0,
        allowHeaders = true;

    // Detect IE Version - Microsoft Recommended way
    function getIEVersion() {
        var version = -1;

        if (navigator.appName == 'Microsoft Internet Explorer') {
            var ua = navigator.userAgent,
            re  = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");

            if (re.exec(ua) != null) {
                version = parseFloat(RegExp.$1);
            }
        }
        return version;
    }

    function createRequest() {
        var xhr;

        if (window.XDomainRequest && ieVersion <= 9.0) {
            xhr = new XDomainRequest();
            allowHeaders = false;
        } else if (window.XMLHttpRequest) {
            xhr = new XMLHttpRequest();
        } else {
            var ieXMLHttpVersions = ['MSXML2.XMLHttp.5.0', 'MSXML2.XMLHttp.4.0', 'MSXML2.XMLHttp.3.0', 'MSXML2.XMLHttp', 'Microsoft.XMLHttp'];

            for (var i = 0, l = ieXMLHttpVersions.length; i < l; i++) {
                try {
                    xhr = new ActiveXObject(ieXMLHttpVersions[i]);
                    break;
                } catch (e) {
                    console.log('ieXMLHttpVersion ' + ieXMLHttpVersions[i] + ' is not supported by this browser');
                }
            }
            allowHeaders = false;
        }

        return xhr;
    }

    function makeApiRequest(method, url, headers, successFn, errorFn) {
        var xhr = createRequest();

        xhr.open(method, url, true);

        if (typeof headers == 'object' && allowHeaders) {
            for (var key in headers) {
                xhr.setRequestHeader(key, headers[key]);
            }
        }

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                var callback = xhr.status == 200 ? successFn : errorFn,
                    response;

                try {
                    response = JSON.parse(xhr.response || xhr.responseText);
                } catch (e) {
                    errorFn && errorFn();
                }

                callback && callback(response);
            }
        };

        xhr.send();
    }

    function processApiResponse(response) {
        if (typeof response == 'object' && response.data) {
            render(response.data);
        } else {
            handleApiError();
        }
    }

    function handleApiError(response) {
        var main = document.getElementById('main-container');
        main.innerHTML = '<h2 class="api-error-message">Oops! It seems there was an error displaying this photo gallery. Please try again later.</h2>';
    }

    function render(galleryInfo) {
        var main = document.createElement('div');
        main.id = 'main-gallery';

        var header = renderGalleryHeader(galleryInfo);
        var gallery = renderPhotoGallery(galleryInfo);

        main.appendChild(header);
        main.appendChild(gallery);

        document.body.replaceChild(main, document.getElementById('main-container'));
    }

    function renderGalleryHeader(galleryInfo) {
        var header = document.createElement('div');
        header.id = 'gallery-header';

        var headerLink = document.createElement('a');
        headerLink.setAttribute('target', 'blank');
        headerLink.href = galleryInfo.link;
        headerLink.innerHTML = galleryInfo.title;

        var infoIcon = document.createElement('span');
        infoIcon.className = 'information-icon';

        var galleryReadme = document.createElement('div');
        galleryReadme.id = 'gallery-info-popup';
        galleryReadme.innerHTML = '<h3>Photo Gallery Project</h3>' +
            '<ul><li> Click any photo to view a larger image in a lightbox view</li>' +
            '<li>Once in the lightbox view, use the arrow icons, or LEFT and RIGHT keys to navigate between photos</li>' +
            '<li>Click the "x" icon or hit ENTER to exit lightbox view</li></ul>' +
            '<p>Disclaimer: I do not own any rights to any of the photos displayed in this gallery. ' +
                'The images on display here are from Imgur.com (Click gallery title to view original album) ' +
                'and were neither created nor licensed by me</i></p>';

        header.appendChild(headerLink);
        header.appendChild(infoIcon);
        header.appendChild(galleryReadme);

        return header;
    }

    function renderPhotoGallery(galleryInfo) {
        var gallery = document.createElement('div');
        gallery.id = 'photo-gallery';
        gallery.onscroll = paginatePhotos;

        totalImageCount = galleryInfo.images_count || 0;
        galleryPhotos = galleryInfo.images || [];

        renderPage(gallery, 25); //Initial Page Size;

        return gallery;
    }

    function renderPage(parentEl, pageSize) {
        if (renderedCount >= totalImageCount) {
            alert('no more images to render.');
            var gallery = document.getElementById('photo-gallery');
            gallery.onscroll = '';
        }

        var page = document.createDocumentFragment(),
            pageSize = pageSize || DEFAULT_PAGE_SIZE,
            nextRenderedCount = Math.min(totalImageCount, renderedCount + pageSize);

        for (var i = renderedCount; i < nextRenderedCount; i++) {
            var el = createImage(galleryPhotos[i], i);
            page.appendChild(el);
        }

        renderedCount = nextRenderedCount;

        parentEl.appendChild(page);
    }

    function createImage(data, index) {
        var imageContainer = document.createElement('div'),
            imageOverlay = document.createElement('div'),
            height = data.height,
            width = data.width,
            aspectRation = height / width;

        imageContainer.className = 'gallery-image';
        imageContainer.setAttribute('data-id', data.id);
        imageContainer.setAttribute('data-index', index);
        imageContainer.style['background-color'] = 'rgba(0, 0, 0, ' + (Math.random()) + ')';
        imageContainer.style['background-image'] = 'url(' + data.link + ')';
        imageContainer.style['background-repeat'] = 'no-repeat';
        imageContainer.style['background-position'] = 'center center';
        imageContainer.style['background-size'] = 'cover';

        imageContainer.onclick = displayImage;

        imageOverlay.className = 'thumbnail-overlay';

        var summary = document.createElement('div');
        summary.className = 'thumbnail-summary';

        var title = document.createElement('span');
        title.className = 'thumbnail-title';
        title.innerHTML = data.title;

        var description = document.createElement('span');
        description.className = 'thumbnail-description';
        description.innerHTML = data.description;

        summary.appendChild(title);
        summary.appendChild(description);

        imageOverlay.appendChild(summary);

        imageContainer.appendChild(imageOverlay);

        return imageContainer;
    }


    function paginatePhotos() {
        var gallery = document.getElementById('photo-gallery');

        if (gallery.scrollHeight - gallery.scrollTop == gallery.clientHeight) {
            renderPage(gallery);
        }
    }

    function getPhotoIndex(el) {
        return +(el.dataset ? el.dataset.index : el.getAttribute('data-index')) || 0;
    }

    function displayImage(e) {
        var el = e.currentTarget,
            currentIndex = getPhotoIndex(el),
            prevIndex = currentIndex == 0 ? totalImageCount - 1 : currentIndex - 1,
            nextIndex = (currentIndex + 1) % totalImageCount,
            lightboxContainer = document.getElementById('lightbox-container'),
            lightbox = document.getElementById('lightbox-image'),
            imageInfo = galleryPhotos[currentIndex],
            photoTitle,
            lightboxImg;

        if (lightbox) {
            photoTitle = document.getElementById('lightbox-image-title');
            photoTitle.innerHTML = imageInfo.title || 'Untitled Image';

            lightbox.setAttribute('data-index', currentIndex);
            lightboxImg = lightbox.getElementsByTagName('img')[0];
            lightboxImg.src = imageInfo.link;
        } else {
            photoTitle = document.createElement('h3');
            photoTitle.id = 'lightbox-image-title';
            photoTitle.innerHTML = imageInfo.title || 'Untitled Image';

            lightbox = document.createElement('div');
            lightbox.id = 'lightbox-image';
            lightbox.setAttribute('data-index', currentIndex);

            lightboxImg = document.createElement('img');
            lightboxImg.src = imageInfo.link;
            lightboxImg.onload = displayLightboxImage;
            lightboxImg.onerror = displayLightboxImagePlaceholder;

            lightbox.appendChild(lightboxImg);

            var x = document.createElement('span');
            x.className = 'close-lightbox';
            x.innerHTML = '+';
            x.onclick = hideImage;

            var arrowLeft = document.createElement('i');
            arrowLeft.id = 'left-arrow'
            arrowLeft.className = 'lightbox-arrow';
            arrowLeft.onclick = showNextImage;

            var arrowRight = document.createElement('i');
            arrowRight.id = 'right-arrow';
            arrowRight.className = 'lightbox-arrow';
            arrowRight.onclick = showNextImage;

            lightboxContainer.appendChild(x);
            lightboxContainer.appendChild(photoTitle);
            lightboxContainer.appendChild(lightbox);
            lightboxContainer.appendChild(arrowLeft);
            lightboxContainer.appendChild(arrowRight);
        }

        document.body.className = 'visible-lightbox';
        window.addEventListener('keyup', handleKeyPress, true);
    }

    function displayLightboxImage() {
        var image = document.getElementById('lightbox-image');

        if (image) {
            image.className = '';
        }
    }

    function displayLightboxImagePlaceholder() {
        var image = document.getElementById('lightbox-image');

        if (image) {
            image.className = 'placeholder';
        }
    }

    function showNextImage(e, prev) {
        var showPrev = e && e.currentTarget ? e.currentTarget.id == 'left-arrow' : prev,
            lightbox = document.getElementById('lightbox-image'),
            photoTitle = document.getElementById('lightbox-image-title'),
            lightboxImg = lightbox.getElementsByTagName('img')[0],
            currentIndex = getPhotoIndex(lightbox),
            nextIndex,
            imageInfo;

        if (showPrev) {
            nextIndex = currentIndex == 0 ? totalImageCount - 1 : currentIndex - 1;
        } else {
            nextIndex = (currentIndex + 1) % totalImageCount;
        }

        imageInfo = galleryPhotos[nextIndex];

        photoTitle.innerHTML = imageInfo.title || 'Untitled Image';

        lightboxImg.src = imageInfo.link;
        lightbox.setAttribute('data-index', nextIndex);

        lightboxState.currentIndex = nextIndex;
        lightboxState.currentImage = imageInfo;
    }

    function hideImage(e) {
        removeChildren(document.getElementById('lightbox-container'));
        document.body.className = '';
        window.removeEventListener('keyup', handleKeyPress, true);
    }

    function handleKeyPress(e) {
        e.stopPropagation();
        var keycode = e.keyCode;

        if (keycode == 37) {
            showNextImage(null, true);
        } else if (keycode == 39) {
            showNextImage(null, false);
        } else if (keycode == 13) {
            hideImage();
        }
    }

    function removeChildren(node) {
        if (!node) {
            return;
        }

        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }

    makeApiRequest('GET', imgUrl, { 'Authorization': 'Client-ID 5bd77d7fa0967bd' }, processApiResponse, handleApiError);
})();
