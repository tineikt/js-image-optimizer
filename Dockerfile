FROM digitaleflatercr.azurecr.io/js-image-optimizer-base:20191209.1
VOLUME /tmp
COPY . /
RUN npm install
ARG JPGPATH=/usr/bin/jpeg-recompress
ARG PNGPATH=/usr/bin/pngquant
ARG WEBPPATH=/usr/bin/cwebp
ARG SVGPATH=/usr/bin/svgo
ENV JPGPATH=$JPGPATH
ENV PNGPATH=$PNGPATH
ENV WEBPPATH=$WEBPPATH
ENV SVGPATH=$SVGPATH
ENTRYPOINT ["node","index.js"]
