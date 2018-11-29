const http = require("http");
const fs = require("fs");

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

	const result = input.replace("{{chartData}}", JSON.stringify(chartData));
	res.write(result);
	res.end();
});

server.listen(port, () => {
	console.log("Mawari Data Visualizer Node.js Server now running and listening on port " + port);
});