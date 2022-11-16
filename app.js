//App setup section
const express = require("express");
const port = process.env.PORT || 3000;
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const request = require("request");
const session = require("express-session");
const flash = require("connect-flash");
//  const cookieParser = require("cookie-parser");
require("dotenv").config();


//environment variables linked to dotenv file, used to hide API keys, usernames + passwords
const iqAirApiKey = process.env.IQ_AIR_API_KEY;
const user = process.env.USER;
const password = process.env.PASS
const iqAirWidget = process.env.IQAIR_WIDGET;
const openWeatherAPI = process.env.OPEN_WEATHER_API;
const placesAPI = process.env.PLACES_API;
const uri = process.env.MONGODB_URI;
//set up express to create server
const app = express();

let sessionStore = new session.MemoryStore;

//direct express to use the public folder for CSS and media as well as our middleware
app.use(express.static("public"));

//set view EJS view engine to select from views folder
app.set('view engine', 'ejs');

//enable body parser
app.use(bodyParser.urlencoded({
  extended: true
}));

// app.use(cookieParser('secret'));
app.use(session({
    secret: "secretText",
    saveUninitialized: true,
    resave: true
}));


app.use(flash());

app.use(function(req, res, next) {
  res.locals.message = req.flash();
  next();
});



//create transporter via nodemailer for email functionality. This sets up where the email is coming from.
let transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  auth: {
    user: user,
    pass: password
  }
});

//configure nodemailer email,
let sendEmails = function() {
  //Create an array for the recipients, currently set to my testing email, will be updated when final email is prepared
  let mailList = [
    "denvairQualityMonitor@proton.me",
  ];
  //Create options to pass into the .sendMail() method, this will specify the email itself. From, to, subject line and the email body.
  let options = {
    from: user,
    to: mailList,
    subject: "Denver Air Quality Has Exceeded 100 AQI",
    //Enter email here, a full HTML file can be written out if necessary for formatting.
    text: "text body, lorem ipsum etc, etc",
  }

//send email using nodemailer via the specified options and log either and error message or a completed message
  transporter.sendMail(options, function(err, info) {
    if (err) {
      console.log(err);
      return;
    } else {
      console.log("Sent: " + info.response);
    }
  });
};

//Create options request will use to acquire IQAir api JSON
let options = {
  method: "GET",
  url: `http://api.airvisual.com/v2/city?city=Denver&state=Colorado&country=USA&key=${iqAirApiKey}`,
  headers: {},
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
  //if aqius exceeds threshold, trigger the sendEmails() function, which carries out sending the emails using nodemailer.
  if (aqius > 100) {
    sendEmails();
    console.log(`Emails sent! AQI is above the threshold, currently at ${aqius}`)
  } else {
    console.log(`Emails not sent, AQI is below threshold, currently at ${aqius}`);
  }
});

//Create options for OpenWeather request
let openWeatherOptions = {
  method: "GET",
  url: `http://api.openweathermap.org/data/2.5/air_pollution?lat=39.742043&lon=-104.991531&appid=${openWeatherAPI}`
}

//create variable for our Open weather pollutantData to be stored in
let pollutantData;
//create function to call once we have the open weather data that will render the data on screen using Express "GET" route
let getPollutantData = function(pollutantData) {
  app.get("/", function(req, res) {
    res.render("index", {
      //pass these variables into index.ejs using view template. They are listed as the second argument in this res.render() method, the first arg. index is the file to render to.
      iqAirWidgetKey: iqAirWidget,
      co: pollutantData[0],
      no: pollutantData[1],
      no2: pollutantData[2],
      o3: pollutantData[3],
      so2: pollutantData[4],
      nh3: pollutantData[5],
      pm25: pollutantData[6],
      pm10: pollutantData[7],
    });
  });
}
//follow same steps as we did using the IQAir api but instead using the OpenWeather API to get air pollution data
request(openWeatherOptions, function(err, response) {
  if (err) throw new Error(err);
  let openWeatherData = JSON.parse(response.body);
  let pollutants = openWeatherData.list[0].components;
  //Use Object.values to further hone in on the correct data
  pollutantData = Object.values(pollutants);
  //run getPollutantData function passing the pollutantData as a parameter
  getPollutantData(pollutantData);
});


//Set up Mongoose to point to our mongodb cities database
mongoose.connect(MONGODB_URI, {
  useNewURLParser: true
});
//create a Mongoose Schema for the cities
const citiesSchema = {
  city: String
};
//Construct a Mongoose model that references the citiesSchema
const City = mongoose.model("city", citiesSchema);

//Create a post route (using express)
app.post("/", function(req, res) {
  //use body parser to locate our user's selected city via the form input element
  const userCity = req.body.cityInput;
  //Check if the submission is blank
  if (userCity != "") {
    //if a value exists, create a new variable and set it equal to a new City document, with the user input being passed as the city value
    const city = new City({
      city: userCity
    });
    //Save the document to the mongodb database
    city.save();
    //log the saved City
    console.log(userCity);
    //once input, redirect to the home route
    res.redirect("/");
  }
});

app.post("/", (req, res) => {
  if(req.body.cityInput = ""){
    req.session.message = {
      type: "danger",
      intro: "No City Entered!",
      message: "Please enter a city and try again"
    }
    console.log("No City entered");
  }
  res.redirect("/");
});

//Express GET route for the contact page
app.get("/contact", function(req, res) {
  res.render("contact")
});
//Express server listen method for our port (declared at beginning of the file)
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
