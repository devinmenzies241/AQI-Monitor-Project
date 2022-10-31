const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const request = require("request");
require("dotenv").config();

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(express.static("public"));

let transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  // port: 587,
  // secure: false,
  auth: {
    user: "denvairQualityMonitor@outlook.com",
    pass: "andNoSmogFourUs"
  }
});

let sendEmails = function(){
  let mailList = [
    "wompratbass@gmail.com",
    "denvairQualityMonitor@proton.me",
  ];

  let options = {
    from: "denvairQualityMonitor@outlook.com",
    to: mailList,
    subject: "Denver Air Quality Has Exceeded 100 AQI",
    text: "text body",
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

//setting up environment variables using dotenv node module
const apiKey = process.env.API_KEY;

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
  } else {
    console.log("Aqi too low");
  }
});

mongoose.connect("mongodb://localhost:27017/citiesDB", {
  useNewURLParser: true
});

const citiesSchema = {
  city: String
};

const City = mongoose.model("city", citiesSchema);

app.get("/", function(req, res) {
  res.render("index");
});

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
