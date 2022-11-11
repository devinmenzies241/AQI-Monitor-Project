// "use strict";
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const request = require("request");


require("dotenv").config();

//variables linked to dotenv file
const apiKey = process.env.API_KEY;
const user = process.env.USER;
const password = process.env.PASS
const iqAirWidget = process.env.IQAIR_WIDGET;
const openWeatherAPI = process.env.OPEN_WEATHER_API;

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(express.static("public"));

let transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  auth: {
    user: user,
    pass: password
  }
});

let sendEmails = function(){
  let mailList = [
    "wompratbass@gmail.com",
    "denvairQualityMonitor@proton.me",
  ];

  let options = {
    from: user,
    to: mailList,
    subject: "Denver Air Quality Has Exceeded 100 AQI",
    text: "text body, lorem ipsum etc, etc",
  }


  transporter.sendMail(options, function (err, info) {
    if (err) {
      console.log(err);
      return;
    } else {
      console.log("Sent: " + info.response);
    }
  });
};

let options = {
  method: "GET",
  url: `http://api.airvisual.com/v2/city?city=Denver&state=Colorado&country=USA&key=${apiKey}`,
  headers: {
  },
};

//api request to IQAir Air Visual API
request(options, function(err, response) {
  if (err) throw new Error(err);
  //define json from the response
  let jsonData = response.body;
  //parse json into js object
  let weatherData = JSON.parse(jsonData);
  //define variable to hold AQIUS data from json object
  let aqius = weatherData.data.current.pollution.aqius;
  //log AQIUS
  console.log(aqius);
  //if aqius exceeds threshold, trigger the sendEmails() function, which carries out sending the emails using nodemailer to all recipients
  if (aqius > 100){
    sendEmails();
    console.log(`Emails sent! AQI is above the threshold, currently at ${aqius}`)
  } else {
    console.log(`Emails not sent, AQI is below threshold, currently at ${aqius}`);
  }
});

let openWeatherOptions = {
  method: "GET",
  url: `http://api.openweathermap.org/data/2.5/air_pollution?lat=39.742043&lon=-104.991531&appid=${openWeatherAPI}`
}

let pollutantData;

let getPollutantData = function(pollutantData){
  app.get("/", function(req, res) {
    res.render("index", {
      iqAirWidgetKey: iqAirWidget,
      co: pollutantData[0],
      no: pollutantData[1],
      no2: pollutantData[2],
      o3: pollutantData[3],
      so2: pollutantData[4],
      nh3: pollutantData[5],
      pm25: pollutantData[6],
      pm10: pollutantData[7]
    });
  });
}


request(openWeatherOptions, function(err, response){
  if(err) throw new Error(err);
  let openWeatherData = JSON.parse(response.body);
  let pollutants = openWeatherData.list[0].components;
  pollutantData = Object.values(pollutants);
  getPollutantData(pollutantData);
});










mongoose.connect("mongodb://localhost:27017/citiesDB", {
  useNewURLParser: true
});

const citiesSchema = {
  city: String
};

const City = mongoose.model("city", citiesSchema);



app.post("/", function(req, res) {
  const userCity = req.body.cityInput;

  const city = new City({
    city: userCity
  });
  city.save();
  console.log(userCity);
  res.redirect("/");
});

app.get("/contact", function(req, res) {
  res.render("contact")
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
