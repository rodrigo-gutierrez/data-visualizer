const http = require("http");
const fs = require("fs");
const path = require("path");
const request = require("request");
const express = require("express");
const favicon = require("serve-favicon");

const app = express();
const port = process.env.PORT || 3000;
const maxInteractionTime = 60000;

var data;
var creatives = [];
var tableData = [];

app.use(favicon(path.join(__dirname, "public", "favicon.ico")));

app.get("/", (req, res) => {
	fs.readFile(path.join(__dirname, "public", "index.html"), "utf-8", (error, data) => {
		if (!error) {
			res.send(data);
		}
		else {
			res.status(500).send("Internal Server Error: readFile failure: " + error);
		}
	});
});

app.get("/creative", (req, res) => {
	res.json(tableData);
});

app.get("/creative/:creativeId/impression-timeline", (req, res) => {
	console.log("Received GET impr. timeline\trequest with parameter " + req.params.creativeId);

	var creative = creatives.find(c => c.creativeId == req.params.creativeId);
	if (creative == null) {
		res.status(404).send("No creative found matching " + req.params.creativeId);
	}
	else {
		res.json(creative.impressionTimeline);
	}
});

app.get("/creative/:creativeId/action-timeline", (req, res) => {
	console.log("Received GET action timeline\trequest with parameter " + req.params.creativeId);

	var creative = creatives.find(c => c.creativeId == req.params.creativeId);
	if (creative == null) {
		res.status(404).send("No creative found matching " + req.params.creativeId);
	}
	else {
		res.json(creative.actionTimeline);
	}
});

app.get("/creative/:creativeId/rate-timeline", (req, res) => {
	console.log("Received GET rate timeline\trequest with parameter " + req.params.creativeId);

	var creative = creatives.find(c => c.creativeId == req.params.creativeId);
	if (creative == null) {
		res.status(404).send("No creative found matching " + req.params.creativeId);
	}
	else {
		res.json(creative.rateTimeline);
	}
});

app.get("/creative/:creativeId/engagement-timeline", (req, res) => {
	console.log("Received GET eng. timeline\trequest with parameter " + req.params.creativeId);

	var creative = creatives.find(c => c.creativeId == req.params.creativeId);
	if (creative == null) {
		res.status(404).send("No creative found matching " + req.params.creativeId);
	}
	else {
		res.json(creative.engagementTimeline);
	}
});

app.get("/creative/:creativeId/impression-breakdown", (req, res) => {
	console.log("Received GET impr. breakdown\trequest with parameter " + req.params.creativeId);

	var creative = creatives.find(c => c.creativeId == req.params.creativeId);
	if (creative == null) {
		res.status(404).send("No creative found matching " + req.params.creativeId);
	}
	else {
		res.json(creative.impressionBreakdown);
	}
});

app.get("/creative/:creativeId/variant-breakdown", (req, res) => {
	console.log("Received GET variant breakdown\trequest with parameter " + req.params.creativeId);

	var creative = creatives.find(c => c.creativeId == req.params.creativeId);
	if (creative == null) {
		res.status(404).send("No creative found matching " + req.params.creativeId);
	}
	else {
		res.json(creative.variantBreakdown);
	}
});

app.get("/creative/:creativeId/engagement-bars", (req, res) => {
	console.log("Received GET engagement bars\trequest with parameter " + req.params.creativeId);

	var creative = creatives.find(c => c.creativeId == req.params.creativeId);
	if (creative == null) {
		res.status(404).send("No creative found matching " + req.params.creativeId);
	}
	else {
		res.json(creative.engagementBars);
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

	this.impressionTimeline = {
		labels: [],
		datasets: [
			{
				data: []
			},
			{
				data: []
			},
			{
				data: []
			}
		]
	};

	this.engagementTimeline = {
		labels: [],
		datasets: [
			{
				data: []
			}
		]
	};

	this.actionTimeline = {
		labels: [],
		datasets: [
			{
				data: []
			},
			{
				data: []
			},
			{
				data: []
			},
			{
				data: []
			}
		]
	};

	this.rateTimeline = {
		labels: [],
		datasets: [
			{
				data: []
			},
			{
				data: []
			}
		]
	};

	this.impressionBreakdown = {
		datasets: [{
			data: []
		}]
	};

	this.variantBreakdown = {
		labels: [],
		datasets: [{
			backgroundColor: [],
			data: []
		}]
	};

	this.engagementBars = {
		labels: ["< 1", "1~2", "2~3", "3~4", "4~5", "5~7", "7~10", "> 10"],
		datasets: [{
			data: []
		}]
	};

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
			if (eventsData.Count > 0) {
				arrangeEvents(eventsData);
				updateTable();
				calculateInteractionTimes();
				generateChartsData();
			}
		}
		else if (error && response) {
			console.log(response.statusCode + ": " + error);
		}
		else {
			console.log("Failed to get Status Code: " + error);
		}
	});
};

