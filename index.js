const express = require("express");
const cors = require("cors");
const authRouter = require("./src/routers/authRouter");
const userRouter = require("./src/routers/userRouter");
const verifyToken = require("./src/middlewares/verifyMiddleware");
const eventRouter = require("./src/routers/eventRouter");
const connectDB = require("./src/configs/connectDb");
const errorMiddleHandle = require("./src/middlewares/errorMiddleware");
const app = express();

require("dotenv").config();

app.use(cors());
app.use(express.json());

const PORT = 3001;

app.use("/auth", authRouter);
app.use("/users", verifyToken, userRouter);
app.use("/events", eventRouter);

connectDB();

app.use(errorMiddleHandle);

app.listen(PORT, (err) => {
  if (err) {
    console.log("Error in running server");
    return;
  }
  console.log(`Server is running on http://localhost:${PORT}`);
});
