## Modify the base image

1. Download and run image. NB! Find the tag you want!  `docker run -p 3003:3003 -it --name base2 digitaleflatercr.azurecr.io/js-image-optimizer-base:20191209.1`
2. Do you modifications.
3. Create a tag docker tag `js-image-optimizer-base digitaleflatercr.azurecr.io/js-image-optimizer-base:20191209.1`
4. Push tag to ACR `docker tag js-image-optimizer-base digitaleflatercr.azurecr.io/js-image-optimizer-base:20191209.1`
