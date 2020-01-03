# js-image-optimizer
NodeJS server that optimizes images based on URL and Accept header.

## Usage
Start server and call using full URL as path. Something like this should probably work:
http://localhost:8080/http://www.personal.psu.edu/crd5112/photos/PNG%20Example.png

Server will download given URL, and stream it to the user based on extension in URL and Accept header sent. Make sure you put this somewhere in your infrastructure where the possible URLs sent to the server is limited. We use it behind Varnish as well, to avoid optimizing images over and over every time user requests it.

## Running on windows 
To run this locally on Windows, you can use the included binary tools. All you need to install externally is "svgo" through npm: `npm install -g svgo`

## Running on linux
On linux you will have to download and compile jpeg-archive (jpeg-recompress), pngquant, cwebp from your favorite package manager / source and install svgo from npm.

## Docker base image
All the different command line apps are installed and ready to use in the docker base image used by the build process. You can read more about how to change the base image in BASEIMAGE.md