async function getCreatives() {
	console.log("Beginning Creatives Table Scan...");
	request(getCreativesOptions, (error, response, body) => {
		if (!error && response.statusCode == 200) {
			const creativesData = JSON.parse(body);
			console.log("Fetched: " + creativesData.Count + " Creative IDs");
			if (creativesData.Count > 0) {
				arrangeCreatives(creativesData);
			}
		}
		else if (error && response) {
			console.log(response.statusCode + ": " + error);
		}
		else {
			console.log("Failed to get Status Code: " + error);
		}
	});
};

function arrangeCreatives(creativesData) {
	creatives = [];

	console.log("Arranging Creatives...");
	creativesData.Items.forEach(item => {
		var creative = creatives.find(c => c.creativeId == item.creativeId);
		if (creative == null) creatives.push(new Creative(item.creativeId, item.name));
	});
	console.log("Arranging Creatives done");
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
	console.log("Arranging Events done");
};

function updateTable() {
	console.log("Updating Cache Table Data...");
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

function calculateInteractionTimes() {
	console.log("Calculating Interaction Times...");
	creatives.forEach(creative => {
		if (creative.sessions.length > 0) {
			creative.sessions.forEach(session => {
				if (session.hasInteraction) {
					session.events.forEach(event => {
						if (event.eventType === "rotation" || event.eventType === "zoom" || event.eventType === "variant" || event.eventType === "reset") {
							if (event.dateTime > session.interactionEnd) {
								session.interactionEnd = event.dateTime;
							}
						}
					});
				}
			});
		}
	});
	console.log("Calculating Interaction Times done");
}

function generateChartsData() {
	console.log("Generating Charts Data...");
	creatives.forEach(creative => {
		// clear data
		creative.impressionTimeline.labels = [];
		creative.impressionTimeline.datasets[0].data = [];
		creative.impressionTimeline.datasets[1].data = [];
		creative.impressionTimeline.datasets[2].data = [];
		creative.actionTimeline.labels = [];
		creative.actionTimeline.datasets[0].data = [];
		creative.actionTimeline.datasets[1].data = [];
		creative.actionTimeline.datasets[2].data = [];
		creative.actionTimeline.datasets[3].data = [];
		creative.rateTimeline.labels = [];
		creative.rateTimeline.datasets[0].data = [];
		creative.rateTimeline.datasets[1].data = [];
		creative.engagementTimeline.labels = [];
		creative.engagementTimeline.datasets[0].data = [];
		creative.variantBreakdown.labels = [];
		creative.variantBreakdown.datasets[0].data = [];
		creative.variantBreakdown.datasets[0].backgroundColor = [];
		creative.engagementBars.datasets[0].data = [];

		for (var i = 0; i < creative.engagementBars.labels.length; i++) {
			creative.engagementBars.datasets[0].data.push(0);
		}

		creative.impressionBreakdown.datasets[0].data = [creative.impressionCount, creative.interactionCount, creative.clickCount];

		if (creative.sessions.length > 0) {
			// number of data points to show
			var numDataPoints = creative.sessions.reduce((acc, element) => acc + element.events.length, 0);
			if (numDataPoints > 240) numDataPoints = 240;

			// find oldest event
			var lowerBounds = new Date(creative.sessions[0].events[0].dateTime).getTime();
			creative.sessions.forEach(session => {
				var dateTimes = session.events.map(d => new Date(d.dateTime).getTime());
				dateTimes.forEach(dateTime => {
					if (dateTime < lowerBounds) lowerBounds = dateTime;
				});
			});

			// set upper bounds to now
			const upperBounds = new Date(Date.now()).getTime();

			// set total time period to work with
			const totalBounds = upperBounds - lowerBounds;

			// set time step size
			const stepSize = Math.floor(totalBounds / numDataPoints);
			
			// begin at lower bounds
			var timeStep = lowerBounds;

			// generate time labels
			for (var i = 0; i < numDataPoints; i++) {
				var minutes = new Date(timeStep).getMinutes();
				var hour = new Date(timeStep).getHours();
				var day = new Date(timeStep).getDate();
				var month = new Date(timeStep).getMonth() + 1;

				var timeString = 
				(month < 10 ? "0" + month : month) + "-" + 
				(day < 10 ? "0" + day : day) + "-" + 
				(hour < 10 ? "0" + hour : hour) + ":" + 
				(minutes < 10 ? "0" + minutes : minutes);

				creative.impressionTimeline.labels.push(timeString);
				creative.impressionTimeline.datasets[0].data.push(0);
				creative.impressionTimeline.datasets[1].data.push(0);
				creative.impressionTimeline.datasets[2].data.push(0);
				creative.actionTimeline.labels.push(timeString);
				creative.actionTimeline.datasets[0].data.push(0);
				creative.actionTimeline.datasets[1].data.push(0);
				creative.actionTimeline.datasets[2].data.push(0);
				creative.actionTimeline.datasets[3].data.push(0);
				creative.rateTimeline.labels.push(timeString);
				creative.engagementTimeline.labels.push(timeString);
				creative.engagementTimeline.datasets[0].data.push(0);

				timeStep += stepSize;
			}

			// sort all events into the time step buckets
			creative.sessions.forEach(session => {
				session.events.forEach(event => {
					if (event.eventType === "impression") {
						creative.impressionTimeline.datasets[0].data[Math.floor((event.dateTime - lowerBounds) / stepSize)]++;
					}
					if (event.eventType === "first-interaction" || event.eventType === "first-click") {
						creative.impressionTimeline.datasets[1].data[Math.floor((event.dateTime - lowerBounds) / stepSize)]++;
					}
					if (event.eventType === "click-through") {
						creative.impressionTimeline.datasets[2].data[Math.floor((event.dateTime - lowerBounds) / stepSize)]++;
					}
					if (event.eventType === "rotation") {
						creative.actionTimeline.datasets[0].data[Math.floor((event.dateTime - lowerBounds) / stepSize)]++;
					}
					if (event.eventType === "zoom") {
						creative.actionTimeline.datasets[1].data[Math.floor((event.dateTime - lowerBounds) / stepSize)]++;
					}
					if (event.eventType === "variant") {
						creative.actionTimeline.datasets[2].data[Math.floor((event.dateTime - lowerBounds) / stepSize)]++;
						var variant = creative.variantBreakdown.labels.find(v => v === event.eventData.id);
						if (variant != null) {
							creative.variantBreakdown.datasets[0].data[creative.variantBreakdown.labels.indexOf(variant)]++;
						}
						else {
							creative.variantBreakdown.labels.push(event.eventData.id);
							creative.variantBreakdown.datasets[0].data.push(1);
							creative.variantBreakdown.datasets[0].backgroundColor.push(event.eventData.id);
						}
					}
					if (event.eventType === "reset") {
						creative.actionTimeline.datasets[3].data[Math.floor((event.dateTime - lowerBounds) / stepSize)]++;
					}
				});
			});

			for (var i = 0; i < numDataPoints; i++) {
				if (creative.impressionTimeline.datasets[0].data[i] == 0) {
					creative.rateTimeline.datasets[0].data.push(0);
					creative.rateTimeline.datasets[1].data.push(0);
				}
				else {
					creative.rateTimeline.datasets[0].data.push(creative.impressionTimeline.datasets[1].data[i] / creative.impressionTimeline.datasets[0].data[i]);
					creative.rateTimeline.datasets[1].data.push(creative.impressionTimeline.datasets[2].data[i] / creative.impressionTimeline.datasets[0].data[i]);
				}
			}

			var interactionsPerInterval = [];
			for (var i = 0; i < numDataPoints; i++) {
				interactionsPerInterval.push(0);
			}

			creative.sessions.forEach(session => {
				if (session.hasInteraction) {
					session.interactionTime = session.interactionEnd - session.interactionStart;

					if (session.interactionTime < maxInteractionTime) {
						var index = Math.floor((session.interactionEnd - lowerBounds) / stepSize);
						creative.engagementTimeline.datasets[0].data[index] += session.interactionTime;
						interactionsPerInterval[index]++;

						if (session.interactionTime < 1000)
							creative.engagementBars.datasets[0].data[0]++;
						else if (session.interactionTime < 2000)
							creative.engagementBars.datasets[0].data[1]++;
						else if (session.interactionTime < 3000)
							creative.engagementBars.datasets[0].data[2]++;
						else if (session.interactionTime < 4000)
							creative.engagementBars.datasets[0].data[3]++;
						else if (session.interactionTime < 5000)
							creative.engagementBars.datasets[0].data[4]++;
						else if (session.interactionTime < 7000)
							creative.engagementBars.datasets[0].data[5]++;
						else if (session.interactionTime < 10000)
							creative.engagementBars.datasets[0].data[6]++;
						else
							creative.engagementBars.datasets[0].data[7]++;
					}
				}
			});

			for (var i = 0; i < numDataPoints; i++) {
				if (interactionsPerInterval[i] != 0) {
					creative.engagementTimeline.datasets[0].data[i] /= interactionsPerInterval[i] * 1000;
				}
			}
		}
		else {
			//console.log("ERROR: No sessions generated in timeline");
		}
	});
	console.log("Generating Charts Data done");
};
