const express = require("express");
const bodyParser = require('body-parser');
const nodemailer = require("nodemailer");
const axios = require('axios');
const { collection, Blog } = require("./config");
const bcrypt = require('bcrypt');
const path = require('path');
const qr = require("qr-image");
const fs = require("fs");
require("dotenv").config();
const port = 5000;
const app = express();

app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");

const OPENWEATHER_API = "https://api.openweathermap.org/data/2.5/weather"
const NEWS_API = "https://newsapi.org/v2/everything"
const COUNTRY_API = "https://restcountries.com/v3.1/name/"


app.get("/", (req, res) => {
    res.render("login");
});

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.post("/signup", async (req, res) => {

    const data = {
        name: req.body.username,
        password: req.body.password
    }

    const existingUser = await collection.findOne({ name: data.name });

    if (existingUser) {
        res.send('User already exists. Please choose a different username.');
    } else {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(data.password, saltRounds);

        data.password = hashedPassword; 

        const userdata = await collection.insertMany(data);
        console.log(userdata);
        res.render('login')
    }

});

app.post("/login", async (req, res) => {
    try {
        const check = await collection.findOne({ name: req.body.username });
        if (!check) {
            res.send("User name cannot found")
        }
        const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
        if (!isPasswordMatch) {
            res.send("wrong Password");
        }
        else {
            res.redirect("/home");;
        }
    }
    catch {
        res.send("wrong Details");
    }
});

app.get('/home', (req,res)=>{
    res.render("home");
});

app.get('/bmi', (req, res) => {
    res.render('bmi'); 
});


app.post('/bmi', (req, res) => {
    let { weight, height } = req.body;
    weight = parseFloat(weight);
    height = parseFloat(height) / 100; 

    console.log("Parsed Weight:", weight);
    console.log("Parsed Height (m):", height);

    if (!weight || !height || isNaN(weight) || isNaN(height)) {
        return res.status(400).json({ error: "Invalid weight or height" });
    }

    const bmi = (weight / (height * height)).toFixed(2);

    let category, cssClass;
    if (bmi < 18.5) {
        category = 'Underweight';
        cssClass = 'underweight';
    } else if (bmi < 24.9) {
        category = 'Normal';
        cssClass = 'normal';
    } else if (bmi < 29.9) {
        category = 'Overweight';
        cssClass = 'overweight';
    } else {
        category = 'Obese';
        cssClass = 'obese';
    }

    res.json({ bmi, category, cssClass });
});

app.get('/qr-code', (req,res) =>{
    res.render("qr-code", { qrImage: null, error: null }); 
});

app.post("/generate-qr", (req, res) => {
    const url = req.body.url;

    if (!url) {
        return res.render("qr-code", { qrImage: null, error: "Please enter a valid URL!" });
    }

    const qrImage = qr.imageSync(url, { type: "png" });
    const qrPath = path.join(__dirname, "public", "qrcode.png");
    fs.writeFileSync(qrPath, qrImage);


    res.render("qr-code", { qrImage: "/qrcode.png", error: null });
});

app.get("/nodemailer", (req, res) => {
    res.render("nodemailer", { message: null, error: null });
});

app.post("/send-email", async (req, res) => {
    const { recipient, subject, message } = req.body;

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,  
            pass: process.env.EMAIL_PASS   
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipient,
        subject: subject,
        text: message,
        attachments: [
            {
                filename: "mail.txt",
                content: "Hello!"
            }
        ]
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: " + info.response);
        res.render("nodemailer", { message: "Email sent successfully!", error: null });
    } catch (error) {
        console.error("Error sending email: ", error);
        res.render("nodemailer", { message: null, error: "Failed to send email." });
    }
});

app.get('/weather', (req, res) => {
    res.render('weather', { weatherData: null, newsData: null, error: null });
});
app.get('/api/weather', async (req, res) => {
    const { city } = req.query;

    if (!city) {
        return res.status(400).json({ error: 'City parameter is required' });
    }

    try {
        const openWeatherResponse = await axios.get(OPENWEATHER_API, {
            params: {
                q: city,
                appid: process.env.OPENWEATHER_API_KEY,
                units: 'metric',
            },
        });

        const weatherData = openWeatherResponse.data;

   
        const newsResponse = await axios.get(NEWS_API, {
            params: {
                q: city, 
                apiKey: process.env.NEWS_API_KEY,
                language: 'en',
                sortBy: 'relevancy', 
            },
        });

        const countryName = weatherData.sys.country; 
        const countryResponse = await axios.get(`${COUNTRY_API}${countryName}`);
        const countryInfo = countryResponse.data[0];
        const flagUrl = countryInfo.flags.svg;

        const newsData = newsResponse.data.articles;

        const response = {
            weather: {
                temperature: weatherData.main.temp,
                feels_like: weatherData.main.feels_like,
                description: weatherData.weather[0].description,
                icon: `http://openweathermap.org/img/w/${weatherData.weather[0].icon}.png`,
                coordinates: {
                    lat: weatherData.coord.lat,
                    lon: weatherData.coord.lon,
                },
                humidity: weatherData.main.humidity,
                pressure: weatherData.main.pressure,
                wind_speed: weatherData.wind.speed,
                country: weatherData.sys.country,
                rainVolume: weatherData.rain ? weatherData.rain['3h'] : 'No rain',
            },
            news: newsData.slice(0, 3).map(article => ({
                title: article.title,
                description: article.description,
                url: article.url,
                source: article.source.name,
                publishedAt: article.publishedAt,
            })),
            flag: {
                url: flagUrl,
                country: countryInfo.name.common,
            },
        };

        res.json(response);

        
    } catch (error) {
        console.error('Error fetching weather or news data:', error.message);
        res.status(500).json({ error: 'Failed to fetch weather or news data' });
    }
});

  
  app.get('/crud', (req,res) =>{
    res.render("crud")
  })

  app.post('/crud', async (req, res) => {
    try {
      const blog = new Blog(req.body);
      await blog.save();
      res.status(201).json(blog);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  
  app.get('/crud', async (req, res) => {
    const blogs = await Blog.find();
    res.json(blogs);
  });
  
  app.get('/crud/:id', async (req, res) => {
    try {
      const blog = await Blog.findById(req.params.id);
      if (!blog) return res.status(404).json({ error: 'Blog not found' });
      res.json(blog);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  
  app.put('/crud/:id', async (req, res) => {
    try {
      const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!blog) return res.status(404).json({ error: 'Blog not found' });
      res.json(blog);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  app.delete('/crud/:id', async (req, res) => {
    try {
      const blog = await Blog.findByIdAndDelete(req.params.id);
      if (!blog) return res.status(404).json({ error: 'Blog not found' });
      res.json({ message: 'Blog deleted' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });


app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`)
});