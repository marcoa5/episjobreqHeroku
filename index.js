var express = require('express');
var app = express();
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
var admin = require("firebase-admin");
var serviceAccount = require('./key.json')
const port = 3000;
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://epi-serv-job-default-rtdb.firebaseio.com"
});


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'episerjob@gmail.com',
      pass: 'Epiroc2020' 
    }
  });


function createMailOptions(to1, subject, son1,son2,son3,urlPdf, fileN, userN,userC,userM){
    const mailOptions = {
        from: 'Epiroc Service <episerjob@gmail.com>',
        replyTo: 'marco.fumagalli@epiroc.com',
        to: to1,
        cc: userM,
        subject: subject,
        text: "In allegato scheda lavoro relativa all'intervento effettuato dal nostro tecnico Sig. " + userN + " " + userC + ".\nVi ringraziamo qualora abbiate aderito al nostro sondaggio."  + "\n\n\nRisultato sondaggio:\n\nOrganizzazione intervento: " + son1 + "\nConsegna Ricambi: " + son2 + "\nEsecuzione Intervento: " + son3,
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
        to: "marco.arato@epiroc.com", //"marco.fumagalli@epiroc.com"
        cc: "", //"mario.parravicini@epiroc.com; carlo.colombo@epiroc.com; marco.arato@epiroc.com",
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

function createMailOptionsIntProd(subject, son1,son2,son3,rap,rAss,urlPdf,urlMa, fileN){
    const mailOptions = {
        from: 'Epiroc Service <episerjob@gmail.com>',
        to: "marco.fumagalli@epiroc.com",
        cc: "mario.parravicini@epiroc.com; carlo.colombo@epiroc.com; marco.arato@epiroc.com",
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

app.get('/getusers', function(req,res){
    admin.auth().listUsers(1000).then((a)=>{
        res.send(a.users)
    })
})

app.get('/getuserinfo', function(req,res){
    var id = req.query.id
    admin.database().ref('Users/'+ id).once('value', a=>{
        res.send(a.val())
    })
})

app.post('/createuser', function(req,res){
    var Mail = req.query.Mail
    var Nome = req.query.Nome
    var Cognome = req.query.Cognome
    var Pos=req.query.Pos

    admin.auth().createUser({
        email: Mail,
        emailVerified: false,
        password: 'Epiroc2021',
        disabled: false,
    })
    .then((userRecord) => {
        admin.database().ref('Users/' + userRecord.uid).set({
            Nome: Nome,
            Cognome: Cognome,
            Pos: Pos
        })
        .then(()=>{
           res.send('ok') 
        })
        .catch((error) => {
            console.log('Error creating new user:', error);
        })
    })
    .catch((error) => {
        console.log('Error creating new user:', error);
    });
})

app.post('/delete',function(req,res){
    var id = req.query.id
    admin.auth().deleteUser(id)
    .then(()=>{
        res.status(200).send('ok')
    })
    .catch(err=>{
        console.log(err)
    })
})


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/mail', function(req, res,next) {
    if(req.query.to1!=undefined){
        transporter.sendMail(createMailOptions(req.query.to1, req.query.subject, req.query.son1, req.query.son2,req.query.son3, req.query.urlPdf, req.query.fileN, req.query.userN, req.query.userC, req.query.userM), (error, info)=>{
            if (error) {
            console.log(error);
            } else {
                transporter.sendMail(createMailOptionsIntProd(req.query.subject, req.query.son1, req.query.son2,req.query.son3,req.query.rap, req.query.rAss, req.query.urlPdf, req.query.urlMa, req.query.fileN), (error, info)=>{
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

app.get('/maildebug', function(req, res,next) {
    if(req.query.to1!=undefined){
        transporter.sendMail(createMailOptions(req.query.to1, req.query.subject, req.query.son1, req.query.son2,req.query.son3, req.query.urlPdf, req.query.fileN, req.query.userN, req.query.userC, req.query.userM), (error, info)=>{
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

app.get('/users', function(req, res,next) {
    res.send('Ok')
});

app.get('*', function(req, res,next) {
    res.status(404).send('Pagina non trovata');
    res.end();
});

app.listen(port, ()=>{
    console.log(`Running on port:${port}`)
});