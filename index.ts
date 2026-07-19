const dns = require("node:dns")
console.log("THIS IS FRESH BASKET SERVER");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

//mongodb connection
mongoose
.connect(process.env.MONGODB_URI as string)
.then(()=>{
  console.log("MongoDB Connected");
})
.catch((error)=>{
  console.log("MongoDB Error:", error);
});

//auth request
interface AuthRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

app.use(
 cors({
   origin:[
     "http://localhost:3000"
   ],
   credentials:true
 })
);

app.use(express.json());
app.use(cookieParser());

//user schema
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["customer", "seller", "admin"],
      default: "customer",
    },
  },
  {
    timestamps: true,
  }
);


const User = mongoose.model(
  "User",
  userSchema
);


app.get("/", (req, res)=>{
    res.send("Fresh Basket Server Running");
});

//register route
app.post("/api/auth/register", async (req, res)=>{

  try {

    const {
      name,
      email,
      password,
      role
    } = req.body;


    const existingUser = await User.findOne({
      email
    });


    if(existingUser){
      return res.status(400).json({
        message:"User already exists"
      });
    }


    const hashedPassword = await bcrypt.hash(
      password,
      10
    );


    const user = await User.create({

      name,

      email,

      password: hashedPassword,

      role:
      role === "seller"
      ? "seller"
      : "customer"

    });

const token = jwt.sign(
  {
    id: user._id,
    email: user.email,
    role: user.role,
  },
  process.env.JWT_SECRET as string,
  {
    expiresIn:"7d",
  }
);


res.cookie("token", token, {
  httpOnly:true,
  secure:false,
  sameSite:"lax",
  maxAge:7 * 24 * 60 * 60 * 1000,
});

    res.status(201).json({

      message:"Registration successful",

      user:{
        id:user._id,
        name:user.name,
        email:user.email,
        role:user.role
      }

    });


  } catch(error){

    console.log(error);

    res.status(500).json({
      message:"Registration failed"
    });

  }

});

app.post("/api/auth/login", async(req,res)=>{


try{


const {
 email,
 password
}=req.body;



const user =
await User.findOne({email});

if(!user){

return res.status(404).json({

message:"User not found"

});

}

const isMatch =
await bcrypt.compare(
password,
user.password
);

if(!isMatch){

return res.status(400).json({

message:"Invalid password"

});

}

const token =
jwt.sign(

{
id:user._id,
email:user.email,
role:user.role
},

process.env.JWT_SECRET as string,

{
expiresIn:"7d"
}

);

res.cookie(
"token",
token,
{

httpOnly:true,

secure:false,

sameSite:"lax",

maxAge:
7*24*60*60*1000

}

);

res.json({

success:true,

message:"Login successful",

user:{
id:user._id,
name:user.name,
email:user.email,
role:user.role
}

});

}

catch(error){

console.log(error);
res.status(500).json({

message:"Login failed"

});


}

});

app.get(
"/api/auth/me",
async(req,res)=>{


try{


const token =
req.cookies.token;



if(!token){

return res.status(401).json({

message:"Unauthorized"

});

}



const decoded:any =
jwt.verify(
token,
process.env.JWT_SECRET as string
);



const user =
await User.findById(decoded.id)
.select("-password");



res.json({

user

});



}

catch(error){


res.status(401).json({

message:"Invalid token"

});


}


});

app.post(
"/api/auth/logout",
(req,res)=>{


res.clearCookie(
"token"
);


res.json({

message:"Logout successful"

});


});


app.listen(PORT, ()=>{
    console.log(`Server running on port ${PORT}`);
});