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

var chartData = {
	labels: [],
	datasets: [{
		label: "Impressions per Interval",
		backgroundColor: "rgb(255, 99, 132)",
		borderColor: "rgb(255, 99, 132)",
		data: []
	}]
};

var tableData = [];

app.use(favicon(path.join(__dirname, "public", "favicon.ico")));

var doughnutData = {
	labels: ["Impressions", "Interactions", "Clicks"],
	datasets: [{
		label: "Event Count",
		backgroundColor: ["#3e95cd", "#8e5ea2","#3cba9f"],
		data: []
	}]
};

app.get("/", (req, res) => {
	res.statusCode = 200;
	res.setHeader("Content-Type", "text/html");

	const input = fs.readFileSync("index.html", "utf-8");

	var addChart = input.replace("\"{{chartData}}\"", JSON.stringify(chartData));
	
	var addTable = addChart.replace("{{table}}", json2table(tableData));

	var addDoughnut = addTable.replace("\"{{doughnutData}}\"", JSON.stringify(doughnutData));

	res.write(addDoughnut);
	res.end();
});

app.get("/:creativeId", (req, res) => {
	console.log("Received GET request with parameter " + req.params.creativeId);

	var creative = creatives.find(c => c.creativeId == req.params.creativeId);
	if (creative == null) {
		res.statusCode == 200;
		res.setHeader("Content-Type", "text/html");
		res.write("No creative found matching " + req.params.creativeId);
		res.end();
	}
	else {
		res.statusCode == 200;
		res.setHeader("Content-Type", "application/json");
		res.write(JSON.stringify(creative));
		res.end();
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

	eventsData.Items.forEach(item => {
		creative.events.push(new Report(item.reportId, item.creativeId, item.dateTime, item.impressionCount, item.interactionCount, item.clickCount));
		creative.impressionCount += item.impressionCount;
		creative.interactionCount += item.interactionCount;
		creative.clickCount += item.clickCount;
	});

	// NOT correct place for this
	if (creatives.length > 0) {
		generateTimeline();
		generateDoughnut();
		updateTable();
		console.log("Processing done");
	}
};

function updateTable() {
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

function generateTimeline() {
	chartData.labels = [];
	chartData.datasets[0].data = [];

	var dateTimes = creatives[0].events.map(d => new Date(d.dateTime).getTime());
	var lowerBounds = dateTimes[0];
	dateTimes.forEach(dateTime => {
		if (dateTime < lowerBounds) lowerBounds = dateTime;
	});
	//console.log("Lower Bounds: " + lowerBounds);
	var upperBounds = new Date(Date.now()).getTime();
	//console.log("Upper Bounds: " + upperBounds);
	var period = upperBounds - lowerBounds;
	//console.log("Period:       " + period);
	var size = Math.floor(period / 600000);
	//console.log("Size:         " + size);

	var timeStep = lowerBounds;

	for (var i = 0; i < size; i++) {
		var minutes = new Date(timeStep).getMinutes();
		var hour = new Date(timeStep).getHours();
		var day = new Date(timeStep).getDate();
		var month = new Date(timeStep).getMonth() + 1;

		var timeString = 
		(month < 10 ? "0" + month : month) + "-" + 
		(day < 10 ? "0" + day : day) + "-" + 
		(hour < 10 ? "0" + hour : hour) + ":" + 
		(minutes < 10 ? "0" + minutes : minutes);

		chartData.labels.push(timeString);
		chartData.datasets[0].data.push(0);

		timeStep += 600000;
	}

	creatives[0].events.forEach(item => {
		chartData.datasets[0].data[Math.floor((item.dateTime - lowerBounds + 60000) / 600000)] += item.impressionCount;
	});
};

function generateDoughnut() {
	doughnutData.datasets[0].data = [creatives[0].impressionCount, creatives[0].interactionCount, creatives[0].clickCount];
};

function json2table(json) {
	var cols = Object.keys(json[0]);
	var headerRow = "";
	var bodyRows = "";

	cols.map(function(col) {
		headerRow += "<th>" + col + "</th>";
	});

	json.map(function(row) {
		bodyRows += "<tr>";
		cols.map(function(colName) {
			bodyRows += "<td>" + row[colName] + "</td>";
		});
		bodyRows += "</tr>";
	});

	return "<table><thead><tr>" + headerRow + "</tr></thead><tbody>" + bodyRows + "</tbody></table>"; 
};
