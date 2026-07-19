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

const verifyToken =
async(
req:AuthRequest,
res:express.Response,
next:express.NextFunction
)=>{


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



req.user = decoded;


next();



}
catch(error){

return res.status(401).json({
message:"Invalid token"
});


}


}
//product schema

const productSchema = new mongoose.Schema(
{
 title:{
  type:String,
  required:true
 },

 shortDescription:{
  type:String,
  required:true
 },

 description:{
  type:String,
  required:true
 },

 price:{
  type:Number,
  required:true
 },

 image:{
  type:String,
  default:""
 },

 seller:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"User",
  required:true
 },
  createdAt: {
      type: Date,
      default: Date.now,
    },

},
{
 timestamps:true
}

);


const Product = mongoose.model(
"Product",
productSchema
);

app.post("/api/products",verifyToken, async (req: AuthRequest, res) => {

  try {

    const {
      title,
      shortDescription,
      description,
      price,
      image
    } = req.body;

    const product = await Product.create({
      title,
      shortDescription,
      description,
      price,
      image,
      seller: req.user?.id,
    });

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      product,
    });

  } catch (error) {
 console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to add product",
      error,
    });

  }

});

app.get("/api/products", async (req, res) => {

  const products = await Product.find().sort({
    createdAt: -1,
  });

  res.json(products);

});

app.get("/api/products/:id", async (req, res) => {
  try {

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json(product);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Failed to load product",
    });

  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      shortDescription,
      description,
      price,
      image,
    } = req.body;

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        title,
        shortDescription,
        description,
        price,
        image,
      },
      {
        new: true,
      }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to update product",
    });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to delete product",
    });
  }
});


app.get(
"/api/products/manage",
verifyToken,
async(req:AuthRequest,res)=>{


const products =
await Product.find({
seller:req.user?.id
});



res.json(products);



});

app.delete(
"/api/products/:id",
verifyToken,
async(req:AuthRequest,res)=>{


await Product.findOneAndDelete({

_id:req.params.id,

seller:req.user?.id

});


res.json({

message:"Deleted"

});


});

app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalSellers = await User.countDocuments({
      role: "seller",
    });

    const totalCustomers = await User.countDocuments({
      role: "customer",
    });

    res.json({
      totalUsers,
      totalSellers,
      totalCustomers,
      totalProducts: 0,
      activeOrders: 0,
      revenue: 0,
    });
  } catch {
    res.status(500).json({
      message: "Failed",
    });
  }
});


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