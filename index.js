var express = require('express');
var app = express();
var cors = require('cors')
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
var admin = require("firebase-admin");
var serviceAccount = require('./key.json')
const porta = process.env.PORT || 3001
const axios = require('axios')
var moment = require('moment');
const { auth } = require('firebase-admin');
const functions = require("firebase-functions");
const Handlebars = require("handlebars");
const { escapeExpression } = require('handlebars');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://epi-serv-job-default-rtdb.firebaseio.com"
});

app.set('view engine', 'pug');

app.use(bodyParser.urlencoded({limit: '100kb',extended: false}))
app.use(bodyParser.json())
app.use(cors())

app.get('/getusers', function(req,res){
    admin.auth().listUsers(1000).then((a)=>{
        res.send(a.users)
    })
})

app.get('/getuserinfo', function(req,res){
    var id = req.query.id
    admin.database().ref('Users/'+ id).once('value', a=>{
        res.status(200).send(a.val())
    })
})

app.get('/createuser', function(req,res){
    var Mail = req.query.Mail
    var Nome = req.query.Nome
    var Cognome = req.query.Cognome
    var Pos=req.query.Pos
    var km = req.query.km
	var userVisit = req.query.userVisit
    admin.auth().createUser({
        email: Mail,
        emailVerified: false,
        password: 'Epiroc2021',
        disabled: false,
    })
    .then((userRecord) => {
        var Area = undefined
        let id = userRecord.uid
        if(req.query.Area!=undefined) Area = req.query.Area
        admin.database().ref('Users').child(id).child('Cognome').set(Cognome)
        admin.database().ref('Users').child(id).child('Nome').set(Nome)
        admin.database().ref('Users').child(id).child('Pos').set(Pos)
        admin.database().ref('Users').child(id).child('userVisit').set(userVisit)
        admin.database().ref('Users').child(id).child('Area').set(Area)
        .then(()=>res.status(200).send('ok'))
        .catch((error) => {
            res.status(300).send('Errore: ' + error)
        })
    })
    .catch((error) => {
        res.status(300).send('Errore: ' + error)

    });
})

app.all('/updateuser', function(req,res){
    var Nome = req.query.Nome
    var Cognome = req.query.Cognome
    var Pos=req.query.Pos
    var id = req.query.id
	var userVisit = req.query.userVisit
    var Area = undefined
    if(req.query.Area!=undefined) Area = req.query.Area
    admin.database().ref('Users').child(id).child('Cognome').set(Cognome)
    admin.database().ref('Users').child(id).child('Nome').set(Nome)
    admin.database().ref('Users').child(id).child('Pos').set(Pos)
    admin.database().ref('Users').child(id).child('userVisit').set(userVisit)
    admin.database().ref('Users').child(id).child('Area').set(Area)
    .then(()=>res.status(200).send('ok'))
})

app.get('/delete',function(req,res){
    var id = req.query.id
    admin.auth().deleteUser(id)
    .then(()=>{
        admin.database().ref('Users/' + id).remove()
        .then(()=>{
            res.status(200).send('ok') 
         })
    })
    .catch(err=>{
        console.log(err)
    })
})


app.all('/mail', function(req, res,next) {
    var arg = req.query
    if(arg.to1!=undefined){
        transporter.sendMail(createMailOptions(arg), (error, info)=>{
            if (error) {
            console.log(error);
            } else {
                transporter.sendMail(createMailOptionsIntProd(arg), (error, info)=>{
                    if (error) {
                    console.log(error);
                    } else {
                        res.status(200).send(arg.to1);
                    }
                })
            }
        });
    } else {
        res.send('Mail not sent')
    }
});

app.all('/mailmod', async function(req, res,next) {
    var arg = req.query
    let refPdf = admin.storage().ref().child(`${arg.userN} ${arg.userC}/${arg.fileN}.pdf`)
    await refPdf.put(arg.urlPdf)
    .then(()=>{
        refPdf.getDownloadURL().then(url=>{
            if(url) req.urlPdf = url
            let refMa = admin.storage().ref().child(`${arg.userN} ${arg.userC}/${arg.fileN}.ma`)
            refMa.put(arg.urlMa)
            .then(()=>{
                refMa.getDownloadURL().then(url=>{
                    if(url) req.urlMa = url
                })
            })
        })
    })
    setTimeout(() => {
        if(arg.to1!=undefined){
            transporter.sendMail(createMailOptions(arg), (error, info)=>{
                if (error) {
                console.log(error);
                } else {
                    transporter.sendMail(createMailOptionsIntProd(arg), (error, info)=>{
                        if (error) {
                        console.log(error);
                        } else {
                            res.status(200).send(arg.to1);
                        }
                    })
                }
            });
        } else {
            res.send('Mail not sent')
        }
    }, 1000);
    
})

