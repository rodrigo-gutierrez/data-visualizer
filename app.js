const http = require("http");
const fs = require("fs");
const request = require("request");

const port = process.env.PORT || 3000;

var data;
var campaigns = [];

var chartData = {
	labels: [],
    datasets: [{
		label: "Impressions per Interval",
		backgroundColor: "rgb(255, 99, 132)",
		borderColor: "rgb(255, 99, 132)",
		data: []
    }]
};

const server = http.createServer((req, res) => {
	res.statusCode = 200;
	res.setHeader("Content-Type", "text/html");

	const input = fs.readFileSync("index.html", "utf-8");

	var result = input.replace("\"{{chartData}}\"", JSON.stringify(chartData));
	
	var addTable = result.replace("{{table}}", json2table(campaigns));

	res.write(addTable);
	res.end();
});

server.listen(port, () => {
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
	        data = JSON.parse(body);
	        console.log("ScannedCount: " + data.ScannedCount);
	        sortCampaigns();
	        //generateTimeline();
	        console.log("Processing done");
	    }
	    else {
	    	console.log(response.statusCode + ": " + error);
	    	data = null;
	    }
	});
	setTimeout(getCreativesLoop, 600000);
})();

function Campaign(creativeId, name) {
	this.creativeId = creativeId;
	this.name = name;
	this.impressionCount = 0;
	this.interactionCount = 0;
	this.clickCount = 0;
};

function sortCampaigns() {
	campaigns = [];

	data.Items.forEach(item => {
		var campaign = campaigns.find(c => c.creativeId == item.creativeId);
        if (campaign == null) {
            campaigns.push(new Campaign(item.creativeId, item.name));
            campaign = campaigns[campaigns.length - 1];
        }

        //campaign.impressionCount += item.impressionCount;
        //campaign.interactionCount += item.interactionCount;
        //campaign.clickCount += item.clickCount;
	});	
};

function generateTimeline() {
	chartData.labels = [];
	chartData.datasets[0].data = [];

	var dateTimes = data.Items.map(d => new Date(d.dateTime).getTime());
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

	data.Items.forEach(item => {
		if (item.creativeId == campaigns[0].creativeId)
			chartData.datasets[0].data[Math.floor((item.dateTime - lowerBounds + 60000) / 600000)] += item.impressionCount;
	});
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
