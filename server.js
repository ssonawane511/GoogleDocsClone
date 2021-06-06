/** @format */

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Document = require("./models/document");
const path = require("path");
mongoose
  .connect(process.env.MONGO_URI, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const app = express();

const http = require("http").createServer(app);

const PORT = process.env.PORT || 3001;

const io = require("socket.io")(http, {
  cors: {
    origin: "/",
    methods: ["GET", "POST"],
  },
});

if (process.env.NODE_ENV === "production") {
  // Set static folder
  app.use(express.static("client/build"));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}

http.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});

const defaultValue = "";

io.on("connection", (socket) => {
  socket.on("get-document", async (documentID) => {
    const document = await getDocument(documentID);
    socket.join(documentID);
    socket.emit("load-document", document.data);

    socket.on("send-changes", (delta) => {
      socket.broadcast.to(documentID).emit("receive-changes", delta);
    });

    socket.on("save-document", async (data) => {
      await Document.findByIdAndUpdate(documentID, { data });
    });
  });

  console.log("user connected ", socket.id);
});

async function getDocument(id) {
  if (id == null) return;
  const document = await Document.findById(id);
  if (document) return document;
  return await Document.create({ _id: id, data: defaultValue });
}
