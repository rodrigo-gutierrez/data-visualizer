const http = require("http");
const fs = require("fs");
const request = require("request");

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
	res.statusCode = 200;
	res.setHeader("Content-Type", "text/html");

	const input = fs.readFileSync("index.html", "utf-8");

	const chartData = {
		labels: ["January", "February", "March", "April", "May", "June", "July"],
	    datasets: [{
			label: "My First dataset",
			backgroundColor: "rgb(255, 99, 132)",
			borderColor: "rgb(255, 99, 132)",
			data: [0, 10, 5, 2, 20, 30, 45],
	    }]
	};	

	var result = input.replace("\"{{chartData}}\"", JSON.stringify(chartData));
	
	var addTable = result.replace("{{table}}", json2table(data.Items));

	res.write(addTable);
	res.end();
});

server.listen(port, () => {
	console.log("Mawari Data Visualizer Node.js Server now running and listening on port " + port);
});

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
}

var data;

// configure the request
const options = {
	url: "https://hgy62pa5ib.execute-api.ap-northeast-1.amazonaws.com/default/mawariReportGetter",
	method: "GET",
	headers: {
		"Content-Type": "application/json",
		"x-api-key": "AL7NxngP8h19POfGnDXto9oGmgdXE2kz2yTnzhtl"
	}
};

// request loop
(function requestLoop() {
	request(options, function (error, response, body) {
		if (!error && response.statusCode == 200) {
	        data = JSON.parse(body);
	        console.log("ScannedCount: " + data.ScannedCount);
	    }
	    else {
	    	console.log(response.statusCode + ": " + error);
	    	data = null;
	    }
	});
	setTimeout(requestLoop, 600000);
})();
