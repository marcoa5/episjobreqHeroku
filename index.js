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


function createMailOptions(to1, subject, son1,son2,son3,urlPdf, fileN){
    const mailOptions = {
        from: 'Epiroc Service <episerjob@gmail.com>',
        to: to1,
        subject: subject,
        text: "In allegato scheda lavoro relativa all'intervento da noi effettuato.\nVi ringraziamo qualora abbiate aderito al nostro sondaggio."  + "\n\n\nRisultato sondaggio:\n\nOrganizzazione intervento: " + son1 + "\nConsegna Ricambi: " + son2 + "\nEsecuzione Intervento: " + son3,
        attachments: {
            filename: fileN + '.pdf',
            path: urlPdf
        }
      };
      return mailOptions
}

function createMailOptionsInt(subject, son1,son2,son3,rap,rAss,urlPdf,urlMa, fileN){
    const mailOptions = {
        from: 'Epiroc Service <episerjob@gmail.com>',
        to: "marco.arato@epiroc.com",
        subject: subject,
        text: "Risultato sondaggio:\n\nOrganizzazione intervento: " + son1 + "\nConsegna Ricambi: " + son2 + "\nEsecuzione Intervento: " + son3 + rap + '\n\n\nRisk Assessment \n' + rAss,
        attachments: [
            {
                filename: fileN + '.pdf',
                path: urlPdf
            },
            {
                filename: fileN + '.ma',
                path: urlMa
            }
        ]
        
      };
      return mailOptions
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/mail', function(req, res,next) {
    if(req.query.to1!=undefined){
        transporter.sendMail(createMailOptions(req.query.to1, req.query.subject, req.query.son1, req.query.son2,req.query.son3, req.query.urlPdf, req.query.fileN), (error, info)=>{
            if (error) {
            console.log(error);
            } else {
                transporter.sendMail(createMailOptionsInt(req.query.subject, req.query.son1, req.query.son2,req.query.son3,req.query.rap, req.query.rAss, req.query.urlPdf, req.query.urlMa, req.query.fileN), (error, info)=>{
                    if (error) {
                    console.log(error);
                    } else {
                        res.status(200).send(req.query.to1);
                    }
                })
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