app.all('/maildebug', async function(req, res,next) {
    var arg = req.query
    if(arg.to1!=undefined){
        transporter.sendMail(createMailOptions(arg), (error, info)=>{
            if (error) {
            console.log(error);
            } else {
                transporter.sendMail(createMailOptionsInt(arg), (error, info)=>{
                    if (error) {
                    console.log(error);
                    } else {
                        res.status(200).send(arg.to1);
                    }
                })
            }
        });
    } else {
        res.send('Mail not sent')
    }
});

app.get('/certiq', function(req,res){
    console.log(req.query)
    let count = 0
    let code=''
    let machines=[]
    let lung=0
    let itemNr=[]
    let yesterday = req.query.day
    axios({
        method:'get',
        url: 'https://api.epiroc.com/certiq/v2/authentication/login?username=marco.arato@epiroc.com&password=Epiroc2019',
        headers: {
            'Ocp-Apim-Subscription-Key':'3b705806444d47f3b2308cf6c138ac74'
        }
    })
    .then(data=>{
        code=data.data.userCode
        console.log(code)
        axios({
            method:'get',
            url: 'https://api.epiroc.com/certiq/v2/machines',
            headers: {
                'Ocp-Apim-Subscription-Key':'3b705806444d47f3b2308cf6c138ac74',
                'X-Auth-Token':code
            }
        })
        .then(info=>{
            machines= info.data.data
            lung = machines.length
            machines.forEach(sr=>{
                delete sr.machineId
                delete sr.machineCustomerCenter
                delete sr.machineType
                delete sr.rigConfigVersion
                delete sr.rigSoftwareVersion
                let t6 = sr.machineName
                let t7 = t6.split(/ - /g)
                sr.machineSerialNr = t7[1]
                delete sr.machineName
                let s1 = sr.machineSite.replace(/.\(.+/,'')
                sr.machineSite=s1
                axios({
                    method:'get',
                    url: 'https://api.epiroc.com/certiq/v2/machines/'+ sr.machineItemNumber +'/kpis/' + yesterday,
                    headers: {
                        'Ocp-Apim-Subscription-Key':'3b705806444d47f3b2308cf6c138ac74',
                        'X-Auth-Token':code
                    }
                })
                .then(gg=>{
                    if(sr.machineSerialNr=='TMG19SED0497') console.log(gg)
                    sr.LastDayEngineHours = Math.round(gg.data.dailyUtilizationEngineHours)
                    axios({
                        method:'get',
                        url: 'https://api.epiroc.com/certiq/v2/machines/'+ sr.machineItemNumber +'/serviceStatus',
                        headers: {
                            'Ocp-Apim-Subscription-Key':'3b705806444d47f3b2308cf6c138ac74',
                            'X-Auth-Token':code
                        }
                    })
                    .then((service)=>{
                        let s = service.data
                        count++
                        //console.log(count)
                        s.forEach(sd=>{
                            if(sd.serviceStatus=='Upcoming' && sd.serviceType=='Engine'){
                               sr.serviceStep = sd.serviceAccumulator
                               sr.hoursLeftToService = sd.hoursLeftToService
                               sr.servicePredictedDate = sd.servicePredictedDate
                            }
                        })
                        if(count==machines.length){res.json(machines)}
                    })
                })
            })
            
        })
        .catch(e=>console.log(e))
    })
    .catch(e=>console.log(e))
})

app.all('/partreq', function(req,res){
    createMailParts(JSON.parse(req.query.info))
    .then(a=>{
        transporter.sendMail(a, (error, info)=>{
            if (error) res.status(300).send(error)
            if(info) res.status(200).send(info)
        })
    })
})

app.all('/', function(req, res,next) {
    const welc = `
    <div style="position: fixed; top:0;left:0;display:flex; justify-content: center; align-items: center; width:100%; height:100%; background-color: rgb(66, 85, 99)">
        <h1 style="font-family: Arial; text-align:center; width: 100%; color: rgb(255,205,0)">Welcome to Epiroc Service Job Web Services</h1>
    </div>
    `
    res.status(200).send(welc);
    res.end();
});

app.all('*', function(req, res,next) {
    const welc = `
    <div style="position: fixed; top:0;left:0;display:flex; justify-content: center; align-items: center; width:100%; height:100%; background-color: rgb(66, 85, 99)">
        <h1 style="font-family: Arial; text-align:center; width: 100%; color: rgb(255,205,0)">404 - Sorry, page not found</h1>
    </div>
    `
    res.status(404).send(welc);
    res.end();
});

app.listen(porta, ()=>{
    console.log(`Running on port:${porta}`)
});







//FUNCTIONS

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'episerjob@gmail.com',
      pass: 'xvesvmaufsunnzvr' 
    }
  });


