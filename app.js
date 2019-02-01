const http = require("http");
const fs = require("fs");
const path = require("path");
const request = require("request");
const express = require("express");
const favicon = require("serve-favicon");

const app = express();
const port = process.env.PORT || 3000;

var data;
var creatives = [];
var tableData = [];

app.use(favicon(path.join(__dirname, "public", "favicon.ico")));

app.get("/", (req, res) => {
	// change to async
	const input = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf-8");

	res.send(input);
});

app.get("/creatives", (req, res) => {
	res.json(tableData);
});

app.get("/creatives/:creativeId", (req, res) => {
	console.log("Received GET request with parameter " + req.params.creativeId);

	var creative = creatives.find(c => c.creativeId == req.params.creativeId);
	if (creative == null) {
		res.status(404).send("No creative found matching " + req.params.creativeId);
	}
	else {
		res.json(creative);
	}
});

app.listen(port, () => {
	console.log("Mawari Data Visualizer Node.js Server now running and listening on port " + port);
});

// configure the request
const getCreativesOptions = {
	url: "https://hgy62pa5ib.execute-api.ap-northeast-1.amazonaws.com/default/mawariReportGetter/creative",
	method: "GET",
	headers: {
		"Content-Type": "application/json",
		"x-api-key": "AL7NxngP8h19POfGnDXto9oGmgdXE2kz2yTnzhtl"
		// need to read this from un-committed file later
	}
};

// configure the request
const getEventsOptions = {
	url: "",
	method: "GET",
	headers: {
		"Content-Type": "application/json",
		"x-api-key": "AL7NxngP8h19POfGnDXto9oGmgdXE2kz2yTnzhtl"
		// need to read this from un-committed file later
	}
};

// request loop
(function getCreativesLoop() {
	request(getCreativesOptions, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			const creativesData = JSON.parse(body);
			console.log("Fetched: " + creativesData.Count + " Creative IDs");
			if (creativesData.Count > 0) arrangeCreatives(creativesData);
			if (creatives.length > 0) getEvents();
		}
		else {
			console.log(response.statusCode + ": " + error);
		}
	});
	setTimeout(getCreativesLoop, 600000);
})();

function Creative(creativeId, name) {
	this.creativeId = creativeId;
	this.name = name;
	this.impressionCount = 0;
	this.interactionCount = 0;
	this.clickCount = 0;
	this.events = [];
};

function Report(reportId, creativeId, dateTime, impressionCount, interactionCount, clickCount) {
	this.reportId = reportId;
	this.creativeId = creativeId;
	this.dateTime = dateTime;
	this.impressionCount = impressionCount;
	this.interactionCount = interactionCount;
	this.clickCount = clickCount;
};

function arrangeCreatives(creativesData) {
	creatives = [];

	creativesData.Items.forEach(item => {
		var creative = creatives.find(c => c.creativeId == item.creativeId);
		if (creative == null) {
			creatives.push(new Creative(item.creativeId, item.name));
			creative = creatives[creatives.length - 1];
		}
	});
	console.log("Arranging Creatives Done");
};

function getEvents() {
	creatives.forEach(item => {
		getEventsOptions.url = getCreativesOptions.url + "/" + item.creativeId;
		request(getEventsOptions, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				const eventsData = JSON.parse(body);
				console.log(item.creativeId + ": fetched " + eventsData.Count + " reports");
				if (eventsData.Count > 0) arrangeEvents(eventsData, item);
			}
			else {
				console.log(response.statusCode + ": " + error);
			}
		});
	});
};

function arrangeEvents(eventsData, creative) {
	creative.events = [];

	console.log("Arranging Events...");
	eventsData.Items.forEach(item => {
		creative.events.push(new Report(item.reportId, item.creativeId, item.dateTime, item.impressionCount, item.interactionCount, item.clickCount));
		creative.impressionCount += item.impressionCount;
		creative.interactionCount += item.interactionCount;
		creative.clickCount += item.clickCount;
	});
	console.log("Arranging Events Done");

	// NOT correct place for this
	if (creatives.length > 0) {
		updateTable();
		//console.log("Processing done");
	}
};

function updateTable() {
	console.log("Updating Cache Table Data...")
	tableData = creatives.map(c => { 
		return { 
			creativeId: c.creativeId,
			name: c.name,
			impressionCount: c.impressionCount,
			interactionCount: c.interactionCount,
			clickCount: c.clickCount
		};
	});
};
