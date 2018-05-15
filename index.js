const http = require('http');
const https = require('https');
const pump = require('pump');
const express = require('express');
const _ = require('lodash');
const { spawn } = require('child_process');
const app = express();

const jpgToolPath = process.env.JPGPATH || './binary_tools/windows/jpg/jpeg-recompress.exe';
const pngToolPath = process.env.PNGPATH || './binary_tools/windows/png/pngquant.exe';
const webpToolPath = process.env.WEBPPATH || './binary_tools/windows/webp/cwebp.exe';
const port = process.env.PORT || 3003;

const convertPath = (path) => path.substring(1);
const httpLibToUse = (url) => (url.startsWith("https")) ? https : http;

const convertWebP = (res) => {
	console.log("Converting to WebP...");
	res.writeHead(200, { 'Content-Type': 'image/webp' });

	const args = [ '-quiet', '-o', '-', '--', '-' ];
	return spawn(webpToolPath, args, { stdio: [ 'pipe', 'pipe', process.stderr  ] });
};

const optimizeJpg = (res) => {
	console.log("Optimizing JPG...");
	res.writeHead(200, { 'Content-Type': 'image/jpeg' });

	const args = [ '-Q', '-', '-' ];
	return spawn(jpgToolPath, args, { stdio: [ 'pipe', 'pipe', process.stderr  ] });
};

const optimizePng = (res) => {
	console.log("Optimizing PNG...");
	res.writeHead(200, { 'Content-Type': 'image/png' });

	const args = [ '-' ];
	return spawn(pngToolPath, args, { stdio: [ 'pipe', 'pipe', process.stderr  ] });
};

const logError = (err) => {
	if(err !== undefined) {
		console.warn("Pipe error: ", err);
	}
};

const pickConverter = (url, accept) => {
	if(accept !== undefined && accept.indexOf("image/webp") !== -1) {
		return convertWebP;
	}

	if(_.endsWith(url, ".png")) {
		return optimizePng;
	}

	if(_.endsWith(url, ".jpg")) {
		return optimizeJpg;
	}

	return null;
};

app.get('/*', async function (req, res) {
	if(req.path.indexOf('http') === -1) {
		res.send("Wrong URL format");
		return;
	}
	const url = convertPath(req.path);
	console.log(`Fetching from ${url}`);

	const converter = pickConverter(url, req.headers['accept']);

	httpLibToUse(url).get(url, (streamInc) => {
		if(converter != null) {
			const process = converter(res);
			pump(streamInc, process.stdin, logError);
			pump(process.stdout, res, logError);

		} else {
			res.writeHead(200, {
				'Content-Type': streamInc.headers["content-type"]
			});
			pump(streamInc, res, logError);
		}
	});
});

app.listen(port, () => {
	console.log(`Listening to port ${port}`);
});