require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const { URL } = require("url");
const dns = require("dns");
const shortId = require("shortid");
//const validurl = require("valid-url");
const morgan = require("morgan");

// Connect to database
const uri = process.env.MONGO_URI;
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
});

const connection = mongoose.connection;
connection.on("error", console.error.bind(console, "connection error: "));
connection.once("open", () => {
  console.log("successful connection");
});

// create url schema
const Schema = mongoose.Schema;
const urlSchema = new Schema({
  original_url: String,
  short_url: String,
});

const URL_STR = mongoose.model("URL_STR", urlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan("tiny"));

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.post("/api/shorturl", (req, res) => {
  const url = req.body.url;
  console.log(req.body);
  const urlCode = shortId.generate();

  let newURL;
  try {
    newURL = new URL(url);
  } catch (error) {
    return res.json({
      error: "invalid URL",
    });
  }

  if (newURL.protocol != "https:") {
    return res.json({ error: "invalid URL" });
  }

  dns.lookup(newURL.hostname, async (err, address) => {
    console.log(address);
    if (err) {
      res.status(401).json({
        error: "invalid url",
      });
    } else {
      const findUrl = await URL_STR.findOne({
        original_url: url,
      });

      if (findUrl) {
        res.json({
          original_url: findUrl.original_url,
          short_url: findUrl.short_url,
        });
      } else {
        const newEntry = new URL_STR({
          original_url: url,
          short_url: urlCode,
        });

        const entry = await newEntry.save();
        console.log(entry);

        if (!entry) {
          res.status(500).json({ error: "data not saved" });
        } else {
          res.json({
            original_url: entry.original_url,
            short_url: entry.short_url,
          });
        }
      }
    }
  });
});

app.get("/api/shorturl/:short_url", (req, res) => {
  URL_STR.findOne({
    short_url: req.params.short_url,
  })
    .then((data) => {
      return res.redirect(data.original_url);
    })
    .catch((err) => {
      console.log(err);
    });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
