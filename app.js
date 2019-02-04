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

app.get("/creative", (req, res) => {
	res.json(tableData);
});

app.get("/creative/:creativeId", (req, res) => {
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
	url: "https://hgy62pa5ib.execute-api.ap-northeast-1.amazonaws.com/default/mawariEventGetter",
	method: "GET",
	headers: {
		"Content-Type": "application/json",
		"x-api-key": "DL5qk5uYej22P6wD5KfMV89xy2vUqo9m7IJl27wv"
		// need to read this from un-committed file later
	},
	timeout: 60000
};

// request loop
(async function updateLoop() {
	await getCreatives();
	await getEvents();
	setTimeout(updateLoop, 600000);
})();

function Creative(creativeId, name) {
	this.creativeId = creativeId;
	this.name = name;
	this.impressionCount = 0;
	this.interactionCount = 0;
	this.clickCount = 0;
	this.sessions = [];
};

function Session(sessionId) {
	this.sessionId = sessionId;
	this.hasInteraction = false;
	this.interactionStart = 0;
	this.interactionEnd = 0;
	this.interactionTime = 0;
	this.events = [];
};

function Event(itemId, creativeId, sessionId, eventId, eventType, eventData, dateTime) {
	this.itemId = itemId;
	this.creativeId = creativeId;
	this.sessionId = sessionId;
	this.eventId = eventId;
	this.eventType = eventType;
	this.eventData = eventData;
	this.dateTime = dateTime;
};

async function getEvents() {
	console.log("Beginning Events Table Scan...");
	request(getEventsOptions, (error, response, body) => {
		if (!error && response.statusCode == 200) {
			const eventsData = JSON.parse(body);
			console.log("Fetched: " + eventsData.Count + " Events");
			if (eventsData.Count > 0) arrangeEvents(eventsData);
		}
		else {
			console.log(response.statusCode + ": " + error);
		}
	});
};

async function getCreatives() {
	console.log("Beginning Creatives Table Scan...");
	request(getCreativesOptions, (error, response, body) => {
		if (!error && response.statusCode == 200) {
			const creativesData = JSON.parse(body);
			console.log("Fetched: " + creativesData.Count + " Creative IDs");
			if (creativesData.Count > 0) arrangeCreatives(creativesData);
		}
		else {
			console.log(response.statusCode + ": " + error);
		}
	});
};

function arrangeCreatives(creativesData) {
	creatives = [];

	creativesData.Items.forEach(item => {
		var creative = creatives.find(c => c.creativeId == item.creativeId);
		if (creative == null) creatives.push(new Creative(item.creativeId, item.name));
	});
	console.log("Arranging Creatives Done");
};

function arrangeEvents(eventsData) {
	console.log("Arranging Events...");
	eventsData.Items.forEach(item => {
		var creative = creatives.find(c => c.creativeId == item.creativeId);
		if (creative != null) {
			var event = new Event(item.itemId, item.creativeId, item.sessionId, item.eventId, item.eventType, item.eventData, item.dateTime);
			var session = creative.sessions.find(s => s.sessionId == item.sessionId);
			if (session == null) {
				session = new Session(item.sessionId);
				creative.sessions.push(session);
				session.events.push(event);
			}
			else {
				session.events.push(event);
			}

			if (item.eventType === "impression") creative.impressionCount++;
			if (item.eventType === "first-interaction" || item.eventType === "first-click") {
				creative.interactionCount++;
				session.hasInteraction = true;
				session.interactionStart = event.dateTime;
				session.interactionEnd = event.dateTime;
			}
			if (item.eventType === "click-through") creative.clickCount++;
		}
		else {
			console.log("ERROR: creativeId '" + item.creativeId + "' not found");
		}
	});
	console.log("Arranging Events Done");

	if (creatives.length > 0) {
		creatives.forEach(creative => {
			if (creative.sessions.length > 0) {
				creative.sessions.forEach(session => {
					if (session.hasInteraction) {
						session.events.forEach(event => {
							if (event.eventType === "rotation" || event.eventType === "zoom" || event.eventType === "variant" || event.eventType === "reset") {
								if (event.dateTime > session.interactionEnd) session.interactionEnd = event.dateTime;
							}
						});
					}
				});
			}
		});
		
		// NOT correct place for this
		updateTable();
	}
};

function updateTable() {
	console.log("Updating Cache Table Data...")
	tableData = creatives.map(c => { 
		return { 
			creativeId: c.creativeId,
			name: c.name,
			eventCount: c.sessions.reduce((acc, element) => acc + element.events.length, 0),
			impressionCount: c.impressionCount,
			interactionCount: c.interactionCount,
			clickCount: c.clickCount
		};
	});
	console.log("Updating Cache Table Data done");
};
