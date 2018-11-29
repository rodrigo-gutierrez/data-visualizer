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

	const result = input.replace("\"{{chartData}}\"", JSON.stringify(chartData));
	res.write(result);
	res.end();
});

server.listen(port, () => {
	console.log("Mawari Data Visualizer Node.js Server now running and listening on port " + port);
});

var data;

// configure the request
const options = {
	url: "https://hgy62pa5ib.execute-api.ap-northeast-1.amazonaws.com/default/mawariRecordGetter",
	method: "GET",
	headers: {
		"Content-Type": "application/json",
		"x-api-key": "MPvWsooXt38PmDRGDIJnP8YQczQ2FquG3euSnxAU"
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
