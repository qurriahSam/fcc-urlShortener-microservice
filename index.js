require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const shortId = require("shortid");
const validurl = require("valid-url");

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
app.use(express.json());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.post("/api/shorturl", async (req, res) => {
  const url = req.body.url_input;
  const urlCode = shortId.generate();

  if (!validurl.isWebUri(url)) {
    res.status(401).json({
      error: "invalid URL",
    });
  } else {
    const findUrl = URL_STR.findOne({
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

      newEntry.save((err, result) => {
        if (err) {
          res.status(500).json({ error: err });
        } else {
          res.json(result);
        }
      });
    }
  }
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
