import express from "express";

const router = express.Router();


router.post(
"/generate-description",
async(req,res)=>{

try{

const {
title,
category,
shortDescription,
length
}=req.body;


if(!title){

return res.status(400).json({
message:"Title required"
});

}


// temporary AI response
const description = `
${title} is a premium quality ${category} product.

${shortDescription}

This product is fresh, reliable and perfect for customers.
Enjoy excellent quality and great value with FreshBasket.
`;


res.json({

description

});


}catch(error){

console.log(error);

res.status(500).json({
message:"AI generation failed"
});

}


});


export default router;