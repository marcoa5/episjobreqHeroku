var express = require('express');
var app = express();
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'episerjob@gmail.com',
      pass: 'Epiroc2020' 
    }
  });


function createMailOptions(to1){
    const mailOptions = {
        from: 'Epiroc Service <episerjob@gmail.com>',
        to: to1,
        subject: 'Invoices due',
        text: 'Dudes, we really need your money.'
      };
      return mailOptions
}
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/user', function(req, res,next) {
    if(req.query.to1!=undefined){
        transporter.sendMail(createMailOptions(req.query.to1), (error, info)=>{
            if (error) {
            console.log(error);
            } else {
                res.status(200).send('Mail Sent');
            }
        });
    } else {
        res.send('Mail not sent')
    }
});

app.get('*', function(req, res,next) {
    res.status(404).json({stato: 'Nok'});
    res.end();
});

app.listen(process.env.PORT || 2000, ()=>{
    console.log('RUNNING')
});