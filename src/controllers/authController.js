/** @format */

const UserModel = require("../models/userModel");
const bcrypt = require("bcrypt");
const asyncHandle = require("express-async-handler");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587, // Mật khẩu cố định của gmail
  auth: {
    user: process.env.USERNAME_EMAIL,
    pass: process.env.PASSWORD_EMAIL,
  },
});

/**
 *
 * @param {*} email
 * @param {*} id
 * @returns Mục đích chính của hàm này là tạo ra một JWT, một phương tiện an toàn và tiện lợi để truyền thông tin xác thực giữa máy chủ và khách hàng trong các ứng dụng web và di động. JWT thường được sử dụng trong các hệ thống xác thực và ủy quyền, cho phép người dùng truy cập vào các tài nguyên được bảo vệ mà không cần phải gửi lại thông tin xác thực (như mật khẩu) với mỗi yêu cầu.
 */
const getJsonWebToken = async (email, id) => {
  const payload = {
    email,
    id,
  };
  const token = jwt.sign(payload, process.env.SECRET_KEY, {
    expiresIn: "7d",
  });

  return token;
};

const handleSendMail = async (val) => {
  try {
    await transporter.sendMail(val);

    return "OK";
  } catch (error) {
    return error;
  }
};

const verification = asyncHandle(async (req, res) => {
  const { email } = req.body;

  const verificationCode = Math.round(1000 + Math.random() * 9000);

  try {
    const data = {
      from: `"Support EventHub Application" <${process.env.USERNAME_EMAIL}>`,
      to: email,
      subject: "Verification Email Code",
      text:
        "Your code for email verification is: " +
        verificationCode +
        ". Use this code to complete your email verification process.",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <header style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #333;">EventHub</h1>
            </header>
            <section style="margin-bottom: 20px;">
              <h1 style="color: #333;">Verification Code</h1>
              <p style="color: #555;">Hello,</p>
              <p style="color: #555;">Your code for email verification is:</p>
              <div style="text-align: center; margin: 20px 0;">
                <span style="background-color: #007bff; color: white; padding: 10px 20px; font-size: 24px; border-radius: 5px;">${verificationCode}</span>
              </div>
              <p style="color: #555;">Use this code to complete your email verification process. If you did not request this, please ignore this email.</p>
            </section>
            <footer style="text-align: center; color: #999; margin-top: 20px;">
              <p>&copy; EventHub 2024</p>
            </footer>
          </div>
        </div>
      `,
    };

    await handleSendMail(data);

    res.status(200).json({
      message: "Send verification code successfully!!!",
      data: {
        code: verificationCode,
      },
    });
  } catch (error) {
    res.status(401);
    throw new Error("Can not send email");
  }
});

const register = asyncHandle(async (req, res) => {
  const { email, fullname, password } = req.body;
  const existingUser = await UserModel.findOne({ email });

  if (existingUser) {
    res.status(400);
    throw new Error("User has already exist!!!");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = new UserModel({
    email,
    fullname: fullname ?? "",
    password: hashedPassword,
  });

  await newUser.save();

  res.status(200).json({
    message: "Register new user successfully",
    data: {
      email: newUser.email,
      id: newUser._id,
      accesstoken: await getJsonWebToken(email, newUser.id),
    },
  });
});

const login = asyncHandle(async (req, res) => {
  const { email, password } = req.body;
  console.log(req.body);
  const existingUser = await UserModel.findOne({ email });

  if (!existingUser) {
    res.status(403);
    throw new Error("User not found!!!");
  }

  const isMatchPassword = await bcrypt.compare(password, existingUser.password);

  if (!isMatchPassword) {
    res.status(401);
    throw new Error("Email or Password is not correct!");
  }

  res.status(200).json({
    message: "Login successfully",
    data: {
      id: existingUser.id,
      email: existingUser.email,
      accesstoken: await getJsonWebToken(email, existingUser.id),
      fcmTokens: existingUser.fcmTokens ?? [],
      photo: existingUser.photoUrl ?? "",
      name: existingUser.name ?? "",
    },
  });
});

const forgotPassword = asyncHandle(async (req, res) => {
  const { email } = req.body;

  const randomPassword = Math.round(100000 + Math.random() * 99000);

  const data = {
    from: `"New Password" <${process.env.USERNAME_EMAIL}>`,
    to: email,
    subject: "Verification Email Code",
    text: `Your code for email verification is: ${randomPassword}. If you did not request this, please ignore this email or contact support.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h1>Email Verification Code</h1>
        <p>Your code for email verification is: <strong>${randomPassword}</strong>.</p>
        <p>If you did not request this, please ignore this email or contact support.</p>
        <hr>
        <p>If you're having trouble with the code, please contact our support team.</p>
      </div>
    `,
  };

  const user = await UserModel.findOne({ email });
  if (user) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(`${randomPassword}`, salt);

    await UserModel.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      isChangePassword: true,
      
    })
      .then(() => {
        console.log("Done");
      })
      .catch((error) => console.log(error));

    await handleSendMail(data)
      .then(() => {
        res.status(200).json({
          message: "Send email new password successfully!!!",
          data: [],
        });
      })
      .catch((error) => {
        res.status(401);
        throw new Error("Can not send email");
      });
  } else {
    res.status(401);
    throw new Error("User not found!!!");
  }
});

const handleLoginWithGoogle = asyncHandle(async (req, res) => {
  const userInfo = req.body;

  const existingUser = await UserModel.findOne({ email: userInfo.email });
  let user;
  if (existingUser) {
    await UserModel.findByIdAndUpdate(existingUser.id, {
      updatedAt: Date.now(),
    });
    user = { ...existingUser };
    user.accesstoken = await getJsonWebToken(userInfo.email, userInfo.id);

    if (user) {
      const data = {
        accesstoken: user.accesstoken,
        id: existingUser._id,
        email: existingUser.email,
        fcmTokens: existingUser.fcmTokens,
        photo: existingUser.photoUrl,
        name: existingUser.name,
      };

      res.status(200).json({
        message: "Login with google successfully!!!",
        data,
      });
    } else {
      res.sendStatus(401);
      throw new Error("fafsf");
    }
  } else {
    const newUser = new UserModel({
      email: userInfo.email,
      fullname: userInfo.name,
      ...userInfo,
    });
    await newUser.save();
    user = { ...newUser };
    user.accesstoken = await getJsonWebToken(userInfo.email, newUser.id);

    if (user) {
      res.status(200).json({
        message: "Login with google successfully!!!",
        data: {
          accesstoken: user.accesstoken,
          id: user._id,
          email: user.email,
          fcmTokens: user.fcmTokens,
          photo: user.photoUrl,
          name: user.name,
        },
      });
    } else {
      res.sendStatus(401);
      throw new Error("fafsf");
    }
  }
});

module.exports = {
  register,
  login,
  verification,
  forgotPassword,
  handleLoginWithGoogle,
};