function createMailOptions(a){
    /*let n = a.userN + ' ' + a.userC
    let chFEA=false
    admin.database().ref('Tech').child(n).once('value',k=>{
        if(k.val().s.substring(0,6)=='F.E.A.') chFEA=true
    })*/

    const mailOptions = {
        from: 'Epiroc Service <episerjob@gmail.com>',
        replyTo: 'marco.fumagalli@epiroc.com',
        to: a.to1,
        cc: a.userM,
        subject: a.subject,
        text: `In allegato scheda lavoro relativa all'intervento effettuato dal nostro tecnico Sig. ${a.userN} ${a.userC}.\nVi ringraziamo qualora abbiate aderito al nostro sondaggio.\n\n\nRisultato sondaggio:\n\nOrganizzazione intervento: ${a.son1}\nConsegna Ricambi: ${a.son2}\nEsecuzione Intervento: ${a.son3}`,
        //html:mailBody,
        attachments: {
            filename: a.fileN? a.fileN + '.pdf': '',
            path: a.urlPdf? a.urlPdf : ''
        }
      };
      return mailOptions
}

function createMailOptionsInt(a){
    const mailOptions = {
        from: `${a.userN} ${a.userC} - Epiroc Service <episerjob@gmail.com>`,
        to: "marco.arato@epiroc.com", //"marco.fumagalli@epiroc.com"
        cc: "", //"mario.parravicini@epiroc.com; carlo.colombo@epiroc.com; marco.arato@epiroc.com",
        subject: a.subject,
        text: `Risultato sondaggio:\n\nOrganizzazione intervento: ${a.son1}\nConsegna Ricambi: ${a.son2}\nEsecuzione Intervento: ${a.son3} ${a.rap}\n\n\nRisk Assessment \n ${a.rAss}`,
        attachments: [
            {
                filename: a.fileN + '.pdf',
                path: a.urlPdf
            },
            {
                filename: a.fileN + '.ma',
                path: a.urlMa
            }
        ]
      };
      return mailOptions
}

function createMailOptionsIntProd(a){
    const mailOptions = {
        from: `${a.userN} ${a.userC} - Epiroc Service <episerjob@gmail.com>`,
        to: "marco.fumagalli@epiroc.com",
        cc: "mario.parravicini@epiroc.com; carlo.colombo@epiroc.com; marco.arato@epiroc.com",
        subject: a.subject,
        text: `Risultato sondaggio:\n\nOrganizzazione intervento: ${a.son1}\nConsegna Ricambi: ${a.son2}\nEsecuzione Intervento: ${a.son3} ${a.rap}\n\n\nRisk Assessment \n ${a.rAss}`,
        attachments: [
            {
                filename: a.fileN + '.pdf',
                path: a.urlPdf
            },
            {
                filename: a.fileN + '.ma',
                path: a.urlMa
            }
        ]
      };
      return mailOptions
}

var source=`
<p>Prego elaborare offerta {{#if shipTo.name}}da inoltrare a {{shipTo.name}} {{#if shipTo.email}}({{shipTo.email}}){{/if}}{{/if}} per i ricambi sotto elencati (Cantiere: {{customer}} {{#if shipTo.address}} - {{shipTo.address}} {{/if}}) relativo alla macchina <strong>{{model}} (s/n: {{sn}})</strong> {{#if shipTo.cig}}- CIG: {{shipTo.cig}}{{/if}} {{#if shipTo.cup}} CUP: {{shipTo.cup}}{{/if}}<p>
<table style="border-collapse: collapse;">
<br>    
<tr>
        <th style="padding: 5px 20px;border: 1px solid black">Categorico</th>
        <th style="padding: 5px 20px;border: 1px solid black">Descrizione</th>
        <th style="padding: 5px 20px; text-align:center;border: 1px solid black">Q.tà</th>
    </tr>
    {{#Parts}}
    <tr>
        <td style="padding: 5px 20px;border: 1px solid black">{{pn}}</td>
        <td style="padding: 5px 20px;border: 1px solid black">{{desc}}</td>
        <td style="padding: 5px 20px; text-align:center;border: 1px solid black">{{qty}}</td>
    </tr>
{{/Parts}}</table>
`

var template=Handlebars.compile(source)



function createMailParts(a){
    return new Promise((res,rej)=>{
        var data = a
        admin.auth().getUser(a.origId).then(b=>{
            let cc =''
            admin.database().ref('Users').child(b.uid).child('Pos').once('value',g=>{
      
                if(g!=null && (g.val()=='tech' || g.val()=='sales')) cc=  '; ' + b.email
            })
            .then(()=>{
                var html=template(data)
                var mailOptions = {
                    from: `${a.author} - Epiroc Service <episerjob@gmail.com>`,
                    to: a.type=="CustomerSupport"?'nicola.megna@epiroc.com':'marco.fumagalli@epiroc.com',
                    cc: "mario.parravicini@epiroc.com; marco.arato@epiroc.com; giordano.perini@epiroc.com" + (a.type=='CustomerSupport'?'; marco.fumagalli@epiroc.com; cristiana.besana@epiroc.com':'') + cc,
                    subject: a.type + ': New Parts request to '+ a.customer + ' - ' + a.model + ' (s/n: ' + a.sn + ')',
                    html: html,
                };
                if(mailOptions!=undefined) res(mailOptions)    
            })
            
        })
    })
}