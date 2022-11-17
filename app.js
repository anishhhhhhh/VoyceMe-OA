const express = require('express');
const mongoose = require("mongoose");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
app.use(express.json());
mongoose.connect("mongodb+srv://anish:anish@cluster0.fp7uqaz.mongodb.net/?retryWrites=true&w=majority").then(()=>{
    console.log("connect to database!");
})

const schema = mongoose.Schema({
    name:{type: String},
    coins:{type: Number}
})

const model = mongoose.model('Money', schema);

const swaggerOptions = {
    swaggerDefinition:{
        info: {
            title: "Transaction API",
            description: "API for transaction",
            contact: {
                name: "Anish Ashtaputre"
            },
            servers: ["http://localhost:3000"]
        }
    },
    apis: ["app.js"]
}

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

//Routes
app.get('/',(req,res) => {
    res.send('we are home');
})

/**
 * @swagger
 * /create:
 *  post:
 *    summary: To setup users with initial coin balance 100
 *    parameters:
 *     - in: body
 *       name: user
 *       description: checks balance of given user
 *       schema:
 *        type: object
 *        required:
 *          - name
 *        properties:
 *          name:
 *            type: string 
 *    responses:
 *      '201':
 *        description: User created successfully
 *      '400':
 *        description: Client Error
 *      '500':
 *        description: Server Error
 */
//create user
app.post('/create',(req,res) => {
    //check if name is provided in JSON body
    if(req.body.name){
        //check if name type is string
        if(typeof (req.body.name) != "string"){
            res.status(400).json({
                message: "name must be a string"
            })
        }else{
            model.countDocuments({name: req.body.name}, (err, count) => {
                //check if user already exists
                if(count > 0){
                    res.status(400).json({
                        message: "user already exists"
                    })
                }else{
                    const data = new model({
                        name: req.body.name,
                        coins: 100,
                    })
                    data.save()
                    .then(() => {
                        res.status(201).json({
                            message: "User Created succesfully",
                        })
                    })
                    .catch((err) => {
                        res.status(500).json({
                            message: err.message
                        })
                    })
                }
            })
        }
    }else{
        res.status(400).json({
            message: "name is required"
        })
    }
})

/**
 * @swagger
 * /send:
 *  patch:
 *    summary: To setup users with initial coin balance 100
 *    parameters:
 *     - in: body
 *       name: user
 *       description: Create a new user with coins 100
 *       schema:
 *        type: object
 *        required:
 *          - sender
 *          - receiver
 *          - amount
 *        properties:
 *          sender:
 *            type: string
 *          receiver:
 *            type: string
 *          amount:
 *            type: number 
 *    responses:
 *      '200':
 *        description: Transaction successful
 *      '400':
 *        description: Client Error
 */
//transfer coins
app.patch('/send', async(req,res) => {
    if(req.body.sender && req.body.receiver && req.body.amount){
        if(typeof (req.body.sender) != "string" || typeof (req.body.receiver) != "string" || typeof (req.body.amount) != "number"){
            res.status(400).json({
                message: "sender, receiver must be a string and amount must be a number"
            })
        }else if(req.body.sender == req.body.receiver){
            res.status(400).json({
                message: "sender and receiver cannot be same"
            })
        }else if(req.body.amount < 0){
            res.status(400).json({
                message: "amount cannot be negative"
            })
        }else{
            let sender = req.body.sender
            let receiver = req.body.receiver
            let amountTransfered = req.body.amount

            model.find({name: sender}, (err, user) => {
                if(user.length == 0){
                    res.status(400).json({
                        message: "Sender does not exist",
                    })
                }else if(user[0].coins < amountTransfered){
                    res.status(400).json({
                        message: "Sender does not have enough coins",
                    }) 
                }
            })

            model.find({name: receiver}, (err, user) =>{
                if(user.length == 0){
                    res.status(400).json({
                        message: "Receiver does not exist",
                    })
                }
            })

            let getSenderID = model.findOne({name: sender})
            getSenderID.then(function(result){
                let senderID = result._id;
                let senderCurrentAmount = result.coins;

                model.findByIdAndUpdate(senderID, {"coins": senderCurrentAmount - amountTransfered}, function(err, result) {
                    if(err){
                        res.send(err)
                    }else{
                        let getReciverID = model.findOne({name: receiver})
                        getReciverID.then(function(result){
                            let reciverID = result._id;
                            let receiverCurrentAmount = result.coins;
                            model.findByIdAndUpdate(reciverID, {"coins": receiverCurrentAmount + amountTransfered}, function(err, result) {
                                if(err){
                                    res.send(err)
                                }else{
                                    res.send("Transaction Completed Successfully")
                                }
                            })
                        })
                    }
                })
            })
        }
    }else{
        res.status(400).json({
            message: "sender, receiver and amount are required"
        })
    }
})

/**
 * @swagger
 * /getUser/{name}:
 *  get:
 *    summary : To get user details
 *    parameters:
 *    - in: path
 *      name: name
 *      schema:
 *        type: string
 *      required: true
 *    responses:
 *      '400':
 *        description: Client Error
 *      '404':
 *        description: User does not exist
 *      '500':
 *        description: Server Error
 */

//check balance
app.get("/getUser/:name", async(req, res)=>{
    if(typeof (req.params.name) != "string"){
        res.status(400).json({
            message: "name must be a string"
        })
    }else if(req.params.name == ""){
        res.status(400).json({
            message: "name is required"
        })
    }else{
        let userName = req.params.name;

        model.find({name: userName}, (err, user) =>{
            if(user.length == 0){
                res.status(404).json({
                    message: "User does not exist",
                })
            }else{
                res.send("Current Amount is " + user[0].coins)
            }
        })
    }
})

//ROUTES
app.listen(3000);