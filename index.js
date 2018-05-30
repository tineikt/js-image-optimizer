const http = require('http');
const https = require('https');
const pump = require('pump');
const urlLib = require('url');
const express = require('express');
const _ = require('lodash');
const { spawn } = require('child_process');
const app = express();

const jpgToolPath = process.env.JPGPATH || './binary_tools/windows/jpg/jpeg-recompress.exe';
const pngToolPath = process.env.PNGPATH || './binary_tools/windows/png/pngquant.exe';
const webpToolPath = process.env.WEBPPATH || './binary_tools/windows/webp/cwebp.exe';
const svgToolPath = process.env.SVGPATH || 'svgo.cmd';
const port = process.env.PORT || 3003;

const convertPath = (path) => path.substring(1);
const httpLibToUse = (url) => (url.startsWith("https")) ? https : http;

const commonHeaders = {
	'Cache-Control': 'public, max-age=31536000'
};

const convertWebP = (res) => {
	console.log("Converting to WebP...");
	res.writeHead(200, { ...commonHeaders, 'Content-Type': 'image/webp' });

	const args = [ '-quiet', '-o', '-', '--', '-' ];
	return spawn(webpToolPath, args, { stdio: [ 'pipe', 'pipe', process.stderr  ] });
};

const optimizeJpg = (res) => {
	console.log("Optimizing JPG...");
	res.writeHead(200, { ...commonHeaders, 'Content-Type': 'image/jpeg' });

	const args = [ '-Q', '-', '-' ];
	return spawn(jpgToolPath, args, { stdio: [ 'pipe', 'pipe', process.stderr  ] });
};

const optimizePng = (res) => {
	console.log("Optimizing PNG...");
	res.writeHead(200, { ...commonHeaders, 'Content-Type': 'image/png' });

	const args = [ '-' ];
	return spawn(pngToolPath, args, { stdio: [ 'pipe', 'pipe', process.stderr  ] });
};

const optimizeSvg = (res) => {
	console.log("Optimizing SVG...");
	res.writeHead(200, { ...commonHeaders, 'Content-Type': 'image/svg+xml' });

	const args = [ '-p', '3', '-i', '-', '-o', '-' ];
	return spawn(svgToolPath, args, { stdio: [ 'pipe', 'pipe', process.stderr  ] });
};

const logError = (err) => {
	if(err !== undefined) {
		console.warn("Pipe error: ", err);
	}
};

const pickConverter = (url, accept) => {
	if(_.endsWith(url, ".svg")) {
		return optimizeSvg;
	}

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

	const sourceRequest = urlLib.parse(url);
	sourceRequest.setHost = false;
	sourceRequest.headers = {
		'Host': req.headers['host']
	};

	httpLibToUse(url).get(sourceRequest, (streamInc) => {
		if(streamInc.statusCode >= 400) {
			res.writeHead(streamInc.statusCode);
			res.end();
			return;
		}

		if(converter != null) {
			const process = converter(res);
			pump(streamInc, process.stdin, logError);
			pump(process.stdout, res, logError);

		} else {
			res.writeHead(200, {
				'Cache-Control': streamInc.headers["cache-control"],
				'Content-Type': streamInc.headers["content-type"]
			});
			pump(streamInc, res, logError);
		}
	});
});

app.listen(port, () => {
	console.log(`Listening to port ${port}`);
});