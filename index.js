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

	const args = [ '-quiet', '-metadata', 'icc', '-o', '-', '--', '-' ];
	return spawn(webpToolPath, args, { stdio: [ 'pipe', 'pipe', process.stderr  ] });
};

const optimizeJpg = (res) => {
	console.log("Optimizing JPG...");
	res.writeHead(200, { ...commonHeaders, 'Content-Type': 'image/jpeg' });

	const args = [ '-Q', '--min', '35', '--max', '85', '--strip', '--method', 'smallfry', '--loops', '16',  '-', '-' ];
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

	const args = [ '-p', '3', '--disable', 'removeUnknownsAndDefaults', '-i', '-', '-o', '-' ];
	return spawn(svgToolPath, args, { stdio: [ 'pipe', 'pipe', process.stderr  ] });
};

const logError = (err) => {
	if(err !== undefined) {
		console.warn("Pipe error: ", err);
	}
};

const pickConverter = (url, accept) => {
	const moddedPath = _.toLower(url);

	if(_.endsWith(moddedPath, ".svg")) {
		return optimizeSvg;
	}

	if(accept !== undefined && accept.indexOf("image/webp") !== -1) {
		return convertWebP;
	}

	if(_.endsWith(moddedPath, ".png")) {
		return optimizePng;
	}

	if(_.endsWith(moddedPath, ".jpg") || _.endsWith(moddedPath, ".jpeg")) {
		return optimizeJpg;
	}

	return null;
};

const setHostHeaderForSourceRequest = (url, sourceRequest, incRequest) => {
	if(url.indexOf("tine.no") !== -1) {
		sourceRequest.setHost = false;
		sourceRequest.headers = {
			'Host': incRequest.headers['host']
		};
	}
};

/**
 * Main entry point for requests. Fetches the complete URL from the path supplied, pipes the contents through an optimizer based on file name.
 */

app.get('/*', async function (req, res) {
	if(req.path === "/server/status") {
		res.send("UP");
		return;
	}

	if(req.path.indexOf('http') === -1) {
		res.send("Wrong URL format");
		return;
	}

	const url = convertPath(req.originalUrl);
	console.log(`Fetching from ${url}`);

	const converter = pickConverter(url, req.headers['accept']);

	const sourceRequest = urlLib.parse(url);
	setHostHeaderForSourceRequest(url, sourceRequest, req);

	console.log(`Forwarding proxy ips: ${req.headers['x-forwarded-for'] || req.ip}`);
	sourceRequest.headers = {
		...sourceRequest.headers,
		'X-Forwarded-For': req.headers['x-forwarded-for'] || req.ip
	};


	httpLibToUse(url).get(sourceRequest, (streamInc) => {
		if (streamInc.statusCode >= 400) {
			res.writeHead(streamInc.statusCode);
			res.end();
			streamInc.destroy();
			return;
		}

		if (converter != null) {
			const process = converter(res);
			pump(streamInc, process.stdin, logError);
			pump(process.stdout, res, (err) => {
				if(err !== undefined) {
					logError(err);
				}
				console.log("Image processing finished.");
				res.end();
			});

		} else {
			res.writeHead(200, {
				'Cache-Control': streamInc.headers["cache-control"],
				'Content-Type': streamInc.headers["content-type"]
			});
			pump(streamInc, res, logError);
		}
	}).on('error', e => {
		console.warn("Error occured: ", e.message);
		res.writeHead(500);
		res.end();
	});
});

app.listen(port, () => {
	console.log(`Listening to port ${port}`);
});
