const express = require("express");
const cors = require("cors");
const authRouter = require("./src/routes/authRouter");
const connectDB = require("./src/configs/connectDb");
const errorMiddleHandle = require("./src/middlewares/errorMiddleware");
const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3001;

app.use("/auth", authRouter);

connectDB();

app.use(errorMiddleHandle);

app.listen(PORT, (err) => {
  if (err) {
    console.log("Error in running server");
    return;
  }
  console.log(`Server is running on http://localhost:${PORT}`);
});
